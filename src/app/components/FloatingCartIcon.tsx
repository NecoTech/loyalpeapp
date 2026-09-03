'use client'

import Link from 'next/link'
import { useCart } from '..//context/CartContext'

export default function FloatingCartIcon({ restaurantId }: { restaurantId: string }) {
    const { cartItems, restaurantId: currentRestaurantId } = useCart()

    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)

    if (restaurantId !== currentRestaurantId || itemCount === 0) {
        return null
    }

    return (
        <Link href={`/restaurant/${restaurantId}/cart`}>
            <div className="fixed bottom-20 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg cursor-pointer transition-all hover:bg-blue-600 z-50">
                {/* Dish Icon SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h18M3 13a9 9 0 0118 0v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v10" />
                </svg>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {itemCount}
                </span>
            </div>
        </Link>
    )
}

