'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans, JetBrains_Mono, Syne } from 'next/font/google'
import {
    ArrowLeft,
    Search,
    Coffee,
    ShoppingBag,
    UtensilsCrossed,
    Store,
    Gift,
    BadgeCheck,
    X,
    Share2,
    HelpCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'
import { secureFetch } from '../../../lib/secureFetch'
import { verifyPendingUpiPayment } from '../../../lib/pendingUpiPayment'
import RestaurantPhoto from '../components/RestaurantPhoto'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'] })
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

type Transaction = {
    id: string
    restaurantId: string
    restaurantName: string
    restaurantImageUrl?: string | null
    amount: number
    discountAmount: number
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    finalAmount: number
    freeItemName?: string
    createdAt: string
}

const MERCHANT_PALETTE = [
    { color: '#38bdf8', Icon: Coffee },
    { color: '#a3e635', Icon: ShoppingBag },
    { color: '#fbbf24', Icon: UtensilsCrossed },
    { color: '#f87171', Icon: Store },
    { color: '#c084fc', Icon: Gift },
]

function getMerchantVisual(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    return MERCHANT_PALETTE[hash % MERCHANT_PALETTE.length]
}

function formatCurrency(value: number) {
    return `₹${value.toFixed(2)}`
}

function discountLabel(transaction: Transaction) {
    if (!transaction.amount || transaction.discountAmount <= 0) return null
    const percentage = Math.round((transaction.discountAmount / transaction.amount) * 100)
    return `${percentage}% off`
}

function subtitleFor(transaction: Transaction) {
    if (transaction.freeItemName) return transaction.freeItemName
    const label = discountLabel(transaction)
    if (label) return `${label} discount applied`
    return 'Order Payment'
}

function statusTextFor(transaction: Transaction) {
    if (transaction.freeItemName) return 'Reward Redeemed'
    if (transaction.discountAmount > 0) return 'Discount Applied'
    return 'Payment Completed'
}

function rewardsTextFor(transaction: Transaction) {
    if (transaction.freeItemName) return `Reward redeemed: ${transaction.freeItemName}`
    if (transaction.discountAmount > 0) return `${formatCurrency(transaction.discountAmount)} saved`
    return 'Payment verified'
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateGroupLabel(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (isSameDay(date, today)) {
        return `Today • ${date.getDate()} ${date.toLocaleDateString('en-IN', { month: 'short' })}`
    }
    if (isSameDay(date, yesterday)) {
        return `Yesterday • ${date.getDate()} ${date.toLocaleDateString('en-IN', { month: 'short' })}`
    }
    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return `Earlier in ${date.toLocaleDateString('en-IN', { month: 'long' })}`
    }
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function TransactionsPage() {
    const router = useRouter()
    const { user, isInitialized } = useAuth()

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isDrawerVisible, setIsDrawerVisible] = useState(false)
    const drawerCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        // Wait for AuthContext to finish reading localStorage before
        // deciding there's no one logged in — on a fresh page load this
        // effect can otherwise fire before that rehydration completes and
        // bounce a genuinely logged-in user to the login screen.
        if (!isInitialized) return

        const userId = user?.email || user?.phoneNumber
        if (!userId) {
            router.push(`/auth?redirect=${encodeURIComponent('/transactions')}`)
            return
        }

        const fetchTransactions = async () => {
            setIsLoading(true)
            try {
                const { data } = await secureFetch(`/api/loyalty/transactions?userId=${encodeURIComponent(userId)}`)
                if (data?.success) {
                    setTransactions(data.transactions)
                }
            } catch (err) {
                console.error('Failed to load transactions', err)
            } finally {
                setIsLoading(false)
            }
        }

        const reconcileAndFetch = async () => {
            // A safety net for a payment that succeeded in the UPI app but
            // never made it into a transaction. Runs before the list fetch so
            // a just-recorded payment is already included. Telling the
            // customer about it (the payment-successful screen) is done
            // app-wide by PaymentRecovery; this check is shared with it, so
            // the payment is only ever verified and recorded once.
            try {
                await verifyPendingUpiPayment()
            } catch (err) {
                console.error('Failed to verify a pending UPI payment', err)
            }
            await fetchTransactions()
        }

        reconcileAndFetch()
    }, [user, isInitialized, router])

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return transactions
        return transactions.filter(t => t.restaurantName.toLowerCase().includes(query))
    }, [transactions, searchQuery])

    const groupedTransactions = useMemo(() => {
        const groups: { label: string; items: Transaction[] }[] = []
        for (const transaction of filteredTransactions) {
            const label = dateGroupLabel(transaction.createdAt)
            const group = groups.find(g => g.label === label)
            if (group) {
                group.items.push(transaction)
            } else {
                groups.push({ label, items: [transaction] })
            }
        }
        return groups
    }, [filteredTransactions])

    const openDrawer = (transaction: Transaction) => {
        if (drawerCloseTimeout.current) clearTimeout(drawerCloseTimeout.current)
        setActiveTransaction(transaction)
        setIsDrawerOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setIsDrawerVisible(true)))
    }

    const closeDrawer = () => {
        setIsDrawerVisible(false)
        drawerCloseTimeout.current = setTimeout(() => {
            setIsDrawerOpen(false)
            setActiveTransaction(null)
        }, 200)
    }

    useEffect(() => {
        if (!isDrawerOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDrawer()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isDrawerOpen])

    const activeVisual = activeTransaction ? getMerchantVisual(activeTransaction.restaurantName) : null

    // Nothing to search or list at all — the page is just the one centered line.
    const hasNoTransactions = !isLoading && transactions.length === 0

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen flex flex-col bg-white text-[#1c1b1b] pb-10")}>
            {/* Top App Bar */}
            <header className="sticky top-0 z-30 bg-white border-b-[3px] border-[#111111] px-4 py-3 flex items-center gap-3 shadow-[0px_3px_0px_#111111]">
                <button
                    aria-label="Go Back"
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white neo-border neo-shadow-badge active-press-sm flex items-center justify-center text-[#111111] transition-transform cursor-pointer"
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl leading-[26px] tracking-[-0.015em] font-bold text-[#1c1b1b]">Transactions</h1>
            </header>

            {/* Scrollable Content Canvas */}
            <main className={cn("flex-1 px-4 pt-4 pb-6 max-w-2xl w-full mx-auto", hasNoTransactions && "flex flex-col items-center justify-center")}>
                {/* Search */}
                {!hasNoTransactions && (
                    <div className="relative mb-5">
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white text-[#111111] placeholder:text-zinc-500 font-semibold text-sm py-3 pl-11 pr-4 neo-border rounded-xl neo-shadow-badge focus:outline-none focus:ring-0 focus:border-[#111111] transition-all"
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] pointer-events-none flex items-center">
                            <Search size={20} />
                        </span>
                    </div>
                )}

                {isLoading ? (
                    <p className="text-center text-sm font-semibold text-[#434656] mt-8">Loading transactions...</p>
                ) : groupedTransactions.length === 0 ? (
                    <div className={cn("flex flex-col items-center justify-center text-center", !hasNoTransactions && "mt-16")}>
                        <p
                            className={cn(syne.className, "text-2xl sm:text-3xl select-none lowercase leading-none text-center")}
                            style={{ fontWeight: 800, letterSpacing: '-0.04em', color: '#d8dbe5' }}
                        >
                            {hasNoTransactions ? 'no transactions yet' : 'no matches found'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groupedTransactions.map(group => (
                            <section key={group.label} className="space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[13px] leading-[16px] tracking-[0.03em] font-extrabold uppercase bg-[#f0edec] text-[#1c1b1b] px-2 py-0.5 rounded border border-[#1c1b1b]/20">
                                        {group.label}
                                    </span>
                                    <span className="text-[11px] leading-[14px] tracking-[0.04em] font-bold text-[#434656]">
                                        {group.items.length} Transaction{group.items.length === 1 ? '' : 's'}
                                    </span>
                                </div>

                                {group.items.map(transaction => {
                                    const visual = getMerchantVisual(transaction.restaurantName)
                                    const Icon = visual.Icon
                                    const transactionDate = new Date(transaction.createdAt)
                                    const dateLabel = transactionDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    const time = transactionDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
                                    const maskedId = `••${transaction.id.slice(-4).toUpperCase()}`

                                    return (
                                        <article
                                            key={transaction.id}
                                            onClick={() => openDrawer(transaction)}
                                            className="bg-white neo-border rounded-xl p-3.5 neo-shadow-1 active-press cursor-pointer transition-all hover:bg-[#fcf9f8] flex flex-col justify-between min-h-[116px]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-12 h-12 rounded-xl neo-border neo-shadow-badge flex items-center justify-center shrink-0 overflow-hidden"
                                                        style={{ backgroundColor: visual.color }}
                                                    >
                                                        <RestaurantPhoto
                                                            src={transaction.restaurantImageUrl}
                                                            alt={transaction.restaurantName}
                                                            className="w-full h-full object-cover"
                                                            fallback={<Icon size={24} className="text-[#111111]" />}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">
                                                            {transaction.restaurantName}
                                                        </h3>
                                                        <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#434656]">
                                                            {subtitleFor(transaction)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {transaction.freeItemName ? (
                                                        <span className="inline-block px-2 py-0.5 bg-[#c084fc] text-[#111111] text-[11px] leading-[14px] tracking-[0.03em] font-extrabold rounded-md neo-border-sm neo-shadow-badge mb-1">
                                                            {transaction.freeItemName}
                                                        </span>
                                                    ) : transaction.discountAmount > 0 ? (
                                                        <span className="inline-block px-2 py-0.5 bg-[#a3e635] text-[#111111] text-[11px] leading-[14px] tracking-[0.03em] font-extrabold rounded-md neo-border-sm neo-shadow-badge mb-1">
                                                            -{formatCurrency(transaction.discountAmount)} saved
                                                        </span>
                                                    ) : null}
                                                    <p className="text-[17px] leading-[22px] tracking-[-0.01em] font-extrabold text-[#111111]">
                                                        -{formatCurrency(transaction.finalAmount)}
                                                    </p>
                                                    <p className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#434656] mt-1">
                                                        {dateLabel} • {time}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#c4c5d9] text-[11px] leading-[14px] tracking-[0.04em] font-extrabold mt-2.5">
                                                <div className="flex items-center gap-1.5 text-[#111111]">
                                                    {transaction.freeItemName && <Gift size={14} className="text-[#6b5100]" />}
                                                    <span className="text-[#434656]">{statusTextFor(transaction)}</span>
                                                </div>
                                                <span className={cn(jetbrainsMono.className, "text-[11px] text-[#747688]")}>
                                                    ID: {maskedId}
                                                </span>
                                            </div>
                                        </article>
                                    )
                                })}
                            </section>
                        ))}
                    </div>
                )}
            </main>

            {/* Transaction Detail Bottom Sheet */}
            {isDrawerOpen && activeTransaction && activeVisual && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end justify-center transition-opacity duration-200",
                        isDrawerVisible ? "opacity-100" : "opacity-0"
                    )}
                    onClick={e => { if (e.target === e.currentTarget) closeDrawer() }}
                >
                    <div
                        className={cn(
                            "w-full max-w-[428px] bg-white neo-border border-b-0 rounded-t-2xl p-5 shadow-[0px_-4px_0px_#111111] transform transition-transform duration-200 ease-out",
                            isDrawerVisible ? "translate-y-0" : "translate-y-full"
                        )}
                    >
                        <div className="w-12 h-1.5 bg-[#111111] rounded-full mx-auto mb-4" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#2ED573] border-2 border-[#111111]" />
                                <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase text-[#434656]">Transaction Details</span>
                            </div>
                            <button
                                aria-label="Close details"
                                onClick={closeDrawer}
                                className="w-8 h-8 rounded-lg bg-white neo-border-sm flex items-center justify-center text-[#111111] cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-white neo-border rounded-xl p-4 neo-shadow-1 mb-4">
                            <div className="flex items-center gap-3 pb-3 border-b-2 border-dashed border-[#c4c5d9]">
                                <div
                                    className="w-12 h-12 rounded-xl neo-border flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: activeVisual.color }}
                                >
                                    <RestaurantPhoto
                                        src={activeTransaction.restaurantImageUrl}
                                        alt={activeTransaction.restaurantName}
                                        className="w-full h-full object-cover"
                                        fallback={<activeVisual.Icon size={24} className="text-[#111111]" />}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">{activeTransaction.restaurantName}</h3>
                                    <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#434656]">{subtitleFor(activeTransaction)}</p>
                                </div>
                            </div>
                            <div className="py-3 flex justify-between items-center">
                                <span className="text-sm leading-5 font-medium text-[#434656]">Amount / Perk</span>
                                <span className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#111111]">
                                    {activeTransaction.finalAmount > 0
                                        ? `-${formatCurrency(activeTransaction.finalAmount)}`
                                        : activeTransaction.freeItemName
                                            ? `Redeemed: ${activeTransaction.freeItemName}`
                                            : formatCurrency(activeTransaction.finalAmount)}
                                </span>
                            </div>
                            <div className="py-2.5 border-t border-[#e5e2e1] flex justify-between items-center text-xs leading-4 font-semibold">
                                <span className="text-[#434656]">Transaction ID</span>
                                <span className={cn(jetbrainsMono.className, "font-bold text-[#111111]")}>
                                    TXN-{activeTransaction.id.slice(-8).toUpperCase()}
                                </span>
                            </div>
                            <div className="py-2 border-t border-[#e5e2e1] flex justify-between items-center text-xs leading-4 font-semibold">
                                <span className="text-[#434656]">Rewards Earned</span>
                                <span className="font-bold text-[#008037] flex items-center gap-1">
                                    <BadgeCheck size={15} /> {rewardsTextFor(activeTransaction)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={closeDrawer}
                                className="flex-1 py-3 rounded-xl bg-white text-[#111111] text-[15px] leading-[18px] tracking-[0.02em] font-extrabold neo-border neo-shadow-badge active-press-sm flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Share2 size={18} /> Share Receipt
                            </button>
                            <button
                                onClick={closeDrawer}
                                className="flex-1 py-3 rounded-xl bg-[#2e5bff] text-white text-[15px] leading-[18px] tracking-[0.02em] font-extrabold neo-border neo-shadow-badge active-press-sm flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <HelpCircle size={18} /> Need Help
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
