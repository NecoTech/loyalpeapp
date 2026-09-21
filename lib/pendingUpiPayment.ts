'use client'

import { secureFetch } from './secureFetch'

// Tracks an in-flight UPI payment in localStorage (not just React state) so
// it can still be reconciled if the browser tab/PWA gets closed or killed
// while the UPI app was in the foreground — common on Android when
// switching to GPay/PhonePe under memory pressure. Written by the payment
// page (LoyaltyMockup) when a UPI intent is created, and read both there
// (to re-verify on a fresh mount) and on the Transactions page (as a
// fallback check for any payment that was never reconciled because the
// user never returned to that restaurant's payment page).
const PENDING_UPI_PAYMENT_KEY = 'loyalpe_pending_upi_payment'
const PENDING_UPI_PAYMENT_TTL_MS = 45 * 60 * 1000 // matches typical UPI intent validity

export type PendingUpiPayment = {
    referenceId: string
    restaurantId: string
    startedAt: number
    // Whose payment this is — stored directly rather than read from
    // AuthContext at finalize time, because on the exact scenario this
    // exists for (tab/PWA killed and relaunched), AuthContext may not have
    // finished rehydrating the logged-in user from localStorage yet when
    // the restore check runs. This record is the source of truth for who
    // made the payment, independent of whatever the live session state is.
    userId: string
    // Needed to correctly record the transaction if the payment must be
    // finalized from a fresh page load, where the amount the customer
    // entered and the reward they were redeeming are no longer in memory.
    amount: number
    // What the customer actually pays after any discount reward — equals
    // `amount` when there's no discount (no reward, or a free-item reward,
    // which doesn't reduce the price). Always set, unlike the reward-
    // specific fields below.
    finalAmount: number
    cardId?: string
    itemId?: string
    // Snapshot of the discount reward's terms at the moment the payment
    // started (only set when a discount-type reward was active) — purely
    // informational, e.g. so a restored/reconciled payment can still show
    // "20% off" without the original reward item loaded. Never trusted as
    // authoritative: the saved transaction always recomputes these
    // server-side from the real reward item looked up by cardId/itemId.
    discountAmount?: number
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    // Snapshot of a free-item reward's terms at the moment the payment
    // started (only set when a free-item reward was active). Same caveat
    // as the discount fields above — informational only, never sent to the
    // redeem call or trusted as authoritative.
    freeItemName?: string
}

