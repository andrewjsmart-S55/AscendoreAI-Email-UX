'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface NG2DashboardProps {
  className?: string
}

export default function NG2Dashboard({ className = '' }: NG2DashboardProps) {
  // Mock data from existing mock data file
  const mockUser = {
    email: 'andrew@boxzero.io',
    name: 'Andrew Smart'
  }
  const isAuthenticated = true

  // Use existing mock data structure
  const accounts = [
    {
      id: 'acc1',
      externalEmail: 'you@company.com',
      external_email: 'you@company.com',
      provider: 'Gmail',
      emailCount: 145,
      unreadCount: 12,
      lastSyncAt: new Date()
    },
    {
      id: 'acc2',
      externalEmail: 'you@projects.company.com',
      external_email: 'you@projects.company.com',
      provider: 'Outlook',
      emailCount: 89,
      unreadCount: 8,
      lastSyncAt: new Date()
    },
    {
      id: 'acc3',
      externalEmail: 'you@gmail.com',
      external_email: 'you@gmail.com',
      provider: 'Gmail',
      emailCount: 156,
      unreadCount: 5,
      lastSyncAt: new Date()
    }
  ]

  const accountsLoading = false

  const stats = {
    totalEmails: accounts.reduce((sum, acc) => sum + (acc.emailCount || 0), 0),
    unreadEmails: accounts.reduce((sum, acc) => sum + (acc.unreadCount || 0), 0),
    linkedAccounts: accounts.length,
    syncStatus: accounts.every(acc => acc.lastSyncAt) ? 'synced' : 'pending'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📊 BoxZero Dashboard
        </h2>
        <p className="text-gray-600">
          AI-powered email management at a glance
        </p>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">🔐 Authentication</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Status:</span>
            <span className={`ml-2 font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">User:</span>
            <span className="ml-2 font-medium text-gray-900">
              {mockUser?.email || 'Not logged in'}
            </span>
          </div>
        </div>
      </div>

      {/* Email Stats */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">📈 Email Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {accountsLoading ? '...' : stats.linkedAccounts}
            </div>
            <div className="text-sm text-blue-700">Linked Accounts</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {accountsLoading ? '...' : stats.totalEmails.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">Total Emails</div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">
              {accountsLoading ? '...' : stats.unreadEmails.toLocaleString()}
            </div>
            <div className="text-sm text-orange-700">Unread Emails</div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {accountsLoading ? '...' : stats.syncStatus === 'synced' ? '✅' : '🔄'}
            </div>
            <div className="text-sm text-purple-700">Sync Status</div>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      {accounts && accounts.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">📧 Account Summary</h3>
          <div className="space-y-3">
            {accounts.slice(0, 3).map((account, index) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {account.externalEmail || account.external_email || 'Unknown Account'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {account.provider || 'Unknown Provider'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(account.emailCount || 0).toLocaleString()} emails
                  </div>
                  <div className="text-xs text-gray-600">
                    {(account.unreadCount || 0).toLocaleString()} unread
                  </div>
                </div>
              </div>
            ))}

            {accounts.length > 3 && (
              <div className="text-center py-2 text-sm text-gray-600">
                +{accounts.length - 3} more accounts
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights Placeholder */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">🤖 AI Insights</h3>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-700 mb-2">
            📊 <strong>Productivity Insight:</strong> Your email activity patterns suggest optimal processing times between 9-11 AM.
          </div>
          <div className="text-sm text-gray-700 mb-2">
            🎯 <strong>Priority Alert:</strong> {stats.unreadEmails > 50 ? 'High unread count detected. Consider using Smart Sync.' : 'Inbox looking clean! Great job staying organized.'}
          </div>
          <div className="text-sm text-gray-700">
            💡 <strong>Suggestion:</strong> {stats.syncStatus === 'pending' ? 'Run a sync to get the latest emails.' : 'All accounts are up to date.'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">⚡ Quick Status</h3>
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isAuthenticated ? '🔓 Authenticated' : '🔒 Authentication Required'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${stats.linkedAccounts > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
            📧 {stats.linkedAccounts} Account{stats.linkedAccounts !== 1 ? 's' : ''}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${stats.syncStatus === 'synced' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {stats.syncStatus === 'synced' ? '✅ Synced' : '🔄 Sync Pending'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}