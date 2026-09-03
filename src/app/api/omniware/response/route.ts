import { NextResponse } from 'next/server'
import { getOmniwareCredentialsCollection, getPaymentIntentsCollection } from '../../../../../lib/mongodb'
import { resolvePgBaseUrl, queryOmniwareStatus } from '../../../../../lib/omniware'
import { redeemLoyaltyReward } from '../../../../../lib/loyalty'

/**
 * Omniware redirects the customer's browser here (return_url / return_url_failure /
 * return_url_cancel all point at this same route — see create-payment-request)
 * once the hosted checkout page finishes. It looks up what the order was for
 * (stashed in paymentIntents when the checkout started, since React state is
 * gone after a full-page redirect), confirms the real status server-to-server
 * via the Payment Status API, finalizes the loyalty redemption on success, and
 * redirects the browser back to the page it started from with a ?status= flag
 * for the UI to read.
 */
async function handleOmniwareResponse(request: Request) {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId') || url.searchParams.get('order_id')

    const redirectWithParams = (path: string, params: Record<string, string | undefined>) => {
        const dest = new URL(path, url.origin)
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') dest.searchParams.set(key, value)
        })
        return NextResponse.redirect(dest, { status: 303 })
    }

    if (!orderId) {
        return redirectWithParams('/', { status: 'failed', message: 'Missing order reference from payment gateway.' })
    }

    try {
        const intentsCollection = await getPaymentIntentsCollection()
        const intent = await intentsCollection.findOne({ orderId })

        if (!intent) {
            return redirectWithParams('/', { status: 'failed', order_id: orderId, message: 'Payment record not found.' })
        }

        const redirectPath = intent.redirectPath || '/'

        // Already finalized (e.g. Omniware called back more than once) — don't redeem twice.
        if (intent.status === 'completed') {
            return redirectWithParams(redirectPath, { status: 'success', order_id: orderId })
        }

        const credentialsCollection = await getOmniwareCredentialsCollection()
        const credentials = await credentialsCollection.findOne({ restaurantId: intent.restaurantId })
        if (!credentials) {
            return redirectWithParams(redirectPath, { status: 'failed', order_id: orderId, message: 'Payment gateway not configured for this restaurant.' })
        }

        const pgBaseUrl = resolvePgBaseUrl(credentials.gatewayUrl)
        if (!pgBaseUrl) {
            return redirectWithParams(redirectPath, {
                status: 'failed',
                order_id: orderId,
                message: 'Payment gateway URL is not configured for this restaurant.',
            })
        }

        const statusResult = await queryOmniwareStatus(pgBaseUrl, credentials.apiKey, credentials.salt, orderId)

        if (statusResult.txnStatus === 'SUCCESS') {
            const redeemResult = await redeemLoyaltyReward({
                userId: intent.userId,
                restaurantId: intent.restaurantId,
                cardId: intent.cardId,
                itemId: intent.itemId,
                amount: intent.amount,
            })

            await intentsCollection.updateOne(
                { orderId },
                { $set: { status: 'completed', transactionId: statusResult.transactionId || undefined, updatedAt: new Date() } }
            )

            if (!redeemResult.success) {
                console.error('Loyalty redemption failed after a successful Omniware payment:', redeemResult.error, { orderId })
                return redirectWithParams(redirectPath, {
                    status: 'success',
                    order_id: orderId,
                    message: 'Payment succeeded, but there was an issue applying your loyalty reward. Please contact the restaurant.',
                })
            }

            const { transaction } = redeemResult
            return redirectWithParams(redirectPath, {
                status: 'success',
                order_id: orderId,
                amount: String(transaction.amount),
                discountAmount: String(transaction.discountAmount),
                finalAmount: String(transaction.finalAmount),
                discountType: transaction.discountType,
                discountValue: transaction.discountValue !== undefined ? String(transaction.discountValue) : undefined,
                freeItemName: transaction.freeItemName,
            })
        }

        if (statusResult.txnStatus === 'PENDING') {
            return redirectWithParams(redirectPath, {
                status: 'pending',
                order_id: orderId,
                message: statusResult.message || 'Your payment is still processing. Please check back shortly.',
            })
        }

        await intentsCollection.updateOne(
            { orderId },
            { $set: { status: 'failed', updatedAt: new Date() } }
        )

        return redirectWithParams(redirectPath, {
            status: statusResult.txnStatus === 'CANCELLED' ? 'cancelled' : 'failed',
            order_id: orderId,
            message: statusResult.message || 'Payment was not completed. Please try again.',
        })
    } catch (error) {
        console.error('Omniware response handler error:', error)
        return redirectWithParams('/', {
            status: 'failed',
            order_id: orderId,
            message: 'Something went wrong while confirming your payment.',
        })
    }
}

export async function GET(request: Request) {
    return handleOmniwareResponse(request)
}

export async function POST(request: Request) {
    return handleOmniwareResponse(request)
}
