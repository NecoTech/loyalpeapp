import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
    if (!transporter) {
        const user = process.env.EMAIL_USERNAME
        const pass = process.env.EMAIL_PASSWORD
        if (!user || !pass) {
            throw new Error('EMAIL_USERNAME / EMAIL_PASSWORD are not set. Add them to .env.local.')
        }
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        })
    }
    return transporter
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    await getTransporter().sendMail({
        from: `Loyalpe <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject: 'Reset your Loyalpe password',
        text: `We received a request to reset your Loyalpe password.\n\nReset it here (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1b1b;">
                <h2 style="color: #0040e0;">Reset your password</h2>
                <p>We received a request to reset your Loyalpe account password. This link is valid for 1 hour.</p>
                <p style="margin: 24px 0;">
                    <a href="${resetUrl}" style="background: #fd5835; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                </p>
                <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>${resetUrl}</p>
                <p style="font-size: 13px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    })
}
