import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// Restaurant pictures live on the server's local disk, one file per
// restaurant. RESTAURANT_IMAGES_DIR can point this at a persistent volume in
// deployment; by default it's ./storage/restaurant-images next to the app.
// Kept outside /public on purpose: files added to /public after the app has
// started aren't reliably served in production, so pictures are read and
// returned by the image API route instead.
function imagesDir() {
    return process.env.RESTAURANT_IMAGES_DIR || path.join(process.cwd(), 'storage', 'restaurant-images')
}

// The file name is a hash of the restaurant ID, never the ID itself — IDs are
// free text typed by the owner, so using one in a path could otherwise escape
// the folder (e.g. "../..") or collide with reserved names. One deterministic
// name per restaurant is also what makes "replace the existing picture" a
// plain overwrite. Pictures are always stored as JPEG (see isJpeg).
function imagePathFor(restaurantId: string) {
    const name = crypto.createHash('sha256').update(restaurantId).digest('hex').slice(0, 40)
    return path.join(imagesDir(), `${name}.jpg`)
}

// Writes to a temporary file and renames it over the real one, so a customer
// loading the page mid-upload gets either the old picture or the new one —
// never a half-written file — and the previous picture is replaced, not kept.
export async function saveRestaurantImage(restaurantId: string, bytes: Buffer) {
    const target = imagePathFor(restaurantId)
    const temp = `${target}.${crypto.randomBytes(6).toString('hex')}.tmp`

    await fs.mkdir(path.dirname(target), { recursive: true })
    try {
        await fs.writeFile(temp, bytes)
        await fs.rename(temp, target)
    } catch (error) {
        await fs.rm(temp, { force: true })
        throw error
    }
}

export async function readRestaurantImage(restaurantId: string): Promise<Buffer | null> {
    try {
        return await fs.readFile(imagePathFor(restaurantId))
    } catch (error: any) {
        if (error?.code === 'ENOENT') return null
        throw error
    }
}

export async function deleteRestaurantImage(restaurantId: string) {
    await fs.rm(imagePathFor(restaurantId), { force: true })
}
