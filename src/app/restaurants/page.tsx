'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ArrowLeft, MapPin, Search, Store, X } from 'lucide-react'
import { useLocation, useCityCounts, CITIES } from '../context/LocationContext'
import { normalizeCityName } from '../../../lib/cities'
import { cn } from '../../../lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '700', '800'] })

type RestaurantSummary = {
    id: string
    name: string
    city: string | null
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
}

// Rotating avatar palette matching this page's neo-brutalist design tokens,
// so each restaurant's initials circle gets a consistent, distinct-ish
// color without real photos.
const AVATAR_PALETTE = [
    { bg: '#C5F646', text: '#121212' },
    { bg: '#CCA8FD', text: '#121212' },
    { bg: '#79D2FE', text: '#121212' },
    { bg: '#FFBE18', text: '#121212' },
    { bg: '#fd5835', text: '#ffffff' },
    { bg: '#f6bf22', text: '#121212' },
]

function avatarColor(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// Purely visual category chips — this app doesn't have a cuisine/category
// field on restaurants yet, so only "All" is backed by real data. Matches
// the source design, which also has no filtering logic wired to these.
const CATEGORY_CHIPS = [
    { emoji: '☕', label: 'Cafes & Roasters' },
    { emoji: '🍕', label: 'Fast Bites' },
    { emoji: '🥐', label: 'Bakeries' },
    { emoji: '⚡', label: '20% Off Club' },
]

export default function RestaurantsPage() {
    const router = useRouter()
    const { selectedCity, setSelectedCity } = useLocation()
    const cityCounts = useCityCounts()

    const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    const [isCityModalOpen, setIsCityModalOpen] = useState(false)
    const [isCitySheetVisible, setIsCitySheetVisible] = useState(false)
    const [citySearch, setCitySearch] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchRestaurants = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/restaurants?city=${encodeURIComponent(selectedCity)}`)
                const data = await res.json()
                if (data.success) setRestaurants(data.restaurants)
            } catch (err) {
                console.error('Failed to load restaurants', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchRestaurants()
    }, [selectedCity])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return restaurants
        return restaurants.filter(r => r.name.toLowerCase().includes(q))
    }, [restaurants, query])

    const goToRestaurant = (id: string) => {
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

    const trimmedCitySearch = citySearch.trim()
    const filteredCities = CITIES.filter(city =>
        city.name.toLowerCase().includes(trimmedCitySearch.toLowerCase())
    )
    // Typed something that isn't already one of the popular cities — offer
    // to use it directly instead of dead-ending on "no cities found".
    const normalizedCustomCity = trimmedCitySearch.length >= 2 ? normalizeCityName(trimmedCitySearch) : ''
    const showCustomCityOption = normalizedCustomCity.length >= 2
        && !CITIES.some(city => city.name.toLowerCase() === normalizedCustomCity.toLowerCase())

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-[#FBF7EE] text-[#121212] flex justify-center selection:bg-[#FFBE18] selection:text-black")}>
            <div className="w-full max-w-md min-h-screen pb-28 flex flex-col relative px-4 pt-3">
                {/* Top Bar */}
                <header className="flex items-center justify-between py-2 mb-3">
                    <button
                        aria-label="Go back"
                        onClick={() => router.push('/')}
                        className="w-11 h-11 bg-white brutal-border rounded-full brutal-shadow-sm flex items-center justify-center brutal-press transition-all cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight text-[#121212]">Shops</h1>
                        <button
                            type="button"
                            onClick={openCityModal}
                            className="flex items-center justify-center gap-1 mt-0.5 cursor-pointer"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C5F646] border border-[#121212]" />
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">{selectedCity}</span>
                        </button>
                    </div>
                    <div className="w-11 h-11" aria-hidden="true" />
                </header>

                {/* Search */}
                <section className="mb-4">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search restaurants, cafes, spots..."
                            className="w-full bg-white text-[#121212] placeholder:text-zinc-500 font-bold text-sm py-3.5 pl-11 pr-4 brutal-border rounded-2xl brutal-shadow focus:outline-none focus:ring-0 transition-all"
                        />
                        <Search size={16} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#121212] pointer-events-none" />
                    </div>
                </section>

                {/* Category Chips */}
                <section className="mb-5 overflow-x-auto no-scrollbar -mx-4 px-4 flex gap-2.5 items-center">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={cn(
                            "text-xs font-extrabold px-4 py-2 rounded-full border-2 border-[#121212] brutal-shadow-sm whitespace-nowrap transition-all cursor-pointer",
                            activeCategory === null ? "bg-[#121212] text-white" : "bg-white text-[#121212] active:translate-y-0.5"
                        )}
                    >
                        🔥 All ({restaurants.length})
                    </button>
                    {CATEGORY_CHIPS.map(chip => (
                        <button
                            key={chip.label}
                            onClick={() => setActiveCategory(chip.label)}
                            className={cn(
                                "text-xs font-extrabold px-3.5 py-2 rounded-full border-2 border-[#121212] brutal-shadow-sm whitespace-nowrap transition-all cursor-pointer",
                                activeCategory === chip.label ? "bg-[#C5F646] text-[#121212]" : "bg-white text-[#121212] active:translate-y-0.5"
                            )}
                        >
                            {chip.emoji} {chip.label}
                        </button>
                    ))}
                </section>

                {/* Restaurant Grid */}
                <main className="space-y-4">
                    <div className="grid grid-cols-2 gap-3.5">
                        {isLoading ? (
                            <p className="col-span-2 text-center text-sm font-bold text-zinc-500 mt-8">Loading restaurants...</p>
                        ) : filtered.length === 0 ? (
                            <div className="col-span-2 flex flex-col items-center text-center gap-3 mt-12">
                                <div className="w-14 h-14 rounded-full bg-white brutal-border brutal-shadow-sm text-[#121212] flex items-center justify-center">
                                    <Store size={24} />
                                </div>
                                <p className="text-sm font-bold text-zinc-500 max-w-xs">
                                    {restaurants.length === 0
                                        ? `No restaurants in ${selectedCity} yet.`
                                        : 'No restaurants match your search.'}
                                </p>
                            </div>
                        ) : (
                            filtered.map(restaurant => {
                                const colors = avatarColor(restaurant.id)
                                return (
                                    <button
                                        key={restaurant.id}
                                        type="button"
                                        onClick={() => goToRestaurant(restaurant.id)}
                                        className="bg-white brutal-border rounded-2xl p-4 flex flex-col items-center justify-center text-center brutal-shadow-card brutal-press transition-all hover:bg-zinc-50 cursor-pointer"
                                    >
                                        <div
                                            className="w-14 h-14 rounded-full border-2 border-[#121212] flex items-center justify-center font-black text-base brutal-shadow-sm mb-3"
                                            style={{ backgroundColor: colors.bg, color: colors.text }}
                                        >
                                            {getInitials(restaurant.name)}
                                        </div>
                                        <h3 className="font-extrabold text-sm text-[#121212] tracking-tight leading-snug">{restaurant.name}</h3>
                                        <span className="mt-1 text-[11px] font-bold text-zinc-500">Partner Restaurant</span>
                                        <span className="mt-3 w-full py-1.5 px-3 bg-zinc-100 border-2 border-[#121212] rounded-lg brutal-shadow-sm text-xs font-black text-[#121212] flex items-center justify-center gap-1">
                                            View Card
                                        </span>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </main>
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
                            "relative w-full max-w-md mx-auto bg-[#FBF7EE] border-t-4 border-x-2 border-[#121212] rounded-t-[28px] shadow-2xl px-5 pt-4 pb-8 transform transition-transform duration-200 max-h-[85vh] flex flex-col z-10",
                            isCitySheetVisible ? "translate-y-0" : "translate-y-full"
                        )}
                    >
                        <div className="w-12 h-1.5 bg-[#121212]/30 rounded-full mx-auto mb-4" />
                        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#121212]/10">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Pick Location</span>
                                <h2 id="city-modal-title" className="text-xl font-black text-[#121212] tracking-tight">Select your city</h2>
                            </div>
                            <button
                                aria-label="Close city modal"
                                onClick={closeCityModal}
                                className="w-10 h-10 bg-white border-2 border-[#121212] rounded-full brutal-shadow-sm flex items-center justify-center brutal-press hover:bg-zinc-100 transition-all text-[#121212] cursor-pointer"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="relative mb-3.5">
                            <input
                                ref={searchInputRef}
                                value={citySearch}
                                onChange={e => setCitySearch(e.target.value)}
                                placeholder="Search city or area..."
                                className="w-full bg-white text-[#121212] placeholder:text-zinc-500 font-bold text-sm py-3 pl-11 pr-4 border-2 border-[#121212] rounded-xl brutal-shadow-sm focus:outline-none focus:ring-0 transition-all"
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#121212] pointer-events-none flex items-center">
                                <Search size={20} />
                            </span>
                        </div>

                        <div className="overflow-y-auto no-scrollbar space-y-3 flex-1 pr-0.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-[#121212]">Popular Cities</span>
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
                                                "bg-white hover:bg-zinc-50 border-2 border-[#121212] rounded-xl p-2.5 flex items-center gap-2.5 brutal-shadow-sm brutal-press transition-all text-left cursor-pointer",
                                                isActive && "ring-2 ring-[#121212]"
                                            )}
                                        >
                                            <span
                                                className="w-8 h-8 rounded-lg border-2 border-[#121212] flex items-center justify-center font-black text-xs text-[#121212] shrink-0"
                                                style={{ backgroundColor: city.color }}
                                            >
                                                {city.code}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-black text-[#121212] truncate flex items-center justify-between">
                                                    <span>{city.name}</span>
                                                    {isActive && (
                                                        <span className="w-2 h-2 rounded-full bg-[#C5F646] border border-[#121212] inline-block" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-zinc-500 truncate">
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
                                    className="w-full bg-white hover:bg-zinc-50 border-2 border-dashed border-[#121212] rounded-xl p-2.5 flex items-center gap-2.5 brutal-shadow-sm brutal-press transition-all text-left cursor-pointer"
                                >
                                    <span className="w-8 h-8 rounded-lg border-2 border-[#121212] bg-[#FFBE18] flex items-center justify-center shrink-0">
                                        <MapPin size={16} className="text-[#121212]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-black text-[#121212] truncate">Use &quot;{normalizedCustomCity}&quot;</div>
                                        <div className="text-[10px] font-bold text-zinc-500 truncate">
                                            {cityCounts[normalizedCustomCity] ?? 0} restaurant{(cityCounts[normalizedCustomCity] ?? 0) === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                </button>
                            )}
                            {filteredCities.length === 0 && !showCustomCityOption && (
                                <div className="py-6 text-center">
                                    <p className="text-xs font-black text-zinc-500">Search for any city to get started</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
