'use client'

import { useParams } from 'next/navigation'
import OrderStatus from '..//..//components/OrderStatus'

export default function OrderStatusPage() {
    const params = useParams()
    const { orderId } = params

    return (
        // <div className="min-h-screen bg-gray-100 py-12">
        <OrderStatus orderId={orderId as string} />
        // </div>
    )
}