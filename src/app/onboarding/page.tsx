'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google'
import {
    ArrowLeft,
    ArrowRight,
    Navigation,
    X,
    Search,
    ChevronRight,
    CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLocation, CITIES } from '../context/LocationContext'
import { hasSeenOnboarding, markOnboardingSeen } from '../../../lib/onboarding'
import { cn } from '../../../lib/utils'

const fredoka = Fredoka({ subsets: ['latin'], weight: ['600', '700'] })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

const SLIDE_BG = ['#EAB32A', '#EF4444', '#2563EB']
const TOTAL_SLIDES = 3

function GiftBoxIllustration() {
    return (
        <svg className="w-full h-full drop-shadow-md overflow-visible" fill="none" viewBox="0 0 320 250" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="160" cy="204" fill="#B38612" opacity="0.6" rx="85" ry="18" />
            <g transform="translate(42, 65)">
                <ellipse cx="22" cy="22" fill="#FF5C4D" rx="20" ry="20" stroke="#000" strokeWidth="4" />
                <circle cx="22" cy="22" fill="#FFA399" r="14" stroke="#000" strokeWidth="2.5" />
                <text fill="#000" fontFamily="'Fredoka', sans-serif" fontSize="16" fontWeight="700" textAnchor="middle" x="22" y="27">★</text>
            </g>
            <g transform="translate(230, 48)">
                <ellipse cx="22" cy="22" fill="#2563EB" rx="20" ry="20" stroke="#000" strokeWidth="4" />
                <circle cx="22" cy="22" fill="#93C5FD" r="14" stroke="#000" strokeWidth="2.5" />
                <text fill="#000" fontFamily="'Fredoka', sans-serif" fontSize="17" fontWeight="700" textAnchor="middle" x="22" y="28">+</text>
            </g>
            <path d="M78 40 L82 48 L90 52 L82 56 L78 64 L74 56 L66 52 L74 48 Z" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <path d="M236 120 L239 126 L245 129 L239 132 L236 138 L233 132 L227 129 L233 126 Z" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <g transform="translate(80, 85)">
                <rect fill="#FF4343" height="74" rx="8" stroke="#000" strokeWidth="5" width="110" x="25" y="45" />
                <rect fill="#FFE066" height="74" stroke="#000" strokeWidth="4.5" width="24" x="68" y="45" />
                <rect fill="#FF5C4D" height="20" rx="5" stroke="#000" strokeWidth="5" width="124" x="18" y="32" />
                <rect fill="#FFE066" height="20" stroke="#000" strokeWidth="4.5" width="24" x="68" y="32" />
                <ellipse cx="62" cy="18" fill="#FFE066" rx="18" ry="14" stroke="#000" strokeWidth="4.5" transform="rotate(-20, 62, 18)" />
                <circle cx="62" cy="18" fill="#EAB32A" r="6" stroke="#000" strokeWidth="2.5" />
                <ellipse cx="98" cy="18" fill="#FFE066" rx="18" ry="14" stroke="#000" strokeWidth="4.5" transform="rotate(20, 98, 18)" />
                <circle cx="98" cy="18" fill="#EAB32A" r="6" stroke="#000" strokeWidth="2.5" />
                <circle cx="80" cy="22" fill="#FFD700" r="10" stroke="#000" strokeWidth="4.5" />
            </g>
            <g transform="translate(176, 142)">
                <ellipse cx="26" cy="26" fill="#22C55E" rx="24" ry="24" stroke="#000" strokeWidth="4.5" />
                <circle cx="26" cy="26" fill="#86EFAC" r="17" stroke="#000" strokeWidth="3" />
                <text fill="#000" fontFamily="'Fredoka', sans-serif" fontSize="22" fontWeight="700" textAnchor="middle" x="26" y="33">pts</text>
            </g>
        </svg>
    )
}

