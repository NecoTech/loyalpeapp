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
} from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useLocation, useCityCounts, getCityOptions } from './context/LocationContext'
import { hasSeenOnboarding } from '../../lib/onboarding'
import { normalizeCityName } from '../../lib/cities'
import { cn } from '../../lib/utils'
import { secureFetch } from '../../lib/secureFetch'

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

export default function Home() {
    const router = useRouter()
    const { user, isInitialized } = useAuth()
    const { selectedCity, setSelectedCity } = useLocation()
    const cityCounts = useCityCounts()
    const [totalSaved, setTotalSaved] = useState(0)
    const [readyToRender, setReadyToRender] = useState(false)

    const [isCityModalOpen, setIsCityModalOpen] = useState(false)
    const [isCitySheetVisible, setIsCitySheetVisible] = useState(false)
    const [citySearch, setCitySearch] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

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
        return <div className="min-h-screen bg-[#FAF7F0]" />
    }

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen flex flex-col w-full max-w-[428px] mx-auto relative bg-[#FAF7F0] text-[#1c1b1b] pb-32 selection:bg-[#f6bf22] selection:text-[#1c1b1b]")}>
            {/* Top Navigation App Bar */}
            <header className="w-full px-4 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-[#FAF7F0]/95 backdrop-blur-sm z-30">
                <span className="text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#111111]">
                    loyalpe
                </span>
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
                            "relative w-full max-w-[428px] mx-auto bg-[#FAF7F0] border-t-4 border-x-2 border-[#111111] rounded-t-[28px] shadow-2xl px-5 pt-4 pb-8 transform transition-transform duration-200 max-h-[85vh] flex flex-col z-10",
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
        </div>
    )
}
