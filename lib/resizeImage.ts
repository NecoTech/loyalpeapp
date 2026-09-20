'use client'

const MAX_INPUT_BYTES = 15 * 1024 * 1024

type OutputSpec = { width: number; height: number; quality: number }

// Center-crops the chosen picture to the output's aspect ratio, scales it to
// the exact output size and re-encodes it as JPEG — so what gets uploaded is
// always a small, standard image regardless of what the owner picked (a 12MP
// phone photo becomes roughly 50-200KB). Returns the bare base64 payload.
async function prepareImage(file: File, { width, height, quality }: OutputSpec): Promise<string> {
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
        // Largest region of the picture, centered, with the output's shape.
        const targetRatio = width / height
        let sw = bitmap.width
        let sh = bitmap.height
        if (sw / sh > targetRatio) sw = sh * targetRatio
        else sh = sw / targetRatio
        const sx = (bitmap.width - sw) / 2
        const sy = (bitmap.height - sh) / 2

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error("Couldn't process that image.")

        // JPEG has no transparency — put transparent PNGs on white, not black.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)

        const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
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

// Square profile photo.
export function prepareRestaurantImage(file: File) {
    return prepareImage(file, { width: 512, height: 512, quality: 0.85 })
}

// Wide 2:1 banner — roughly the shape of the hero area on the details page.
export function prepareRestaurantBanner(file: File) {
    return prepareImage(file, { width: 1200, height: 600, quality: 0.82 })
}
