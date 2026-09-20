'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ArrowLeft, Home, X, CreditCard, Store, Delete, Check, ChevronDown, Gift, QrCode, AlertTriangle, Loader2, BadgeCheck, Star, Sparkles, Cake } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { secureFetch } from '../../../lib/secureFetch'
import { readPendingUpiPayment, writePendingUpiPayment, clearPendingUpiPayment } from '../../../lib/pendingUpiPayment'
import { useAuth } from '../context/AuthContext'
import RestaurantPhoto from './RestaurantPhoto'
import Image from "next/image"

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

type RestaurantDetails = {
    id: string
    name: string
    imageUrl?: string | null
}

type LoyaltyRewardItem = {
    id: string
    stampsRequired: number
    rewardType: 'discount' | 'freeItem'
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

type LoyaltyCard = {
    id: string
    name: string
    items: (LoyaltyRewardItem & { redeemed: boolean })[]
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

function rewardLabel(item: LoyaltyRewardItem) {
    if (item.rewardType === 'discount') return discountLabel(item)
    return item.freeItemName || 'Free item'
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || '?'
}

function formatResultDate(date: Date) {
    const today = new Date()
    const isToday = date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate()
    return isToday ? 'Today' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatResultTime(date: Date) {
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

function isCardCompleted(card: LoyaltyCard) {
    return card.items.length > 0 && card.items.every(item => item.redeemed)
}

// Fully redeemed cards move to the back of the list — the still-in-progress
// card(s) the customer actually needs stay up front. A stable sort keeps
// each group in its original (creation) order.
function orderCardsForDisplay(cards: LoyaltyCard[]) {
    return [...cards].sort((a, b) => Number(isCardCompleted(a)) - Number(isCardCompleted(b)))
}

function ordinal(n: number) {
    const v = n % 100
    if (v >= 11 && v <= 13) return 'th'
    switch (n % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
    }
}

const CARD_THEMES = [
    { bg: '#2e5bff', text: 'text-white', mutedText: 'text-white/70', badge: 'bg-white/20 border-white/30 text-white', checkedText: '#2e5bff' },
    { bg: '#D8B4FE', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#7c3aed' },
    { bg: '#FFDF40', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#a16207' },
    { bg: '#D2F843', text: 'text-zinc-900', mutedText: 'text-zinc-900/60', badge: 'bg-black/10 border-black/20 text-zinc-900', checkedText: '#4d7c0f' },
    { bg: '#FB7185', text: 'text-white', mutedText: 'text-white/70', badge: 'bg-white/20 border-white/30 text-white', checkedText: '#e11d48' },
]

export default function LoyaltyMockup({ restaurantId }: { restaurantId: string }) {
    const router = useRouter()
    const { user, login } = useAuth()
    const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
    const [amount, setAmount] = useState('0')
    const [loyaltyCardId, setLoyaltyCardId] = useState<string | null>(null)
    const [activeItem, setActiveItem] = useState<LoyaltyRewardItem | null>(null)
    const [isPaying, setIsPaying] = useState(false)
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
    const [successCardId, setSuccessCardId] = useState<string | null>(null)
    const [successItemId, setSuccessItemId] = useState<string | null>(null)
    const [successTimestamp, setSuccessTimestamp] = useState<Date | null>(null)
    const [celebrationKey, setCelebrationKey] = useState(0)

    // ── Loyalty cards drawer state ───────────────────────────────────────
    const [allCards, setAllCards] = useState<LoyaltyCard[]>([])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isDrawerVisible, setIsDrawerVisible] = useState(false)
    const [activeDrawerIndex, setActiveDrawerIndex] = useState(0)
    const drawerCarouselRef = useRef<HTMLDivElement>(null)

    // ── Omniware UPI intent payment state ───────────────────────────────
    const [isFetchingUpiIntent, setIsFetchingUpiIntent] = useState(false)
    const [showUpiSheet, setShowUpiSheet] = useState(false)
    const [upiIntentUrl, setUpiIntentUrl] = useState<string | null>(null)
    const [upiQrCode, setUpiQrCode] = useState<string | null>(null)
    const [upiReferenceId, setUpiReferenceId] = useState<string | null>(null)
    const [isCheckingUpiPayment, setIsCheckingUpiPayment] = useState(false)
    // Set only while re-checking a payment restored from localStorage on
    // mount (see the pending-payment effect below) — distinct from
    // isCheckingUpiPayment so the sheet's own "Checking..." button state
    // isn't affected when the sheet was never reopened.
    const [isVerifyingPendingPayment, setIsVerifyingPendingPayment] = useState(false)
    const [paymentFailed, setPaymentFailed] = useState(false)
    const [paymentFailedMessage, setPaymentFailedMessage] = useState('')
    const hasLeftAppRef = useRef(false)
    const lastHiddenAtRef = useRef<number | null>(null)
    // Guards against the visibilitychange listener, the focus listener, and
    // a manual "I've Completed the Payment" tap all racing to check status
    // (and finalize) the same payment at once — without this, two of them
    // landing close together could both see SUCCESS and redeem it twice.
    const isCheckingStatusRef = useRef(false)
    const [showPhonePrompt, setShowPhonePrompt] = useState(false)
    const [phoneInput, setPhoneInput] = useState('')
    const [phoneError, setPhoneError] = useState('')
    // ── end Omniware UPI intent state ───────────────────────────────────

    // No same-origin referrer means there's no in-app page to go back to
    // (direct link, QR scan, bookmark) — send those visitors home instead
    // of letting router.back() leave the app or land on a blank history slot.
    const handleBack = () => {
        const hasInAppReferrer = typeof document !== 'undefined'
            && !!document.referrer
            && document.referrer.startsWith(window.location.origin)
        if (hasInAppReferrer) {
            router.push('/')
        } else {
            router.push('/')
        }
    }

    const requireAuth = (redirectPath: string) => {
        if (user) return true
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`)
        return false
    }

    useEffect(() => {
        const fetchRestaurant = async () => {
            try {
                const { res, data } = await secureFetch(`/api/restaurant/${restaurantId}`)
                if (!res.ok) return
                if (!data?.success || !data.restaurant) return

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
                const { data } = await secureFetch(`/api/loyalty/active-reward?restaurantId=${restaurantId}&userId=${encodeURIComponent(userId)}`)
                if (!data?.success) return
                setLoyaltyCardId(data.card?.id ?? null)
                setActiveItem(data.activeItem)
            } catch (err) {
                console.error('Failed to load active loyalty reward', err)
            }
        }
        fetchActiveReward()
    }, [restaurantId, user?.email, user?.phoneNumber])

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!restaurantId) {
            setAllCards([])
            return
        }

        const fetchCards = async () => {
            try {
                const searchParams = new URLSearchParams({ restaurantId })
                if (userId) searchParams.set('userId', userId)
                const { res, data } = await secureFetch(`/api/loyalty/card-progress?${searchParams.toString()}`)
                if (res.ok && data?.success) {
                    setAllCards((data.cards as LoyaltyCard[]).filter(c => c.items.length > 0))
                }
            } catch (err) {
                console.error('Failed to load loyalty cards', err)
            }
        }
        fetchCards()
    }, [restaurantId, user?.email, user?.phoneNumber])

    const activeCard = allCards.find(c => c.id === loyaltyCardId) || null
    const orderedCards = orderCardsForDisplay(allCards)
    const successCardIndex = allCards.findIndex(c => c.id === successCardId)
    const successCard = successCardIndex >= 0 ? allCards[successCardIndex] : null
    const successTheme = successCard ? CARD_THEMES[successCardIndex % CARD_THEMES.length] : null
    const successUnlockedCount = successCard ? successCard.items.filter(i => i.redeemed).length : 0
    const successTotalCount = successCard ? successCard.items.length : 0
    const successNextReward = successCard ? successCard.items.find(i => !i.redeemed) : undefined

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
    // `override` supplies the userId/amount/card/item to redeem when the
    // live component state can't be trusted — specifically the
    // pending-payment restore path below, where the page just mounted
    // fresh (tab/PWA was closed mid-payment) so `amount`/`activeItem`/
    // `loyaltyCardId` are back at their defaults, and AuthContext may not
    // have finished rehydrating `user` from localStorage yet either.
    const finalizePayment = async (orderId?: string, override?: { userId: string; amount: number; cardId?: string; itemId?: string }) => {
        const userId = override?.userId ?? (user?.email || user?.phoneNumber)
        if (!userId) return

        const redeemedItem = override ? null : activeItem
        const redeemedCardId = override ? (override.cardId ?? null) : loyaltyCardId
        const redeemedItemId = override ? override.itemId : redeemedItem?.id
        const paymentAmount = override?.amount ?? numericAmount

        setIsPaying(true)
        try {
            const { data } = await secureFetch('/api/loyalty/redeem', {
                method: 'POST',
                body: {
                    userId,
                    restaurantId,
                    cardId: redeemedCardId || undefined,
                    itemId: redeemedItemId,
                    amount: paymentAmount,
                    orderId,
                },
            })
            if (!data?.success) {
                console.error('Payment failed:', data.error)
                return
            }

            setPaymentResult({
                ...data.transaction,
                discountLabel: redeemedItem?.rewardType === 'discount' ? discountLabel(redeemedItem) : undefined,
            })
            setSuccessTimestamp(new Date())
            setCelebrationKey(k => k + 1)
            setLoyaltyCardId(data.nextCard?.id ?? null)
            setActiveItem(data.nextActiveItem)
            setAmount('0')

            // Refresh card progress so the success screen shows the card the
            // payment just redeemed from with its up-to-date stamp state.
            if (redeemedCardId) {
                setSuccessCardId(redeemedCardId)
                setSuccessItemId(redeemedItemId ?? null)
                try {
                    const searchParams = new URLSearchParams({ restaurantId, userId })
                    const { res: cardsRes, data: cardsData } = await secureFetch(`/api/loyalty/card-progress?${searchParams.toString()}`)
                    if (cardsRes.ok && cardsData?.success) {
                        setAllCards((cardsData.cards as LoyaltyCard[]).filter(c => c.items.length > 0))
                    }
                } catch (err) {
                    console.error('Failed to refresh loyalty cards after payment', err)
                }
            } else {
                setSuccessCardId(null)
                setSuccessItemId(null)
            }
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

    // Checks payment status once, and finalizes the loyalty redemption on
    // success. `override` is forwarded to finalizePayment — see its comment
    // for why the pending-payment restore path needs it.
    const checkUpiPaymentStatus = async (referenceId: string, override?: { userId: string; amount: number; cardId?: string; itemId?: string }) => {
        if (isCheckingStatusRef.current) return false
        isCheckingStatusRef.current = true
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
                clearPendingUpiPayment(referenceId)
                await finalizePayment(referenceId, override)
                return true
            } else if (result.success && (result.txnStatus === 'FAILED' || result.txnStatus === 'CANCELLED')) {
                setShowUpiSheet(false)
                clearPendingUpiPayment(referenceId)
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
            isCheckingStatusRef.current = false
        }
    }

    const closeUpiSheet = () => {
        setShowUpiSheet(false)
        setUpiIntentUrl(null)
        setUpiQrCode(null)
        hasLeftAppRef.current = false
        if (upiReferenceId) clearPendingUpiPayment(upiReferenceId)
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
            const payerId = user?.email || user?.phoneNumber || phoneNumber
            writePendingUpiPayment({
                referenceId,
                restaurantId,
                startedAt: Date.now(),
                userId: payerId,
                amount: numericAmount,
                finalAmount,
                cardId: loyaltyCardId || undefined,
                itemId: activeItem?.id,
                ...(activeItem?.rewardType === 'discount' ? {
                    discountAmount,
                    discountType: activeItem.discountType,
                    discountValue: activeItem.discountValue,
                } : {}),
                ...(activeItem?.rewardType === 'freeItem' ? {
                    freeItemName: activeItem.freeItemName,
                } : {}),
            })
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

    // Covers the case where the browser tab (or an installed PWA) was fully
    // closed or killed while the UPI app was in the foreground — no
    // visibilitychange event ever fires on return, since this is a fresh
    // mount. If a payment was left pending for this restaurant, check it
    // once on load so a payment made in the UPI app still gets confirmed
    // and shown here without the user having to re-enter the amount.
    useEffect(() => {
        if (!restaurantId) return
        const pending = readPendingUpiPayment()
        if (!pending || pending.restaurantId !== restaurantId) return

        setIsVerifyingPendingPayment(true)
        checkUpiPaymentStatus(pending.referenceId, { userId: pending.userId, amount: pending.amount, cardId: pending.cardId, itemId: pending.itemId })
            .finally(() => setIsVerifyingPendingPayment(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])

    // ── Loyalty cards drawer helpers ─────────────────────────────────────
    const openDrawer = () => {
        setActiveDrawerIndex(0)
        setIsDrawerOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setIsDrawerVisible(true)))
    }

    const closeDrawer = () => {
        setIsDrawerVisible(false)
        setTimeout(() => setIsDrawerOpen(false), 250)
    }

    const scrollToDrawerCard = (index: number) => {
        const container = drawerCarouselRef.current
        if (!container || !container.children[index]) return
        const card = container.children[index] as HTMLElement
        container.scrollTo({ left: card.offsetLeft - container.clientWidth * 0.075, behavior: 'smooth' })
        setActiveDrawerIndex(index)
    }

    useEffect(() => {
        const container = drawerCarouselRef.current
        if (!container || !isDrawerOpen) return
        const onScroll = () => {
            let closest = 0
            let closestDistance = Infinity
            Array.from(container.children).forEach((child, index) => {
                const distance = Math.abs((child as HTMLElement).offsetLeft - container.scrollLeft)
                if (distance < closestDistance) {
                    closestDistance = distance
                    closest = index
                }
            })
            setActiveDrawerIndex(closest)
        }
        container.addEventListener('scroll', onScroll, { passive: true })
        return () => container.removeEventListener('scroll', onScroll)
    }, [isDrawerOpen])
    // ── end loyalty cards drawer helpers ─────────────────────────────────

    const isAmountValid = numericAmount > 0
    const isSliding = isFetchingUpiIntent || isPaying

    return (
        <div className={cn(plusJakartaSans.className, "bg-white text-[#111111] min-h-screen flex flex-col justify-between antialiased relative overflow-x-hidden max-w-md mx-auto")}>
            <div className="w-full flex flex-col justify-between p-4 sm:p-5 pb-7 flex-1 relative">
                {/* Top Bar */}
                <header className="flex items-center justify-between pt-2 pb-1">
                    <button
                        aria-label="Go back"
                        onClick={handleBack}
                        className="w-11 h-11 rounded-2xl bg-white border-2 border-[#111111] keypad-shadow flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-2">
                        {/* <button
                            aria-label="Go to home"
                            onClick={() => router.push('/')}
                            className="w-11 h-11 rounded-2xl bg-white border-2 border-[#111111] keypad-shadow flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer hover:bg-zinc-50"
                        >
                            <Home size={20} strokeWidth={2} />
                        </button> */}
                        <button
                            aria-label="Loyalty passes"
                            onClick={openDrawer}
                            className="w-11 h-11 rounded-2xl bg-white border-2 border-[#111111] keypad-shadow flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none relative cursor-pointer hover:bg-zinc-50"
                        >
                            <CreditCard size={20} strokeWidth={2} />
                            {allCards.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#D2F843] border-2 border-[#111111] rounded-full" />
                            )}
                        </button>
                    </div>
                </header>

                {/* Merchant + Amount */}
                <main className="flex-1 flex flex-col items-center justify-center my-2">
                    <div className="flex flex-col items-center mb-5">
                        <div className="relative mb-3">
                            <div className="w-16 h-16 rounded-2xl bg-[#D8B4FE] border-2 border-[#111111] keypad-shadow flex items-center justify-center overflow-hidden">
                                <RestaurantPhoto
                                    src={restaurant?.imageUrl}
                                    alt={restaurant?.name ?? 'Restaurant'}
                                    className="w-full h-full object-cover"
                                    fallback={<Store size={32} strokeWidth={2} />}
                                />
                            </div>
                            <div aria-label="Loyalty partner" className="absolute -bottom-1 -right-1.5 bg-[#D2F843] border-2 border-[#111111] rounded-full w-5 h-5 flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                            </div>
                        </div>
                        <h1 className="text-xl font-extrabold text-[#111111] tracking-tight">
                            {restaurant?.name ?? 'Loading...'}
                        </h1>

                        {activeCard && (
                            <button
                                onClick={openDrawer}
                                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#111111] rounded-full text-xs font-bold keypad-shadow-sm hover:bg-zinc-50 active:translate-x-px active:translate-y-px transition-all cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-[#D2F843] border border-[#111111]" />
                                <span>
                                    {activeCard.name} ({activeCard.items.filter(i => i.redeemed).length}/{activeCard.items.length} Stamps)
                                </span>
                                <ChevronDown size={12} className="text-zinc-500" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-center w-full px-4">
                        <div className="inline-flex items-center justify-center font-extrabold tracking-tight text-[#111111]">
                            <span className="text-4xl sm:text-5xl mr-1 select-none font-bold">₹</span>
                            <span className="text-5xl sm:text-6xl tracking-tight transition-all">{amount}</span>
                            <span className="payment-cursor w-1 h-10 sm:h-12 bg-[#111111] ml-1.5 rounded-sm" />
                        </div>

                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg border border-dashed border-zinc-400">
                            {activeItem && numericAmount > 0 ? (
                                activeItem.rewardType === 'discount' ? (
                                    <span className="text-emerald-700">
                                        ⚡ {discountLabel(activeItem)} applied — pay {formatCurrency(finalAmount)}
                                    </span>
                                ) : (
                                    <span className="text-emerald-700 flex items-center gap-1">
                                        <Gift size={14} /> Free {activeItem.freeItemName} included
                                    </span>
                                )
                            ) : (
                                <>
                                    <span>🏷️</span> Enter total bill to unlock stamps
                                </>
                            )}
                        </div>
                    </div>
                </main>

                {/* Keypad + Pay */}
                <footer className="w-full flex flex-col gap-4">
                    <section aria-label="Keypad" className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        {KEYS.map(key => (
                            <button
                                key={key}
                                type="button"
                                disabled={isSliding}
                                onClick={() => key === '.' ? appendNumber('.') : appendNumber(key)}
                                className="h-14 sm:h-16 rounded-2xl bg-white border-2 border-[#111111] keypad-shadow flex items-center justify-center text-2xl font-extrabold text-[#111111] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                            >
                                {key === '.' ? '·' : key}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={isSliding}
                            onClick={deleteNumber}
                            aria-label="Backspace"
                            className="h-14 sm:h-16 rounded-2xl bg-zinc-100 border-2 border-[#111111] keypad-shadow flex items-center justify-center text-[#111111] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                        >
                            <Delete size={24} strokeWidth={2.2} />
                        </button>
                    </section>

                    <button
                        type="button"
                        disabled={!isAmountValid || isSliding}
                        onClick={handlePayOnline}
                        className={cn(
                            "w-full py-4 px-6 rounded-2xl bg-[#D2F843] border-[2.5px] border-[#111111] keypad-shadow-lg flex items-center justify-center gap-2 text-[#111111] font-extrabold text-lg transition-all",
                            (!isAmountValid || isSliding) ? "opacity-50 cursor-not-allowed" : "opacity-90 hover:opacity-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                        )}
                    >
                        {isSliding ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span className="tracking-tight">Processing...</span>
                            </>
                        ) : (
                            <span className="tracking-tight">Pay</span>
                        )}
                    </button>
                </footer>
            </div>

            {/* Loyalty Cards & Passes Drawer */}
            {isDrawerOpen && (
                <div
                    className={cn(
                        "fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300",
                        isDrawerVisible ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="absolute inset-0 bg-[#111111]/60 backdrop-blur-sm cursor-pointer" onClick={closeDrawer} />
                    <div
                        className={cn(
                            "relative w-full max-w-md mx-auto bg-white border-t-[3px] border-x-[3px] border-[#111111] rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.25)] flex flex-col max-h-[88vh] z-10 transform transition-transform duration-300 ease-out",
                            isDrawerVisible ? "translate-y-0" : "translate-y-full"
                        )}
                    >
                        <div className="pt-3 px-5 pb-3 border-b-2 border-[#111111]/10">
                            <div className="w-12 h-1.5 bg-[#111111]/30 rounded-full mx-auto mb-3 cursor-pointer" onClick={closeDrawer} />
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full bg-[#D2F843] border border-[#111111]" />
                                    {restaurant?.name ?? 'Restaurant'} Loyalty
                                </span>
                                <button
                                    aria-label="Close passes drawer"
                                    onClick={closeDrawer}
                                    className="w-9 h-9 rounded-xl bg-white border-2 border-[#111111] keypad-shadow-sm flex items-center justify-center active:translate-x-px active:translate-y-px active:shadow-none hover:bg-zinc-100 transition-all cursor-pointer"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-4">
                            {allCards.length === 0 ? (
                                <p className="text-center text-sm text-zinc-500 py-8">
                                    {restaurant?.name ?? 'This restaurant'} hasn&apos;t set up any loyalty rewards yet.
                                </p>
                            ) : (
                                <>
                                    <div className="relative">
                                        <div ref={drawerCarouselRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 pt-1 px-1">
                                            {orderedCards.map((card, index) => {
                                                const theme = CARD_THEMES[index % CARD_THEMES.length]
                                                const unlockedCount = card.items.filter(i => i.redeemed).length
                                                const totalCount = card.items.length
                                                const nextReward = card.items.find(i => !i.redeemed)
                                                return (
                                                    <div
                                                        key={card.id}
                                                        className="w-[85%] sm:w-[82%] shrink-0 snap-center rounded-2xl border-[2.5px] border-[#111111] keypad-shadow-lg p-4 flex flex-col justify-between relative overflow-hidden"
                                                        style={{ backgroundColor: theme.bg }}
                                                    >
                                                        <div className={cn("flex items-center justify-between", theme.text)}>
                                                            <span className={cn("px-2.5 py-1 border rounded-full text-xs font-extrabold tracking-wide uppercase", theme.badge)}>
                                                                {card.name}
                                                            </span>
                                                            <span className={cn("text-xs font-black tracking-tight", theme.mutedText)}>
                                                                {unlockedCount}/{totalCount} Unlocked
                                                            </span>
                                                        </div>

                                                        <div className="mt-3 mb-2">
                                                            <div className="grid grid-cols-5 gap-2">
                                                                {card.items.map(item => (
                                                                    <div key={item.id} className="flex flex-col items-center gap-1">
                                                                        <div
                                                                            className={cn(
                                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                                                                                item.redeemed
                                                                                    ? "bg-white border-2 border-[#111111] keypad-shadow-sm"
                                                                                    : "bg-white/10 border-2 border-dashed border-white/50 text-white/80"
                                                                            )}
                                                                            style={item.redeemed ? { color: theme.checkedText } : undefined}
                                                                        >
                                                                            {item.redeemed ? (
                                                                                <Check size={16} strokeWidth={3.5} />
                                                                            ) : item.rewardType === 'freeItem' ? (
                                                                                <Gift size={14} />
                                                                            ) : (
                                                                                item.stampsRequired
                                                                            )}
                                                                        </div>
                                                                        <span className={cn("text-[9px] font-bold leading-none text-center line-clamp-1", theme.mutedText)}>
                                                                            {rewardLabel(item)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className={cn("flex items-center justify-between pt-2.5 mt-1 border-t text-xs font-bold", theme.text, theme.text === 'text-white' ? "border-white/20" : "border-black/10")}>
                                                            <span className={cn("text-[11px]", theme.mutedText)}>
                                                                {nextReward ? `Next reward at ${nextReward.stampsRequired}${ordinal(nextReward.stampsRequired)} visit` : 'All rewards unlocked!'}
                                                            </span>
                                                            <span className={cn("text-[10px] font-mono tracking-wider", theme.mutedText)}>
                                                                #{card.id.slice(-6).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {allCards.length > 1 && (
                                        <div className="flex justify-center items-center gap-1.5 pt-1">
                                            {orderedCards.map((card, index) => (
                                                <button
                                                    key={card.id}
                                                    aria-label={`Card ${index + 1}`}
                                                    onClick={() => scrollToDrawerCard(index)}
                                                    className={cn(
                                                        "h-2 rounded-full transition-all cursor-pointer",
                                                        index === activeDrawerIndex ? "w-5 bg-[#111111]" : "w-2 bg-zinc-300"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Omniware UPI Intent Bottom Sheet */}
            {showUpiSheet && (
                <div className="fixed inset-0 z-[100] bg-[#111111]/50 backdrop-blur-sm flex items-end justify-center">
                    <div className="bg-white w-full max-w-md rounded-t-3xl border-t-[3px] border-x-[3px] border-[#111111] p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-extrabold text-[#111111]">Complete Payment</h3>
                                <p className="text-sm text-zinc-500">{formatCurrency(finalAmount)} to {restaurant?.name ?? 'restaurant'}</p>
                            </div>
                            <button
                                onClick={closeUpiSheet}
                                aria-label="Close"
                                className="w-9 h-9 rounded-xl bg-white border-2 border-[#111111] keypad-shadow-sm flex items-center justify-center active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {upiQrCode && (
                            <div className="flex justify-center">
                                <img
                                    src={upiQrCode.startsWith('data:') ? upiQrCode : `data:image/png;base64,${upiQrCode}`}
                                    alt="UPI QR code"
                                    className="w-48 h-48 rounded-2xl border-2 border-[#111111] keypad-shadow"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { key: 'gpay', name: 'GPay', icon: '/googlepay.png' },
                                { key: 'phonepe', name: 'PhonePe', icon: '/phonepay.png' },
                                { key: 'paytm', name: 'Paytm', icon: '/paytm.png' },
                                { key: 'bhim', name: 'BHIM', icon: '/bhim.png' },
                            ].map(app => (
                                <button
                                    key={app.key}
                                    onClick={() => launchUpiApp(app.key)}
                                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#111111] keypad-shadow-sm flex items-center justify-center overflow-hidden p-2">
                                        <Image
                                            src={app.icon}
                                            alt={app.name}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="text-xs text-zinc-600 font-semibold">{app.name}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => launchUpiApp()}
                            className="w-full bg-zinc-100 text-[#111111] font-bold py-3 rounded-2xl border-2 border-[#111111] keypad-shadow hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <QrCode size={18} />
                            Open UPI App
                        </button>

                        <button
                            onClick={() => upiReferenceId && checkUpiPaymentStatus(upiReferenceId)}
                            disabled={isCheckingUpiPayment}
                            className="w-full bg-[#D2F843] text-[#111111] font-bold py-3 rounded-2xl border-2 border-[#111111] keypad-shadow hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isCheckingUpiPayment && <Loader2 size={18} className="animate-spin" />}
                            {isCheckingUpiPayment ? 'Checking...' : "I've Completed the Payment"}
                        </button>
                    </div>
                </div>
            )}

            {/* Re-verifying a payment restored from a closed/killed tab */}
            {isVerifyingPendingPayment && (
                <div className="fixed inset-0 z-[100] bg-[#111111]/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-2xl border-2 border-[#111111] keypad-shadow-lg p-6 flex flex-col items-center gap-3 text-center">
                        <Loader2 size={28} className="animate-spin text-[#111111]" />
                        <div>
                            <h3 className="text-lg font-extrabold text-[#111111]">Checking your payment</h3>
                            <p className="text-sm text-zinc-500 mt-1">Confirming the payment you just made...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Failed */}
            {paymentFailed && (
                <div className="fixed inset-0 z-[100] bg-[#111111]/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-2xl border-2 border-[#111111] keypad-shadow-lg p-6 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#ffdad6] border-2 border-[#111111] text-[#ba1a1a] flex items-center justify-center">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-[#111111]">Payment Failed</h3>
                            <p className="text-sm text-zinc-500 mt-1">{paymentFailedMessage}</p>
                        </div>
                        <button
                            onClick={() => { setPaymentFailed(false); setPaymentFailedMessage('') }}
                            className="w-full bg-[#111111] text-white font-bold py-3 rounded-2xl border-2 border-[#111111] keypad-shadow hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Phone Number Prompt (required for UPI payment) */}
            {showPhonePrompt && (
                <div className="fixed inset-0 z-[100] bg-[#111111]/40 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-xs rounded-2xl border-2 border-[#111111] keypad-shadow-lg p-6 flex flex-col gap-4">
                        <div>
                            <h3 className="text-lg font-extrabold text-[#111111]">Confirm your phone number</h3>
                            <p className="text-sm text-zinc-500 mt-1">UPI payments require a phone number to proceed.</p>
                        </div>
                        <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3">
                            <input
                                type="tel"
                                autoFocus
                                placeholder="Enter your phone number"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                className="bg-zinc-100 rounded-xl px-4 py-3 text-base border-2 border-[#111111] outline-none focus:border-[#111111] keypad-shadow-sm"
                            />
                            {phoneError && <p className="text-[#ba1a1a] text-sm">{phoneError}</p>}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowPhonePrompt(false); setPhoneInput(''); setPhoneError('') }}
                                    className="flex-1 px-4 py-3 rounded-2xl border-2 border-[#111111] text-[#111111] font-bold bg-white keypad-shadow-sm active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isFetchingUpiIntent}
                                    className="flex-1 bg-[#D2F843] text-[#111111] font-bold py-3 rounded-2xl border-2 border-[#111111] keypad-shadow-sm hover:opacity-90 active:translate-x-px active:translate-y-px active:shadow-none transition-all disabled:opacity-60 cursor-pointer"
                                >
                                    Continue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Success Celebration */}
            {paymentResult && (
                <div key={celebrationKey} className="fixed inset-0 z-[100] bg-white overflow-y-auto flex justify-center">
                    <div className="w-full max-w-[428px] min-h-full flex flex-col relative pb-8">
                        {/* Top Bar */}
                        <header className="flex justify-between items-center w-full px-4 py-3 z-30 sticky top-0 bg-white/90 backdrop-blur-sm">
                            <button
                                aria-label="Close"
                                onClick={() => setPaymentResult(null)}
                                className="w-10 h-10 rounded-xl bg-white border-[3px] border-[#111111] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </header>

                        {/* Celebration Hero: rocket launch + confetti burst */}
                        <div
                            className="relative w-full h-56 flex flex-col items-center justify-center overflow-hidden pt-2 cursor-pointer select-none"
                            onClick={() => setCelebrationKey(k => k + 1)}
                            title="Tap the rocket to launch again!"
                        >
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                <div className="absolute w-3 h-3 bg-[#fd5835] border-[1.5px] border-[#111111] rounded-sm burst-piece-1" />
                                <div className="absolute w-2.5 h-2.5 rounded-full bg-[#f6bf22] border-[1.5px] border-[#111111] burst-piece-2" />
                                <div className="absolute w-3.5 h-2 bg-[#2e5bff] border-[1.5px] border-[#111111] rounded-sm burst-piece-3" />
                                <div className="absolute w-3 h-3 bg-[#ccff00] border-[1.5px] border-[#111111] rotate-45 burst-piece-4" />
                                <div className="absolute w-2.5 h-3.5 bg-[#b52603] border-[1.5px] border-[#111111] rounded-sm burst-piece-5" />
                                <div className="absolute w-2 h-2 rounded-full bg-white border-[1.5px] border-[#111111] burst-piece-6" />

                                <div className="absolute -top-1 left-10 anim-twinkle-star">
                                    <Star size={28} fill="#f6bf22" className="text-[#f6bf22] drop-shadow-[1.5px_1.5px_0px_#111111]" />
                                </div>
                                <div className="absolute top-8 right-12 anim-twinkle-star" style={{ animationDelay: '0.4s' }}>
                                    <Star size={22} fill="#fd5835" className="text-[#fd5835] drop-shadow-[1.5px_1.5px_0px_#111111]" />
                                </div>
                                <div className="absolute bottom-5 left-14 anim-twinkle-star" style={{ animationDelay: '0.8s' }}>
                                    <Sparkles size={20} fill="#2e5bff" className="text-[#2e5bff]" />
                                </div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center anim-rocket-launch transition-transform active:scale-95">
                                <div className="relative w-24 h-28 flex items-center justify-center">
                                    <div className="relative w-16 h-[5.5rem] bg-white border-[3px] border-[#111111] rounded-t-full shadow-[3px_3px_0px_#111111] overflow-hidden flex flex-col items-center">
                                        <div className="w-full h-7 bg-[#fd5835] border-b-[3px] border-[#111111]" />
                                        <div className="w-6 h-6 rounded-full bg-[#2e5bff] border-[3px] border-[#111111] mt-2 flex items-center justify-center shadow-inner">
                                            <div className="w-2 h-2 rounded-full bg-[#fcf9f8]" />
                                        </div>
                                        <div className="w-full h-2 bg-[#f6bf22] border-t-2 border-b-2 border-[#111111] mt-2" />
                                    </div>
                                    <div className="absolute -left-2 bottom-3 w-5 h-8 bg-[#b52603] border-[3px] border-[#111111] rounded-tl-xl -rotate-12 shadow-[2px_2px_0px_#111111]" />
                                    <div className="absolute -right-2 bottom-3 w-5 h-8 bg-[#b52603] border-[3px] border-[#111111] rounded-tr-xl rotate-12 shadow-[2px_2px_0px_#111111]" />
                                </div>

                                <div className="flex flex-col items-center -mt-2 anim-flame">
                                    <div className="w-7 h-10 bg-[#fd5835] border-[3px] border-[#111111] rounded-b-full shadow-[2px_2px_0px_#111111] flex items-center justify-center">
                                        <div className="w-3.5 h-6 bg-[#f6bf22] rounded-b-full" />
                                    </div>
                                </div>

                                <div className="relative w-28 h-6 flex justify-center items-center -mt-1 pointer-events-none">
                                    <div className="absolute w-6 h-6 bg-zinc-200 border-2 border-[#111111] rounded-full anim-smoke-1" />
                                    <div className="absolute w-5 h-5 bg-zinc-300 border-2 border-[#111111] rounded-full anim-smoke-2" />
                                    <div className="absolute w-4 h-4 bg-zinc-200 border-2 border-[#111111] rounded-full anim-smoke-3" />
                                </div>
                            </div>
                        </div>

                        {/* Staggered Reveal Content */}
                        <main className="px-4 flex flex-col items-center text-center -mt-2 z-20 flex-1">
                            {/* Step 1: verified badge + amount */}
                            <div className="seq-step-1 flex flex-col items-center w-full">
                                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border-[3px] border-[#111111] shadow-[3px_3px_0px_#111111] mb-3">
                                    <span className="w-5 h-5 rounded-full bg-[#2ed573] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                    <span className="text-[13px] leading-4 tracking-[0.03em] font-extrabold text-[#111111]">Payment Verified &amp; Confirmed</span>
                                </div>
                                <div className="flex items-baseline justify-center gap-1.5 my-1">
                                    <span className="text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#111111]">
                                        {formatCurrency(paymentResult.finalAmount)}
                                    </span>
                                    <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold px-2 py-0.5 bg-[#f6bf22] border-2 border-[#111111] rounded-lg shadow-[2px_2px_0px_#111111] text-[#111111]">
                                        INSTANT
                                    </span>
                                </div>
                                {paymentResult.discountAmount > 0 && (
                                    <p className="text-xs font-semibold text-zinc-500">
                                        {paymentResult.discountLabel ? `${paymentResult.discountLabel} — ` : ''}
                                        {formatCurrency(paymentResult.discountAmount)} saved
                                    </p>
                                )}
                            </div>

                            {/* Step 2: merchant info */}
                            <div className="seq-step-2 w-full max-w-sm bg-white border-[3px] border-[#111111] rounded-2xl p-3 shadow-[4px_4px_0px_#111111] mt-2.5 flex items-center gap-3 text-left">
                                <div className="w-12 h-12 rounded-xl bg-[#2e5bff] border-[3px] border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center text-[18px] font-extrabold text-white shrink-0 overflow-hidden">
                                    <RestaurantPhoto
                                        src={restaurant?.imageUrl}
                                        alt={restaurant?.name ?? 'Restaurant'}
                                        className="w-full h-full object-cover"
                                        fallback={<>{restaurant ? getInitials(restaurant.name) : '—'}</>}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#111111] truncate">
                                            {restaurant?.name ?? 'Restaurant'}
                                        </h2>
                                        <BadgeCheck size={16} className="text-[#2e5bff] shrink-0" aria-label="Loyalty partner" />
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[11px] leading-[14px] font-bold text-[#434656] block">
                                        {successTimestamp ? formatResultDate(successTimestamp) : 'Today'}
                                    </span>
                                    <span className="text-xs leading-4 font-bold text-[#111111] block">
                                        {successTimestamp ? formatResultTime(successTimestamp) : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Step 3: loyalty progress, or free-item confirmation */}
                            {successCard && successTheme ? (
                                <section aria-label="Loyalty progress" className="seq-step-3 w-full mt-5 text-left">
                                    <div
                                        className="w-full border-[3px] border-[#111111] rounded-2xl p-3 shadow-[4px_4px_0px_#111111] relative overflow-hidden select-none"
                                        style={{ backgroundColor: successTheme.bg }}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold tracking-wider uppercase", successTheme.badge)}>
                                                <span className="w-2 h-2 rounded-full bg-[#ccff00]" />
                                                {successCard.name}
                                            </span>
                                            <span className={cn("text-xs font-extrabold tracking-wide", successTheme.text)}>
                                                {successUnlockedCount}/{successTotalCount} UNLOCKED
                                            </span>
                                        </div>

                                        <div className={cn("mt-3 pt-2.5 relative z-10 border-t", successTheme.text === 'text-white' ? 'border-white/20' : 'border-black/10')}>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {successCard.items.map(item => {
                                                    const isNew = item.id === successItemId
                                                    return (
                                                        <div key={item.id} className="flex flex-col items-center gap-1 relative">
                                                            {isNew ? (
                                                                <div className="relative flex items-center justify-center">
                                                                    <div className="absolute inset-0 rounded-full border-2 border-[#ffc72c] seq-stamp-ring pointer-events-none" />
                                                                    <div className="w-8 h-8 rounded-full bg-[#f6bf22] text-[#111111] border-[2.5px] border-[#111111] flex items-center justify-center shadow-[2px_2px_0px_#111111] seq-stamp-pop z-10">
                                                                        <Star size={17} fill="currentColor" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                                                                        item.redeemed
                                                                            ? "bg-white border-2 border-[#111111] shadow-[1px_1px_0px_#111111]"
                                                                            : "bg-white/10 border-[1.5px] border-dashed border-white/50 text-white/80"
                                                                    )}
                                                                    style={item.redeemed ? { color: successTheme.checkedText } : undefined}
                                                                >
                                                                    {item.redeemed ? (
                                                                        <Check size={16} strokeWidth={3} />
                                                                    ) : item.rewardType === 'freeItem' ? (
                                                                        item.freeItemName?.toLowerCase().includes('meal') ? <Cake size={14} /> : <Gift size={14} />
                                                                    ) : (
                                                                        item.stampsRequired
                                                                    )}
                                                                </div>
                                                            )}
                                                            <span className={cn("text-[11px] font-bold leading-none text-center truncate w-full", isNew ? "text-[#f6bf22] font-extrabold" : successTheme.mutedText)}>
                                                                {rewardLabel(item)}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className={cn("mt-3 pt-2.5 border-t flex items-center justify-between relative z-10", successTheme.text === 'text-white' ? 'border-white/15' : 'border-black/10')}>
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles size={16} className="text-[#f6bf22]" />
                                                <p className={cn("text-xs font-bold", successTheme.text)}>
                                                    {successNextReward
                                                        ? `Next reward at ${successNextReward.stampsRequired}${ordinal(successNextReward.stampsRequired)} visit`
                                                        : 'All rewards unlocked!'}
                                                </p>
                                            </div>
                                            <span className={cn("text-xs font-mono font-bold", successTheme.mutedText)}>
                                                #{successCard.id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            ) : paymentResult.freeItemName ? (
                                <div className="seq-step-3 w-full mt-5 bg-white border-[3px] border-[#111111] rounded-2xl p-4 shadow-[4px_4px_0px_#111111] flex items-center gap-2 text-left">
                                    <Gift size={20} className="text-[#111111] shrink-0" />
                                    <p className="text-sm font-bold text-[#111111]">🎁 {paymentResult.freeItemName} redeemed</p>
                                </div>
                            ) : null}

                            {/* Step 4: Done */}
                            <div className="seq-step-4 w-full mt-5 pb-4">
                                <button
                                    onClick={() => setPaymentResult(null)}
                                    className="w-full h-14 bg-[#ccff00] text-[#111111] text-[15px] leading-[18px] tracking-[0.02em] font-extrabold rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111111] flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </main>
                    </div>
                </div>
            )}
        </div>
    )
}
