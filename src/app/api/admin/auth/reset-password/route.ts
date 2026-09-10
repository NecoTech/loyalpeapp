import { encryptedJson, readEncryptedBody } from '../../../../../../lib/apiCrypto'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getRestaurantOwnersCollection, getPasswordResetsCollection } from '../../../../../../lib/mongodb'

export async function POST(request: Request) {
    let body: { token?: string; password?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const token = body.token?.trim()
    const password = body.password
    if (!token) {
        return encryptedJson({ success: false, error: 'Missing reset token.' }, { status: 400 })
    }
    if (!password || password.length < 6) {
        return encryptedJson({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const resets = await getPasswordResetsCollection()
        // Scoped to accountType so a customer's reset token (if ever leaked
        // or shared) can never be redeemed against a restaurant account here.
        const resetDoc = await resets.findOne({ tokenHash, accountType: 'admin' })

        if (!resetDoc || resetDoc.expiresAt.getTime() < Date.now()) {
            return encryptedJson({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 })
        }

        const owners = await getRestaurantOwnersCollection()
        const passwordHash = await bcrypt.hash(password, 10)
        const result = await owners.updateOne({ email: resetDoc.userId }, { $set: { passwordHash } })

        if (result.matchedCount === 0) {
            return encryptedJson({ success: false, error: 'Account not found.' }, { status: 404 })
        }

        // One-time use — clear any outstanding reset tokens for this account.
        await resets.deleteMany({ userId: resetDoc.userId, accountType: 'admin' })

        return encryptedJson({ success: true })
    } catch (error) {
        console.error('Admin reset password error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
