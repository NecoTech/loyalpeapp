import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// A restaurant has two pictures: a square profile photo (shown in lists,
// transactions, etc.) and a wide banner (shown at the top of its details page).
export type RestaurantImageKind = 'profile' | 'banner'

// Restaurant pictures live on the server's local disk, one file per
// restaurant per kind. RESTAURANT_IMAGES_DIR can point this at a persistent
// volume in deployment; by default it's ./storage/restaurant-images next to
// the app. Kept outside /public on purpose: files added to /public after the
// app has started aren't reliably served in production, so pictures are read
// and returned by the image API routes instead.
function imagesDir() {
    return process.env.RESTAURANT_IMAGES_DIR || path.join(process.cwd(), 'storage', 'restaurant-images')
}

// The file name is a hash of the restaurant ID, never the ID itself — IDs are
// free text typed by the owner, so using one in a path could otherwise escape
// the folder (e.g. "../..") or collide with reserved names. One deterministic
// name per restaurant and kind is also what makes "replace the existing
// picture" a plain overwrite. Pictures are always stored as JPEG (see isJpeg).
// Profile photos keep the original bare-hash name so ones uploaded before
// banners existed are still found.
//
// The folder is decided at runtime (an env var, or the working directory) and
// holds uploads, not source files. Turbopack can't tell which files such a
// path might reach, so it would trace the whole project into the server
// output — the turbopackIgnore comments tell it this path isn't part of the
// build, which is what silences the "Dynamic filesystem access" warning.
function imagePathFor(restaurantId: string, kind: RestaurantImageKind) {
    const name = crypto.createHash('sha256').update(restaurantId).digest('hex').slice(0, 40)
    return path.join(/*turbopackIgnore: true*/ imagesDir(), kind === 'banner' ? `${name}-banner.jpg` : `${name}.jpg`)
}

// Writes to a temporary file and renames it over the real one, so a customer
// loading the page mid-upload gets either the old picture or the new one —
// never a half-written file — and the previous picture is replaced, not kept.
export async function saveRestaurantImage(restaurantId: string, bytes: Buffer, kind: RestaurantImageKind = 'profile') {
    const target = imagePathFor(restaurantId, kind)
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

export async function readRestaurantImage(restaurantId: string, kind: RestaurantImageKind = 'profile'): Promise<Buffer | null> {
    try {
        return await fs.readFile(/*turbopackIgnore: true*/ imagePathFor(restaurantId, kind))
    } catch (error: any) {
        if (error?.code === 'ENOENT') return null
        throw error
    }
}

export async function deleteRestaurantImage(restaurantId: string, kind: RestaurantImageKind = 'profile') {
    await fs.rm(imagePathFor(restaurantId, kind), { force: true })
}
