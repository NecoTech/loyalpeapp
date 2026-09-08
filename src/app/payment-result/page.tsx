'use client'

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CartProvider, useCart } from '../context/CartContext';

type PaymentStatus = 'loading' | 'success' | 'failed';

type ErrorCode = 'invalid_hash' | 'payment_failed' | 'callback_error' | 'configuration_error';

function PaymentResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { clearCartAfterPayment } = useCart();
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [orderId, setOrderId] = useState<string>('');
    const [txnId, setTxnId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const [hasCleared, setHasCleared] = useState(false);

    // Ensure we're on client side
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const statusParam = searchParams.get('status') as PaymentStatus | null;
        const orderIdParam = searchParams.get('orderId');
        const txnIdParam = searchParams.get('txnId');
        const amountParam = searchParams.get('amount');
        const errorParam = searchParams.get('error');

        setStatus(statusParam || 'loading');
        setOrderId(orderIdParam || '');
        setTxnId(txnIdParam || '');
        setAmount(amountParam || '');
        setError(errorParam || '');

        // Clear payment-related localStorage and cart - only once
        if (statusParam === 'success' && !hasCleared) {
            try {
                console.log('Clearing localStorage and cart after successful payment...');

                // Clear cart using CartContext method
                clearCartAfterPayment();

                // Clear all payment-related data
                localStorage.removeItem('paymentSubtotal');
                localStorage.removeItem('paymentCartItems');
                localStorage.removeItem('tipAmount');
                localStorage.removeItem('cgstRate');
                localStorage.removeItem('sgstRate');
                localStorage.removeItem('platformRate');
                localStorage.removeItem('selectedService');
                localStorage.removeItem('deliveryAddress');
                localStorage.removeItem('deliveryCharge');
                localStorage.removeItem('deliveryDistance');
                localStorage.removeItem('selectedRoomNumber');

                // Set flag to prevent multiple clears
                setHasCleared(true);

                console.log('✅ Cart and localStorage cleared successfully');
            } catch (e) {
                console.error('Error clearing cart and localStorage:', e);
            }
        }
    }, [searchParams, isClient, hasCleared, clearCartAfterPayment]);

    const getErrorMessage = (errorCode: string): string => {
        if (!errorCode) return 'Payment failed. Please try again.';

        const errorMessages: Record<string, string> = {
            'invalid_hash': 'Payment verification failed. Please contact support.',
            'payment_failed': 'Payment was not successful. Please try again.',
            'callback_error': 'Error processing payment response. Please contact support.',
            'configuration_error': 'Payment service configuration error. Please contact support.',
        };

        try {
            const decoded = decodeURIComponent(errorCode);
            return errorMessages[errorCode] || decoded || 'Payment failed. Please try again.';
        } catch (e) {
            return errorCode || 'Payment failed. Please try again.';
        }
    };

    const handleReturnToMenu = () => {
        if (!isClient) return;

        try {
            const restaurantId = localStorage.getItem('restaurantId');
            if (restaurantId && restaurantId !== 'null' && restaurantId !== 'undefined') {
                // Use window.location.href to force a full page reload
                // This ensures the CartContext is completely re-initialized with empty cart
                window.location.href = `/restaurant/${restaurantId}`;
            } else {
                window.location.href = '/';
            }
        } catch (e) {
            console.error('Error navigating to menu:', e);
            window.location.href = '/';
        }
    };

    const handleTrackOrder = () => {
        if (!isClient || !orderId) return;

        try {
            if (orderId && orderId !== 'null' && orderId !== 'undefined') {
                // For track order, we can use router.push since cart doesn't matter there
                router.push(`/order-status/${orderId}`);
            }
        } catch (e) {
            console.error('Error navigating to order status:', e);
        }
    };

    const handleTryAgain = () => {
        if (!isClient) return;

        try {
            // Use window.location.href to ensure fresh start
            window.location.href = '/payment';
        } catch (e) {
            console.error('Error navigating to payment:', e);
        }
    };

    // Don't render anything until we're on the client
    if (!isClient) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center p-4",
                "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
            )}>
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                                Your payment has been processed successfully.
                            </p>
                            {orderId && orderId !== 'null' && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                                    Order ID: {orderId}
                                </p>
                            )}
                            {txnId && txnId !== 'null' && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                                    Transaction ID: {txnId}
                                </p>
                            )}
                            {amount && amount !== 'null' && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                                    Amount: ₹{amount}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleReturnToMenu}
                            >
                                Return to Menu
                            </Button>
                            {orderId && orderId !== 'null' && (
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleTrackOrder}
                                >
                                    Track Order
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Failed status
    return (
        <div className={cn(
            "min-h-screen flex items-center justify-center p-4",
            "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
        )}>
            <Card className="w-full max-w-md">
                <CardContent className="pt-6 text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                            {getErrorMessage(error)}
                        </p>
                        {orderId && orderId !== 'null' && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                                Order ID: {orderId}
                            </p>
                        )}
                        {txnId && txnId !== 'null' && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-500">
                                Transaction ID: {txnId}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleReturnToMenu}
                        >
                            Return to Menu
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleTryAgain}
                        >
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main component wrapped with CartProvider
export default function PaymentResult() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        }>
            <CartProvider>
                <PaymentResultContent />
            </CartProvider>
        </Suspense>
    );
}