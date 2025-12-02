'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function NG2AuthStatus() {
  const [isExpanded, setIsExpanded] = useState(false)

  const accounts = [
    {
      name: 'Work Gmail',
      email: 'andrew@company.com',
      status: 'connected',
      unread: 12,
      lastSync: '2 min ago',
      syncStatus: 'success'
    },
    {
      name: 'Personal Gmail',
      email: 'andrew@gmail.com',
      status: 'connected',
      unread: 8,
      lastSync: '1 min ago',
      syncStatus: 'success'
    },
    {
      name: 'Project Outlook',
      email: 'andrew@project.com',
      status: 'connected',
      unread: 4,
      lastSync: '3 min ago',
      syncStatus: 'success'
    }
  ]

  const totalUnread = accounts.reduce((sum, account) => sum + account.unread, 0)

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Account Status</h3>
                <span className="text-xs text-gray-500">{accounts.length} accounts</span>
              </div>

              {accounts.map((account, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      account.syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{account.name}</div>
                      <div className="text-xs text-gray-500">{account.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{account.unread}</div>
                    <div className="text-xs text-gray-500">{account.lastSync}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-900">{accounts.length} Connected</span>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">{totalUnread}</div>
          <div className="text-xs text-gray-500">unread</div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUpIcon className="h-4 w-4 text-gray-400" />
        </motion.div>
      </motion.button>
    </div>
  )
}