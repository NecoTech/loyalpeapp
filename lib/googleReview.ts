// Google Place IDs are URL-safe strings (letters, digits, "-" and "_"). Being
// strict here also means an ID can never smuggle anything unexpected into the
// review link built from it below.
const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,300}$/

export function isValidGooglePlaceId(value: string) {
    return PLACE_ID_PATTERN.test(value)
}

export function googleReviewUrl(placeId: string) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}
