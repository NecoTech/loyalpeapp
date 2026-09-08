import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getUsersCollection, getPasswordResetsCollection } from '../../../../../lib/mongodb'

export async function POST(request: Request) {
    let body: { token?: string; password?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const token = body.token?.trim()
    const password = body.password
    if (!token) {
        return NextResponse.json({ success: false, error: 'Missing reset token.' }, { status: 400 })
    }
    if (!password || password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const resets = await getPasswordResetsCollection()
        const resetDoc = await resets.findOne({ tokenHash })

        if (!resetDoc || resetDoc.expiresAt.getTime() < Date.now()) {
            return NextResponse.json({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 })
        }

        const users = await getUsersCollection()
        const passwordHash = await bcrypt.hash(password, 10)
        const result = await users.updateOne({ email: resetDoc.userId }, { $set: { passwordHash } })

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
        }

        // One-time use — clear any outstanding reset tokens for this account.
        await resets.deleteMany({ userId: resetDoc.userId })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
