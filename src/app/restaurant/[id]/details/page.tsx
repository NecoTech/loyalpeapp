'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ArrowLeft, Check, ChevronRight, Gift, MapPin, Navigation, Phone, Store } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { cn } from '../../../../../lib/utils'
import { secureFetch } from '../../../../../lib/secureFetch'
import RestaurantPhoto from '../../../components/RestaurantPhoto'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

type RestaurantDetails = {
    id: string
    name: string
    address?: string | null
    phoneNumber?: string | null
    directionsUrl?: string | null
    reviewUrl?: string | null
    imageUrl?: string | null
    bannerUrl?: string | null
}

const ACTION_GRID_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

function GoogleLogo() {
    return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
    )
}

type RewardType = 'discount' | 'freeItem'

type LoyaltyRewardItem = {
    id: string
    stampsRequired: number
    rewardType: RewardType
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
    redeemed: boolean
}

type LoyaltyCard = {
    id: string
    name: string
    items: LoyaltyRewardItem[]
}

function formatCurrency(amount: number) {
    return `₹${amount.toFixed(2)}`
}

function rewardLabel(item: LoyaltyRewardItem) {
    if (item.rewardType === 'discount') {
        return item.discountType === 'flat'
            ? `${formatCurrency(item.discountValue || 0)} off`
            : `${item.discountValue || 0}% off`
    }
    return item.freeItemName || 'Free item'
}

