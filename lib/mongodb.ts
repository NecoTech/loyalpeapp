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
    // The restaurant's Google Place ID. The customer-facing Review button
    // opens Google's write-a-review page for this place (see
    // lib/googleReview.ts). Set by the owner in the admin Profile tab.
    googlePlaceId?: string
    // Set (to the upload time, in ms) when the restaurant has a profile
    // picture. Used both as the "has an image" flag for list/detail APIs and
    // as a cache-busting version in the image URL. The picture itself is a
    // file on disk — see lib/restaurantImageStorage.ts.
    profileImageVersion?: number
    // What kind of business this is (e.g. "Cafe", "Bakery") — free text set
    // by the owner in the admin Profile tab, shown under the name on the
    // customer-facing shops page.
    category?: string
    city?: string
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

export type PasswordResetDocument = {
    userId: string // the account's email
    // Which collection this reset applies to — 'customer' for the users
    // collection, 'admin' for restaurantOwners. Lets both account types
    // share the same reset-token store without a token from one ever being
    // usable against the other's account.
    accountType: 'customer' | 'admin'
    tokenHash: string
    expiresAt: Date
    createdAt: Date
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
    // The payment gateway's order reference, when the transaction came from
    // an online payment. Uniquely indexed (sparse) so the same payment can
    // never be recorded twice, even if the client confirms it more than once.
    orderId?: string
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
        await collection.createIndex({ orderId: 1 }, { unique: true, sparse: true })
        transactionsIndexEnsured = true
    }

    return collection
}

let passwordResetsIndexEnsured = false

export async function getPasswordResetsCollection(): Promise<Collection<PasswordResetDocument>> {
    const db = await getDb()
    const collection = db.collection<PasswordResetDocument>('passwordResets')

    if (!passwordResetsIndexEnsured) {
        await collection.createIndex({ tokenHash: 1 }, { unique: true })
        // TTL index — Mongo automatically deletes a reset doc once its
        // expiresAt time has passed, so stale/used tokens don't pile up.
        await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        passwordResetsIndexEnsured = true
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
