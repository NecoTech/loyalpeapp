'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import {
    ArrowLeft,
    Heart,
    BadgeCheck,
    Pencil,
    Phone,
    Trash2,
    FileText,
    Headphones,
    LogOut,
    ChevronRight,
    X,
    AlertTriangle,
    UserCog,
    Camera,
    Eye,
    EyeOff,
    Check,
    Mail,
    Send,
    Copy,
    PhoneCall,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

const SUPPORT_EMAIL = 'odertechnology@gmail.com'
const SUPPORT_PHONE = '7736570463'

function getInitials(name?: string) {
    if (!name) return '?'
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')
}

function ModalBackdrop({ onClose, children, maxWidth = '340px' }: { onClose: () => void; children: ReactNode; maxWidth?: string }) {
    return (
        <div
            className="modal-backdrop-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="modal-pop-in bg-white border-[3px] border-[#1c1b1b] rounded-2xl p-4 w-full shadow-[6px_6px_0px_#111111] text-center relative"
                style={{ maxWidth }}
            >
                {children}
            </div>
        </div>
    )
}

function ModalCloseButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            aria-label="Close modal"
            onClick={onClick}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#ebe7e7] border-2 border-[#1c1b1b] flex items-center justify-center shadow-[1.5px_1.5px_0px_#111111] hover:bg-[#e5e2e1] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
        >
            <X size={14} />
        </button>
    )
}

function SettingsRow({
    icon, iconBg, iconColor, label, description, labelColor = '#1c1b1b', chevronColor = '#434656', onClick, hoverBg = 'hover:bg-[#f6f3f2]',
}: {
    icon: ReactNode
    iconBg: string
    iconColor: string
    label: string
    description: string
    labelColor?: string
    chevronColor?: string
    onClick: () => void
    hoverBg?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn("w-full flex items-center justify-between p-3 active:bg-[#ebe7e7] transition-colors text-left cursor-pointer", hoverBg)}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg border-2 border-[#1c1b1b] flex items-center justify-center shadow-[2px_2px_0px_#111111] shrink-0"
                    style={{ backgroundColor: iconBg, color: iconColor }}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold" style={{ color: labelColor }}>{label}</p>
                    <p className="text-xs leading-4 tracking-[0.01em] font-semibold text-[#434656]">{description}</p>
                </div>
            </div>
            <ChevronRight size={20} style={{ color: chevronColor }} />
        </button>
    )
}

