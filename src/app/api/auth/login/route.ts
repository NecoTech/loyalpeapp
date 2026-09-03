import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '../../../../../lib/mongodb'

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
        const users = await getUsersCollection()
        const user = await users.findOne({ email })

        if (!user) {
            return NextResponse.json({ success: false, error: 'No account found for this email.' }, { status: 404 })
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatches) {
            return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 })
        }

        return NextResponse.json({
            success: true,
            user: {
                email: user.email,
                fullname: user.fullname || user.email,
                phoneNumber: user.phoneNumber || '',
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
