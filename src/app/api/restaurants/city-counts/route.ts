import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'

/**
 * GET /api/restaurants/city-counts
 *
 * Number of live restaurants per city, for the city-picker UI to show a
 * real count instead of a static placeholder — one lightweight aggregate
 * covering every city (popular or custom), not just the curated shortlist.
 */
export async function GET() {
    try {
        const owners = await getRestaurantOwnersCollection()
        const results = await owners
            .find({ restaurantId: { $exists: true, $ne: '' }, city: { $exists: true, $ne: '' } })
            .project({ city: 1 })
            .toArray()

        const counts: Record<string, number> = {}
        for (const owner of results) {
            if (!owner.city) continue
            counts[owner.city] = (counts[owner.city] || 0) + 1
        }

        return encryptedJson({ success: true, counts })
    } catch (error) {
        console.error('City counts error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
