'use client'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '..//context/CartContext'
import { useRouter } from 'next/navigation'
import { useAuth } from '..//context/AuthContext'
import { useCurrency } from '..//context/CurrencyContext'
import { useTheme } from 'next-themes'
import { cn } from '..//..//..//lib/utils'
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "..//components/ui/card"
import { Button } from "..//components/ui/button"
import { ArrowLeft, CreditCard, Wallet, Check, Info, Clock, Phone, MapPin, Utensils, Truck, BedDouble, AlertTriangle, ExternalLink, X, QrCode, Smartphone } from 'lucide-react'
import { encrypt, decrypt } from '..//..//..//lib/encryption'
import { PulseLoader } from 'react-spinners'

type UserDetails = {
    fullname: string;
    phoneNumber: string;
    email?: string;
    isFaculty?: boolean;
};

type Order = {
    _id: string
    orderNumber: string
    total: number
    createdAt: string
    orderStatus: string
}

export default function Payment() {
    const { cartItems, clearCartAfterPayment, tableNumber } = useCart()
    const [paymentMethod, setPaymentMethod] = useState<'counter' | 'googlepay' | null>(null)
    const [orderPlaced, setOrderPlaced] = useState(false)
    const router = useRouter()
    const [orderId, setOrderId] = useState<string | null>(null)
    const [restaurantId, setRestaurantId] = useState<string | null>(null)
    const { user } = useAuth()
    const { currency } = useCurrency()
    const [isProcessing, setIsProcessing] = useState(false)
    const { theme } = useTheme()
    const [tipAmount, setTipAmount] = useState(0)
    const [cgstRate, setCgstRate] = useState<number>(2.5)
    const [sgstRate, setSgstRate] = useState<number>(2.5)
    const [platformRate, setPlatformRate] = useState<number>(0)
    const [restaurantDetails, setRestaurantDetails] = useState<any>(null)
    const [orderNumber, setOrderNumber] = useState<string | null>(null)
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [incompleteOrders, setIncompleteOrders] = useState<Order[]>([])
    const [orderLimitReached, setOrderLimitReached] = useState(false)
    const [orderLimitTime, setOrderLimitTime] = useState<number | null>(null)
    const [orderLimitCountdown, setOrderLimitCountdown] = useState('')
    const [persistedSubtotal, setPersistedSubtotal] = useState(0)
    const [persistedCartItems, setPersistedCartItems] = useState<any[]>([])
    const [selectedService, setSelectedService] = useState<'dine-in' | 'home-delivery' | 'room-service'>('dine-in')
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [roomNumber, setRoomNumber] = useState('')
    const [deliveryCharge, setDeliveryCharge] = useState<number>(0)
    const [deliveryDistance, setDeliveryDistance] = useState<number>(0)
    const [refreshHandled, setRefreshHandled] = useState(false)
    const [isCheckingUpiPayment, setIsCheckingUpiPayment] = useState(false) // NEW: single check-in-flight state, replaces upiPollingActive
    const hasLeftAppRef = useRef(false) // tracks whether the tab was backgrounded after launching a UPI app
    const lastHiddenAtRef = useRef<number | null>(null) // NEW: timestamp of last hide, filters spurious visibility flashes

    // ── UPI Intent bottom-sheet states ──────────────────────────────────────
    const [showUpiSheet, setShowUpiSheet] = useState(false)
    const [upiIntentUrl, setUpiIntentUrl] = useState<string | null>(null)
    const [upiQrCode, setUpiQrCode] = useState<string | null>(null)
    const [upiOrderId, setUpiOrderId] = useState<string | null>(null)
    const [isFetchingUpiIntent, setIsFetchingUpiIntent] = useState(false)
    const [upiPollingActive, setUpiPollingActive] = useState(false)
    const upiPollIntervalRef = useRef<NodeJS.Timeout | null>(null) // NEW: so we can cancel polling on close
    const upiPollTimeoutRef = useRef<NodeJS.Timeout | null>(null) // NEW: safety-stop timer, also needs cancelling
    // ── end UPI intent states ─────────────────────────────────────────────

    // ── Omniware modal states ──────────────────────────────────────────────
    const [paymentFailed, setPaymentFailed] = useState(false)
    const [paymentFailedMessage, setPaymentFailedMessage] = useState('')
    // ── end modal states ───────────────────────────────────────────────────

    // Ensure UPI polling never survives the component unmounting
    useEffect(() => {
        return () => {
            if (upiPollIntervalRef.current) clearInterval(upiPollIntervalRef.current)
            if (upiPollTimeoutRef.current) clearTimeout(upiPollTimeoutRef.current)
        }
    }, [])

    useEffect(() => {
        if (!showUpiSheet || !upiOrderId) return

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                lastHiddenAtRef.current = Date.now()
                return
            }

            if (document.visibilityState !== 'visible' || !hasLeftAppRef.current) return

            // Some UPI apps (PhonePe, Paytm) trigger a brief native "open with"
            // interstitial that flashes visibility before the app actually
            // opens. Treat a return within ~700ms of hiding as that flash, not
            // a genuine return from the payment flow — otherwise it burns the
            // one-shot check before the real return happens.
            const hiddenFor = lastHiddenAtRef.current ? Date.now() - lastHiddenAtRef.current : Infinity
            if (hiddenFor < 700) return

            const resolved = await checkUpiPaymentStatus(upiOrderId)
            // Only stop watching once the payment has actually resolved — if it
            // came back PENDING (e.g. the user went back into the app to confirm
            // their PIN), keep hasLeftAppRef armed so the *next* return still
            // triggers a check instead of going silent.
            if (resolved) {
                hasLeftAppRef.current = false
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [showUpiSheet, upiOrderId, restaurantId])
    useEffect(() => {
        if (cartItems.length > 0) {
            const currentSubtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
            setPersistedSubtotal(currentSubtotal)
            setPersistedCartItems(cartItems)
            localStorage.setItem('paymentSubtotal', currentSubtotal.toString())
            localStorage.setItem('paymentCartItems', JSON.stringify(cartItems.map(item => ({
                _id: item._id, name: item.name, price: item.price, quantity: item.quantity
            }))))
        } else {
            const storedSubtotal = localStorage.getItem('paymentSubtotal')
            const storedCartItems = localStorage.getItem('paymentCartItems')
            if (storedSubtotal) setPersistedSubtotal(parseFloat(storedSubtotal))
            if (storedCartItems) {
                try { setPersistedCartItems(JSON.parse(storedCartItems)) } catch (e) { console.error(e) }
            }
        }
    }, [cartItems])

    useEffect(() => {
        if (refreshHandled) return

        const handlePageRefresh = () => {
            if (typeof window === 'undefined') return false
            const now = Date.now()
            const lastRefreshTime = sessionStorage.getItem('lastPaymentPageRefresh')
            if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > 10000) {
                sessionStorage.setItem('lastPaymentPageRefresh', now.toString())
                setRefreshHandled(true)
                window.location.reload()
                return true
            }
            return false
        }

        if (handlePageRefresh()) return
        setRefreshHandled(true)

        // ── Omniware: handle redirect back from /api/omniware/response ──────
        const urlParams = new URLSearchParams(window.location.search)
        const omniwareStatus = urlParams.get('status')

        if (omniwareStatus === 'success' || omniwareStatus === 'failed' || omniwareStatus === 'cancelled') {
            const returnedOrderId = urlParams.get('order_id')
            const transactionId = urlParams.get('transaction_id')
            const message = urlParams.get('message')

            console.log('Omniware return redirect received:', { omniwareStatus, returnedOrderId, transactionId, message })

            if (returnedOrderId) {
                setOrderId(returnedOrderId)
                    ; (async () => {
                        try {
                            const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/online/${returnedOrderId}`)
                            if (orderRes.ok) {
                                const orderData = await orderRes.json()
                                if (orderData?.orderNumber) setOrderNumber(orderData.orderNumber)
                            }
                        } catch (e) {
                            console.warn('Could not re-fetch order number:', e)
                        }
                    })()
            }

            if (omniwareStatus === 'success') {
                clearCartAfterPayment()
                clearPaymentStorage()
                setOrderPlaced(true)
            } else {
                const failMsg =
                    omniwareStatus === 'cancelled'
                        ? 'Payment was cancelled. No amount has been deducted.'
                        : message || 'Payment was not completed. Please try again.'
                setPaymentFailed(true)
                setPaymentFailedMessage(failMsg)
            }

            window.history.replaceState({}, document.title, window.location.pathname)
        }
        // ── end Omniware response handling ──────────────────────────────────

        const storedService = localStorage.getItem('selectedService') as 'dine-in' | 'home-delivery' | 'room-service' | null
        if (storedService) setSelectedService(storedService)

        const storedDeliveryAddress = localStorage.getItem('deliveryAddress')
        if (storedDeliveryAddress) setDeliveryAddress(storedDeliveryAddress)

        const storedRoomNumber = localStorage.getItem('selectedRoomNumber')
        if (storedRoomNumber) setRoomNumber(storedRoomNumber)

        const storedDeliveryCharge = localStorage.getItem('deliveryCharge')
        const storedDeliveryDistance = localStorage.getItem('deliveryDistance')
        if (storedDeliveryCharge) setDeliveryCharge(parseFloat(storedDeliveryCharge))
        if (storedDeliveryDistance) setDeliveryDistance(parseFloat(storedDeliveryDistance))

        const encryptedUserData = localStorage.getItem("authData")
        if (encryptedUserData) {
            try {
                const decryptedUserData = decrypt(encryptedUserData)
                console.log('DEBUG authData:', decryptedUserData)
                setUserDetails(decryptedUserData)
                if (decryptedUserData?.phoneNumber) fetchUserOrders(decryptedUserData.phoneNumber)
            } catch (error) {
                console.error("Error decrypting user details:", error)
                alert("Error retrieving your profile. Please log in again.")
            }
        } else {
            if (user && user.fullname && user.phoneNumber) {
                const userData = { fullname: user.fullname, phoneNumber: user.phoneNumber }
                setUserDetails(userData)
                localStorage.setItem("authData", encrypt(userData))
                fetchUserOrders(user.phoneNumber)
            } else {
                alert("Please sign in to continue with your order")
                router.push(`/restaurant/${localStorage.getItem("restaurantId")}`)
                return
            }
        }

        const storedRestaurantId = localStorage.getItem("restaurantId")
        setRestaurantId(storedRestaurantId)

        const storedTipAmount = localStorage.getItem("tipAmount")
        if (storedTipAmount) setTipAmount(parseFloat(storedTipAmount))

        const storedCgstRate = localStorage.getItem("cgstRate")
        if (storedCgstRate) setCgstRate(parseFloat(storedCgstRate))

        const storedSgstRate = localStorage.getItem("sgstRate")
        if (storedSgstRate) setSgstRate(parseFloat(storedSgstRate))

        const storedPlatformRate = localStorage.getItem("platformRate")
        if (storedPlatformRate) setPlatformRate(parseFloat(storedPlatformRate))

        if (storedRestaurantId) fetchRestaurantDetails(storedRestaurantId)

        const orderLimitData = localStorage.getItem("orderLimitTime")
        if (orderLimitData) {
            const limitTime = parseInt(orderLimitData)
            if (Date.now() < limitTime) {
                setOrderLimitReached(true)
                setOrderLimitTime(limitTime)
                updateOrderLimitCountdown(limitTime)
                const timerId = setInterval(() => {
                    if (Date.now() >= limitTime) {
                        setOrderLimitReached(false)
                        localStorage.removeItem("orderLimitTime")
                        clearInterval(timerId)
                    } else {
                        updateOrderLimitCountdown(limitTime)
                    }
                }, 1000)
                return () => clearInterval(timerId)
            } else {
                localStorage.removeItem("orderLimitTime")
            }
        }

        setIsLoading(false)
    }, [router, user])

    const updateOrderLimitCountdown = (limitTime: number) => {
        const timeRemaining = limitTime - Date.now()
        if (timeRemaining <= 0) { setOrderLimitCountdown(''); return }
        const minutes = Math.floor(timeRemaining / 60000)
        const seconds = Math.floor((timeRemaining % 60000) / 1000)
        setOrderLimitCountdown(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`)
    }

    const fetchUserOrders = async (phoneNumber: string) => {
        try {
            const encryptedUserId = encrypt(phoneNumber)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: encryptedUserId }),
            })
            if (!response.ok) throw new Error('Failed to fetch orders')
            const { data: encryptedData } = await response.json()
            const decryptedData = decrypt(encryptedData)
            const incompleteOrdersList = decryptedData.filter((order: Order) =>
                order.orderStatus.toLowerCase() === 'notcomplete'
            )
            setIncompleteOrders(incompleteOrdersList)
            if (incompleteOrdersList.length >= 3) {
                if (!orderLimitReached) {
                    const oneHourFromNow = Date.now() + (60 * 60 * 1000)
                    setOrderLimitReached(true)
                    setOrderLimitTime(oneHourFromNow)
                    localStorage.setItem("orderLimitTime", oneHourFromNow.toString())
                    updateOrderLimitCountdown(oneHourFromNow)
                }
            } else if (incompleteOrdersList.length < 3 && orderLimitReached) {
                setOrderLimitReached(false)
                setOrderLimitTime(null)
                setOrderLimitCountdown('')
                localStorage.removeItem("orderLimitTime")
            }
            setIsLoading(false)
        } catch (error) {
            console.error('Error fetching user orders:', error)
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (orderLimitReached && userDetails?.phoneNumber) {
            const intervalId = setInterval(() => fetchUserOrders(userDetails.phoneNumber), 30000)
            return () => clearInterval(intervalId)
        }
    }, [orderLimitReached, userDetails?.phoneNumber])

    const fetchRestaurantDetails = async (restaurantId: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/restaurant/${restaurantId}`)
            if (response.ok) {
                const data = await response.json()
                if (data && data[0]) setRestaurantDetails(data[0])
            }
        } catch (error) {
            console.error("Error fetching restaurant details:", error)
        }
    }

    const getNextOrderNumber = async (restaurantId: string) => {
        try {
            const today = new Date().toISOString().split('T')[0]
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/orders/next-order-number?restaurantId=${restaurantId}&date=${today}`
            )
            if (!response.ok) throw new Error('Failed to get next order number')
            const data = await response.json()
            return data.orderNumber
        } catch (error) {
            console.error('Error getting next order number:', error)
            return Date.now().toString().slice(-5)
        }
    }

    const subtotal = cartItems.length > 0
        ? cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
        : persistedSubtotal

    const platformFee = platformRate
    const cgstAmount = (subtotal * cgstRate) / 100
    const sgstAmount = (subtotal * sgstRate) / 100
    const total = subtotal + platformFee + cgstAmount + sgstAmount + tipAmount +
        (selectedService === 'home-delivery' ? deliveryCharge : 0)

    const hasGst = restaurantDetails?.gstNumber
    const isCounterPaymentEnabled = userDetails?.isFaculty === true
        ? true
        : restaurantDetails?.counterPaymentEnabled !== false


    const validateUserDetails = () => {
        if (!userDetails || !userDetails.fullname || !userDetails.phoneNumber) {
            alert("Please sign in to continue with your order")
            router.push('/login')
            return false
        }
        return true
    }

    const placeOrder = async (method: 'counter' | 'googlepay') => {
        if (method === 'counter' && !isCounterPaymentEnabled) {
            alert('Counter payment is currently disabled by the restaurant. Please use online payment.')
            return null
        }
        if (orderLimitReached && method === 'counter') {
            alert(`You've reached the maximum number of incomplete orders. Please use online payment or wait.`)
            return null
        }
        if (!validateUserDetails()) return null

        const userId = userDetails?.fullname
        const phonenumber = userDetails?.phoneNumber

        if (!restaurantId) {
            alert('Restaurant ID not found. Please try again.')
            return null
        }

        try {
            const sequentialNumber = await getNextOrderNumber(restaurantId)
            const generatedOrderNumber = `ORD-${restaurantId}-${sequentialNumber}`
            setOrderNumber(generatedOrderNumber)

            const itemsToOrder = cartItems.length > 0 ? cartItems : persistedCartItems
            const orderItems = itemsToOrder.map(({ image, ...item }) => item)

            const orderDetails = {
                orderNumber: generatedOrderNumber,
                items: orderItems,
                subtotal,
                platformFee,
                cgstRate: hasGst ? cgstRate : 0,
                cgstAmount: hasGst ? cgstAmount : 0,
                sgstRate: hasGst ? sgstRate : 0,
                sgstAmount: hasGst ? sgstAmount : 0,
                deliveryCharge: selectedService === 'home-delivery' ? deliveryCharge : 0,
                deliveryDistance: selectedService === 'home-delivery' ? deliveryDistance : 0,
                total,
                tipAmount,
                tableNumber: selectedService === 'dine-in' ? tableNumber : null,
                deliveryAddress: selectedService === 'home-delivery' ? deliveryAddress : null,
                roomNumber: selectedService === 'room-service' ? roomNumber : null,
                serviceType: selectedService,
                paymentMethod: method,
                paid: false,
                userId,
                restaurantId,
                phonenumber,
                orderStatus: method === "counter" ? 'Notcomplete' : 'Cancelled',
                gstNumber: restaurantDetails?.gstNumber || null,
                googlePlaceId: restaurantDetails?.googlePlaceId || null,
                orderDate: new Date().toISOString(),
                isFaculty: method === 'counter' && userDetails?.isFaculty === true   // ← add this
            }

            const encryptedData = encrypt(orderDetails)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: encryptedData }),
            })

            if (!response.ok) throw new Error('Failed to place order')
            const savedOrder = await response.json()
            setOrderId(savedOrder.data._id)

            if (method === 'counter') {
                setOrderPlaced(true)
                clearCartAfterPayment()
                clearPaymentStorage()
            }
            if (phonenumber) fetchUserOrders(phonenumber)

            return savedOrder.data._id
        } catch (error) {
            console.error('Error placing order:', error)
            alert('Failed to place order. Please try again.')
            return null
        }
    }

    const handleCounterPayment = async () => {
        if (!validateUserDetails()) return
        if (!isCounterPaymentEnabled) {
            alert('Counter payment is currently disabled by the restaurant. Please use online payment.')
            return
        }
        if (orderLimitReached) {
            alert(`You've reached the maximum number of incomplete orders. Please use online payment.`)
            return
        }
        setIsProcessing(true)
        try {
            await placeOrder('counter')
        } catch (error) {
            console.error('Error processing counter payment:', error)
            alert('Failed to process payment. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    // Detects iOS/iPadOS (including iPadOS 13+, which reports as "MacIntel" but has touch support)
    const isIOSDevice = () => {
        if (typeof window === 'undefined') return false
        const ua = window.navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
        const isIPadOS13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
        return isIOS || isIPadOS13Plus
    }

    // Extracts pa/pn/am/tr/tn/cu params from the generic upi:// intent URL
    // returned by Omniware, so we can rebuild an app-specific deep link.
    const parseUpiParams = (upiUrl: string) => {
        try {
            const queryString = upiUrl.split('?')[1] || ''
            const params = new URLSearchParams(queryString)
            return {
                pa: params.get('pa') || '',
                pn: params.get('pn') || '',
                am: params.get('am') || '',
                tr: params.get('tr') || '',
                tn: params.get('tn') || '',
                cu: params.get('cu') || 'INR',
            }
        } catch (e) {
            console.error('Error parsing UPI params:', e)
            return null
        }
    }

    // iOS custom URL schemes per app — each app registers its own scheme
    // instead of relying on a shared upi:// handler like Android does.
    const buildIOSDeepLink = (appKey: string, upiUrl: string): { deepLink: string; storeUrl: string } | null => {
        const p = parseUpiParams(upiUrl)
        if (!p) return null

        const qs = `pa=${encodeURIComponent(p.pa)}&pn=${encodeURIComponent(p.pn)}&am=${encodeURIComponent(p.am)}&tr=${encodeURIComponent(p.tr)}&tn=${encodeURIComponent(p.tn)}&cu=${encodeURIComponent(p.cu)}`

        switch (appKey) {
            case 'gpay':
                return {
                    deepLink: `gpay://upi/pay?${qs}`,
                    storeUrl: 'https://apps.apple.com/app/google-pay/id1193357041',
                }
            case 'phonepe':
                return {
                    deepLink: `phonepe://pay?${qs}`,
                    storeUrl: 'https://apps.apple.com/app/phonepe/id1170055821',
                }
            case 'paytm':
                return {
                    deepLink: `paytmmp://pay?${qs}`,
                    storeUrl: 'https://apps.apple.com/app/paytm/id473941634',
                }
            case 'bhim':
                return {
                    deepLink: `bhim://pay?${qs}`,
                    storeUrl: 'https://apps.apple.com/app/bhim/id1200315162',
                }
            default:
                return null
        }
    }

    const handleUpiIntentPayment = async () => {
        if (!validateUserDetails()) return

        setIsFetchingUpiIntent(true)

        try {
            const newOrderId = await placeOrder('googlepay')
            if (!newOrderId) {
                setIsFetchingUpiIntent(false)
                return
            }

            setUpiOrderId(newOrderId)

            const payload = {
                orderId: newOrderId,
                amount: total.toFixed(2),
                customerName: userDetails?.fullname || '',
                customerEmail: userDetails?.email || `${userDetails?.phoneNumber}@orderapp.com`,
                customerPhone: userDetails?.phoneNumber || '',
                restaurantId: restaurantId || '',
                udf1: newOrderId,
                udf2: restaurantId || '',
                udf3: selectedService,
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/omniware/create-payment-intent-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Failed to fetch UPI intent URL')
            const intentData = await res.json()

            if (!intentData.upi_intent_url) {
                throw new Error('Invalid UPI intent response from server')
            }
            setUpiIntentUrl(intentData.upi_intent_url)
            setUpiQrCode(intentData.qr_code || null)
            setShowUpiSheet(true)
            setIsFetchingUpiIntent(false)
            // NEW: no automatic polling started here — the check runs when the
            // user returns to this tab (see the visibilitychange effect below)

        } catch (error: any) {
            console.error('Error initiating UPI intent payment:', error)
            setIsFetchingUpiIntent(false)
            alert('Failed to start UPI payment. Please try again.')
        }
    }

    const startUpiPolling = (orderIdToCheck: string) => {
        setUpiPollingActive(true)

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/omniware/check-payment-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: orderIdToCheck, restaurantId }),
                })
                const result = await res.json()

                if (result.success && result.txnStatus === 'SUCCESS') {
                    clearInterval(pollInterval)
                    upiPollIntervalRef.current = null
                    setUpiPollingActive(false)
                    setShowUpiSheet(false)
                    clearCartAfterPayment()
                    clearPaymentStorage()
                    setOrderId(orderIdToCheck)
                    setOrderPlaced(true)
                } else if (result.success && (result.txnStatus === 'FAILED' || result.txnStatus === 'CANCELLED')) {
                    clearInterval(pollInterval)
                    upiPollIntervalRef.current = null
                    setUpiPollingActive(false)
                    setShowUpiSheet(false)
                    setPaymentFailed(true)
                    setPaymentFailedMessage(
                        result.txnStatus === 'CANCELLED'
                            ? 'Payment was cancelled. No amount has been deducted.'
                            : 'Payment was not completed. Please try again.'
                    )
                }
                // PENDING → keep polling silently
            } catch (err) {
                console.error('Error polling UPI payment status:', err)
                // network hiccup — keep polling, don't stop
            }
        }, 3000)

        upiPollIntervalRef.current = pollInterval // NEW: store so it can be cleared externally

        // Safety stop after 5 minutes so this never runs forever if the user abandons the sheet
        upiPollTimeoutRef.current = setTimeout(() => {
            clearInterval(pollInterval)
            upiPollIntervalRef.current = null
            setUpiPollingActive(false)
        }, 5 * 60 * 1000)
    }

    const closeUpiSheet = () => {
        setShowUpiSheet(false)
        setUpiIntentUrl(null)
        setUpiQrCode(null)
        hasLeftAppRef.current = false
    }

    // Android: same approach as iOS — target each app's own custom URL scheme
    // directly via window.location.href, rather than the intent:// URI (which
    // wasn't reliably resolving on-device). Falls back to the Play Store if the
    // app doesn't intercept the navigation within the timeout window.
    const buildAndroidDeepLink = (appKey: string, upiUrl: string): { deepLink: string; storeUrl: string } | null => {
        const p = parseUpiParams(upiUrl)
        if (!p) return null

        const qs = `pa=${encodeURIComponent(p.pa)}&pn=${encodeURIComponent(p.pn)}&am=${encodeURIComponent(p.am)}&tr=${encodeURIComponent(p.tr)}&tn=${encodeURIComponent(p.tn)}&cu=${encodeURIComponent(p.cu)}`

        switch (appKey) {
            case 'gpay':
                return {
                    deepLink: `tez://upi/pay?${qs}`,
                    storeUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
                }
            case 'phonepe':
                return {
                    deepLink: `phonepe://pay?${qs}`,
                    storeUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
                }
            case 'paytm':
                return {
                    deepLink: `paytmmp://pay?${qs}`,
                    storeUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
                }
            case 'bhim':
                return {
                    deepLink: `bhim://pay?${qs}`,
                    storeUrl: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp',
                }
            default:
                return null
        }
    }

    // Detects Android (vs iOS, desktop, etc.)
    const isAndroidDevice = () => {
        if (typeof window === 'undefined') return false
        return /Android/i.test(window.navigator.userAgent)
    }

    const launchUpiApp = (appKey?: string) => {
        if (!upiIntentUrl) return

        hasLeftAppRef.current = true // mark that we're sending the user away — triggers a check on return

        if (isIOSDevice() && appKey) {
            const target = buildIOSDeepLink(appKey, upiIntentUrl)
            if (!target) {
                alert('This app is not supported for direct UPI payment on this device.')
                return
            }

            let didHide = false
            const handleVisibilityChange = () => {
                if (document.hidden) didHide = true
            }
            document.addEventListener('visibilitychange', handleVisibilityChange)

            window.location.href = target.deepLink

            setTimeout(() => {
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                if (!didHide) {
                    window.location.href = target.storeUrl
                }
            }, 1500)
        } else if (isAndroidDevice() && appKey) {
            // Same pattern as iOS: custom scheme + visibility-timeout fallback,
            // instead of the intent:// URI approach that wasn't working.
            const target = buildAndroidDeepLink(appKey, upiIntentUrl)
            if (!target) {
                alert('This app is not supported for direct UPI payment on this device.')
                return
            }

            let didHide = false
            const handleVisibilityChange = () => {
                if (document.hidden) didHide = true
            }
            document.addEventListener('visibilitychange', handleVisibilityChange)

            window.location.href = target.deepLink

            setTimeout(() => {
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                if (!didHide) {
                    window.location.href = target.storeUrl
                }
            }, 1500)
        } else {
            // No specific app chosen — generic "Open UPI App" button, OS chooser is correct here.
            window.location.href = upiIntentUrl
        }
    }

    // Checks payment status exactly once. Called when the user returns to
    // this tab after launching their UPI app (rather than polling continuously
    // while they're away in the other app).
    const checkUpiPaymentStatus = async (orderIdToCheck: string) => {
        setIsCheckingUpiPayment(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/omniware/check-payment-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderIdToCheck, restaurantId }),
            })
            const result = await res.json()

            if (result.success && result.txnStatus === 'SUCCESS') {
                // NEW: persist the paid status to the order before showing success —
                // previously this only updated local UI state, so the order stayed
                // paid: false in the database until the order-status page happened
                // to run its own check later.
                try {
                    const updateResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderIdToCheck}`,
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

                    if (!updateResponse.ok) {
                        const updateError = await updateResponse.json()
                        console.error('Failed to update order after successful payment:', updateError)
                        // Don't block the success screen on this — payment did succeed;
                        // the order-status page's own check will retry the update on load.
                    }
                } catch (updateErr) {
                    console.error('Error updating order after successful payment:', updateErr)
                }

                setShowUpiSheet(false)
                clearCartAfterPayment()
                clearPaymentStorage()
                setOrderId(orderIdToCheck)
                setOrderPlaced(true)
                return true
            } else if (result.success && (result.txnStatus === 'FAILED' || result.txnStatus === 'CANCELLED')) {
                setShowUpiSheet(false)
                setPaymentFailed(true)
                setPaymentFailedMessage(
                    result.txnStatus === 'CANCELLED'
                        ? 'Payment was cancelled. No amount has been deducted.'
                        : 'Payment was not completed. Please try again.'
                )
                return true
            }
            // PENDING — sheet stays open, user can retry via the button or re-open their UPI app
            return false
        } catch (err) {
            console.error('Error checking UPI payment status:', err)
            return false
        } finally {
            setIsCheckingUpiPayment(false)
        }
    }

    const handleOmniwarePayment = async () => {
        if (!validateUserDetails()) return

        setIsProcessing(true)

        try {
            // 1. Place order (status = Cancelled until Omniware confirms via return_url)
            const newOrderId = await placeOrder('googlepay')
            if (!newOrderId) {
                setIsProcessing(false)
                return
            }

            // 2. Ask backend to compute SHA-512 hash and return all form fields
            const payload = {
                orderId: newOrderId,
                amount: total.toFixed(2),
                customerName: userDetails?.fullname || '',
                customerEmail: userDetails?.email || `${userDetails?.phoneNumber}@orderapp.com`,
                customerPhone: userDetails?.phoneNumber || '',
                restaurantId: restaurantId || '',
                udf1: newOrderId,
                udf2: restaurantId || '',
                udf3: selectedService,
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/omniware/create-payment-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Failed to create Omniware payment request')
            const omniwareData = await res.json()

            if (!omniwareData.hash || !omniwareData.api_key) {
                throw new Error('Invalid Omniware response from server')
            }

            // 3. Build and auto-submit hidden form — browser navigates away immediately
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = omniwareData.gatewayUrl

            const fields: Record<string, string> = {
                api_key: omniwareData.api_key,
                order_id: omniwareData.order_id,
                mode: omniwareData.mode || 'LIVE',
                amount: omniwareData.amount,
                currency: omniwareData.currency || 'INR',
                description: omniwareData.description,
                name: omniwareData.name,
                email: omniwareData.email,
                phone: omniwareData.phone,
                city: omniwareData.city || 'Unknown',
                country: omniwareData.country || 'IND',
                zip_code: omniwareData.zip_code || '000000',
                return_url: omniwareData.return_url,
                return_url_failure: omniwareData.return_url_failure,
                return_url_cancel: omniwareData.return_url_cancel,
                udf1: omniwareData.udf1 || '',
                udf2: omniwareData.udf2 || '',
                udf3: omniwareData.udf3 || '',
                hash: omniwareData.hash,
            }

            Object.entries(fields).forEach(([key, value]) => {
                if (!value) return
                const input = document.createElement('input')
                input.type = 'hidden'
                input.name = key
                input.value = value
                form.appendChild(input)
            })

            document.body.appendChild(form)
            form.submit()

        } catch (error: any) {
            console.error('Error initiating Omniware payment:', error)
            setIsProcessing(false)
            alert('Failed to initiate payment. Please try again.')
        }
    }

    const clearPaymentStorage = () => {
        localStorage.removeItem('paymentSubtotal')
        localStorage.removeItem('paymentCartItems')
        localStorage.removeItem('tipAmount')
        localStorage.removeItem('cgstRate')
        localStorage.removeItem('sgstRate')
        localStorage.removeItem('platformRate')
        localStorage.removeItem('selectedService')
        localStorage.removeItem('deliveryAddress')
        localStorage.removeItem('deliveryCharge')
        localStorage.removeItem('deliveryDistance')
        localStorage.removeItem('selectedRoomNumber')
    }

    // ── Loading ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className={cn(
                "min-h-screen flex items-center justify-center",
                "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            )}>
                <PulseLoader color="#FF385C" />
            </div>
        )
    }
    // ── Payment Failed modal ───────────────────────────────────────────────
    if (paymentFailed) {
        return (
            <div className={cn(
                "min-h-screen p-4",
                "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
            )}>
                <div className="max-w-md mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center text-red-600 dark:text-red-400">
                                Payment Failed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                                    {paymentFailedMessage}
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Your order has not been confirmed. No amount has been deducted.
                                </p>
                            </div>
                            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Order Amount</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {currency}{total.toFixed(2)}
                                </p>
                            </div>
                            <div className="space-y-3">
                                <Button
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        setPaymentFailed(false)
                                        setPaymentFailedMessage('')
                                        setPaymentMethod('googlepay')
                                    }}
                                >
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`/restaurant/${restaurantId}`)}
                                >
                                    Return to Menu
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // ── Order Success screen ───────────────────────────────────────────────
    if (orderPlaced) {
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
                            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">Your order has been placed successfully.</p>
                            <p className="text-sm text-zinc-500">Order Number: {orderNumber}</p>

                            {selectedService === 'home-delivery' && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Home Delivery</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">To: {deliveryAddress}</p>
                                    {deliveryDistance > 0 && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            Distance: {deliveryDistance.toFixed(1)} km
                                            {deliveryCharge > 0 ? ` • Delivery: ${currency}${deliveryCharge.toFixed(2)}` : ' • Free Delivery'}
                                        </p>
                                    )}
                                </div>
                            )}
                            {selectedService === 'dine-in' && tableNumber && (
                                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                                        Dine In - Table {tableNumber}
                                    </p>
                                </div>
                            )}
                            {selectedService === 'room-service' && roomNumber && (
                                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                        Room Service - Room {roomNumber}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => router.push(`/restaurant/${restaurantId}`)}>
                                Return to Menu
                            </Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => router.push(`/order-status/${orderId}`)}>
                                Track Order
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── Main checkout page ─────────────────────────────────────────────────
    return (
        <div className={cn(
            "min-h-screen p-4",
            "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
        )}>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">Checkout</h1>
                </div>
                <Image
                    src="/logo.png"
                    alt="Oder Logo"
                    width={120}
                    height={40}
                    className="h-11 w-auto"
                />
            </div>

            <div className="max-w-md mx-auto space-y-6">
                {/* Incomplete Orders Summary */}
                {incompleteOrders.length > 0 && isCounterPaymentEnabled && (
                    <Card>
                        <CardHeader><CardTitle>Your Pending Orders</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                                You have {incompleteOrders.length} pending {incompleteOrders.length === 1 ? 'order' : 'orders'}.
                                {incompleteOrders.length >= 2 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                        {" "}Having 3 or more pending orders will temporarily restrict new counter orders.
                                    </span>
                                )}
                            </p>
                            <Button variant="outline" className="w-full" onClick={() => router.push('/orders')}>
                                View Your Orders
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Payment Methods */}
                <Card>
                    <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
                    <CardContent className="space-y-3">

                        {/* Counter Payment */}
                        {/* Counter Payment / Credit Payment */}
                        {isCounterPaymentEnabled && (
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start h-14 relative",
                                    (selectedService !== 'dine-in' || orderLimitReached || (!userDetails?.isFaculty && restaurantDetails?.counterPaymentEnabled === false)) && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                    if (selectedService === 'dine-in' && !orderLimitReached) {
                                        setPaymentMethod('counter')
                                    }
                                }}
                                disabled={selectedService !== 'dine-in' || orderLimitReached}
                            >
                                <Wallet className="h-5 w-5 mr-2" />
                                <div className="flex flex-col items-start">
                                    <span>{userDetails?.isFaculty ? 'Credit Payment' : 'Pay at Counter'}</span>
                                    {selectedService === 'home-delivery' && <span className="text-xs text-zinc-500">Not available for delivery</span>}
                                    {selectedService === 'room-service' && <span className="text-xs text-zinc-500">Not available for room service</span>}
                                    {orderLimitReached && selectedService === 'dine-in' && <span className="text-xs text-zinc-500">Use online payment — order limit reached</span>}
                                </div>
                                {paymentMethod === 'counter' && (
                                    <div className="absolute right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </Button>
                        )}
                        {/* Omniware / Online Payment */}
                        <Button
                            variant="outline"
                            className="w-full justify-start h-14 relative"
                            onClick={() => setPaymentMethod('googlepay')}
                        >
                            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                            <div className="flex flex-col items-start">
                                <span>Pay Online</span>
                                <span className="text-xs text-zinc-500">Credit / Debit Card, Net Banking, UPI, Wallets</span>
                            </div>
                            {paymentMethod === 'googlepay' && (
                                <div className="absolute right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                </div>
                            )}
                        </Button>
                        {/* NEW: Fast UPI Intent Payment */}
                        <Button
                            variant="outline"
                            className="w-full justify-start h-14 relative border-green-200 dark:border-green-800"
                            onClick={handleUpiIntentPayment}
                            disabled={isFetchingUpiIntent}
                        >
                            <Smartphone className="h-5 w-5 mr-2 text-green-600" />
                            <div className="flex flex-col items-start">
                                <span>Pay with UPI App</span>
                                <span className="text-xs text-zinc-500">Fastest — GPay, PhonePe, Paytm & more</span>
                            </div>
                            {isFetchingUpiIntent && (
                                <div className="absolute right-3 w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                {paymentMethod === 'counter' && selectedService === 'dine-in' && (
                    <Button
                        className="w-full h-12 bg-green-600 hover:bg-green-700"
                        disabled={isProcessing || orderLimitReached}
                        onClick={handleCounterPayment}
                    >
                        {isProcessing ? 'Processing...' :
                            orderLimitReached ? 'Use Online Payment — Order Limit Reached' :
                                userDetails?.isFaculty ? 'Confirm Credit Payment' : 'Place Order'}
                    </Button>
                )}

                {paymentMethod === 'googlepay' && (
                    <Button
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                        disabled={isProcessing}
                        onClick={handleOmniwarePayment}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing...' : `Pay ${currency}${total.toFixed(2)} Online`}
                    </Button>
                )}

                {/* Service Type Display */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {selectedService === 'dine-in' ? (
                                <><Utensils className="h-5 w-5 text-orange-600" /><span>Dine In Service</span></>
                            ) : selectedService === 'home-delivery' ? (
                                <><Truck className="h-5 w-5 text-blue-600" /><span>Home Delivery Service</span></>
                            ) : (
                                <><BedDouble className="h-5 w-5 text-purple-600" /><span>Room Service</span></>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedService === 'dine-in' && tableNumber && (
                            <p className="text-zinc-600 dark:text-zinc-400">Table Number: {tableNumber}</p>
                        )}
                        {selectedService === 'home-delivery' && deliveryAddress && (
                            <div className="space-y-2">
                                <p className="text-zinc-600 dark:text-zinc-400">Delivery Address: {deliveryAddress}</p>
                                {deliveryDistance > 0 && (
                                    <div className="text-sm text-zinc-500">
                                        <p>Distance: {deliveryDistance.toFixed(1)} km</p>
                                        <p>Delivery Charge: {deliveryCharge > 0 ? `${currency}${deliveryCharge.toFixed(2)}` : 'Free'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedService === 'room-service' && roomNumber && (
                            <p className="text-zinc-600 dark:text-zinc-400">Room Number: {roomNumber}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Cancellation Policy */}
                <Card>
                    <CardHeader><CardTitle>Store Cancellation Policy</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-start">
                            <Clock className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 mt-0.5" />
                            <p className="text-zinc-600 dark:text-zinc-400">Once the order is accepted you cannot cancel it.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Store Info */}
                <Card>
                    <CardHeader><CardTitle>Store Info</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start">
                            <MapPin className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 mt-0.5" />
                            <p className="text-zinc-600 dark:text-zinc-400">
                                {restaurantDetails?.address || "Restaurant address"}
                            </p>
                        </div>
                        <div className="flex items-start">
                            <Phone className="h-5 w-5 text-green-600 dark:text-green-500 mr-3 mt-0.5" />
                            <p className="text-zinc-600 dark:text-zinc-400">
                                {restaurantDetails?.phoneNumber || "0564809100"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* NEW: UPI App Bottom Sheet */}
            {showUpiSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeUpiSheet}
                    />

                    {/* Sheet */}
                    <div className={cn(
                        "relative w-full max-w-md rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300",
                        "bg-white dark:bg-zinc-900"
                    )}>
                        <div className="flex justify-center mb-3">
                            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold">Complete Payment</h3>
                                <p className="text-sm text-zinc-500">{currency}{total.toFixed(2)}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeUpiSheet}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {upiPollingActive && (
                            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Waiting for payment confirmation...
                                </p>
                            </div>
                        )}

                        {isCheckingUpiPayment && (
                            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Checking payment status...
                                </p>
                            </div>
                        )}

                        {/* Quick-launch UPI apps — on iOS these use each app's own custom
                            URL scheme; on Android they all use the same upi:// intent URL,
                            which the OS resolves via its intent chooser */}
                        <div className="grid grid-cols-4 gap-3 mb-5">
                            {[
                                { key: 'gpay', name: 'GPay', icon: '/googlepay.png', bg: 'bg-white', border: true },
                                { key: 'phonepe', name: 'PhonePe', icon: '/phonepay.png', bg: 'bg-white', border: true },
                                { key: 'paytm', name: 'Paytm', icon: '/paytm.png', bg: 'bg-white', border: true },
                                { key: 'bhim', name: 'BHIM', icon: '/bhim.png', bg: 'bg-white', border: true },
                            ].map((app) => (
                                <button
                                    key={app.key}
                                    onClick={() => launchUpiApp(app.key)}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden p-2",
                                        app.bg,
                                        app.border && "border border-zinc-200"
                                    )}>
                                        <Image
                                            src={app.icon}
                                            alt={app.name}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{app.name}</span>
                                </button>
                            ))}
                        </div>

                        <Button
                            className="w-full h-12 bg-green-600 hover:bg-green-700 mb-3"
                            onClick={() => launchUpiApp()}
                        >
                            <Smartphone className="h-4 w-4 mr-2" />
                            Open other UPI App
                        </Button>

                        {/* NEW: Manual fallback in case the automatic return-check doesn't fire */}
                        {upiOrderId && (
                            <Button
                                variant="outline"
                                className="w-full h-10 mb-3"
                                onClick={() => checkUpiPaymentStatus(upiOrderId)}
                                disabled={isCheckingUpiPayment}
                            >
                                {isCheckingUpiPayment ? 'Checking...' : "I've completed the payment"}
                            </Button>
                        )}

                        {upiQrCode && (
                            <div className="text-center pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 mb-2 flex items-center justify-center gap-1">
                                    <QrCode className="h-3.5 w-3.5" /> Or scan with any UPI app
                                </p>
                                <img
                                    src={upiQrCode}
                                    alt="UPI QR Code"
                                    className="w-40 h-40 mx-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}