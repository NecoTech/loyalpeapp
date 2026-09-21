'use client'

import { useState } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { X, Check, Gift, Star, Sparkles, Cake, BadgeCheck } from 'lucide-react'
import { cn } from '../../../lib/utils'
import RestaurantPhoto from './RestaurantPhoto'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

export type LoyaltyRewardItem = {
    id: string
    stampsRequired: number
    rewardType: 'discount' | 'freeItem'
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

export type LoyaltyCard = {
    id: string
    name: string
    items: (LoyaltyRewardItem & { redeemed: boolean })[]
}

export type PaymentSuccessResult = {
    amount: number
    discountAmount: number
    finalAmount: number
    freeItemName?: string
    discountLabel?: string
}

export const CARD_THEMES = [
    { bg: '#2e5bff', text: 'text-white', mutedText: 'text-white/70', badge: 'bg-white/20 border-white/30 text-white', checkedText: '#2e5bff' },
    { bg: '#D8B4FE', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#7c3aed' },
    { bg: '#FFDF40', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#a16207' },
    { bg: '#D2F843', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#4d7c0f' },
    { bg: '#FB7185', text: 'text-white', mutedText: 'text-white/70', badge: 'bg-white/20 border-white/30 text-white', checkedText: '#e11d48' },
]

export function formatCurrency(value: number) {
    return `₹${value.toFixed(2)}`
}

export function discountLabel(item: { rewardType: string; discountType?: 'percentage' | 'flat'; discountValue?: number }) {
    if (item.rewardType !== 'discount') return ''
    return item.discountType === 'flat'
        ? `${formatCurrency(item.discountValue || 0)} off`
        : `${item.discountValue || 0}% off`
}

export function rewardLabel(item: LoyaltyRewardItem) {
    if (item.rewardType === 'discount') return discountLabel(item)
    return item.freeItemName || 'Free item'
}

export function ordinal(n: number) {
    const v = n % 100
    if (v >= 11 && v <= 13) return 'th'
    switch (n % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
    }
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
}

function formatResultDate(date: Date) {
    const today = new Date()
    const isToday = date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate()
    return isToday ? 'Today' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatResultTime(date: Date) {
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

type PaymentSuccessScreenProps = {
    result: PaymentSuccessResult
    restaurant: { name: string; imageUrl?: string | null } | null
    timestamp: Date
    // The loyalty card this payment redeemed from, with its up-to-date stamp
    // state, and where it sits in the customer's card list (which picks its
    // colour theme). Null when the payment didn't involve a card.
    card: LoyaltyCard | null
    cardThemeIndex: number
    // The reward item this payment just unlocked, highlighted on the card.
    newItemId: string | null
    onClose: () => void
}

// Full-screen "payment verified" celebration. Shared by the payment page and
// the app-wide recovery watcher, so a payment that's confirmed while the
// customer is on any page — or after they closed and reopened the app — is
// shown in exactly the same way.
export default function PaymentSuccessScreen({ result, restaurant, timestamp, card, cardThemeIndex, newItemId, onClose }: PaymentSuccessScreenProps) {
    const [celebrationKey, setCelebrationKey] = useState(0)

    const theme = card ? CARD_THEMES[cardThemeIndex % CARD_THEMES.length] : null
    const unlockedCount = card ? card.items.filter(i => i.redeemed).length : 0
    const totalCount = card ? card.items.length : 0
    const nextReward = card ? card.items.find(i => !i.redeemed) : undefined

    return (
        <div
            key={celebrationKey}
            role="dialog"
            aria-modal="true"
            aria-label="Payment successful"
            className={cn(plusJakartaSans.className, "fixed inset-0 z-[100] bg-white text-[#111111] antialiased overflow-y-auto flex justify-center")}
        >
            <div className="w-full max-w-[428px] min-h-full flex flex-col relative pb-8">
                {/* Top Bar */}
                <header className="flex justify-between items-center w-full px-4 py-3 z-30 sticky top-0 bg-white/90 backdrop-blur-sm">
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white border-[3px] border-[#111111] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </header>

                {/* Celebration Hero: rocket launch + confetti burst */}
                <div
                    className="relative w-full h-56 flex flex-col items-center justify-center overflow-hidden pt-2 cursor-pointer select-none"
                    onClick={() => setCelebrationKey(k => k + 1)}
                    title="Tap the rocket to launch again!"
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="absolute w-3 h-3 bg-[#fd5835] border-[1.5px] border-[#111111] rounded-sm burst-piece-1" />
                        <div className="absolute w-2.5 h-2.5 rounded-full bg-[#f6bf22] border-[1.5px] border-[#111111] burst-piece-2" />
                        <div className="absolute w-3.5 h-2 bg-[#2e5bff] border-[1.5px] border-[#111111] rounded-sm burst-piece-3" />
                        <div className="absolute w-3 h-3 bg-[#ccff00] border-[1.5px] border-[#111111] rotate-45 burst-piece-4" />
                        <div className="absolute w-2.5 h-3.5 bg-[#b52603] border-[1.5px] border-[#111111] rounded-sm burst-piece-5" />
                        <div className="absolute w-2 h-2 rounded-full bg-white border-[1.5px] border-[#111111] burst-piece-6" />

                        <div className="absolute -top-1 left-10 anim-twinkle-star">
                            <Star size={28} fill="#f6bf22" className="text-[#f6bf22] drop-shadow-[1.5px_1.5px_0px_#111111]" />
                        </div>
                        <div className="absolute top-8 right-12 anim-twinkle-star" style={{ animationDelay: '0.4s' }}>
                            <Star size={22} fill="#fd5835" className="text-[#fd5835] drop-shadow-[1.5px_1.5px_0px_#111111]" />
                        </div>
                        <div className="absolute bottom-5 left-14 anim-twinkle-star" style={{ animationDelay: '0.8s' }}>
                            <Sparkles size={20} fill="#2e5bff" className="text-[#2e5bff]" />
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center anim-rocket-launch transition-transform active:scale-95">
                        <div className="relative w-24 h-28 flex items-center justify-center">
                            <div className="relative w-16 h-[5.5rem] bg-white border-[3px] border-[#111111] rounded-t-full shadow-[3px_3px_0px_#111111] overflow-hidden flex flex-col items-center">
                                <div className="w-full h-7 bg-[#fd5835] border-b-[3px] border-[#111111]" />
                                <div className="w-6 h-6 rounded-full bg-[#2e5bff] border-[3px] border-[#111111] mt-2 flex items-center justify-center shadow-inner">
                                    <div className="w-2 h-2 rounded-full bg-[#fcf9f8]" />
                                </div>
                                <div className="w-full h-2 bg-[#f6bf22] border-t-2 border-b-2 border-[#111111] mt-2" />
                            </div>
                            <div className="absolute -left-2 bottom-3 w-5 h-8 bg-[#b52603] border-[3px] border-[#111111] rounded-tl-xl -rotate-12 shadow-[2px_2px_0px_#111111]" />
                            <div className="absolute -right-2 bottom-3 w-5 h-8 bg-[#b52603] border-[3px] border-[#111111] rounded-tr-xl rotate-12 shadow-[2px_2px_0px_#111111]" />
                        </div>

                        <div className="flex flex-col items-center -mt-2 anim-flame">
                            <div className="w-7 h-10 bg-[#fd5835] border-[3px] border-[#111111] rounded-b-full shadow-[2px_2px_0px_#111111] flex items-center justify-center">
                                <div className="w-3.5 h-6 bg-[#f6bf22] rounded-b-full" />
                            </div>
                        </div>

                        <div className="relative w-28 h-6 flex justify-center items-center -mt-1 pointer-events-none">
                            <div className="absolute w-6 h-6 bg-zinc-200 border-2 border-[#111111] rounded-full anim-smoke-1" />
                            <div className="absolute w-5 h-5 bg-zinc-300 border-2 border-[#111111] rounded-full anim-smoke-2" />
                            <div className="absolute w-4 h-4 bg-zinc-200 border-2 border-[#111111] rounded-full anim-smoke-3" />
                        </div>
                    </div>
                </div>

                {/* Staggered Reveal Content */}
                <main className="px-4 flex flex-col items-center text-center -mt-2 z-20 flex-1">
                    {/* Step 1: verified badge + amount */}
                    <div className="seq-step-1 flex flex-col items-center w-full">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border-[3px] border-[#111111] shadow-[3px_3px_0px_#111111] mb-3">
                            <span className="w-5 h-5 rounded-full bg-[#2ed573] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                                <Check size={12} strokeWidth={3} />
                            </span>
                            <span className="text-[13px] leading-4 tracking-[0.03em] font-extrabold text-[#111111]">Payment Verified &amp; Confirmed</span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5 my-1">
                            <span className="text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#111111]">
                                {formatCurrency(result.finalAmount)}
                            </span>
                            <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold px-2 py-0.5 bg-[#f6bf22] border-2 border-[#111111] rounded-lg shadow-[2px_2px_0px_#111111] text-[#111111]">
                                INSTANT
                            </span>
                        </div>
                        {result.discountAmount > 0 && (
                            <p className="text-xs font-semibold text-zinc-500">
                                {result.discountLabel ? `${result.discountLabel} — ` : ''}
                                {formatCurrency(result.discountAmount)} saved
                            </p>
                        )}
                    </div>

                    {/* Step 2: merchant info */}
                    <div className="seq-step-2 w-full max-w-sm bg-white border-[3px] border-[#111111] rounded-2xl p-3 shadow-[4px_4px_0px_#111111] mt-2.5 flex items-center gap-3 text-left">
                        <div className="w-12 h-12 rounded-xl bg-[#2e5bff] border-[3px] border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center text-[18px] font-extrabold text-white shrink-0 overflow-hidden">
                            <RestaurantPhoto
                                src={restaurant?.imageUrl}
                                alt={restaurant?.name ?? 'Restaurant'}
                                className="w-full h-full object-cover"
                                fallback={<>{restaurant ? getInitials(restaurant.name) : '—'}</>}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111] truncate">
                                    {restaurant?.name ?? 'Restaurant'}
                                </h2>
                                <BadgeCheck size={16} className="text-[#2e5bff] shrink-0" aria-label="Loyalty partner" />
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-[11px] leading-[14px] font-bold text-[#434656] block">
                                {formatResultDate(timestamp)}
                            </span>
                            <span className="text-xs leading-4 font-bold text-[#111111] block">
                                {formatResultTime(timestamp)}
                            </span>
                        </div>
                    </div>

                    {/* Step 3: loyalty progress, or free-item confirmation */}
                    {card && theme ? (
                        <section aria-label="Loyalty progress" className="seq-step-3 w-full mt-5 text-left">
                            <div
                                className="w-full border-[3px] border-[#111111] rounded-2xl p-3 shadow-[4px_4px_0px_#111111] relative overflow-hidden select-none"
                                style={{ backgroundColor: theme.bg }}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold tracking-wider uppercase", theme.badge)}>
                                        <span className="w-2 h-2 rounded-full bg-[#ccff00]" />
                                        {card.name}
                                    </span>
                                    <span className={cn("text-xs font-extrabold tracking-wide", theme.text)}>
                                        {unlockedCount}/{totalCount} UNLOCKED
                                    </span>
                                </div>

                                <div className={cn("mt-3 pt-2.5 relative z-10 border-t", theme.text === 'text-white' ? 'border-white/20' : 'border-black/10')}>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {card.items.map(item => {
                                            const isNew = item.id === newItemId
                                            return (
                                                <div key={item.id} className="flex flex-col items-center gap-1 relative">
                                                    {isNew ? (
                                                        <div className="relative flex items-center justify-center">
                                                            <div className="absolute inset-0 rounded-full border-2 border-[#ffc72c] seq-stamp-ring pointer-events-none" />
                                                            <div className="w-8 h-8 rounded-full bg-[#f6bf22] text-[#111111] border-[2.5px] border-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] seq-stamp-pop z-10">
                                                                <Star size={17} fill="currentColor" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                                                                item.redeemed
                                                                    ? "bg-white border-2 border-[#111111] shadow-[1px_1px_0px_#111111]"
                                                                    : "bg-white/10 border-[1.5px] border-dashed border-white/50 text-white/80"
                                                            )}
                                                            style={item.redeemed ? { color: theme.checkedText } : undefined}
                                                        >
                                                            {item.redeemed ? (
                                                                <Check size={16} strokeWidth={3} />
                                                            ) : item.rewardType === 'freeItem' ? (
                                                                item.freeItemName?.toLowerCase().includes('meal') ? <Cake size={14} /> : <Gift size={14} />
                                                            ) : (
                                                                item.stampsRequired
                                                            )}
                                                        </div>
                                                    )}
                                                    <span className={cn("text-[11px] font-bold leading-none text-center truncate w-full", isNew ? "text-[#f6bf22] font-extrabold" : theme.mutedText)}>
                                                        {rewardLabel(item)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className={cn("mt-3 pt-2.5 border-t flex items-center justify-between relative z-10", theme.text === 'text-white' ? 'border-white/15' : 'border-black/10')}>
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles size={16} className="text-[#f6bf22]" />
                                        <p className={cn("text-xs font-bold", theme.text)}>
                                            {nextReward
                                                ? `Next reward at ${nextReward.stampsRequired}${ordinal(nextReward.stampsRequired)} visit`
                                                : 'All rewards unlocked!'}
                                        </p>
                                    </div>
                                    <span className={cn("text-xs font-mono font-bold", theme.mutedText)}>
                                        #{card.id.slice(-6).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </section>
                    ) : result.freeItemName ? (
                        <div className="seq-step-3 w-full mt-5 bg-white border-[3px] border-[#111111] rounded-2xl p-4 shadow-[4px_4px_0px_#111111] flex items-center gap-2 text-left">
                            <Gift size={20} className="text-[#111111] shrink-0" />
                            <p className="text-sm font-bold text-[#111111]">🎁 {result.freeItemName} redeemed</p>
                        </div>
                    ) : null}

                    {/* Step 4: Done */}
                    <div className="seq-step-4 w-full mt-5 pb-4">
                        <button
                            onClick={onClose}
                            className="w-full h-14 bg-[#ccff00] text-[#111111] text-[15px] leading-[18px] tracking-[0.02em] font-extrabold rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111111] flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </main>
            </div>
        </div>
    )
}
