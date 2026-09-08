'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ArrowLeft, Check, CreditCard, Gift, QrCode } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { cn } from '../../../../../lib/utils'
import { secureFetch } from '../../../../../lib/secureFetch'
import ShaderBackground from '../../../components/ShaderBackground'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type RestaurantDetails = {
    id: string
    name: string
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

function isCardCompleted(card: LoyaltyCard) {
    return card.items.length > 0 && card.items.every(item => item.redeemed)
}

// Geometry for each depth in the card stack, front (index 0, the active
// card) to back — sizes, shadows and hover lift copied from the mockup's
// four hand-tuned cards, each step back smaller, narrower, and further from
// the bottom edge. Kept separate from color: geometry is tied to a card's
// POSITION in the stack, while color is tied to the CARD ITSELF (below), so
// a card keeps its own color as it moves — e.g. when it's fully redeemed and
// recedes to the back.
type StackGeometry = {
    bottomPx: number
    widthPct: number
    heightPx: number
    z: number
    circleSize: number
    padding: string
    gap: string
    numberSizeClass: string
    roundedTop: boolean
    shadow: string
    hoverLift: string
}

// Glossy gradient + diagonal shine overlay behind each card's content,
// copied from the mockup's per-card inline gradients.
function CardGloss({ from, mid, to, shineOpacity, shineColors }: {
    from: string
    mid: string
    to: string
    shineOpacity: number
    shineColors: [string, string, string]
}) {
    return (
        <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{ background: `linear-gradient(135deg, ${from} 0%, ${mid} 45%, ${to} 100%)` }}
        >
            <div
                className="absolute inset-0"
                style={{
                    opacity: shineOpacity,
                    background: `linear-gradient(105deg, transparent 30%, ${shineColors[0]} 45%, ${shineColors[1]} 50%, ${shineColors[2]} 55%, transparent 70%)`,
                    transform: 'skewX(-25deg)',
                }}
            />
        </div>
    )
}

const RED_CARD_ART = (
    <CardGloss
        from="rgb(239, 68, 68)" mid="rgb(185, 28, 28)" to="rgb(127, 29, 29)"
        shineOpacity={0.5} shineColors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']}
    />
)

const PINK_CARD_ART = (
    <CardGloss
        from="rgb(251, 207, 232)" mid="rgb(244, 114, 182)" to="rgb(219, 39, 119)"
        shineOpacity={0.6} shineColors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
    />
)

const BLUE_CARD_ART = (
    <CardGloss
        from="rgb(59, 130, 246)" mid="rgb(29, 78, 216)" to="rgb(30, 58, 138)"
        shineOpacity={0.5} shineColors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']}
    />
)

// The mockup didn't include a back-most (white) card this round — extrapolated
// to match the same glossy treatment as the other three, kept subtle since
// it's an off-white card.
const WHITE_CARD_ART = (
    <CardGloss
        from="rgb(255, 255, 255)" mid="rgb(243, 244, 246)" to="rgb(229, 231, 235)"
        shineOpacity={0.5} shineColors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
    />
)

// Two extra themes (beyond the mockup's four) using this app's own brand
// colors, so a fifth/sixth loyalty card still gets its own distinct look
// instead of repeating an earlier card's color.
const TEAL_CARD_ART = (
    <CardGloss
        from="rgb(56, 189, 213)" mid="rgb(13, 102, 131)" to="rgb(5, 49, 63)"
        shineOpacity={0.5} shineColors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']}
    />
)

const PURPLE_CARD_ART = (
    <CardGloss
        from="rgb(210, 188, 251)" mid="rgb(79, 61, 115)" to="rgb(45, 32, 71)"
        shineOpacity={0.5} shineColors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']}
    />
)

