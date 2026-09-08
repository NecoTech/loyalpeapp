import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { extractUpiVpa } from '../../../../../lib/upi'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ restaurantId })
        return encryptedJson({ success: true, upiUrl: owner?.upiUrl || '' })
    } catch (error) {
        console.error('Fetch UPI URL error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    let body: { restaurantId?: string; upiUrl?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const upiUrl = body.upiUrl?.trim() || ''

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (upiUrl && !upiUrl.includes('://')) {
        return encryptedJson({ success: false, error: 'Enter a valid UPI intent URL (e.g. upi://pay?pa=...).' }, { status: 400 })
    }

    // Extracted separately so a scanned QR can be matched back to this
    // restaurant even if its own QR code's query params are ordered or
    // padded differently from what was pasted here.
    const upiVpa = upiUrl ? extractUpiVpa(upiUrl) : null
    if (upiUrl && !upiVpa) {
        return encryptedJson({ success: false, error: 'That UPI URL is missing a payee address (pa=...) — please check it and try again.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const result = await owners.updateOne(
            { restaurantId },
            upiVpa
                ? { $set: { upiUrl, upiVpa, updatedAt: new Date() } }
                : { $set: { upiUrl, updatedAt: new Date() }, $unset: { upiVpa: '' } }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'No restaurant account found for this restaurant ID.' }, { status: 404 })
        }

        return encryptedJson({ success: true, upiUrl })
    } catch (error) {
        console.error('Save UPI URL error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
