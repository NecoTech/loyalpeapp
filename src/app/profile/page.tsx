'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import {
    ArrowLeft,
    Mail,
    Phone,
    Receipt,
    FileText,
    ShieldCheck,
    RefreshCcw,
    LogOut,
    ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'

const hankenGrotesk = Hanken_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'] })

type SettingsLink = {
    label: string
    description: string
    href: string
    icon: ReactNode
    iconBg: string
    iconColor: string
}

function getInitials(name?: string) {
    if (!name) return '?'
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')
}

export default function ProfilePage() {
    const router = useRouter()
    const { user, logout } = useAuth()

    const links: SettingsLink[] = [
        {
            label: 'Orders',
            description: 'View your past and active orders',
            href: '/orders',
            icon: <Receipt size={20} />,
            iconBg: '#89cff0',
            iconColor: '#005974',
        },
        {
            label: 'Terms and Conditions',
            description: 'Legal terms of using the app',
            href: '/terms-of-service',
            icon: <FileText size={20} />,
            iconBg: '#d1bbfa',
            iconColor: '#5a487f',
        },
        {
            label: 'Privacy Policy',
            description: 'How we handle your data',
            href: '/privacy-policy',
            icon: <ShieldCheck size={20} />,
            iconBg: '#89cff0',
            iconColor: '#005974',
        },
        {
            label: 'Refund & Cancellation',
            description: 'Our refund and cancellation policy',
            href: '/refund-cancellation-policy',
            icon: <RefreshCcw size={20} />,
            iconBg: '#d1bbfa',
            iconColor: '#5a487f',
        },
    ]

    const handleLogout = () => {
        logout()
        router.push('/')
    }

    return (
        <div className={cn(hankenGrotesk.className, "bg-[#fbf9f2] min-h-screen text-[#1b1c18] pb-32")}>
            {/* Top App Bar */}
            <header className="flex items-center gap-3 w-full bg-[#fbf9f2] top-0 pt-4 px-6 pb-6 sticky z-10">
                <button
                    aria-label="Back"
                    className="w-10 h-10 flex items-center justify-center text-[#0d6683] hover:opacity-80 active:scale-95 transition-all -ml-2"
                    onClick={() => router.back()}
                >
                    <ArrowLeft size={22} />
                </button>
                <span className="text-[28px] leading-[34px] font-extrabold tracking-tight text-[#1b1c18]">
                    Profile
                </span>
            </header>

            <main className="px-6 flex flex-col gap-8 max-w-2xl mx-auto mt-4">
                {/* Profile Header Area */}
                <section className="flex flex-col items-center gap-4 text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-[#89cff0] shadow-md bg-[#0d6683] flex items-center justify-center">
                        <span className="text-white text-[32px] font-extrabold">
                            {getInitials(user?.fullname)}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-[28px] leading-[34px] font-extrabold text-[#1b1c18]">
                            {user?.fullname ?? 'Guest'}
                        </h1>
                        {user?.phoneNumber && (
                            <p className={cn(jetbrainsMono.className, "text-[#40484d] text-xs mt-1")}>
                                {user.phoneNumber}
                            </p>
                        )}
                    </div>
                </section>

                {/* Contact Info */}
                {(user?.email || user?.phoneNumber) && (
                    <section className="bg-[#f5f4ed] rounded-xl p-6 shadow-sm border border-[#e4e2dc] flex flex-col gap-4">
                        {user?.phoneNumber && (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#89cff0] flex items-center justify-center text-[#005974]">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#40484d]">Phone</p>
                                    <p className="font-bold text-[#1b1c18]">{user.phoneNumber}</p>
                                </div>
                            </div>
                        )}
                        {user?.email && (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#d1bbfa] flex items-center justify-center text-[#5a487f]">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#40484d]">Email</p>
                                    <p className="font-bold text-[#1b1c18]">{user.email}</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Settings Cards */}
                <section className="flex flex-col gap-3">
                    {links.map(link => (
                        <button
                            key={link.href}
                            onClick={() => router.push(link.href)}
                            className="bg-[#f5f4ed] rounded-xl p-6 shadow-sm border border-[#e4e2dc] hover:bg-[#eae8e1] transition-colors flex items-center justify-between group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: link.iconBg, color: link.iconColor }}
                                >
                                    {link.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1b1c18]">{link.label}</h3>
                                    <p className="text-[#40484d] text-sm">{link.description}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-[#70787d]" />
                        </button>
                    ))}

                    {/* Logout */}
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-[#ba1a1a] font-bold px-6 py-3 rounded-full hover:bg-[#ffdad6] transition-colors"
                        >
                            <LogOut size={20} />
                            Log Out
                        </button>
                    </div>
                </section>
            </main>
        </div>
    )
}
