'use client'

import React from 'react'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { SyncState } from '@/hooks/useBatchedSync'

interface SyncProgressIndicatorProps {
  syncState: SyncState
  accountEmail?: string
  className?: string
}

export default function SyncProgressIndicator({
  syncState,
  accountEmail,
  className = ''
}: SyncProgressIndicatorProps) {
  if (syncState.status === 'idle') {
    return null
  }

  const { status, progress, error, startTime } = syncState
  const { phase, currentFolder, foldersCompleted, totalFolders, emailsSynced } = progress

  const progressPercentage = totalFolders > 0 ? Math.round((foldersCompleted / totalFolders) * 100) : 0
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isCompleted = status === 'completed'
  const hasError = status === 'error'

  const getStatusIcon = () => {
    if (hasError) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />
    } else if (isCompleted) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else if (isPaused) {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />
    } else {
      return (
        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )
    }
  }

  const getPhaseText = () => {
    switch (phase) {
      case 'initial':
        return 'Loading latest emails...'
      case 'lazy':
        return 'Syncing remaining folders...'
      case 'complete':
        return 'Sync complete!'
      default:
        return 'Syncing...'
    }
  }

  const getStatusText = () => {
    if (hasError) {
      return `Sync failed: ${error}`
    } else if (isCompleted) {
      return `Sync completed! ${emailsSynced.toLocaleString()} emails loaded`
    } else if (isPaused) {
      return `Sync paused`
    } else if (currentFolder) {
      return `${getPhaseText()} (${currentFolder})`
    } else {
      return getPhaseText()
    }
  }

  const getProgressBarColor = () => {
    if (hasError) return 'bg-red-500'
    if (isCompleted) return 'bg-green-500'
    if (isPaused) return 'bg-yellow-500'
    if (phase === 'initial') return 'bg-blue-500'
    return 'bg-indigo-500'
  }

  const formatElapsedTime = () => {
    if (!startTime) return ''

    const elapsed = Date.now() - startTime
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900">
            Smart Sync {accountEmail && `- ${accountEmail}`}
          </h4>
          <p className="text-xs text-blue-700">
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalFolders > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-blue-600 mb-1">
            <span>
              {phase === 'initial' ? 'Priority folders' : `Folders ${foldersCompleted}/${totalFolders}`}
            </span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${Math.max(progressPercentage, phase === 'initial' ? 10 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="text-center">
          <div className="font-medium text-blue-900">{emailsSynced.toLocaleString()}</div>
          <div className="text-blue-600">Emails Loaded</div>
        </div>

        <div className="text-center">
          <div className="font-medium text-blue-900">{foldersCompleted}/{totalFolders}</div>
          <div className="text-blue-600">Folders</div>
        </div>

        {startTime && (
          <div className="text-center">
            <div className="font-medium text-blue-900">{formatElapsedTime()}</div>
            <div className="text-blue-600">Elapsed</div>
          </div>
        )}
      </div>

      {/* Phase info */}
      {isRunning && phase === 'initial' && (
        <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
          <strong>Initial sync:</strong> Loading latest 100 emails from Inbox and Sent folders first for quick access.
        </div>
      )}

      {isRunning && phase === 'lazy' && (
        <div className="mt-3 p-2 bg-indigo-100 rounded text-xs text-indigo-700">
          <strong>Background sync:</strong> Syncing remaining emails from all folders. You can continue using the app.
        </div>
      )}

      {hasError && (
        <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isCompleted && (
        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
          <strong>Success!</strong> All emails have been synced. Your inbox is ready.
        </div>
      )}
    </div>
  )
}
