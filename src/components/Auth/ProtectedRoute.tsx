'use client'

import React, { useState } from 'react'
import { useAscendoreAuth } from '@/contexts/AscendoreAuthContext'
import LoginForm from './LoginForm'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAscendoreAuth()
  const [isSignUp, setIsSignUp] = useState(false)

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

  if (!user) {
    return (
      <LoginForm
        isSignUp={isSignUp}
        onToggleMode={() => setIsSignUp(!isSignUp)}
      />
    )
  }

  return <>{children}</>
}
