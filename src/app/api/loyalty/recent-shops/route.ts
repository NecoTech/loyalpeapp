import { encryptedJson } from '../../../../../lib/apiCrypto'
import { getRestaurantOwnersCollection, getTransactionsCollection } from '../../../../../lib/mongodb'
import { getCardsWithRedemptionStatus } from '../../../../../lib/loyalty'

const MAX_RECENT_SHOPS = 10

/**
 * GET /api/loyalty/recent-shops?userId=...
 *
 * The shops this customer has actually paid at, most recently visited first,
 * each with the customer's stamp progress — powers the "Recent Shops" row on
 * the home page.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim().toLowerCase()

    if (!userId) {
        return encryptedJson({ success: false, error: 'userId is required.' }, { status: 400 })
    }

    try {
        const transactions = await getTransactionsCollection()
        const latestPerShop = await transactions
            .aggregate<{ _id: string; lastVisitAt: Date }>([
                { $match: { userId } },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$restaurantId', lastVisitAt: { $first: '$createdAt' } } },
                { $sort: { lastVisitAt: -1 } },
                { $limit: MAX_RECENT_SHOPS },
            ])
            .toArray()

        if (latestPerShop.length === 0) {
            return encryptedJson({ success: true, shops: [] })
        }

        const owners = await getRestaurantOwnersCollection()
        const ownerDocs = await owners
            .find({ restaurantId: { $in: latestPerShop.map(s => s._id) } })
            .project({ restaurantId: 1, restaurantName: 1, category: 1 })
            .toArray()
        const ownerById = new Map(ownerDocs.map(o => [o.restaurantId as string, o]))

        // A shop whose account no longer exists has no details page to open,
        // so it's left out rather than shown as a dead card.
        const shops = await Promise.all(
            latestPerShop
                .filter(s => ownerById.has(s._id))
                .map(async s => {
                    const owner = ownerById.get(s._id)!
                    const cards = await getCardsWithRedemptionStatus(s._id, userId)

                    // Same card the payment page shows: the first one still
                    // in progress, or the last one if every card is complete.
                    const card = cards.find(c => c.items.some(i => !i.redeemed)) ?? cards[cards.length - 1]
                    const stamps = card
                        ? { redeemed: card.items.filter(i => i.redeemed).length, total: card.items.length }
                        : null

                    return {
                        id: s._id,
                        name: owner.restaurantName || s._id,
                        category: owner.category || null,
                        stamps,
                        lastVisitAt: s.lastVisitAt,
                    }
                })
        )

        return encryptedJson({ success: true, shops })
    } catch (error) {
        console.error('Get recent shops error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
