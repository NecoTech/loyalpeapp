'use client'

import { secureFetch } from './secureFetch'

export type RecentShop = {
    id: string
    name: string
    category: string | null
    stamps: { redeemed: number; total: number } | null
}

// What the home page's two data cards (Saved Money, Recent Shops) show. A
// null field means "never fetched successfully" — as opposed to a real 0 / [].
export type HomeData = {
    totalSaved: number | null
    recentShops: RecentShop[] | null
}

// The home page keeps the last figures it fetched on the device so it can
// paint them the instant it opens and refresh them quietly in the background,
// instead of showing ₹0.00 / no shops until two requests come back. It is
// only ever shown to the account it was fetched for, and is wiped on logout.
const HOME_CACHE_KEY = 'loyalpe_home_cache'

type StoredHomeCache = HomeData & { userId: string }

export function readHomeCache(userId: string): HomeData | null {
    try {
        const raw = localStorage.getItem(HOME_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredHomeCache
        if (parsed?.userId !== userId) return null
        return {
            totalSaved: typeof parsed.totalSaved === 'number' ? parsed.totalSaved : null,
            recentShops: Array.isArray(parsed.recentShops) ? parsed.recentShops : null,
        }
    } catch {
        return null
    }
}

function writeHomeCache(userId: string, data: HomeData) {
    try {
        const stored: StoredHomeCache = { userId, ...data }
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(stored))
    } catch {
        // localStorage unavailable — the page just loads the slow way.
    }
}

export function clearHomeCache() {
    try {
        localStorage.removeItem(HOME_CACHE_KEY)
    } catch {
        // ignore
    }
}

// A refresh already under way for an account is shared rather than repeated —
// e.g. the one started at sign-in and the one the home page starts a moment
// later when it opens are the same request.
const inFlight = new Map<string, Promise<HomeData>>()

// Fetches both cards' data and saves it. The two requests run together and
// fail independently: a part that couldn't be fetched comes back null and the
// previously cached value for it is kept, so one flaky request never blanks
// a card that was fine a moment ago.
export function refreshHomeData(userId: string): Promise<HomeData> {
    const existing = inFlight.get(userId)
    if (existing) return existing

    const promise = fetchAndCacheHomeData(userId).finally(() => inFlight.delete(userId))
    inFlight.set(userId, promise)
    return promise
}

async function fetchAndCacheHomeData(userId: string): Promise<HomeData> {
    const encodedUserId = encodeURIComponent(userId)

    const [totalSaved, recentShops] = await Promise.all([
        secureFetch(`/api/loyalty/savings?userId=${encodedUserId}`)
            .then(({ data }) => (data?.success && Number.isFinite(Number(data.totalSaved)) ? Number(data.totalSaved) : null))
            .catch(err => {
                console.error('Failed to load savings total', err)
                return null
            }),
        secureFetch(`/api/loyalty/recent-shops?userId=${encodedUserId}`)
            .then(({ data }) => (data?.success && Array.isArray(data.shops) ? (data.shops as RecentShop[]) : null))
            .catch(err => {
                console.error('Failed to load recent shops', err)
                return null
            }),
    ])

    if (totalSaved !== null || recentShops !== null) {
        const cached = readHomeCache(userId)
        writeHomeCache(userId, {
            totalSaved: totalSaved ?? cached?.totalSaved ?? null,
            recentShops: recentShops ?? cached?.recentShops ?? null,
        })
    }

    return { totalSaved, recentShops }
}
