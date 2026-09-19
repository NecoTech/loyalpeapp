// Uploaded restaurant pictures are re-encoded to a small square JPEG in the
// browser before upload (see lib/resizeImage.ts), so this cap is generous —
// it exists so the server never has to trust the client to have done that.
export const MAX_RESTAURANT_IMAGE_BYTES = 400 * 1024

// The server only accepts JPEG, identified by its actual bytes rather than by
// anything the client claims (filename, MIME type). The browser always
// converts to JPEG before uploading, so nothing else is ever legitimately
// sent — and refusing SVG and other script-capable formats matters because
// these files are served from our own origin.
export function isJpeg(buf: Buffer) {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
}

// `version` is the restaurant's profileImageVersion; it goes in the URL so a
// re-upload changes the address and browsers never show a stale picture.
export function restaurantImageUrl(restaurantId: string, version?: number | null): string | null {
    if (!version) return null
    return `/api/restaurant/${encodeURIComponent(restaurantId)}/image?v=${version}`
}
