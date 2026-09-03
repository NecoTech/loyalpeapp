'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '..//..//..//lib/utils'
import {
    ArrowLeft,
    Clock,
    Package,
    Receipt,
    CreditCard,
    CheckCircle2,
    Ban,
    Timer,
    ChefHat,
    Truck,
    Info,
    Download,
    Printer,
    RefreshCw,
    AlertCircle, ClipboardList
} from 'lucide-react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from "..//components/ui/card"
import { Button } from "..//components/ui/button"
import { Separator } from "..//components/ui/separator"
import { useCurrency } from '../context/CurrencyContext'

type OrderItem = {
    name: string
    quantity: number
    price: number
    cookingRequest?: string
    isTakeaway?: boolean
    takeawayQuantity?: number
}

type Order = {
    _id: string
    orderNumber: string
    items: OrderItem[]
    subtotal: number
    tax: number
    platformFee?: number
    cgstRate?: number
    cgstAmount?: number
    sgstRate?: number
    sgstAmount?: number
    tipAmount: number
    total: number
    orderStatus: 'pending' | 'preparing' | 'Completed' | 'delivered' | 'Notcomplete' | 'Processing' | 'Cancelled'
    createdAt: string
    paymentMethod: string
    paid: boolean
    serviceType?: 'dine-in' | 'home-delivery' | 'room-service'
    tableNumber?: number
    deliveryAddress?: string
    roomNumber?: string
    gstNumber?: string
    restaurantId?: string
    transactionId?: string   // Omniware transaction_id stored after payment
}

const StatusIcon = ({ status }: { status: Order['orderStatus'] }) => {
    switch (status) {
        case 'pending': return <Timer className="h-6 w-6" />
        case 'preparing': return <ChefHat className="h-6 w-6" />
        case 'Processing': return <ChefHat className="h-6 w-6" />
        case 'Completed': return <CheckCircle2 className="h-6 w-6" />
        case 'delivered': return <Truck className="h-6 w-6" />
        case 'Notcomplete': return <Ban className="h-6 w-6" />
        case 'Cancelled': return <Ban className="h-6 w-6" />
        default: return null
    }
}

