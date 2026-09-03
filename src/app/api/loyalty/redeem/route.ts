import { NextResponse } from 'next/server'
import { redeemLoyaltyReward } from '../../../../../lib/loyalty'

export async function POST(request: Request) {
    let body: {
        userId?: string
        restaurantId?: string
        cardId?: string
        itemId?: string
        amount?: number
    }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const userId = body.userId?.trim().toLowerCase()
    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const amount = Number(body.amount)

    if (!userId || !restaurantId) {
        return NextResponse.json({ success: false, error: 'userId and restaurantId are required.' }, { status: 400 })
    }

    try {
        const result = await redeemLoyaltyReward({
            userId,
            restaurantId,
            cardId: body.cardId,
            itemId: body.itemId,
            amount,
        })

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: result.status })
        }

        return NextResponse.json({
            success: true,
            transaction: result.transaction,
            nextCard: result.nextCard,
            nextActiveItem: result.nextActiveItem,
        })
    } catch (error) {
        console.error('Redeem loyalty reward error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
