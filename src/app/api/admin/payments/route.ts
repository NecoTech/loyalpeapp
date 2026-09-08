import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getTransactionsCollection } from '../../../../../lib/mongodb'

const MAX_RESULTS = 500

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    const query: Record<string, unknown> = { restaurantId }

    if (startDateParam || endDateParam) {
        const createdAt: Record<string, Date> = {}

        if (startDateParam) {
            const start = new Date(startDateParam)
            if (isNaN(start.getTime())) {
                return encryptedJson({ success: false, error: 'Invalid startDate.' }, { status: 400 })
            }
            // startDateParam is a date-only string ("YYYY-MM-DD"), which the
            // Date constructor parses as UTC midnight — use the UTC setter
            // here too, otherwise this shifts by the server's local offset.
            start.setUTCHours(0, 0, 0, 0)
            createdAt.$gte = start
        }

        if (endDateParam) {
            const end = new Date(endDateParam)
            if (isNaN(end.getTime())) {
                return encryptedJson({ success: false, error: 'Invalid endDate.' }, { status: 400 })
            }
            end.setUTCHours(23, 59, 59, 999)
            createdAt.$lte = end
        }

        query.createdAt = createdAt
    }

    try {
        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .limit(MAX_RESULTS)
            .toArray()

        const totalAmount = transactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0)

        return encryptedJson({
            success: true,
            totalAmount,
            count: transactions.length,
            transactions: transactions.map(t => ({
                id: t._id.toString(),
                userId: t.userId,
                amount: t.amount,
                discountAmount: t.discountAmount,
                finalAmount: t.finalAmount,
                freeItemName: t.freeItemName,
                createdAt: t.createdAt,
            })),
        })
    } catch (error) {
        console.error('Get admin payments error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
