'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ascendoreAuth } from '@/lib/ascendore-auth'
import { apiService } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ascendore-email-api.azurewebsites.net'

export default function AuthDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    try {
      // Test 1: Check current authentication status
      results.tests.currentAuth = {
        isAuthenticated: ascendoreAuth.isAuthenticated(),
        currentUser: ascendoreAuth.getUser(),
        token: ascendoreAuth.getToken() ? 'Present' : 'Missing',
        tokenLength: ascendoreAuth.getToken()?.length || 0
      }

      // Test 2: Test API endpoints with current token
      if (ascendoreAuth.isAuthenticated()) {
        const token = ascendoreAuth.getToken()

        // Test /api/auth/me endpoint
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            results.tests.authMe = {
              status: 'SUCCESS',
              statusCode: response.status,
              user: data
            }
          } else {
            const errorText = await response.text()
            results.tests.authMe = {
              status: 'FAILED',
              statusCode: response.status,
              error: errorText
            }
          }
        } catch (error: any) {
          results.tests.authMe = {
            status: 'ERROR',
            error: error.message
          }
        }

        // Test /api/accounts endpoint
        try {
          const response = await fetch(`${API_BASE_URL}/api/accounts`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            results.tests.accounts = {
              status: 'SUCCESS',
              statusCode: response.status,
              accountCount: Array.isArray(data.data) ? data.data.length : 0,
              accounts: data.data
            }
          } else {
            const errorText = await response.text()
            results.tests.accounts = {
              status: 'FAILED',
              statusCode: response.status,
              error: errorText
            }
          }
        } catch (error: any) {
          results.tests.accounts = {
            status: 'ERROR',
            error: error.message
          }
        }

      } else {
        results.tests.apiTests = {
          status: 'SKIPPED',
          reason: 'User not authenticated'
        }
      }

      // Test 3: Check API service configuration
      results.tests.apiConfig = {
        baseURL: API_BASE_URL,
        envVar: process.env.NEXT_PUBLIC_API_URL || '(using default)'
      }

      setDebugInfo(results)

    } catch (error: any) {
      results.error = error.message
      setDebugInfo(results)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-h-96 overflow-y-auto"
    >
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Debug Panel</h3>

      <div className="flex gap-2 mb-4">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Run Diagnostics'}
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">
            Last run: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'Unknown'}
          </div>

          {debugInfo.tests?.currentAuth && (
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="font-medium">Authentication Status:</div>
              <div>Authenticated: {debugInfo.tests.currentAuth.isAuthenticated ? 'Yes' : 'No'}</div>
              <div>User: {debugInfo.tests.currentAuth.currentUser?.email || 'None'}</div>
              <div>Token: {debugInfo.tests.currentAuth.token}</div>
            </div>
          )}

          {debugInfo.tests?.authMe && (
            <div className={`p-2 rounded text-xs ${
              debugInfo.tests.authMe.status === 'SUCCESS' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="font-medium">Auth Me API:</div>
              <div>Status: {debugInfo.tests.authMe.status} ({debugInfo.tests.authMe.statusCode})</div>
              {debugInfo.tests.authMe.error && (
                <div className="text-red-700">Error: {debugInfo.tests.authMe.error}</div>
              )}
            </div>
          )}

          {debugInfo.tests?.accounts && (
            <div className={`p-2 rounded text-xs ${
              debugInfo.tests.accounts.status === 'SUCCESS' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="font-medium">Accounts API:</div>
              <div>Status: {debugInfo.tests.accounts.status} ({debugInfo.tests.accounts.statusCode})</div>
              {debugInfo.tests.accounts.status === 'SUCCESS' && (
                <div>Accounts: {debugInfo.tests.accounts.accountCount}</div>
              )}
              {debugInfo.tests.accounts.error && (
                <div className="text-red-700">Error: {debugInfo.tests.accounts.error}</div>
              )}
            </div>
          )}

          {debugInfo.tests?.apiConfig && (
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="font-medium">API Configuration:</div>
              <div>Base URL: {debugInfo.tests.apiConfig.baseURL}</div>
              <div>Env Var: {debugInfo.tests.apiConfig.envVar}</div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
