'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { TrendingUp, Wallet, CreditCard, User, Store, LogOut, Plus, Gift, Percent, Trash2, X, Pencil, Check, Eye, QrCode, ShieldCheck, MapPin, Navigation } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { KERALA_CITIES } from '../../../../lib/keralaCities'
import { cn } from '../../../../lib/utils'
import { secureFetch } from '../../../../lib/secureFetch'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type RevenueStats = {
    totalRevenue: number
    todayRevenue: number
    transactionCount: number
    avgTransactionValue: number
    totalDiscountGiven: number
    freeItemsRedeemed: number
    uniqueCustomerCount: number
    repeatCustomerCount: number
}

type RepeatCustomer = {
    userId: string
    name: string
    transactionCount: number
    totalSpent: number
}

type Transaction = {
    id: string
    userId: string
    amount: number
    discountAmount: number
    finalAmount: number
    freeItemName?: string
    createdAt: string
}

type RewardType = 'discount' | 'freeItem'

type LoyaltyRewardItem = {
    id: string
    stampsRequired: number
    rewardType: RewardType
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

type LoyaltyCard = {
    id: string
    name: string
    items: LoyaltyRewardItem[]
    createdAt: string
}

type Tab = 'revenue' | 'payments' | 'cards' | 'profile'

const TABS: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: User },
]

function formatCurrency(amount: number) {
    return `₹${amount.toFixed(2)}`
}

function maskUserId(userId: string) {
    const [name, domain] = userId.split('@')
    if (domain) {
        return name.length > 2 ? `${name.slice(0, 2)}***@${domain}` : `***@${domain}`
    }
    return userId.length > 4 ? `${'*'.repeat(userId.length - 4)}${userId.slice(-4)}` : userId
}

