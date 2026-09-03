import { NextResponse } from 'next/server'
import { getTransactionsCollection } from '../../../../../lib/mongodb'

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return NextResponse.json({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const transactionsCollection = await getTransactionsCollection()
        const transactions = await transactionsCollection
            .find({ restaurantId })
            .sort({ createdAt: -1 })
            .toArray()

        const today = new Date()
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0)
        const todayTransactions = transactions.filter(t => isSameDay(new Date(t.createdAt), today))
        const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0)
        const totalDiscountGiven = transactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0)
        const freeItemsRedeemed = transactions.filter(t => t.freeItemName).length

        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue,
                todayRevenue,
                transactionCount: transactions.length,
                avgTransactionValue: transactions.length ? totalRevenue / transactions.length : 0,
                totalDiscountGiven,
                freeItemsRedeemed,
            },
            transactions: transactions.slice(0, 20).map(t => ({
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
        console.error('Get admin revenue error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
