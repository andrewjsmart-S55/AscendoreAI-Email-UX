'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ascendoreAuth, AscendoreUser, EmailAccount } from '@/lib/ascendore-auth'

interface AscendoreAuthContextType {
  user: AscendoreUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  emailAccounts: EmailAccount[]
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, displayName?: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  connectGmail: () => Promise<void>
  connectOutlook: () => Promise<void>
  loadEmailAccounts: () => Promise<void>
  clearError: () => void
}

const AscendoreAuthContext = createContext<AscendoreAuthContextType | undefined>(undefined)

export function useAscendoreAuth() {
  const context = useContext(AscendoreAuthContext)
  if (context === undefined) {
    throw new Error('useAscendoreAuth must be used within an AscendoreAuthProvider')
  }
  return context
}

interface AscendoreAuthProviderProps {
  children: React.ReactNode
}

export function AscendoreAuthProvider({ children }: AscendoreAuthProviderProps) {
  const [user, setUser] = useState<AscendoreUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = ascendoreAuth.getUser()
      if (currentUser && ascendoreAuth.isAuthenticated()) {
        setUser(currentUser)
        // Validate token by fetching current user
        const freshUser = await ascendoreAuth.getCurrentUser()
        if (freshUser) {
          setUser(freshUser)
          // Load email accounts
          const accounts = await ascendoreAuth.getEmailAccounts()
          setEmailAccounts(accounts)
        } else {
          // Token is invalid, clear auth state
          await ascendoreAuth.logout()
          setUser(null)
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const result = await ascendoreAuth.login(email, password)
      if (result.success && result.data) {
        setUser(result.data.user)
        // Load email accounts after login
        const accounts = await ascendoreAuth.getEmailAccounts()
        setEmailAccounts(accounts)
        return true
      } else {
        setError(result.message || 'Login failed')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const result = await ascendoreAuth.register(email, password, displayName)
      if (result.success && result.data) {
        setUser(result.data.user)
        return true
      } else {
        setError(result.message || 'Registration failed')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await ascendoreAuth.logout()
      setUser(null)
      setEmailAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const freshUser = await ascendoreAuth.getCurrentUser()
    if (freshUser) {
      setUser(freshUser)
    }
  }, [])

  const connectGmail = useCallback(async () => {
    const authUrl = await ascendoreAuth.getGoogleAuthUrl()
    if (authUrl) {
      window.location.href = authUrl
    } else {
      setError('Failed to get Gmail authorization URL')
    }
  }, [])

  const connectOutlook = useCallback(async () => {
    const authUrl = await ascendoreAuth.getMicrosoftAuthUrl()
    if (authUrl) {
      window.location.href = authUrl
    } else {
      setError('Failed to get Outlook authorization URL')
    }
  }, [])

  const loadEmailAccounts = useCallback(async () => {
    const accounts = await ascendoreAuth.getEmailAccounts()
    setEmailAccounts(accounts)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AscendoreAuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: ascendoreAuth.isAuthenticated(),
    emailAccounts,
    signIn,
    signUp,
    logout,
    refreshUser,
    connectGmail,
    connectOutlook,
    loadEmailAccounts,
    clearError,
  }

  return (
    <AscendoreAuthContext.Provider value={value}>
      {children}
    </AscendoreAuthContext.Provider>
  )
}
