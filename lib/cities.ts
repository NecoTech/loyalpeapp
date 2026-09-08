// The original fixed set of cities the app launched with — still used as
// the "Popular Cities" quick-pick list in every city picker, but no longer
// the only cities a restaurant or customer can use (see isValidCityName).
export const CITY_NAMES = [
    'Bengaluru',
    'Mumbai',
    'Delhi NCR',
    'Hyderabad',
    'Pune',
    'Kolkata',
    'Chennai',
    'Ahmedabad',
] as const

export type CityName = typeof CITY_NAMES[number]

// Trims and title-cases a city name so free-text input from different
// admins/customers ("bengaluru", "BENGALURU ") converges on the same
// stored string ("Bengaluru") — city filtering elsewhere is a plain string
// match, so this consistency is what makes it actually work.
export function normalizeCityName(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => (word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
        .join(' ')
}

// Light sanity check for a free-text city name — not restricted to
// CITY_NAMES, since restaurants (and customers browsing) can be in any
// city, not just the original 8.
export function isValidCityName(input: string): boolean {
    const trimmed = input.trim()
    return trimmed.length >= 2 && trimmed.length <= 60 && /^[a-zA-Z][a-zA-Z\s.'-]*$/.test(trimmed)
}
