import { encryptedJson, readEncryptedBody } from '../../../../../../../../lib/apiCrypto'
import { ObjectId } from 'mongodb'
import { getLoyaltyCardsCollection } from '../../../../../../../../lib/mongodb'

export async function PATCH(request: Request, { params }: { params: Promise<{ cardId: string; itemId: string }> }) {
    const { cardId, itemId } = await params

    let body: {
        restaurantId?: string
        stampsRequired?: number
        rewardType?: 'discount' | 'freeItem'
        discountType?: 'percentage' | 'flat'
        discountValue?: number
        freeItemName?: string
    }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const stampsRequired = Number(body.stampsRequired)
    const rewardType = body.rewardType

    if (!ObjectId.isValid(cardId) || !ObjectId.isValid(itemId)) {
        return encryptedJson({ success: false, error: 'Invalid id.' }, { status: 400 })
    }
    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!Number.isInteger(stampsRequired) || stampsRequired < 1 || stampsRequired > 100) {
        return encryptedJson({ success: false, error: 'Stamps required must be a whole number between 1 and 100.' }, { status: 400 })
    }
    if (rewardType !== 'discount' && rewardType !== 'freeItem') {
        return encryptedJson({ success: false, error: 'Reward type must be either a discount or a free item.' }, { status: 400 })
    }

    const setFields: Record<string, unknown> = {
        'items.$[elem].stampsRequired': stampsRequired,
        'items.$[elem].rewardType': rewardType,
    }
    const unsetFields: Record<string, ''> = {}

    if (rewardType === 'discount') {
        const discountType = body.discountType === 'flat' ? 'flat' : 'percentage'
        const discountValue = Number(body.discountValue)
        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            return encryptedJson({ success: false, error: 'Enter a valid discount value.' }, { status: 400 })
        }
        setFields['items.$[elem].discountType'] = discountType
        setFields['items.$[elem].discountValue'] = discountValue
        unsetFields['items.$[elem].freeItemName'] = ''
    } else {
        const freeItemName = body.freeItemName?.trim()
        if (!freeItemName) {
            return encryptedJson({ success: false, error: 'Enter the name of the free item.' }, { status: 400 })
        }
        setFields['items.$[elem].freeItemName'] = freeItemName
        unsetFields['items.$[elem].discountType'] = ''
        unsetFields['items.$[elem].discountValue'] = ''
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const result = await cards.updateOne(
            { _id: new ObjectId(cardId), restaurantId },
            { $set: setFields, $unset: unsetFields },
            { arrayFilters: [{ 'elem._id': new ObjectId(itemId) }] }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'Card not found.' }, { status: 404 })
        }

        return encryptedJson({
            success: true,
            item: {
                id: itemId,
                stampsRequired,
                rewardType,
                discountType: rewardType === 'discount' ? (body.discountType === 'flat' ? 'flat' : 'percentage') : undefined,
                discountValue: rewardType === 'discount' ? Number(body.discountValue) : undefined,
                freeItemName: rewardType === 'freeItem' ? body.freeItemName?.trim() : undefined,
            },
        })
    } catch (error) {
        console.error('Update loyalty reward item error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ cardId: string; itemId: string }> }) {
    const { cardId, itemId } = await params
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!ObjectId.isValid(cardId) || !ObjectId.isValid(itemId)) {
        return encryptedJson({ success: false, error: 'Invalid id.' }, { status: 400 })
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const result = await cards.updateOne(
            { _id: new ObjectId(cardId), restaurantId },
            { $pull: { items: { _id: new ObjectId(itemId) } } }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'Card not found.' }, { status: 404 })
        }

        return encryptedJson({ success: true })
    } catch (error) {
        console.error('Delete loyalty reward item error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
