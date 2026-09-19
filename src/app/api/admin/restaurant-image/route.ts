import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { isJpeg, MAX_RESTAURANT_IMAGE_BYTES, restaurantImageUrl } from '../../../../../lib/restaurantImage'
import { deleteRestaurantImage, saveRestaurantImage } from '../../../../../lib/restaurantImageStorage'

export async function POST(request: Request) {
    let body: { restaurantId?: string; imageBase64?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    // Accept a full data URL as well as bare base64.
    const base64 = body.imageBase64?.replace(/^data:[^;]+;base64,/, '').trim()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!base64) {
        return encryptedJson({ success: false, error: 'Choose an image to upload.' }, { status: 400 })
    }
    // Reject oversized payloads before decoding them (base64 is ~4/3 the size).
    if (base64.length > Math.ceil(MAX_RESTAURANT_IMAGE_BYTES * 4 / 3) + 8) {
        return encryptedJson({ success: false, error: 'That image is too large. Please choose a smaller one.' }, { status: 413 })
    }

    const bytes = Buffer.from(base64, 'base64')
    if (bytes.length === 0 || bytes.length > MAX_RESTAURANT_IMAGE_BYTES) {
        return encryptedJson({ success: false, error: 'That image is too large. Please choose a smaller one.' }, { status: 413 })
    }
    if (!isJpeg(bytes)) {
        return encryptedJson({ success: false, error: 'That file isn\'t a valid image. Please choose a JPG, PNG or WebP photo.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ restaurantId }, { projection: { _id: 1 } })
        if (!owner) {
            return encryptedJson({ success: false, error: 'No restaurant account found for this restaurant ID.' }, { status: 404 })
        }

        // Overwrites this restaurant's existing picture, if it has one.
        await saveRestaurantImage(restaurantId, bytes)

        // Bumping the version gives the picture a new URL, so customers never
        // see the old one from cache.
        const version = Date.now()
        await owners.updateOne({ restaurantId }, { $set: { profileImageVersion: version, updatedAt: new Date() } })

        return encryptedJson({ success: true, imageUrl: restaurantImageUrl(restaurantId, version) })
    } catch (error) {
        console.error('Upload restaurant image error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const result = await owners.updateOne(
            { restaurantId },
            { $unset: { profileImageVersion: '' }, $set: { updatedAt: new Date() } }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'No restaurant account found for this restaurant ID.' }, { status: 404 })
        }

        await deleteRestaurantImage(restaurantId)

        return encryptedJson({ success: true })
    } catch (error) {
        console.error('Delete restaurant image error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
