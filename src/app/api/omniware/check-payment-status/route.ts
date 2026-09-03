import { NextResponse } from 'next/server'
import { getOmniwareCredentialsCollection } from '../../../../../lib/mongodb'
import { resolvePgBaseUrl, queryOmniwareStatus } from '../../../../../lib/omniware'

/**
 * POST /api/omniware/check-payment-status
 *
 * Checks the status of an Omniware transaction using the Payment Status API
 * (docs §6). URL: https://{pg_api_url}/v2/paymentstatus (server-to-server —
 * requires the server IP to be whitelisted by Omniware).
 */
export async function POST(request: Request) {
    let body: { orderId?: string; restaurantId?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const { orderId, restaurantId } = body

    if (!orderId || !restaurantId) {
        return NextResponse.json({ success: false, error: 'Missing required fields: orderId, restaurantId' }, { status: 400 })
    }

    const normalizedRestaurantId = restaurantId.trim().toLowerCase()

    try {
        const credentialsCollection = await getOmniwareCredentialsCollection()
        const credentials = await credentialsCollection.findOne({ restaurantId: normalizedRestaurantId })

        if (!credentials) {
            return NextResponse.json({ success: false, error: 'Payment gateway not configured for this restaurant' }, { status: 404 })
        }

        const { apiKey, salt, gatewayUrl } = credentials

        if (!apiKey || !salt) {
            return NextResponse.json({ success: false, error: 'Payment gateway credentials are incomplete' }, { status: 500 })
        }

        const pgBaseUrl = resolvePgBaseUrl(gatewayUrl)
        if (!pgBaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'Payment gateway URL is not configured for this restaurant. Set it in the admin Payment Gateway settings, or update OMNIWARE_GATEWAY_URL in .env.local.',
            }, { status: 500 })
        }

        const result = await queryOmniwareStatus(pgBaseUrl, apiKey, salt, orderId)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Omniware check-payment-status error:', error)
        return NextResponse.json({
            success: false,
            txnStatus: 'UNKNOWN',
            error: 'Payment status check failed',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        }, { status: 500 })
    }
}
