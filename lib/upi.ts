/**
 * Extracts the payee VPA (`pa` param, e.g. "restaurant@okhdfcbank") from a UPI
 * intent URL such as "upi://pay?pa=restaurant@okhdfcbank&pn=Name&cu=INR".
 * Used to match a scanned GPay/UPI QR code back to the restaurant that
 * registered that VPA as its payment address, regardless of extra/reordered
 * query params a specific UPI app's QR code might include.
 */
export function extractUpiVpa(raw: string): string | null {
    try {
        const url = new URL(raw.trim())
        const pa = url.searchParams.get('pa')
        return pa ? pa.trim().toLowerCase() : null
    } catch {
        return null
    }
}
