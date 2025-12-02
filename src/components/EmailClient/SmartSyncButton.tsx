'use client'

import React, { useState } from 'react'
import { ArrowPathIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useBatchedSync, SyncProgress } from '@/hooks/useBatchedSync'

interface SmartSyncButtonProps {
  accountId?: string
  accountEmail?: string
  disabled?: boolean
  onSyncProgress?: (progress: SyncProgress) => void
}

export default function SmartSyncButton({
  accountId,
  accountEmail,
  disabled,
  onSyncProgress
}: SmartSyncButtonProps) {
  const [isManualPaused, setIsManualPaused] = useState(false)

  const {
    startBatchedSync,
    pauseSync,
    resumeSync,
    resetSync,
    syncState
  } = useBatchedSync(accountId, {
    onProgress: onSyncProgress
  })

  const handleSyncAction = () => {
    if (syncState.status === 'idle') {
      startBatchedSync()
      setIsManualPaused(false)
    } else if (syncState.status === 'running') {
      pauseSync()
      setIsManualPaused(true)
    } else if (syncState.status === 'paused') {
      resumeSync()
      setIsManualPaused(false)
    }
  }

  const handleReset = () => {
    resetSync()
    setIsManualPaused(false)
  }

  const isRunning = syncState.status === 'running'
  const isPaused = syncState.status === 'paused'
  const isCompleted = syncState.status === 'completed'
  const hasError = syncState.status === 'error'

  const getButtonContent = () => {
    if (isRunning) {
      return (
        <>
          <PauseIcon className="h-4 w-4" />
          Syncing... ({syncState.progress.foldersCompleted}/{syncState.progress.totalFolders} folders, {syncState.progress.emailsSynced} emails)
        </>
      )
    } else if (isPaused) {
      return (
        <>
          <PlayIcon className="h-4 w-4" />
          Resume Sync
        </>
      )
    } else if (isCompleted) {
      return (
        <>
          <ArrowPathIcon className="h-4 w-4" />
          Sync Again
        </>
      )
    } else {
      return (
        <>
          <ArrowPathIcon className="h-4 w-4" />
          Smart Sync
        </>
      )
    }
  }

  const getButtonStyle = () => {
    if (disabled || !accountId) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed'
    } else if (hasError) {
      return 'bg-red-50 text-red-600 hover:bg-red-100'
    } else if (isCompleted) {
      return 'bg-green-50 text-green-600 hover:bg-green-100'
    } else if (isRunning) {
      return 'bg-blue-100 text-blue-600 cursor-pointer hover:bg-blue-200'
    } else if (isPaused) {
      return 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
    } else {
      return 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSyncAction}
        disabled={disabled || !accountId}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
          transition-all duration-200 ${getButtonStyle()}
        `}
        title={`Smart sync for ${accountEmail || 'selected account'} (batches of 100 emails)`}
      >
        {getButtonContent()}
      </button>

      {(isPaused || isCompleted || hasError) && (
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          title="Reset sync"
        >
          Reset
        </button>
      )}
    </div>
  )
}