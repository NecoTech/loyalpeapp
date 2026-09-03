import { NextResponse } from 'next/server'
import { getActiveCardReward } from '../../../../../lib/loyalty'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()
    const userId = searchParams.get('userId')?.trim().toLowerCase()

    if (!restaurantId || !userId) {
        return NextResponse.json({ success: false, error: 'restaurantId and userId are required.' }, { status: 400 })
    }

    try {
        const { card, activeItem } = await getActiveCardReward(restaurantId, userId)
        return NextResponse.json({ success: true, card, activeItem })
    } catch (error) {
        console.error('Get active reward error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
