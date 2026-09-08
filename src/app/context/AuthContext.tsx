'use client'

import React, { createContext, useState, useContext, useEffect } from 'react'
import { encrypt, decrypt } from '..//..//..//lib/encryption' // Import your encryption utilities

type User = {
  fullname: string
  phoneNumber: string
  email?: string | null
  hasPin?: boolean
  isFaculty?: boolean
}

type AuthResult = { success: true } | { success: false; error: string }

type AuthContextType = {
  user: User | null
  isInitialized: boolean
  login: (user: User) => void
  logout: () => void
  register: (user: User) => void
  signUp: (email: string, password: string, fullname?: string, phoneNumber?: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  updateProfile: (updates: { fullname?: string; phoneNumber?: string; newPassword?: string }) => Promise<AuthResult>
  deleteAccount: () => Promise<AuthResult>
}

const AUTH_STORAGE_KEY = 'authData' // Using a less obvious key name

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if user is stored in localStorage on initial load
    const encryptedUserData = localStorage.getItem(AUTH_STORAGE_KEY)

    if (encryptedUserData) {
      try {
        // Decrypt the user data
        const userData = decrypt(encryptedUserData)
        setUser(userData)
      } catch (error) {
        console.error('Error decrypting user data:', error)
        // Clear invalid data
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
    setIsInitialized(true)
  }, [])

  const login = (userData: User) => {
    // Merge with any existing authData instead of overwriting it —
    // other parts of the app (PIN setup, faculty flag) write extra
    // fields here and we don't want login() to clobber them.
    let mergedData: User = userData
    try {
      const existing = localStorage.getItem(AUTH_STORAGE_KEY)
      if (existing) {
        const prev = decrypt(existing)
        mergedData = { ...prev, ...userData }
      }
    } catch (error) {
      console.error('Error reading existing auth data, proceeding with fresh data:', error)
    }

    setUser(mergedData)
    try {
      // Encrypt the user data before storing
      const encryptedData = encrypt(mergedData)
      localStorage.setItem(AUTH_STORAGE_KEY, encryptedData)
    } catch (error) {
      console.error('Error encrypting user data:', error)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const register = (userData: User) => {
    // In a real app, you would send this data to your backend
    login(userData)
  }

  const signUp = async (email: string, password: string, fullname?: string, phoneNumber?: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullname, phoneNumber }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create account.' }
      }

      login(data.user as User)
      return { success: true }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sign in.' }
      }

      login(data.user as User)
      return { success: true }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const updateProfile = async (updates: { fullname?: string; phoneNumber?: string; newPassword?: string }): Promise<AuthResult> => {
    if (!user?.email) {
      return { success: false, error: 'Not signed in.' }
    }
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...updates }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update profile.' }
      }

      login(data.user as User)
      return { success: true }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const deleteAccount = async (): Promise<AuthResult> => {
    if (!user?.email) {
      return { success: false, error: 'Not signed in.' }
    }
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to delete account.' }
      }

      logout()
      return { success: true }
    } catch (error) {
      console.error('Delete account error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isInitialized, login, logout, register, signUp, signIn, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}