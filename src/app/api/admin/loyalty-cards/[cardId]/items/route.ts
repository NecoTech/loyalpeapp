import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getLoyaltyCardsCollection } from '../../../../../../../lib/mongodb'

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
    const { cardId } = await params

    let body: {
        restaurantId?: string
        stampsRequired?: number
        rewardType?: 'discount' | 'freeItem'
        discountType?: 'percentage' | 'flat'
        discountValue?: number
        freeItemName?: string
    }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const stampsRequired = Number(body.stampsRequired)
    const rewardType = body.rewardType

    if (!ObjectId.isValid(cardId)) {
        return NextResponse.json({ success: false, error: 'Invalid card id.' }, { status: 400 })
    }
    if (!restaurantId) {
        return NextResponse.json({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!Number.isInteger(stampsRequired) || stampsRequired < 1 || stampsRequired > 100) {
        return NextResponse.json({ success: false, error: 'Stamps required must be a whole number between 1 and 100.' }, { status: 400 })
    }
    if (rewardType !== 'discount' && rewardType !== 'freeItem') {
        return NextResponse.json({ success: false, error: 'Reward type must be either a discount or a free item.' }, { status: 400 })
    }

    const item: {
        _id: ObjectId
        stampsRequired: number
        rewardType: 'discount' | 'freeItem'
        discountType?: 'percentage' | 'flat'
        discountValue?: number
        freeItemName?: string
    } = {
        _id: new ObjectId(),
        stampsRequired,
        rewardType,
    }

    if (rewardType === 'discount') {
        const discountType = body.discountType === 'flat' ? 'flat' : 'percentage'
        const discountValue = Number(body.discountValue)
        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            return NextResponse.json({ success: false, error: 'Enter a valid discount value.' }, { status: 400 })
        }
        item.discountType = discountType
        item.discountValue = discountValue
    } else {
        const freeItemName = body.freeItemName?.trim()
        if (!freeItemName) {
            return NextResponse.json({ success: false, error: 'Enter the name of the free item.' }, { status: 400 })
        }
        item.freeItemName = freeItemName
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const result = await cards.updateOne(
            { _id: new ObjectId(cardId), restaurantId },
            { $push: { items: item } }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'Card not found.' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            item: {
                id: item._id.toString(),
                stampsRequired: item.stampsRequired,
                rewardType: item.rewardType,
                discountType: item.discountType,
                discountValue: item.discountValue,
                freeItemName: item.freeItemName,
            },
        }, { status: 201 })
    } catch (error) {
        console.error('Add loyalty reward item error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
