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

export type CityOption = {
    name: string
    region: string
    count: number
    code: string
    color: string
    Icon: LucideIcon
    iconBg: string
    iconColor: string
}

export const CITIES: CityOption[] = [
    { name: 'Bengaluru', region: 'Karnataka, India', count: 150, code: 'BLR', color: '#BEF264', Icon: Compass, iconBg: '#D1FAE5', iconColor: '#059669' },
    { name: 'Mumbai', region: 'Maharashtra, India', count: 120, code: 'BOM', color: '#FFC72C', Icon: Building2, iconBg: '#DBEAFE', iconColor: '#2563EB' },
    { name: 'Delhi NCR', region: 'Delhi, India', count: 95, code: 'DEL', color: '#70D6FF', Icon: Landmark, iconBg: '#EDE9FE', iconColor: '#7C3AED' },
    { name: 'Hyderabad', region: 'Telangana, India', count: 64, code: 'HYD', color: '#D8B4FE', Icon: Store, iconBg: '#FFEDD5', iconColor: '#EA580C' },
    { name: 'Pune', region: 'Maharashtra, India', count: 48, code: 'PNQ', color: '#FF88B8', Icon: Coffee, iconBg: '#CCFBF1', iconColor: '#0D9488' },
    { name: 'Kolkata', region: 'West Bengal, India', count: 35, code: 'CCU', color: '#FFC72C', Icon: Building, iconBg: '#FCE7F3', iconColor: '#DB2777' },
    { name: 'Chennai', region: 'Tamil Nadu, India', count: 42, code: 'MAA', color: '#70D6FF', Icon: Umbrella, iconBg: '#FFE4E6', iconColor: '#E11D48' },
    { name: 'Ahmedabad', region: 'Gujarat, India', count: 30, code: 'AMD', color: '#BEF264', Icon: MapPin, iconBg: '#D1FAE5', iconColor: '#059669' },
]

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
        setSelectedCityState(city)
        try {
            localStorage.setItem(STORAGE_KEY, city)
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
