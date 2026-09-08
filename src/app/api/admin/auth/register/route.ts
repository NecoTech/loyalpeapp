import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRestaurantOwnersCollection } from '../../../../../../lib/mongodb'
import { isValidCityName, normalizeCityName } from '../../../../../../lib/cities'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
    let body: { email?: string; password?: string; restaurantName?: string; restaurantId?: string; city?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const restaurantName = body.restaurantName?.trim()
    const restaurantId = body.restaurantId?.trim().toLowerCase()
    const rawCity = body.city?.trim()
    const city = rawCity ? normalizeCityName(rawCity) : undefined

    if (!email || !EMAIL_REGEX.test(email)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!password || password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    if (!restaurantName) {
        return NextResponse.json({ success: false, error: 'Restaurant name is required.' }, { status: 400 })
    }
    if (city && !isValidCityName(city)) {
        return NextResponse.json({ success: false, error: 'Enter a valid city name.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()

        const existing = await owners.findOne({ email })
        if (existing) {
            return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        await owners.insertOne({
            email,
            passwordHash,
            restaurantName,
            restaurantId: restaurantId || undefined,
            city: city || undefined,
            createdAt: new Date(),
        })

        return NextResponse.json({
            success: true,
            owner: { email, restaurantName, restaurantId: restaurantId || null, city: city || null },
        }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 11000) {
            return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 })
        }
        console.error('Admin register error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
