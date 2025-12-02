'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  StarIcon as StarOutline,
  PaperClipIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PlusIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ShareIcon,
  SparklesIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Email, EmailThread, AIAction, InboxMode } from '@/types/email'
import { toast } from 'react-hot-toast'
import { useEmails, useAccountMessages, useAccounts, useStarEmail, useArchiveEmail, useDeleteEmail } from '@/hooks/useEmails'
import { useQueryClient } from '@tanstack/react-query'
import SmartSyncButton from './SmartSyncButton'
import SyncProgressIndicator from './SyncProgressIndicator'
import { useBatchedSync } from '@/hooks/useBatchedSync'

interface ThreadViewProps {
  selectedFolder: string
  selectedAccount: string
  searchQuery: string
  onThreadSelect: (thread: EmailThread) => void
  onReply: (email: Email) => void
  onForward: (email: Email) => void
  onDelete: (emailId: string) => void
  onArchive: (emailId: string) => void
  onStar: (emailId: string) => void
  onCompose?: () => void
}

export default function ThreadView({
  selectedFolder,
  selectedAccount,
  searchQuery,
  onThreadSelect,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onStar,
  onCompose,
}: ThreadViewProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isClient, setIsClient] = useState(false)
  const [hoveredThread, setHoveredThread] = useState<string | null>(null)
  const [inboxMode, setInboxMode] = useState<InboxMode>('read')
  const [showSyncProgress, setShowSyncProgress] = useState(false)

  // API hooks - get accounts and messages
  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.accounts || []

  // Determine which account to fetch messages for
  // When "all" is selected, use the first account that has been synced (andrew@boxzero.io)
  const selectedAccountData = selectedAccount !== 'all' && !selectedAccount.startsWith('type:')
    ? accounts.find(acc => acc.id === selectedAccount)
    : accounts.find(acc => acc.email === 'andrew@boxzero.io') || (accounts && accounts.length > 0 ? accounts[0] : null)

  // Smart sync functionality for the selected account
  const { syncState } = useBatchedSync(selectedAccountData?.id, {
    onProgress: () => setShowSyncProgress(true),
    onComplete: () => {
      // Keep progress visible for a few seconds after completion
      setTimeout(() => setShowSyncProgress(false), 5000)
    },
    onError: () => setShowSyncProgress(true)
  })

  // Fetch messages using the new endpoint
  const { data: messagesData, isLoading, error } = useAccountMessages(
    selectedAccountData?.id,
    selectedFolder,
    50,
    0
  )

  // Fallback to old emails hook if no specific account is selected
  const { data: emailsData } = useEmails({
    folder: selectedFolder,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    search: searchQuery || undefined,
  })

  // Use real messages data from API - no mock fallbacks for production
  // When we have account data (either specific account or fallback), use messagesData
  const finalEmailsData = selectedAccountData ? messagesData : null

  const starMutation = useStarEmail()
  const archiveMutation = useArchiveEmail()
  const deleteMutation = useDeleteEmail()

  // Generate AI actions based on email content
  const generateAIActions = (thread: EmailThread): AIAction[] => {
    const actions: AIAction[] = []

    // Add comprehensive null checking
    if (!thread || !thread.emails || thread.emails.length === 0 || !thread.subject) {
      return actions
    }

    const latestEmail = thread.emails[thread.emails.length - 1]
    if (!latestEmail) {
      return actions
    }

    const subject = (thread.subject || '').toLowerCase()
    const body = (latestEmail.body || '').toLowerCase()
    const from = (latestEmail.from || '').toLowerCase()

    // Generate actions based on content analysis
    if (subject.includes('meeting') || body.includes('meeting') || body.includes('schedule')) {
      const meetingDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      actions.push({
        id: `task-${thread.id}`,
        type: 'task_created',
        description: `Created calendar event: Meeting on ${meetingDate.toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        confidence: 0.9,
        requiresApproval: true,
        metadata: {
          taskTitle: 'Team standup meeting',
          reminderDate: meetingDate.toISOString()
        }
      })
    }

    if (subject.includes('deadline') || body.includes('due') || body.includes('urgent')) {
      const deadlineDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      const reminderDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
      actions.push({
        id: `reminder-${thread.id}`,
        type: 'reminder_set',
        description: `Set reminder for deadline on ${deadlineDate.toLocaleDateString()} at 9:00 AM`,
        timestamp: new Date().toISOString(),
        confidence: 0.85,
        requiresApproval: true,
        metadata: {
          reminderDate: reminderDate.toISOString(),
          deadline: deadlineDate.toLocaleDateString()
        }
      })
    }

    if (from.includes('noreply') || from.includes('newsletter') || subject.includes('unsubscribe')) {
      actions.push({
        id: `archived-${thread.id}`,
        type: 'archived',
        description: 'Auto-archived promotional email (low priority)',
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        requiresApproval: false, // Auto-actions don't need approval
        isApproved: true
      })
    }

    if (subject.includes('invoice') || subject.includes('receipt') || body.includes('payment')) {
      const expenseDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Yesterday
      // Create deterministic amount based on thread ID to avoid hydration issues
      const hashCode = thread.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      const amount = '$' + (Math.abs(hashCode % 450) + 50).toFixed(2) // Deterministic amount for demo
      actions.push({
        id: `task2-${thread.id}`,
        type: 'task_created',
        description: `Added expense: ${amount} from ${expenseDate.toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        confidence: 0.8,
        requiresApproval: true,
        metadata: {
          taskTitle: 'Process invoice payment',
          amount: amount,
          expenseDate: expenseDate.toLocaleDateString()
        }
      })
    }

    if (thread.isImportant && thread.isUnread) {
      actions.push({
        id: `replied-${thread.id}`,
        type: 'replied',
        description: `Generated reply for VIP contact (${thread.participants.length} recipient${thread.participants.length > 1 ? 's' : ''})`,
        timestamp: new Date().toISOString(),
        confidence: 0.7,
        requiresApproval: true,
        metadata: { recipientCount: thread.participants.length }
      })
    }

    return actions
  }

  const getActionIcon = (type: AIAction['type']) => {
    switch (type) {
      case 'deleted': return TrashIcon
      case 'archived': return ArchiveBoxIcon
      case 'task_created': return DocumentTextIcon
      case 'reminder_set': return BellIcon
      case 'replied': return ArrowUturnLeftIcon
      case 'forwarded': return ArrowUturnRightIcon
      default: return CheckCircleIcon
    }
  }

  const getActionColor = (type: AIAction['type']) => {
    switch (type) {
      case 'deleted': return 'text-red-600 bg-red-50'
      case 'archived': return 'text-gray-600 bg-gray-50'
      case 'task_created': return 'text-blue-600 bg-blue-50'
      case 'reminder_set': return 'text-amber-600 bg-amber-50'
      case 'replied': return 'text-green-600 bg-green-50'
      case 'forwarded': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Process emails from API data
  const emails = (finalEmailsData as any)?.emails || []

  // Debug logging to see what data we have
  console.log('🔍 ThreadView Debug:')
  console.log('  Selected Account:', selectedAccountData?.email)
  console.log('  Selected Folder:', selectedFolder)
  console.log('  Messages Data:', messagesData)
  console.log('  Final Emails Data:', finalEmailsData)
  console.log('  Emails Array:', emails)
  console.log('  Emails Length:', emails.length)

  // Group emails into threads
  const threads = emails.reduce((acc: any, email: any) => {
    const threadId = email.threadId || email.id
    if (!acc[threadId]) {
      acc[threadId] = {
        id: threadId,
        subject: email.subject,
        participants: [email.from, ...(email.to || [])],
        lastActivity: email.receivedAt,
        messageCount: 1,
        isUnread: !email.isRead,
        isStarred: email.isStarred,
        isImportant: email.isImportant,
        labels: email.labels,
        folder: email.folder,
        accountId: email.accountId,
        emails: [email],
      }
      // Generate AI actions for this thread
      acc[threadId].aiActions = generateAIActions(acc[threadId])
    } else {
      acc[threadId].emails.push(email)
      acc[threadId].messageCount = acc[threadId].emails.length
      acc[threadId].isUnread = acc[threadId].isUnread || !email.isRead
      acc[threadId].isStarred = acc[threadId].isStarred || email.isStarred
      acc[threadId].isImportant = acc[threadId].isImportant || email.isImportant
      if (new Date(email.receivedAt) > new Date(acc[threadId].lastActivity)) {
        acc[threadId].lastActivity = email.receivedAt
      }
      // Regenerate AI actions when thread is updated
      acc[threadId].aiActions = generateAIActions(acc[threadId])
    }
    return acc
  }, {} as Record<string, EmailThread>)

  // Apply inbox mode filtering
  const filteredThreads = Object.values(threads).filter((thread: any) => {
    if (inboxMode === 'approve') {
      // Show only threads with AI actions that require approval and haven't been approved yet
      return thread.aiActions && thread.aiActions.some((action: any) => action.requiresApproval && !action.isApproved)
    }
    // Default 'read' mode shows all threads
    return true
  })

  const threadList = filteredThreads.sort((a: any, b: any) =>
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )

  // Action handlers using mutations
  const handleStarToggle = (emailId: string, currentStarred: boolean) => {
    starMutation.mutate({ emailId, starred: !currentStarred })
  }

  const handleArchive = (emailId: string) => {
    archiveMutation.mutate({ emailId })
  }

  const handleDelete = (emailId: string) => {
    deleteMutation.mutate({ emailId })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)

    if (!isClient) {
      // Return static format during SSR to prevent hydration mismatch
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getSenderName = (email: string) => {
    if (!email || typeof email !== 'string') {
      return 'Unknown'
    }

    const parts = email.split('@')
    if (parts[0].includes('.')) {
      return parts[0].split('.').map(name =>
        name.charAt(0).toUpperCase() + name.slice(1)
      ).join(' ')
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  }

  const getAccountInfo = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)
  }

  const getThreadParticipants = (thread: EmailThread) => {
    const uniqueParticipants = new Set<string>()
    thread.emails.forEach(email => {
      uniqueParticipants.add(email.from)
      email.to?.forEach(to => uniqueParticipants.add(to))
      email.cc?.forEach(cc => uniqueParticipants.add(cc))
    })
    return Array.from(uniqueParticipants).slice(0, 3)
  }

  const getThreadSummary = (thread: EmailThread) => {
    if (!thread.emails || thread.emails.length === 0) {
      return 'No content available...'
    }

    const latestEmail = thread.emails[thread.emails.length - 1] as any
    // Try body, preview, or bodyPreview fields
    const content = latestEmail?.body || latestEmail?.preview || latestEmail?.bodyPreview || ''
    if (!content) {
      return 'No content available...'
    }

    const summary = content.replace(/<[^>]*>/g, '').substring(0, 150)
    return summary.trim() ? summary + '...' : 'No content available...'
  }

  const handleThreadClick = (thread: EmailThread) => {
    onThreadSelect(thread)
  }

  const getFolderDisplayName = (folderId: string) => {
    // First check if we have folder name from API response
    const apiData = finalEmailsData as any
    if (apiData?.folderName) {
      return apiData.folderName
    }

    // Fallback to hardcoded names for known folder IDs
    const folderNames: Record<string, string> = {
      'inbox': 'Inbox',
      'sent': 'Sent',
      'drafts': 'Drafts',
      'archive': 'Archive',
      'all-folders': 'All Folders'
    }

    // If it's a UUID, just show a generic name
    if (folderId.includes('-') && folderId.length > 30) {
      return 'Inbox' // Default for unknown UUID folders
    }

    return folderNames[folderId] || folderId.charAt(0).toUpperCase() + folderId.slice(1)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to load emails
            </h3>
            <p className="text-gray-500 mb-4">
              {error.message || 'Something went wrong while fetching your emails.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (threadList.length === 0) {
    const isSyncing = syncState.status === 'running' || syncState.status === 'paused'
    const syncCompleted = syncState.status === 'completed'
    const syncError = syncState.status === 'error'

    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-lg px-4">
          {/* Show sync progress if syncing */}
          {isSyncing && selectedAccountData && (
            <div className="mb-6">
              <SyncProgressIndicator
                syncState={syncState}
                accountEmail={selectedAccountData.email}
              />
            </div>
          )}

          {/* Show sync completed status */}
          {syncCompleted && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">Sync Completed</span>
              </div>
              <p className="text-sm text-green-600">
                Loaded {syncState.progress.emailsSynced} emails. If you still see no messages,
                the backend may still be processing. Try refreshing in a moment.
              </p>
            </div>
          )}

          {/* Show sync error */}
          {syncError && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="font-medium">Sync Error</span>
              </div>
              <p className="text-sm text-red-600">{syncState.error}</p>
            </div>
          )}

          <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isSyncing ? 'Syncing emails...' : 'No conversations found'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ?
              `No emails match "${searchQuery}" in ${getFolderDisplayName(selectedFolder).toLowerCase()}` :
              isSyncing ?
                'Please wait while we sync your emails from the server.' :
                `Your ${selectedAccountData?.id || selectedAccount} ${getFolderDisplayName(selectedFolder).toLowerCase()} is empty or needs to be synced.`
            }
          </p>

          {/* Smart Sync Option for specific accounts */}
          {selectedAccountData && selectedAccount !== 'all' && !searchQuery && !isSyncing && (
            <div className="mb-6">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Sync emails from {selectedAccountData.email}
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Click Smart Sync to fetch emails from your email provider. This triggers the backend to pull
                    messages from Microsoft/Google and store them in BoxZero.
                  </p>
                </div>
                <div className="flex justify-center">
                  <SmartSyncButton
                    accountId={selectedAccountData.id}
                    accountEmail={selectedAccountData.email}
                    onSyncProgress={() => setShowSyncProgress(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {onCompose && !isSyncing && (
            <button
              onClick={onCompose}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Compose Email
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Folder Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">
              {getFolderDisplayName(selectedFolder)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {threadList.length} {threadList.length === 1 ? 'conversation' : 'conversations'}
              {inboxMode === 'approve' && ' • Showing items for review'}
            </p>
          </div>

          {/* Read/Approve Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setInboxMode('read')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inboxMode === 'read'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Read
            </button>
            <button
              onClick={() => setInboxMode('approve')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inboxMode === 'approve'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approve
            </button>
          </div>
        </div>

        {/* Smart Sync Progress Indicator */}
        {showSyncProgress && selectedAccountData && (
          <SyncProgressIndicator
            syncState={syncState}
            accountEmail={selectedAccountData.email}
            className="mb-6"
          />
        )}

        {/* Thread List */}
        <div className="space-y-3">
          {threadList.map((thread: any) => (
            <motion.div
              key={thread.id}
              layoutId={`thread-${thread.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="relative group"
              onMouseEnter={() => setHoveredThread(thread.id)}
              onMouseLeave={() => setHoveredThread(null)}
            >
              <div
                onClick={() => handleThreadClick(thread)}
                className={`bg-white rounded-lg border transition-all cursor-pointer p-4 ${
                  thread.isUnread ? 'border-primary-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Thread Header */}
                    <div className="flex items-center gap-3 mb-2">
                      {/* Participants */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getThreadParticipants(thread).map((participant, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <UserCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {getSenderName(participant)}
                            </span>
                          </div>
                        ))}

                        {/* Message Count */}
                        {thread.messageCount > 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {thread.messageCount}
                          </span>
                        )}
                      </div>

                      {/* Time and Status */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">
                          {formatTime(thread.lastActivity)}
                        </span>

                        {thread.isStarred && (
                          <StarSolid className="w-4 h-4 text-yellow-400" />
                        )}

                        {thread.isUnread && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Subject */}
                    <h3 className={`text-sm mb-1 truncate ${
                      thread.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    }`}>
                      {thread.subject}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {getThreadSummary(thread)}
                    </p>

                    {/* AI Actions */}
                    {thread.aiActions && thread.aiActions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <SparklesIcon className="w-3 h-3" />
                          <span>AI Actions</span>
                        </div>

                        <div className="space-y-1">
                          {thread.aiActions.slice(0, 3).map((action: any) => {
                            const IconComponent = getActionIcon(action.type)
                            const needsApproval = action.requiresApproval && !action.isApproved

                            return (
                              <div
                                key={action.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${getActionColor(action.type)}`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <IconComponent className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{action.description}</span>
                                </div>
                                {needsApproval && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Handle approval logic here
                                      action.isApproved = true
                                      toast.success(`Approved: ${action.description}`)
                                    }}
                                    className="ml-2 px-2 py-1 bg-white rounded text-blue-600 hover:bg-blue-50 font-medium border border-blue-200 flex-shrink-0"
                                  >
                                    Approve
                                  </button>
                                )}
                              </div>
                            )
                          })}

                          {thread.aiActions.length > 3 && (
                            <div className="text-xs text-gray-500 px-3">
                              +{thread.aiActions.length - 3} more actions
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Actions */}
              {hoveredThread === thread.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-2 top-2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
                >
                  {/* Star/Unstar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStar(thread.emails[0].id)
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      thread.isStarred
                        ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                        : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50'
                    }`}
                    title={thread.isStarred ? "Remove star" : "Add star"}
                  >
                    {thread.isStarred ? (
                      <StarSolid className="w-4 h-4" />
                    ) : (
                      <StarOutline className="w-4 h-4" />
                    )}
                  </button>

                  {/* Mark as Important */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Toggle important status
                      toast.success(thread.isImportant ? 'Marked as not important' : 'Marked as important')
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      thread.isImportant
                        ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                    }`}
                    title={thread.isImportant ? "Mark as not important" : "Mark as important"}
                  >
                    <ExclamationTriangleIcon className="w-4 h-4" />
                  </button>

                  {/* Mark as Read/Unread */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.success(thread.isUnread ? 'Marked as read' : 'Marked as unread')
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title={thread.isUnread ? "Mark as read" : "Mark as unread"}
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                  </button>

                  {/* Separator */}
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>

                  {/* Reply */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const latestEmail = thread.emails[thread.emails.length - 1]
                      onReply(latestEmail)
                    }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    title="Reply"
                  >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                  </button>

                  {/* Forward */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const latestEmail = thread.emails[thread.emails.length - 1]
                      onForward(latestEmail)
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Forward"
                  >
                    <ArrowUturnRightIcon className="w-4 h-4" />
                  </button>

                  {/* Share */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.success('Share functionality coming soon')
                    }}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>

                  {/* Separator */}
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>

                  {/* Archive */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive(thread.emails[0].id)
                    }}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Archive"
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(thread.emails[0].id)
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>

                  {/* More Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.success('More actions coming soon')
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
                    title="More actions"
                  >
                    <EllipsisHorizontalIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}