function StorefrontIllustration() {
    return (
        <svg className="w-full h-full drop-shadow-md overflow-visible" fill="none" viewBox="0 0 320 250" xmlns="http://www.w3.org/2000/svg">
            <polygon fill="#B83F2D" opacity="0.5" points="30,195 90,225 290,185 230,155" />
            <polygon fill="#FFB4A2" points="35,182 100,215 285,180 220,147" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <polygon fill="#E58A73" points="35,182 100,215 100,225 35,192" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <polygon fill="#D4735B" points="100,215 285,180 285,190 100,225" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <g transform="translate(48, 60)">
                <rect fill="#FFFDF0" height="92" rx="6" stroke="#000" strokeWidth="4.5" width="130" x="25" y="45" />
                <rect fill="#BEE3F8" height="42" rx="4" stroke="#000" strokeWidth="4" width="46" x="37" y="70" />
                <line stroke="#fff" strokeLinecap="round" strokeWidth="3.5" x1="43" x2="65" y1="104" y2="76" />
                <rect fill="#FFE27A" height="67" rx="3" stroke="#000" strokeWidth="4" width="45" x="95" y="70" />
                <circle cx="103" cy="103" fill="#000" r="3.5" />
                <path d="M15 45 L165 45 L155 22 L25 22 Z" fill="#FFE27A" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
                <polygon fill="#EA5843" points="45,22 62,22 55,45 38,45" />
                <polygon fill="#EA5843" points="85,22 102,22 95,45 78,45" />
                <polygon fill="#EA5843" points="125,22 142,22 135,45 118,45" />
                <rect fill="#000" height="22" rx="4" stroke="#000" strokeWidth="2" width="64" x="58" y="6" />
                <text fill="#FFD700" fontFamily="'Fredoka', sans-serif" fontSize="12" fontWeight="700" letterSpacing="1" textAnchor="middle" x="90" y="21">SHOP</text>
            </g>
            <g transform="translate(142, 10)">
                <path d="M45 78 C35 60 16 38 16 23 C16 10.3 26.3 0 39 0 C51.7 0 62 10.3 62 23 C62 38 43 60 45 78 Z" fill="#2563EB" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
                <circle cx="39" cy="23" fill="#FFE27A" r="10" stroke="#000" strokeWidth="3.5" />
            </g>
            <g transform="translate(205, 96)">
                <line stroke="#000" strokeLinecap="round" strokeWidth="7" x1="26" x2="20" y1="84" y2="108" />
                <line stroke="#000" strokeLinecap="round" strokeWidth="7" x1="42" x2="48" y1="84" y2="108" />
                <rect fill="#FFE27A" height="26" rx="3" stroke="#000" strokeWidth="3.5" width="22" x="56" y="58" />
                <path d="M62 58 C62 50 72 50 72 58" fill="none" stroke="#000" strokeLinecap="round" strokeWidth="3" />
                <path d="M16 42 C20 34 52 34 56 42 L52 84 C38 87 32 87 20 84 Z" fill="#2DD4BF" stroke="#000" strokeLinejoin="round" strokeWidth="4" />
                <path d="M50 48 C56 56 64 60 64 62" fill="none" stroke="#000" strokeLinecap="round" strokeWidth="5" />
                <circle cx="36" cy="22" fill="#FFE0C8" r="16" stroke="#000" strokeWidth="4" />
                <path d="M22 20 C22 10 30 6 36 6 C43 6 50 10 50 20 C46 16 42 15 36 16 C30 17 26 18 22 20 Z" fill="#000" />
            </g>
        </svg>
    )
}

