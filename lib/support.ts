// Loyalpe's customer support contact details — one place, so the profile
// page's Contact & Support modal and anything that reaches support (like the
// "be an agent" WhatsApp hand-off) always use the same number.
export const SUPPORT_EMAIL = 'odertechnology@gmail.com'

// 10-digit Indian mobile number, without the country code.
export const SUPPORT_PHONE = '7736570463'

// Opens a WhatsApp chat with support with `message` pre-filled. Nothing is
// sent until the person taps send inside WhatsApp.
export function supportWhatsAppUrl(message: string) {
    return `https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`
}
