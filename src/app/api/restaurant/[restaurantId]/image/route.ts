import { readRestaurantImage } from '../../../../../../lib/restaurantImageStorage'

// Public — restaurant pictures are shown to every customer. The URL carries
// the picture's version (?v=), so a given URL never changes content and can be
// cached forever; uploading a new picture changes the URL instead.
export async function GET(_request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
    const { restaurantId } = await params
    const normalizedId = restaurantId?.trim().toLowerCase()

    if (!normalizedId) {
        return new Response('Not found', { status: 404 })
    }

    try {
        const bytes = await readRestaurantImage(normalizedId)

        if (!bytes) {
            return new Response('Not found', { status: 404 })
        }

        return new Response(new Uint8Array(bytes), {
            status: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': String(bytes.length),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch (error) {
        console.error('Get restaurant image error:', error)
        return new Response('Something went wrong', { status: 500 })
    }
}
