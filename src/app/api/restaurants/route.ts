import { NextResponse } from 'next/server'
import { getRestaurantOwnersCollection } from '../../../../lib/mongodb'

/**
 * GET /api/restaurants
 *
 * Lists every restaurant on the platform (any owner account with a linked
 * restaurantId), for the customer-facing "find more rewards" browse page.
 */
export async function GET() {
    try {
        const owners = await getRestaurantOwnersCollection()
        const results = await owners
            .find({ restaurantId: { $exists: true, $ne: '' } })
            .project({ restaurantId: 1, restaurantName: 1 })
            .toArray()

        const restaurants = results
            .filter(owner => owner.restaurantId)
            .map(owner => ({
                id: owner.restaurantId as string,
                name: owner.restaurantName || (owner.restaurantId as string),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))

        return NextResponse.json({ success: true, restaurants })
    } catch (error) {
        console.error('List restaurants error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
