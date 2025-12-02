'use client'

import React, { useState, useEffect } from 'react'
import { ascendoreAuth } from '@/lib/ascendore-auth'
import { useAccounts } from '@/hooks/useEmails'

export default function AuthStatus() {
  // Use state to avoid hydration mismatch (localStorage not available on server)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { data: accountsData, isLoading, error } = useAccounts()

  useEffect(() => {
    setMounted(true)
    setCurrentUser(ascendoreAuth.getUser())
    setAuthToken(ascendoreAuth.getToken())
  }, [])

  // Don't render auth-dependent content until mounted on client
  if (!mounted) {
    return (
      <div className="fixed bottom-4 left-4 bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg max-w-xs z-50">
        <h3 className="text-sm font-bold text-blue-600 mb-2">Auth Status</h3>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg max-w-xs z-50">
      <h3 className="text-sm font-bold text-blue-600 mb-2">Auth Status</h3>

      <div className="space-y-1 text-xs">
        <div>
          <span className="font-semibold">User:</span>{' '}
          {currentUser ? (
            <span className="text-green-600">{currentUser.email}</span>
          ) : (
            <span className="text-red-600">Not authenticated</span>
          )}
        </div>

        <div>
          <span className="font-semibold">Token:</span>{' '}
          {authToken ? (
            <span className="text-green-600">{authToken.substring(0, 15)}...</span>
          ) : (
            <span className="text-red-600">No token</span>
          )}
        </div>

        <div>
          <span className="font-semibold">Accounts:</span>{' '}
          {isLoading ? (
            <span className="text-yellow-600">Loading...</span>
          ) : error ? (
            <span className="text-red-600">Error</span>
          ) : accountsData?.accounts ? (
            <span className="text-green-600">{accountsData.accounts.length} found</span>
          ) : (
            <span className="text-red-600">None</span>
          )}
        </div>

        <div>
          <span className="font-semibold">Data Source:</span>{' '}
          {accountsData?.accounts && accountsData.accounts.length > 0 ? (
            <span className="text-green-600">API</span>
          ) : (
            <span className="text-yellow-600">No data</span>
          )}
        </div>
      </div>

      {!currentUser && (
        <div className="mt-2 pt-2 border-t text-xs text-red-600">
          Please sign in to authenticate
        </div>
      )}
    </div>
  )
}
