'use client'

import React, { createContext, useState, useContext, useEffect } from 'react'
import { encrypt, decrypt } from '..//..//..//lib/encryption'

type Owner = {
  email: string
  restaurantName: string
  restaurantId?: string | null
  city?: string | null
}

type AuthResult = { success: true } | { success: false; error: string }

type AdminAuthContextType = {
  owner: Owner | null
  isLoading: boolean
  logout: () => void
  signUp: (email: string, password: string, restaurantName: string, restaurantId?: string, city?: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
}

const ADMIN_AUTH_STORAGE_KEY = 'adminAuthData'

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const encryptedOwnerData = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)
    if (encryptedOwnerData) {
      try {
        setOwner(decrypt(encryptedOwnerData))
      } catch (error) {
        console.error('Error decrypting admin session:', error)
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const persist = (ownerData: Owner) => {
    setOwner(ownerData)
    try {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, encrypt(ownerData))
    } catch (error) {
      console.error('Error encrypting admin session:', error)
    }
  }

  const logout = () => {
    setOwner(null)
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY)
  }

  const signUp = async (email: string, password: string, restaurantName: string, restaurantId?: string, city?: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/admin/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, restaurantName, restaurantId, city }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create account.' }
      }

      persist(data.owner as Owner)
      return { success: true }
    } catch (error) {
      console.error('Admin sign up error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sign in.' }
      }

      persist(data.owner as Owner)
      return { success: true }
    } catch (error) {
      console.error('Admin sign in error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  return (
    <AdminAuthContext.Provider value={{ owner, isLoading, logout, signUp, signIn }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
