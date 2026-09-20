'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Cart from '..//..//../components/Cart'
import { CartProvider, useCart } from '..//..//../context/CartContext'
import { useTheme } from 'next-themes'
import { cn } from '..//..//..//..//..//lib/utils'
import { Button } from "..//..//..//components/ui/button"
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Utensils,
    MapPin,
    CirclePlus
} from "lucide-react"

function CartContent() {
    const params = useParams()
    const { id } = params
    const { cartItems } = useCart()
    const { theme } = useTheme()
    const [currentSlide, setCurrentSlide] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const handleDotClick = (index: number) => {
        setCurrentSlide(index)
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: index * 300,
                behavior: "smooth",
            })
        }
    }

    return (
        <div className={cn(
            "min-h-screen",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b dark:bg-zinc-800 dark:border-zinc-700">
                <div className="flex items-center justify-between p-2 max-w-4xl mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <Image
                        src="/logo.png"
                        alt="Oder Logo"
                        width={120}
                        height={40}
                        className={cn("h-11 w-auto", theme === "dark" ? "" : "")}
                    />
                    {/* <Button variant="ghost" size="icon" className="rounded-full">
                        <MapPin className="h-6 w-6 text-[#FF4B55] hidden" />
                    </Button> */}
                </div>
            </div>
            {/* Header with Image Banner */}
            {/* <div className="relative">
                <div
                    ref={scrollRef}
                    className="relative overflow-x-auto whitespace-nowrap scrollbar-hide"
                    onScroll={(e) => {
                        const scrollPosition = e.currentTarget.scrollLeft
                        setCurrentSlide(Math.round(scrollPosition / 300))
                    }}
                >
                    {[1, 2, 3].map((_, index) => (
                        <div key={index} className="inline-block w-full">
                            <Image
                                src="https://www.mealgaadi.co.in/images/slider/photo1_1520846008.jpg"
                                alt="Food Advertisement"
                                width={400}
                                height={200}
                                className="w-full object-cover h-[200px]"
                            />
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {[0, 1, 2].map((index) => (
                        <button
                            key={index}
                            onClick={() => handleDotClick(index)}
                            className={`h-2 w-2 rounded-full transition-all ${currentSlide === index ? "bg-white w-4" : "bg-white/50"
                                }`}
                        />
                    ))}
                </div>
            </div> */}

            {/* Cart Content */}
            <div className="container mx-auto px-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className={cn(
                        "text-xl font-bold",
                        "text-zinc-800",
                        "dark:text-white"
                    )}>
                        Your Cart
                    </h1>
                    {/* <Link
                        href={`/restaurant/${id}`}
                        className={cn(
                            "text-blue-600 hover:text-blue-700",
                            "dark:text-blue-400 dark:hover:text-blue-300",
                            "transition-colors"
                        )}
                    >
                        Back to Menu
                    </Link> */}
                </div>
                {cartItems.length > 0 ? (
                    <Cart restaurantId={id as string} />
                ) : (
                    <div className={cn(
                        "text-center my-8",
                        "text-zinc-500",
                        "dark:text-zinc-400"
                    )}>
                        <p className="mb-3">Your cart is empty.</p>

                        <Button variant="outline"
                            className="w-full text-lg h-12 flex items-center justify-center gap-2 mt-3 text-black dark:text-zinc-400"
                            onClick={() => router.back()}
                        >
                            <CirclePlus className="h-5 w-5" />
                            Add Items
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function CartPage() {
    return (
        <CartProvider>
            <CartContent />
        </CartProvider>
    )
}