import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRestaurantOwnersCollection } from '../../../../../../lib/mongodb'

export async function POST(request: Request) {
    let body: { email?: string; password?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        const owner = await owners.findOne({ email })

        if (!owner) {
            return NextResponse.json({ success: false, error: 'No account found for this email.' }, { status: 404 })
        }

        const passwordMatches = await bcrypt.compare(password, owner.passwordHash)
        if (!passwordMatches) {
            return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 })
        }

        return NextResponse.json({
            success: true,
            owner: {
                email: owner.email,
                restaurantName: owner.restaurantName || '',
                restaurantId: owner.restaurantId || null,
            },
        })
    } catch (error) {
        console.error('Admin login error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
