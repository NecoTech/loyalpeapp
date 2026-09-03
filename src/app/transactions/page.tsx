'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ArrowLeft, Search, Store, Gift, Percent } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type Transaction = {
    id: string
    restaurantId: string
    restaurantName: string
    amount: number
    discountAmount: number
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    finalAmount: number
    freeItemName?: string
    createdAt: string
}

function formatCurrency(value: number) {
    return `₹${value.toFixed(2)}`
}

function discountLabel(transaction: Transaction) {
    if (!transaction.amount || transaction.discountAmount <= 0) return null
    const percentage = Math.round((transaction.discountAmount / transaction.amount) * 100)
    return `${percentage}% off`
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

export default function TransactionsPage() {
    const router = useRouter()
    const { user } = useAuth()

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!userId) {
            router.push(`/auth?redirect=${encodeURIComponent('/transactions')}`)
            return
        }

        const fetchTransactions = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/loyalty/transactions?userId=${encodeURIComponent(userId)}`)
                const data = await res.json()
                if (data.success) {
                    setTransactions(data.transactions)
                }
            } catch (err) {
                console.error('Failed to load transactions', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchTransactions()
    }, [user, router])

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

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] text-[#1b1c18] min-h-screen pb-24")}>
            {/* Top App Bar */}
            <header className="flex items-center gap-3 px-6 pt-6 pb-2 sticky top-0 bg-[#fbf9f2]/95 backdrop-blur-sm z-10">
                <button
                    aria-label="Back"
                    className="w-10 h-10 -ml-2 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all"
                    onClick={() => router.back()}
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-[24px] leading-tight font-extrabold">Transactions</h1>
            </header>

            <main className="px-6 pt-4 max-w-2xl mx-auto">
                {/* Search Bar */}
                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-[#70787d]" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#f5f4ed] border-none focus:ring-2 focus:ring-[#4d6700] text-[#1b1c18] placeholder-[#bfc8cd] shadow-sm outline-none transition-shadow"
                    />
                </div>

                {isLoading ? (
                    <p className="text-center text-sm text-[#70787d] mt-8">Loading transactions...</p>
                ) : groupedTransactions.length === 0 ? (
                    <div className="flex flex-col items-center text-center gap-3 mt-12">
                        <div className="w-14 h-14 rounded-full bg-[#f0eee7] text-[#70787d] flex items-center justify-center">
                            <Store size={24} />
                        </div>
                        <h3 className="font-bold text-lg">No transactions yet</h3>
                        <p className="text-sm text-[#70787d] max-w-xs">
                            Your payments will show up here once you start paying with loyalty rewards.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedTransactions.map(group => (
                            <div key={group.label}>
                                <h3 className={cn(jetbrainsMono.className, "text-xs text-[#70787d] uppercase tracking-wider mb-3 pt-2")}>
                                    {group.label}
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {group.items.map(transaction => (
                                        <div
                                            key={transaction.id}
                                            className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-[#eae8e1] flex items-center justify-center text-[#1b1c18] shrink-0">
                                                    <Store size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1b1c18]">{transaction.restaurantName}</p>
                                                    <p className="text-xs text-[#70787d]">
                                                        {new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {' · '}
                                                        {new Date(transaction.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                                                    </p>
                                                    {(transaction.discountAmount > 0 || transaction.freeItemName) && (
                                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                                            {transaction.discountAmount > 0 && (
                                                                <span className="flex items-center gap-1 text-[#4d6700]">
                                                                    <Percent size={12} />
                                                                    {discountLabel(transaction) && `${discountLabel(transaction)} · `}
                                                                    {formatCurrency(transaction.discountAmount)} saved
                                                                </span>
                                                            )}
                                                            {transaction.freeItemName && (
                                                                <span className="flex items-center gap-1 text-[#0d6683]">
                                                                    <Gift size={12} /> {transaction.freeItemName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-extrabold text-[#1b1c18]">
                                                    -{formatCurrency(transaction.finalAmount)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
