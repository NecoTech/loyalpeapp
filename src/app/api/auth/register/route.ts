import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '../../../../../lib/mongodb'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
    let body: { email?: string; password?: string; fullname?: string; phoneNumber?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const fullname = body.fullname?.trim()
    const phoneNumber = body.phoneNumber?.trim()

    if (!email || !EMAIL_REGEX.test(email)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!password || password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    try {
        const users = await getUsersCollection()

        const existing = await users.findOne({ email })
        if (existing) {
            return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        await users.insertOne({
            email,
            passwordHash,
            fullname,
            phoneNumber,
            createdAt: new Date(),
        })

        return NextResponse.json({
            success: true,
            user: { email, fullname: fullname || email, phoneNumber: phoneNumber || '' },
        }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 11000) {
            return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 })
        }
        console.error('Register error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
