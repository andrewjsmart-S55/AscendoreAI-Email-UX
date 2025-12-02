'use client'

/**
 * NG2 Thread View - AI-Enhanced Email List
 *
 * Features:
 * - AI predictions with confidence badges
 * - Batch selection mode
 * - Quick AI action approval
 * - Smart sync integration
 * - Keyboard navigation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  EnvelopeIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { Email, EmailThread, InboxMode } from '@/types/email'
import { PredictionResult } from '@/types/ai'
import { useAccounts, useAccountMessages, useStarEmail, useArchiveEmail, useDeleteEmail } from '@/hooks/useEmails'
import { useAIPredictions } from '@/hooks/useAIPredictions'
import { useBatchedSync } from '@/hooks/useBatchedSync'
import { useSettingsStore } from '@/stores/settingsStore'
import NG2EmailListItem from './NG2EmailListItem'
import NG2SearchBar from './NG2SearchBar'
import SmartSyncButton from '../EmailClient/SmartSyncButton'
import SyncProgressIndicator from '../EmailClient/SyncProgressIndicator'

// =============================================================================
// Types
// =============================================================================

interface NG2ThreadViewProps {
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
  onSnooze?: (email: Email) => void
  onOpenLabels?: () => void
}

type ViewMode = 'list' | 'grid'
type SortMode = 'date' | 'ai_confidence' | 'sender' | 'unread_first'

// =============================================================================
// Main Component
// =============================================================================

export default function NG2ThreadView({
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
  onSnooze,
  onOpenLabels
}: NG2ThreadViewProps) {
  // State
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [inboxMode, setInboxMode] = useState<InboxMode>('read')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [showSyncProgress, setShowSyncProgress] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [advancedSearchResults, setAdvancedSearchResults] = useState<Email[] | null>(null)
  const [localSearchQuery, setLocalSearchQuery] = useState('')

  const listRef = useRef<HTMLDivElement>(null)

  // Settings
  const aiSettings = useSettingsStore(state => state.ai)
  const displaySettings = useSettingsStore(state => state.display)

  // API hooks
  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.accounts || []

  // Determine which account to fetch messages for
  const selectedAccountData = selectedAccount !== 'all' && !selectedAccount.startsWith('type:')
    ? accounts.find(acc => acc.id === selectedAccount)
    : accounts.find(acc => acc.email === 'andrew@boxzero.io') || (accounts.length > 0 ? accounts[0] : null)

  // Smart sync
  const { syncState } = useBatchedSync(selectedAccountData?.id, {
    onProgress: () => setShowSyncProgress(true),
    onComplete: () => setTimeout(() => setShowSyncProgress(false), 5000),
    onError: () => setShowSyncProgress(true)
  })

  // Fetch messages
  const { data: messagesData, isLoading, error } = useAccountMessages(
    selectedAccountData?.id,
    selectedFolder,
    50,
    0
  )

  // Mutations
  const starMutation = useStarEmail()
  const archiveMutation = useArchiveEmail()
  const deleteMutation = useDeleteEmail()

  // Process emails from API
  const emails = useMemo(() => {
    return (messagesData as any)?.emails || []
  }, [messagesData])

  // AI Predictions
  const {
    predictions,
    isLoading: isPredicting,
    getPrediction,
    queuedCount
  } = useAIPredictions(emails, {
    enabled: aiSettings.enabled,
    autoPredict: true,
    autoQueue: true
  })

  // Group emails into threads
  const threads = useMemo(() => {
    const threadMap = emails.reduce((acc: Record<string, EmailThread>, email: Email) => {
      const threadId = email.threadId || email.id
      if (!acc[threadId]) {
        acc[threadId] = {
          id: threadId,
          subject: email.subject || '(no subject)',
          participants: [email.from, ...(email.to || [])],
          lastActivity: email.receivedAt,
          messageCount: 1,
          isUnread: !email.isRead,
          isStarred: email.isStarred,
          isImportant: email.isImportant,
          labels: email.labels,
          folder: email.folder,
          accountId: email.accountId,
          emails: [email]
        }
      } else {
        acc[threadId].emails.push(email)
        acc[threadId].messageCount = acc[threadId].emails.length
        acc[threadId].isUnread = acc[threadId].isUnread || !email.isRead
        acc[threadId].isStarred = acc[threadId].isStarred || email.isStarred
        acc[threadId].isImportant = acc[threadId].isImportant || email.isImportant
        if (new Date(email.receivedAt) > new Date(acc[threadId].lastActivity)) {
          acc[threadId].lastActivity = email.receivedAt
        }
      }
      return acc
    }, {} as Record<string, EmailThread>)

    return Object.values(threadMap) as EmailThread[]
  }, [emails])

  // Get prediction for thread (using latest email)
  const getThreadPrediction = useCallback((thread: EmailThread): PredictionResult | null => {
    const latestEmail = thread.emails?.[thread.emails.length - 1]
    if (!latestEmail) return null
    return getPrediction(latestEmail.id) || null
  }, [getPrediction])

  // Filter threads based on mode
  const filteredThreads = useMemo(() => {
    let result = [...threads]

    // Filter by inbox mode
    if (inboxMode === 'approve') {
      result = result.filter(thread => {
        const prediction = getThreadPrediction(thread)
        return prediction &&
          prediction.finalPrediction.action !== 'keep' &&
          prediction.finalPrediction.requiresApproval
      })
    }

    // Sort
    switch (sortMode) {
      case 'ai_confidence':
        result.sort((a, b) => {
          const predA = getThreadPrediction(a)
          const predB = getThreadPrediction(b)
          return (predB?.finalPrediction.confidence || 0) - (predA?.finalPrediction.confidence || 0)
        })
        break
      case 'sender':
        result.sort((a, b) => {
          const senderA = a.emails[0]?.from || ''
          const senderB = b.emails[0]?.from || ''
          return senderA.localeCompare(senderB)
        })
        break
      case 'unread_first':
        result.sort((a, b) => {
          if (a.isUnread && !b.isUnread) return -1
          if (!a.isUnread && b.isUnread) return 1
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        })
        break
      default: // date
        result.sort((a, b) =>
          new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        )
    }

    return result
  }, [threads, inboxMode, sortMode, getThreadPrediction])

  // Search filter - uses advanced search results if available
  const searchedThreads = useMemo(() => {
    // Use prop searchQuery or local query
    const effectiveQuery = searchQuery || localSearchQuery

    // If advanced search returned results, filter to only threads containing those emails
    if (advancedSearchResults) {
      const searchedEmailIds = new Set(advancedSearchResults.map(e => e.id))
      return filteredThreads.filter(thread =>
        thread.emails.some(e => searchedEmailIds.has(e.id))
      )
    }

    // Fall back to basic text search
    if (!effectiveQuery) return filteredThreads

    const query = effectiveQuery.toLowerCase()
    return filteredThreads.filter(thread =>
      thread.subject.toLowerCase().includes(query) ||
      thread.emails.some(e =>
        e.from?.toLowerCase().includes(query) ||
        e.body?.toLowerCase().includes(query)
      )
    )
  }, [filteredThreads, searchQuery, localSearchQuery, advancedSearchResults])

  // Batch selection handlers
  const toggleSelect = useCallback((threadId: string) => {
    setSelectedThreads(prev => {
      const next = new Set(prev)
      if (next.has(threadId)) {
        next.delete(threadId)
      } else {
        next.add(threadId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedThreads(new Set(searchedThreads.map(t => t.id)))
  }, [searchedThreads])

  const deselectAll = useCallback(() => {
    setSelectedThreads(new Set())
    setIsSelectMode(false)
  }, [])

  // Batch actions
  const handleBatchArchive = useCallback(() => {
    selectedThreads.forEach(threadId => {
      const thread = threads.find(t => t.id === threadId)
      if (thread?.emails?.[0]) {
        archiveMutation.mutate({ emailId: thread.emails[0].id })
      }
    })
    toast.success(`Archived ${selectedThreads.size} conversations`)
    deselectAll()
  }, [selectedThreads, threads, archiveMutation, deselectAll])

  const handleBatchDelete = useCallback(() => {
    selectedThreads.forEach(threadId => {
      const thread = threads.find(t => t.id === threadId)
      if (thread?.emails?.[0]) {
        deleteMutation.mutate({ emailId: thread.emails[0].id })
      }
    })
    toast.success(`Deleted ${selectedThreads.size} conversations`)
    deselectAll()
  }, [selectedThreads, threads, deleteMutation, deselectAll])

  const handleApproveAllPredictions = useCallback(() => {
    let approved = 0
    selectedThreads.forEach(threadId => {
      const thread = threads.find(t => t.id === threadId)
      if (!thread) return

      const prediction = getThreadPrediction(thread)
      if (prediction && prediction.finalPrediction.confidence >= aiSettings.autoActionThreshold) {
        const latestEmail = thread.emails[thread.emails.length - 1]
        switch (prediction.finalPrediction.action) {
          case 'archive':
            archiveMutation.mutate({ emailId: latestEmail.id })
            break
          case 'delete':
            deleteMutation.mutate({ emailId: latestEmail.id })
            break
          case 'star':
            starMutation.mutate({ emailId: latestEmail.id, starred: true })
            break
        }
        approved++
      }
    })
    toast.success(`Approved ${approved} AI suggestions`)
    deselectAll()
  }, [selectedThreads, threads, getThreadPrediction, aiSettings, archiveMutation, deleteMutation, starMutation, deselectAll])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'j':
          setFocusedIndex(prev => Math.min(prev + 1, searchedThreads.length - 1))
          break
        case 'k':
          setFocusedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          if (focusedIndex >= 0 && searchedThreads[focusedIndex]) {
            onThreadSelect(searchedThreads[focusedIndex])
          }
          break
        case 'x':
          if (focusedIndex >= 0 && searchedThreads[focusedIndex]) {
            toggleSelect(searchedThreads[focusedIndex].id)
            if (!isSelectMode) setIsSelectMode(true)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, searchedThreads, onThreadSelect, toggleSelect, isSelectMode])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-thread-item]')
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const getFolderDisplayName = (folderId: string) => {
    const apiData = messagesData as any
    if (apiData?.folderName) return apiData.folderName

    const folderNames: Record<string, string> = {
      'inbox': 'Inbox',
      'sent': 'Sent',
      'drafts': 'Drafts',
      'archive': 'Archive',
      'all-folders': 'All Folders'
    }

    if (folderId.includes('-') && folderId.length > 30) {
      return 'Inbox'
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
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to load emails
            </h3>
            <p className="text-gray-500 mb-4">
              {error.message || 'Something went wrong while fetching your emails.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (searchedThreads.length === 0) {
    const isSyncing = syncState.status === 'running' || syncState.status === 'paused'

    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-lg px-4">
          {isSyncing && selectedAccountData && (
            <div className="mb-6">
              <SyncProgressIndicator
                syncState={syncState}
                accountEmail={selectedAccountData.email}
              />
            </div>
          )}

          <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isSyncing ? 'Syncing emails...' : 'No conversations found'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? `No emails match "${searchQuery}"`
              : isSyncing
              ? 'Please wait while we sync your emails.'
              : `Your ${getFolderDisplayName(selectedFolder).toLowerCase()} is empty.`
            }
          </p>

          {selectedAccountData && !searchQuery && !isSyncing && (
            <div className="mb-6">
              <SmartSyncButton
                accountId={selectedAccountData.id}
                accountEmail={selectedAccountData.email}
                onSyncProgress={() => setShowSyncProgress(true)}
              />
            </div>
          )}

          {onCompose && !isSyncing && (
            <button
              onClick={onCompose}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
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
    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        {/* Search Bar Row */}
        <div className="mb-4">
          <NG2SearchBar
            emails={emails}
            onSearchResults={setAdvancedSearchResults}
            onSearchChange={(q) => {
              setLocalSearchQuery(q)
              if (!q) setAdvancedSearchResults(null)
            }}
            className="max-w-2xl"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {getFolderDisplayName(selectedFolder)}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {searchedThreads.length} conversation{searchedThreads.length !== 1 ? 's' : ''}
              {isPredicting && (
                <span className="ml-2 text-purple-600">
                  <ArrowPathIcon className="w-3 h-3 inline animate-spin mr-1" />
                  Analyzing...
                </span>
              )}
              {queuedCount > 0 && (
                <span className="ml-2 text-purple-600">
                  • {queuedCount} pending review
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                title="List view"
              >
                <ListBulletIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                title="Grid view"
              >
                <Squares2X2Icon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Labels Button */}
            {onOpenLabels && (
              <button
                onClick={onOpenLabels}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors"
                title="Manage Labels"
              >
                <TagIcon className="w-4 h-4" />
                <span>Labels</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Latest First</option>
              <option value="unread_first">Unread First</option>
              <option value="ai_confidence">AI Confidence</option>
              <option value="sender">By Sender</option>
            </select>

            {/* Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setInboxMode('read')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  inboxMode === 'read'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Read
              </button>
              <button
                onClick={() => setInboxMode('approve')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  inboxMode === 'approve'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SparklesIcon className="w-4 h-4 inline mr-1" />
                Review AI
              </button>
            </div>
          </div>
        </div>

        {/* Batch Actions Bar */}
        <AnimatePresence>
          {isSelectMode && selectedThreads.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 py-2 px-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={deselectAll}
                    className="p-1 hover:bg-purple-100 rounded"
                  >
                    <XMarkIcon className="w-4 h-4 text-purple-600" />
                  </button>
                  <span className="text-sm font-medium text-purple-900">
                    {selectedThreads.size} selected
                  </span>
                </div>

                <div className="flex-1" />

                <button
                  onClick={selectAll}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Select all
                </button>

                <div className="h-5 w-px bg-purple-200" />

                <button
                  onClick={handleBatchArchive}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-purple-100 rounded-md"
                >
                  Archive
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Delete
                </button>
                <button
                  onClick={handleApproveAllPredictions}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-1"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Approve AI
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sync Progress */}
      {showSyncProgress && selectedAccountData && (
        <div className="flex-shrink-0 px-6 py-2 bg-white border-b border-gray-200">
          <SyncProgressIndicator
            syncState={syncState}
            accountEmail={selectedAccountData.email}
          />
        </div>
      )}

      {/* Thread List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}`}>
          {searchedThreads.map((thread, index) => (
            <div key={thread.id} data-thread-item>
              <NG2EmailListItem
                thread={thread}
                prediction={getThreadPrediction(thread)}
                isSelected={selectedThreads.has(thread.id) || index === focusedIndex}
                onSelect={(t) => {
                  if (isSelectMode) {
                    toggleSelect(t.id)
                  } else {
                    onThreadSelect(t)
                  }
                }}
                onStar={(emailId) => {
                  starMutation.mutate({ emailId, starred: !thread.isStarred })
                }}
                onArchive={onArchive}
                onDelete={onDelete}
                onReply={(t) => {
                  const latestEmail = t.emails[t.emails.length - 1]
                  if (latestEmail) onReply(latestEmail)
                }}
                onApplyPrediction={(prediction) => {
                  const latestEmail = thread.emails[thread.emails.length - 1]
                  if (!latestEmail) return

                  switch (prediction.finalPrediction.action) {
                    case 'archive':
                      archiveMutation.mutate({ emailId: latestEmail.id })
                      toast.success('Archived')
                      break
                    case 'delete':
                      deleteMutation.mutate({ emailId: latestEmail.id })
                      toast.success('Deleted')
                      break
                    case 'star':
                      starMutation.mutate({ emailId: latestEmail.id, starred: true })
                      toast.success('Starred')
                      break
                    case 'snooze':
                      if (onSnooze) onSnooze(latestEmail)
                      break
                    default:
                      toast.success(`Applied: ${prediction.finalPrediction.action}`)
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
