'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import {
    User as UserIcon,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Star,
    Store,
    Flame,
    CheckCircle2,
    type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

type Mode = 'create' | 'login'

function FormField({
    label, tag, tagColor, rightSlot, icon: Icon, type, placeholder, value, onChange, required, minLength,
}: {
    label: string
    tag?: string
    tagColor?: string
    rightSlot?: ReactNode
    icon: LucideIcon
    type: string
    placeholder: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    minLength?: number
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[13px] leading-[16px] tracking-[0.03em] font-extrabold uppercase text-[#1c1b1b]">{label}</span>
                {rightSlot ?? (tag && <span className={cn("text-[11px] leading-[14px] font-bold uppercase", tagColor)}>({tag})</span>)}
            </div>
            <div className="relative flex items-center">
                <Icon size={20} className="absolute left-3.5 text-[#434656]" />
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required={required}
                    minLength={minLength}
                    className="w-full bg-white rounded-xl border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] pl-11 pr-4 py-3 text-sm leading-5 font-bold text-[#1c1b1b] placeholder-neutral-400 focus:outline-none focus:border-[#0040e0] focus:shadow-[3px_3px_0px_#0040e0] transition-all"
                />
            </div>
        </div>
    )
}

function PasswordField({
    label, rightSlot, placeholder, value, onChange, visible, onToggleVisible, required, minLength,
}: {
    label: string
    rightSlot?: ReactNode
    placeholder: string
    value: string
    onChange: (v: string) => void
    visible: boolean
    onToggleVisible: () => void
    required?: boolean
    minLength?: number
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[13px] leading-[16px] tracking-[0.03em] font-extrabold uppercase text-[#1c1b1b]">{label}</span>
                {rightSlot}
            </div>
            <div className="relative flex items-center">
                <Lock size={20} className="absolute left-3.5 text-[#434656]" />
                <input
                    type={visible ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required={required}
                    minLength={minLength}
                    className="w-full bg-white rounded-xl border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] pl-11 pr-11 py-3 text-sm leading-5 font-bold text-[#1c1b1b] placeholder-neutral-400 focus:outline-none focus:border-[#0040e0] focus:shadow-[3px_3px_0px_#0040e0] transition-all"
                />
                <button
                    type="button"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    onClick={onToggleVisible}
                    className="absolute right-3.5 text-[#434656] hover:text-[#1c1b1b]"
                >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
        </div>
    )
}

function AuthContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, isInitialized, signIn, signUp } = useAuth()

    const redirectTo = searchParams.get('redirect') || '/'
    const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'login' ? 'login' : 'create')

    const [fullname, setFullName] = useState('')
    const [createEmail, setCreateEmail] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [createPassword, setCreatePassword] = useState('')
    const [showCreatePassword, setShowCreatePassword] = useState(false)

    const [loginEmail, setLoginEmail] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [showLoginPassword, setShowLoginPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

    useEffect(() => {
        if (isInitialized && user) {
            router.replace(redirectTo)
        }
    }, [isInitialized, user, redirectTo, router])

    const switchMode = (next: Mode) => {
        setMode(next)
        setError('')
    }

    const showToast = (title: string, message: string) => {
        setToast({ title, message })
        setTimeout(() => setToast(null), 3000)
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (createPassword.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setIsSubmitting(true)
        const result = await signUp(createEmail, createPassword, fullname, phoneNumber)
        setIsSubmitting(false)

        if (!result.success) {
            setError(result.error)
            return
        }

        showToast('ACCOUNT CREATED!', 'Welcome! Your loyalpe pass is ready.')
        setTimeout(() => router.push(redirectTo), 800)
    }

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        setIsSubmitting(true)
        const result = await signIn(loginEmail, loginPassword)
        setIsSubmitting(false)

        if (!result.success) {
            setError(result.error)
            return
        }

        showToast('WELCOME BACK!', 'Loading your stamps and perks...')
        setTimeout(() => router.push(redirectTo), 800)
    }

    const [isRequestingReset, setIsRequestingReset] = useState(false)

    const handleForgotPassword = async () => {
        if (isRequestingReset) return

        if (!loginEmail.trim()) {
            showToast('ENTER YOUR EMAIL', 'Type your email above first, then tap Forgot Password.')
            return
        }

        setIsRequestingReset(true)
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail.trim() }),
            })
            const data = await res.json()
            if (data.success) {
                showToast('CHECK YOUR EMAIL', "If that email has an account, we've sent a reset link.")
            } else {
                showToast('SOMETHING WENT WRONG', data.error || 'Please try again.')
            }
        } catch (err) {
            console.error('Forgot password request failed', err)
            showToast('SOMETHING WENT WRONG', 'Please check your connection and try again.')
        } finally {
            setIsRequestingReset(false)
        }
    }

    if (!isInitialized || user) {
        return <div className="min-h-screen bg-[#fcf9f8]" />
    }

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-[#f4efe6] text-[#1c1b1b] flex flex-col items-center justify-start")}>
            <div className="w-full max-w-[428px] min-h-screen bg-[#fcf9f8] flex flex-col relative pb-8 border-x-[3px] border-[#1c1b1b]">
                {/* Segmented Tabs */}
                <div className="px-4 pt-5">
                    <div className="bg-white p-1.5 rounded-2xl border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => switchMode('create')}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase text-center transition-all duration-150 border-[3px] cursor-pointer",
                                mode === 'create'
                                    ? "border-[#1c1b1b] bg-[#fd5835] text-white shadow-[2px_2px_0px_#111111]"
                                    : "border-transparent text-[#1c1b1b] hover:bg-[#f0edec]"
                            )}
                        >
                            Create Account
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase text-center transition-all duration-150 border-[3px] cursor-pointer",
                                mode === 'login'
                                    ? "border-[#1c1b1b] bg-[#f6bf22] text-[#1c1b1b] shadow-[2px_2px_0px_#111111]"
                                    : "border-transparent text-[#1c1b1b] hover:bg-[#f0edec]"
                            )}
                        >
                            Log In
                        </button>
                    </div>
                </div>

                <main className="flex-1 px-4 pt-4 pb-5 flex flex-col">
                    {mode === 'create' ? (
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pt-0.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f6bf22] rounded-full border-[3px] border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                    <Star size={16} fill="currentColor" className="text-[#1c1b1b]" />
                                    <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase text-[#1c1b1b]">Rewards</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold uppercase text-[#1c1b1b]">
                                    Join the Club!
                                </h1>
                                <p className="text-sm leading-5 font-medium text-[#434656]">
                                    Discover neighborhood stores and start earning rewards right away.
                                </p>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 pt-1">
                                <FormField
                                    label="Full Name" tag="Required" tagColor="text-[#b52603]"
                                    icon={UserIcon} type="text" placeholder="Your full name"
                                    value={fullname} onChange={setFullName} required
                                />
                                <FormField
                                    label="Email Address" tag="Required" tagColor="text-[#b52603]"
                                    icon={Mail} type="email" placeholder="you@example.com"
                                    value={createEmail} onChange={setCreateEmail} required
                                />
                                <FormField
                                    label="Phone Number" tag="Required" tagColor="text-[#b52603]"
                                    icon={Phone} type="tel" placeholder="+91 98765 43210"
                                    value={phoneNumber} onChange={setPhoneNumber} required
                                />
                                <PasswordField
                                    label="Password" rightSlot={<span className="text-[11px] leading-[14px] font-bold uppercase text-[#747688]">(Secret)</span>}
                                    placeholder="Create password" value={createPassword} onChange={setCreatePassword}
                                    visible={showCreatePassword} onToggleVisible={() => setShowCreatePassword(p => !p)}
                                    required minLength={6}
                                />

                                {error && <p className="text-[#ba1a1a] text-sm font-semibold text-center">{error}</p>}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 bg-[#fd5835] hover:bg-[#b52603] text-white rounded-xl border-[3px] border-[#1c1b1b] shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                                    >
                                        <span>{isSubmitting ? 'Please wait...' : 'Create Account'}</span>
                                        {!isSubmitting && <ArrowRight size={20} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </form>
                        </section>
                    ) : (
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pt-0.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border-[3px] border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                    <Store size={16} className="text-[#0040e0]" />
                                    <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase text-[#1c1b1b]">Loyalpe Club</span>
                                </div>
                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#f6bf22] rounded-full border-[3px] border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                    <Flame size={15} fill="currentColor" className="text-[#1c1b1b]" />
                                    <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold uppercase text-[#1c1b1b]">Perks</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold uppercase text-[#1c1b1b]">
                                    Welcome Back!
                                </h1>
                                <p className="text-sm leading-5 font-medium text-[#434656]">
                                    Log in to keep stacking perks and exploring local gems.
                                </p>
                            </div>

                            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 pt-1">
                                <FormField
                                    label="Email" tag="Required" tagColor="text-[#b52603]"
                                    icon={Mail} type="email" placeholder="you@example.com"
                                    value={loginEmail} onChange={setLoginEmail} required
                                />
                                <PasswordField
                                    label="Password"
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-[11px] leading-[14px] font-bold uppercase tracking-tight text-[#0040e0] hover:underline cursor-pointer"
                                        >
                                            Forgot Password?
                                        </button>
                                    }
                                    placeholder="Enter password" value={loginPassword} onChange={setLoginPassword}
                                    visible={showLoginPassword} onToggleVisible={() => setShowLoginPassword(p => !p)}
                                    required
                                />

                                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                        className="w-5 h-5 rounded border-[3px] border-[#1c1b1b] accent-[#0040e0] focus:ring-0 shadow-[2px_2px_0px_#111111]"
                                    />
                                    <span className="text-[11px] leading-[14px] font-extrabold text-[#1c1b1b] uppercase">Remember Me</span>
                                </label>

                                {error && <p className="text-[#ba1a1a] text-sm font-semibold text-center">{error}</p>}

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 bg-[#f6bf22] hover:bg-[#ffdf99] text-[#1c1b1b] rounded-xl border-[3px] border-[#1c1b1b] shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                                    >
                                        <span>{isSubmitting ? 'Please wait...' : 'Log In'}</span>
                                        {!isSubmitting && <ArrowRight size={20} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                </main>

                {/* Success Toast */}
                <div
                    className={cn(
                        "fixed top-5 left-1/2 -translate-x-1/2 max-w-[360px] w-[90%] bg-[#f6bf22] border-[3px] border-[#1c1b1b] p-4 rounded-xl shadow-[4px_4px_0px_#111111] flex items-center gap-3 z-50 transition-all duration-300 transform",
                        toast ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0 pointer-events-none"
                    )}
                >
                    <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#1c1b1b] flex items-center justify-center shadow-[2px_2px_0px_#111111] shrink-0">
                        <CheckCircle2 size={20} className="text-[#0040e0]" />
                    </div>
                    <div className="flex-1 text-[#1c1b1b]">
                        <div className="text-[13px] leading-[16px] tracking-[0.03em] font-extrabold uppercase">{toast?.title}</div>
                        <div className="text-xs leading-4 tracking-[0.01em] font-semibold">{toast?.message}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f4efe6]" />}>
            <AuthContent />
        </Suspense>
    )
}
