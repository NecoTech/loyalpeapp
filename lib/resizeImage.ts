'use client'

const OUTPUT_SIZE = 512
const MAX_INPUT_BYTES = 15 * 1024 * 1024

// Center-crops the chosen picture to a square, scales it to 512x512 and
// re-encodes it as JPEG — so what gets uploaded is always a small, standard
// image regardless of what the owner picked (a 12MP phone photo becomes
// roughly 50-100KB). Returns the bare base64 payload.
export async function prepareRestaurantImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.')
    }
    if (file.size > MAX_INPUT_BYTES) {
        throw new Error('That image is too large. Please choose one under 15 MB.')
    }

    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file)
    } catch {
        throw new Error("Couldn't read that image. Please try a JPG or PNG.")
    }

    try {
        const side = Math.min(bitmap.width, bitmap.height)
        const sx = (bitmap.width - side) / 2
        const sy = (bitmap.height - side) / 2

        const canvas = document.createElement('canvas')
        canvas.width = OUTPUT_SIZE
        canvas.height = OUTPUT_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error("Couldn't process that image.")

        // JPEG has no transparency — put transparent PNGs on white, not black.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
        ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

        const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
        if (!blob) throw new Error("Couldn't process that image.")

        const bytes = new Uint8Array(await blob.arrayBuffer())
        let binary = ''
        const chunk = 0x8000
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
        }
        return btoa(binary)
    } finally {
        bitmap.close()
    }
}
