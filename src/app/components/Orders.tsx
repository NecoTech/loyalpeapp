'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, ShoppingBag, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "..//components/ui/button"
import { Card, CardContent } from "..//components/ui/card"
import { cn } from '..//..//..//lib/utils'
import { useCurrency } from '../context/CurrencyContext'
import { encrypt, decrypt } from '..//..//..//lib/encryption'
import { useAuth } from '../context/AuthContext'

type Order = {
    _id: string
    orderNumber: string
    total: number
    createdAt: string
    orderStatus: string
    paid?: boolean
    isFaculty?: boolean
}

type UserDetails = {
    fullname: string;
    phoneNumber: string;
};

const ITEMS_PER_PAGE = 10

export default function Orders() {
    const router = useRouter()
    const { theme } = useTheme()
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const { currency } = useCurrency()
    const { user } = useAuth()
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)

    useEffect(() => {
        // First, try to get user details from localStorage with encryption
        const encryptedUserData = localStorage.getItem("authData");
        if (encryptedUserData) {
            try {
                const decryptedUserData = decrypt(encryptedUserData);
                setUserDetails(decryptedUserData);
            } catch (error) {
                console.error("Error decrypting user details from localStorage:", error);
                // If there's an error parsing, try to use user from context
                if (user && user.phoneNumber) {
                    const userData = {
                        fullname: user.fullname || '',
                        phoneNumber: user.phoneNumber
                    };
                    setUserDetails(userData);
                } else {
                    // If no user in context either, show error
                    setError('User information not available. Please log in again.');
                    setIsLoading(false);
                    return;
                }
            }
        } else {
            // If no encrypted user in localStorage, check if we have user from context
            if (user && user.phoneNumber) {
                const userData = {
                    fullname: user.fullname || '',
                    phoneNumber: user.phoneNumber
                };
                setUserDetails(userData);

                // Store the user in localStorage with encryption for future use
                const encryptedData = encrypt(userData);
                localStorage.setItem("authData", encryptedData);
            } else {
                // If no user details anywhere, show error
                setError('User information not available. Please log in again.');
                setIsLoading(false);
                return;
            }
        }

        // After setting user details, fetch orders
        if (userDetails?.phoneNumber || (user && user.phoneNumber)) {
            fetchOrders();
        }
    }, [user, userDetails?.phoneNumber]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            // Get phone number from userDetails or user context
            const phoneNumber = userDetails?.phoneNumber || user?.phoneNumber;

            if (!phoneNumber) {
                throw new Error('Phone number not available');
            }

            // Encrypt the phoneNumber
            const encryptedUserId = encrypt(phoneNumber);

            // Send the encrypted phoneNumber in the request
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: encryptedUserId }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders')
            }

            const { data: encryptedData } = await response.json();

            // Decrypt the response data
            const decryptedData = decrypt(encryptedData);

            // Sort orders by date (newest first)
            const sortedOrders = decryptedData.sort((a: Order, b: Order) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            setOrders(sortedOrders)
        } catch (err) {
            setError('Failed to load orders. Please try again later.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    // Pagination logic
    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentOrders = orders.slice(startIndex, endIndex)

    // NEW: Calculate pending faculty credit amount
    const facultyPendingOrders = orders.filter((order) =>
        order.orderStatus.toLowerCase() === 'completed' &&
        order.paid === false &&
        order.isFaculty === true
    )
    const facultyPendingTotal = facultyPendingOrders.reduce((sum, order) => sum + order.total, 0)

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'processing':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'notcomplete':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }
    }

    const formatDate = (dateString: string) => {
        // Create a date object from the input UTC string
        const utcDate = new Date(dateString);

        // Add 5 hours and 30 minutes (IST offset from UTC)
        // const istDate = new Date(utcDate.getTime() + (9 * 60 + 30) * 60 * 1000);
        const istDate = new Date(utcDate.getTime());

        // Format the adjusted date using Intl.DateTimeFormat
        return new Intl.DateTimeFormat('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true // Use 12-hour format with AM/PM
        }).format(istDate);
    }

    if (isLoading) {
        return (
            <div className={cn(
                "min-h-screen",
                "bg-white text-zinc-900",
                "dark:bg-zinc-900 dark:text-white"
            )}>
                <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 py-4 border-b dark:border-zinc-800">
                    <div className="container mx-auto px-4">
                        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                            <ArrowLeft className="h-5 w-5" />
                            Back to Menu
                        </Button>
                    </div>
                </div>
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={cn(
                "min-h-screen",
                "bg-white text-zinc-900",
                "dark:bg-zinc-900 dark:text-white"
            )}>
                <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 py-4 border-b dark:border-zinc-800">
                    <div className="container mx-auto px-4">
                        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                            <ArrowLeft className="h-5 w-5" />
                            Back to Menu
                        </Button>
                    </div>
                </div>
                <div className="container mx-auto px-4 py-8">
                    <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50">
                        <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
                            {error}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "min-h-screen",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 py-4 border-b dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="h-5 w-5" />
                        Back to Menu
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-6">
                    <ShoppingBag className="h-8 w-8 text-blue-500" />
                    <h1 className="text-2xl font-bold">Your Orders</h1>
                </div>

                {/* NEW: Faculty Pending Payment Section */}
                {facultyPendingOrders.length > 0 && (
                    <Card className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                        Faculty Credit — Amount Owed
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                        {facultyPendingOrders.length} completed {facultyPendingOrders.length === 1 ? 'order' : 'orders'} pending payment
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                                    {currency}{facultyPendingTotal.toFixed(2)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {orders.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>You havent placed any orders yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-4 mb-6">
                            {currentOrders.map((order) => (
                                <Link key={order._id} href={`/order-status/${order._id}`}>
                                    <Card className="transition-all hover:shadow-md">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-medium">Order #{order.orderNumber}</p>
                                                    <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                                                        <Clock className="h-4 w-4 mr-1" />
                                                        {formatDate(order.createdAt)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">{currency}{order.total.toFixed(2)}</p>
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-medium",
                                                        getStatusColor(order.orderStatus)
                                                    )}>
                                                        {order.orderStatus}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}