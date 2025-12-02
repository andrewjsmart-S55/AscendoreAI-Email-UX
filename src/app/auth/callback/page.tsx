'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiService } from '@/lib/api'
import { toast } from 'react-hot-toast'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const provider = searchParams.get('provider') || 'microsoft'
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        console.log('Processing OAuth callback:', { provider, code: code.substring(0, 20) + '...' })

        // Call the BoxZero API to exchange the code for a linked account
        const redirectUri = `${window.location.origin}/auth/callback`
        const result = await apiService.oauthCallback(provider as 'microsoft' | 'google', code, redirectUri)

        console.log('OAuth callback result:', result)

        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected successfully!`)

        // Redirect back to settings
        router.push('/dashboard?tab=settings&section=accounts')

      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setError(error.message || 'Failed to connect account')
        toast.error(error.message || 'Failed to connect account')

        // Redirect back to settings after a delay
        setTimeout(() => {
          router.push('/dashboard?tab=settings&section=accounts')
        }, 3000)
      } finally {
        setIsProcessing(false)
      }
    }

    processOAuthCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Your Account</h2>
              <p className="text-gray-600">Please wait while we connect your email account...</p>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Redirecting back to settings...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Connected!</h2>
              <p className="text-gray-600 mb-4">Your email account has been successfully connected.</p>
              <p className="text-sm text-gray-500">Redirecting back to settings...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}