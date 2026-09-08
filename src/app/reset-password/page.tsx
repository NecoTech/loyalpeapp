'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'
import { cn } from '../../../lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

function PasswordInput({
    label, placeholder, value, onChange, visible, onToggleVisible,
}: {
    label: string
    placeholder: string
    value: string
    onChange: (v: string) => void
    visible: boolean
    onToggleVisible: () => void
}) {
    return (
        <div className="space-y-1.5">
            <span className="text-[13px] leading-[16px] tracking-[0.03em] font-extrabold uppercase text-[#1c1b1b]">{label}</span>
            <div className="relative flex items-center">
                <Lock size={20} className="absolute left-3.5 text-[#434656]" />
                <input
                    type={visible ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required
                    minLength={6}
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

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDone, setIsDone] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })
            const data = await res.json()
            if (!data.success) {
                setError(data.error || 'Something went wrong. Please try again.')
                return
            }
            setIsDone(true)
        } catch (err) {
            console.error('Reset password request failed', err)
            setError('Please check your connection and try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-[#f4efe6] text-[#1c1b1b] flex flex-col items-center justify-start")}>
            <div className="w-full max-w-[428px] min-h-screen bg-[#fcf9f8] flex flex-col relative pb-8 border-x-[3px] border-[#1c1b1b]">
                <main className="flex-1 px-4 pt-10 pb-5 flex flex-col">
                    {!token ? (
                        <section className="flex flex-col items-center text-center gap-3 pt-10">
                            <div className="w-14 h-14 rounded-2xl bg-[#fd5835] border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center">
                                <ShieldAlert size={26} className="text-white" />
                            </div>
                            <h1 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold uppercase">Invalid Link</h1>
                            <p className="text-sm leading-5 font-medium text-[#434656] max-w-[280px]">
                                This password reset link is missing or malformed. Please request a new one from the login page.
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push('/auth?mode=login')}
                                className="mt-4 w-full py-3.5 bg-[#f6bf22] hover:bg-[#ffdf99] text-[#1c1b1b] rounded-xl border-[3px] border-[#1c1b1b] shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                Back to Login
                            </button>
                        </section>
                    ) : isDone ? (
                        <section className="flex flex-col items-center text-center gap-3 pt-10">
                            <div className="w-14 h-14 rounded-2xl bg-[#0040e0] border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center">
                                <CheckCircle2 size={26} className="text-white" />
                            </div>
                            <h1 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold uppercase">Password Updated</h1>
                            <p className="text-sm leading-5 font-medium text-[#434656] max-w-[280px]">
                                Your password has been reset. You can now log in with your new password.
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push('/auth?mode=login')}
                                className="mt-4 w-full py-3.5 bg-[#f6bf22] hover:bg-[#ffdf99] text-[#1c1b1b] rounded-xl border-[3px] border-[#1c1b1b] shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <span>Log In</span>
                                <ArrowRight size={20} strokeWidth={2.5} />
                            </button>
                        </section>
                    ) : (
                        <section className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#0040e0] border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center">
                                <Lock size={22} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold uppercase text-[#1c1b1b]">
                                    Set New Password
                                </h1>
                                <p className="text-sm leading-5 font-medium text-[#434656]">
                                    Choose a new password for your account.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pt-1">
                                <PasswordInput
                                    label="New Password" placeholder="Enter new password"
                                    value={password} onChange={setPassword}
                                    visible={showPassword} onToggleVisible={() => setShowPassword(p => !p)}
                                />
                                <PasswordInput
                                    label="Confirm Password" placeholder="Re-enter new password"
                                    value={confirmPassword} onChange={setConfirmPassword}
                                    visible={showPassword} onToggleVisible={() => setShowPassword(p => !p)}
                                />

                                {error && <p className="text-[#ba1a1a] text-sm font-semibold text-center">{error}</p>}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 bg-[#fd5835] hover:bg-[#b52603] text-white rounded-xl border-[3px] border-[#1c1b1b] shadow-[4px_4px_0px_#111111] active:translate-x-1 active:translate-y-1 active:shadow-none text-[15px] leading-[18px] tracking-[0.02em] font-extrabold uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                                    >
                                        <span>{isSubmitting ? 'Please wait...' : 'Reset Password'}</span>
                                        {!isSubmitting && <ArrowRight size={20} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f4efe6]" />}>
            <ResetPasswordContent />
        </Suspense>
    )
}
