import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { isValidCityName, normalizeCityName } from '../../../../../lib/cities'
import { isValidGooglePlaceId } from '../../../../../lib/googleReview'
import { isValidBusinessCategory, normalizeBusinessCategory } from '../../../../../lib/businessCategory'

// These URLs become clickable links shown to customers, so only real web
// links are accepted — a bare "://" check would let through schemes like
// javascript:// that run script when tapped.
function isHttpUrl(value: string) {
    try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
    } catch {
        return false
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ restaurantId })
        return encryptedJson({
            success: true,
            address: owner?.address || '',
            phoneNumber: owner?.phoneNumber || '',
            directionsUrl: owner?.directionsUrl || '',
            googlePlaceId: owner?.googlePlaceId || '',
            category: owner?.category || '',
            city: owner?.city || '',
        })
    } catch (error) {
        console.error('Fetch restaurant details error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    let body: { restaurantId?: string; address?: string; phoneNumber?: string; directionsUrl?: string; googlePlaceId?: string; category?: string; city?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const address = body.address?.trim() || ''
    const phoneNumber = body.phoneNumber?.trim() || ''
    const directionsUrl = body.directionsUrl?.trim() || ''
    const googlePlaceId = body.googlePlaceId?.trim() || ''
    const city = body.city?.trim() ? normalizeCityName(body.city.trim()) : ''
    // Only touched when the client sends it, so a request that omits the
    // field can't accidentally wipe a saved category.
    const category = typeof body.category === 'string' ? normalizeBusinessCategory(body.category) : undefined

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (directionsUrl && !isHttpUrl(directionsUrl)) {
        return encryptedJson({ success: false, error: 'Enter a valid directions URL (e.g. a Google Maps link).' }, { status: 400 })
    }
    if (googlePlaceId && !isValidGooglePlaceId(googlePlaceId)) {
        return encryptedJson({ success: false, error: 'Enter just the Google Place ID (letters, numbers, - and _ only, e.g. ChIJ...), not a link.' }, { status: 400 })
    }
    if (phoneNumber && !/^[+\d][\d\s-]{6,19}$/.test(phoneNumber)) {
        return encryptedJson({ success: false, error: 'Enter a valid phone number.' }, { status: 400 })
    }
    if (city && !isValidCityName(city)) {
        return encryptedJson({ success: false, error: 'Enter a valid city name.' }, { status: 400 })
    }
    if (category && !isValidBusinessCategory(category)) {
        return encryptedJson({ success: false, error: 'Enter a business category of 2–40 characters (letters, numbers, spaces and & \' . , / ( ) + - only), e.g. Cafe or Bakery.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const result = await owners.updateOne(
            { restaurantId },
            { $set: { address, phoneNumber, directionsUrl, googlePlaceId, city, ...(category !== undefined && { category }), updatedAt: new Date() } }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'No restaurant account found for this restaurant ID.' }, { status: 404 })
        }

        const saved = await owners.findOne({ restaurantId }, { projection: { category: 1 } })
        return encryptedJson({ success: true, address, phoneNumber, directionsUrl, googlePlaceId, category: saved?.category || '', city })
    } catch (error) {
        console.error('Save restaurant details error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