function ordinal(n: number) {
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

const CARD_THEMES = [
    { gradient: 'bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]', mutedText: 'text-blue-100/90' },
    { gradient: 'bg-gradient-to-br from-[#FF80BF] via-[#F472B6] to-[#FB7185]', mutedText: 'text-rose-100' },
    { gradient: 'bg-gradient-to-br from-[#FDBA74] via-[#FB923C] to-[#EA580C]', mutedText: 'text-orange-100' },
    { gradient: 'bg-gradient-to-br from-[#6EE7B7] via-[#34D399] to-[#059669]', mutedText: 'text-emerald-100' },
    { gradient: 'bg-gradient-to-br from-[#C4B5FD] via-[#A78BFA] to-[#7C3AED]', mutedText: 'text-violet-100' },
]

function isCardCompleted(card: LoyaltyCard) {
    return card.items.length > 0 && card.items.every(item => item.redeemed)
}

function LoyaltyCardsCarousel({ cards }: { cards: LoyaltyCard[] }) {
    // Fully redeemed cards move to the back — the still-in-progress card(s)
    // the customer actually needs stay up front. A stable sort keeps each
    // group in its original (creation) order.
    const orderedCards = [...cards].sort((a, b) => Number(isCardCompleted(a)) - Number(isCardCompleted(b)))

    return (
        <section className="pt-2">
            <div className="flex items-center justify-between mb-3 px-0.5">
                <h2 className="text-base font-black tracking-tight uppercase text-zinc-900">Loyalty Cards</h2>
                {cards.length > 1 && (
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-0.5">
                        Swipe <ChevronRight size={14} />
                    </span>
                )}
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-5 px-5 snap-x snap-mandatory">
                {orderedCards.map((card, index) => {
                    const theme = CARD_THEMES[index % CARD_THEMES.length]
                    const unlockedCount = card.items.filter(i => i.redeemed).length
                    const totalCount = card.items.length
                    const nextReward = card.items.find(i => !i.redeemed)
                    const compact = totalCount <= 4

                    return (
                        <article
                            key={card.id}
                            className={cn(
                                "w-[86%] sm:w-[320px] shrink-0 snap-start rounded-3xl border-2 border-black shop-shadow text-white relative overflow-hidden flex flex-col justify-between gap-3 h-52 p-5",
                                theme.gradient
                            )}
                        >
                            <div className="absolute -right-12 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between relative z-10">
                                <span className="glass-pill px-3 py-1 rounded-xl text-[11px] font-black tracking-widest uppercase border border-white/30 text-white shadow-sm">
                                    {card.name}
                                </span>
                                <span className={cn("text-[11px] font-semibold tracking-wider", theme.mutedText)}>
                                    {unlockedCount}/{totalCount} Unlocked
                                </span>
                            </div>

                            {compact ? (
                                <div className="relative z-10 pt-2">
                                    <div className="flex items-end gap-3.5">
                                        {card.items.map(item => (
                                            <div key={item.id} className="flex flex-col items-center gap-1.5">
                                                <span className={cn("text-[10px] font-bold text-center leading-tight max-w-[56px] truncate", theme.mutedText)}>
                                                    {rewardLabel(item)}
                                                </span>
                                                <div className={cn(
                                                    "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm",
                                                    item.redeemed ? "bg-white text-zinc-900" : "glass-slot border border-white/40 text-white"
                                                )}>
                                                    {item.redeemed ? (
                                                        <Check size={18} className="stroke-[3.5]" />
                                                    ) : item.rewardType === 'freeItem' ? (
                                                        <Gift size={18} />
                                                    ) : (
                                                        item.stampsRequired
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 grid grid-cols-5 gap-2">
                                    {card.items.map(item => (
                                        <div key={item.id} className="flex flex-col items-center gap-1">
                                            <div className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                                                item.redeemed ? "bg-white text-zinc-900 border-2 border-black shop-shadow-sm" : "glass-slot border border-white/40 text-white"
                                            )}>
                                                {item.redeemed ? (
                                                    <Check size={16} className="stroke-[3.5]" />
                                                ) : item.rewardType === 'freeItem' ? (
                                                    <Gift size={14} />
                                                ) : (
                                                    <span className="text-xs font-bold">{item.stampsRequired}</span>
                                                )}
                                            </div>
                                            <span className={cn("text-[9px] font-bold text-center leading-tight truncate w-full", theme.mutedText)}>
                                                {rewardLabel(item)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={cn("relative z-10 flex items-center justify-between text-[11px] border-t border-white/15 pt-2", theme.mutedText)}>
                                <span>
                                    {nextReward
                                        ? `Next reward at ${nextReward.stampsRequired}${ordinal(nextReward.stampsRequired)} visit`
                                        : 'All rewards unlocked!'}
                                </span>
                                <span className="font-mono tracking-wider font-semibold">#{card.id.slice(-6).toUpperCase()}</span>
                            </div>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}

export default function RestaurantDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const { user } = useAuth()

    const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
    const [cards, setCards] = useState<LoyaltyCard[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchRestaurant = async () => {
            try {
                const { res, data } = await secureFetch(`/api/restaurant/${id}`)
                if (!res.ok) return
                if (!data?.success || !data.restaurant) return
                setRestaurant(data.restaurant)
            } catch (err) {
                console.error('Failed to load restaurant details', err)
            }
        }

        const fetchCards = async () => {
            setIsLoading(true)
            try {
                const userId = user?.email || user?.phoneNumber
                const searchParams = new URLSearchParams({ restaurantId: id })
                if (userId) searchParams.set('userId', userId)

                const { res, data } = await secureFetch(`/api/loyalty/card-progress?${searchParams.toString()}`)
                if (res.ok && data?.success) {
                    setCards((data.cards as LoyaltyCard[]).filter(c => c.items.length > 0))
                }
            } catch (err) {
                console.error('Failed to load loyalty cards', err)
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchRestaurant()
            fetchCards()
        }
    }, [id, user?.email, user?.phoneNumber])

    const initials = restaurant ? getInitials(restaurant.name) : null
    const actionCount = [restaurant?.directionsUrl, restaurant?.phoneNumber, restaurant?.reviewUrl].filter(Boolean).length

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-white text-zinc-900 flex justify-center selection:bg-lime-300")}>
            <div className="w-full max-w-md min-h-screen bg-white flex flex-col relative pb-28">
                {/* Top Bar */}
                <header className="pt-4 pb-2 px-5 flex items-center justify-between sticky top-0 z-30 bg-white/95 backdrop-blur-md">
                    <button
                        aria-label="Go back"
                        onClick={() => router.push('/restaurants')}
                        className="w-11 h-11 rounded-2xl bg-white border-2 border-black shop-shadow-sm active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center group cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} className="text-zinc-900 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div />
                    <div className="w-11 h-11" aria-hidden="true" />
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 pt-3 space-y-6">
                    {/* Hero */}
                    <section className="relative">
                        <div className="w-full h-48 sm:h-52 rounded-3xl bg-gradient-to-br from-[#A2C7FE] via-[#B8D3FE] to-[#DEC6FF] border-2 border-black shop-shadow flex items-center justify-center relative overflow-hidden">
                            {/* The restaurant's banner fills the hero when it has one;
                                otherwise (or if it fails to load) the default hero below. */}
                            <RestaurantPhoto
                                src={restaurant?.bannerUrl}
                                alt={`${restaurant?.name ?? 'Restaurant'} banner`}
                                className="absolute inset-0 w-full h-full object-cover"
                                fallback={
                                    <>
                                        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full border-4 border-white/25 pointer-events-none" />
                                        <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full border-4 border-white/20 pointer-events-none" />
                                        <RestaurantPhoto
                                            src={restaurant?.imageUrl}
                                            alt={restaurant?.name ?? 'Restaurant'}
                                            className="relative z-10 w-36 h-36 rounded-3xl border-2 border-black shop-shadow object-cover bg-white"
                                            fallback={initials ? (
                                                <span className="text-white text-6xl sm:text-7xl font-black tracking-tight select-none drop-shadow-sm">
                                                    {initials}
                                                </span>
                                            ) : (
                                                <Store size={56} className="text-white/90" />
                                            )}
                                        />
                                    </>
                                }
                            />
                        </div>
                    </section>

                    {/* Merchant Meta */}
                    <section className="space-y-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                                {restaurant?.name ?? 'Loading...'}
                            </h1>
                            {restaurant?.address && (
                                <div className="mt-2.5 flex items-start gap-2 text-zinc-600 text-[13px] leading-relaxed">
                                    <MapPin size={16} strokeWidth={2} className="text-zinc-700 shrink-0 mt-0.5" />
                                    <p>{restaurant.address}</p>
                                </div>
                            )}
                        </div>

                        {actionCount > 0 && (
                            <div className={cn("grid gap-2.5 pt-1", ACTION_GRID_COLS[actionCount])}>
                                {restaurant?.directionsUrl && (
                                    <a
                                        href={restaurant.directionsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-white border-2 border-black font-extrabold text-xs sm:text-sm text-zinc-900 shop-shadow hover:bg-zinc-50 active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all"
                                    >
                                        <Navigation size={16} strokeWidth={2.5} className="text-sky-600" />
                                        <span>Directions</span>
                                    </a>
                                )}
                                {restaurant?.phoneNumber && (
                                    <a
                                        href={`tel:${restaurant.phoneNumber}`}
                                        className="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-white border-2 border-black font-extrabold text-xs sm:text-sm text-zinc-900 shop-shadow hover:bg-zinc-50 active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all"
                                    >
                                        <Phone size={16} strokeWidth={2.5} className="text-emerald-600" />
                                        <span>Call</span>
                                    </a>
                                )}
                                {restaurant?.reviewUrl && (
                                    <a
                                        href={restaurant.reviewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 flex items-center justify-center gap-1.5 rounded-2xl bg-white border-2 border-black font-extrabold text-xs sm:text-sm text-zinc-900 shop-shadow hover:bg-zinc-50 active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all"
                                    >
                                        <GoogleLogo />
                                        <span>Review</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Loyalty Cards */}
                    {isLoading ? (
                        <p className="text-center text-sm text-zinc-500 pt-4">Loading loyalty cards...</p>
                    ) : cards.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500 px-2 pt-4">
                            {restaurant?.name ?? 'This restaurant'} hasn&apos;t set up any loyalty rewards yet.
                        </p>
                    ) : (
                        <LoyaltyCardsCarousel cards={cards} />
                    )}
                </div>

                {/* Floating Pay Button */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-40">
                    <button
                        onClick={() => router.push(`/restaurant/${id}`)}
                        className="w-full h-12 bg-[#B4F34C] hover:bg-[#A1E635] text-zinc-900 border-2 border-black rounded-2xl font-black text-base shop-shadow flex items-center justify-center gap-2 active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all uppercase tracking-wide cursor-pointer"
                    >
                        <span>Pay</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
