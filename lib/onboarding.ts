const ONBOARDING_STORAGE_KEY = 'loyalpe_onboarding_seen'

export function hasSeenOnboarding(): boolean {
    try {
        return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
    } catch {
        return true
    }
}

export function markOnboardingSeen(): void {
    try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    } catch {
        // ignore write failures (private browsing, storage disabled, etc.)
    }
}
