import { ObjectId } from 'mongodb'
import { getLoyaltyCardsCollection, getLoyaltyRedemptionsCollection, getTransactionsCollection, type LoyaltyRewardItemDocument } from './mongodb'

export type SerializedRewardItem = {
    id: string
    stampsRequired: number
    rewardType: 'discount' | 'freeItem'
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

export function serializeRewardItem(item: LoyaltyRewardItemDocument): SerializedRewardItem {
    return {
        id: item._id.toString(),
        stampsRequired: item.stampsRequired,
        rewardType: item.rewardType,
        discountType: item.discountType,
        discountValue: item.discountValue,
        freeItemName: item.freeItemName,
    }
}

/**
 * Finds the next reward the user hasn't redeemed yet for a restaurant.
 * Cards are checked in creation order — once every reward on a card has
 * been redeemed, this rolls over to the next card's rewards automatically.
 */
export async function getActiveCardReward(restaurantId: string, userId: string): Promise<{
    card: { id: string; name: string } | null
    activeItem: SerializedRewardItem | null
}> {
    const cardsCollection = await getLoyaltyCardsCollection()
    const cards = await cardsCollection
        .find({ restaurantId })
        .sort({ createdAt: 1 })
        .toArray()

    const cardsWithItems = cards.filter(c => c.items && c.items.length > 0)
    if (cardsWithItems.length === 0) {
        return { card: null, activeItem: null }
    }

    const redemptionsCollection = await getLoyaltyRedemptionsCollection()
    const redemptions = await redemptionsCollection
        .find({ userId, cardId: { $in: cardsWithItems.map(c => c._id) } })
        .toArray()
    const redeemedByCard = new Map(
        redemptions.map(r => [r.cardId.toString(), new Set(r.redeemedItemIds.map(id => id.toString()))])
    )

    for (const card of cardsWithItems) {
        const redeemedIds = redeemedByCard.get(card._id.toString()) || new Set<string>()
        const sortedItems = [...card.items].sort((a, b) => a.stampsRequired - b.stampsRequired)
        const activeItem = sortedItems.find(item => !redeemedIds.has(item._id.toString()))

        if (activeItem) {
            return {
                card: { id: card._id.toString(), name: card.name },
                activeItem: serializeRewardItem(activeItem),
            }
        }
    }

    return { card: null, activeItem: null }
}

export type CardWithRedemptionStatus = {
    id: string
    name: string
    items: (SerializedRewardItem & { redeemed: boolean })[]
}

/**
 * Lists every one of the restaurant's loyalty cards with each reward item
 * flagged as redeemed or not for the given user (all flagged false when no
 * userId is supplied, e.g. a signed-out visitor just browsing the cards).
 */
export async function getCardsWithRedemptionStatus(restaurantId: string, userId?: string): Promise<CardWithRedemptionStatus[]> {
    const cardsCollection = await getLoyaltyCardsCollection()
    const cards = await cardsCollection
        .find({ restaurantId })
        .sort({ createdAt: 1 })
        .toArray()

    const cardsWithItems = cards.filter(c => c.items && c.items.length > 0)
    if (cardsWithItems.length === 0) {
        return []
    }

    const redeemedByCard = new Map<string, Set<string>>()
    if (userId) {
        const redemptionsCollection = await getLoyaltyRedemptionsCollection()
        const redemptions = await redemptionsCollection
            .find({ userId, cardId: { $in: cardsWithItems.map(c => c._id) } })
            .toArray()
        redemptions.forEach(r => {
            redeemedByCard.set(r.cardId.toString(), new Set(r.redeemedItemIds.map(id => id.toString())))
        })
    }

    return cardsWithItems.map(card => {
        const redeemedIds = redeemedByCard.get(card._id.toString()) || new Set<string>()
        const sortedItems = [...card.items].sort((a, b) => a.stampsRequired - b.stampsRequired)
        return {
            id: card._id.toString(),
            name: card.name,
            items: sortedItems.map(item => ({
                ...serializeRewardItem(item),
                redeemed: redeemedIds.has(item._id.toString()),
            })),
        }
    })
}

export type RedeemLoyaltyParams = {
    userId: string
    restaurantId: string
    cardId?: string
    itemId?: string
    amount: number
}

export type RedeemLoyaltyTransaction = {
    amount: number
    discountAmount: number
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    finalAmount: number
    freeItemName?: string
}

export type RedeemLoyaltyResult =
    | {
        success: true
        transaction: RedeemLoyaltyTransaction
        nextCard: { id: string; name: string } | null
        nextActiveItem: SerializedRewardItem | null
    }
    | { success: false; error: string; status: number }

/**
 * Applies a customer's active loyalty reward (if any) to a payment amount,
 * marks it redeemed, records the transaction, and returns the next active
 * reward (rolled over to the next card if this one is now exhausted). Shared
 * by the in-app redeem endpoint and the Omniware hosted-checkout response
 * handler, so both finalize payments through the exact same logic.
 */
export async function redeemLoyaltyReward(params: RedeemLoyaltyParams): Promise<RedeemLoyaltyResult> {
    const { userId, restaurantId, amount } = params

    if (!Number.isFinite(amount) || amount < 0) {
        return { success: false, error: 'Enter a valid amount.', status: 400 }
    }

    let discountAmount = 0
    let discountType: 'percentage' | 'flat' | undefined
    let discountValue: number | undefined
    let finalAmount = amount
    let freeItemName: string | undefined
    let resolvedCardId: ObjectId | undefined
    let resolvedItemId: ObjectId | undefined
    let nextCard: { id: string; name: string } | null = null
    let nextActiveItem: SerializedRewardItem | null = null

    if (params.cardId && params.itemId) {
        if (!ObjectId.isValid(params.cardId) || !ObjectId.isValid(params.itemId)) {
            return { success: false, error: 'Invalid card or reward id.', status: 400 }
        }

        const cards = await getLoyaltyCardsCollection()
        const card = await cards.findOne({ _id: new ObjectId(params.cardId), restaurantId })
        if (!card) {
            return { success: false, error: 'Loyalty card not found.', status: 404 }
        }

        const item = card.items.find(i => i._id.toString() === params.itemId)
        if (!item) {
            return { success: false, error: 'Reward item not found.', status: 404 }
        }

        const redemptions = await getLoyaltyRedemptionsCollection()
        const redemption = await redemptions.findOne({ userId, cardId: card._id })
        const redeemedIds = new Set((redemption?.redeemedItemIds || []).map(id => id.toString()))

        if (redeemedIds.has(item._id.toString())) {
            return { success: false, error: 'This reward has already been redeemed.', status: 409 }
        }

        if (item.rewardType === 'discount') {
            discountAmount = item.discountType === 'flat'
                ? Math.min(item.discountValue || 0, amount)
                : Math.round((amount * (item.discountValue || 0)) / 100 * 100) / 100
            finalAmount = Math.max(amount - discountAmount, 0)
            discountType = item.discountType
            discountValue = item.discountValue
        } else {
            freeItemName = item.freeItemName
        }

        resolvedCardId = card._id
        resolvedItemId = item._id

        await redemptions.updateOne(
            { userId, cardId: card._id },
            { $addToSet: { redeemedItemIds: item._id }, $set: { restaurantId, updatedAt: new Date() } },
            { upsert: true }
        )

        // Re-check across all of the restaurant's cards — if this card's
        // rewards are now fully used up, roll over to the next card.
        const next = await getActiveCardReward(restaurantId, userId)
        nextCard = next.card
        nextActiveItem = next.activeItem
    }

    const transactions = await getTransactionsCollection()
    await transactions.insertOne({
        userId,
        restaurantId,
        cardId: resolvedCardId,
        itemId: resolvedItemId,
        amount,
        discountAmount,
        discountType,
        discountValue,
        finalAmount,
        freeItemName,
        createdAt: new Date(),
    })

    return {
        success: true,
        transaction: { amount, discountAmount, discountType, discountValue, finalAmount, freeItemName },
        nextCard,
        nextActiveItem,
    }
}
