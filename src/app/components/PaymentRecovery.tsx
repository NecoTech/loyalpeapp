'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { secureFetch } from '../../../lib/secureFetch'
import {
    PAYMENT_FAILED_EVENT,
    PAYMENT_RECORDED_EVENT,
    clearUnseenPaymentSuccess,
    readPendingUpiPayment,
    readUnseenPaymentSuccess,
    verifyPendingUpiPayment,
    type PaymentFailedDetail,
    type PaymentRecordedDetail,
    type UnseenPaymentSuccess,
} from '../../../lib/pendingUpiPayment'
import { refreshHomeData } from '../../../lib/homeCache'
import { useAuth } from '../context/AuthContext'
import PaymentSuccessScreen, { discountLabel, type LoyaltyCard } from './PaymentSuccessScreen'

// How often to re-check a payment that's still pending while the app is open.
// UPI apps report "done" a moment before the gateway does, so the first check
// after coming back can still say pending — without a retry the customer
// would sit on a page with no confirmation until they reopened the app.
const POLL_INTERVAL_MS = 5000

type PresentedPayment = {
    payment: UnseenPaymentSuccess
    restaurant: { name: string; imageUrl?: string | null } | null
    cards: LoyaltyCard[]
}

// Mounted once in the root layout so it works on every page. When a UPI
// payment was started and the customer left the app (closed the tab, killed
// the installed app, switched to a UPI app and back), this finds out whether
// it actually went through and, if so, shows the payment-successful screen
// right where the customer is — home, restaurants, profile, anywhere — instead
// of the payment silently sitting unrecorded until they happen to revisit the
// restaurant's payment page.
export default function PaymentRecovery() {
    const pathname = usePathname()
    const { user, isInitialized } = useAuth()

    // The restaurant-owner dashboard is a separate product surface from the
    // customer app; a customer's payment confirmation doesn't belong in it.
    const isAdminArea = pathname?.startsWith('/admin') ?? false

    const [isChecking, setIsChecking] = useState(false)
    const [isPreparing, setIsPreparing] = useState(false)
    const [presented, setPresented] = useState<PresentedPayment | null>(null)
    const [failureMessage, setFailureMessage] = useState<string | null>(null)

    // Which payment is being loaded or shown, so the same one is never
    // presented twice however many things report it (event, mount check, poll).
    const presentingRef = useRef<string | null>(null)
    const userIdRef = useRef('')
    userIdRef.current = (user?.email || user?.phoneNumber || '').toLowerCase()

    const present = useCallback(async (payment: UnseenPaymentSuccess) => {
        if (presentingRef.current === payment.referenceId) return
        presentingRef.current = payment.referenceId
        setIsPreparing(true)

        // The screen shows the restaurant and the loyalty card's new stamp,
        // neither of which is in memory after a fresh launch. Fetched here,
        // before the screen opens, so it appears complete instead of filling
        // in a moment later. A failed lookup just leaves that part out.
        let restaurant: PresentedPayment['restaurant'] = null
        let cards: LoyaltyCard[] = []
        await Promise.all([
            (async () => {
                try {
                    const { res, data } = await secureFetch(`/api/restaurant/${encodeURIComponent(payment.restaurantId)}`)
                    if (res.ok && data?.success && data.restaurant) {
                        restaurant = { name: data.restaurant.name, imageUrl: data.restaurant.imageUrl }
                    }
                } catch (err) {
                    console.error('Failed to load restaurant for the payment success screen', err)
                }
            })(),
            (async () => {
                try {
                    const params = new URLSearchParams({ restaurantId: payment.restaurantId, userId: payment.userId })
                    const { res, data } = await secureFetch(`/api/loyalty/card-progress?${params.toString()}`)
                    if (res.ok && data?.success) {
                        cards = (data.cards as LoyaltyCard[]).filter(c => c.items.length > 0)
                    }
                } catch (err) {
                    console.error('Failed to load loyalty cards for the payment success screen', err)
                }
            })(),
        ])

        setPresented({ payment, restaurant, cards })
        setIsPreparing(false)
    }, [])

    // Shows a recorded-but-not-yet-seen payment, if there is one for whoever
    // is using the app. A different signed-in account's payment is left alone
    // (it appears when that account is back); a signed-out device shows it,
    // since the record itself says who paid.
    const presentUnseenPayment = useCallback(() => {
        const unseen = readUnseenPaymentSuccess()
        if (!unseen) return
        const currentUserId = userIdRef.current
        if (currentUserId && unseen.userId.toLowerCase() !== currentUserId) return
        present(unseen)
    }, [present])

    const checkPendingPayment = useCallback(async (withOverlay: boolean) => {
        if (!readPendingUpiPayment()) return
        if (withOverlay) setIsChecking(true)
        try {
            // Recording/failure is announced through the events below, which
            // is how the screen learns of it whoever ran the check.
            await verifyPendingUpiPayment()
        } finally {
            if (withOverlay) setIsChecking(false)
        }
    }, [])

    // A payment that was recorded but never acknowledged before the app was
    // closed. Waits for the saved sign-in to load so it isn't shown to the
    // wrong account.
    useEffect(() => {
        if (isAdminArea || !isInitialized) return
        presentUnseenPayment()
    }, [isAdminArea, isInitialized, user, presentUnseenPayment])

    // App launch: a payment left pending when the app was closed.
    useEffect(() => {
        if (isAdminArea) return
        checkPendingPayment(true)
    }, [isAdminArea, checkPendingPayment])

    // Coming back to the app, and retrying while a payment is still pending.
    useEffect(() => {
        if (isAdminArea) return

        const onResume = () => {
            if (document.visibilityState === 'visible') checkPendingPayment(false)
        }
        document.addEventListener('visibilitychange', onResume)
        window.addEventListener('focus', onResume)
        window.addEventListener('pageshow', onResume)
        const poll = setInterval(onResume, POLL_INTERVAL_MS)

        return () => {
            document.removeEventListener('visibilitychange', onResume)
            window.removeEventListener('focus', onResume)
            window.removeEventListener('pageshow', onResume)
            clearInterval(poll)
        }
    }, [isAdminArea, checkPendingPayment])

    useEffect(() => {
        if (isAdminArea) return

        const onRecorded = (event: Event) => {
            presentUnseenPayment()
            // The payment changes the home page's Saved Money and Recent
            // Shops; refresh what's remembered for them so the home page is
            // already right whenever it's opened next.
            const paidBy = (event as CustomEvent<PaymentRecordedDetail>).detail?.payment?.userId
            if (paidBy) void refreshHomeData(paidBy)
        }
        const onFailed = (event: Event) => {
            setFailureMessage((event as CustomEvent<PaymentFailedDetail>).detail?.message || 'Payment was not completed.')
        }
        window.addEventListener(PAYMENT_RECORDED_EVENT, onRecorded)
        window.addEventListener(PAYMENT_FAILED_EVENT, onFailed)
        return () => {
            window.removeEventListener(PAYMENT_RECORDED_EVENT, onRecorded)
            window.removeEventListener(PAYMENT_FAILED_EVENT, onFailed)
        }
    }, [isAdminArea, presentUnseenPayment])

    const dismissSuccess = () => {
        if (presented) clearUnseenPaymentSuccess(presented.payment.referenceId)
        presentingRef.current = null
        setPresented(null)
    }

    if (isAdminArea) return null

    const showChecking = (isChecking || isPreparing) && !presented

    return (
        <>
            {showChecking && (
                <div className="fixed inset-0 z-[100] bg-[#111111]/40 backdrop-blur-sm flex items-center justify-center p-6" role="status" aria-live="polite">
                    <div className="bg-white w-full max-w-xs rounded-2xl border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-6 flex flex-col items-center gap-3 text-center">
                        <Loader2 size={28} className="animate-spin text-[#111111]" />
                        <div>
                            <h3 className="text-lg font-extrabold text-[#111111]">Checking your payment</h3>
                            <p className="text-sm text-zinc-500 mt-1">Confirming the payment you just made...</p>
                        </div>
                    </div>
                </div>
            )}

            {presented && (() => {
                const { payment, restaurant, cards } = presented
                const cardIndex = payment.cardId ? cards.findIndex(c => c.id === payment.cardId) : -1
                const { transaction } = payment
                return (
                    <PaymentSuccessScreen
                        result={{
                            ...transaction,
                            discountLabel: transaction.discountAmount > 0 && transaction.discountType
                                ? discountLabel({ rewardType: 'discount', discountType: transaction.discountType, discountValue: transaction.discountValue })
                                : undefined,
                        }}
                        restaurant={restaurant}
                        timestamp={new Date(payment.completedAt)}
                        card={cardIndex >= 0 ? cards[cardIndex] : null}
                        cardThemeIndex={Math.max(cardIndex, 0)}
                        newItemId={payment.itemId ?? null}
                        onClose={dismissSuccess}
                    />
                )
            })()}

            {failureMessage && (
                <div className="fixed inset-0 z-[110] bg-[#111111]/40 backdrop-blur-sm flex items-center justify-center p-6" role="alertdialog" aria-label="Payment failed">
                    <div className="bg-white w-full max-w-xs rounded-2xl border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-6 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#ffdad6] border-2 border-[#111111] text-[#ba1a1a] flex items-center justify-center">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-[#111111]">Payment Failed</h3>
                            <p className="text-sm text-zinc-500 mt-1">{failureMessage}</p>
                        </div>
                        <button
                            onClick={() => setFailureMessage(null)}
                            className={cn("w-full bg-[#111111] text-white font-bold py-3 rounded-2xl border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer")}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
