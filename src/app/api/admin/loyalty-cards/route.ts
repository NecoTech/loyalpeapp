import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getLoyaltyCardsCollection } from '../../../../../lib/mongodb'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const results = await cards
            .find({ restaurantId })
            .sort({ createdAt: -1 })
            .toArray()

        return encryptedJson({
            success: true,
            cards: results.map(card => ({
                id: card._id.toString(),
                name: card.name,
                createdAt: card.createdAt,
                items: (card.items || []).map(item => ({
                    id: item._id.toString(),
                    stampsRequired: item.stampsRequired,
                    rewardType: item.rewardType,
                    discountType: item.discountType,
                    discountValue: item.discountValue,
                    freeItemName: item.freeItemName,
                })),
            })),
        })
    } catch (error) {
        console.error('List loyalty cards error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    let body: { restaurantId?: string; name?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const name = body.name?.trim()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (!name) {
        return encryptedJson({ success: false, error: 'Card name is required.' }, { status: 400 })
    }

    try {
        const cards = await getLoyaltyCardsCollection()
        const doc = {
            restaurantId,
            name,
            items: [],
            createdAt: new Date(),
        }
        const result = await cards.insertOne(doc)

        return encryptedJson({
            success: true,
            card: { id: result.insertedId.toString(), name, items: [], createdAt: doc.createdAt },
        }, { status: 201 })
    } catch (error) {
        console.error('Create loyalty card error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