function toDateInputValue(date: Date) {
    // Use local calendar-date components, not toISOString() (which is UTC
    // and can roll to the wrong day depending on the viewer's timezone).
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateGroupLabel(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (isSameDay(date, today)) return 'Today'
    if (isSameDay(date, yesterday)) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupTransactionsByDate(transactions: Transaction[]) {
    const groups: { label: string; items: Transaction[] }[] = []
    for (const transaction of transactions) {
        const label = dateGroupLabel(transaction.createdAt)
        const group = groups.find(g => g.label === label)
        if (group) {
            group.items.push(transaction)
        } else {
            groups.push({ label, items: [transaction] })
        }
    }
    return groups
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#f5f4ed] rounded-xl p-5 border border-[#e4e2dc]">
            <p className={cn(jetbrainsMono.className, "text-xs uppercase tracking-wide text-[#70787d] font-semibold")}>{label}</p>
            <p className="text-[22px] leading-tight font-extrabold text-[#1b1c18] mt-1">{value}</p>
        </div>
    )
}

function rewardLabel(item: LoyaltyRewardItem) {
    if (item.rewardType === 'discount') {
        return item.discountType === 'flat'
            ? `${formatCurrency(item.discountValue || 0)} off`
            : `${item.discountValue || 0}% off`
    }
    return item.freeItemName || 'Free item'
}

function LoyaltyCardsTab({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
    const [cards, setCards] = useState<LoyaltyCard[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

    const [showPreview, setShowPreview] = useState(false)

    const [isAddingCard, setIsAddingCard] = useState(false)
    const [newCardName, setNewCardName] = useState('')
    const [isCreatingCard, setIsCreatingCard] = useState(false)
    const [createCardError, setCreateCardError] = useState('')
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null)

    const [isEditingCardName, setIsEditingCardName] = useState(false)
    const [editCardNameValue, setEditCardNameValue] = useState('')
    const [isSavingCardName, setIsSavingCardName] = useState(false)
    const [editCardNameError, setEditCardNameError] = useState('')

    const [isAddingItem, setIsAddingItem] = useState(false)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [itemStamps, setItemStamps] = useState('5')
    const [itemType, setItemType] = useState<RewardType>('discount')
    const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage')
    const [discountValue, setDiscountValue] = useState('')
    const [freeItemName, setFreeItemName] = useState('')
    const [isSavingItem, setIsSavingItem] = useState(false)
    const [itemError, setItemError] = useState('')
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

    const fetchCards = async () => {
        setIsLoading(true)
        setError('')
        try {
            const { res, data } = await secureFetch(`/api/admin/loyalty-cards?restaurantId=${encodeURIComponent(restaurantId)}`)
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch loyalty cards')
            setCards(data.cards)
            setSelectedCardId(prev => prev ?? data.cards[0]?.id ?? null)
        } catch (err) {
            console.error('Error fetching loyalty cards:', err)
            setError('Could not load loyalty cards right now.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCards()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])

    const selectedCard = cards.find(c => c.id === selectedCardId) || null

    const selectCard = (cardId: string) => {
        setSelectedCardId(cardId)
        setIsEditingCardName(false)
        setShowPreview(false)
        resetItemForm()
    }

    const openPreview = () => {
        if (!cards.some(c => c.items.length > 0)) return
        setShowPreview(true)
    }

    const resetItemForm = () => {
        setIsAddingItem(false)
        setEditingItemId(null)
        setItemStamps('5')
        setItemType('discount')
        setDiscountType('percentage')
        setDiscountValue('')
        setFreeItemName('')
        setItemError('')
    }

    const startAddItem = () => {
        resetItemForm()
        const maxStamps = selectedCard?.items.reduce((max, item) => Math.max(max, item.stampsRequired), 0) || 0
        setItemStamps(String(maxStamps + 1))
        setIsAddingItem(true)
    }

    const startEditItem = (item: LoyaltyRewardItem) => {
        setEditingItemId(item.id)
        setItemStamps(String(item.stampsRequired))
        setItemType(item.rewardType)
        setDiscountType(item.discountType || 'percentage')
        setDiscountValue(item.discountValue !== undefined ? String(item.discountValue) : '')
        setFreeItemName(item.freeItemName || '')
        setItemError('')
        setIsAddingItem(true)
    }

    const handleCreateCard = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateCardError('')

        if (!newCardName.trim()) {
            setCreateCardError('Enter a card name.')
            return
        }

        setIsCreatingCard(true)
        try {
            const { res, data } = await secureFetch('/api/admin/loyalty-cards', {
                method: 'POST',
                body: { restaurantId, name: newCardName.trim() },
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to create card')

            setCards(prev => [data.card, ...prev])
            setSelectedCardId(data.card.id)
            setNewCardName('')
            setIsAddingCard(false)
        } catch (err: any) {
            setCreateCardError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsCreatingCard(false)
        }
    }

    const handleDeleteCard = async (cardId: string) => {
        setDeletingCardId(cardId)
        try {
            const { res, data } = await secureFetch(`/api/admin/loyalty-cards/${cardId}?restaurantId=${encodeURIComponent(restaurantId)}`, {
                method: 'DELETE',
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to delete card')

            setCards(prev => {
                const next = prev.filter(c => c.id !== cardId)
                if (selectedCardId === cardId) {
                    setSelectedCardId(next[0]?.id ?? null)
                }
                return next
            })
        } catch (err) {
            console.error('Error deleting card:', err)
            setError('Could not delete this card. Please try again.')
        } finally {
            setDeletingCardId(null)
        }
    }

    const startEditCardName = () => {
        if (!selectedCard) return
        setEditCardNameValue(selectedCard.name)
        setEditCardNameError('')
        setIsEditingCardName(true)
    }

    const handleRenameCard = async (e: React.FormEvent) => {
        e.preventDefault()
        setEditCardNameError('')

        if (!selectedCard) return
        const name = editCardNameValue.trim()
        if (!name) {
            setEditCardNameError('Enter a card name.')
            return
        }

        setIsSavingCardName(true)
        try {
            const { res, data } = await secureFetch(`/api/admin/loyalty-cards/${selectedCard.id}`, {
                method: 'PATCH',
                body: { restaurantId, name },
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to rename card')

            setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, name } : c))
            setIsEditingCardName(false)
        } catch (err: any) {
            setEditCardNameError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSavingCardName(false)
        }
    }

    const handleSubmitItem = async (e: React.FormEvent) => {
        e.preventDefault()
        setItemError('')

        if (!selectedCard) return

        const stamps = Number(itemStamps)
        if (!Number.isInteger(stamps) || stamps < 1) {
            setItemError('Enter a valid number of stamps.')
            return
        }

        const body: Record<string, unknown> = { restaurantId, stampsRequired: stamps, rewardType: itemType }
        if (itemType === 'discount') {
            const value = Number(discountValue)
            if (!Number.isFinite(value) || value <= 0) {
                setItemError('Enter a valid discount value.')
                return
            }
            body.discountType = discountType
            body.discountValue = value
        } else {
            if (!freeItemName.trim()) {
                setItemError('Enter the name of the free item.')
                return
            }
            body.freeItemName = freeItemName.trim()
        }

        setIsSavingItem(true)
        try {
            const url = editingItemId
                ? `/api/admin/loyalty-cards/${selectedCard.id}/items/${editingItemId}`
                : `/api/admin/loyalty-cards/${selectedCard.id}/items`
            const { res, data } = await secureFetch(url, {
                method: editingItemId ? 'PATCH' : 'POST',
                body,
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save reward')

            setCards(prev => prev.map(c => {
                if (c.id !== selectedCard.id) return c
                return editingItemId
                    ? { ...c, items: c.items.map(i => i.id === editingItemId ? data.item : i) }
                    : { ...c, items: [...c.items, data.item] }
            }))
            resetItemForm()
        } catch (err: any) {
            setItemError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSavingItem(false)
        }
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!selectedCard) return
        setDeletingItemId(itemId)
        try {
            const { res, data } = await secureFetch(
                `/api/admin/loyalty-cards/${selectedCard.id}/items/${itemId}?restaurantId=${encodeURIComponent(restaurantId)}`,
                { method: 'DELETE' }
            )
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to delete reward')

            setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c))
        } catch (err) {
            console.error('Error deleting reward item:', err)
        } finally {
            setDeletingItemId(null)
        }
    }

    if (isLoading) {
        return <p className="text-sm text-[#40484d]">Loading...</p>
    }

    return (
        <div className="flex flex-col gap-4">
            {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}

            {/* Card pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => selectCard(card.id)}
                        className={cn(
                            "shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                            selectedCardId === card.id ? "bg-[#0d6683] text-white" : "bg-[#f0eee7] text-[#40484d]"
                        )}
                    >
                        {card.name}
                    </button>
                ))}
                <button
                    onClick={() => setIsAddingCard(prev => !prev)}
                    className="shrink-0 px-4 py-2 rounded-full text-sm font-bold border-2 border-dashed border-[#70787d] text-[#40484d]"
                >
                    + add card
                </button>
            </div>

            {isAddingCard && (
                <form onSubmit={handleCreateCard} className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-4 flex flex-col gap-3">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Card name (e.g. Coffee Lovers Card)"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    {createCardError && <p className="text-[#ba1a1a] text-sm">{createCardError}</p>}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isCreatingCard}
                            className="flex-1 bg-[#0d6683] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {isCreatingCard ? 'Creating...' : 'Create Card'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsAddingCard(false); setNewCardName(''); setCreateCardError('') }}
                            className="px-4 rounded-full border border-[#e4e2dc] text-[#40484d] font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {cards.length === 0 && !isAddingCard && (
                <p className="text-sm text-[#40484d]">No loyalty cards yet. Add one to get started.</p>
            )}

            {selectedCard && (
                <div className="flex flex-col gap-3">
                    {isEditingCardName ? (
                        <form onSubmit={handleRenameCard} className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={editCardNameValue}
                                    onChange={(e) => setEditCardNameValue(e.target.value)}
                                    className="flex-1 bg-white rounded-lg px-4 py-2 text-sm font-bold border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                                />
                                <button
                                    type="submit"
                                    disabled={isSavingCardName}
                                    className="p-2 rounded-lg bg-[#0d6683] text-white disabled:opacity-60"
                                    aria-label="Save name"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingCardName(false)}
                                    className="p-2 rounded-lg border border-[#e4e2dc] text-[#40484d]"
                                    aria-label="Cancel"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            {editCardNameError && <p className="text-[#ba1a1a] text-sm">{editCardNameError}</p>}
                        </form>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-lg">{selectedCard.name}</h3>
                                <button
                                    onClick={startEditCardName}
                                    className="p-1.5 rounded-lg text-[#70787d] hover:bg-[#f0eee7]"
                                    aria-label="Edit card name"
                                >
                                    <Pencil size={14} />
                                </button>
                            </div>
                            <button
                                onClick={() => handleDeleteCard(selectedCard.id)}
                                disabled={deletingCardId === selectedCard.id}
                                className="p-2 rounded-lg bg-[#ffdad6] text-[#ba1a1a] disabled:opacity-60"
                                aria-label="Delete card"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {selectedCard.items.map(item => (
                            <div key={item.id} className="relative bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-4 flex flex-col gap-2">
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                        onClick={() => startEditItem(item)}
                                        className="w-7 h-7 rounded-full bg-[#f0eee7] text-[#40484d] flex items-center justify-center"
                                        aria-label="Edit reward"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        disabled={deletingItemId === item.id}
                                        className="w-7 h-7 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center disabled:opacity-60"
                                        aria-label="Delete reward"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-[#c2f050] text-[#516b00] flex items-center justify-center">
                                    {item.rewardType === 'discount' ? <Percent size={16} /> : <Gift size={16} />}
                                </div>
                                <p className={cn(jetbrainsMono.className, "text-xs text-[#70787d]")}>{item.stampsRequired} stamps</p>
                                <p className="font-bold text-sm pr-4">{rewardLabel(item)}</p>
                            </div>
                        ))}

                        <button
                            onClick={startAddItem}
                            className="rounded-xl border-2 border-dashed border-[#70787d] flex flex-col items-center justify-center gap-1 py-6 text-[#40484d]"
                        >
                            <Plus size={20} />
                            <span className="text-xs font-bold">add reward</span>
                        </button>
                    </div>

                    {isAddingItem && (
                        <form onSubmit={handleSubmitItem} className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-sm">{editingItemId ? 'Edit Reward' : 'New Reward'}</p>
                                <button type="button" onClick={resetItemForm} aria-label="Close">
                                    <X size={16} className="text-[#70787d]" />
                                </button>
                            </div>

                            <input
                                type="number"
                                min={1}
                                max={100}
                                placeholder="Stamps required"
                                value={itemStamps}
                                onChange={(e) => setItemStamps(e.target.value)}
                                className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                            />

                            <div className="flex bg-[#f0eee7] rounded-full p-1">
                                <button
                                    type="button"
                                    onClick={() => setItemType('discount')}
                                    className={cn(
                                        "flex-1 py-2 rounded-full text-xs font-bold transition-colors",
                                        itemType === 'discount' ? "bg-[#0d6683] text-white" : "text-[#40484d]"
                                    )}
                                >
                                    Discount
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItemType('freeItem')}
                                    className={cn(
                                        "flex-1 py-2 rounded-full text-xs font-bold transition-colors",
                                        itemType === 'freeItem' ? "bg-[#0d6683] text-white" : "text-[#40484d]"
                                    )}
                                >
                                    Free Item
                                </button>
                            </div>

                            {itemType === 'discount' ? (
                                <div className="flex gap-2">
                                    <div className="flex bg-[#f0eee7] rounded-lg p-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('percentage')}
                                            className={cn(
                                                "px-3 py-2 rounded-md text-xs font-bold transition-colors",
                                                discountType === 'percentage' ? "bg-white shadow-sm" : "text-[#70787d]"
                                            )}
                                        >
                                            %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('flat')}
                                            className={cn(
                                                "px-3 py-2 rounded-md text-xs font-bold transition-colors",
                                                discountType === 'flat' ? "bg-white shadow-sm" : "text-[#70787d]"
                                            )}
                                        >
                                            ₹
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder={discountType === 'percentage' ? 'Discount %' : 'Discount amount'}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Free item (e.g. Free Cappuccino)"
                                    value={freeItemName}
                                    onChange={(e) => setFreeItemName(e.target.value)}
                                    className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                                />
                            )}

                            {itemError && <p className="text-[#ba1a1a] text-sm">{itemError}</p>}

                            <button
                                type="submit"
                                disabled={isSavingItem}
                                className="bg-[#0d6683] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {isSavingItem ? 'Saving...' : editingItemId ? 'Update Reward' : 'Add Reward'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Floating Preview Button */}
            {cards.length > 0 && (
                <button
                    onClick={openPreview}
                    disabled={!cards.some(c => c.items.length > 0)}
                    aria-label="Preview cards"
                    className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-[#0d6683] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                    <Eye size={22} />
                </button>
            )}

            {/* Live Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#fbf9f2] rounded-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                            <p className="font-bold text-sm flex items-center gap-2 text-[#1b1c18]">
                                <Eye size={16} className="text-[#67558c]" />
                                Live Preview
                            </p>
                            <button onClick={() => setShowPreview(false)} aria-label="Close preview">
                                <X size={18} className="text-[#70787d]" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 flex flex-col gap-5">
                        {cards.map(card => {
                            if (card.items.length === 0) {
                                return (
                                    <div key={card.id} className="shrink-0 bg-[#f0eee7] rounded-xl p-4 text-sm text-[#70787d]">
                                        <span className="font-bold text-[#1b1c18]">{card.name}</span> has no rewards yet.
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={card.id}
                                    className="w-full shrink-0 rounded-2xl p-6 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#2a2a2a] to-[#111111] text-white shadow-xl"
                                >
                                    <div
                                        className="absolute inset-0 opacity-20 pointer-events-none"
                                        style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #c5f253 0%, transparent 50%), radial-gradient(circle at 0% 0%, #89cff0 0%, transparent 50%)' }}
                                    />
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h4 className="text-[22px] leading-tight font-extrabold text-white mb-1">{restaurantName}</h4>
                                            <span className={cn(jetbrainsMono.className, "text-[11px] text-[#c5f253] bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20")}>
                                                {card.name}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg shadow-inner shrink-0">
                                            <QrCode size={22} className="text-[#0d6683]" />
                                        </div>
                                    </div>

                                    {/* Loyalty reward items, one circle per reward */}
                                    <div className="relative z-10 mt-5 flex gap-4 overflow-x-auto pb-1">
                                        {card.items.map(item => (
                                            <div key={item.id} className="flex flex-col items-center gap-2 w-16 shrink-0">
                                                <span className="text-[10px] leading-tight text-center text-white/80 h-7 line-clamp-2">
                                                    {rewardLabel(item)}
                                                </span>
                                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 text-white/50 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold">{item.stampsRequired}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}

                        <p className="shrink-0 text-xs text-[#70787d] text-center">
                            This is how your loyalty cards will look to customers once published.
                        </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function PaymentGatewaySettings({ restaurantId }: { restaurantId: string }) {
    const [isLoading, setIsLoading] = useState(true)
    const [configured, setConfigured] = useState(false)
    const [apiKeyMasked, setApiKeyMasked] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    const [apiKey, setApiKey] = useState('')
    const [salt, setSalt] = useState('')
    const [mode, setMode] = useState<'TEST' | 'LIVE'>('LIVE')
    const [paymentOptions, setPaymentOptions] = useState('cc,nb,upi,w')
    const [gatewayUrl, setGatewayUrl] = useState('')
    const [responseUrl, setResponseUrl] = useState('')

    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const fetchCredentials = async () => {
        setIsLoading(true)
        try {
            const { data } = await secureFetch(`/api/admin/omniware-credentials?restaurantId=${encodeURIComponent(restaurantId)}`)
            if (data?.success && data.configured) {
                setConfigured(true)
                setApiKeyMasked(data.apiKeyMasked)
                setMode(data.mode)
                setPaymentOptions(data.paymentOptions || 'cc,nb,upi,w')
                setGatewayUrl(data.gatewayUrl || '')
                setResponseUrl(data.responseUrl || '')
            } else {
                setConfigured(false)
                setIsEditing(true)
            }
        } catch (err) {
            console.error('Error fetching Omniware credentials:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCredentials()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaved(false)

        if (!apiKey.trim() || !salt.trim()) {
            setError('API key and salt are required.')
            return
        }

        setIsSaving(true)
        try {
            const { res, data } = await secureFetch('/api/admin/omniware-credentials', {
                method: 'POST',
                body: {
                    restaurantId,
                    apiKey: apiKey.trim(),
                    salt: salt.trim(),
                    mode,
                    paymentOptions,
                    gatewayUrl: gatewayUrl.trim(),
                    responseUrl: responseUrl.trim(),
                },
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save credentials')

            setSaved(true)
            setApiKey('')
            setSalt('')
            setIsEditing(false)
            fetchCredentials()
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <p className="text-sm text-[#40484d]">Loading payment gateway settings...</p>
    }

    return (
        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#0d6683]" />
                <h3 className="font-bold text-sm">Omniware Payment Gateway</h3>
            </div>

            {configured && !isEditing ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#40484d]">API Key</span>
                        <span className={cn(jetbrainsMono.className, "font-bold")}>{apiKeyMasked}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-[#40484d]">Mode</span>
                        <span className="font-bold">{mode}</span>
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-bold text-[#0d6683] text-left"
                    >
                        Update credentials
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSave} className="flex flex-col gap-3">
                    <p className="text-xs text-[#70787d]">
                        {configured
                            ? 'Re-enter both the API key and salt to update them — the salt is never shown back after saving, so partial updates aren’t possible.'
                            : 'Enter the API key and salt Omniware gave you for this restaurant. The salt is never shown again after saving.'}
                    </p>
                    <input
                        type="text"
                        placeholder="API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <input
                        type="password"
                        placeholder="Salt"
                        value={salt}
                        onChange={(e) => setSalt(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <div className="flex bg-white rounded-lg p-1 border border-[#e4e2dc]">
                        <button
                            type="button"
                            onClick={() => setMode('LIVE')}
                            className={cn("flex-1 py-2 rounded-md text-xs font-bold transition-colors", mode === 'LIVE' ? "bg-[#0d6683] text-white" : "text-[#40484d]")}
                        >
                            LIVE
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('TEST')}
                            className={cn("flex-1 py-2 rounded-md text-xs font-bold transition-colors", mode === 'TEST' ? "bg-[#0d6683] text-white" : "text-[#40484d]")}
                        >
                            TEST
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Payment options (e.g. cc,nb,upi,w)"
                        value={paymentOptions}
                        onChange={(e) => setPaymentOptions(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <input
                        type="text"
                        placeholder="Gateway URL override (optional)"
                        value={gatewayUrl}
                        onChange={(e) => setGatewayUrl(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <input
                        type="text"
                        placeholder="Response URL override (optional)"
                        value={responseUrl}
                        onChange={(e) => setResponseUrl(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />

                    {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
                    {saved && <p className="text-[#4d6700] text-sm">Saved successfully.</p>}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 bg-[#0d6683] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save Credentials'}
                        </button>
                        {configured && (
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setApiKey(''); setSalt(''); setError('') }}
                                className="px-4 rounded-full border border-[#e4e2dc] text-[#40484d] font-bold"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}

function UpiUrlSettings({ restaurantId }: { restaurantId: string }) {
    const [isLoading, setIsLoading] = useState(true)
    const [upiUrl, setUpiUrl] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const fetchUpiUrl = async () => {
        setIsLoading(true)
        try {
            const { data } = await secureFetch(`/api/admin/upi-url?restaurantId=${encodeURIComponent(restaurantId)}`)
            if (data?.success) {
                setUpiUrl(data.upiUrl || '')
                setIsEditing(!data.upiUrl)
            }
        } catch (err) {
            console.error('Error fetching UPI URL:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUpiUrl()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaved(false)

        const trimmedUrl = upiUrl.trim()
        setIsSaving(true)
        try {
            const { res, data } = await secureFetch('/api/admin/upi-url', {
                method: 'POST',
                body: { restaurantId, upiUrl: trimmedUrl },
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save UPI URL')

            setUpiUrl(data.upiUrl || '')
            setSaved(true)
            setIsEditing(false)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <p className="text-sm text-[#40484d]">Loading UPI settings...</p>
    }

    return (
        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[#0d6683]" />
                <h3 className="font-bold text-sm">Google Pay UPI Intent URL</h3>
            </div>

            {upiUrl && !isEditing ? (
                <div className="flex flex-col gap-3">
                    <p className={cn(jetbrainsMono.className, "text-xs break-all bg-white rounded-lg px-3 py-2 border border-[#e4e2dc]")}>
                        {upiUrl}
                    </p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-bold text-[#0d6683] text-left"
                    >
                        Update URL
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSave} className="flex flex-col gap-3">
                    <p className="text-xs text-[#70787d]">
                        Paste the UPI intent URL customers should be sent to for Google Pay (e.g. upi://pay?pa=yourid@okhdfcbank&pn=RestaurantName&cu=INR).
                    </p>
                    <input
                        type="text"
                        placeholder="upi://pay?pa=...&pn=...&cu=INR"
                        value={upiUrl}
                        onChange={(e) => setUpiUrl(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />

                    {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
                    {saved && <p className="text-[#4d6700] text-sm">Saved successfully.</p>}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 bg-[#0d6683] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save URL'}
                        </button>
                        {upiUrl && (
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setError('') }}
                                className="px-4 rounded-full border border-[#e4e2dc] text-[#40484d] font-bold"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}

function RestaurantContactSettings({ restaurantId }: { restaurantId: string }) {
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const [address, setAddress] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [directionsUrl, setDirectionsUrl] = useState('')
    const [city, setCity] = useState('')
    const [isCityListOpen, setIsCityListOpen] = useState(false)

    const fetchDetails = async () => {
        setIsLoading(true)
        try {
            const { data } = await secureFetch(`/api/admin/restaurant-details?restaurantId=${encodeURIComponent(restaurantId)}`)
            if (data?.success) {
                setAddress(data.address || '')
                setPhoneNumber(data.phoneNumber || '')
                setDirectionsUrl(data.directionsUrl || '')
                setCity(data.city || '')
                setIsEditing(!data.address && !data.phoneNumber && !data.directionsUrl && !data.city)
            }
        } catch (err) {
            console.error('Error fetching restaurant details:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDetails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaved(false)
        setIsSaving(true)
        try {
            const { res, data } = await secureFetch('/api/admin/restaurant-details', {
                method: 'POST',
                body: {
                    restaurantId,
                    address: address.trim(),
                    phoneNumber: phoneNumber.trim(),
                    directionsUrl: directionsUrl.trim(),
                    city,
                },
            })
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save restaurant details')

            setAddress(data.address || '')
            setPhoneNumber(data.phoneNumber || '')
            setDirectionsUrl(data.directionsUrl || '')
            setCity(data.city || '')
            setSaved(true)
            setIsEditing(false)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <p className="text-sm text-[#40484d]">Loading restaurant details...</p>
    }

    const hasDetails = address || phoneNumber || directionsUrl || city

    const cityQuery = city.trim().toLowerCase()
    const matchingKeralaCities = (cityQuery
        ? KERALA_CITIES.filter(c => c.toLowerCase().includes(cityQuery))
        : KERALA_CITIES
    ).slice(0, 8)

    return (
        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#0d6683]" />
                <h3 className="font-bold text-sm">Restaurant Details</h3>
            </div>

            {hasDetails && !isEditing ? (
                <div className="flex flex-col gap-3">
                    {city && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className={cn(jetbrainsMono.className, "text-xs text-[#70787d] uppercase tracking-wide")}>City</span>
                            <span className="font-bold">{city}</span>
                        </div>
                    )}
                    {address && (
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin size={16} className="text-[#70787d] mt-0.5 shrink-0" />
                            <span>{address}</span>
                        </div>
                    )}
                    {phoneNumber && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className={cn(jetbrainsMono.className, "text-xs text-[#70787d] uppercase tracking-wide")}>Phone</span>
                            <span className="font-bold">{phoneNumber}</span>
                        </div>
                    )}
                    {directionsUrl && (
                        <div className="flex items-center gap-2 text-sm">
                            <Navigation size={16} className="text-[#70787d] shrink-0" />
                            <span className="truncate">{directionsUrl}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-bold text-[#0d6683] text-left"
                    >
                        Update details
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSave} className="flex flex-col gap-3">
                    <p className="text-xs text-[#70787d]">
                        Shown to customers on your restaurant&apos;s details page. City controls which customers see you when browsing restaurants by location.
                    </p>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="City (e.g. Kochi)"
                            value={city}
                            onChange={(e) => { setCity(e.target.value); setIsCityListOpen(true) }}
                            onFocus={() => setIsCityListOpen(true)}
                            onBlur={() => setIsCityListOpen(false)}
                            autoComplete="off"
                            className="w-full bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                        />
                        {isCityListOpen && matchingKeralaCities.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded-lg border border-[#e4e2dc] shadow-lg">
                                {matchingKeralaCities.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => { setCity(c); setIsCityListOpen(false) }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-[#f5f4ed] transition-colors"
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] text-[#70787d] -mt-1.5">
                        Search &amp; pick a city in Kerala, or type your own.
                    </p>
                    <input
                        type="text"
                        placeholder="Address (e.g. 123 Ocean Front Walk, Santa Monica, CA)"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <input
                        type="tel"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />
                    <input
                        type="text"
                        placeholder="Directions URL (e.g. a Google Maps link)"
                        value={directionsUrl}
                        onChange={(e) => setDirectionsUrl(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2.5 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                    />

                    {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
                    {saved && <p className="text-[#4d6700] text-sm">Saved successfully.</p>}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 bg-[#0d6683] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save Details'}
                        </button>
                        {hasDetails && (
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setError('') }}
                                className="px-4 rounded-full border border-[#e4e2dc] text-[#40484d] font-bold"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    )
}

export default function AdminDashboardPage() {
    const router = useRouter()
    const { owner, isLoading, logout } = useAdminAuth()

    const [activeTab, setActiveTab] = useState<Tab>('revenue')

    const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null)
    const [revenueTransactions, setRevenueTransactions] = useState<Transaction[]>([])
    const [repeatCustomers, setRepeatCustomers] = useState<RepeatCustomer[]>([])
    const [revenueLoading, setRevenueLoading] = useState(false)
    const [revenueError, setRevenueError] = useState('')

    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 6)
        return toDateInputValue(d)
    })
    const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date()))
    const [paymentsTransactions, setPaymentsTransactions] = useState<Transaction[]>([])
    const [paymentsTotal, setPaymentsTotal] = useState(0)
    const [paymentsLoading, setPaymentsLoading] = useState(false)
    const [paymentsError, setPaymentsError] = useState('')

    useEffect(() => {
        if (!isLoading && owner === null) {
            router.replace('/admin')
        }
    }, [isLoading, owner, router])

    useEffect(() => {
        if (!owner?.restaurantId) return

        const fetchRevenue = async () => {
            setRevenueLoading(true)
            setRevenueError('')
            try {
                const { res, data } = await secureFetch(`/api/admin/revenue?restaurantId=${encodeURIComponent(owner.restaurantId!)}`)
                if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch revenue')
                setRevenueStats(data.stats)
                setRevenueTransactions(data.transactions)
                setRepeatCustomers(data.repeatCustomers || [])
            } catch (error) {
                console.error('Error fetching revenue:', error)
                setRevenueError('Could not load revenue data right now.')
            } finally {
                setRevenueLoading(false)
            }
        }

        fetchRevenue()
    }, [owner?.restaurantId])

    useEffect(() => {
        if (!owner?.restaurantId) return

        const fetchPayments = async () => {
            setPaymentsLoading(true)
            setPaymentsError('')
            try {
                const params = new URLSearchParams({ restaurantId: owner.restaurantId! })
                if (dateFrom) params.set('startDate', dateFrom)
                if (dateTo) params.set('endDate', dateTo)

                const { res, data } = await secureFetch(`/api/admin/payments?${params.toString()}`)
                if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to fetch payments')
                setPaymentsTransactions(data.transactions)
                setPaymentsTotal(data.totalAmount)
            } catch (error) {
                console.error('Error fetching payments:', error)
                setPaymentsError('Could not load payment data right now.')
            } finally {
                setPaymentsLoading(false)
            }
        }

        fetchPayments()
    }, [owner?.restaurantId, dateFrom, dateTo])

    const groupedPayments = useMemo(() => groupTransactionsByDate(paymentsTransactions), [paymentsTransactions])

    if (isLoading || !owner) return null

    const handleLogout = () => {
        logout()
        router.push('/admin')
    }

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] min-h-screen text-[#1b1c18] pb-24")}>
            {/* Header */}
            <header className="px-6 pt-8 pb-4 max-w-md mx-auto flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#0d6683] text-white flex items-center justify-center shrink-0">
                    <Store size={26} />
                </div>
                <div>
                    <h1 className="text-[24px] leading-tight font-extrabold">{owner.restaurantName || 'Your Restaurant'}</h1>
                    <p className="text-[#40484d] text-sm">{owner.email}</p>
                </div>
            </header>

            {/* Tab content */}
            <main className="px-6 pt-6 max-w-md mx-auto flex flex-col gap-4">
                {!owner.restaurantId && activeTab !== 'profile' && (
                    <div className="bg-[#fff3cd] text-[#7a5c00] rounded-xl p-4 text-sm border border-[#f0e0a0]">
                        No restaurant ID is linked to this account yet. Add one from the Profile tab to unlock revenue, payments, and loyalty cards.
                    </div>
                )}

                {activeTab === 'revenue' && owner.restaurantId && (
                    <>
                        {revenueError && <p className="text-[#ba1a1a] text-sm">{revenueError}</p>}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Total Revenue" value={formatCurrency(revenueStats?.totalRevenue || 0)} />
                            <StatCard label="Today" value={formatCurrency(revenueStats?.todayRevenue || 0)} />
                            <StatCard label="Transactions" value={String(revenueStats?.transactionCount || 0)} />
                            <StatCard label="Avg. Transaction" value={formatCurrency(revenueStats?.avgTransactionValue || 0)} />
                            <StatCard label="Discounts Given" value={formatCurrency(revenueStats?.totalDiscountGiven || 0)} />
                            <StatCard label="Free Items Redeemed" value={String(revenueStats?.freeItemsRedeemed || 0)} />
                            <StatCard label="Unique Customers" value={String(revenueStats?.uniqueCustomerCount || 0)} />
                            <StatCard label="Repeat Customers" value={String(revenueStats?.repeatCustomerCount || 0)} />
                        </div>

                        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] overflow-hidden">
                            <p className="px-5 pt-4 pb-2 font-bold text-sm">Repeat Customers</p>
                            {revenueLoading ? (
                                <p className="px-5 pb-4 text-sm text-[#40484d]">Loading...</p>
                            ) : repeatCustomers.length === 0 ? (
                                <p className="px-5 pb-4 text-sm text-[#40484d]">No repeat customers yet — everyone so far has paid only once.</p>
                            ) : (
                                <div className="divide-y divide-[#e4e2dc]">
                                    {repeatCustomers.map(customer => (
                                        <div key={customer.userId} className="px-5 py-3 flex items-center justify-between text-sm">
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{customer.name}</p>
                                                <p className="text-[#70787d] text-xs">{formatCurrency(customer.totalSpent)} total spent</p>
                                            </div>
                                            <div className="shrink-0 bg-[#0d6683] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                {customer.transactionCount} visits
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] overflow-hidden">
                            <p className="px-5 pt-4 pb-2 font-bold text-sm">Recent Transactions</p>
                            {revenueLoading ? (
                                <p className="px-5 pb-4 text-sm text-[#40484d]">Loading...</p>
                            ) : revenueTransactions.length === 0 ? (
                                <p className="px-5 pb-4 text-sm text-[#40484d]">No transactions yet.</p>
                            ) : (
                                <div className="divide-y divide-[#e4e2dc]">
                                    {revenueTransactions.map(transaction => (
                                        <div key={transaction.id} className="px-5 py-3 flex items-center justify-between text-sm">
                                            <div>
                                                {/* <p className="font-semibold">{maskUserId(transaction.userId)}</p> */}
                                                <p className="font-semibold">{transaction.userId}</p>
                                                <p className="text-[#70787d] text-xs">
                                                    {new Date(transaction.createdAt).toLocaleString()}
                                                    {transaction.discountAmount > 0 && ` · ${formatCurrency(transaction.discountAmount)} discount`}
                                                    {transaction.freeItemName && ` · ${transaction.freeItemName}`}
                                                </p>
                                            </div>
                                            <p className="font-bold">{formatCurrency(transaction.finalAmount || 0)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'payments' && owner.restaurantId && (
                    <>
                        {paymentsError && <p className="text-[#ba1a1a] text-sm">{paymentsError}</p>}

                        {/* Date Range */}
                        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-4 flex flex-col gap-3">
                            <p className={cn(jetbrainsMono.className, "text-xs uppercase tracking-wide text-[#70787d] font-semibold")}>Date Range</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                                />
                                <span className="text-[#70787d] text-sm">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom}
                                    max={toDateInputValue(new Date())}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-[#e4e2dc] outline-none focus:border-[#0d6683]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Total in Range" value={formatCurrency(paymentsTotal)} />
                            <StatCard label="Payments" value={String(paymentsTransactions.length)} />
                        </div>

                        <div className="flex flex-col gap-4">
                            {paymentsLoading ? (
                                <p className="text-sm text-[#40484d]">Loading...</p>
                            ) : groupedPayments.length === 0 ? (
                                <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-5 text-sm text-[#40484d]">
                                    No payments in this date range.
                                </div>
                            ) : (
                                groupedPayments.map(group => (
                                    <div key={group.label}>
                                        <h3 className={cn(jetbrainsMono.className, "text-xs text-[#70787d] uppercase tracking-wider mb-2")}>
                                            {group.label}
                                        </h3>
                                        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] overflow-hidden divide-y divide-[#e4e2dc]">
                                            {group.items.map(transaction => (
                                                <div key={transaction.id} className="px-5 py-3 flex items-center justify-between text-sm">
                                                    <div>
                                                        <p className="font-semibold">{transaction.userId}</p>
                                                        <p className="text-[#70787d] text-xs">
                                                            {new Date(transaction.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                                                            {transaction.discountAmount > 0 && ` · ${formatCurrency(transaction.discountAmount)} discount`}
                                                            {transaction.freeItemName && ` · ${transaction.freeItemName}`}
                                                        </p>
                                                    </div>
                                                    <p className="font-bold">{formatCurrency(transaction.finalAmount || 0)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'cards' && owner.restaurantId && (
                    <LoyaltyCardsTab restaurantId={owner.restaurantId} restaurantName={owner.restaurantName || 'Your Restaurant'} />
                )}

                {activeTab === 'profile' && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-[#f5f4ed] rounded-xl border border-[#e4e2dc] p-5 flex flex-col gap-3">
                            <div>
                                <p className={cn(jetbrainsMono.className, "text-xs uppercase tracking-wide text-[#70787d] font-semibold")}>Restaurant Name</p>
                                <p className="font-bold">{owner.restaurantName || '—'}</p>
                            </div>
                            <div>
                                <p className={cn(jetbrainsMono.className, "text-xs uppercase tracking-wide text-[#70787d] font-semibold")}>Email</p>
                                <p className="font-bold">{owner.email}</p>
                            </div>
                            <div>
                                <p className={cn(jetbrainsMono.className, "text-xs uppercase tracking-wide text-[#70787d] font-semibold")}>Restaurant ID</p>
                                <p className="font-bold">{owner.restaurantId || 'Not linked'}</p>
                            </div>
                        </div>

                        {owner.restaurantId && <PaymentGatewaySettings restaurantId={owner.restaurantId} />}

                        {owner.restaurantId && <UpiUrlSettings restaurantId={owner.restaurantId} />}

                        {owner.restaurantId && <RestaurantContactSettings restaurantId={owner.restaurantId} />}

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 text-[#ba1a1a] font-bold px-6 py-3 rounded-full hover:bg-[#ffdad6] transition-colors"
                        >
                            <LogOut size={20} />
                            Log Out
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#fbf9f2]/95 backdrop-blur-sm border-t border-[#e4e2dc] px-6 py-3">
                <div className="max-w-md mx-auto flex bg-[#f0eee7] rounded-full p-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-full text-xs font-bold transition-colors",
                                    isActive ? "bg-[#0d6683] text-white" : "text-[#40484d]"
                                )}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
