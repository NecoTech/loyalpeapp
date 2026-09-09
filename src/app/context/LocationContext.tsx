'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
    Compass,
    Building2,
    Landmark,
    Store,
    Coffee,
    Building,
    Umbrella,
    MapPin,
    type LucideIcon,
} from 'lucide-react'
import { normalizeCityName } from '../../../lib/cities'
import { secureFetch } from '../../../lib/secureFetch'

export type CityOption = {
    name: string
    region: string
    code: string
    color: string
    Icon: LucideIcon
    iconBg: string
    iconColor: string
}

// The original curated shortlist — shown as "Popular Cities" quick-picks in
// every city picker. Not the only valid cities: see the search-to-select-
// any-city flow in each picker, backed by useCityCounts() below for real
// per-city restaurant counts (popular or not).
export const CITIES: CityOption[] = [
    { name: 'Bengaluru', region: 'Karnataka, India', code: 'BLR', color: '#BEF264', Icon: Compass, iconBg: '#D1FAE5', iconColor: '#059669' },
    { name: 'Mumbai', region: 'Maharashtra, India', code: 'BOM', color: '#FFC72C', Icon: Building2, iconBg: '#DBEAFE', iconColor: '#2563EB' },
    { name: 'Delhi NCR', region: 'Delhi, India', code: 'DEL', color: '#70D6FF', Icon: Landmark, iconBg: '#EDE9FE', iconColor: '#7C3AED' },
    { name: 'Hyderabad', region: 'Telangana, India', code: 'HYD', color: '#D8B4FE', Icon: Store, iconBg: '#FFEDD5', iconColor: '#EA580C' },
    { name: 'Pune', region: 'Maharashtra, India', code: 'PNQ', color: '#FF88B8', Icon: Coffee, iconBg: '#CCFBF1', iconColor: '#0D9488' },
    { name: 'Kolkata', region: 'West Bengal, India', code: 'CCU', color: '#FFC72C', Icon: Building, iconBg: '#FCE7F3', iconColor: '#DB2777' },
    { name: 'Chennai', region: 'Tamil Nadu, India', code: 'MAA', color: '#70D6FF', Icon: Umbrella, iconBg: '#FFE4E6', iconColor: '#E11D48' },
    { name: 'Ahmedabad', region: 'Gujarat, India', code: 'AMD', color: '#BEF264', Icon: MapPin, iconBg: '#D1FAE5', iconColor: '#059669' },
]

// Colors cycled for cities that have restaurants but aren't in the curated
// CITIES shortlist above — keeps their badges visually distinct from each
// other without needing per-city styling data for arbitrary city names.
const EXTRA_CITY_COLORS = ['#BEF264', '#FFC72C', '#70D6FF', '#D8B4FE', '#FF88B8']

function codeFromCityName(name: string): string {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 3).toUpperCase()
}

// Merges the curated CITIES shortlist with any other city that actually has
// restaurants (from real per-city counts), then sorts so every city with at
// least one restaurant comes first (busiest first), followed by cities with
// none — used by every city-picker UI so "Popular Cities" always surfaces
// real availability instead of just the fixed 8-city shortlist.
export function getCityOptions(counts: Record<string, number>): CityOption[] {
    const curatedNames = new Set(CITIES.map(c => c.name.toLowerCase()))
    const extraNames = Object.keys(counts)
        .filter(name => (counts[name] ?? 0) > 0 && !curatedNames.has(name.toLowerCase()))
        .sort((a, b) => a.localeCompare(b))

    const extra: CityOption[] = extraNames.map((name, i) => ({
        name,
        region: 'India',
        code: codeFromCityName(name),
        color: EXTRA_CITY_COLORS[i % EXTRA_CITY_COLORS.length],
        Icon: MapPin,
        iconBg: '#f0edec',
        iconColor: '#1c1b1b',
    }))

    return [...CITIES, ...extra]
        .map(city => ({ city, count: counts[city.name] ?? 0 }))
        .sort((a, b) => {
            const aHasRestaurants = a.count > 0
            const bHasRestaurants = b.count > 0
            if (aHasRestaurants !== bHasRestaurants) return aHasRestaurants ? -1 : 1
            if (aHasRestaurants) return b.count - a.count
            return 0
        })
        .map(entry => entry.city)
}

export const DEFAULT_CITY = 'Bengaluru'

const STORAGE_KEY = 'loyalpe_selected_city'

type LocationContextType = {
    selectedCity: string
    setSelectedCity: (city: string) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
    const [selectedCity, setSelectedCityState] = useState(DEFAULT_CITY)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) setSelectedCityState(stored)
        } catch (error) {
            console.error('Error reading stored city', error)
        }
    }, [])

    const setSelectedCity = (city: string) => {
        // Normalized here too (not just server-side on the admin's city
        // field) so a customer typing "bengaluru" matches restaurants
        // stored under "Bengaluru".
        const normalized = normalizeCityName(city)
        setSelectedCityState(normalized)
        try {
            localStorage.setItem(STORAGE_KEY, normalized)
        } catch (error) {
            console.error('Error storing selected city', error)
        }
    }

    return (
        <LocationContext.Provider value={{ selectedCity, setSelectedCity }}>
            {children}
        </LocationContext.Provider>
    )
}

export function useLocation() {
    const context = useContext(LocationContext)
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider')
    }
    return context
}

// Real restaurant counts per city, keyed by the exact (normalized) city
// name — covers every city with at least one restaurant, not just the
// curated CITIES shortlist, so a searched/custom city can show a real
// count too. Shared by every city-picker UI instead of each fetching its
// own copy.
export function useCityCounts() {
    const [counts, setCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        let cancelled = false
        secureFetch('/api/restaurants/city-counts')
            .then(({ data }) => {
                if (!cancelled && data?.success) setCounts(data.counts)
            })
            .catch(error => console.error('Failed to load city counts', error))
        return () => {
            cancelled = true
        }
    }, [])

    return counts
}
