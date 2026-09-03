'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ArrowLeft, ArrowRight, Check, Gift, MapPin, Navigation, Phone, Store } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { cn } from '../../../../../lib/utils'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type RestaurantDetails = {
    id: string
    name: string
    address?: string | null
    phoneNumber?: string | null
    directionsUrl?: string | null
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

// Glossy gradient + diagonal shine overlay, same technique as the loyalty
// page's card stack — copied here since this page's cards use a different
// (horizontal arc) layout, not the vertical stack, so it isn't shared code.
function CardGloss({ from, mid, to, shineOpacity }: { from: string; mid: string; to: string; shineOpacity: number }) {
    return (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(135deg, ${from} 0%, ${mid} 45%, ${to} 100%)` }}>
            <div
                className="absolute inset-0"
                style={{
                    opacity: shineOpacity,
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 55%, transparent 70%)',
                    transform: 'skewX(-25deg)',
                }}
            />
        </div>
    )
}

type CardTheme = {
    bg: string
    text: string
    checkedBg: string
    checkedIcon: string
    pendingBg: string
    pendingIcon: string
    art: JSX.Element
}

const CARD_THEMES: CardTheme[] = [
    {
        bg: 'bg-[#2563eb]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-blue-600',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: <CardGloss from="rgb(59, 130, 246)" mid="rgb(29, 78, 216)" to="rgb(30, 58, 138)" shineOpacity={0.5} />,
    },
    {
        bg: 'bg-[#fce7f3]', text: 'text-[#1b1c18]',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#0d6683]',
        pendingBg: 'border border-black/5 text-black/50 bg-white/40 backdrop-blur-sm', pendingIcon: 'text-black/40',
        art: <CardGloss from="rgb(251, 207, 232)" mid="rgb(244, 114, 182)" to="rgb(219, 39, 119)" shineOpacity={0.6} />,
    },
    {
        bg: 'bg-[#dc2626]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-red-600',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: <CardGloss from="rgb(239, 68, 68)" mid="rgb(185, 28, 28)" to="rgb(127, 29, 29)" shineOpacity={0.5} />,
    },
    {
        bg: 'bg-[#0d6683]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#0d6683]',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: <CardGloss from="rgb(56, 189, 213)" mid="rgb(13, 102, 131)" to="rgb(5, 49, 63)" shineOpacity={0.5} />,
    },
    {
        bg: 'bg-[#ebddff]', text: 'text-[#1b1c18]',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#4f3d73]',
        pendingBg: 'border border-black/5 text-black/50 bg-white/40 backdrop-blur-sm', pendingIcon: 'text-black/40',
        art: <CardGloss from="rgb(210, 188, 251)" mid="rgb(79, 61, 115)" to="rgb(45, 32, 71)" shineOpacity={0.5} />,
    },
]

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
}

// Arc scroll behavior: as the horizontal scroller moves, each card rotates
// and dips away from center based on its distance from the viewport's
// center — ported directly from the mockup's scroll listener, using refs
// instead of DOM queries since this runs every scroll frame.
const MAX_ROTATION_DEG = 12
const MAX_Y_OFFSET_PX = 30

function CardScroller({ cards, restaurantName }: { cards: LoyaltyCard[]; restaurantName: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const updateArc = () => {
            const containerCenter = container.scrollLeft + container.clientWidth / 2
            cardRefs.current.forEach(item => {
                if (!item) return
                const itemCenter = item.offsetLeft + item.clientWidth / 2
                const distance = itemCenter - containerCenter
                const normalized = distance / container.clientWidth
                const rotation = normalized * MAX_ROTATION_DEG
                const yOffset = Math.abs(normalized) * MAX_Y_OFFSET_PX
                const scale = 1 - Math.abs(normalized) * 0.05
                item.style.transform = `translateY(${yOffset}px) rotate(${rotation}deg) scale(${scale})`
                item.style.zIndex = Math.abs(normalized) < 0.3 ? '10' : '5'
            })
        }

        updateArc()
        container.addEventListener('scroll', updateArc, { passive: true })
        window.addEventListener('resize', updateArc)

        // Center the active (first) card once the layout has settled. The
        // scroll listener above is what actually re-runs updateArc() once
        // the browser applies the scroll — calling updateArc() a second
        // time here, synchronously right after scrollTo(), read scrollLeft
        // before the browser had applied it, produced a transform for the
        // stale position, and then got corrected a frame later once the
        // real scroll event fired — that two-step correction is what showed
        // up as the first card jittering into place.
        const timeoutId = setTimeout(() => {
            const first = cardRefs.current[0]
            if (first) {
                const scrollPos = first.offsetLeft - container.clientWidth / 2 + first.clientWidth / 2
                container.scrollTo({ left: scrollPos, behavior: 'auto' })
            }
        }, 50)

        return () => {
            container.removeEventListener('scroll', updateArc)
            window.removeEventListener('resize', updateArc)
            clearTimeout(timeoutId)
        }
    }, [cards])

    return (
        <div
            ref={containerRef}
            className="hide-scrollbar flex w-full overflow-x-auto snap-x snap-mandatory items-end h-[260px] px-[7.5%] pb-4 gap-4"
            style={{ scrollSnapType: 'x mandatory' }}
        >
            {cards.map((card, index) => {
                const theme = CARD_THEMES[index % CARD_THEMES.length]
                const isLightBadge = theme.text !== 'text-white'
                return (
                    <div
                        key={card.id}
                        ref={el => { cardRefs.current[index] = el }}
                        className={cn("card-transition snap-center shrink-0 w-[85%] h-48 rounded-2xl overflow-hidden shadow-[0_-10px_25px_rgba(0,0,0,0.4)]", theme.bg)}
                        style={{ scrollSnapAlign: 'center', transformOrigin: 'center bottom' }}
                    >
                        {theme.art}
                        <div className={cn("p-4 h-full flex flex-col relative z-10", theme.text)}>
                            <span className={cn(
                                jetbrainsMono.className,
                                "text-[11px] tracking-wide uppercase font-semibold px-2.5 py-1 rounded-full self-start backdrop-blur-sm border",
                                isLightBadge ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20"
                            )}>
                                {card.name}
                            </span>

                            <div className="grid grid-cols-5 gap-2.5 flex-1 content-center mt-2">
                                {card.items.map(item => (
                                    <div key={item.id} className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] leading-tight text-center opacity-80 line-clamp-2">
                                            {rewardLabel(item)}
                                        </span>
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                item.redeemed ? theme.checkedBg : theme.pendingBg
                                            )}
                                            aria-label={item.redeemed ? 'Redeemed' : 'Not redeemed'}
                                        >
                                            {item.redeemed ? (
                                                <Check size={18} className={theme.checkedIcon} />
                                            ) : item.rewardType === 'freeItem' ? (
                                                <Gift size={16} className={theme.pendingIcon} />
                                            ) : (
                                                <span className="text-xs font-bold">{item.stampsRequired}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <span className="sr-only">{card.name} for {restaurantName}</span>
                    </div>
                )
            })}
        </div>
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
                const res = await fetch(`/api/restaurant/${id}`)
                if (!res.ok) return
                const data = await res.json()
                if (!data.success || !data.restaurant) return
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

                const res = await fetch(`/api/loyalty/card-progress?${searchParams.toString()}`)
                const data = await res.json()
                if (res.ok && data.success) {
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

    return (
        <div className={cn(hankenGrotesk.className, "bg-white text-[#1b1c18] h-screen flex flex-col overflow-hidden max-w-md mx-auto md:shadow-2xl md:my-8 md:rounded-[1.5rem] relative")}>
            <main
                className="flex-1 flex flex-col relative overflow-hidden"
                style={{
                    backgroundColor: '#fbf9f2',
                    backgroundImage:
                        'radial-gradient(at 0% 0%, rgba(137, 207, 240, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(209, 187, 250, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(137, 207, 240, 0.1) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(209, 187, 250, 0.1) 0px, transparent 50%)',
                    backgroundAttachment: 'fixed',
                }}
            >
                <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30 mix-blend-soft-light z-0" xmlns="http://www.w3.org/2000/svg">
                    <filter id="detailsNoiseFilter">
                        <feTurbulence baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
                    </filter>
                    <rect filter="url(#detailsNoiseFilter)" height="100%" width="100%" />
                </svg>

                <button
                    aria-label="Back to restaurants"
                    onClick={() => router.push('/restaurants')}
                    className="absolute top-6 left-6 z-20 text-[#1b1c18] hover:opacity-70 active:scale-95 transition-all"
                >
                    <ArrowLeft size={28} />
                </button>

                {/* Fixed Top Details */}
                <div className="relative z-10 w-full flex flex-col items-center pt-16 pb-2 px-6 shrink-0">
                    {/* Hero — no restaurant photo in this app, so a colored initials block stands in for one */}
                    <div className="w-full h-48 rounded-2xl overflow-hidden shadow-lg mb-6 bg-gradient-to-br from-[#89cff0] to-[#d1bbfa] flex items-center justify-center">
                        {initials ? (
                            <span className="text-6xl font-extrabold text-white/90 tracking-tight">{initials}</span>
                        ) : (
                            <Store size={48} className="text-white/90" />
                        )}
                    </div>

                    <div className="w-full flex flex-col items-start gap-1">
                        <h1 className="text-3xl font-bold text-[#1b1c18] tracking-tight">
                            {restaurant?.name ?? 'Loading...'}
                        </h1>
                        {restaurant?.address && (
                            <div className="flex items-center gap-1 text-[#40484d] text-sm mt-1">
                                <MapPin size={16} className="opacity-60 shrink-0" />
                                <span>{restaurant.address}</span>
                            </div>
                        )}
                    </div>

                    {(restaurant?.directionsUrl || restaurant?.phoneNumber) && (
                        <div className="flex gap-3 w-full mt-6">
                            {restaurant?.directionsUrl && (
                                <a
                                    href={restaurant.directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-black/5 rounded-xl shadow-sm hover:bg-[#f5f4ed] transition-colors"
                                >
                                    <Navigation size={18} className="text-[#0d6683]" />
                                    <span className="text-sm font-semibold">Directions</span>
                                </a>
                            )}
                            {restaurant?.phoneNumber && (
                                <a
                                    href={`tel:${restaurant.phoneNumber}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-black/5 rounded-xl shadow-sm hover:bg-[#f5f4ed] transition-colors"
                                >
                                    <Phone size={18} className="text-[#0d6683]" />
                                    <span className="text-sm font-semibold">Call</span>
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Card Scroll Area */}
                <div className="relative z-10 w-full flex-1 flex flex-col justify-end pb-8">
                    {isLoading ? (
                        <p className="text-center text-sm text-[#70787d]">Loading loyalty cards...</p>
                    ) : cards.length === 0 ? (
                        <p className="text-center text-sm text-[#70787d] px-6">
                            {restaurant?.name ?? 'This restaurant'} hasn&apos;t set up any loyalty rewards yet.
                        </p>
                    ) : (
                        <CardScroller cards={cards} restaurantName={restaurant?.name ?? 'Restaurant'} />
                    )}
                </div>

                {/* Pay Button */}
                <div className="relative z-10 px-6 mt-6 mb-8 w-full shrink-0">
                    <button
                        onClick={() => router.push(`/restaurant/${id}`)}
                        className="w-full flex items-center justify-between px-6 py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform bg-[#c5f253] text-[#151f00]"
                    >
                        <span>Pay</span>
                        <ArrowRight size={22} />
                    </button>
                </div>
            </main>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .card-transition {
                    transition: transform 0.1s ease-out;
                }
            `}</style>
        </div>
    )
}
