import { NextResponse } from 'next/server'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { CITY_NAMES } from '../../../../../lib/cities'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')?.trim().toLowerCase()

    if (!restaurantId) {
        return NextResponse.json({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ restaurantId })
        return NextResponse.json({
            success: true,
            address: owner?.address || '',
            phoneNumber: owner?.phoneNumber || '',
            directionsUrl: owner?.directionsUrl || '',
            city: owner?.city || '',
        })
    } catch (error) {
        console.error('Fetch restaurant details error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    let body: { restaurantId?: string; address?: string; phoneNumber?: string; directionsUrl?: string; city?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const address = body.address?.trim() || ''
    const phoneNumber = body.phoneNumber?.trim() || ''
    const directionsUrl = body.directionsUrl?.trim() || ''
    const city = body.city?.trim() || ''

    if (!restaurantId) {
        return NextResponse.json({ success: false, error: 'restaurantId is required.' }, { status: 400 })
    }
    if (directionsUrl && !directionsUrl.includes('://')) {
        return NextResponse.json({ success: false, error: 'Enter a valid directions URL (e.g. a Google Maps link).' }, { status: 400 })
    }
    if (phoneNumber && !/^[+\d][\d\s-]{6,19}$/.test(phoneNumber)) {
        return NextResponse.json({ success: false, error: 'Enter a valid phone number.' }, { status: 400 })
    }
    if (city && !CITY_NAMES.includes(city as any)) {
        return NextResponse.json({ success: false, error: 'Please select a valid city.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const result = await owners.updateOne(
            { restaurantId },
            { $set: { address, phoneNumber, directionsUrl, city, updatedAt: new Date() } }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'No restaurant account found for this restaurant ID.' }, { status: 404 })
        }

        return NextResponse.json({ success: true, address, phoneNumber, directionsUrl, city })
    } catch (error) {
        console.error('Save restaurant details error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
