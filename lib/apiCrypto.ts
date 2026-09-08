import { encrypt, decrypt } from './encryption'

// Server-side helpers used by API routes to AES-encrypt response bodies
// and decrypt request bodies with the shared secret key, so the raw JSON
// payload isn't sitting in plain text on the wire. Pair of lib/secureFetch.ts
// on the client.
export async function readEncryptedBody<T = any>(request: Request): Promise<T> {
    const raw = await request.text()
    return decrypt(raw) as T
}

export function encryptedJson(data: unknown, init?: { status?: number }): Response {
    return new Response(encrypt(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
