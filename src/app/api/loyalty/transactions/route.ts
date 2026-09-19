import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getTransactionsCollection, getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { restaurantImageUrl } from '../../../../../lib/restaurantImage'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim().toLowerCase()

    if (!userId) {
        return encryptedJson({ success: false, error: 'userId is required.' }, { status: 400 })
    }

    try {
        const transactionsCollection = await getTransactionsCollection()
        const rawResults = await transactionsCollection
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray()

        // Collapse near-duplicate transactions — same restaurant, amounts,
        // and reward, recorded within a few seconds of each other. These
        // could only come from the same payment being confirmed more than
        // once (a client-side race, now fixed at the source); this just
        // keeps any already-recorded duplicates from double-listing here.
        const DEDUPE_WINDOW_MS = 30_000
        const results: typeof rawResults = []
        for (const t of rawResults) {
            const isDuplicate = results.some(kept =>
                kept.restaurantId === t.restaurantId &&
                kept.amount === t.amount &&
                kept.finalAmount === t.finalAmount &&
                kept.discountAmount === t.discountAmount &&
                (kept.freeItemName || '') === (t.freeItemName || '') &&
                String(kept.cardId || '') === String(t.cardId || '') &&
                String(kept.itemId || '') === String(t.itemId || '') &&
                Math.abs(kept.createdAt.getTime() - t.createdAt.getTime()) <= DEDUPE_WINDOW_MS
            )
            if (!isDuplicate) results.push(t)
        }

        const restaurantIds = Array.from(new Set(results.map(t => t.restaurantId)))
        const owners = await getRestaurantOwnersCollection()
        const ownerDocs = restaurantIds.length > 0
            ? await owners.find({ restaurantId: { $in: restaurantIds } }).toArray()
            : []
        const nameByRestaurantId = new Map(ownerDocs.map(o => [o.restaurantId, o.restaurantName || o.restaurantId]))
        const imageUrlByRestaurantId = new Map(ownerDocs.map(o => [o.restaurantId, restaurantImageUrl(o.restaurantId as string, o.profileImageVersion)]))

        return encryptedJson({
            success: true,
            transactions: results.map(t => ({
                id: t._id.toString(),
                restaurantId: t.restaurantId,
                restaurantName: nameByRestaurantId.get(t.restaurantId) || t.restaurantId,
                restaurantImageUrl: imageUrlByRestaurantId.get(t.restaurantId) || null,
                amount: t.amount,
                discountAmount: t.discountAmount,
                discountType: t.discountType,
                discountValue: t.discountValue,
                finalAmount: t.finalAmount,
                freeItemName: t.freeItemName,
                createdAt: t.createdAt,
            })),
        })
    } catch (error) {
        console.error('List transactions error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
