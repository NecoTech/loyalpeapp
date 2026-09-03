'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ArrowLeft, Image as ImageIcon, Zap, ZapOff } from 'lucide-react'
import jsQR from 'jsqr'
import { cn } from '../../../lib/utils'
import { extractUpiVpa } from '../../../lib/upi'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const hasResolvedRef = useRef(false)

    const [status, setStatus] = useState<Status>('requesting')
    const [errorMessage, setErrorMessage] = useState('')
    const [torchOn, setTorchOn] = useState(false)
    const [torchSupported, setTorchSupported] = useState(false)

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

                const [track] = stream.getVideoTracks()
                const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
                setTorchSupported(!!capabilities?.torch)

                setStatus('scanning')
                frameRef.current = requestAnimationFrame(scanFrame)
            } catch (err) {
                console.error('Camera access failed', err)
                if (!cancelled) {
                    setStatus('error')
                    setErrorMessage('Camera access was denied or is unavailable. You can still pick a QR image from your gallery.')
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

    const toggleTorch = async () => {
        const [track] = streamRef.current?.getVideoTracks() || []
        if (!track || !torchSupported) return
        try {
            await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
            setTorchOn(prev => !prev)
        } catch (err) {
            console.error('Failed to toggle torch', err)
        }
    }

    const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        try {
            const bitmap = await createImageBitmap(file)
            const canvas = document.createElement('canvas')
            canvas.width = bitmap.width
            canvas.height = bitmap.height
            const context = canvas.getContext('2d')
            if (!context) return

            context.drawImage(bitmap, 0, 0)
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
            const result = jsQR(imageData.data, imageData.width, imageData.height)

            if (result?.data) {
                handleDecoded(result.data)
            } else {
                setStatus('error')
                setErrorMessage("Couldn't find a QR code in that image. Please try another one.")
            }
        } catch (err) {
            console.error('Failed to read image', err)
            setStatus('error')
            setErrorMessage("Couldn't read that image. Please try another one.")
        }
    }

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#30312c] h-[100dvh] w-full overflow-hidden relative text-white")}>
            {/* Camera feed */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover z-0"
                muted
                playsInline
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1b1c18]/60 to-[#0d6683]/40 mix-blend-multiply" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Top Navigation */}
            <div className="relative z-10 w-full pt-12 px-6 flex justify-between items-center">
                <button
                    onClick={() => { stopCamera(); router.back() }}
                    aria-label="Back"
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-[28px] leading-[34px] font-bold tracking-tight text-white">Scan QR</h1>
                <div className="w-12 h-12" />
            </div>

            {/* Scanner Viewfinder */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-3/4 max-w-sm aspect-square">
                <div className="relative w-full h-full rounded-2xl border-4 border-[#c5f253] shadow-[0_0_20px_rgba(197,242,83,0.4)] overflow-hidden">
                    {status === 'scanning' && (
                        <div className="absolute left-0 right-0 h-1 bg-[#c5f253] shadow-[0_0_15px_rgba(197,242,83,0.8)] scan-laser z-20" />
                    )}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl -m-1" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl -m-1" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl -m-1" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl -m-1" />
                </div>
                <p className="text-center mt-4 text-white/80">
                    {status === 'requesting' && 'Requesting camera access...'}
                    {status === 'scanning' && 'Align QR code within frame'}
                    {status === 'resolving' && 'Matching restaurant...'}
                    {status === 'error' && errorMessage}
                </p>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 w-full px-6 pb-8 z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex justify-around items-center max-w-md mx-auto">
                    <button
                        onClick={toggleTorch}
                        disabled={!torchSupported}
                        className="flex flex-col items-center gap-2 group disabled:opacity-40"
                    >
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors group-hover:scale-105 transform duration-200">
                            {torchOn ? <ZapOff size={26} /> : <Zap size={26} />}
                        </div>
                        <span className={cn(jetbrainsMono.className, "text-xs text-white/90")}>Flash</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors group-hover:scale-105 transform duration-200">
                            <ImageIcon size={26} />
                        </div>
                        <span className={cn(jetbrainsMono.className, "text-xs text-white/90")}>Gallery</span>
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryFile}
                className="hidden"
            />

            <style jsx global>{`
                .scan-laser {
                    animation: scan 2s linear infinite;
                }
                @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: 100%; }
                }
            `}</style>
        </div>
    )
}
