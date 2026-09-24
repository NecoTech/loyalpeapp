import { encryptedJson } from '../../../../../lib/apiCrypto'
import { getLoyaltyCardsCollection, getRestaurantOwnersCollection } from '../../../../../lib/mongodb'

/**
 * GET /api/restaurants/city-counts
 *
 * Per-city numbers for the city-picker UI, so it shows real figures instead
 * of static placeholders — one lightweight pass covering every city (popular
 * or custom), not just the curated shortlist:
 *   counts — live restaurants in the city (also what orders the picker)
 *   deals  — rewards those restaurants currently offer: every reward item
 *            (a discount or a free item) on their loyalty cards
 */
export async function GET() {
    try {
        const owners = await getRestaurantOwnersCollection()
        const results = await owners
            .find({ restaurantId: { $exists: true, $ne: '' }, city: { $exists: true, $ne: '' } })
            .project({ city: 1, restaurantId: 1 })
            .toArray()

        const counts: Record<string, number> = {}
        const cityByRestaurant = new Map<string, string>()
        for (const owner of results) {
            if (!owner.city) continue
            counts[owner.city] = (counts[owner.city] || 0) + 1
            if (owner.restaurantId) cityByRestaurant.set(owner.restaurantId, owner.city)
        }

        const deals: Record<string, number> = {}
        if (cityByRestaurant.size > 0) {
            const cards = await getLoyaltyCardsCollection()
            const cardResults = await cards
                .find({ restaurantId: { $in: [...cityByRestaurant.keys()] } })
                .project({ restaurantId: 1, items: 1 })
                .toArray()

            for (const card of cardResults) {
                const city = cityByRestaurant.get(card.restaurantId)
                if (!city) continue
                deals[city] = (deals[city] || 0) + (card.items?.length ?? 0)
            }
        }

        return encryptedJson({ success: true, counts, deals })
    } catch (error) {
        console.error('City counts error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
