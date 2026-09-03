'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type CurrencyContextType = {
    currency: string
    setCurrency: (currency: string) => void
}

const CurrencyContext = createContext<CurrencyContextType>({
    currency: '₹',
    setCurrency: () => { }
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState('₹')

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export const useCurrency = () => useContext(CurrencyContext)