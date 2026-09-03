'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ArrowRight, HelpCircle, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import Image from 'next/image'
import { PulseLoader } from 'react-spinners'

export default function RestaurantPage() {
    const router = useRouter()
    const [restaurantId, setRestaurantId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingStorage, setIsCheckingStorage] = useState(true)

    // Check for last visited restaurant and auto-redirect
    useEffect(() => {
        const lastVisitedRestaurantId = localStorage.getItem('lastVisitedRestaurantId')

        if (lastVisitedRestaurantId) {
            setIsLoading(true)
            router.push(`/restaurant/${lastVisitedRestaurantId}`)
        } else {
            setIsCheckingStorage(false)
        }
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (restaurantId.trim()) {
            setIsLoading(true)
            const normalizedRestaurantId = restaurantId.trim().toLowerCase()
            localStorage.setItem('lastVisitedRestaurantId', normalizedRestaurantId)
            router.push(`/restaurant/${normalizedRestaurantId}`)
        }
    }

    // ── Loading while checking localStorage ─────────────────────────────
    if (isCheckingStorage) {
        return (
            <div className="h-[100dvh] flex items-center justify-center bg-white">
                <div className="text-center">
                    <PulseLoader color="#EC1953" />
                    <p className="mt-4 text-gray-500">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[100dvh] overflow-hidden bg-white">
            <div className="relative mx-auto w-full max-w-md h-full flex flex-col">

                {/* ── Header ──────────────────────────────────────────────── */}
                <header className="pt-4 px-6 flex-shrink-0 relative z-20">
                    <Image
                        src="/redfont.gif"
                        alt="Order Logo"
                        width={160}
                        height={60}
                        className="h-auto w-28"
                        priority
                    />
                </header>

                {/* ── Hero + headline: image sits BEHIND, headline overlaps in front ── */}
                <div className="relative flex-shrink-0 px-6 pt-2 pb-2 min-h-[130px]">
                    {/* Decorative blobs + bowl photo — z-0, behind the text */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
                        <div className="absolute -top-10 -right-16 h-40 w-40 rounded-full bg-[#FCE0E7]" />
                        <div className="absolute top-4 -right-6 h-32 w-32 rounded-full bg-[#FDBB2D]" />
                        <div
                            className="absolute top-1 -right-1 h-24 w-24 sm:h-28 sm:w-28 overflow-hidden shadow-xl"
                            style={{ borderRadius: '63% 37% 54% 46% / 55% 48% 52% 45%' }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <svg
                            className="absolute top-3 right-28 h-5 w-5 text-[#EC1953]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0c.5 4 2 7 8 8-6 1-7.5 4-8 8-.5-4-2-7-8-8 6-1 7.5-4 8-8z" />
                        </svg>
                    </div>

                    {/* Headline — z-10, in front of / overlapping the image */}
                    <div className="relative z-10 max-w-[68%]">
                        <h1 className="text-[1.65rem] sm:text-3xl leading-[1.1] font-extrabold text-[#1F2937] break-words">
                            Find Your
                            <br />
                            <span className="text-[#EC1953]">Restaurant</span>
                        </h1>

                        <div className="flex items-center gap-1.5 mt-2 mb-2">
                            <span className="h-1 w-6 rounded-full bg-[#EC1953]" />
                            <span className="h-1 w-3 rounded-full bg-[#7CB342]" />
                        </div>

                        <p className="text-sm text-gray-500">
                            Enter your restaurant ID to access the menu and start ordering
                        </p>
                    </div>
                </div>

                {/* ── Main / card — takes remaining space, centers card ───── */}
                <main className="flex-1 min-h-0 flex flex-col justify-center px-6 py-2">
                    {/* <svg
                        className="relative left-1/2 -translate-x-1/2 h-17 w-12 text-[#EC1953] -mb-1 flex-shrink-0"
                        viewBox="0 0 80 64"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <path d="M8 22 L12 6 H68 L72 22" strokeLinejoin="round" />
                        <path d="M8 22 L14 30 M18 22 L23 30 M28 22 L33 30 M38 22 L43 30 M48 22 L53 30 M58 22 L63 30 M72 22 L67 30" />
                        <rect x="10" y="30" width="60" height="30" rx="2" />
                        <rect x="30" y="40" width="20" height="20" />
                        <rect x="14" y="36" width="12" height="10" />
                        <rect x="54" y="36" width="12" height="10" />
                    </svg> */}

                    <div className="relative bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-4 pt-6">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-full bg-[#EC1953] flex items-center justify-center flex-shrink-0">
                                    <Store className="h-4 w-4 text-white" />
                                </div>
                                <label htmlFor="restaurantId" className="text-base font-semibold text-[#1F2937]">
                                    Restaurant ID
                                </label>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Store className="h-4 w-4 text-[#EC1953]" />
                                </div>
                                <input
                                    type="text"
                                    id="restaurantId"
                                    value={restaurantId}
                                    onChange={(e) => setRestaurantId(e.target.value)}
                                    placeholder="e.g., testcanteen1, mbcecanteen4"
                                    className={cn(
                                        'w-full pl-11 pr-4 py-3 rounded-2xl border text-sm',
                                        'bg-white border-[#FBD3DD]',
                                        'text-gray-700 placeholder-gray-400',
                                        'focus:outline-none focus:ring-2 focus:ring-[#EC1953]/40 focus:border-[#EC1953]',
                                        'transition-all'
                                    )}
                                    required
                                    autoFocus
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!restaurantId.trim() || isLoading}
                                className={cn(
                                    'w-full px-6 py-3 rounded-full font-semibold text-base',
                                    'bg-[#EC1953] hover:bg-[#D31049]',
                                    'text-white transition-all',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                    'flex items-center justify-center gap-2',
                                    'shadow-lg shadow-[#EC1953]/25'
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Next</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-2.5 bg-[#EAF6EA] rounded-2xl px-3 py-3">
                                <div className="h-7 w-7 rounded-full bg-[#7CB342] flex items-center justify-center flex-shrink-0">
                                    <HelpCircle className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-[#1F2937]">
                                        Dont have a restaurant ID?
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Contact your restaurant for access
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#7CB342] flex-shrink-0" />
                            </div>
                        </form>
                    </div>
                </main>

                {/* ── Bottom wave decoration ─────────────────────────────── */}
                <div className="relative h-10 flex-shrink-0 pointer-events-none" aria-hidden="true">
                    <svg className="absolute bottom-0 left-0 w-full h-10" viewBox="0 0 400 100" preserveAspectRatio="none">
                        <path d="M0,100 L0,40 Q100,0 200,35 T400,25 L400,100 Z" fill="#FDBB2D" />
                        <path d="M0,100 L0,60 Q120,20 240,55 T400,45 L400,100 Z" fill="#EC1953" />
                        <path d="M0,100 L0,80 Q140,45 260,75 T400,68 L400,100 Z" fill="#7CB342" />
                    </svg>
                </div>
            </div>
        </div>
    )
}