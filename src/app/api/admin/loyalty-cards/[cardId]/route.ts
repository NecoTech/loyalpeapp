import { encryptedJson, readEncryptedBody } from '../../../../../../lib/apiCrypto'
import { ObjectId } from 'mongodb'
import { getLoyaltyCardsCollection } from '../../../../../../lib/mongodb'

export async function PATCH(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
    const { cardId } = await params

    let body: { restaurantId?: string; name?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const name = body.name?.trim()

    if (!ObjectId.isValid(cardId)) {
        return encryptedJson({ success: false, error: 'Invalid card id.' }, { status: 400 })
    }
    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!name) {
        return encryptedJson({ success: false, error: 'Card name is required.' }, { status: 400 })
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const result = await cards.updateOne(
            { _id: new ObjectId(cardId), restaurantId },
            { $set: { name } }
        )

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'Card not found.' }, { status: 404 })
        }

        return encryptedJson({ success: true, card: { id: cardId, name } })
    } catch (error) {
        console.error('Update loyalty card error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
    const { cardId } = await params
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!ObjectId.isValid(cardId)) {
        return encryptedJson({ success: false, error: 'Invalid card id.' }, { status: 400 })
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const result = await cards.deleteOne({ _id: new ObjectId(cardId), restaurantId })

        if (result.deletedCount === 0) {
            return encryptedJson({ success: false, error: 'Card not found.' }, { status: 404 })
        }

        return encryptedJson({ success: true })
    } catch (error) {
        console.error('Delete loyalty card error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