export default function ProfilePage() {
    const router = useRouter()
    const { user, isInitialized, logout, updateProfile, deleteAccount } = useAuth()

    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editName, setEditName] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [editPassword, setEditPassword] = useState('')
    const [showEditPassword, setShowEditPassword] = useState(false)
    const [editError, setEditError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const [isLogoutOpen, setIsLogoutOpen] = useState(false)
    const [isContactOpen, setIsContactOpen] = useState(false)
    const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null)

    useEffect(() => {
        if (isInitialized && !user) {
            router.replace(`/auth?redirect=${encodeURIComponent('/')}`)
        }
    }, [isInitialized, user, router])

    const openEditModal = () => {
        setEditName(user?.fullname || '')
        setEditPhone(user?.phoneNumber || '')
        setEditPassword('')
        setEditError('')
        setIsEditOpen(true)
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setEditError('')
        setIsSaving(true)
        const result = await updateProfile({
            fullname: editName.trim(),
            phoneNumber: editPhone.trim(),
            newPassword: editPassword || undefined,
        })
        setIsSaving(false)
        if (!result.success) {
            setEditError(result.error)
            return
        }
        setIsEditOpen(false)
    }

    const handleConfirmDelete = async () => {
        setDeleteError('')
        setIsDeleting(true)
        const result = await deleteAccount()
        setIsDeleting(false)
        if (!result.success) {
            setDeleteError(result.error)
            return
        }
        router.push('/')
    }

    const handleConfirmLogout = () => {
        logout()
        setIsLogoutOpen(false)
        router.push('/')
    }

    const copyToClipboard = async (text: string, field: 'email' | 'phone') => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 1800)
        } catch {
            // Clipboard API unavailable — nothing more we can do here.
        }
    }

    if (!isInitialized || !user) {
        return <div className="min-h-screen bg-[#fcf9f8]" />
    }

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-[#fcf9f8] text-[#1c1b1b]")}>
            <div className="max-w-[428px] mx-auto min-h-screen flex flex-col relative">
                {/* Top App Bar */}
                <header className="sticky top-0 z-30 bg-[#fcf9f8] border-b-[3px] border-[#1c1b1b] shadow-[0px_3px_0px_#111111]">
                    <div className="flex items-center gap-3 w-full px-4 py-3">
                        <button
                            aria-label="Go back"
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-lg bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center hover:translate-x-px hover:translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#1c1b1b]">Profile</h1>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-4 pt-4 pb-10 space-y-6">
                    {/* Hero Profile Card */}
                    <section className="relative bg-[#dde1ff] border-[3px] border-[#1c1b1b] rounded-xl p-4 shadow-[4px_4px_0px_#111111] overflow-hidden">
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-[#ffdf99] border-[3px] border-[#1c1b1b] rounded-full flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                            <Heart size={18} fill="currentColor" className="text-[#251a00]" />
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 rounded-full bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#0040e0] select-none">
                                    {getInitials(user.fullname)}
                                </div>
                                <span
                                    aria-label="Loyalpe member"
                                    className="absolute -bottom-1 -right-1 bg-[#fd5835] text-white rounded-full border-2 border-[#1c1b1b] p-0.5 shadow-[1px_1px_0px_#111111]"
                                >
                                    <BadgeCheck size={13} className="block" />
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                    <h2 className="text-2xl leading-[30px] tracking-[-0.02em] font-extrabold text-[#1c1b1b] truncate">
                                        {user.fullname || 'Guest'}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={openEditModal}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#f6f3f2] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                                    >
                                        <Pencil size={13} />
                                        <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold">Edit</span>
                                    </button>
                                </div>
                                <p className="text-sm leading-5 font-medium text-[#434656] flex items-center gap-1 mt-0.5">
                                    <Phone size={14} />
                                    <span>{user.phoneNumber || 'Add phone number'}</span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Account Settings */}
                    <section className="space-y-2">
                        <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#1c1b1b]">Account Settings</h3>
                        <div className="bg-white border-[3px] border-[#1c1b1b] rounded-xl shadow-[3px_3px_0px_#111111] divide-y-2 divide-[#1c1b1b]/15 overflow-hidden">
                            <SettingsRow
                                icon={<Trash2 size={19} />}
                                iconBg="#ffdad2"
                                iconColor="#b52603"
                                label="Delete Account"
                                description="Permanently remove profile data"
                                onClick={() => setIsDeleteOpen(true)}
                            />
                            <SettingsRow
                                icon={<FileText size={19} />}
                                iconBg="#ebe7e7"
                                iconColor="#1c1b1b"
                                label="Terms and Conditions"
                                description="Legal terms of using loyalpe"
                                onClick={() => router.push('/terms-of-service')}
                            />
                            <SettingsRow
                                icon={<Headphones size={19} />}
                                iconBg="#ebe7e7"
                                iconColor="#1c1b1b"
                                label="Contact & Support"
                                description="Reach our support team"
                                onClick={() => setIsContactOpen(true)}
                            />
                            <SettingsRow
                                icon={<LogOut size={19} />}
                                iconBg="#ffdad2"
                                iconColor="#b52603"
                                label="Log Out of loyalpe"
                                description="Sign out of your account"
                                labelColor="#b52603"
                                chevronColor="#b52603"
                                hoverBg="hover:bg-[#ffdad6]/40"
                                onClick={() => setIsLogoutOpen(true)}
                            />
                        </div>

                        <div className="text-center pt-2 pb-2">
                            <p className="text-xs leading-4 tracking-[0.01em] font-bold text-[#434656]">loyalpe</p>
                        </div>
                    </section>
                </main>
            </div>

            {/* Edit Profile Modal */}
            {isEditOpen && (
                <ModalBackdrop onClose={() => setIsEditOpen(false)}>
                    <ModalCloseButton onClick={() => setIsEditOpen(false)} />
                    <div className="text-left">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#dde1ff] border-2 border-[#1c1b1b] flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                                <UserCog size={20} className="text-[#0040e0]" />
                            </div>
                            <h4 className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#1c1b1b]">Edit Profile</h4>
                        </div>

                        <div className="flex flex-col items-center justify-center mb-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#0040e0] select-none">
                                    {getInitials(editName || user.fullname)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => window.alert('Photo upload isn\'t available yet.')}
                                    className="absolute -bottom-1 -right-2 bg-[#ffdf99] text-[#251a00] border-2 border-[#1c1b1b] rounded-full px-2 py-0.5 shadow-[1.5px_1.5px_0px_#111111] text-[11px] leading-[14px] font-extrabold flex items-center gap-0.5 hover:bg-[#ffdad2] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                                >
                                    <Camera size={13} />
                                    <span>Change</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-3">
                            <div className="space-y-1 text-left">
                                <label htmlFor="edit-name-input" className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b] block">Full Name</label>
                                <input
                                    id="edit-name-input"
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#f6f3f2] border-2 border-[#1c1b1b] rounded-lg text-sm leading-5 font-medium text-[#1c1b1b] focus:outline-none focus:bg-white shadow-[2px_2px_0px_#111111] transition-all"
                                />
                            </div>
                            <div className="space-y-1 text-left">
                                <label htmlFor="edit-phone-input" className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b] block">Phone Number</label>
                                <input
                                    id="edit-phone-input"
                                    type="tel"
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#f6f3f2] border-2 border-[#1c1b1b] rounded-lg text-sm leading-5 font-medium text-[#1c1b1b] focus:outline-none focus:bg-white shadow-[2px_2px_0px_#111111] transition-all"
                                />
                            </div>
                            <div className="space-y-1 text-left">
                                <label htmlFor="edit-email-input" className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b] block">Email Address</label>
                                <input
                                    id="edit-email-input"
                                    type="email"
                                    disabled
                                    value={user.email || ''}
                                    className="w-full px-3 py-2 bg-[#ebe7e7] border-2 border-[#1c1b1b]/40 rounded-lg text-sm leading-5 font-medium text-[#434656] cursor-not-allowed"
                                />
                                <p className="text-[11px] leading-[14px] font-semibold text-[#747688]">Contact support to change your email</p>
                            </div>
                            <div className="space-y-1 text-left">
                                <label htmlFor="edit-password-input" className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b] block">New Password (optional)</label>
                                <div className="relative flex items-center">
                                    <input
                                        id="edit-password-input"
                                        type={showEditPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        minLength={6}
                                        value={editPassword}
                                        onChange={e => setEditPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 bg-[#f6f3f2] border-2 border-[#1c1b1b] rounded-lg text-sm leading-5 font-medium text-[#1c1b1b] focus:outline-none focus:bg-white shadow-[2px_2px_0px_#111111] transition-all"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Toggle password visibility"
                                        onClick={() => setShowEditPassword(p => !p)}
                                        className="absolute right-2.5 text-[#434656] hover:text-[#1c1b1b] transition-colors cursor-pointer"
                                    >
                                        {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {editError && <p className="text-[#ba1a1a] text-xs font-semibold">{editError}</p>}

                            <div className="flex flex-col gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-[#0040e0] hover:bg-[#2e5bff] text-white text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                                >
                                    <Check size={16} />
                                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpen(false)}
                                    className="w-full bg-[#ebe7e7] hover:bg-[#e5e2e1] text-[#1c1b1b] text-[13px] leading-4 font-extrabold py-2 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalBackdrop>
            )}

            {/* Delete Account Modal */}
            {isDeleteOpen && (
                <ModalBackdrop onClose={() => setIsDeleteOpen(false)}>
                    <ModalCloseButton onClick={() => setIsDeleteOpen(false)} />
                    <div className="w-16 h-16 rounded-full bg-[#fd5835] text-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center mx-auto mb-3">
                        <AlertTriangle size={28} />
                    </div>
                    <h4 className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#1c1b1b] mb-2">Delete Account?</h4>
                    <p className="text-xs leading-5 font-semibold text-[#434656] mb-4">
                        Are you sure you want to delete your account? All your active stamps, cashback, and saved rewards data will be permanently removed.
                    </p>
                    {deleteError && <p className="text-[#ba1a1a] text-xs font-semibold mb-3">{deleteError}</p>}
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={handleConfirmDelete}
                            className="w-full bg-[#b52603] hover:bg-[#fd5835] text-white text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                            <Trash2 size={16} />
                            <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Account'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDeleteOpen(false)}
                            className="w-full bg-[#ebe7e7] hover:bg-[#e5e2e1] text-[#1c1b1b] text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </ModalBackdrop>
            )}

            {/* Logout Modal */}
            {isLogoutOpen && (
                <ModalBackdrop onClose={() => setIsLogoutOpen(false)}>
                    <ModalCloseButton onClick={() => setIsLogoutOpen(false)} />
                    <div className="w-16 h-16 rounded-full bg-[#ffdad2] text-[#b52603] border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center mx-auto mb-3">
                        <LogOut size={28} />
                    </div>
                    <h4 className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#1c1b1b] mb-2">Log Out?</h4>
                    <p className="text-xs leading-5 font-semibold text-[#434656] mb-4">
                        Are you sure you want to log out of your loyalpe account? You&apos;ll need to sign back in to continue.
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleConfirmLogout}
                            className="w-full bg-[#b52603] hover:bg-[#fd5835] text-white text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <LogOut size={16} />
                            <span>Yes, Log Out</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLogoutOpen(false)}
                            className="w-full bg-[#ebe7e7] hover:bg-[#e5e2e1] text-[#1c1b1b] text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </ModalBackdrop>
            )}

            {/* Contact & Support Modal */}
            {isContactOpen && (
                <ModalBackdrop onClose={() => setIsContactOpen(false)} maxWidth="360px">
                    <ModalCloseButton onClick={() => setIsContactOpen(false)} />
                    <div className="text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-[#ffdf99] border-[3px] border-[#1c1b1b] flex items-center justify-center shadow-[3px_3px_0px_#111111]">
                                <Headphones size={24} className="text-[#251a00]" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad2] border-[1.5px] border-[#1c1b1b] mb-0.5">
                                    <span className="w-2 h-2 rounded-full bg-[#b52603] animate-pulse" />
                                    <span className="text-[10px] font-extrabold text-[#b52603] tracking-wide uppercase">Available 24/7</span>
                                </div>
                                <h4 className="text-xl leading-[26px] tracking-[-0.015em] font-extrabold text-[#1c1b1b]">Contact &amp; Support</h4>
                            </div>
                        </div>
                        <p className="text-xs leading-5 font-semibold text-[#434656] mb-4">
                            Have questions about your loyalty stamps, perks, or account? Reach out to our support team anytime!
                        </p>

                        <div className="space-y-3 mb-4">
                            <div className="p-3 bg-[#f6f3f2] border-2 border-[#1c1b1b] rounded-xl shadow-[2.5px_2.5px_0px_#111111]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Mail size={17} className="text-[#0040e0]" />
                                    <span className="text-[11px] leading-[14px] font-extrabold text-[#1c1b1b] uppercase tracking-wider">Email Support</span>
                                </div>
                                <p className="text-sm leading-5 font-bold text-[#1c1b1b] select-all mb-2">{SUPPORT_EMAIL}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}`}
                                        className="bg-[#0040e0] text-white text-[11px] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#2e5bff] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold"
                                    >
                                        <Send size={13} />
                                        <span>Send Mail</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(SUPPORT_EMAIL, 'email')}
                                        className="bg-white text-[#1c1b1b] text-[11px] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#ebe7e7] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold cursor-pointer"
                                    >
                                        {copiedField === 'email' ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedField === 'email' ? 'Copied!' : 'Copy Email'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-[#f6f3f2] border-2 border-[#1c1b1b] rounded-xl shadow-[2.5px_2.5px_0px_#111111]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Phone size={17} className="text-[#b52603]" />
                                    <span className="text-[11px] leading-[14px] font-extrabold text-[#1c1b1b] uppercase tracking-wider">Phone Support</span>
                                </div>
                                <p className="text-sm leading-5 font-bold text-[#1c1b1b] select-all mb-2">{SUPPORT_PHONE}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={`tel:+91${SUPPORT_PHONE}`}
                                        className="bg-[#b52603] text-white text-[11px] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#fd5835] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold"
                                    >
                                        <PhoneCall size={13} />
                                        <span>Call Now</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(SUPPORT_PHONE, 'phone')}
                                        className="bg-white text-[#1c1b1b] text-[11px] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#ebe7e7] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold cursor-pointer"
                                    >
                                        {copiedField === 'phone' ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedField === 'phone' ? 'Copied!' : 'Copy No.'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsContactOpen(false)}
                            className="w-full bg-[#ebe7e7] hover:bg-[#e5e2e1] text-[#1c1b1b] text-[13px] leading-4 font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2.5px_2.5px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                            Got It
                        </button>
                    </div>
                </ModalBackdrop>
            )}
        </div>
    )
}
