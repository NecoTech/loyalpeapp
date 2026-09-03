import { NextResponse } from 'next/server'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'

export async function GET(request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
    const { restaurantId } = await params
    const normalizedId = restaurantId?.trim().toLowerCase()

    if (!normalizedId) {
        return NextResponse.json({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ restaurantId: normalizedId })

        if (!owner) {
            return NextResponse.json({ success: false, error: 'Restaurant not found.' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            restaurant: {
                id: normalizedId,
                name: owner.restaurantName || normalizedId,
                address: owner.address || null,
                phoneNumber: owner.phoneNumber || null,
                directionsUrl: owner.directionsUrl || null,
            },
        })
    } catch (error) {
        console.error('Get restaurant details error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
