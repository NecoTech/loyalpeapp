import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import crypto from 'crypto'
import { getUsersCollection, getPasswordResetsCollection } from '../../../../../lib/mongodb'
import { sendPasswordResetEmail } from '../../../../../lib/mail'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(request: Request) {
    let body: { email?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    if (!email || !EMAIL_REGEX.test(email)) {
        return encryptedJson({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Always return the same generic response whether or not the email has
    // an account, so this endpoint can't be used to enumerate accounts.
    const genericResponse = encryptedJson({
        success: true,
        message: "If an account exists for that email, we've sent a password reset link.",
    })

    try {
        const users = await getUsersCollection()
        const user = await users.findOne({ email })
        if (!user) {
            return genericResponse
        }

        const rawToken = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

        const resets = await getPasswordResetsCollection()
        await resets.insertOne({
            userId: email,
            tokenHash,
            expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
            createdAt: new Date(),
        })

        const origin = request.headers.get('origin') || new URL(request.url).origin
        const resetUrl = `${origin}/reset-password?token=${rawToken}`
        await sendPasswordResetEmail(email, resetUrl)

        return genericResponse
    } catch (error) {
        console.error('Forgot password error:', error)
        return genericResponse
    }
}
