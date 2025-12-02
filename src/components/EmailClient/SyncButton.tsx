'use client'

import React from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useSyncAccountMessages } from '@/hooks/useEmails'

interface SyncButtonProps {
  accountId?: string
  accountEmail?: string
  disabled?: boolean
}

export default function SyncButton({ accountId, accountEmail, disabled }: SyncButtonProps) {
  const syncMutation = useSyncAccountMessages(accountId)

  const handleSync = () => {
    if (!accountId) return
    syncMutation.mutate()
  }

  return (
    <button
      onClick={handleSync}
      disabled={disabled || !accountId || syncMutation.isPending}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
        transition-all duration-200
        ${
          disabled || !accountId
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : syncMutation.isPending
            ? 'bg-blue-100 text-blue-600 cursor-wait'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'
        }
      `}
      title={`Sync messages for ${accountEmail || 'selected account'}`}
    >
      <ArrowPathIcon
        className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
      />
      {syncMutation.isPending ? 'Starting sync...' : 'Sync Messages'}
    </button>
  )
}