export function readPendingUpiPayment(): PendingUpiPayment | null {
    try {
        const raw = localStorage.getItem(PENDING_UPI_PAYMENT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as PendingUpiPayment
        if (!parsed?.referenceId || !parsed?.restaurantId || !parsed?.startedAt || !parsed?.userId || !Number.isFinite(parsed.amount) || !Number.isFinite(parsed.finalAmount)) {
            return null
        }
        if (Date.now() - parsed.startedAt > PENDING_UPI_PAYMENT_TTL_MS) {
            localStorage.removeItem(PENDING_UPI_PAYMENT_KEY)
            return null
        }
        return parsed
    } catch {
        return null
    }
}

export function writePendingUpiPayment(payment: PendingUpiPayment) {
    try {
        localStorage.setItem(PENDING_UPI_PAYMENT_KEY, JSON.stringify(payment))
    } catch {
        // localStorage unavailable — the in-tab visibilitychange listener
        // (LoyaltyMockup) still covers the common case of switching back to
        // the same tab.
    }
}

export function clearPendingUpiPayment(referenceId?: string) {
    try {
        if (referenceId) {
            const existing = readPendingUpiPayment()
            // Don't clobber a newer pending payment that may have started
            // (e.g. a second payment) since this one was recorded.
            if (existing && existing.referenceId !== referenceId) return
        }
        localStorage.removeItem(PENDING_UPI_PAYMENT_KEY)
    } catch {
        // ignore
    }
}

export type RecordedTransaction = {
    amount: number
    discountAmount: number
    finalAmount: number
    freeItemName?: string
    discountType?: 'percentage' | 'flat'
    discountValue?: number
}

// A payment that was confirmed with the gateway and recorded, but whose
// success screen the customer hasn't dismissed yet. Persisted (not just held
// in React state) so the success screen still appears if the app is closed or
// killed between the payment being recorded and the customer seeing it — the
// pending record above is gone by then, so without this the confirmation
// would be lost and the customer would never know the payment went through.
const UNSEEN_PAYMENT_SUCCESS_KEY = 'loyalpe_unseen_payment_success'
const UNSEEN_PAYMENT_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000

export type UnseenPaymentSuccess = {
    referenceId: string
    restaurantId: string
    userId: string
    cardId?: string
    itemId?: string
    completedAt: number
    transaction: RecordedTransaction
}

export function readUnseenPaymentSuccess(): UnseenPaymentSuccess | null {
    try {
        const raw = localStorage.getItem(UNSEEN_PAYMENT_SUCCESS_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as UnseenPaymentSuccess
        if (!parsed?.referenceId || !parsed?.restaurantId || !parsed?.userId || !parsed?.completedAt || !parsed?.transaction) {
            return null
        }
        if (Date.now() - parsed.completedAt > UNSEEN_PAYMENT_SUCCESS_TTL_MS) {
            localStorage.removeItem(UNSEEN_PAYMENT_SUCCESS_KEY)
            return null
        }
        return parsed
    } catch {
        return null
    }
}

function writeUnseenPaymentSuccess(payment: UnseenPaymentSuccess) {
    try {
        localStorage.setItem(UNSEEN_PAYMENT_SUCCESS_KEY, JSON.stringify(payment))
    } catch {
        // localStorage unavailable — the success screen still shows this
        // session via the recorded event below; it just can't survive a kill.
    }
}

export function clearUnseenPaymentSuccess(referenceId?: string) {
    try {
        if (referenceId) {
            const existing = readUnseenPaymentSuccess()
            if (existing && existing.referenceId !== referenceId) return
        }
        localStorage.removeItem(UNSEEN_PAYMENT_SUCCESS_KEY)
    } catch {
        // ignore
    }
}

// Fired on `window` once a payment has been recorded / has definitively
// failed, by whichever code path finished verifying it. The app-wide success
// screen (PaymentRecovery) and the payment page both listen for these rather
// than depending on who happened to run the check — the check can be started
// from the payment page, the Transactions page, or the app-wide watcher, and
// only one of them gets the real result (the rest see it already resolved).
export const PAYMENT_RECORDED_EVENT = 'loyalpe:payment-recorded'
export const PAYMENT_FAILED_EVENT = 'loyalpe:payment-failed'

export type PaymentRecordedDetail = { restaurantId: string; referenceId: string; payment: UnseenPaymentSuccess }
export type PaymentFailedDetail = { restaurantId: string; referenceId: string; message: string }

function emit<T>(name: string, detail: T) {
    try {
        window.dispatchEvent(new CustomEvent<T>(name, { detail }))
    } catch {
        // ignore
    }
}

export type PendingUpiPaymentOutcome =
    | { outcome: 'success'; transaction: RecordedTransaction; pending: PendingUpiPayment }
    | { outcome: 'failed'; message: string; pending: PendingUpiPayment }
    | { outcome: 'pending' }
    | { outcome: 'none' }

// Only one verification per payment runs at a time. The payment page, the
// Transactions page and the app-wide watcher can all ask at once (e.g. the
// app is reopened and several things react to it) — sharing the in-flight
// check means they all get the same answer instead of racing to record the
// same payment.
let inFlight: { referenceId: string; promise: Promise<PendingUpiPaymentOutcome> } | null = null

// Checks Omniware for a pending payment's real status and, if it actually
// succeeded, records the transaction — a safety net for a payment that was
// completed in the UPI app but never got confirmed here (tab/PWA closed
// before the user returned). Always finalizes under the pending record's own
// userId (who actually made the payment), not whoever happens to be logged
// in when this check runs. `pendingOverride` lets the payment page pass the
// payment it just started when localStorage couldn't hold it.
export function verifyPendingUpiPayment(pendingOverride?: PendingUpiPayment): Promise<PendingUpiPaymentOutcome> {
    const pending = pendingOverride ?? readPendingUpiPayment()
    if (!pending) return Promise.resolve({ outcome: 'none' })

    if (inFlight?.referenceId === pending.referenceId) return inFlight.promise

    const promise = runVerification(pending).finally(() => {
        if (inFlight?.promise === promise) inFlight = null
    })
    inFlight = { referenceId: pending.referenceId, promise }
    return promise
}

// The status check uses plain fetch, matching the payment page, since that
// route follows the Omniware gateway's own contract and is intentionally
// excluded from the app's request/response encryption. The redeem call
// below is one of the app's own APIs, so it goes through secureFetch —
// /api/loyalty/redeem only accepts an encrypted body and returns an
// encrypted response; calling it with plain fetch fails to decrypt server
// side and the payment never actually gets saved.
async function runVerification(pending: PendingUpiPayment): Promise<PendingUpiPaymentOutcome> {
    try {
        const statusRes = await fetch('/api/omniware/check-payment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: pending.referenceId, restaurantId: pending.restaurantId }),
        })
        const statusResult = await statusRes.json()

        if (statusResult.success && statusResult.txnStatus === 'SUCCESS') {
            const { res: redeemRes, data: redeemData } = await secureFetch('/api/loyalty/redeem', {
                method: 'POST',
                body: {
                    userId: pending.userId,
                    restaurantId: pending.restaurantId,
                    cardId: pending.cardId,
                    itemId: pending.itemId,
                    amount: pending.amount,
                    orderId: pending.referenceId,
                },
            })

            if (redeemData?.success) {
                const payment: UnseenPaymentSuccess = {
                    referenceId: pending.referenceId,
                    restaurantId: pending.restaurantId,
                    userId: pending.userId,
                    cardId: pending.cardId,
                    itemId: pending.itemId,
                    completedAt: Date.now(),
                    transaction: redeemData.transaction,
                }
                // Written before the pending record is cleared: if the app
                // dies between the two, the payment is still remembered.
                writeUnseenPaymentSuccess(payment)
                clearPendingUpiPayment(pending.referenceId)
                emit<PaymentRecordedDetail>(PAYMENT_RECORDED_EVENT, { restaurantId: pending.restaurantId, referenceId: pending.referenceId, payment })
                return { outcome: 'success', transaction: redeemData.transaction, pending }
            }

            // The gateway confirmed the money but our server couldn't record
            // it (it's down, or the request didn't get through). Keep the
            // pending record and report "still pending" so a later check
            // retries — recording is idempotent per orderId, so retrying is
            // safe. Only a definite rejection (a 4xx) is given up on.
            if (!redeemRes.ok && redeemRes.status >= 500) {
                console.error('Could not record a confirmed payment yet; will retry', redeemData?.error)
                return { outcome: 'pending' }
            }

            clearPendingUpiPayment(pending.referenceId)
            const message = `${redeemData?.error || 'Could not record the payment.'} If money was deducted, please contact support.`
            emit<PaymentFailedDetail>(PAYMENT_FAILED_EVENT, { restaurantId: pending.restaurantId, referenceId: pending.referenceId, message })
            return { outcome: 'failed', message, pending }
        }

        if (statusResult.success && (statusResult.txnStatus === 'FAILED' || statusResult.txnStatus === 'CANCELLED')) {
            clearPendingUpiPayment(pending.referenceId)
            const message = statusResult.txnStatus === 'CANCELLED'
                ? 'Payment was cancelled. No amount has been deducted.'
                : 'Payment was not completed.'
            emit<PaymentFailedDetail>(PAYMENT_FAILED_EVENT, { restaurantId: pending.restaurantId, referenceId: pending.referenceId, message })
            return { outcome: 'failed', message, pending }
        }

        return { outcome: 'pending' }
    } catch (err) {
        console.error('Failed to verify pending UPI payment', err)
        return { outcome: 'pending' }
    }
}
