'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LoyaltyMockup from '../../components/LoyaltyMockup'
import { CartProvider, useCart } from '..//../context/CartContext'
import { AuthProvider, useAuth } from '..//../context/AuthContext'
import { CurrencyProvider } from '..//../context/CurrencyContext'
import CartIcon from '..//../components/CartIcon'
import FloatingCartIcon from '..//../components/FloatingCartIcon'
import Login from '..//../components/Login'
// import Register from '..//../components/Register'
import { cn } from '..//..//..//..//lib/utils'
import { secureFetch } from '..//..//..//..//lib/secureFetch'
import { PulseLoader } from "react-spinners";
import { Search } from 'lucide-react'

type Restaurant = {
    id: string
    name: string
}

function RestaurantContent() {
    const params = useParams()
    const { id } = params
    const router = useRouter()
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const { user } = useAuth()
    const { setRestaurantId, clearCart } = useCart()
    const [showRegister, setShowRegister] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [restaurantNotFound, setRestaurantNotFound] = useState(false)
    const [restaurantIdInput, setRestaurantIdInput] = useState('')
    const [isValidatingRestaurant, setIsValidatingRestaurant] = useState(false)

    const handleRestaurantIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (restaurantIdInput.trim()) {
            // Convert to lowercase and trim whitespace
            const normalizedRestaurantId = restaurantIdInput.trim().toLowerCase();

            // Validate restaurant ID before navigating
            setIsValidatingRestaurant(true);
            try {
                const { res: response, data } = await secureFetch(`/api/restaurant/${normalizedRestaurantId}`);

                if (!response.ok || !data?.success || !data.restaurant) {
                    // Restaurant not found, show error and stay on the same page
                    // setError(`Restaurant ID "${normalizedRestaurantId}" not found. Please try again.`);
                    setIsValidatingRestaurant(false);
                    return;
                }

                // Restaurant found, save and navigate
                localStorage.setItem('lastVisitedRestaurantId', normalizedRestaurantId);
                router.push(`/restaurant/${normalizedRestaurantId}`);

                // Reset states for new fetch
                setRestaurantNotFound(false);
                setError(null);
                setIsLoading(true);
            } catch (err) {
                console.error('Error validating restaurant:', err);
                setError(`Failed to validate restaurant ID. Please check your connection and try again.`);
                setIsValidatingRestaurant(false);
            }
        }
    };

    useEffect(() => {
        const fetchRestaurant = async () => {
            setIsLoading(true)
            setError(null)
            setRestaurantNotFound(false)

            if (localStorage.getItem('restaurantId') !== id) {
                clearCart();
                localStorage.setItem("menuActiveCategory", "All");
            }

            try {
                const { res: response, data } = await secureFetch(`/api/restaurant/${id}`)

                if (!response.ok || !data?.success || !data.restaurant) {
                    setRestaurantNotFound(true)
                    throw new Error('Restaurant not found')
                }

                setRestaurant(data.restaurant)
                setRestaurantId(id as string)
                localStorage.setItem('restaurantId', id as string);

                // Save as last visited restaurant for future quick access
                localStorage.setItem('lastVisitedRestaurantId', id as string);
            } catch (err) {
                if (!restaurantNotFound) {
                    setError('Failed to load restaurant details. Please try again later.')
                }
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchRestaurant()
        }
    }, [id, setRestaurantId, clearCart])

    // Show restaurant ID input if restaurant not found
    if (restaurantNotFound && !isLoading) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col items-center justify-center p-4",
                "bg-gray-50 dark:bg-zinc-900"
            )}>
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-[#FF385C]/10 dark:bg-[#FF385C]/20 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-[#FF385C]" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Restaurant Not Found
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                The restaurant ID &quot;{id}&quot; doesn&apos;t exist. Please enter a valid restaurant ID.
                            </p>
                        </div>

                        <form onSubmit={handleRestaurantIdSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="restaurantId"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Restaurant ID
                                </label>
                                <input
                                    type="text"
                                    id="restaurantId"
                                    value={restaurantIdInput}
                                    onChange={(e) => {
                                        setRestaurantIdInput(e.target.value);
                                        // Clear error when user starts typing
                                        if (error) setError(null);
                                    }}
                                    placeholder="Enter restaurant ID"
                                    className={cn(
                                        "w-full px-4 py-3 rounded-lg border",
                                        "bg-white dark:bg-zinc-900",
                                        error ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-zinc-700",
                                        "text-gray-900 dark:text-white",
                                        "placeholder-gray-400 dark:placeholder-gray-500",
                                        "focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent",
                                        "transition-all"
                                    )}
                                    required
                                    disabled={isValidatingRestaurant}
                                />
                                {error && (
                                    <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className={cn(
                                    "w-full px-4 py-3 rounded-lg font-semibold",
                                    "bg-[#FF385C] hover:bg-[#E31C5F]",
                                    "text-white transition-colors",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "flex items-center justify-center gap-2"
                                )}
                                disabled={!restaurantIdInput.trim() || isValidatingRestaurant}
                            >
                                {isValidatingRestaurant ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Validating...</span>
                                    </>
                                ) : (
                                    'Find Restaurant'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
                            <button
                                onClick={() => router.push('/restaurant')}
                                className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-[#FF385C] transition-colors"
                            >
                                ← Back to Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Show login/register if user is not logged in
    // if (!user) {
    //     return (
    //         <div className={cn(
    //             "min-h-screen flex flex-col items-center justify-center",
    //             "bg-gray-50 dark:bg-zinc-900"
    //         )}>
    //             {showRegister ? <Register /> : <Login />}
    //             <button
    //                 onClick={() => setShowRegister(!showRegister)}
    //                 className="mt-4 text-[#FF385C] hover:text-[#E31C5F] transition-colors"
    //             >
    //                 {/* {showRegister ? 'Already have an account? Login' : 'Don\'t have an account? Register'} */}
    //             </button>
    //         </div>
    //     )
    // }

    // Show loading state
    if (isLoading) {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center",
                "bg-gray-50 dark:bg-zinc-900 text-zinc-900 dark:text-white"
            )}>
                <PulseLoader color="#FF385C" />
            </div>
        )
    }

    // Show error if restaurant data failed to load (but not 404)
    if (error && !restaurantNotFound) {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center",
                "bg-gray-50 dark:bg-zinc-900"
            )}>
                <div className="text-center">
                    <p className="text-red-500 dark:text-red-400 text-lg mb-4">
                        {error}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className={cn(
                            "px-4 py-2 rounded transition-colors",
                            "bg-[#FF385C] hover:bg-[#E31C5F] text-white"
                        )}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    // Show error if restaurant is null but not a 404
    if (!restaurant) {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center",
                "bg-gray-50 dark:bg-zinc-900"
            )}>
                <div className="text-center">
                    <p className="text-red-500 dark:text-red-400 text-lg mb-4">
                        Failed to load restaurant
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className={cn(
                            "px-4 py-2 rounded transition-colors",
                            "bg-[#FF385C] hover:bg-[#E31C5F] text-white"
                        )}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    // Main restaurant page content
    return <LoyaltyMockup restaurantId={id as string} />
}

export default function RestaurantPage() {
    return (
        <AuthProvider>
            <CartProvider>
                <CurrencyProvider>
                    <RestaurantContent />
                </CurrencyProvider>
            </CartProvider>
        </AuthProvider>
    )
}