export default function OrderStatus({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<Order | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [restaurantDetails, setRestaurantDetails] = useState<any>(null)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [isCheckingPayment, setIsCheckingPayment] = useState(false)
    const [paymentCheckMessage, setPaymentCheckMessage] = useState<string | null>(null)
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
    const printableRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { theme } = useTheme()
    const { currency } = useCurrency()

    // Function to convert UTC to IST
    const convertToIST = (dateString: string) => {
        const utcDate = new Date(dateString)
        return new Date(utcDate.getTime())
    }

    useEffect(() => {
        const generateQRCode = async () => {
            if (!order?._id) return
            try {
                const qrDataUrl = await QRCode.toDataURL(order._id, {
                    width: 120,
                    margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                })
                setQrCodeDataUrl(qrDataUrl)
            } catch (error) {
                console.error('Error generating QR code:', error)
            }
        }
        generateQRCode()
    }, [order?._id])

    // Format date to locale string with IST time
    const formatDate = (dateString: string) => {
        const istDate = convertToIST(dateString)
        return istDate.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    // ── Omniware payment status check ──────────────────────────────────────
    const checkOmniwarePaymentStatus = async (orderData?: Order) => {
        const currentOrder = orderData || order

        if (!currentOrder) return
        if (currentOrder.paymentMethod !== 'googlepay') {
            console.log('Skipping Omniware check: not an online payment order')
            return
        }
        if (currentOrder.paid) {
            console.log('Skipping Omniware check: order already paid')
            return
        }
        if (!currentOrder.restaurantId) {
            setPaymentCheckMessage('Restaurant ID not available for payment verification')
            setTimeout(() => setPaymentCheckMessage(null), 3000)
            return
        }

        setIsCheckingPayment(true)
        setPaymentCheckMessage('Checking payment status with Payment gateway...')

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/omniware/check-payment-status`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: currentOrder._id,
                        restaurantId: currentOrder.restaurantId,
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) throw new Error(result.error || 'Failed to check payment status')

            console.log('Omniware payment check result:', result)

            if (result.success && result.txnStatus === 'SUCCESS') {
                setPaymentCheckMessage('Payment found! Updating order status...')

                // Update order status in database
                const updateResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${currentOrder._id}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paid: true,
                            orderStatus: 'Notcomplete',
                            paymentMethod: 'googlepay',
                            transactionId: result.transactionId || '',
                            paidAt: new Date().toISOString(),
                        }),
                    }
                )

                if (updateResponse.ok) {
                    setOrder(prev => prev
                        ? { ...prev, paid: true, orderStatus: 'Notcomplete' as any }
                        : null
                    )
                    setPaymentCheckMessage('Payment verified and order updated successfully!')
                    setTimeout(() => setPaymentCheckMessage(null), 3000)
                } else {
                    const updateError = await updateResponse.json()
                    throw new Error(updateError.message || 'Failed to update order')
                }

            } else if (result.txnStatus === 'PENDING') {
                setPaymentCheckMessage('Payment is still pending in Payment gateway')
                setTimeout(() => setPaymentCheckMessage(null), 3000)
            } else if (result.txnStatus === 'CANCELLED') {
                setPaymentCheckMessage('Payment was cancelled. Please try paying again.')
                setTimeout(() => setPaymentCheckMessage(null), 3000)
            } else if (result.txnStatus === 'FAILED') {
                setPaymentCheckMessage('Payment found but failed in Payment gateway')
                setTimeout(() => setPaymentCheckMessage(null), 3000)
            } else {
                setPaymentCheckMessage('No matching payment found in Payment gateway')
                setTimeout(() => setPaymentCheckMessage(null), 3000)
            }

        } catch (error: any) {
            console.error('Error checking payment status:', error)
            setPaymentCheckMessage(`Error: ${error.message}`)
            setTimeout(() => setPaymentCheckMessage(null), 5000)
        } finally {
            setIsCheckingPayment(false)
        }
    }

    // ── Initial fetch — auto-check for cancelled unpaid online orders ──────
    useEffect(() => {
        const fetchOrderStatus = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`)
                if (!response.ok) throw new Error('Failed to fetch order status')
                const data = await response.json()
                setOrder(data)

                if (data.restaurantId) {
                    fetchRestaurantDetails(data.restaurantId)
                }

                // Auto-check Omniware payment for unpaid cancelled online orders
                if (
                    data.paymentMethod === 'googlepay' &&
                    !data.paid &&
                    (data.orderStatus === 'Cancelled' || data.orderStatus === 'cancelled')
                ) {
                    console.log('Auto-checking Omniware payment status for cancelled online order')
                    setTimeout(() => checkOmniwarePaymentStatus(data), 2000)
                }

            } catch (err) {
                setError('Failed to load order status. Please try again later.')
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchOrderStatus()
    }, [orderId])

    // ── Periodic refresh (without auto payment check) ──────────────────────
    useEffect(() => {
        const fetchOrderStatusOnly = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`)
                if (response.ok) {
                    const data = await response.json()
                    setOrder(data)
                }
            } catch (err) {
                console.error('Error refreshing order status:', err)
            }
        }

        const intervalId = setInterval(fetchOrderStatusOnly, 30000)
        return () => clearInterval(intervalId)
    }, [orderId])

    const fetchRestaurantDetails = async (restaurantId: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurant/${restaurantId}`)
            if (response.ok) {
                const data = await response.json()
                if (data && data[0]) {
                    setRestaurantDetails(data[0])
                    return data[0]
                }
            }
            return null
        } catch (error) {
            console.error('Error fetching restaurant details:', error)
            return null
        }
    }

    const getStatusColor = (status: Order['orderStatus']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'preparing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'Processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'delivered': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            case 'Notcomplete': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            case 'Cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
        }
    }

    // Generate and download bill
    const generatePDF = async () => {
        if (!order) return

        setIsGeneratingPdf(true)

        try {
            const printWindow = window.open('', '_blank')
            if (!printWindow) {
                throw new Error('Could not open print window. Please allow popups for this site.')
            }

            const restaurantName = restaurantDetails?.name || 'Restaurant'

            printWindow.document.write(`
                <html>
                <head>
                    <title>Bill - ${order.orderNumber}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            color: #333;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .header h1 {
                            font-size: 24px;
                            margin-bottom: 5px;
                        }
                        .header p {
                            margin: 5px 0;
                            font-size: 14px;
                        }
                        .order-info {
                            margin-bottom: 20px;
                            font-size: 14px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th, td {
                            padding: 8px;
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                            font-size: 14px;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        .summary {
                            width: 300px;
                            margin-left: auto;
                            font-size: 14px;
                        }
                        .summary-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 5px;
                        }
                        .total {
                            font-weight: bold;
                            border-top: 1px solid #ddd;
                            padding-top: 5px;
                            margin-top: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            font-size: 14px;
                            color: #777;
                        }
                        .notes {
                            font-size: 12px;
                            margin-top: 5px;
                            color: #777;
                        }
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact;
                                color-adjust: exact;
                            }
                            button {
                                display: none !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>INVOICE</h1>
                        <p><strong>${restaurantName}</strong></p>
                        ${restaurantDetails?.address ? `<p>${restaurantDetails.address}</p>` : ''}
                        ${restaurantDetails?.pincode ? `<p>Pincode: ${restaurantDetails.pincode}</p>` : ''}
                        ${order.gstNumber || restaurantDetails?.gstNumber
                    ? `<p>GST No: ${order.gstNumber || restaurantDetails?.gstNumber}</p>`
                    : ''}
                    </div>
 
                    <div class="order-info">
                        <p><strong>Order #:</strong> ${order.orderNumber}</p>
                        <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
                        <p><strong>Service Type:</strong> ${order.serviceType === 'dine-in' ? 'Dine In' :
                    order.serviceType === 'home-delivery' ? 'Home Delivery' :
                        order.serviceType === 'room-service' ? 'Room Service' : 'Dine In'
                }</p>
                        ${order.serviceType === 'dine-in' && order.tableNumber
                    ? `<p><strong>Table #:</strong> ${order.tableNumber}</p>` : ''}
                        ${order.serviceType === 'room-service' && order.roomNumber
                    ? `<p><strong>Room #:</strong> ${order.roomNumber}</p>` : ''}
                        ${order.serviceType === 'home-delivery' && order.deliveryAddress
                    ? `<p><strong>Delivery To:</strong> ${order.deliveryAddress}</p>` : ''}
                        <p><strong>Payment:</strong> ${order.paymentMethod === 'googlepay' ? 'Online (UPI)' : 'Counter'}
                            (${order.paid ? 'Paid' : 'Pending'})</p>
                        ${order.transactionId
                    ? `<p><strong>Transaction ID:</strong> ${order.transactionId}</p>` : ''}
                    </div>
 
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>
                                        ${item.name}
                                        ${item.isTakeaway ? '(Takeaway)' : ''}
                                        ${item.cookingRequest
                            ? `<div class="notes">Note: ${item.cookingRequest}</div>` : ''}
                                    </td>
                                    <td>${item.quantity}</td>
                                    <td>${currency}${item.price.toFixed(2)}</td>
                                    <td>${currency}${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
 
                    <div class="summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>${currency}${order.subtotal.toFixed(2)}</span>
                        </div>
 
                        <div class="summary-row">
                            <span>${hasGstDetails ? 'Platform Fee:' : 'Tax:'}</span>
                            <span>${currency}${(order.platformFee || order.tax || 0).toFixed(2)}</span>
                        </div>
 
                        ${typeof order.cgstAmount === 'number' && order.cgstAmount > 0 ? `
                            <div class="summary-row">
                                <span>CGST ${typeof order.cgstRate === 'number' ? `(${order.cgstRate}%)` : ''}:</span>
                                <span>${currency}${order.cgstAmount.toFixed(2)}</span>
                            </div>
                        ` : ''}
 
                        ${typeof order.sgstAmount === 'number' && order.sgstAmount > 0 ? `
                            <div class="summary-row">
                                <span>SGST ${typeof order.sgstRate === 'number' ? `(${order.sgstRate}%)` : ''}:</span>
                                <span>${currency}${order.sgstAmount.toFixed(2)}</span>
                            </div>
                        ` : ''}
 
                        ${order.tipAmount > 0 ? `
                            <div class="summary-row">
                                <span>Tip:</span>
                                <span>${currency}${order.tipAmount.toFixed(2)}</span>
                            </div>
                        ` : ''}
 
                        <div class="summary-row total">
                            <span>Total:</span>
                            <span>${currency}${order.total.toFixed(2)}</span>
                        </div>
                    </div>
 
                    ${hasGstDetails && typeof order.cgstRate === 'number' && typeof order.sgstRate === 'number' ? `
                        <div class="notes">
                            <p>This bill includes ${order.cgstRate}% CGST and ${order.sgstRate}% SGST</p>
                        </div>
                    ` : ''}
 
                    <div class="footer">
                        <p>Thank you for your order!</p>
                        <p><small>Powered by Oder App</small></p>
                        <button id="printButton" style="padding: 10px 20px; background: #0070f3; color: white;
                            border: none; border-radius: 4px; margin-top: 20px; cursor: pointer;">
                            Print Bill
                        </button>
                    </div>
 
                    <script>
                        document.getElementById('printButton').addEventListener('click', function() {
                            this.style.display = 'none';
                            window.print();
                            setTimeout(() => { this.style.display = 'block'; }, 1000);
                        });
 
                        // Auto-trigger print after 500ms
                        setTimeout(() => {
                            document.getElementById('printButton').click();
                        }, 500);
                    </script>
                </body>
                </html>
            `)

            printWindow.document.close()
        } catch (error) {
            console.error('Error generating bill:', error)
            alert(error instanceof Error ? error.message : 'Failed to generate bill. Please try again.')
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    // Check if order has GST details
    const hasGstDetails = order &&
        ((typeof order.cgstAmount === 'number' && order.cgstAmount > 0) ||
            (typeof order.sgstAmount === 'number' && order.sgstAmount > 0))

    if (isLoading) {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center",
                "bg-white text-zinc-900",
                "dark:bg-zinc-900 dark:text-white"
            )}>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className={cn(
                "min-h-screen p-4",
                "bg-white text-zinc-900",
                "dark:bg-zinc-900 dark:text-white"
            )}>
                <Card className="max-w-lg mx-auto mt-8 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
                        {error || 'Order not found'}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn(
            "min-h-screen p-4",
            "bg-white text-zinc-900",
            "dark:bg-zinc-900 dark:text-white"
        )}>
            <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Menu
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/orders')}
                        title="Order History"
                    >
                        <ClipboardList className="h-5 w-5 text-[#FF385C]" />
                    </Button>
                </div>

                {/* Payment Check Status Message */}
                {paymentCheckMessage && (
                    <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                {isCheckingPayment ? (
                                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                )}
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                    {paymentCheckMessage}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                            {order.orderNumber.split('-').pop()}
                                        </div>
                                        <span className="text-2l font-semibold">
                                            #{order.orderNumber.split('-').slice(0, -1).join('-')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {formatDate(order.createdAt)}
                                </div>
                            </div>
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                                getStatusColor(order.orderStatus)
                            )}>
                                <StatusIcon status={order.orderStatus} />
                                <span>{order.orderStatus.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Payment Status Check Button for unpaid online orders */}
                        {order.paymentMethod === 'googlepay' && !order.paid && (
                            <div className="mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => checkOmniwarePaymentStatus(order)}
                                    disabled={isCheckingPayment}
                                    className="w-full flex items-center justify-center gap-2"
                                >
                                    {isCheckingPayment ? (
                                        <>
                                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Checking Payment Status...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4" />
                                            Check Payment Status
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                                    Verify if your online payment was completed
                                </p>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Order Details */}
                        <div>
                            <h3 className="font-medium flex items-center mb-3">
                                <Package className="h-5 w-5 mr-2" />
                                Order Details
                            </h3>
                            <div className="space-y-2">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex flex-col">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{item.name} × {item.quantity}</span>
                                            <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        {(item.cookingRequest || item.isTakeaway) && (
                                            <div className="text-sm text-zinc-500 dark:text-zinc-400 pl-4">
                                                {item.cookingRequest && (
                                                    <p>Note: {item.cookingRequest}</p>
                                                )}
                                                {item.isTakeaway && (
                                                    <p>Takeaway: {item.takeawayQuantity || 1}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Bill Details */}
                        <div>
                            <h3 className="font-medium flex items-center mb-3">
                                <Receipt className="h-5 w-5 mr-2" />
                                Bill Details
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                                    <span>{currency}{order.subtotal.toFixed(2)}</span>
                                </div>

                                {typeof order.platformFee === 'number' && order.platformFee > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {hasGstDetails ? 'Platform Fee' : 'Tax'}
                                        </span>
                                        <span>{currency}{(order.platformFee || order.tax || 0).toFixed(2)}</span>
                                    </div>
                                )}

                                {typeof order.cgstAmount === 'number' && order.cgstAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            CGST {typeof order.cgstRate === 'number' ? `(${order.cgstRate}%)` : ''}
                                        </span>
                                        <span>{currency}{order.cgstAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {typeof order.sgstAmount === 'number' && order.sgstAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            SGST {typeof order.sgstRate === 'number' ? `(${order.sgstRate}%)` : ''}
                                        </span>
                                        <span>{currency}{order.sgstAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {order.tipAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Tip</span>
                                        <span>{currency}{order.tipAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-medium">
                                    <span>Total</span>
                                    <span>{currency}{order.total.toFixed(2)}</span>
                                </div>

                                {order.gstNumber && (
                                    <div className="mt-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400 border-t border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-start gap-1">
                                            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p>GST No: {order.gstNumber}</p>
                                                <p>Also you can show this bill or show screenshot at the counter</p>
                                                {hasGstDetails && typeof order.cgstRate === 'number' && typeof order.sgstRate === 'number' && (
                                                    <p>This bill includes {order.cgstRate}% CGST and {order.sgstRate}% SGST</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Print Bill Button */}
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        className="w-full flex items-center justify-center gap-2"
                                        onClick={generatePDF}
                                        disabled={isGeneratingPdf}
                                    >
                                        {isGeneratingPdf ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                Generating Bill...
                                            </>
                                        ) : (
                                            <>
                                                <Printer className="h-4 w-4" />
                                                Download Bill
                                            </>
                                        )}
                                    </Button>

                                    {/* QR Code Section */}
                                    <div className="flex flex-col items-center space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                                            Order QR Code
                                        </p>
                                        <div className="bg-white p-3 rounded-lg">
                                            {qrCodeDataUrl ? (
                                                <img
                                                    src={qrCodeDataUrl}
                                                    alt="Order QR Code"
                                                    className="w-55 h-55"
                                                />
                                            ) : (
                                                <div className="w-30 h-30 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                                            Scan to view order details
                                        </p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                                            ID: {order?._id?.slice(-8)}...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="font-medium flex items-center mb-3">
                                <CreditCard className="h-5 w-5 mr-2" />
                                Payment Details
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 dark:text-zinc-400">Method</span>
                                    <span className="capitalize">
                                        {order.paymentMethod === 'googlepay' ? 'Online (UPI)' : 'Counter'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 dark:text-zinc-400">Status</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                        order.paid
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    )}>
                                        {order.paid ? 'Paid' : 'Pending'}
                                    </span>
                                </div>

                                {/* Omniware transaction ID */}
                                {order.transactionId && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Transaction ID</span>
                                        <span className="text-xs font-mono">{order.transactionId}</span>
                                    </div>
                                )}

                                {/* Service Type Display */}
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 dark:text-zinc-400">Service Type</span>
                                    <span className="capitalize">
                                        {order.serviceType === 'dine-in' ? 'Dine In' :
                                            order.serviceType === 'home-delivery' ? 'Home Delivery' :
                                                order.serviceType === 'room-service' ? 'Room Service' :
                                                    'Dine In'}
                                    </span>
                                </div>

                                {order.serviceType === 'dine-in' && order.tableNumber && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Table Number</span>
                                        <span>{order.tableNumber}</span>
                                    </div>
                                )}

                                {order.serviceType === 'room-service' && order.roomNumber && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Room Number</span>
                                        <span className="font-medium">{order.roomNumber}</span>
                                    </div>
                                )}

                                {order.serviceType === 'home-delivery' && order.deliveryAddress && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Delivery Address</span>
                                        <span className="text-right max-w-[200px] break-words">
                                            {order.deliveryAddress}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}