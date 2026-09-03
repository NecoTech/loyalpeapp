'use client'

import { useParams } from 'next/navigation'
import PaymentStatus from '../../components/PaymentStatus'

export default function OrdersPage() {
  const params = useParams()
  const { id } = params

  return (
    // <div className="min-h-screen bg-gray-100 py-12">
    <PaymentStatus transcationId={id as string} />
    // </div>
  )
}