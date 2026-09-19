'use client'

import { useState, type ReactNode } from 'react'

// A restaurant's uploaded picture, falling back to whatever the caller passes
// (usually the initials/icon it showed before pictures existed) when the
// restaurant hasn't uploaded one or the image fails to load. The fallback is
// supplied by each page because the surrounding box (size, colors, shape) is
// page-specific — this only swaps what's inside it.
export default function RestaurantPhoto({
    src, alt, className, fallback,
}: {
    src?: string | null
    alt: string
    className?: string
    fallback: ReactNode
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null)

    if (!src || failedSrc === src) return <>{fallback}</>

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onError={() => setFailedSrc(src)}
        />
    )
}
