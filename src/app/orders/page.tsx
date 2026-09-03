'use client'

import { useParams } from 'next/navigation'
import Orders from '../components/Orders'

export default function OrdersPage() {
    const params = useParams()
    const { userId } = params

    return (
        // <div className="min-h-screen bg-gray-100 py-12">
        <Orders />
        // </div>
    )
}