import { NextResponse } from 'next/server'
import { getRestaurantOwnersCollection } from '../../../../../lib/mongodb'
import { extractUpiVpa } from '../../../../../lib/upi'

/**
 * POST /api/restaurant/lookup-by-upi
 *
 * Given the raw text decoded from a scanned QR code, checks whether it's a
 * UPI intent URL whose payee address (pa=...) matches a restaurant that has
 * registered that same VPA as its Google Pay UPI URL (admin Profile tab).
 * Used by the scanner to jump straight to that restaurant's amount-entry
 * page instead of treating the scan as a generic app link.
 */
export async function POST(request: Request) {
    let body: { scanned?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
    }

    const scanned = body.scanned?.trim()
    if (!scanned) {
        return NextResponse.json({ success: false, error: 'scanned is required.' }, { status: 400 })
    }

    const vpa = extractUpiVpa(scanned)
    if (!vpa) {
        return NextResponse.json({ success: true, restaurant: null })
    }

    try {
        const owners = await getRestaurantOwnersCollection()
        let owner = await owners.findOne({ upiVpa: vpa, restaurantId: { $exists: true, $ne: '' } })

        if (!owner) {
            // Fallback for restaurants whose upiUrl was saved before upiVpa
            // existed (or was set directly in the database) — derive it from
            // the stored upiUrl at lookup time instead of requiring a resave.
            const candidates = await owners.find({
                upiUrl: { $exists: true, $ne: '' },
                restaurantId: { $exists: true, $ne: '' },
            }).toArray()

            const match = candidates.find(c => c.upiUrl && extractUpiVpa(c.upiUrl) === vpa)
            if (match) {
                owner = match
                // Backfill so the next lookup hits the fast indexed path.
                await owners.updateOne({ _id: match._id }, { $set: { upiVpa: vpa } })
            }
        }

        if (!owner?.restaurantId) {
            return NextResponse.json({ success: true, restaurant: null })
        }

        return NextResponse.json({
            success: true,
            restaurant: {
                id: owner.restaurantId,
                name: owner.restaurantName || owner.restaurantId,
            },
        })
    } catch (error) {
        console.error('Lookup restaurant by UPI VPA error:', error)
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}
