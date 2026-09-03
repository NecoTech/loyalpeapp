'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function PaymentStatusContent() {
    const [status, setStatus] = useState<'success' | 'failure' | 'loading'>('loading')
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get('orderId')

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId,
                    }),
                })

                const data = await response.json()
                setStatus(data.status === 'PAID' ? 'success' : 'failure')
            } catch (error) {
                console.error('Error verifying payment:', error)
                setStatus('failure')
            }
        }

        if (orderId) {
            verifyPayment()
        }
    }, [orderId])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Verifying Payment...</h2>
                    <p>Please wait while we verify your payment.</p>
                </div>
            </div>
        )
    }

    if (status === 'failure') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-red-600">Payment Failed</h2>
                    <p className="mb-4">We couldnt process your payment. Please try again.</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 text-green-600">Payment Successful!</h2>
                <p className="mb-4">Your order has been placed successfully.</p>
                <p className="mb-4">Order ID: {orderId}</p>
                <div className="space-x-4">
                    <button
                        onClick={() => router.push('/')}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Return to Home
                    </button>
                    <button
                        onClick={() => router.push(`/order-status/${orderId}`)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        View Order Status
                    </button>
                </div>
            </div>
        </div>
    )
}

// Loading component for Suspense fallback
function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Loading...</h2>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
        </div>
    )
}

// Main component with Suspense boundary
export default function PaymentStatus() {
    return (
        <Suspense fallback={<LoadingState />}>
            <PaymentStatusContent />
        </Suspense>
    )
}