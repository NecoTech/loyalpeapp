import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '../../../../../lib/mongodb'

export async function PATCH(request: Request) {
    let body: { email?: string; fullname?: string; phoneNumber?: string; newPassword?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    if (!email) {
        return NextResponse.json({ success: false, error: 'Missing account email.' }, { status: 400 })
    }

    const update: { fullname?: string; phoneNumber?: string; passwordHash?: string } = {}
    if (typeof body.fullname === 'string' && body.fullname.trim()) {
        update.fullname = body.fullname.trim()
    }
    if (typeof body.phoneNumber === 'string') {
        update.phoneNumber = body.phoneNumber.trim()
    }
    if (typeof body.newPassword === 'string' && body.newPassword.length > 0) {
        if (body.newPassword.length < 6) {
            return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
        }
        update.passwordHash = await bcrypt.hash(body.newPassword, 10)
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ success: false, error: 'Nothing to update.' }, { status: 400 })
    }

    try {
        const users = await getUsersCollection()
        const result = await users.findOneAndUpdate(
            { email },
            { $set: update },
            { returnDocument: 'after' }
        )

        if (!result) {
            return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            user: {
                email: result.email,
                fullname: result.fullname || result.email,
                phoneNumber: result.phoneNumber || '',
            },
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    let body: { email?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    if (!email) {
        return NextResponse.json({ success: false, error: 'Missing account email.' }, { status: 400 })
    }

    try {
        const users = await getUsersCollection()
        const result = await users.deleteOne({ email })

        if (result.deletedCount === 0) {
            return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete account error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
