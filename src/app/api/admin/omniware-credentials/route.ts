import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getOmniwareCredentialsCollection } from '../../../../../lib/mongodb'

function maskApiKey(apiKey: string) {
    if (apiKey.length <= 4) return '****'
    return `${'*'.repeat(apiKey.length - 4)}${apiKey.slice(-4)}`
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const collection = await getOmniwareCredentialsCollection()
        const credentials = await collection.findOne({ restaurantId })

        if (!credentials) {
            return encryptedJson({ success: true, configured: false })
        }

        // Never return the salt or full API key to the browser.
        return encryptedJson({
            success: true,
            configured: true,
            apiKeyMasked: maskApiKey(credentials.apiKey),
            mode: credentials.mode,
            paymentOptions: credentials.paymentOptions || '',
            gatewayUrl: credentials.gatewayUrl || '',
            responseUrl: credentials.responseUrl || '',
            isActive: credentials.isActive,
        })
    } catch (error) {
        console.error('Get Omniware credentials error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    let body: {
        restaurantId?: string
        apiKey?: string
        salt?: string
        gatewayUrl?: string
        responseUrl?: string
        mode?: 'TEST' | 'LIVE'
        paymentOptions?: string
    }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const apiKey = body.apiKey?.trim()
    const salt = body.salt?.trim()

    if (!restaurantId || !apiKey || !salt) {
        return encryptedJson({ success: false, error: 'restaurantId, apiKey, and salt are required.' }, { status: 400 })
    }

    const mode = body.mode === 'TEST' ? 'TEST' : 'LIVE'
    const gatewayUrl = body.gatewayUrl?.trim() || ''
    const responseUrl = body.responseUrl?.trim() || ''
    const paymentOptions = body.paymentOptions?.trim() || 'cc,nb,upi,w'

    try {
        const collection = await getOmniwareCredentialsCollection()
        const now = new Date()

        await collection.updateOne(
            { restaurantId },
            {
                $set: { apiKey, salt, gatewayUrl, responseUrl, mode, paymentOptions, isActive: true, updatedAt: now },
                $setOnInsert: { restaurantId, createdAt: now },
            },
            { upsert: true }
        )

        return encryptedJson({ success: true })
    } catch (error) {
        console.error('Save Omniware credentials error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
