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

    const stopCamera = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = null
        }
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = null
    }, [])

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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className={cn(inter.className, "bg-black text-white antialiased select-none h-[100dvh] w-full overflow-hidden flex flex-col justify-between items-center relative")}>
            {/* Camera feed */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover z-0"
                muted
                playsInline
            />
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_60%_40%,transparent_0%,rgba(0,0,0,0.4)_60%,rgba(0,0,0,0.85)_100%)]" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Top Navigation */}
            <header className="relative z-20 w-full pt-12 pb-4 px-6 flex items-center justify-center max-w-md mx-auto">
                <button
                    onClick={() => { stopCamera(); router.back() }}
                    aria-label="Go back"
                    type="button"
                    className="absolute left-6 w-11 h-11 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform hover:bg-zinc-700/80"
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                    Scan QR
                </h1>
            </header>

            {/* Scanner Viewfinder */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 w-full max-w-md mx-auto -mt-6">
                <div className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] rounded-3xl border-[3.5px] border-[#B4F82C] shadow-[0_0_16px_rgba(180,248,44,0.45),inset_0_0_12px_rgba(180,248,44,0.25)] overflow-hidden bg-black/10">
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white/60" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white/60" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white/60" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white/60" />
                </div>
                <p className="mt-6 text-sm font-medium text-zinc-300 tracking-wide text-center drop-shadow">
                    {status === 'requesting' && 'Requesting camera access...'}
                    {status === 'scanning' && 'Align QR code within frame'}
                    {status === 'resolving' && 'Matching restaurant...'}
                    {status === 'error' && errorMessage}
                </p>
            </main>

            {/* Bottom safe-area spacer */}
            <footer className="relative z-20 w-full pb-8 pt-2 px-6 max-w-md mx-auto" />
        </div>
    )
}
