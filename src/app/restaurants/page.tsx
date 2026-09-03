'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk } from 'next/font/google'
import { ArrowLeft, Search, Store } from 'lucide-react'
import { cn } from '../../../lib/utils'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700', '800'] })

type RestaurantSummary = {
    id: string
    name: string
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
}

// Rotating avatar palette (this app's own colors) so each restaurant's
// initials circle gets a consistent, distinct-ish color without real photos.
const AVATAR_COLORS = [
    { bg: '#ebddff', text: '#4f3d73' },
    { bg: '#c2f050', text: '#3a4d00' },
    { bg: '#bee9ff', text: '#004d65' },
    { bg: '#ffdad6', text: '#93000a' },
    { bg: '#d1bbfa', text: '#5a487f' },
]

function avatarColor(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export default function RestaurantsPage() {
    const router = useRouter()
    const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [query, setQuery] = useState('')

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const res = await fetch('/api/restaurants')
                const data = await res.json()
                if (data.success) setRestaurants(data.restaurants)
            } catch (err) {
                console.error('Failed to load restaurants', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchRestaurants()
    }, [])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return restaurants
        return restaurants.filter(r => r.name.toLowerCase().includes(q))
    }, [restaurants, query])

    const goToRestaurant = (id: string) => {
        localStorage.setItem('lastVisitedRestaurantId', id)
        router.push(`/restaurant/${id}/details`)
    }

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] text-[#1b1c18] h-screen flex flex-col overflow-hidden max-w-md mx-auto md:shadow-2xl md:my-8 md:rounded-[1.5rem] relative")}>
            <main className="flex-1 overflow-y-auto">
                <header className="px-5 pt-8 pb-4 flex items-center gap-3 sticky top-0 bg-[#fbf9f2] z-10">
                    <button
                        aria-label="Back"
                        onClick={() => router.back()}
                        className="w-9 h-9 -ml-1 flex items-center justify-center text-[#0d6683] hover:opacity-70 active:scale-95 transition-all shrink-0"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-2xl font-bold">Restaurants</h1>
                </header>

                <section className="px-5 pb-6">
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search restaurants"
                            className="w-full bg-white border border-[#e4e2dc] rounded-xl py-3.5 pl-4 pr-10 text-[15px] outline-none focus:border-[#0d6683] shadow-sm placeholder:text-[#70787d]"
                        />
                        <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#70787d] pointer-events-none" />
                    </div>
                </section>

                <section className="px-5 pb-8 grid grid-cols-2 gap-3.5">
                    {isLoading ? (
                        <p className="col-span-2 text-center text-sm text-[#70787d] mt-8">Loading restaurants...</p>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center text-center gap-3 mt-12">
                            <div className="w-14 h-14 rounded-full bg-[#f0eee7] text-[#70787d] flex items-center justify-center">
                                <Store size={24} />
                            </div>
                            <p className="text-sm text-[#70787d] max-w-xs">
                                {restaurants.length === 0 ? 'No restaurants are on the platform yet.' : 'No restaurants match your search.'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(restaurant => {
                            const colors = avatarColor(restaurant.id)
                            return (
                                <button
                                    key={restaurant.id}
                                    onClick={() => goToRestaurant(restaurant.id)}
                                    className="bg-white rounded-2xl p-4 flex flex-col items-center text-center shadow-sm border border-[#f0eee7] hover:shadow-md hover:-translate-y-0.5 transition-all"
                                >
                                    <div
                                        className="w-16 h-16 rounded-full mb-3 flex items-center justify-center text-lg font-bold shrink-0"
                                        style={{ backgroundColor: colors.bg, color: colors.text }}
                                    >
                                        {getInitials(restaurant.name)}
                                    </div>
                                    <h3 className="font-bold text-[15px] leading-tight line-clamp-2">{restaurant.name}</h3>
                                </button>
                            )
                        })
                    )}
                </section>
            </main>
        </div>
    )
}