// Color is tied to the CARD ITSELF, not its position in the stack — a
// specific card keeps the same theme for its whole lifetime, picked
// deterministically from its id, so it doesn't change color when it moves
// (e.g. receding to the back once fully redeemed).
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
        bg: 'bg-[#dc2626]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-red-600',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: RED_CARD_ART,
    },
    {
        bg: 'bg-[#fce7f3]', text: 'text-[#1b1c18]',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#0d6683]',
        pendingBg: 'border border-black/5 text-black/50 bg-white/40 backdrop-blur-sm', pendingIcon: 'text-black/40',
        art: PINK_CARD_ART,
    },
    {
        bg: 'bg-[#2563eb]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-blue-600',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: BLUE_CARD_ART,
    },
    {
        bg: 'bg-white', text: 'text-[#1b1c18]',
        checkedBg: 'bg-[#0d6683]', checkedIcon: 'text-white',
        pendingBg: 'border border-black/10 text-black/40 bg-white/50 backdrop-blur-sm', pendingIcon: 'text-black/20',
        art: WHITE_CARD_ART,
    },
    {
        bg: 'bg-[#0d6683]', text: 'text-white',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#0d6683]',
        pendingBg: 'bg-white/20 border border-white/30 text-white/80 backdrop-blur-sm', pendingIcon: 'text-white/60',
        art: TEAL_CARD_ART,
    },
    {
        bg: 'bg-[#ebddff]', text: 'text-[#1b1c18]',
        checkedBg: 'bg-white shadow-sm', checkedIcon: 'text-[#4f3d73]',
        pendingBg: 'border border-black/5 text-black/50 bg-white/40 backdrop-blur-sm', pendingIcon: 'text-black/40',
        art: PURPLE_CARD_ART,
    },
]


const STACK_GEOMETRY: StackGeometry[] = [
    {
        bottomPx: 0, widthPct: 95, heightPx: 150, z: 40, circleSize: 48,
        padding: 'p-6', gap: 'gap-4', numberSizeClass: 'text-sm', roundedTop: true,
        shadow: 'shadow-[0_-12px_30px_rgba(0,0,0,0.6)]', hoverLift: 'hover:-translate-y-2 active:-translate-y-2',
    },
    {
        bottomPx: 130, widthPct: 85, heightPx: 160, z: 30, circleSize: 48,
        padding: 'p-6', gap: 'gap-4', numberSizeClass: 'text-sm', roundedTop: false,
        shadow: 'shadow-[0_-10px_25px_rgba(0,0,0,0.5)]', hoverLift: 'hover:-translate-y-6 active:-translate-y-6',
    },
    {
        bottomPx: 220, widthPct: 75, heightPx: 144, z: 20, circleSize: 40,
        padding: 'p-4', gap: 'gap-3', numberSizeClass: 'text-xs', roundedTop: false,
        shadow: 'shadow-[0_-8px_20px_rgba(0,0,0,0.4)]', hoverLift: 'hover:-translate-y-4 active:-translate-y-4',
    },
    {
        bottomPx: 280, widthPct: 65, heightPx: 128, z: 10, circleSize: 32,
        padding: 'p-4', gap: 'gap-2', numberSizeClass: 'text-[10px]', roundedTop: false,
        shadow: 'shadow-[0_-5px_15px_rgba(0,0,0,0.3)]', hoverLift: 'hover:-translate-y-2 active:-translate-y-2',
    },
]

function getStackGeometry(positionFromFront: number): StackGeometry {
    if (positionFromFront < STACK_GEOMETRY.length) return STACK_GEOMETRY[positionFromFront]

    // More cards than we have hand-tuned depths for — keep receding behind
    // the back-most depth using the same shrinking pattern.
    const extra = positionFromFront - (STACK_GEOMETRY.length - 1)
    const base = STACK_GEOMETRY[STACK_GEOMETRY.length - 1]
    return {
        ...base,
        bottomPx: base.bottomPx + extra * 40,
        widthPct: Math.max(45, base.widthPct - extra * 8),
        heightPx: Math.max(90, base.heightPx - extra * 10),
        z: Math.max(1, base.z - extra),
        circleSize: Math.max(24, base.circleSize - extra * 4),
    }
}

