import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getCardsWithRedemptionStatus } from '../../../../../lib/loyalty'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()
    const userId = searchParams.get('userId')?.trim().toLowerCase() || undefined

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const cards = await getCardsWithRedemptionStatus(restaurantId, userId)
        return encryptedJson({ success: true, cards })
    } catch (error) {
        console.error('Get card progress error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
