'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk } from 'next/font/google'
import { Sparkles, User, Receipt, QrCode, ChevronRight, PiggyBank } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { cn } from '../../lib/utils'
import ShaderBackground from './components/ShaderBackground'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700', '800'] })

// Organic, mouse-reactive noise blend of the app's surface/primary/lavender
// palette — ported directly from the mockup's WebGL shader (a softer, wider
// flow than the loyalty page's variant: lower frequency, slower drift).
const HOME_SHADER_FRAGMENT_SOURCE = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;

    float n1 = snoise(uv * 1.5 + u_time * 0.08);
    float n2 = snoise(uv * 3.0 - u_time * 0.04 + mouse * 0.2);

    vec3 colorBase = vec3(0.98, 0.98, 0.95);
    vec3 colorPrimary = vec3(0.54, 0.81, 0.94);
    vec3 colorAccent = vec3(0.88, 0.82, 0.96);

    float mixVal = smoothstep(-0.6, 0.6, n1 + n2 * 0.5);
    vec3 finalColor = mix(colorBase, mix(colorPrimary, colorAccent, n2 * 0.5 + 0.5), mixVal * 0.35);

    float highlight = pow(max(0.0, snoise(uv * 8.0 + u_time * 0.15)), 12.0) * 0.12;
    finalColor += highlight;

    gl_FragColor = vec4(finalColor, 1.0);
}`

function getInitials(name?: string) {
    if (!name) return null
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')
}

function formatCurrency(amount: number) {
    return `₹${amount.toFixed(2)}`
}

export default function Home() {
    const router = useRouter()
    const { user } = useAuth()
    const [totalSaved, setTotalSaved] = useState(0)

    const requireAuth = (redirectPath: string) => {
        if (user) return true
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`)
        return false
    }

    const initials = getInitials(user?.fullname)

    useEffect(() => {
        const userId = user?.email || user?.phoneNumber
        if (!userId) {
            setTotalSaved(0)
            return
        }

        const fetchSavings = async () => {
            try {
                const res = await fetch(`/api/loyalty/savings?userId=${encodeURIComponent(userId)}`)
                const data = await res.json()
                if (data.success) setTotalSaved(data.totalSaved)
            } catch (err) {
                console.error('Failed to load savings total', err)
            }
        }
        fetchSavings()
    }, [user?.email, user?.phoneNumber])

    return (
        <div className={cn(hankenGrotesk.className, "min-h-screen flex flex-col w-full max-w-md mx-auto relative overflow-x-hidden bg-[#fbf9f2] text-[#1b1c18]")}>
            <ShaderBackground fragmentSource={HOME_SHADER_FRAGMENT_SOURCE} />

            {/* Main Content */}
            <main className="relative flex-1 px-6 pt-6 pb-[100px] flex flex-col gap-8">
                {/* Hero Headline */}
                <section className="flex items-start">
                    <h1 className="text-[48px] leading-[52px] tracking-[-0.04em] font-extrabold text-[#1b1c18] max-w-[280px]">
                        loyalpe
                    </h1>
                    <div className="mt-2 ml-1 text-[#67558c]">
                        <Sparkles size={32} fill="currentColor" />
                    </div>
                </section>

                {/* Balance Card */}
                <section className="rounded-3xl p-6 min-h-[260px] flex items-center relative overflow-hidden shadow-sm backdrop-blur-md border border-white/20 bg-[#89cff0]">
                    <div className="flex justify-between items-start relative z-10 gap-4 w-full">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[#1b1c18] text-[30px] leading-tight font-extrabold tracking-tighter">Find More Rewards</h2>
                            <p className="text-[#40484d] text-sm font-medium opacity-80">Discover exclusive partner cards</p>
                        </div>
                        <button
                            onClick={() => router.push('/restaurants')}
                            className="flex items-center gap-1 font-bold hover:opacity-80 transition-opacity text-[#0d6683] shrink-0"
                        >
                            <span className="text-[12px] tracking-widest uppercase">See More</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </section>

                {/* Saved Money */}
                <section className="rounded-3xl p-6 relative overflow-hidden shadow-sm backdrop-blur-md border border-white/20 bg-[#eae8e1]">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[#1b1c18] text-[22px] font-extrabold tracking-tighter">Saved Money</h2>
                                <p className="text-[#40484d] text-sm font-medium opacity-80">Total earned via rewards &amp; cashback</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#c2f050] flex items-center justify-center text-[#516b00] shrink-0">
                                <PiggyBank size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[32px] font-extrabold tracking-tighter text-[#1b1c18]">
                                {formatCurrency(totalSaved)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Action Cards Grid */}
                <section className="grid grid-cols-2 gap-3 h-48">
                    {/* Profile */}
                    <button
                        onClick={() => requireAuth('/profile') && router.push('/profile')}
                        className="rounded-3xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden group hover:opacity-95 hover:scale-105 hover:brightness-110 transition-all backdrop-blur-md shadow-lg border border-white/20 bg-[#d1bbfa]"
                    >
                        <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-[#5a487f] text-white flex items-center justify-center border-2 border-[#5a487f]/20">
                                {initials ? (
                                    <span className="text-sm font-bold">{initials}</span>
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <span className="text-[#000000] text-[22px] leading-tight font-bold">Profile</span>
                        </div>
                    </button>

                    {/* Transactions */}
                    <button
                        onClick={() => requireAuth('/transactions') && router.push('/transactions')}
                        className="rounded-3xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden group hover:opacity-95 hover:scale-105 hover:brightness-110 transition-all backdrop-blur-md shadow-lg border border-white/20 bg-[#c2f050]"
                    >
                        <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                            <Receipt size={32} className="text-[#516b00]" />
                            <span className="text-[#000000] text-[22px] leading-tight font-bold">Transaction</span>
                        </div>
                    </button>
                </section>
            </main>

            {/* Desktop Navigation */}
            <div className="hidden md:flex fixed top-0 right-6 h-16 items-center gap-6 z-50">
                <span className="text-[#1b1c18] font-bold">Home</span>
                <button
                    onClick={() => requireAuth('/transactions') && router.push('/transactions')}
                    className="text-[#40484d] hover:opacity-80 transition-opacity"
                >
                    Payments
                </button>
                <button
                    onClick={() => requireAuth('/profile') && router.push('/profile')}
                    className="text-[#40484d] hover:opacity-80 transition-opacity"
                >
                    Settings
                </button>
            </div>

            {/* Floating QR Scan Button */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button
                    aria-label="Scan to order"
                    onClick={() => router.push('/scan')}
                    className="w-16 h-16 bg-[#c2f050]/90 backdrop-blur-md text-[#516b00] rounded-full shadow-[0_0_20px_rgba(197,242,83,0.5)] border border-white/30 flex items-center justify-center hover:opacity-95 transition-opacity active:scale-95"
                >
                    <QrCode size={32} />
                </button>
            </div>
        </div>
    )
}
