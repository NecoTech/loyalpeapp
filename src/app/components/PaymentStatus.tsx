"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
import { useCart } from '..//context/CartContext';
import { useTheme } from 'next-themes';
import { cn } from '..//..//..//lib/utils';
import { Button } from "..//components/ui/button";
import { Card, CardContent } from "..//components/ui/card";
import { Check, X } from "lucide-react";

const PaymentStatus = ({ transcationId }: { transcationId: string }) => {
    const params = useParams();
    const router = useRouter();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderId, setOrderId] = useState(null);
    const { cartItems, clearCart, tableNumber } = useCart();
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const storedRestaurantId = localStorage.getItem("restaurantId");
        setRestaurantId(storedRestaurantId);
    }, []);

    const updateOrderStatus = async (orderId: any) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paid: true,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/initiate-phonepe-payment/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: transcationId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setStatus(data.status);
            setOrderId(data.orderId);

            if (data.status === "PAYMENT_SUCCESS") {
                toast.success(`Payment Success for Transaction ID: ${data.transactionId}`);
                clearCart();
            } else {
                toast.error(`Transaction Failed for Transaction ID: ${data.transactionId}`);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong while fetching payment status.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (transcationId) {
            fetchStatus();
        }
    }, [transcationId]);

    return (
        <div className={cn(
            "min-h-screen p-4",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            <Card className="max-w-lg mx-auto mt-8">
                <CardContent className="p-6 space-y-6">
                    <div className="flex justify-center">
                        <Image
                            src="/phonepe.svg"
                            alt="PhonePe logo"
                            width={200}
                            height={42}
                            className={cn(theme === "dark" ? "brightness-0 invert" : "")}
                            priority
                        />
                    </div>

                    <h2 className="text-xl font-semibold text-center">
                        PhonePe Payment Status
                    </h2>

                    {loading ? (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-lg text-zinc-600 dark:text-zinc-400">
                                Checking Payment Status...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center space-y-4">
                            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
                            <Button
                                onClick={() => {
                                    setLoading(true);
                                    setError('');
                                    setStatus(null);
                                    if (params?.id) {
                                        fetchStatus();
                                    }
                                }}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            {status === "PAYMENT_SUCCESS" ? (
                                <>
                                    <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Thank you for your order!</h3>
                                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                                            TRANSACTION SUCCESSFUL
                                        </p>
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => { router.push(`/restaurant/${restaurantId}`); clearCart() }}
                                        >
                                            Return to Menu
                                        </Button>
                                        <Button
                                            onClick={() => { router.push(`/order-status/${orderId}`), clearCart() }}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            View Order Status
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                                        <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">
                                            Payment Failed
                                        </h3>
                                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                                            TRANSACTION FAILED
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => router.push(`/restaurant/${restaurantId}`)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Return to Menu
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentStatus;