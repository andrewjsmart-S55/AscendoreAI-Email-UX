'use client'

import { useState } from 'react'
import { useAscendoreAuth } from '@/contexts/AscendoreAuthContext'
import LoginForm from '@/components/Auth/LoginForm'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { isAuthenticated, loading, user, logout } = useAscendoreAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginForm
        isSignUp={isSignUp}
        onToggleMode={() => setIsSignUp(!isSignUp)}
      />
    )
  }

  // Show dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AscendoreAI Email</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user?.displayName || user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connect Your Email Accounts
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your Gmail or Outlook accounts to start managing your emails with AI-powered features.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConnectEmailCard
              provider="gmail"
              title="Connect Gmail"
              description="Connect your Google account to sync Gmail"
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              }
            />
            <ConnectEmailCard
              provider="outlook"
              title="Connect Outlook"
              description="Connect your Microsoft account to sync Outlook"
              icon={
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#0078D4">
                  <path d="M21.17 2.06A2 2 0 0119.79 2H4.21a2 2 0 00-2 2.06L2 19.94a2 2 0 002.21 2.06h15.58a2 2 0 002.21-2.06V4.06zM12 13.5L4 8.5V6l8 5 8-5v2.5l-8 5z"/>
                </svg>
              }
            />
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Display Name</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user?.displayName || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {user?.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  )
}

function ConnectEmailCard({
  provider,
  title,
  description,
  icon
}: {
  provider: 'gmail' | 'outlook'
  title: string
  description: string
  icon: React.ReactNode
}) {
  const { connectGmail, connectOutlook } = useAscendoreAuth()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      if (provider === 'gmail') {
        await connectGmail()
      } else {
        await connectOutlook()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="border dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-grow">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
