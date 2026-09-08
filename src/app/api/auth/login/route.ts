import { encryptedJson, readEncryptedBody } from '../../../../../lib/apiCrypto'
import bcrypt from 'bcryptjs'
import { getUsersCollection } from '../../../../../lib/mongodb'

export async function POST(request: Request) {
    let body: { email?: string; password?: string }
    try {
        body = await readEncryptedBody(request)
    } catch {
        return encryptedJson({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
        return encryptedJson({ success: false, error: 'Email and password are required.' }, { status: 400 })
    }

    try {
        const users = await getUsersCollection()
        const user = await users.findOne({ email })

        if (!user) {
            return encryptedJson({ success: false, error: 'No account found for this email.' }, { status: 404 })
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatches) {
            return encryptedJson({ success: false, error: 'Incorrect password.' }, { status: 401 })
        }

        return encryptedJson({
            success: true,
            user: {
                email: user.email,
                fullname: user.fullname || user.email,
                phoneNumber: user.phoneNumber || '',
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return encryptedJson({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
