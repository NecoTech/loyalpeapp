import crypto from 'crypto'

/**
 * Omniware hash algorithm (docs §15.1):
 *   1. Sort all non-empty POST parameters alphabetically by key name.
 *   2. Build: salt|value1|value2|... (pipe-delimited, sorted key order)
 *   3. hash = UPPER(SHA512(hashData))
 */
export function computeOmniwareHash(salt: string, params: Record<string, unknown>): string {
    const sortedKeys = Object.keys(params)
        .filter(k => params[k] !== '' && params[k] != null)
        .sort()

    const hashData = salt + '|' + sortedKeys.map(k => String(params[k]).trim()).join('|')

    return crypto
        .createHash('sha512')
        .update(hashData)
        .digest('hex')
        .toUpperCase()
}

/**
 * Strips the known trailing path off a configured gateway URL, leaving the
 * PG base domain. Returns null if nothing is configured, or if the value is
 * still the literal `{pg_api_url}` placeholder from .env.local — treating
 * that as "not configured" avoids a cryptic DNS lookup failure at fetch time.
 */
export function resolvePgBaseUrl(gatewayUrl?: string | null): string | null {
    const configured = gatewayUrl || process.env.OMNIWARE_GATEWAY_URL
    if (!configured || configured.includes('{pg_api_url}')) return null
    return configured.replace('/v2/paymentrequest', '')
}

export type OmniwareStatusResult = {
    success: boolean
    txnStatus: 'SUCCESS' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'UNKNOWN'
    message?: string
    transactionId?: string | null
    paymentMode?: string | null
    paymentChannel?: string | null
    amount?: string | number | null
    responseCode?: string
    errorCode?: number
    data?: unknown
}

/**
 * Queries Omniware's Payment Status API (docs §6) and normalizes the result
 * into a consistent SUCCESS/PENDING/CANCELLED/FAILED shape. Shared by the
 * check-payment-status route (client-triggered polling) and the response
 * webhook route (server-to-server confirmation after a hosted-checkout
 * redirect).
 */
export async function queryOmniwareStatus(pgBaseUrl: string, apiKey: string, salt: string, orderId: string): Promise<OmniwareStatusResult> {
    const statusParams: Record<string, unknown> = { api_key: apiKey, order_id: orderId }
    const hash = computeOmniwareHash(salt, statusParams)
    const statusUrl = `${pgBaseUrl}/v2/paymentstatus`

    const formBody = new URLSearchParams({ api_key: apiKey, order_id: orderId, hash })

    const pgResponse = await fetch(statusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
    })

    const pgData = await pgResponse.json()

    if (pgData.error) {
        const errCode = pgData.error.code
        const errMsg = pgData.error.message

        // 1028 = No Transaction Found, 1050 = No Record Found — payment
        // hasn't reached Omniware yet, still pending.
        if (errCode === 1028 || errCode === 1050) {
            return {
                success: true,
                txnStatus: 'PENDING',
                message: 'No transaction found for this order. Payment may still be pending.',
            }
        }

        return {
            success: false,
            txnStatus: 'UNKNOWN',
            message: errMsg || 'Status check failed',
            errorCode: errCode,
        }
    }

    const transactions = pgData.data

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
            success: true,
            txnStatus: 'PENDING',
            message: 'No transactions found for this order.',
        }
    }

    // Most recent transaction — Omniware returns results newest-first.
    const txn = transactions[0]
    const responseCode = String(txn.response_code)
    const responseMessage = txn.response_message || ''

    let txnStatus: OmniwareStatusResult['txnStatus']
    if (responseCode === '0') {
        txnStatus = 'SUCCESS'
    } else if (['1006', '1088', '1030'].includes(responseCode)) {
        txnStatus = 'PENDING'
    } else if (['1043', '1029', '1084'].includes(responseCode)) {
        txnStatus = 'CANCELLED'
    } else {
        txnStatus = 'FAILED'
    }

    return {
        success: true,
        txnStatus,
        message: responseMessage,
        transactionId: txn.transaction_id || null,
        paymentMode: txn.payment_mode || null,
        paymentChannel: txn.payment_channel || null,
        amount: txn.amount || null,
        responseCode,
        data: txn,
    }
}