function StackedLoyaltyCard({
    card,
    restaurantName,
    positionFromFront,
    themeIndex,
    isFeatured,
    onClick,
}: {
    card: LoyaltyCard
    restaurantName: string
    positionFromFront: number
    themeIndex: number
    isFeatured: boolean
    onClick: () => void
}) {
    const geometry = getStackGeometry(positionFromFront)
    const theme = CARD_THEMES[themeIndex % CARD_THEMES.length]
    const isLightBadge = theme.text !== 'text-white'

    return (
        <div
            onClick={onClick}
            className={cn(
                "card-transition overflow-hidden cursor-pointer",
                theme.bg,
                isFeatured
                    // Fixed (viewport-relative), not absolute (stack-container-relative) —
                    // the stack container can be taller than the viewport when there are
                    // several cards, so centering against it would drift the zoomed card
                    // out of view instead of centering it on screen.
                    ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[380px] h-[57vw] max-h-[420px] rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-[105]"
                    : cn("absolute left-1/2 -translate-x-1/2", geometry.shadow, geometry.hoverLift, geometry.roundedTop ? "rounded-t-3xl" : "rounded-2xl")
            )}
            style={isFeatured ? undefined : {
                bottom: `${geometry.bottomPx}px`,
                width: `${geometry.widthPct}%`,
                height: `${geometry.heightPx}px`,
                zIndex: geometry.z,
            }}
        >
            {theme.art}

            <div className={cn(geometry.padding, "h-full flex flex-col justify-center overflow-y-auto relative z-10", theme.text)}>
                {isFeatured && (
                    <div className="flex justify-between items-start mb-5 shrink-0">
                        <div>
                            <h4 className="text-xl font-extrabold leading-tight mb-1">{restaurantName}</h4>
                            <span className={cn(jetbrainsMono.className, "text-[11px] px-3 py-1 rounded-full backdrop-blur-sm border", isLightBadge ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20")}>
                                {card.name}
                            </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-inner shrink-0">
                            <QrCode size={20} className="text-[#0d6683]" />
                        </div>
                    </div>
                )}

                <div className={cn("grid grid-cols-5", geometry.gap)}>
                    {card.items.map(item => (
                        <div key={item.id} className="flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    "rounded-full flex items-center justify-center shrink-0",
                                    item.redeemed ? theme.checkedBg : theme.pendingBg
                                )}
                                style={{ width: geometry.circleSize, height: geometry.circleSize }}
                                aria-label={item.redeemed ? 'Redeemed' : 'Not redeemed'}
                            >
                                {item.redeemed ? (
                                    <Check size={Math.round(geometry.circleSize * 0.45)} className={theme.checkedIcon} />
                                ) : item.rewardType === 'freeItem' ? (
                                    <Gift size={Math.round(geometry.circleSize * 0.4)} className={theme.pendingIcon} />
                                ) : (
                                    <span className={cn(geometry.numberSizeClass, "font-bold")}>
                                        {item.stampsRequired}
                                    </span>
                                )}
                            </div>
                            {isFeatured && (
                                <span className="text-[10px] text-center leading-tight opacity-80 line-clamp-2">
                                    {rewardLabel(item)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Organic, mouse-reactive noise blend of the app's surface/primary/lavender
// palette — ported directly from the mockup's WebGL shader.
const LOYALTY_SHADER_FRAGMENT_SOURCE = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;

    float noise1 = snoise(uv * 2.0 + u_time * 0.1);
    float noise2 = snoise(uv * 4.0 - u_time * 0.05 + mouse * 0.5);

    vec3 color1 = vec3(0.98, 0.98, 0.95);
    vec3 color2 = vec3(0.54, 0.81, 0.94);
    vec3 color3 = vec3(0.85, 0.80, 0.95);

    float mixFactor = smoothstep(-0.5, 0.5, noise1 + noise2 * 0.5);
    vec3 finalColor = mix(color1, mix(color2, color3, noise2 * 0.5 + 0.5), mixFactor * 0.4);

    float sheen = pow(max(0.0, snoise(uv * 10.0 + u_time * 0.2)), 10.0) * 0.15;
    finalColor += sheen;

    gl_FragColor = vec4(finalColor, 1.0);
}`

function LoyaltyPageContent() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const { user } = useAuth()

    const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
    const [cards, setCards] = useState<LoyaltyCard[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [featuredCardId, setFeaturedCardId] = useState<string | null>(null)

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
                const params = new URLSearchParams({ restaurantId: id })
                if (userId) params.set('userId', userId)

                const { res, data } = await secureFetch(`/api/loyalty/card-progress?${params.toString()}`)
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

    // Matches the mockup's vanilla-JS guard: while a card is featured, clicks
    // on any card (including the featured one) do nothing — only the
    // backdrop closes it.
    const handleCardClick = (cardId: string) => {
        setFeaturedCardId(prev => prev ?? cardId)
    }

    // Fully redeemed cards recede to the back of the stack — the active,
    // still-in-progress card(s) stay up front where the customer needs them.
    // A stable sort keeps each group in its original (creation) order.
    const orderedCards = [...cards].sort((a, b) => Number(isCardCompleted(a)) - Number(isCardCompleted(b)))

    // Theme index is derived from each card's position in the original
    // (creation-order) list, not its position in the stack — so a card's
    // color stays fixed even as it moves around when reordered above, and
    // every card in the set gets a distinct theme (cycling only past 6 cards).
    const cardThemeIndex = new Map(cards.map((card, index) => [card.id, index]))

    // The stack is positioned via `bottom: Npx`, so its natural height is
    // whatever the back-most card's offset + height needs — on a short
    // viewport, or with several cards, that can exceed 100vh. Compute it so
    // the container can grow past the screen instead of clipping cards off
    // the top, with 100vh as a floor for the common few-card case.
    const deepestGeometry = getStackGeometry(Math.max(orderedCards.length - 1, 0))
    const stackContentHeight = deepestGeometry.bottomPx + deepestGeometry.heightPx + 96

    return (
        <div className={cn(hankenGrotesk.className, "h-screen flex flex-col bg-white text-[#1b1c18] overflow-hidden max-w-md mx-auto md:shadow-2xl md:my-8 md:rounded-[1.5rem] relative")}>
            <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#fbf9f2]">
                <ShaderBackground fragmentSource={LOYALTY_SHADER_FRAGMENT_SOURCE} />

                <button
                    aria-label="Back"
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 z-10 text-[#1b1c18] hover:opacity-70 active:scale-95 transition-all"
                >
                    <ArrowLeft size={28} />
                </button>

                <h1 className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-lg font-bold text-[#1b1c18]">
                    Loyalty Cards
                </h1>

                {isLoading ? (
                    <p className="text-sm text-[#70787d]">Loading loyalty cards...</p>
                ) : cards.length === 0 ? (
                    <div className="flex flex-col items-center text-center gap-3 px-6">
                        <div className="w-14 h-14 rounded-full bg-[#f0eee7] text-[#70787d] flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                        <h3 className="font-bold text-lg">No loyalty cards yet</h3>
                        <p className="text-sm text-[#70787d] max-w-xs">
                            {restaurant?.name ?? 'This restaurant'} hasn&apos;t set up any loyalty rewards yet. Check back soon!
                        </p>
                    </div>
                ) : (
                    // absolute inset-0 (not a normal flex child of `main`) so this
                    // gets its own scroll container with justify-end anchoring —
                    // that keeps the front card visible by default when the stack
                    // is taller than the viewport, with older cards reachable by
                    // scrolling up, instead of `main`'s own justify-center clipping
                    // both ends symmetrically.
                    <div className="absolute inset-0 overflow-y-auto no-scrollbar flex flex-col justify-end">
                        <div
                            className="relative w-full shrink-0 flex flex-col items-center justify-end pb-8"
                            style={{ minHeight: `max(100vh, ${stackContentHeight}px)` }}
                        >
                            {orderedCards.map((card, index) => (
                                <StackedLoyaltyCard
                                    key={card.id}
                                    card={card}
                                    restaurantName={restaurant?.name ?? 'Restaurant'}
                                    positionFromFront={index}
                                    themeIndex={cardThemeIndex.get(card.id) ?? 0}
                                    isFeatured={featuredCardId === card.id}
                                    onClick={() => handleCardClick(card.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 z-[100]",
                    featuredCardId ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setFeaturedCardId(null)}
            />

            <style jsx global>{`
                .card-transition {
                    transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
            `}</style>
        </div>
    )
}

export default function LoyaltyPage() {
    return <LoyaltyPageContent />
}
