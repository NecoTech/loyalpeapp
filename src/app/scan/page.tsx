'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'
import { ArrowLeft } from 'lucide-react'
import jsQR from 'jsqr'
import { cn } from '../../../lib/utils'
import { extractUpiVpa } from '../../../lib/upi'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

type Status = 'requesting' | 'scanning' | 'resolving' | 'error'

function resolveScanTarget(raw: string): string {
    const trimmed = raw.trim()
    try {
        const url = new URL(trimmed)
        return `${url.pathname}${url.search}` || '/'
    } catch {
        return `/restaurant/${encodeURIComponent(trimmed)}`
    }
}

export default function ScanPage() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const frameRef = useRef<number | null>(null)
    const hasResolvedRef = useRef(false)

    const [status, setStatus] = useState<Status>('requesting')
    const [errorMessage, setErrorMessage] = useState('')
    const [isFlashOn, setIsFlashOn] = useState(false)
    // A short message shown in the guidance slot above the flash button —
    // for things the tap-only controls can't say on their own.
    const [notice, setNotice] = useState('')
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const stopCamera = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = null
        }
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = null
        // Stopping the camera switches the torch off with it.
        setIsFlashOn(false)
    }, [])

    const showNotice = useCallback((message: string, durationMs = 2500) => {
        setNotice(message)
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = setTimeout(() => setNotice(''), durationMs)
    }, [])

    // The flashlight is the camera's "torch" constraint. Many devices (most
    // desktops, iPhones in Safari) don't expose it, so check before trying.
    const toggleFlash = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0]
        const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
        if (!track || !capabilities?.torch) {
            showNotice("Flash isn't available on this device.")
            return
        }

        const next = !isFlashOn
        try {
            await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
            setIsFlashOn(next)
        } catch (err) {
            console.error('Failed to toggle flash', err)
            showNotice("Couldn't turn the flash on.")
        }
    }, [isFlashOn, showNotice])

    const handleDecoded = useCallback(async (text: string) => {
        if (hasResolvedRef.current) return
        hasResolvedRef.current = true
        stopCamera()

        // A Google Pay / UPI QR code — check whether its payee address
        // matches a restaurant that registered that same VPA (admin Profile
        // tab), and if so jump straight to that restaurant's amount-entry
        // page instead of treating it as a generic app link. A upi:// URL
        // also "parses" successfully as a generic URL (host="pay", the rest
        // becomes a query string), so it must NOT fall through to
        // resolveScanTarget below on a miss — that would silently push just
        // a query string onto the current /scan route and look frozen.
        const vpa = extractUpiVpa(text)
        if (vpa) {
            setStatus('resolving')
            try {
                const res = await fetch('/api/restaurant/lookup-by-upi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scanned: text }),
                })
                const data = await res.json()
                if (data.success && data.restaurant?.id) {
                    router.push(`/restaurant/${encodeURIComponent(data.restaurant.id)}`)
                    return
                }

                hasResolvedRef.current = false
                setStatus('error')
                setErrorMessage("This payment QR code isn't linked to a restaurant here yet.")
            } catch (err) {
                console.error('Failed to look up restaurant by UPI QR code', err)
                hasResolvedRef.current = false
                setStatus('error')
                setErrorMessage('Could not verify that QR code. Please try again.')
            }
            return
        }

        router.push(resolveScanTarget(text))
    }, [router, stopCamera])

    const scanFrame = useCallback(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            frameRef.current = requestAnimationFrame(scanFrame)
            return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d')
        if (!context) {
            frameRef.current = requestAnimationFrame(scanFrame)
            return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)

        if (result?.data) {
            handleDecoded(result.data)
            return
        }

        frameRef.current = requestAnimationFrame(scanFrame)
    }, [handleDecoded])

    useEffect(() => {
        let cancelled = false

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                })
                if (cancelled) {
                    stream.getTracks().forEach(track => track.stop())
                    return
                }

                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                }

                setStatus('scanning')
                frameRef.current = requestAnimationFrame(scanFrame)
            } catch (err) {
                console.error('Camera access failed', err)
                if (!cancelled) {
                    setStatus('error')
                    setErrorMessage('Camera access was denied or is unavailable. Please allow camera access and try again.')
                }
            }
        }

        startCamera()

        return () => {
            cancelled = true
            stopCamera()
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Nothing is shown while scanning normally — the camera view is the
    // whole interface — only progress, problems and short hints.
    const guidance = notice
        || (status === 'requesting' ? 'Requesting camera access...' : '')
        || (status === 'resolving' ? 'Matching restaurant...' : '')
        || (status === 'error' ? errorMessage : '')

    // The chips are UPI apps a payment can be made with. Nothing is paid from
    // this screen — a restaurant's QR code is scanned first, and the app is
    // chosen on that restaurant's payment page — so tapping one says so.
    const upiApps = [
        { name: 'GPay', label: 'Pay with Google Pay' },
        { name: 'PhonePe', label: 'Pay with PhonePe' },
        { name: 'Paytm', label: 'Pay with Paytm' },
    ]

    return (
        <div className={cn(inter.className, "antialiased overflow-hidden flex justify-center items-center min-h-screen bg-white text-white")}>
            <div className="relative w-full max-w-[420px] h-[100dvh] max-h-[900px] overflow-hidden bg-white flex flex-col justify-between select-none rounded-[44px]">
                <button
                    type="button"
                    aria-label="Go back"
                    onClick={() => { stopCamera(); router.back() }}
                    className="absolute left-6 z-30 flex items-center justify-center w-11 h-11 bg-white border-2 border-[#111111] rounded-xl shadow-[3px_3px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer top-12"
                >
                    <ArrowLeft className="w-6 h-6 text-[#111111]" strokeWidth={2.5} />
                </button>
                <div className="absolute top-0 left-0 right-0 w-full bg-white z-10 pointer-events-none h-6" />

                {/* Camera feed */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-neutral-100">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover object-center filter brightness-90 scale-105"
                        muted
                        playsInline
                    />
                    {/* Fades the feed into white for the controls at the bottom */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0)_55%,rgba(255,255,255,0.8)_75%,rgb(255,255,255)_90%,rgb(255,255,255)_100%)]" />
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <main className="relative z-10 flex flex-col items-center justify-center px-6 flex-grow my-auto">
                    {/* Guidance */}
                    <div className="mt-6 text-center max-w-[240px]" aria-live="polite">
                        {guidance && (
                            <p className="inline-block px-3 py-2 rounded-xl bg-white border-2 border-[#111111] shadow-[3px_3px_0px_#111111] text-xs font-bold text-[#111111] leading-snug">
                                {guidance}
                            </p>
                        )}
                    </div>

                    {/* Flash */}
                    <div className="flex flex-col items-center gap-1.5 mt-auto" style={{ marginBottom: 24 }}>
                        <button
                            type="button"
                            onClick={toggleFlash}
                            aria-label="Toggle Flashlight"
                            aria-pressed={isFlashOn}
                            className={cn(
                                "flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md shadow-md border active:scale-95 transition-all",
                                isFlashOn
                                    ? "bg-[#fbbf24] text-[#78350f] border-[#f59e0b] scale-[1.08] shadow-[0_0_25px_rgba(251,191,36,0.9),0_0_10px_rgba(245,158,11,0.6)]"
                                    : "bg-white/70 border-black/10 text-neutral-800 hover:bg-white"
                            )}
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
                        </button>
                        <span className="text-[11px] font-medium text-neutral-600 tracking-wide">Flash</span>
                    </div>

                    {/* UPI apps */}
                    <div className="flex flex-col items-center gap-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-[1px] bg-neutral-300" />
                            <span className="text-[11px] text-neutral-500 font-medium tracking-wide uppercase">&nbsp;pay with UPI apps&nbsp;</span>
                            <span className="w-6 h-[1px] bg-neutral-300" />
                        </div>
                        <div className="flex items-center justify-center gap-3.5">
                            {upiApps.map(app => (
                                <button
                                    key={app.name}
                                    type="button"
                                    aria-label={app.label}
                                    onClick={() => showNotice(`Scan the restaurant's QR code, then choose ${app.name} to pay.`, 4000)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-white backdrop-blur-md shadow-sm border border-black/10 active:scale-95 transition-all group"
                                >
                                    {app.name === 'GPay' && (
                                        <div className="w-6 h-6 rounded-full bg-white shadow-xs flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                            </svg>
                                        </div>
                                    )}
                                    {app.name === 'PhonePe' && (
                                        <div className="w-6 h-6 rounded-full bg-[#5f259f] shadow-xs flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-[13px] leading-none select-none">पे</span>
                                        </div>
                                    )}
                                    {app.name === 'Paytm' && (
                                        <div className="h-6 px-1.5 rounded-md bg-[#002970]/5 flex items-center justify-center flex-shrink-0 border border-[#002970]/10">
                                            <span className="font-black text-[10px] tracking-tight text-[#002970] leading-none">Pay<span className="text-[#00baf2]">tm</span></span>
                                        </div>
                                    )}
                                    <span className="text-xs font-semibold text-neutral-800 tracking-tight">{app.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
