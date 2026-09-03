import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb'

export type UserDocument = {
    fullname?: string
    email: string
    passwordHash: string
    phoneNumber?: string
    createdAt: Date
}

export type RestaurantOwnerDocument = {
    restaurantName?: string
    restaurantId?: string
    email: string
    passwordHash: string
    upiUrl?: string
    upiVpa?: string
    address?: string
    phoneNumber?: string
    directionsUrl?: string
    createdAt: Date
    updatedAt?: Date
}

export type LoyaltyRewardItemDocument = {
    _id: ObjectId
    stampsRequired: number
    rewardType: 'discount' | 'freeItem'
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    freeItemName?: string
}

export type LoyaltyCardDocument = {
    restaurantId: string
    name: string
    items: LoyaltyRewardItemDocument[]
    createdAt: Date
}

export type LoyaltyRedemptionDocument = {
    userId: string
    restaurantId: string
    cardId: ObjectId
    redeemedItemIds: ObjectId[]
    updatedAt: Date
}

export type OmniwareCredentialsDocument = {
    restaurantId: string
    apiKey: string
    salt: string
    gatewayUrl?: string
    responseUrl?: string
    mode: 'TEST' | 'LIVE'
    paymentOptions?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export type PaymentIntentDocument = {
    orderId: string
    restaurantId: string
    userId: string
    cardId?: string
    itemId?: string
    amount: number
    redirectPath: string
    status: 'pending' | 'completed' | 'failed'
    transactionId?: string
    createdAt: Date
    updatedAt: Date
}

export type TransactionDocument = {
    userId: string
    restaurantId: string
    cardId?: ObjectId
    itemId?: ObjectId
    amount: number
    discountAmount: number
    discountType?: 'percentage' | 'flat'
    discountValue?: number
    finalAmount: number
    freeItemName?: string
    createdAt: Date
}

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'loyaltyDB'

let clientPromise: Promise<MongoClient> | null = null

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
    if (!uri) {
        throw new Error('MONGODB_URI is not set. Add it to your .env.local file.')
    }

    if (process.env.NODE_ENV === 'development') {
        // Reuse the client across HMR reloads in dev so we don't open a new
        // connection on every file change.
        if (!global._mongoClientPromise) {
            global._mongoClientPromise = new MongoClient(uri).connect()
        }
        return global._mongoClientPromise
    }

    if (!clientPromise) {
        clientPromise = new MongoClient(uri).connect()
    }
    return clientPromise
}

export async function getDb(): Promise<Db> {
    const client = await getClientPromise()
    return client.db(dbName)
}

let usersIndexEnsured = false

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
    const db = await getDb()
    const collection = db.collection<UserDocument>('users')

    if (!usersIndexEnsured) {
        await collection.createIndex({ email: 1 }, { unique: true })
        usersIndexEnsured = true
    }

    return collection
}

let restaurantOwnersIndexEnsured = false

export async function getRestaurantOwnersCollection(): Promise<Collection<RestaurantOwnerDocument>> {
    const db = await getDb()
    const collection = db.collection<RestaurantOwnerDocument>('restaurantOwners')

    if (!restaurantOwnersIndexEnsured) {
        await collection.createIndex({ email: 1 }, { unique: true })
        await collection.createIndex({ upiVpa: 1 }, { sparse: true })
        restaurantOwnersIndexEnsured = true
    }

    return collection
}

let loyaltyCardsIndexEnsured = false

export async function getLoyaltyCardsCollection(): Promise<Collection<LoyaltyCardDocument>> {
    const db = await getDb()
    const collection = db.collection<LoyaltyCardDocument>('loyaltyCards')

    if (!loyaltyCardsIndexEnsured) {
        await collection.createIndex({ restaurantId: 1 })
        loyaltyCardsIndexEnsured = true
    }

    return collection
}

let loyaltyRedemptionsIndexEnsured = false

export async function getLoyaltyRedemptionsCollection(): Promise<Collection<LoyaltyRedemptionDocument>> {
    const db = await getDb()
    const collection = db.collection<LoyaltyRedemptionDocument>('loyaltyRedemptions')

    if (!loyaltyRedemptionsIndexEnsured) {
        await collection.createIndex({ userId: 1, cardId: 1 }, { unique: true })
        loyaltyRedemptionsIndexEnsured = true
    }

    return collection
}

let transactionsIndexEnsured = false

export async function getTransactionsCollection(): Promise<Collection<TransactionDocument>> {
    const db = await getDb()
    const collection = db.collection<TransactionDocument>('transactions')

    if (!transactionsIndexEnsured) {
        await collection.createIndex({ userId: 1, restaurantId: 1 })
        transactionsIndexEnsured = true
    }

    return collection
}

let omniwareCredentialsIndexEnsured = false

export async function getOmniwareCredentialsCollection(): Promise<Collection<OmniwareCredentialsDocument>> {
    const db = await getDb()
    const collection = db.collection<OmniwareCredentialsDocument>('omniwareCredentials')

    if (!omniwareCredentialsIndexEnsured) {
        await collection.createIndex({ restaurantId: 1 }, { unique: true })
        omniwareCredentialsIndexEnsured = true
    }

    return collection
}

let paymentIntentsIndexEnsured = false

export async function getPaymentIntentsCollection(): Promise<Collection<PaymentIntentDocument>> {
    const db = await getDb()
    const collection = db.collection<PaymentIntentDocument>('paymentIntents')

    if (!paymentIntentsIndexEnsured) {
        await collection.createIndex({ orderId: 1 }, { unique: true })
        paymentIntentsIndexEnsured = true
    }

    return collection
}
