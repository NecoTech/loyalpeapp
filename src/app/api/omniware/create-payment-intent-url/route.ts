import { NextResponse } from 'next/server'
import { getOmniwareCredentialsCollection } from '../../../../../lib/mongodb'
import { computeOmniwareHash, resolvePgBaseUrl } from '../../../../../lib/omniware'

/**
 * POST /api/omniware/create-payment-intent-url
 *
 * Uses Omniware's "Fetch Intent URL Payment Request" API (docs §5) to get a
 * UPI intent URL (and optionally a QR code) directly, instead of redirecting
 * the browser to the full hosted payment page. Same POST parameters and hash
 * algorithm as v2/paymentrequest (docs §5.1), but called server-to-server.
 *
 * URL:    https://{pg_api_url}/v2/getpaymentrequestintenturl
 * Method: POST (server-to-server)
 */
export async function POST(request: Request) {
    let body: {
        orderId?: string
        amount?: string | number
        customerName?: string
        customerEmail?: string
        customerPhone?: string
        restaurantId?: string
        udf1?: string
        udf2?: string
        udf3?: string
    }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const { orderId, amount, customerName, customerEmail, customerPhone, restaurantId, udf1, udf2, udf3 } = body

    if (!orderId || !amount || !customerName || !customerPhone || !restaurantId) {
        return NextResponse.json({
            success: false,
            error: 'Missing required fields: orderId, amount, customerName, customerPhone, restaurantId',
        }, { status: 400 })
    }

    const numericAmount = parseFloat(String(amount))
    if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 1000000) {
        return NextResponse.json({ success: false, error: 'Amount must be a number between 1 and 1000000' }, { status: 400 })
    }

    const normalizedRestaurantId = restaurantId.trim().toLowerCase()

    try {
        const credentialsCollection = await getOmniwareCredentialsCollection()
        const credentials = await credentialsCollection.findOne({ restaurantId: normalizedRestaurantId })

        if (!credentials) {
            console.error(`No Omniware credentials found for restaurant: ${normalizedRestaurantId}`)
            return NextResponse.json({ success: false, error: 'Payment gateway not configured for this restaurant' }, { status: 404 })
        }

        const { apiKey, salt, gatewayUrl, responseUrl, mode, paymentOptions } = credentials

        if (!apiKey || !salt) {
            console.error(`Incomplete Omniware credentials for restaurant: ${normalizedRestaurantId}`)
            return NextResponse.json({ success: false, error: 'Payment gateway credentials are incomplete. Please contact support.' }, { status: 500 })
        }

        const pgBaseUrl = resolvePgBaseUrl(gatewayUrl)
        if (!pgBaseUrl) {
            console.error('No real Omniware gateway URL configured (still the {pg_api_url} placeholder)')
            return NextResponse.json({
                success: false,
                error: 'Payment gateway URL is not configured for this restaurant. Set it in the admin Payment Gateway settings, or update OMNIWARE_GATEWAY_URL in .env.local.',
            }, { status: 500 })
        }

        const intentUrl = `${pgBaseUrl}/v2/getpaymentrequestintenturl`

        const baseResponseUrl = responseUrl || process.env.OMNIWARE_RESPONSE_URL
        if (!baseResponseUrl) {
            console.error('No Omniware response URL configured')
            return NextResponse.json({ success: false, error: 'Payment response URL not configured' }, { status: 500 })
        }

        const formattedAmount = numericAmount.toFixed(2)
        const name = (customerName || '').trim()
        const email = (customerEmail || `${customerPhone}@orderapp.com`).trim()
        const phone = (customerPhone || '').trim()
        const resolvedMode = (mode || 'LIVE').toUpperCase()

        const resolvedUdf1 = udf1 || orderId
        const resolvedUdf2 = udf2 || normalizedRestaurantId
        const resolvedUdf3 = udf3 || ''

        const description = `Payment for order ${orderId}`
        const city = 'Unknown'
        const zip_code = '000000'

        const hashParams: Record<string, unknown> = {
            api_key: apiKey,
            order_id: orderId,
            mode: resolvedMode,
            amount: formattedAmount,
            currency: 'INR',
            description,
            name,
            email,
            phone,
            city,
            country: 'IND',
            zip_code,
            return_url: baseResponseUrl,
            return_url_failure: baseResponseUrl,
            return_url_cancel: baseResponseUrl,
            ...(resolvedUdf1 ? { udf1: resolvedUdf1 } : {}),
            ...(resolvedUdf2 ? { udf2: resolvedUdf2 } : {}),
            ...(resolvedUdf3 ? { udf3: resolvedUdf3 } : {}),
            ...(paymentOptions ? { payment_options: paymentOptions } : {}),
        }

        const hash = computeOmniwareHash(salt, hashParams)

        const postBody: Record<string, unknown> = {
            api_key: apiKey,
            order_id: orderId,
            mode: resolvedMode,
            amount: formattedAmount,
            currency: 'INR',
            description,
            name,
            email,
            phone,
            city,
            country: 'IND',
            zip_code,
            return_url: baseResponseUrl,
            return_url_failure: baseResponseUrl,
            return_url_cancel: baseResponseUrl,
            udf1: resolvedUdf1,
            udf2: resolvedUdf2,
            udf3: resolvedUdf3,
            hash,
            ...(paymentOptions ? { payment_options: paymentOptions } : {}),
        }

        const formBody = new URLSearchParams()
        Object.entries(postBody).forEach(([k, v]) => {
            if (v !== '' && v != null) formBody.set(k, String(v))
        })

        const pgResponse = await fetch(intentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody.toString(),
        })

        const pgData = await pgResponse.json()

        if (pgData.error) {
            return NextResponse.json({
                success: false,
                error: pgData.error.message || 'Failed to generate UPI intent URL',
                errorCode: pgData.error.code,
            })
        }

        const data = pgData.data
        if (!data || !data.upi_intent_url) {
            return NextResponse.json({ success: false, error: 'No UPI intent URL returned by payment gateway' })
        }

        return NextResponse.json({
            success: true,
            upi_intent_url: data.upi_intent_url,
            qr_code: data.qr_code || null,
            payment_request_id: data.payment_request_id || null,
            order_id: data.order_id || orderId,
        })
    } catch (error) {
        console.error('Omniware UPI intent request creation error:', error)
        return NextResponse.json({
            success: false,
            error: 'UPI intent request creation failed',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        }, { status: 500 })
    }
}
