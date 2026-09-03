'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Hanken_Grotesk } from 'next/font/google'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })

type Mode = 'signin' | 'signup'

function AuthContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, signUp } = useAuth()

    const redirectTo = searchParams.get('redirect') || '/'
    const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')

    const [fullname, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const switchMode = (next: Mode) => {
        setMode(next)
        setError('')
        setPassword('')
        setConfirmPassword('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (mode === 'signup' && password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setIsSubmitting(true)
        const result = mode === 'signin'
            ? await signIn(email, password)
            : await signUp(email, password, fullname)
        setIsSubmitting(false)

        if (!result.success) {
            setError(result.error)
            return
        }

        router.push(redirectTo)
    }

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] min-h-screen flex flex-col items-center justify-center px-6 py-12 text-[#1b1c18]")}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-[28px] leading-[34px] font-extrabold text-[#0d6683]">
                        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-[#40484d] mt-2 text-sm">
                        {mode === 'signin'
                            ? 'Sign in to continue'
                            : 'Sign up with your email to get started'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#f0eee7] rounded-full p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className={cn(
                            "flex-1 py-2.5 rounded-full text-sm font-bold transition-colors",
                            mode === 'signin' ? "bg-[#0d6683] text-white" : "text-[#40484d]"
                        )}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className={cn(
                            "flex-1 py-2.5 rounded-full text-sm font-bold transition-colors",
                            mode === 'signup' ? "bg-[#0d6683] text-white" : "text-[#40484d]"
                        )}
                    >
                        Create Account
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === 'signup' && (
                        <div className="flex items-center bg-[#f5f4ed] rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-[#0d6683]">
                            <User size={18} className="text-[#70787d] mr-3 shrink-0" />
                            <input
                                type="text"
                                placeholder="Full name"
                                value={fullname}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-transparent flex-1 outline-none text-base placeholder:text-[#70787d]"
                            />
                        </div>
                    )}

                    <div className="flex items-center bg-[#f5f4ed] rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-[#0d6683]">
                        <Mail size={18} className="text-[#70787d] mr-3 shrink-0" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-transparent flex-1 outline-none text-base placeholder:text-[#70787d]"
                            required
                        />
                    </div>

                    <div className="flex items-center bg-[#f5f4ed] rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-[#0d6683]">
                        <Lock size={18} className="text-[#70787d] mr-3 shrink-0" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-transparent flex-1 outline-none text-base placeholder:text-[#70787d]"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword(prev => !prev)}
                            className="text-[#70787d] ml-2"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {mode === 'signup' && (
                        <div className="flex items-center bg-[#f5f4ed] rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-[#0d6683]">
                            <Lock size={18} className="text-[#70787d] mr-3 shrink-0" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-transparent flex-1 outline-none text-base placeholder:text-[#70787d]"
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-[#ba1a1a] text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#c5f253] text-[#151f00] text-base font-extrabold py-4 rounded-full hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
                    >
                        {isSubmitting
                            ? 'Please wait...'
                            : mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-[#40484d] mt-6">
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        type="button"
                        onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="text-[#0d6683] font-bold"
                    >
                        {mode === 'signin' ? 'Create one' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#fbf9f2]" />}>
            <AuthContent />
        </Suspense>
    )
}
