import { restaurantImageResponse } from '../../../../../../lib/restaurantImageResponse'

export async function GET(_request: Request, { params }: { params: Promise<{ restaurantId: string }> }) {
    const { restaurantId } = await params
    return restaurantImageResponse(restaurantId, 'banner')
}
