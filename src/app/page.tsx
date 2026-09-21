'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import {
    MapPin,
    ArrowRight,
    Star,
    Heart,
    PiggyBank,
    Receipt,
    QrCode,
    Search,
    X,
    User,
    Store,
    Gift,
    Bell,
    UserRound,
} from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useLocation, useCityCounts, getCityOptions } from './context/LocationContext'
import { hasSeenOnboarding } from '../../lib/onboarding'
import { normalizeCityName } from '../../lib/cities'
import { cn } from '../../lib/utils'
import { secureFetch } from '../../lib/secureFetch'
import { supportWhatsAppUrl } from '../../lib/support'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

function getInitials(name?: string) {
    if (!name) return null
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')
}

function formatCurrency(amount: number) {
    return `₹${amount.toFixed(2)}`
}

type RecentShop = {
    id: string
    name: string
    category: string | null
    stamps: { redeemed: number; total: number } | null
}

// The two card colourways from the design, alternated per shop. Picked from
// the shop's id (not its position) so a shop keeps its colours as the list
// reorders. Full class strings so Tailwind can see them.
const RECENT_SHOP_PALETTES = [
    {
        pill: 'bg-[#FFE5D9] text-[#FF5A36]',
        star: 'text-[#FF5A36]',
        button: 'bg-[#FF5A36] hover:bg-[#e04a28] text-white',
    },
    {
        pill: 'bg-[#D4F63D] text-[#111111]',
        star: 'text-[#0040e0]',
        button: 'bg-[#FFC72C] hover:bg-[#ffdf99] text-[#111111]',
    },
]

function recentShopPalette(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return RECENT_SHOP_PALETTES[hash % RECENT_SHOP_PALETTES.length]
}

