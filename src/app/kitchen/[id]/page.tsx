"use client"

import KitchenOrders from '..//../components/KitchenOrders';
import { useParams } from 'next/navigation'

export default function KitchenPage() {
    const params = useParams()
    const { id } = params
    return (
        <div className="min-h-screen bg-gray-100">
            <KitchenOrders restaurantId={id as string} />
        </div>
    );
}