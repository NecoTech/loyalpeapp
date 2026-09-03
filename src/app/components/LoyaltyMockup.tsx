'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { X, CreditCard, Store, Delete, ArrowRight, User, Home, Gift, Check, QrCode, Smartphone, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useAuth } from '../context/AuthContext'
import Image from "next/image"

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type RestaurantDetails = {
    id: string
    name: string
}

type LoyaltyRewardItem = {
    id: string
    stampsRequired: number
    rewardType: 'discount' | 'freeItem'
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

type PaymentResult = {
    amount: number
    discountAmount: number
    finalAmount: number
    freeItemName?: string
    discountLabel?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

function formatCurrency(value: number) {
    return `₹${value.toFixed(2)}`
}

function discountLabel(item: LoyaltyRewardItem) {
    if (item.rewardType !== 'discount') return ''
    return item.discountType === 'flat'
        ? `${formatCurrency(item.discountValue || 0)} off`
        : `${item.discountValue || 0}% off`
}

export default function LoyaltyMockup({ restaurantId }: { restaurantId: string }) {
    const router = useRouter()
    const { user, login } = useAuth()
    const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
    const [amount, setAmount] = useState('0')
    const [loyaltyCardId, setLoyaltyCardId] = useState<string | null>(null)
    const [activeItem, setActiveItem] = useState<LoyaltyRewardItem | null>(null)
    const [isPaying, setIsPaying] = useState(false)
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

    // ── Omniware UPI intent payment state ───────────────────────────────
    const [isFetchingUpiIntent, setIsFetchingUpiIntent] = useState(false)
    const [showUpiSheet, setShowUpiSheet] = useState(false)
    const [upiIntentUrl, setUpiIntentUrl] = useState<string | null>(null)
    const [upiQrCode, setUpiQrCode] = useState<string | null>(null)
    const [upiReferenceId, setUpiReferenceId] = useState<string | null>(null)
    const [isCheckingUpiPayment, setIsCheckingUpiPayment] = useState(false)
    const [paymentFailed, setPaymentFailed] = useState(false)
    const [paymentFailedMessage, setPaymentFailedMessage] = useState('')
    const hasLeftAppRef = useRef(false)
    const lastHiddenAtRef = useRef<number | null>(null)
    const [showPhonePrompt, setShowPhonePrompt] = useState(false)
    const [phoneInput, setPhoneInput] = useState('')
    const [phoneError, setPhoneError] = useState('')
    // ── end Omniware UPI intent state ───────────────────────────────────

    const loyaltyBtnRef = useRef<HTMLButtonElement>(null)
    const amountRef = useRef<HTMLDivElement>(null)
    const payButtonRef = useRef<HTMLButtonElement>(null)
    const [slideDistance, setSlideDistance] = useState(130)

    const requireAuth = (redirectPath: string) => {
        if (user) return true
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`)
        return false
    }

    useEffect(() => {
        const fetchRestaurant = async () => {
            try {
                const res = await fetch(`/api/restaurant/${restaurantId}`)
                if (!res.ok) return
                const data = await res.json()
                if (!data.success || !data.restaurant) return

                setRestaurant(data.restaurant)
            } catch (err) {
                console.error('Failed to load restaurant details', err)
            }
        }
        if (restaurantId) fetchRestaurant()
    }, [restaurantId])

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!restaurantId || !userId) {
            setLoyaltyCardId(null)
            setActiveItem(null)
            return
        }

        const fetchActiveReward = async () => {
            try {
                const res = await fetch(`/api/loyalty/active-reward?restaurantId=${restaurantId}&userId=${encodeURIComponent(userId)}`)
                const data = await res.json()
                if (!data.success) return
                setLoyaltyCardId(data.card?.id ?? null)
                setActiveItem(data.activeItem)
            } catch (err) {
                console.error('Failed to load active loyalty reward', err)
            }
        }
        fetchActiveReward()
    }, [restaurantId, user?.email, user?.phoneNumber])

    useEffect(() => {
        const timer = setTimeout(createParticles, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Measures the Pay button's width so the sliding arrow glides to its
    // exact center rather than a hardcoded distance.
    useEffect(() => {
        const calculateDistance = () => {
            if (payButtonRef.current) {
                const btnWidth = payButtonRef.current.offsetWidth
                setSlideDistance(Math.max(80, Math.floor(btnWidth / 2 - 57)))
            }
        }
        calculateDistance()
        window.addEventListener('resize', calculateDistance)
        return () => window.removeEventListener('resize', calculateDistance)
    }, [])

    const appendNumber = (num: string) => {
        setAmount(prev => {
            if (prev === '0' && num !== '.') return num
            if (num === '.' && prev.includes('.')) return prev
            if (prev.length < 8) return prev + num
            return prev
        })
    }

    const deleteNumber = () => {
        setAmount(prev => {
            const next = prev.slice(0, -1)
            return next === '' ? '0' : next
        })
    }

    const createParticles = () => {
        const source = loyaltyBtnRef.current
        const target = amountRef.current
        if (!source || !target) return

        const sourceRect = source.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()

        for (let i = 0; i < 8; i++) {
            createParticle(sourceRect, targetRect, i)
        }
    }

    const createParticle = (sourceRect: DOMRect, targetRect: DOMRect, index: number) => {
        const particle = document.createElement('div')
        particle.className = 'loyalty-particle'
        document.body.appendChild(particle)

        const startX = sourceRect.left + sourceRect.width / 2
        const startY = sourceRect.top + sourceRect.height / 2
        const endX = targetRect.left + targetRect.width / 2
        const endY = targetRect.top + targetRect.height / 2

        particle.style.left = `${startX}px`
        particle.style.top = `${startY}px`

        const txStart = (Math.random() - 0.5) * 60
        const tyStart = (Math.random() - 0.5) * 60 - 20
        const txEnd = (endX - startX) + (Math.random() - 0.5) * 40
        const tyEnd = (endY - startY) + (Math.random() - 0.5) * 20

        particle.style.setProperty('--tx-start', `${txStart}px`)
        particle.style.setProperty('--ty-start', `${tyStart}px`)
        particle.style.setProperty('--tx-end', `${txEnd}px`)
        particle.style.setProperty('--ty-end', `${tyEnd}px`)

        const delay = index * 100 + Math.random() * 50
        const duration = 1200 + Math.random() * 400
        particle.style.animation = `flyToAmount ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms forwards`

        setTimeout(() => particle.remove(), delay + duration)
    }

    const numericAmount = parseFloat(amount) || 0
    let discountAmount = 0
    if (activeItem?.rewardType === 'discount') {
        if (activeItem.discountType === 'flat') {
            discountAmount = Math.min(activeItem.discountValue || 0, numericAmount)
        } else {
            const rawDiscount = numericAmount * (activeItem.discountValue || 0) / 100
            discountAmount = Math.round(rawDiscount * 100) / 100
        }
    }
    const finalAmount = Math.max(numericAmount - discountAmount, 0)

    // Records the redemption/transaction in our own system once Omniware has
    // actually confirmed the money was received.
    const finalizePayment = async () => {
        const userId = user?.email || user?.phoneNumber
        if (!userId) return

        const redeemedItem = activeItem

        setIsPaying(true)
        try {
            const res = await fetch('/api/loyalty/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    restaurantId,
                    cardId: loyaltyCardId || undefined,
                    itemId: redeemedItem?.id,
                    amount: numericAmount,
                }),
            })
            const data = await res.json()
            if (!data.success) {
                console.error('Payment failed:', data.error)
                return
            }

            setPaymentResult({
                ...data.transaction,
                discountLabel: redeemedItem?.rewardType === 'discount' ? discountLabel(redeemedItem) : undefined,
            })
            setLoyaltyCardId(data.nextCard?.id ?? null)
            setActiveItem(data.nextActiveItem)
            setAmount('0')
        } catch (err) {
            console.error('Failed to process payment', err)
        } finally {
            setIsPaying(false)
        }
    }

    // ── Omniware UPI intent helpers ─────────────────────────────────────
    const isIOSDevice = () => {
        if (typeof window === 'undefined') return false
        const ua = window.navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
        const isIPadOS13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
        return isIOS || isIPadOS13Plus
    }

    const isAndroidDevice = () => {
        if (typeof window === 'undefined') return false
        return /Android/i.test(window.navigator.userAgent)
    }

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

    const buildIOSDeepLink = (appKey: string, upiUrl: string): { deepLink: string; storeUrl: string } | null => {
        const p = parseUpiParams(upiUrl)
        if (!p) return null
        const qs = `pa=${encodeURIComponent(p.pa)}&pn=${encodeURIComponent(p.pn)}&am=${encodeURIComponent(p.am)}&tr=${encodeURIComponent(p.tr)}&tn=${encodeURIComponent(p.tn)}&cu=${encodeURIComponent(p.cu)}`
        switch (appKey) {
            case 'gpay':
                return { deepLink: `gpay://upi/pay?${qs}`, storeUrl: 'https://apps.apple.com/app/google-pay/id1193357041' }
            case 'phonepe':
                return { deepLink: `phonepe://pay?${qs}`, storeUrl: 'https://apps.apple.com/app/phonepe/id1170055821' }
            case 'paytm':
                return { deepLink: `paytmmp://pay?${qs}`, storeUrl: 'https://apps.apple.com/app/paytm/id473941634' }
            case 'bhim':
                return { deepLink: `bhim://pay?${qs}`, storeUrl: 'https://apps.apple.com/app/bhim/id1200315162' }
            default:
                return null
        }
    }

    const buildAndroidDeepLink = (appKey: string, upiUrl: string): { deepLink: string; storeUrl: string } | null => {
        const p = parseUpiParams(upiUrl)
        if (!p) return null
        const qs = `pa=${encodeURIComponent(p.pa)}&pn=${encodeURIComponent(p.pn)}&am=${encodeURIComponent(p.am)}&tr=${encodeURIComponent(p.tr)}&tn=${encodeURIComponent(p.tn)}&cu=${encodeURIComponent(p.cu)}`
        switch (appKey) {
            case 'gpay':
                return { deepLink: `tez://upi/pay?${qs}`, storeUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user' }
            case 'phonepe':
                return { deepLink: `phonepe://pay?${qs}`, storeUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app' }
            case 'paytm':
                return { deepLink: `paytmmp://pay?${qs}`, storeUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm' }
            case 'bhim':
                return { deepLink: `bhim://pay?${qs}`, storeUrl: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp' }
            default:
                return null
        }
    }

    const launchUpiApp = (appKey?: string) => {
        if (!upiIntentUrl) return
        hasLeftAppRef.current = true

        const openWithFallback = (target: { deepLink: string; storeUrl: string }) => {
            let didHide = false
            const handleVisibilityChange = () => {
                if (document.hidden) didHide = true
            }
            document.addEventListener('visibilitychange', handleVisibilityChange)
            window.location.href = target.deepLink
            setTimeout(() => {
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                if (!didHide) window.location.href = target.storeUrl
            }, 1500)
        }

        if (isIOSDevice() && appKey) {
            const target = buildIOSDeepLink(appKey, upiIntentUrl)
            if (!target) {
                alert('This app is not supported for direct UPI payment on this device.')
                return
            }
            openWithFallback(target)
        } else if (isAndroidDevice() && appKey) {
            const target = buildAndroidDeepLink(appKey, upiIntentUrl)
            if (!target) {
                alert('This app is not supported for direct UPI payment on this device.')
                return
            }
            openWithFallback(target)
        } else {
            window.location.href = upiIntentUrl
        }
    }

    // Checks payment status once, and finalizes the loyalty redemption on success.
    const checkUpiPaymentStatus = async (referenceId: string) => {
        setIsCheckingUpiPayment(true)
        try {
            const res = await fetch('/api/omniware/check-payment-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: referenceId, restaurantId }),
            })
            const result = await res.json()

            if (result.success && result.txnStatus === 'SUCCESS') {
                setShowUpiSheet(false)
                await finalizePayment()
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
            return false
        } catch (err) {
            console.error('Error checking UPI payment status:', err)
            return false
        } finally {
            setIsCheckingUpiPayment(false)
        }
    }

    const closeUpiSheet = () => {
        setShowUpiSheet(false)
        setUpiIntentUrl(null)
        setUpiQrCode(null)
        hasLeftAppRef.current = false
    }

    const startUpiIntent = async (phoneNumber: string) => {
        setIsFetchingUpiIntent(true)
        try {
            const referenceId = `LOY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            setUpiReferenceId(referenceId)

            const payload = {
                orderId: referenceId,
                amount: finalAmount.toFixed(2),
                customerName: user?.fullname || user?.email || phoneNumber,
                customerEmail: user?.email || `${phoneNumber}@orderapp.com`,
                customerPhone: phoneNumber,
                restaurantId,
                udf1: referenceId,
                udf2: restaurantId,
                udf3: 'loyalty-payment',
            }

            const res = await fetch('/api/omniware/create-payment-intent-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const intentData = await res.json()
            if (!res.ok || !intentData.upi_intent_url) {
                console.error('UPI intent error response:', intentData)
                const detail = intentData.details ? `: ${intentData.details}` : ''
                throw new Error((intentData.error || 'Failed to fetch UPI intent URL') + detail)
            }

            setUpiIntentUrl(intentData.upi_intent_url)
            setUpiQrCode(intentData.qr_code || null)
            setShowUpiSheet(true)
        } catch (err) {
            console.error('Error initiating UPI intent payment:', err)
            setPaymentFailed(true)
            setPaymentFailedMessage(err instanceof Error ? err.message : 'Failed to start UPI payment. Please try again.')
        } finally {
            setIsFetchingUpiIntent(false)
        }
    }

    const handlePayOnline = async () => {
        if (!requireAuth(`/restaurant/${restaurantId}`)) return
        if (numericAmount <= 0) return

        // Omniware requires a phone number — email-registered accounts don't
        // collect one at signup, so ask for it here instead of sending a
        // blank field the gateway will reject.
        if (!user?.phoneNumber) {
            setPhoneError('')
            setShowPhonePrompt(true)
            return
        }

        await startUpiIntent(user.phoneNumber)
    }

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setPhoneError('')

        const indianPhoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/
        if (!indianPhoneRegex.test(phoneInput.trim())) {
            setPhoneError('Enter a valid 10-digit phone number.')
            return
        }
        const normalizedPhone = phoneInput.trim().replace(/^(\+91|0)/, '')

        if (user) {
            login({ ...user, phoneNumber: normalizedPhone })
        }

        setShowPhonePrompt(false)
        setPhoneInput('')
        await startUpiIntent(normalizedPhone)
    }
    // ── end Omniware UPI intent helpers ─────────────────────────────────

    // Detect returning to the tab after launching a UPI app and check status once.
    useEffect(() => {
        if (!showUpiSheet || !upiReferenceId) return

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                lastHiddenAtRef.current = Date.now()
                return
            }
            if (document.visibilityState !== 'visible' || !hasLeftAppRef.current) return

            const hiddenFor = lastHiddenAtRef.current ? Date.now() - lastHiddenAtRef.current : Infinity
            if (hiddenFor < 700) return

            const resolved = await checkUpiPaymentStatus(upiReferenceId)
            if (resolved) hasLeftAppRef.current = false
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showUpiSheet, upiReferenceId])

    const isAmountValid = numericAmount > 0
    const isSliding = isFetchingUpiIntent || isPaying

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] text-[#1b1c18] min-h-screen flex flex-col overflow-hidden max-w-md mx-auto md:shadow-2xl md:my-8 md:rounded-[1.5rem] relative")}>
            {/* Top App Bar */}
            <header className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                    {/* <button
                        aria-label="Back"
                        className="w-10 h-10 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all"
                        onClick={() => router.back()}
                    >
                        <X size={22} />
                    </button> */}
                    <button
                        aria-label="Home"
                        className="w-10 h-10 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all"
                        onClick={() => router.push('/')}
                    >
                        <Home size={22} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        aria-label="Profile"
                        className="w-10 h-10 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all"
                        onClick={() => requireAuth('/profile') && router.push('/profile')}
                    >
                        <User size={22} />
                    </button>
                    <button
                        ref={loyaltyBtnRef}
                        aria-label="Loyalty"
                        className="w-10 h-10 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all"
                        onClick={() => router.push(`/restaurant/${restaurantId}/loyalty`)}
                    >
                        <CreditCard size={22} />
                    </button>
                </div>
            </header>

            {/* Main Content: centered restaurant identity + amount, like a UPI payment screen */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 pt-1 pb-3 z-10 relative overflow-y-auto">
                {/* Centered restaurant identity */}
                <div className="flex flex-col items-center text-center w-full mb-4">
                    <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full overflow-hidden bg-[#ebddff] text-[#4f3d73] flex items-center justify-center shadow-sm mb-2.5 border-2 border-white">
                        <Store size={28} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1b1c18] leading-tight">
                        {restaurant?.name ?? 'Loading...'}
                    </h2>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-center justify-center py-1">
                    <div ref={amountRef} className="flex items-center justify-center relative w-full">
                        <div className={cn(
                            "text-center text-[#1b1c18] w-full max-w-[200px] font-extrabold",
                            amount.length > 5 ? "text-[32px] leading-[38px] tracking-[-0.02em]" : "text-[48px] leading-[52px] tracking-[-0.04em]"
                        )}>
                            <span className="opacity-100 font-bold">₹</span>{amount}
                        </div>
                    </div>

                    {activeItem && numericAmount > 0 && (
                        <div className="mt-4 flex items-center gap-2 bg-[#f5f4ed] rounded-full px-4 py-2 text-sm">
                            {activeItem.rewardType === 'discount' ? (
                                <>
                                    <span className="text-[#1b1c18]">
                                        <span className="font-bold">{discountLabel(activeItem)}</span> applied — pay <span className="font-bold">{formatCurrency(finalAmount)}</span>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Gift size={16} className="text-[#0d6683]" />
                                    <span className="text-[#1b1c18]">
                                        Free item included: <span className="font-bold">{activeItem.freeItemName}</span>
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Sheet / Numpad */}
            <div className="bg-white rounded-t-[36px] px-8 pt-7 pb-8 shadow-[0_-4px_32px_rgba(0,0,0,0.04)] shrink-0 z-20 relative">
                <div className="grid grid-cols-3 gap-y-4 sm:gap-y-5 gap-x-2 mb-6">
                    {KEYS.map(num => (
                        <button
                            key={num}
                            type="button"
                            disabled={isSliding}
                            onClick={() => appendNumber(num)}
                            className={cn(jetbrainsMono.className, "h-12 sm:h-14 flex items-center justify-center text-3xl sm:text-[38px] font-bold text-[#1b1c18] active:scale-90 transition-transform bg-transparent border-0 outline-none leading-none select-none hover:opacity-80 disabled:opacity-50")}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={isSliding}
                        onClick={deleteNumber}
                        aria-label="Backspace"
                        className="h-12 sm:h-14 flex items-center justify-center text-[#1b1c18] active:scale-90 transition-transform bg-transparent border-0 outline-none select-none hover:opacity-80 disabled:opacity-50"
                    >
                        <Delete size={28} />
                    </button>
                </div>

                <div className="relative w-full">
                    <button
                        ref={payButtonRef}
                        type="button"
                        disabled={!isAmountValid || isSliding}
                        onClick={handlePayOnline}
                        className={cn(
                            "w-full h-14 sm:h-16 bg-[#c5f253] hover:bg-[#b8eb44] text-[#151f00] rounded-full relative overflow-hidden flex items-center justify-center shadow-sm select-none transition-all",
                            !isAmountValid ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                            isSliding ? "pointer-events-none" : "active:scale-[0.99]"
                        )}
                    >
                        {/* Track fill that sweeps in while the arrow slides */}
                        <div
                            className="absolute inset-0 bg-[#b2e840] transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] origin-left pointer-events-none"
                            style={{
                                transform: isSliding ? 'scaleX(1)' : 'scaleX(0)',
                                opacity: isSliding ? 1 : 0,
                            }}
                        />

                        <div className="relative z-10 flex items-center justify-center">
                            <span
                                className="text-lg sm:text-xl font-bold text-[#151f00] select-none transition-all duration-300 ease-out"
                                style={{
                                    opacity: isSliding ? 0 : 1,
                                    transform: isSliding ? 'translateX(-16px)' : 'translateX(0)',
                                }}
                            >
                                Pay Online
                            </span>

                            <div
                                className="will-change-transform flex items-center justify-center ml-2.5"
                                style={{
                                    transform: isSliding ? `translate3d(${slideDistance}px, 0, 0)` : 'translate3d(0px, 0, 0)',
                                    transition: 'transform 1050ms cubic-bezier(0.22, 1, 0.36, 1), background-color 400ms ease',
                                }}
                            >
                                <div className={cn(
                                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                    isPaying ? "bg-[#0d6683] text-white scale-110 shadow-lg" : "bg-[#4d6700] text-[#c5f253] shadow-md"
                                )}>
                                    {isPaying ? <Check size={20} /> : <ArrowRight size={20} />}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Omniware UPI Intent Bottom Sheet */}
            {showUpiSheet && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center">
                    <div className="bg-white w-full max-w-md rounded-t-[1.5rem] p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-extrabold text-[#1b1c18]">Complete Payment</h3>
                                <p className="text-sm text-[#70787d]">{formatCurrency(finalAmount)} to {restaurant?.name ?? 'restaurant'}</p>
                            </div>
                            <button onClick={closeUpiSheet} aria-label="Close">
                                <X size={20} className="text-[#70787d]" />
                            </button>
                        </div>

                        {upiQrCode && (
                            <div className="flex justify-center">
                                <img
                                    src={upiQrCode.startsWith('data:') ? upiQrCode : `data:image/png;base64,${upiQrCode}`}
                                    alt="UPI QR code"
                                    className="w-48 h-48 rounded-xl border border-[#e4e2dc]"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { key: 'gpay', name: 'GPay', icon: '/googlepay.png', bg: 'bg-white', border: true },
                                { key: 'phonepe', name: 'PhonePe', icon: '/phonepay.png', bg: 'bg-white', border: true },
                                { key: 'paytm', name: 'Paytm', icon: '/paytm.png', bg: 'bg-white', border: true },
                                { key: 'bhim', name: 'BHIM', icon: '/bhim.png', bg: 'bg-white', border: true },
                            ].map(app => (
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

                        <button
                            onClick={() => launchUpiApp()}
                            className="w-full bg-[#f5f4ed] text-[#1b1c18] font-bold py-3 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <QrCode size={18} />
                            Open UPI App
                        </button>

                        <button
                            onClick={() => upiReferenceId && checkUpiPaymentStatus(upiReferenceId)}
                            disabled={isCheckingUpiPayment}
                            className="w-full bg-[#0d6683] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isCheckingUpiPayment && <Loader2 size={18} className="animate-spin" />}
                            {isCheckingUpiPayment ? 'Checking...' : "I've Completed the Payment"}
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Failed */}
            {paymentFailed && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-[1.5rem] p-6 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-[#1b1c18]">Payment Failed</h3>
                            <p className="text-sm text-[#70787d] mt-1">{paymentFailedMessage}</p>
                        </div>
                        <button
                            onClick={() => { setPaymentFailed(false); setPaymentFailedMessage('') }}
                            className="w-full bg-[#0d6683] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Phone Number Prompt (required for UPI payment) */}
            {showPhonePrompt && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-[1.5rem] p-6 flex flex-col gap-4">
                        <div>
                            <h3 className="text-lg font-extrabold text-[#1b1c18]">Confirm your phone number</h3>
                            <p className="text-sm text-[#70787d] mt-1">UPI payments require a phone number to proceed.</p>
                        </div>
                        <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3">
                            <input
                                type="tel"
                                autoFocus
                                placeholder="Enter your phone number"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                className="bg-[#f5f4ed] rounded-xl px-4 py-3 text-base border-2 border-transparent outline-none focus:border-[#0d6683]"
                            />
                            {phoneError && <p className="text-[#ba1a1a] text-sm">{phoneError}</p>}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowPhonePrompt(false); setPhoneInput(''); setPhoneError('') }}
                                    className="flex-1 px-4 py-3 rounded-full border border-[#e4e2dc] text-[#40484d] font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isFetchingUpiIntent}
                                    className="flex-1 bg-[#0d6683] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                                >
                                    Continue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Confirmation */}
            {paymentResult && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-[1.5rem] p-6 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#c2f050] text-[#4d6700] flex items-center justify-center">
                            <Check size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-[#1b1c18]">Payment Successful</h3>
                            <p className="text-sm text-[#70787d] mt-1">
                                You paid {formatCurrency(paymentResult.finalAmount)}
                                {paymentResult.discountAmount > 0 && (
                                    <>
                                        {' '}({paymentResult.discountLabel ? `${paymentResult.discountLabel} — ` : ''}
                                        {formatCurrency(paymentResult.discountAmount)} saved)
                                    </>
                                )}
                            </p>
                            {paymentResult.freeItemName && (
                                <p className="text-sm font-bold text-[#0d6683] mt-2">
                                    🎁 {paymentResult.freeItemName} redeemed
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setPaymentResult(null)}
                            className="w-full bg-[#0d6683] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .loyalty-particle {
                    position: fixed;
                    width: 12px;
                    height: 12px;
                    background-color: #c8f55c;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #c8f55c, 0 0 20px #c8f55c;
                    pointer-events: none;
                    z-index: 9999;
                    opacity: 0;
                    transform: scale(0);
                }
                @keyframes flyToAmount {
                    0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
                    10% { transform: translate(var(--tx-start), var(--ty-start)) scale(1.2) rotate(45deg); opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translate(var(--tx-end), var(--ty-end)) scale(0.2) rotate(180deg); opacity: 0; }
                }
            `}</style>
        </div>
    )
}
