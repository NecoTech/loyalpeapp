import { encryptedJson, readEncryptedBody } from '../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection } from '../../../../lib/mongodb'
import { restaurantImageUrl } from '../../../../lib/restaurantImage'

/**
 * GET /api/restaurants?city=Bengaluru
 *
 * Lists every restaurant on the platform (any owner account with a linked
 * restaurantId), for the customer-facing "find more rewards" browse page.
 * When `city` is given, restaurants are filtered to that city — restaurants
 * that haven't set a city yet are still included so existing listings don't
 * disappear once location filtering rolls out.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')?.trim()

    try {
        const owners = await getRestaurantOwnersCollection()
        const query: Record<string, unknown> = { restaurantId: { $exists: true, $ne: '' } }
        if (city) {
            query.$or = [{ city }, { city: { $exists: false } }, { city: '' }]
        }

        const results = await owners
            .find(query)
            .project({ restaurantId: 1, restaurantName: 1, city: 1, category: 1, profileImageVersion: 1 })
            .toArray()

        const restaurants = results
            .filter(owner => owner.restaurantId)
            .map(owner => ({
                id: owner.restaurantId as string,
                name: owner.restaurantName || (owner.restaurantId as string),
                city: owner.city || null,
                category: owner.category || null,
                imageUrl: restaurantImageUrl(owner.restaurantId as string, owner.profileImageVersion),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))

        return encryptedJson({ success: true, restaurants })
    } catch (error) {
        console.error('List restaurants error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
