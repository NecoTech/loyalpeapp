import { NextResponse } from 'next/server'
import { getTransactionsCollection } from '../../../../../lib/mongodb'

/**
 * GET /api/loyalty/savings
 *
 * Sums the discount amount across every transaction for a user, across all
 * restaurants — powers the "Saved Money" tile on the home dashboard.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim().toLowerCase()

    if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required.' }, { status: 400 })
    }

    try {
        const transactionsCollection = await getTransactionsCollection()
        const [result] = await transactionsCollection.aggregate<{ totalSaved: number }>([
            { $match: { userId } },
            { $group: { _id: null, totalSaved: { $sum: '$discountAmount' } } },
        ]).toArray()

        return NextResponse.json({ success: true, totalSaved: result?.totalSaved || 0 })
    } catch (error) {
        console.error('Get savings total error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