export default function Home() {
    const router = useRouter()
    const { user, isInitialized } = useAuth()
    const { selectedCity, setSelectedCity } = useLocation()
    const cityCounts = useCityCounts()
    const [totalSaved, setTotalSaved] = useState(0)
    // null = still loading for a signed-in customer, so the new-user card
    // isn't flashed at someone whose shops simply haven't arrived yet.
    const [recentShops, setRecentShops] = useState<RecentShop[] | null>(null)
    const [readyToRender, setReadyToRender] = useState(false)

    const [isCityModalOpen, setIsCityModalOpen] = useState(false)
    const [isCitySheetVisible, setIsCitySheetVisible] = useState(false)
    const [citySearch, setCitySearch] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    const [isNotifOpen, setIsNotifOpen] = useState(false)
    const [isNotifVisible, setIsNotifVisible] = useState(false)
    const [agentName, setAgentName] = useState('')
    const [agentPhone, setAgentPhone] = useState('')
    const [agentError, setAgentError] = useState('')

    const requireAuth = (redirectPath: string) => {
        if (user) return true
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`)
        return false
    }

    const initials = getInitials(user?.fullname)

    useEffect(() => {
        if (!isInitialized) return
        if (!user && !hasSeenOnboarding()) {
            router.replace('/onboarding')
            return
        }
        setReadyToRender(true)
    }, [user, isInitialized, router])

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!userId) {
            setTotalSaved(0)
            return
        }

        const fetchSavings = async () => {
            try {
                const { data } = await secureFetch(`/api/loyalty/savings?userId=${encodeURIComponent(userId)}`)
                if (data?.success) setTotalSaved(data.totalSaved)
            } catch (err) {
                console.error('Failed to load savings total', err)
            }
        }
        fetchSavings()
    }, [user?.email, user?.phoneNumber])

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!userId) {
            setRecentShops([])
            return
        }

        setRecentShops(null)
        let cancelled = false
        const fetchRecentShops = async () => {
            try {
                const { data } = await secureFetch(`/api/loyalty/recent-shops?userId=${encodeURIComponent(userId)}`)
                if (!cancelled) setRecentShops(data?.success ? data.shops : [])
            } catch (err) {
                console.error('Failed to load recent shops', err)
                if (!cancelled) setRecentShops([])
            }
        }
        fetchRecentShops()
        return () => {
            cancelled = true
        }
    }, [user?.email, user?.phoneNumber])

    const openShop = (id: string) => {
        localStorage.setItem('lastVisitedRestaurantId', id)
        router.push(`/restaurant/${id}/details`)
    }

    const openCityModal = () => {
        setIsCityModalOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setIsCitySheetVisible(true)))
    }

    const closeCityModal = () => {
        setIsCitySheetVisible(false)
        setTimeout(() => {
            setIsCityModalOpen(false)
            setCitySearch('')
        }, 200)
    }

    const selectCity = (name: string) => {
        setSelectedCity(name)
        closeCityModal()
    }

    useEffect(() => {
        if (!isCityModalOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeCityModal()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isCityModalOpen])

    useEffect(() => {
        if (isCitySheetVisible) searchInputRef.current?.focus()
    }, [isCitySheetVisible])

    const openNotifModal = () => {
        setIsNotifOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setIsNotifVisible(true)))
    }

    const closeNotifModal = () => {
        setIsNotifVisible(false)
        setTimeout(() => {
            setIsNotifOpen(false)
            setAgentError('')
        }, 200)
    }

    useEffect(() => {
        if (!isNotifOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeNotifModal()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isNotifOpen])

    // Hands the details to Loyalpe support over WhatsApp: opens a chat with
    // the message already written, and the person sends it themselves.
    const handleBeAnAgent = () => {
        const name = agentName.trim().replace(/\s+/g, ' ')
        if (name.length < 2) {
            setAgentError('Please enter your full name.')
            return
        }
        if (!/^[6-9]\d{9}$/.test(agentPhone)) {
            setAgentError('Please enter a valid 10-digit mobile number.')
            return
        }
        setAgentError('')

        const message = `Hi Loyalpe team, I'd like to become a Loyalpe agent.\n\nName: ${name}\nPhone: +91 ${agentPhone}`
        window.open(supportWhatsAppUrl(message), '_blank', 'noopener,noreferrer')
    }

    const cityOptions = useMemo(() => getCityOptions(cityCounts), [cityCounts])
    const trimmedCitySearch = citySearch.trim()
    const filteredCities = cityOptions.filter(city =>
        city.name.toLowerCase().includes(trimmedCitySearch.toLowerCase())
    )
    // Typed something that isn't already one of the popular cities — offer
    // to use it directly instead of dead-ending on "no cities found".
    const normalizedCustomCity = trimmedCitySearch.length >= 2 ? normalizeCityName(trimmedCitySearch) : ''
    const showCustomCityOption = normalizedCustomCity.length >= 2
        && !cityOptions.some(city => city.name.toLowerCase() === normalizedCustomCity.toLowerCase())

    if (!readyToRender) {
        return <div className="min-h-screen bg-white" />
    }

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen flex flex-col w-full max-w-[428px] mx-auto relative bg-white text-[#1c1b1b] pb-32 selection:bg-[#f6bf22] selection:text-[#1c1b1b]")}>
            {/* Top Navigation App Bar */}
            <header className="w-full px-4 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-30">
                <span className="text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#111111]">
                    loyalpe
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openCityModal}
                        aria-label="Select Location"
                        className="h-10 px-3 rounded-full bg-white neo-border neo-shadow-1 flex items-center gap-1.5 text-[#111111] active-press transition-transform cursor-pointer hover:bg-[#f0edec]"
                    >
                        <MapPin size={18} className="text-[#0040e0]" />
                        <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase text-[#111111]">
                            {selectedCity}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={openNotifModal}
                        aria-label="Notifications"
                        className="h-10 w-10 rounded-xl bg-white border-[2.5px] border-black shadow-[2px_2px_0px_#111111] flex items-center justify-center text-[#111111] relative cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all hover:bg-zinc-50"
                    >
                        <Bell size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content Canvas */}
            <main className="flex-1 px-4 flex flex-col gap-6 mt-1">
                {/* Hero Banner: "Find More Rewards" */}
                <section
                    onClick={() => router.push('/restaurants')}
                    className="w-full bg-[#70D6FF] neo-border rounded-2xl neo-shadow-2 p-5 relative overflow-hidden active-press-lg transition-transform cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-3">
                        <span className="px-2.5 py-1 bg-[#f6bf22] text-[#1c1b1b] text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase neo-border rounded-full neo-shadow-badge">
                            Exclusive
                        </span>
                        <div className="flex items-center gap-1 text-[13px] leading-[16px] tracking-[0.03em] font-extrabold text-[#111111] hover:underline">
                            <span>See More</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                    <div className="relative z-10 max-w-[210px]">
                        <h2 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold text-[#111111] mb-1">
                            Find More Rewards
                        </h2>
                        <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#111111]/80">
                            Discover exclusive partner cards &amp; perks
                        </p>
                    </div>
                    {/* Decorative Neo Graphic Stamps */}
                    <div className="absolute -right-3 -bottom-5 w-32 h-32 pointer-events-none opacity-90 rotate-[-8deg]">
                        <div className="w-24 h-28 bg-[#FFC72C] neo-border rounded-xl neo-shadow-1 absolute top-2 right-2 flex flex-col p-2 justify-between">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-extrabold bg-[#111111] text-white px-1 rounded">VIP</span>
                                <Star size={14} fill="currentColor" />
                            </div>
                            <div className="h-2 w-12 bg-[#111111]/20 rounded" />
                            <div className="w-full h-7 bg-white neo-border rounded flex items-center justify-center">
                                <span className="text-[10px] text-[#111111] font-black">20% OFF</span>
                            </div>
                        </div>
                        <div className="w-20 h-24 bg-[#FF5A36] neo-border rounded-xl neo-shadow-badge absolute bottom-0 left-0 rotate-[18deg] flex flex-col p-1.5 justify-between">
                            <Heart size={16} className="text-white" fill="currentColor" />
                            <div className="w-6 h-6 bg-white rounded-full mx-auto neo-border flex items-center justify-center">
                                <span className="text-[9px] font-black">★</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Saved Money Section */}
                <section className="w-full bg-white neo-border rounded-2xl neo-shadow-2 p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-[#f6bf22] neo-border neo-shadow-badge flex items-center justify-center text-[#111111]">
                                <PiggyBank size={20} />
                            </div>
                            <div>
                                <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">Saved Money</h3>
                                <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#434656]">Total earned via rewards &amp; discounts</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t-2 border-dashed border-[#111111]/15 mt-1">
                        <div className="text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#111111]">
                            {formatCurrency(totalSaved)}
                        </div>
                        <button
                            onClick={() => requireAuth('/transactions') && router.push('/transactions')}
                            className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#ffdf99] neo-border rounded-full neo-shadow-badge text-[#111111] text-[13px] leading-[16px] tracking-[0.03em] font-extrabold flex items-center gap-1 active-press transition-all cursor-pointer"
                        >
                            <span>View History</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </section>

                {/* Quick Action 2-Column Bento Grid */}
                <section className="grid grid-cols-2 gap-4">
                    {/* Profile */}
                    <button
                        onClick={() => requireAuth('/profile') && router.push('/profile')}
                        className="bg-[#D8B4FE] neo-border rounded-2xl neo-shadow-2 p-4 flex flex-col justify-between min-h-[145px] active-press-lg transition-transform cursor-pointer text-left"
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-11 h-11 rounded-full bg-[#111111] text-white flex items-center justify-center text-[17px] font-extrabold neo-shadow-badge border-2 border-white">
                                {initials ? initials : <User size={20} />}
                            </div>
                        </div>
                        <div className="mt-3">
                            <h4 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">Profile</h4>
                            <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#111111]/80">Account</p>
                        </div>
                    </button>

                    {/* Transactions */}
                    <button
                        onClick={() => requireAuth('/transactions') && router.push('/transactions')}
                        className="bg-[#BEF264] neo-border rounded-2xl neo-shadow-2 p-4 flex flex-col justify-between min-h-[145px] active-press-lg transition-transform cursor-pointer text-left"
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-11 h-11 rounded-xl bg-white neo-border flex items-center justify-center neo-shadow-badge text-[#111111]">
                                <Receipt size={24} />
                            </div>
                            <span className="w-3 h-3 bg-[#fd5835] neo-border border-[1.5px] rounded-full" />
                        </div>
                        <div className="mt-3">
                            <h4 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">Transaction</h4>
                            <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#111111]/80">history</p>
                        </div>
                    </button>
                </section>

                {/* Recent Shops */}
                {recentShops !== null && (
                    <section className="w-full flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <Store size={18} className="text-[#111111]" />
                                <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">Recent Shops</h3>
                            </div>
                        </div>

                        {recentShops.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4">
                                {recentShops.map(shop => {
                                    const palette = recentShopPalette(shop.id)
                                    return (
                                        <div
                                            key={shop.id}
                                            onClick={() => openShop(shop.id)}
                                            className="w-36 border-2 border-[#111111] rounded-xl shadow-[2px_2px_0px_#111111] p-2.5 flex flex-col justify-between shrink-0 active-press transition-transform cursor-pointer bg-white"
                                        >
                                            <div className="flex items-start justify-between mb-1.5 min-w-0">
                                                <span className={cn("max-w-full truncate px-2 py-0.5 border border-[#111111] rounded-full text-[9px] font-black uppercase tracking-wider", palette.pill)}>
                                                    {shop.category || 'Partner'}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <h4 className="text-xs font-black text-[#111111] truncate">{shop.name}</h4>
                                                {shop.stamps && (
                                                    <div className="inline-flex items-center gap-1 mt-0.5 bg-white border border-[#111111] rounded px-1.5 py-0.5 text-[9px] font-black text-[#111111]">
                                                        <Star size={12} fill="currentColor" className={palette.star} />
                                                        <span>{shop.stamps.redeemed}/{shop.stamps.total} Stamps</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`View ${shop.name}`}
                                                className={cn("w-full py-1 px-2 border border-[#111111] rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer leading-none shadow-[2px_2px_0px_#000000]", palette.button)}
                                            >
                                                <span>View</span>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="w-full bg-white neo-border rounded-2xl neo-shadow-2 p-5 flex flex-col gap-3 relative overflow-hidden">
                                <div className="flex items-start justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-[#D4F63D] neo-border neo-shadow-badge flex items-center justify-center text-[#111111]">
                                        <Gift size={26} />
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-[#70D6FF] neo-border rounded-full text-[10px] font-black text-[#111111] uppercase tracking-wider neo-shadow-badge">
                                        Get Started
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111]">Start Earning Rewards</h4>
                                    <p className="text-xs font-semibold text-[#434656] mt-1 leading-relaxed">
                                        Scan your first QR at any partner cafe, salon, or store to unlock stamp cards and instant cash discounts.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push('/restaurants')}
                                    className="w-full py-2.5 px-3 bg-[#FAF7F0] hover:bg-[#f0edec] neo-border neo-shadow-badge rounded-xl text-xs font-black text-[#111111] uppercase tracking-wider flex items-center justify-center gap-1.5 active-press transition-all cursor-pointer"
                                >
                                    <span>Explore Nearby Shops</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Docked Neo-Brutalist Bottom Navigation */}
            <div className="fixed bottom-6 left-0 right-0 max-w-[428px] mx-auto px-4 z-30 pointer-events-none flex justify-center">
                <button
                    onClick={() => router.push('/scan')}
                    className="pointer-events-auto w-full bg-[#FFC72C] neo-border neo-shadow-2 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-[#111111] text-[17px] leading-[22px] tracking-[-0.01em] font-bold active-press-lg transition-transform cursor-pointer"
                >
                    <QrCode size={24} />
                    <span>Scan QR Code</span>
                </button>
            </div>

            {/* City Selection Modal */}
            {isCityModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="city-modal-title"
                    className={cn(
                        "fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] transition-opacity duration-200",
                        isCitySheetVisible ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="absolute inset-0 cursor-pointer" onClick={closeCityModal} />
                    <div
                        className={cn(
                            "relative w-full max-w-[428px] mx-auto bg-white border-t-4 border-x-2 border-[#111111] rounded-t-[28px] shadow-2xl px-5 pt-4 pb-8 transform transition-transform duration-200 max-h-[85vh] flex flex-col z-10",
                            isCitySheetVisible ? "translate-y-0" : "translate-y-full"
                        )}
                    >
                        <div className="w-12 h-1.5 bg-[#111111]/30 rounded-full mx-auto mb-4" />
                        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#111111]/10">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-[#434656]">Pick Location</span>
                                <h2 id="city-modal-title" className="text-xl leading-[26px] tracking-[-0.015em] font-bold text-[#111111]">Select your city</h2>
                            </div>
                            <button
                                aria-label="Close city modal"
                                onClick={closeCityModal}
                                className="w-10 h-10 bg-white border-2 border-[#111111] rounded-full neo-shadow-badge flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 hover:bg-zinc-100 transition-all text-[#111111] cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="relative mb-3.5">
                            <input
                                ref={searchInputRef}
                                value={citySearch}
                                onChange={e => setCitySearch(e.target.value)}
                                placeholder="Search city or area..."
                                className="w-full bg-white text-[#111111] placeholder:text-zinc-500 font-bold text-sm py-3 pl-11 pr-4 border-2 border-[#111111] rounded-xl neo-shadow-badge focus:outline-none focus:ring-0 focus:border-[#111111] transition-all"
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] pointer-events-none flex items-center">
                                <Search size={20} />
                            </span>
                        </div>
                        <div className="overflow-y-auto no-scrollbar space-y-3 flex-1 pr-0.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-[#111111]">Popular Cities</span>
                                <span className="text-[11px] font-bold text-[#434656]">{cityOptions.length} available</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {filteredCities.map(city => {
                                    const isActive = city.name === selectedCity
                                    return (
                                        <button
                                            key={city.name}
                                            type="button"
                                            onClick={() => selectCity(city.name)}
                                            className={cn(
                                                "bg-white hover:bg-zinc-50 border-2 border-[#111111] rounded-xl p-2.5 flex items-center gap-2.5 neo-shadow-badge active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer",
                                                isActive && "ring-2 ring-[#111111]"
                                            )}
                                        >
                                            <span
                                                className="w-8 h-8 rounded-lg border-2 border-[#111111] flex items-center justify-center font-black text-xs text-[#111111] shrink-0"
                                                style={{ backgroundColor: city.color }}
                                            >
                                                {city.code}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-black text-[#111111] truncate flex items-center justify-between">
                                                    <span>{city.name}</span>
                                                    {isActive && (
                                                        <span
                                                            className="w-2 h-2 rounded-full border border-[#111111] inline-block"
                                                            style={{ backgroundColor: city.color }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-[#434656] truncate">
                                                    {isActive ? 'Active City' : `${cityCounts[city.name] ?? 0} restaurant${(cityCounts[city.name] ?? 0) === 1 ? '' : 's'}`}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                            {showCustomCityOption && (
                                <button
                                    type="button"
                                    onClick={() => selectCity(normalizedCustomCity)}
                                    className="w-full bg-white hover:bg-zinc-50 border-2 border-dashed border-[#111111] rounded-xl p-2.5 flex items-center gap-2.5 neo-shadow-badge active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer"
                                >
                                    <span className="w-8 h-8 rounded-lg border-2 border-[#111111] bg-[#f6bf22] flex items-center justify-center shrink-0">
                                        <MapPin size={16} className="text-[#111111]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-black text-[#111111] truncate">Use &quot;{normalizedCustomCity}&quot;</div>
                                        <div className="text-[10px] font-bold text-[#434656] truncate">
                                            {cityCounts[normalizedCustomCity] ?? 0} restaurant{(cityCounts[normalizedCustomCity] ?? 0) === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                </button>
                            )}
                            {filteredCities.length === 0 && !showCustomCityOption && (
                                <div className="py-6 text-center">
                                    <p className="text-xs font-black text-[#434656]">Search for any city to get started</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Notification & Refer Modal */}
            {isNotifOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="notification-modal-title"
                    className={cn(
                        "fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] transition-opacity duration-200",
                        isNotifVisible ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="absolute inset-0 cursor-pointer" onClick={closeNotifModal} />
                    <div
                        className={cn(
                            "relative w-full max-w-[428px] mx-auto bg-[#FAF7F0] border-t-4 border-x-2 border-[#111111] rounded-t-[28px] shadow-2xl px-5 pt-4 pb-8 transform transition-transform duration-200 max-h-[90vh] flex flex-col z-10",
                            isNotifVisible ? "translate-y-0" : "translate-y-full"
                        )}
                    >
                        <div className="w-12 h-1.5 bg-[#111111]/30 rounded-full mx-auto mb-3" />
                        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#111111]/10">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#FF4B4B] neo-border neo-shadow-badge flex items-center justify-center text-white">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#434656] block leading-none">Alerts &amp; Offers</span>
                                    <h2 id="notification-modal-title" className="text-xl font-black text-[#111111] tracking-tight">Notifications</h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label="Close notification modal"
                                onClick={closeNotifModal}
                                className="w-10 h-10 rounded-xl bg-white border-[2.5px] border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all hover:bg-zinc-50 text-[#111111] cursor-pointer"
                            >
                                <X size={20} strokeWidth={2.75} />
                            </button>
                        </div>

                        <div className="overflow-y-auto no-scrollbar flex flex-col gap-4">
                            <section className="w-full bg-[#14151F] border-[3px] border-[#111111] shadow-[4px_4px_0px_#111111] p-5 flex flex-col gap-3.5 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4F63D] text-[#111111] text-[11px] font-black uppercase rounded-full tracking-wider border-2 border-black shadow-[2px_2px_0px_#000000]">
                                        🏪 Merchants
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight leading-snug">
                                        Refer &amp; Earn <span className="text-[#D4F63D]">₹500</span>
                                    </h3>
                                    <p className="text-xs text-neutral-300 font-semibold mt-1 leading-relaxed">
                                        Onboard nearby merchants &amp; favorite local shops. Earn ₹500 directly in your bank account once they join!
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border-[1.5px] border-white/20 rounded-full text-[11px] font-bold text-white shadow-sm">
                                        ♾️ Unlimited Invites
                                    </span>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-neutral-300" htmlFor="agent-full-name">Full Name</label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-neutral-400 flex items-center pointer-events-none">
                                                <UserRound size={18} />
                                            </span>
                                            <input
                                                id="agent-full-name"
                                                type="text"
                                                autoComplete="name"
                                                maxLength={60}
                                                value={agentName}
                                                onChange={e => setAgentName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="w-full bg-[#111111]/80 text-white placeholder:text-zinc-500 font-bold text-xs py-2.5 pl-9 pr-3 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-0 focus:border-[#D4F63D] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-neutral-300" htmlFor="agent-phone">Phone Number</label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-[#D4F63D] text-xs font-black select-none pointer-events-none">+91</span>
                                            <input
                                                id="agent-phone"
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel"
                                                value={agentPhone}
                                                onChange={e => {
                                                    // No maxLength attribute: it would cut a pasted "+91 98765 43210" before we can clean it.
                                                    let digits = e.target.value.replace(/\D/g, '')
                                                    if (digits.length > 10) digits = digits.replace(/^(91|0)/, '')
                                                    setAgentPhone(digits.slice(0, 10))
                                                }}
                                                placeholder="Enter 10-digit mobile number"
                                                className="w-full bg-[#111111]/80 text-white placeholder:text-zinc-500 font-bold text-xs py-2.5 pl-11 pr-3 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-0 focus:border-[#D4F63D] transition-all"
                                            />
                                        </div>
                                    </div>
                                    {agentError && (
                                        <p role="alert" className="text-[11px] font-bold text-[#FF8A8A]">{agentError}</p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleBeAnAgent}
                                    className="w-full mt-1 bg-[#D4F63D] text-[#111111] hover:bg-[#c2e42e] border-[3px] border-black rounded-xl py-3 px-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer font-black"
                                >
                                    <span>be an agent</span>
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
