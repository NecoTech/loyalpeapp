import { NextResponse } from 'next/server'
import { getOmniwareCredentialsCollection, getPaymentIntentsCollection } from '../../../../../lib/mongodb'
import { computeOmniwareHash } from '../../../../../lib/omniware'

/**
 * POST /api/omniware/create-payment-request
 *
 * Builds all form fields required by the Omniware v2/paymentrequest endpoint
 * and computes the SHA-512 hash server-side so the salt is never exposed to
 * the browser. The frontend receives all fields, builds a hidden HTML form,
 * and auto-submits it so the browser navigates to the Omniware hosted
 * payment page.
 */
export async function POST(request: Request) {
    let body: {
        orderId?: string
        amount?: string | number
        billAmount?: string | number
        customerName?: string
        customerEmail?: string
        customerPhone?: string
        restaurantId?: string
        userId?: string
        cardId?: string
        itemId?: string
        redirectPath?: string
        udf1?: string
        udf2?: string
        udf3?: string
    }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const { orderId, amount, customerName, customerEmail, customerPhone, restaurantId, userId, udf1, udf2, udf3 } = body

    if (!orderId || !amount || !customerName || !customerPhone || !restaurantId || !userId) {
        return NextResponse.json({
            success: false,
            error: 'Missing required fields: orderId, amount, customerName, customerPhone, restaurantId, userId',
        }, { status: 400 })
    }

    const numericAmount = parseFloat(String(amount))
    if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 1000000) {
        return NextResponse.json({ success: false, error: 'Amount must be a number between 1 and 1000000' }, { status: 400 })
    }

    const billAmountNumeric = body.billAmount !== undefined ? parseFloat(String(body.billAmount)) : numericAmount
    if (isNaN(billAmountNumeric) || billAmountNumeric < 0) {
        return NextResponse.json({ success: false, error: 'Invalid bill amount' }, { status: 400 })
    }

    const normalizedRestaurantId = restaurantId.trim().toLowerCase()
    const normalizedUserId = userId.trim().toLowerCase()
    const redirectPath = body.redirectPath && body.redirectPath.startsWith('/') ? body.redirectPath : '/'

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

        const resolvedGatewayUrl = gatewayUrl || process.env.OMNIWARE_GATEWAY_URL
        if (!resolvedGatewayUrl || resolvedGatewayUrl.includes('{pg_api_url}')) {
            console.error('No real Omniware gateway URL configured (still the {pg_api_url} placeholder)')
            return NextResponse.json({
                success: false,
                error: 'Payment gateway URL is not configured for this restaurant. Set it in the admin Payment Gateway settings, or update OMNIWARE_GATEWAY_URL in .env.local.',
            }, { status: 500 })
        }

        const baseResponseUrl = responseUrl || process.env.OMNIWARE_RESPONSE_URL
        if (!baseResponseUrl) {
            console.error('No Omniware response URL configured')
            return NextResponse.json({ success: false, error: 'Payment response URL not configured' }, { status: 500 })
        }

        // Registers what this order is for (which user/card/reward/bill amount)
        // so the response webhook — which only gets an orderId back from
        // Omniware, not our React state — knows what to finalize once the
        // gateway confirms payment. Upsert makes a double-click/resubmit safe.
        const intentsCollection = await getPaymentIntentsCollection()
        await intentsCollection.updateOne(
            { orderId },
            {
                $set: {
                    restaurantId: normalizedRestaurantId,
                    userId: normalizedUserId,
                    cardId: body.cardId,
                    itemId: body.itemId,
                    amount: billAmountNumeric,
                    redirectPath,
                    status: 'pending',
                    updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
        )

        const responseUrlWithOrder = `${baseResponseUrl}${baseResponseUrl.includes('?') ? '&' : '?'}orderId=${encodeURIComponent(orderId)}`

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
            return_url: responseUrlWithOrder,
            return_url_failure: responseUrlWithOrder,
            return_url_cancel: responseUrlWithOrder,
            ...(resolvedUdf1 ? { udf1: resolvedUdf1 } : {}),
            ...(resolvedUdf2 ? { udf2: resolvedUdf2 } : {}),
            ...(resolvedUdf3 ? { udf3: resolvedUdf3 } : {}),
            ...(paymentOptions ? { payment_options: paymentOptions } : {}),
        }

        const hash = computeOmniwareHash(salt, hashParams)

        return NextResponse.json({
            success: true,
            gatewayUrl: resolvedGatewayUrl,
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
            return_url: responseUrlWithOrder,
            return_url_failure: responseUrlWithOrder,
            return_url_cancel: responseUrlWithOrder,
            ...(paymentOptions ? { payment_options: paymentOptions } : {}),
            udf1: resolvedUdf1,
            udf2: resolvedUdf2,
            udf3: resolvedUdf3,
            hash,
        })
    } catch (error) {
        console.error('Omniware payment request creation error:', error)
        return NextResponse.json({
            success: false,
            error: 'Payment request creation failed',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        }, { status: 500 })
    }
}
