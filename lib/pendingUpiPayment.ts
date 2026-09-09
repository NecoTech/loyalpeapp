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

export type PendingUpiPaymentOutcome =
    | { outcome: 'success'; transaction: { amount: number; discountAmount: number; finalAmount: number; freeItemName?: string; discountType?: 'percentage' | 'flat'; discountValue?: number }; pending: PendingUpiPayment }
    | { outcome: 'failed'; message: string; pending: PendingUpiPayment }
    | { outcome: 'pending' }
    | { outcome: 'none' }

// Checks Omniware for a pending payment's real status and, if it actually
// succeeded, records the transaction — a safety net for a payment that was
// completed in the UPI app but never got confirmed here (tab/PWA closed
// before the user returned to the restaurant's payment page). Always
// finalizes under the pending record's own userId (who actually made the
// payment), not whoever happens to be logged in when this check runs.
// The status check uses plain fetch, matching the payment page, since that
// route follows the Omniware gateway's own contract and is intentionally
// excluded from the app's request/response encryption. The redeem call
// below is one of the app's own APIs, so it goes through secureFetch —
// /api/loyalty/redeem only accepts an encrypted body and returns an
// encrypted response; calling it with plain fetch fails to decrypt server
// side and the payment never actually gets saved.
export async function verifyPendingUpiPayment(): Promise<PendingUpiPaymentOutcome> {
    const pending = readPendingUpiPayment()
    if (!pending) return { outcome: 'none' }

    try {
        const statusRes = await fetch('/api/omniware/check-payment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: pending.referenceId, restaurantId: pending.restaurantId }),
        })
        const statusResult = await statusRes.json()

        if (statusResult.success && statusResult.txnStatus === 'SUCCESS') {
            const { data: redeemData } = await secureFetch('/api/loyalty/redeem', {
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
            clearPendingUpiPayment(pending.referenceId)

            if (!redeemData?.success) {
                return { outcome: 'failed', message: redeemData?.error || 'Could not record the payment.', pending }
            }
            return { outcome: 'success', transaction: redeemData.transaction, pending }
        }

        if (statusResult.success && (statusResult.txnStatus === 'FAILED' || statusResult.txnStatus === 'CANCELLED')) {
            clearPendingUpiPayment(pending.referenceId)
            return {
                outcome: 'failed',
                message: statusResult.txnStatus === 'CANCELLED'
                    ? 'Payment was cancelled. No amount has been deducted.'
                    : 'Payment was not completed.',
                pending,
            }
        }

        return { outcome: 'pending' }
    } catch (err) {
        console.error('Failed to verify pending UPI payment', err)
        return { outcome: 'pending' }
    }
}
