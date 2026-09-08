'use client'

import { encrypt, decrypt } from './encryption'

export type SecureFetchResult<T = any> = { res: Response; data: T | null }

// Client-side counterpart to lib/apiCrypto.ts — encrypts the outgoing body
// and decrypts the response body with the same shared secret key. `res` is
// still the real fetch Response, so callers keep using res.ok/res.status
// exactly as before; only JSON parsing changes to decryption.
export async function secureFetch<T = any>(
    url: string,
    options?: { method?: string; body?: unknown }
): Promise<SecureFetchResult<T>> {
    const res = await fetch(url, {
        method: options?.method || 'GET',
        headers: options?.body !== undefined ? { 'Content-Type': 'text/plain' } : undefined,
        body: options?.body !== undefined ? encrypt(options.body) : undefined,
    })

    const text = await res.text()
    let data: T | null = null
    if (text) {
        try {
            data = decrypt(text) as T
        } catch (err) {
            console.error('Failed to decrypt response', err)
        }
    }

    return { res, data }
}
