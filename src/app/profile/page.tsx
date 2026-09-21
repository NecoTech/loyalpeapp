'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans, Syne } from 'next/font/google'
import {
    ArrowLeft,
    Heart,
    User,
    Pencil,
    Smartphone,
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
    Gavel,
    Store,
    Award,
    Shield,
    Info,
    MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../../../lib/utils'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../../lib/support'

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

// The page title sits in a two-item space-between row, so trailing
// non-breaking spaces are what pull the word in from the right edge.
const TITLE_TEXT = 'profile' + ' ' + '  '.repeat(20)

function ModalBackdrop({ onClose, children, maxWidth = '340px', contentClassName }: { onClose: () => void; children: ReactNode; maxWidth?: string; contentClassName?: string }) {
    return (
        <div
            className="modal-backdrop-in fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className={cn(
                    "modal-pop-in bg-white border-[3px] border-[#1c1b1b] rounded-2xl p-4 w-full shadow-[6px_6px_0px_#111111] text-center relative",
                    contentClassName
                )}
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
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-[#ebe7e7] border-2 border-[#1c1b1b] flex items-center justify-center shadow-[2px_2px_0px_#111111] hover:bg-[#e5e2e1] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
        >
            <X size={14} />
        </button>
    )
}

function SettingsRow({
    icon, iconBg, iconColor, label, labelColor = '#1c1b1b', chevronColor = '#434656', onClick, hoverBg = 'hover:bg-[#f6f3f2]',
}: {
    icon: ReactNode
    iconBg: string
    iconColor: string
    label: string
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
                <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold" style={{ color: labelColor }}>{label}</p>
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
    const [isTermsOpen, setIsTermsOpen] = useState(false)
    const [isAboutOpen, setIsAboutOpen] = useState(false)
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
        return <div className="min-h-screen bg-white" />
    }

    const avatarLetter = (editName || user.fullname || '').trim()[0]?.toUpperCase() || '?'

    return (
        <div className={cn(plusJakartaSans.className, "min-h-screen bg-white text-[#1c1b1b] antialiased selection:bg-[#ffdf99]")}>
            <div className="max-w-[428px] mx-auto min-h-screen flex flex-col relative shadow-2xl bg-white">
                {/* Top App Bar */}
                <header className="sticky top-0 z-40 bg-white border-b-[3px] border-[#1c1b1b] shadow-[0px_3px_0px_#111111]">
                    <div className="flex justify-between items-center w-full px-4 py-3 max-w-[428px] mx-auto bg-white">
                        <button
                            aria-label="Go back"
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-lg bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center hover:translate-x-px hover:translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-75 cursor-pointer"
                        >
                            <ArrowLeft size={20} strokeWidth={2.5} className="text-[#1c1b1b]" />
                        </button>
                        <div className="flex items-center gap-1.5">
                            <h1 aria-label="profile" className="text-xl leading-[26px] tracking-tight font-extrabold text-[#1c1b1b]">{TITLE_TEXT}</h1>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-4 pt-4 pb-28 space-y-6">
                    {/* Hero Profile Card */}
                    <section className="relative bg-[#dde1ff] border-[3px] border-[#1c1b1b] rounded-xl p-4 shadow-[4px_4px_0px_#111111] overflow-hidden">
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-[#ffdf99] border-[3px] border-[#1c1b1b] rounded-full flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                            <Heart size={18} fill="currentColor" className="text-[#251a00]" />
                        </div>
                        <div className="flex items-start gap-3 mb-3">
                            <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[#0040e0] rounded-xl">
                                    <User size={32} strokeWidth={2.25} />
                                </div>
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
                                        <Pencil size={15} />
                                        <span className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b]">Edit</span>
                                    </button>
                                </div>
                                <p className="text-sm leading-5 font-medium text-[#434656] flex items-center gap-1 mt-0.5">
                                    <Smartphone size={14} />
                                    <span>{user.phoneNumber || 'Add phone number'}</span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Account Settings */}
                    <section className="space-y-2">
                        <h3 className="text-[17px] leading-[22px] tracking-[-0.01em] font-bold text-[#1c1b1b]">Account Settings</h3>
                        <div className="bg-white border-[3px] border-[#1c1b1b] rounded-xl shadow-[3px_3px_0px_#111111] divide-y-[2.5px] divide-[#1c1b1b] overflow-hidden">
                            <SettingsRow
                                icon={<Trash2 size={19} />}
                                iconBg="#ffdad2"
                                iconColor="#b52603"
                                label="Delete Account"
                                onClick={() => setIsDeleteOpen(true)}
                            />
                            <SettingsRow
                                icon={<FileText size={19} />}
                                iconBg="#ebe7e7"
                                iconColor="#1c1b1b"
                                label="terms and conditions"
                                onClick={() => setIsTermsOpen(true)}
                            />
                            <SettingsRow
                                icon={<Headphones size={19} />}
                                iconBg="#ebe7e7"
                                iconColor="#1c1b1b"
                                label="Contact & Support"
                                onClick={() => setIsContactOpen(true)}
                            />
                            <SettingsRow
                                icon={<Info size={19} />}
                                iconBg="#ebe7e7"
                                iconColor="#1c1b1b"
                                label="About"
                                onClick={() => setIsAboutOpen(true)}
                            />
                            <SettingsRow
                                icon={<LogOut size={19} />}
                                iconBg="#ffdad2"
                                iconColor="#b52603"
                                label="Log Out"
                                labelColor="#b52603"
                                chevronColor="#b52603"
                                hoverBg="hover:bg-[#ffdad6]/30"
                                onClick={() => setIsLogoutOpen(true)}
                            />
                        </div>

                        <div className="text-center pt-2 pb-3">
                            <div
                                aria-hidden="true"
                                className={cn(syne.className, "flex flex-col items-center justify-center pt-8 pb-4 select-none pointer-events-none")}
                            >
                                <span className="text-[38px] font-extrabold tracking-tighter lowercase leading-[0.9] text-[#e3e6ee] opacity-[0.85] text-center">loyalty starts</span>
                                <span className="text-[38px] font-extrabold tracking-tighter lowercase leading-[0.9] text-[#e3e6ee] opacity-[0.85] mt-1 text-center">with loyalpe</span>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            {/* Edit Profile Modal */}
            {isEditOpen && (
                <ModalBackdrop onClose={() => setIsEditOpen(false)}>
                    <ModalCloseButton onClick={() => setIsEditOpen(false)} />
                    <div className="text-left">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#dde1ff] border-2 border-[#1c1b1b] flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                                <UserCog size={20} className="text-[#0040e0]" />
                            </div>
                            <h4 className="text-xl leading-[26px] tracking-tight font-extrabold text-[#1c1b1b]">Edit Profile</h4>
                        </div>

                        <div className="flex flex-col items-center justify-center mb-3">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-white border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center text-[32px] leading-[38px] tracking-[-0.025em] font-extrabold text-[#0040e0] select-none">
                                    {avatarLetter}
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
                                        className="absolute right-2.5 p-0.5 text-[#434656] hover:text-[#1c1b1b] flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {editError && <p className="text-[#ba1a1a] text-xs font-semibold">{editError}</p>}

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-[#0040e0] hover:bg-[#2e5bff] text-white text-[13px] leading-4 tracking-[0.03em] font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                                >
                                    <Check size={18} />
                                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
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
                    <h4 className="text-xl leading-[26px] tracking-tight font-extrabold text-[#1c1b1b] mb-2">Delete Account?</h4>
                    <p className="text-xs font-semibold text-[#434656] mb-4 leading-relaxed">
                        Are you sure you want to delete your account? All your active stamps, cashback, and saved rewards data will be permanently removed.
                    </p>
                    {deleteError && <p className="text-[#ba1a1a] text-xs font-semibold mb-3">{deleteError}</p>}
                    {/* The confirm button is kept even though the design's modal
                        only has the close (X) button — without it there would be
                        no way to actually delete the account. */}
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleConfirmDelete}
                        className="w-full bg-[#b52603] hover:bg-[#fd5835] text-white text-[13px] leading-4 tracking-[0.03em] font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                        <Trash2 size={16} />
                        <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Account'}</span>
                    </button>
                </ModalBackdrop>
            )}

            {/* Logout Modal */}
            {isLogoutOpen && (
                <ModalBackdrop onClose={() => setIsLogoutOpen(false)}>
                    <ModalCloseButton onClick={() => setIsLogoutOpen(false)} />
                    <div className="w-16 h-16 rounded-full bg-[#ffdad2] text-[#b52603] border-[3px] border-[#1c1b1b] shadow-[3px_3px_0px_#111111] flex items-center justify-center mx-auto mb-3">
                        <LogOut size={28} />
                    </div>
                    <h4 className="text-xl leading-[26px] tracking-tight font-extrabold text-[#1c1b1b] mb-2">Log Out?</h4>
                    <p className="text-xs font-semibold text-[#434656] mb-4 leading-relaxed">
                        Are you sure you want to log out of your loyalpe account? You&apos;ll need to sign back in to continue.
                    </p>
                    {/* Kept for the same reason as the delete confirmation above. */}
                    <button
                        type="button"
                        onClick={handleConfirmLogout}
                        className="w-full bg-[#b52603] hover:bg-[#fd5835] text-white text-[13px] leading-4 tracking-[0.03em] font-extrabold py-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[3px_3px_0px_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <LogOut size={16} />
                        <span>Yes, Log Out</span>
                    </button>
                </ModalBackdrop>
            )}

            {/* Contact & Support Modal */}
            {isContactOpen && (
                <ModalBackdrop onClose={() => setIsContactOpen(false)} maxWidth="360px" contentClassName="shadow-[4px_4px_0px_#111111]">
                    <ModalCloseButton onClick={() => setIsContactOpen(false)} />
                    <div className="text-left">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-[#ffdf99] border-[3px] border-[#1c1b1b] flex items-center justify-center shadow-[3px_3px_0px_#111111]">
                                <Headphones size={24} className="text-[#251a00]" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad2] border-[1.5px] border-[#1c1b1b] mb-0.5">
                                    <span className="w-2 h-2 rounded-full bg-[#b52603] animate-pulse" />
                                    <span className="text-[10px] font-extrabold text-[#b52603] tracking-wide uppercase">Available 24/7</span>
                                </div>
                                <h4 className="text-xl leading-[26px] tracking-tight font-extrabold text-[#1c1b1b]">Contact &amp; Support</h4>
                            </div>
                        </div>
                        <p className="text-xs font-semibold text-[#434656] mb-4 leading-normal">
                            Have questions about your loyalty stamps, perks, or account? Reach out to our dedicated support crew anytime!
                        </p>

                        <div className="space-y-3 mb-4">
                            <div className="p-3 bg-[#f6f3f2] border-[2.5px] border-[#1c1b1b] rounded-xl shadow-[2.5px_2.5px_0px_#111111]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Mail size={19} className="text-[#0040e0]" />
                                    <span className="text-[11px] leading-[14px] font-extrabold text-[#1c1b1b] uppercase tracking-wider">Email Support</span>
                                </div>
                                <p className="text-sm leading-5 font-bold text-[#1c1b1b] select-all mb-2">{SUPPORT_EMAIL}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}`}
                                        className="bg-[#0040e0] text-white text-[11px] leading-[14px] tracking-[0.04em] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#2e5bff] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 text-center font-extrabold"
                                    >
                                        <Send size={14} />
                                        <span>Send Mail</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(SUPPORT_EMAIL, 'email')}
                                        className={cn(
                                            "text-[#1c1b1b] text-[11px] leading-[14px] tracking-[0.04em] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold cursor-pointer",
                                            copiedField === 'email' ? "bg-[#ffdf99]" : "bg-white hover:bg-[#ebe7e7]"
                                        )}
                                    >
                                        {copiedField === 'email' ? <Check size={14} /> : <Copy size={14} />}
                                        <span>{copiedField === 'email' ? 'Email Copied!' : 'Copy Email'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-[#f6f3f2] border-[2.5px] border-[#1c1b1b] rounded-xl shadow-[2.5px_2.5px_0px_#111111]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Phone size={19} className="text-[#b52603]" />
                                    <span className="text-[11px] leading-[14px] font-extrabold text-[#1c1b1b] uppercase tracking-wider">Phone Support</span>
                                </div>
                                <p className="text-sm leading-5 font-bold text-[#1c1b1b] select-all mb-2">{SUPPORT_PHONE}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={`tel:+91${SUPPORT_PHONE}`}
                                        className="bg-[#b52603] text-white text-[11px] leading-[14px] tracking-[0.04em] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] hover:bg-[#fd5835] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 text-center font-extrabold"
                                    >
                                        <PhoneCall size={14} />
                                        <span>Call Now</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(SUPPORT_PHONE, 'phone')}
                                        className={cn(
                                            "text-[#1c1b1b] text-[11px] leading-[14px] tracking-[0.04em] py-2 px-2.5 rounded-lg border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-1 font-extrabold cursor-pointer",
                                            copiedField === 'phone' ? "bg-[#ffdf99]" : "bg-white hover:bg-[#ebe7e7]"
                                        )}
                                    >
                                        {copiedField === 'phone' ? <Check size={14} /> : <Copy size={14} />}
                                        <span>{copiedField === 'phone' ? 'Phone Copied!' : 'Copy No.'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBackdrop>
            )}

            {/* Terms & Conditions Modal */}
            {isTermsOpen && (
                <ModalBackdrop onClose={() => setIsTermsOpen(false)} maxWidth="380px" contentClassName="max-h-[85vh] flex flex-col">
                    <ModalCloseButton onClick={() => setIsTermsOpen(false)} />
                    <div className="text-left flex flex-col min-h-0">
                        <div className="flex items-center gap-3 mb-2 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-[#dde1ff] border-[3px] border-[#1c1b1b] flex items-center justify-center shadow-[3px_3px_0px_#111111]">
                                <Gavel size={24} className="text-[#0040e0]" />
                            </div>
                            <div>
                                <h4 className="text-xl leading-tight tracking-tight font-extrabold text-[#1c1b1b]">Terms &amp; Conditions</h4>
                                <p className="text-[11px] leading-[14px] tracking-[0.04em] font-bold text-[#0040e0]">Loyalpe+ Loyalty &amp; Rewards</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ffdf99] text-[#251a00] text-[11px] font-extrabold border-[1.5px] border-[#1c1b1b]">
                                v2.4.0 &bull; Updated May 2024
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ebe7e7] text-[#434656] text-[11px] font-bold border-[1.5px] border-[#1c1b1b]">
                                Official Policy
                            </span>
                        </div>

                        <div className="overflow-y-auto pr-1 space-y-2.5 flex-1 text-[#1c1b1b]">
                            <div className="p-2.5 rounded-lg bg-[#f6f3f2] border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold flex items-center gap-1.5 mb-1">
                                    <Store size={14} className="text-[#0040e0]" />
                                    1. About Loyalpe
                                </p>
                                <p className="text-xs font-semibold text-[#434656] leading-relaxed">
                                    Loyalpe connects you with local cafes, restaurants, and retail spots to unlock instant cashback, digital loyalty stamp cards, and exclusive neighborhood perks.
                                </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-[#f6f3f2] border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold flex items-center gap-1.5 mb-1">
                                    <Award size={14} className="text-[#b52603]" />
                                    2. Stamp &amp; Reward Policy
                                </p>
                                <p className="text-xs font-semibold text-[#434656] leading-relaxed">
                                    Stamps are credited automatically on verified merchant payments. Rewards are non-transferable and subject to merchant store hours and terms.
                                </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-[#f6f3f2] border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold flex items-center gap-1.5 mb-1">
                                    <Shield size={14} className="text-[#0040e0]" />
                                    3. Privacy &amp; Security
                                </p>
                                <p className="text-xs font-semibold text-[#434656] leading-relaxed">
                                    All transaction data and payment security adheres strictly to standard encryption protocols. We never share your banking details.
                                </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-[#f6f3f2] border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                <p className="text-[13px] leading-4 tracking-[0.03em] font-extrabold flex items-center gap-1.5 mb-1">
                                    <Headphones size={14} className="text-[#6b5100]" />
                                    4. Support &amp; Dispute
                                </p>
                                <p className="text-xs font-semibold text-[#434656] leading-relaxed">
                                    Reach out directly via 24/7 dedicated assistance for transaction reversals or merchant loyalty queries.
                                </p>
                            </div>
                        </div>

                        <div className="pt-3 mt-1 shrink-0" />
                    </div>
                </ModalBackdrop>
            )}

            {/* About Modal */}
            {isAboutOpen && (
                <ModalBackdrop onClose={() => setIsAboutOpen(false)} maxWidth="380px" contentClassName="max-h-[85vh] flex flex-col">
                    <ModalCloseButton onClick={() => setIsAboutOpen(false)} />
                    <div className="text-left flex flex-col min-h-0 space-y-4">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-[#ffdf99] border-[3px] border-[#1c1b1b] flex items-center justify-center shadow-[3px_3px_0px_#111111]">
                                <Info size={24} className="text-[#251a00]" />
                            </div>
                            <div>
                                <h4 className="text-xl leading-tight tracking-tight font-extrabold text-[#1c1b1b]">About loyalpe</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ffdad2] text-[#b52603] text-[11px] font-extrabold border-[1.5px] border-[#1c1b1b]">
                                        v2.4.0 (Build 89)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-y-auto pr-1 space-y-3 flex-1">
                            <div className="p-3 rounded-xl bg-[#dde1ff] border-2 border-[#1c1b1b] shadow-[2px_2px_0px_#111111]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[17px] leading-[22px] tracking-[-0.01em] font-extrabold text-[#0040e0]">loyalpe+</span>
                                    <span className="text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#1c1b1b] font-extrabold">
                                        Rewards &bull; Perks &bull; You
                                    </span>
                                </div>
                                <p className="text-xs font-semibold leading-relaxed text-[#434656]">
                                    Connecting neighborhood cafes, stores, and customers with seamless UPI payments and local rewards.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="p-2.5 rounded-lg bg-[#f6f3f2] border-2 border-[#1c1b1b] flex items-start gap-2.5 shadow-[2px_2px_0px_#111111]">
                                    <MapPin size={20} className="text-[#0040e0] shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] leading-[14px] tracking-[0.04em] font-extrabold text-[#1c1b1b]">Registered Office</p>
                                        <p className="text-xs leading-4 font-semibold text-[#434656]">thodupuzha , idukki , keralam</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 shrink-0" />
                    </div>
                </ModalBackdrop>
            )}
        </div>
    )
}