function MapPinIllustration() {
    return (
        <svg className="w-full h-full drop-shadow-md overflow-visible" fill="none" viewBox="0 0 320 250" xmlns="http://www.w3.org/2000/svg">
            <polygon fill="#143BB8" opacity="0.45" points="40,140 220,115 285,185 85,215" />
            <polygon fill="#E8AAB2" points="35,142 80,212 80,222 35,152" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <polygon fill="#E8AAB2" points="80,212 280,182 280,192 80,222" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <polygon fill="#FFCCD4" points="35,142 215,116 280,182 80,212" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
            <line stroke="#000" strokeLinecap="round" strokeWidth="4.5" x1="95" x2="147" y1="133" y2="201" />
            <line stroke="#000" strokeLinecap="round" strokeWidth="4.5" x1="155" x2="214" y1="125" y2="191" />
            <line stroke="#000" strokeLinecap="round" strokeWidth="4.5" x1="50" x2="237" y1="165" y2="138" />
            <line stroke="#000" strokeLinecap="round" strokeWidth="4.5" x1="65" x2="258" y1="188" y2="160" />
            <ellipse cx="140" cy="180" fill="#000000" opacity="0.8" rx="32" ry="12" />
            <g transform="translate(195, 78)">
                <line stroke="#000" strokeLinecap="round" strokeWidth="9" x1="33" x2="33" y1="102" y2="124" />
                <line stroke="#000" strokeLinecap="round" strokeWidth="9" x1="53" x2="53" y1="102" y2="124" />
                <path d="M12 48 C6 60 7 76 13 88" fill="none" stroke="#000" strokeLinecap="round" strokeWidth="12" />
                <path d="M12 48 C6 60 7 76 13 88" fill="none" stroke="#FF5C4D" strokeLinecap="round" strokeWidth="5" />
                <path d="M16 44 C22 36 62 36 68 44 C72 58 70 88 66 100 C48 103 36 103 18 100 C14 88 12 58 16 44 Z" fill="#FF5C4D" stroke="#000" strokeLinejoin="round" strokeWidth="4.5" />
                <path d="M66 45 C78 30 92 14 100 8" stroke="#000" strokeLinecap="round" strokeWidth="14" />
                <path d="M66 45 C78 30 92 14 100 8" stroke="#FF5C4D" strokeLinecap="round" strokeWidth="6" />
                <circle cx="102" cy="6" fill="#FFE0C8" r="6.5" stroke="#000" strokeWidth="3" />
                <circle cx="43" cy="22" fill="#FFE0C8" r="19" stroke="#000" strokeWidth="4.5" />
                <path d="M26 18 C26 7 36 2 45 2 C54 2 61 7 61 17 C57 14 51 12 44 14 C37 16 32 16 26 18 Z" fill="#000" />
            </g>
            <g transform="translate(48, 14)">
                <path d="M92 158 C75 125 32 75 32 46 C32 20.6 52.6 0 78 0 C103.4 0 124 20.6 124 46 C124 75 109 125 92 158 Z" fill="#FF4343" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5.5" />
                <circle cx="78" cy="48" fill="#2459F5" r="22" stroke="#000" strokeWidth="5" />
                <path d="M52 28 C56 16 67 10 78 9" stroke="#FFA7A7" strokeLinecap="round" strokeWidth="4" />
            </g>
        </svg>
    )
}

