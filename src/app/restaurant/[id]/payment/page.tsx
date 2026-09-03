'use client'

import { useParams } from 'next/navigation'
import { CartProvider } from '..//..//../context/CartContext'
import Payment from '..//..//../components/Payment'

export default function PaymentPage() {
    const params = useParams()
    const { id } = params

    return (
        <CartProvider>
            {/* <div className="min-h-screen bg-gray-100 py-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">CheckOut</h1> */}
            <Payment />
            {/* </div>
            </div> */}
        </CartProvider>
    )
}