// A business's category is short free text typed by the owner ("Cafe",
// "Bakery", "Hair Salon"...). Whitespace is tidied so "Cafe " and "Cafe" are
// the same thing; the letters' case is left as typed.
export function normalizeBusinessCategory(input: string) {
    return input.trim().replace(/\s+/g, ' ')
}

// Letters and numbers in any language, plus the punctuation real category
// names use ("Cafes & Roasters", "Men's Salon", "Sweets/Snacks", "Pet (Care)").
const CATEGORY_PATTERN = /^[\p{L}\p{N} &'’.,/()+-]{2,40}$/u

export function isValidBusinessCategory(value: string) {
    return CATEGORY_PATTERN.test(value)
}