export default function OnboardingPage() {
    const router = useRouter()
    const { user, isInitialized } = useAuth()
    const { setSelectedCity } = useLocation()

    const [allowed, setAllowed] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)

    const [isCityModalOpen, setIsCityModalOpen] = useState(false)
    const [isCityModalVisible, setIsCityModalVisible] = useState(false)
    const [citySearch, setCitySearch] = useState('')
    const [highlightedCity, setHighlightedCity] = useState<string | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const touchStartX = useRef(0)

    useEffect(() => {
        if (!isInitialized) return
        if (user || hasSeenOnboarding()) {
            router.replace('/')
            return
        }
        setAllowed(true)
    }, [user, isInitialized, router])

    const finishOnboarding = () => {
        markOnboardingSeen()
        router.replace('/auth')
    }

    const goToSlide = (index: number) => {
        if (index >= 0 && index < TOTAL_SLIDES) setCurrentSlide(index)
    }
    const nextSlide = () => goToSlide(currentSlide + 1)

    const handleBack = () => {
        if (currentSlide > 0) goToSlide(currentSlide - 1)
        else router.back()
    }

    const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        touchStartX.current = e.changedTouches[0].screenX
    }
    const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        const diff = touchStartX.current - e.changedTouches[0].screenX
        if (Math.abs(diff) > 40) {
            if (diff > 0 && currentSlide < TOTAL_SLIDES - 1) nextSlide()
            else if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1)
        }
    }

    const openCityModal = () => {
        setIsCityModalOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setIsCityModalVisible(true)))
    }
    const closeCityModal = () => {
        setIsCityModalVisible(false)
        setTimeout(() => {
            setIsCityModalOpen(false)
            setCitySearch('')
            setHighlightedCity(null)
        }, 250)
    }
    const selectCity = (name: string) => {
        setHighlightedCity(name)
        setSelectedCity(name)
        setTimeout(() => {
            finishOnboarding()
        }, 280)
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
        if (isCityModalVisible) searchInputRef.current?.focus()
    }, [isCityModalVisible])

    const filteredCities = CITIES.filter(city => {
        const query = citySearch.trim().toLowerCase()
        if (!query) return true
        return city.name.toLowerCase().includes(query) || city.region.toLowerCase().includes(query)
    })

    if (!allowed) {
        return <div className="min-h-screen" style={{ backgroundColor: SLIDE_BG[0] }} />
    }

    return (
        <div
            className={cn(plusJakartaSans.className, "onboarding-bg-transition min-h-screen text-white flex flex-col justify-between overflow-hidden select-none")}
            style={{ backgroundColor: SLIDE_BG[currentSlide] }}
        >
            {/* Navigation Bar */}
            <header className="px-6 pt-5 pb-2 w-full max-w-md mx-auto flex items-center justify-between z-20">
                <button
                    aria-label="Go back"
                    onClick={handleBack}
                    className={cn(fredoka.className, "bg-black/25 hover:bg-black/40 text-white font-bold p-1.5 rounded-lg border-2 border-black backdrop-blur-sm active:translate-y-0.5 flex items-center justify-center shadow-[0_2px_0_0_#000] transition-transform cursor-pointer")}
                >
                    <ArrowLeft size={20} />
                </button>

                <div role="tablist" aria-label="Onboarding Progress" className="flex items-center space-x-2">
                    {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
                        <button
                            key={idx}
                            role="tab"
                            aria-label={`Slide ${idx + 1} of ${TOTAL_SLIDES}`}
                            aria-selected={idx === currentSlide}
                            onClick={() => goToSlide(idx)}
                            className={cn(
                                "h-3 rounded-full border-2 transition-all focus:outline-none cursor-pointer",
                                idx === currentSlide
                                    ? "w-8 bg-white border-black shadow-[0_2px_0_0_#000]"
                                    : "w-3 bg-white/40 border-black/80 hover:bg-white/70"
                            )}
                        />
                    ))}
                </div>

                <button
                    onClick={finishOnboarding}
                    className={cn(
                        fredoka.className,
                        "bg-black/25 hover:bg-black/40 text-white font-bold text-sm tracking-wide px-3.5 py-1.5 rounded-lg border-2 border-black backdrop-blur-sm active:translate-y-0.5 shadow-[0_2px_0_0_#000] cursor-pointer",
                        currentSlide === TOTAL_SLIDES - 1 && "opacity-90"
                    )}
                >
                    {currentSlide === TOTAL_SLIDES - 1 ? 'DONE' : 'SKIP'}
                </button>
            </header>

            {/* Carousel */}
            <div
                className="flex-1 w-full max-w-md mx-auto relative overflow-hidden flex flex-col justify-center"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                <div
                    className="onboarding-slides-track flex w-full h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {/* Slide 1: Stack Up Points */}
                    <section className="min-w-full flex flex-col justify-between px-6 pt-2 pb-6 h-full">
                        <div className="relative w-full max-w-[310px] mx-auto aspect-[5/4] flex items-center justify-center my-auto">
                            <GiftBoxIllustration />
                        </div>
                        <div className="text-center mt-2 mb-6 px-2">
                            <h1 className={cn(fredoka.className, "font-bold text-[34px] sm:text-[38px] leading-tight tracking-wide uppercase text-black drop-shadow-[0_2px_0_rgba(255,255,255,0.4)]")}>
                                STACK UP POINTS!
                            </h1>
                            <p className="font-bold text-black/90 text-[15px] sm:text-base leading-snug mt-2.5 max-w-[300px] mx-auto tracking-wide uppercase">
                                EVERY PURCHASE GETS YOU CLOSER TO FREE STUFF AND MORE PERKS.
                            </p>
                        </div>
                        <div className="w-full mb-3 mt-auto">
                            <button
                                onClick={nextSlide}
                                className={cn(fredoka.className, "w-full bg-black hover:bg-neutral-900 text-white font-bold text-xl py-4 px-6 rounded-2xl border-[3px] border-black shadow-[0_5px_0_0_#4a3200] active:shadow-[0_1px_0_0_#000] active:translate-y-1 flex items-center justify-center gap-2 transition-transform cursor-pointer")}
                            >
                                <span>NEXT</span>
                                <ArrowRight size={22} strokeWidth={3} className="text-yellow-400" />
                            </button>
                        </div>
                    </section>

                    {/* Slide 2: Find Amazing Deals */}
                    <section className="min-w-full flex flex-col justify-between px-6 pt-2 pb-6 h-full">
                        <div className="relative w-full max-w-[310px] mx-auto aspect-[5/4] flex items-center justify-center my-auto">
                            <StorefrontIllustration />
                        </div>
                        <div className="text-center mt-2 mb-6 px-2">
                            <h1 className={cn(fredoka.className, "font-bold text-[34px] sm:text-[38px] leading-tight tracking-wide uppercase text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]")}>
                                FIND AMAZING DEALS!
                            </h1>
                            <p className="font-bold text-white/95 text-[15px] sm:text-base leading-snug mt-2.5 max-w-[300px] mx-auto tracking-wide uppercase">
                                UNCOVER COOL SHOPS AND UNIQUE BUSINESSES JUST A WALK AWAY.
                            </p>
                        </div>
                        <div className="w-full mb-3 mt-auto">
                            <button
                                onClick={nextSlide}
                                className={cn(fredoka.className, "w-full bg-[#FFE066] hover:bg-[#FFD700] text-black font-bold text-xl py-4 px-6 rounded-2xl border-[3px] border-black shadow-[0_4px_0_0_#000] active:shadow-[0_1px_0_0_#000] active:translate-y-1 flex items-center justify-center gap-2 transition-transform cursor-pointer")}
                            >
                                <span>NEXT</span>
                                <ArrowRight size={22} strokeWidth={3} />
                            </button>
                        </div>
                    </section>

                    {/* Slide 3: Get Local Deals */}
                    <section className="min-w-full flex flex-col justify-between px-6 pt-2 pb-6 h-full">
                        <div className="relative w-full max-w-[310px] mx-auto aspect-[5/4] flex items-center justify-center my-auto">
                            <MapPinIllustration />
                        </div>
                        <div className="text-center mt-2 mb-4 px-2">
                            <h1 className={cn(fredoka.className, "font-bold text-[34px] sm:text-[38px] leading-tight tracking-wide uppercase text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]")}>
                                GET LOCAL DEALS!
                            </h1>
                            <p className="font-medium text-white/95 text-[15px] sm:text-base leading-snug mt-2 max-w-[290px] mx-auto">
                                Unlock offers and coupons near you. Turn on location for a better experience.
                            </p>
                        </div>
                        <div className="w-full flex flex-col space-y-2.5 mb-2 mt-auto">
                            <button
                                onClick={openCityModal}
                                className={cn(fredoka.className, "w-full bg-white hover:bg-slate-50 text-black font-bold text-lg sm:text-xl py-3 px-6 rounded-xl border-[3px] border-black shadow-[0_4px_0_0_#000] active:shadow-[0_1px_0_0_#000] active:translate-y-1 flex items-center justify-center tracking-wide transition-transform cursor-pointer")}
                            >
                                Choose Area
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Select Your City Modal */}
            {isCityModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        "onboarding-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm",
                        isCityModalVisible ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                    )}
                >
                    <div className="absolute inset-0" onClick={closeCityModal} />
                    <div
                        className={cn(
                            "onboarding-modal-content relative w-full max-w-md bg-[#FFFDF0] text-black border-t-[4px] sm:border-[4px] border-black rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-[0_-6px_0_0_#000] sm:shadow-[0_6px_0_0_#000] z-10 max-h-[85vh] flex flex-col overflow-hidden",
                            isCityModalVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-95 opacity-0"
                        )}
                    >
                        <div className="flex items-start justify-between pb-3 border-b-2 border-black/15">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-[#FFE27A] border-[2.5px] border-black rounded-xl flex items-center justify-center shadow-[0_2px_0_0_#000]">
                                    <Navigation size={22} strokeWidth={2.5} className="text-black" />
                                </div>
                                <div>
                                    <h2 className={cn(fredoka.className, "font-bold text-2xl tracking-wide uppercase leading-none text-black")}>Select Your City</h2>
                                    <p className="font-bold text-xs text-neutral-600 uppercase tracking-wider mt-1">Find deals around you</p>
                                </div>
                            </div>
                            <button
                                aria-label="Close modal"
                                onClick={closeCityModal}
                                className="w-9 h-9 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg border-2 border-black flex items-center justify-center shadow-[0_2px_0_0_#000] active:translate-y-0.5 transition-transform cursor-pointer"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="my-4 relative">
                            <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                value={citySearch}
                                onChange={e => setCitySearch(e.target.value)}
                                placeholder="Search city or state..."
                                className="w-full pl-11 pr-4 py-3 bg-white text-black font-semibold text-sm rounded-xl border-2 border-black shadow-[0_3px_0_0_#000] focus:outline-none focus:ring-2 focus:ring-[#2563EB] placeholder:text-neutral-400"
                            />
                        </div>

                        <div className="flex items-center justify-between mb-2.5">
                            <span className={cn(fredoka.className, "font-bold text-xs uppercase tracking-wider text-neutral-700")}>
                                Suggested Cities ({filteredCities.length} available)
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1 pb-1">
                            {filteredCities.map(city => {
                                const Icon = city.Icon
                                const isHighlighted = highlightedCity === city.name
                                return (
                                    <button
                                        key={city.name}
                                        type="button"
                                        onClick={() => selectCity(city.name)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border-2 border-black shadow-[0_2px_0_0_#000] active:translate-y-0.5 flex items-center justify-between transition-all cursor-pointer",
                                            isHighlighted ? "bg-yellow-200" : "bg-white hover:bg-yellow-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg border border-black flex items-center justify-center" style={{ backgroundColor: city.iconBg }}>
                                                <Icon size={16} style={{ color: city.iconColor }} />
                                            </div>
                                            <div>
                                                <div className={cn(fredoka.className, "font-bold text-base leading-tight text-black")}>{city.name}</div>
                                                <div className="text-[11px] font-semibold text-neutral-500">{city.region}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(fredoka.className, "px-2 py-0.5 bg-[#FFE066] border border-black rounded-md font-bold text-[11px] text-black")}>
                                                {city.count}+ deals
                                            </span>
                                            <ChevronRight size={18} className="text-neutral-400" />
                                        </div>
                                    </button>
                                )
                            })}
                            {filteredCities.length === 0 && (
                                <div className="py-6 text-center">
                                    <p className="text-xs font-bold text-neutral-500">No cities found matching your search</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 mt-2 border-t-2 border-black/10">
                            <button
                                onClick={closeCityModal}
                                className={cn(fredoka.className, "w-full bg-black hover:bg-neutral-900 text-white font-bold text-base py-3 px-4 rounded-xl border-2 border-black shadow-[0_4px_0_0_#000] active:shadow-[0_1px_0_0_#000] active:translate-y-0.5 flex items-center justify-center gap-2 uppercase tracking-wider transition-transform cursor-pointer")}
                            >
                                <span>Done Exploring</span>
                                <CheckCircle2 size={18} className="text-yellow-400" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
