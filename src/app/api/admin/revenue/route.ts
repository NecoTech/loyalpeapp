import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import { getTransactionsCollection, getUsersCollection } from '../../../../../lib/mongodb'

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return encryptedJson({ success: false, error: 'restaurantId is required.' }, { status: 400 })
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

        // Per-customer transaction counts, across every transaction (not
        // just the slice returned below) — powers the unique-customer count
        // and the repeat-customers list on the revenue dashboard.
        const customerStats = new Map<string, { count: number; totalSpent: number }>()
        for (const t of transactions) {
            const existing = customerStats.get(t.userId) || { count: 0, totalSpent: 0 }
            existing.count += 1
            existing.totalSpent += t.finalAmount || 0
            customerStats.set(t.userId, existing)
        }

        const repeatCustomerEntries = [...customerStats.entries()]
            .filter(([, s]) => s.count > 1)
            .sort((a, b) => b[1].count - a[1].count)

        // Look up real names for the repeat-customer list where available —
        // falls back to the userId (email) itself rather than a placeholder.
        const usersCollection = await getUsersCollection()
        const repeatUserIds = repeatCustomerEntries.map(([userId]) => userId)
        const userDocs = repeatUserIds.length
            ? await usersCollection.find({ email: { $in: repeatUserIds } }).toArray()
            : []
        const nameByUserId = new Map(userDocs.map(u => [u.email, u.fullname || u.email]))

        const repeatCustomers = repeatCustomerEntries.map(([userId, s]) => ({
            userId,
            name: nameByUserId.get(userId) || userId,
            transactionCount: s.count,
            totalSpent: Math.round(s.totalSpent * 100) / 100,
        }))

        return encryptedJson({
            success: true,
            stats: {
                totalRevenue,
                todayRevenue,
                transactionCount: transactions.length,
                avgTransactionValue: transactions.length ? totalRevenue / transactions.length : 0,
                totalDiscountGiven,
                freeItemsRedeemed,
                uniqueCustomerCount: customerStats.size,
                repeatCustomerCount: repeatCustomerEntries.length,
            },
            repeatCustomers,
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
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
