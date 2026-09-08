import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { redeemLoyaltyReward } from '../../../../../lib/loyalty'

export async function POST(request: Request) {
    let body: {
        userId?: string
        restaurantId?: string
        cardId?: string
        itemId?: string
        amount?: number
        orderId?: string
    }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const userId = body.userId?.trim().toLowerCase()
    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const amount = Number(body.amount)

    if (!userId || !restaurantId) {
        return encryptedJson({ success: false, error: 'userId and restaurantId are required.' }, { status: 400 })
    }

    try {
        const result = await redeemLoyaltyReward({
            userId,
            restaurantId,
            cardId: body.cardId,
            itemId: body.itemId,
            amount,
            orderId: body.orderId?.trim() || undefined,
        })

        if (!result.success) {
            return encryptedJson({ success: false, error: result.error }, { status: result.status })
        }

        return encryptedJson({
            success: true,
            transaction: result.transaction,
            nextCard: result.nextCard,
            nextActiveItem: result.nextActiveItem,
        })
    } catch (error) {
        console.error('Redeem loyalty reward error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
