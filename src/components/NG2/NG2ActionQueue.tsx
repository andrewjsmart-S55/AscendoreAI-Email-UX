'use client'

/**
 * Action Queue Component
 *
 * Displays pending AI suggestions for user review and approval.
 * Shows predictions with confidence scores and allows approve/reject/modify.
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  InboxIcon
} from '@heroicons/react/24/outline'
import { CheckIcon as CheckSolidIcon } from '@heroicons/react/24/solid'
import {
  ActionQueueItem,
  ActionQueueStatus,
  AIActionType,
  PredictionResult
} from '@/types/ai'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { logAIAction } from '@/stores/activityStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

interface ActionQueueProps {
  items: ActionQueueItem[]
  onApprove: (itemId: string) => Promise<void>
  onReject: (itemId: string) => Promise<void>
  onModify: (itemId: string, newAction: AIActionType) => Promise<void>
  onApproveAll: () => Promise<void>
  isLoading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function getActionIcon(action: AIActionType) {
  switch (action) {
    case 'archive':
      return ArchiveBoxIcon
    case 'delete':
      return TrashIcon
    case 'star':
      return StarIcon
    case 'snooze':
      return ClockIcon
    default:
      return InboxIcon
  }
}

function getActionLabel(action: AIActionType): string {
  switch (action) {
    case 'archive':
      return 'Archive'
    case 'delete':
      return 'Delete'
    case 'star':
      return 'Star'
    case 'unstar':
      return 'Remove Star'
    case 'mark_read':
      return 'Mark Read'
    case 'mark_unread':
      return 'Mark Unread'
    case 'snooze':
      return 'Snooze'
    case 'keep':
      return 'Keep'
    case 'reply':
      return 'Reply'
    case 'forward':
      return 'Forward'
    case 'unsubscribe':
      return 'Unsubscribe'
    default:
      return action
  }
}

function getActionColor(action: AIActionType): string {
  switch (action) {
    case 'archive':
      return 'blue'
    case 'delete':
      return 'red'
    case 'star':
      return 'yellow'
    case 'snooze':
      return 'purple'
    case 'keep':
      return 'green'
    default:
      return 'gray'
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-green-600'
  if (confidence >= 0.7) return 'text-blue-600'
  if (confidence >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return 'High'
  if (confidence >= 0.7) return 'Medium'
  if (confidence >= 0.5) return 'Low'
  return 'Very Low'
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ActionQueueItemCardProps {
  item: ActionQueueItem
  onApprove: () => void
  onReject: () => void
  onModify: (newAction: AIActionType) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function ActionQueueItemCard({
  item,
  onApprove,
  onReject,
  onModify,
  isExpanded,
  onToggleExpand
}: ActionQueueItemCardProps) {
  const [showActions, setShowActions] = useState(false)
  const prediction = item.prediction.finalPrediction
  const ActionIcon = getActionIcon(prediction.action)
  const actionColor = getActionColor(prediction.action)

  const alternativeActions: AIActionType[] = ['archive', 'delete', 'keep', 'snooze', 'star']
    .filter(a => a !== prediction.action) as AIActionType[]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* AI Badge */}
          <div className={`flex-shrink-0 p-2 rounded-lg bg-${actionColor}-50`}>
            <ActionIcon className={`h-5 w-5 text-${actionColor}-600`} />
          </div>

          {/* Email Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">
                {item.senderEmail}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-${actionColor}-100 text-${actionColor}-700`}>
                {getActionLabel(prediction.action)}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{item.emailSubject}</p>

            {/* Confidence Score */}
            <div className="flex items-center gap-2 mt-2">
              <SparklesIcon className="h-3.5 w-3.5 text-purple-500" />
              <span className={`text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                {Math.round(prediction.confidence * 100)}% confidence ({getConfidenceLabel(prediction.confidence)})
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onApprove}
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
              title="Approve"
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onReject}
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Reject"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Other Actions"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Alternative Actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-100"
            >
              <p className="text-xs text-gray-500 mb-2">Change action to:</p>
              <div className="flex flex-wrap gap-2">
                {alternativeActions.map((action) => {
                  const Icon = getActionIcon(action)
                  const color = getActionColor(action)
                  return (
                    <button
                      key={action}
                      onClick={() => {
                        onModify(action)
                        setShowActions(false)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-${color}-50 text-${color}-700 hover:bg-${color}-100 transition-colors text-sm`}
                    >
                      <Icon className="h-4 w-4" />
                      {getActionLabel(action)}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 border-t border-gray-100"
          >
            <div className="pt-3 space-y-3">
              {/* AI Reasoning */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">AI Reasoning</h4>
                <p className="text-sm text-gray-700">{prediction.reasoning}</p>
              </div>

              {/* Prediction Tiers */}
              {item.prediction.tier1Prediction && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {item.prediction.tier1Prediction && (
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500 mb-1">Bayesian</div>
                      <div className="font-medium">{getActionLabel(item.prediction.tier1Prediction.predictedAction)}</div>
                      <div className={getConfidenceColor(item.prediction.tier1Prediction.confidence)}>
                        {Math.round(item.prediction.tier1Prediction.confidence * 100)}%
                      </div>
                    </div>
                  )}
                  {item.prediction.tier3Prediction && (
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-gray-500 mb-1">LLM</div>
                      <div className="font-medium">{getActionLabel(item.prediction.tier3Prediction.predictedAction)}</div>
                      <div className={getConfidenceColor(item.prediction.tier3Prediction.confidence)}>
                        {Math.round(item.prediction.tier3Prediction.confidence * 100)}%
                      </div>
                    </div>
                  )}
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-gray-500 mb-1">Ensemble</div>
                    <div className="font-medium">{getActionLabel(prediction.action)}</div>
                    <div className={getConfidenceColor(prediction.confidence)}>
                      {Math.round(prediction.confidence * 100)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500">
                Suggested {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function NG2ActionQueue({
  items,
  onApprove,
  onReject,
  onModify,
  onApproveAll,
  isLoading = false
}: ActionQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const updateTrustFromAction = useBehaviorStore(state => state.updateTrustFromAction)
  const user = ascendoreAuth.getUser()

  // Filter items
  const filteredItems = useMemo(() => {
    const pendingItems = items.filter(item => item.status === 'pending')

    if (filter === 'all') return pendingItems

    return pendingItems.filter(item => {
      const confidence = item.prediction.finalPrediction.confidence
      switch (filter) {
        case 'high':
          return confidence >= 0.85
        case 'medium':
          return confidence >= 0.7 && confidence < 0.85
        case 'low':
          return confidence < 0.7
        default:
          return true
      }
    })
  }, [items, filter])

  // Stats
  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending')
    return {
      total: pending.length,
      highConfidence: pending.filter(i => i.prediction.finalPrediction.confidence >= 0.85).length,
      mediumConfidence: pending.filter(i => i.prediction.finalPrediction.confidence >= 0.7 && i.prediction.finalPrediction.confidence < 0.85).length,
      lowConfidence: pending.filter(i => i.prediction.finalPrediction.confidence < 0.7).length
    }
  }, [items])

  const handleApprove = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || !user?.id) return

    await onApprove(itemId)
    updateTrustFromAction('approved')

    logAIAction('approved', user.id, `Approved AI suggestion: ${getActionLabel(item.prediction.finalPrediction.action)}`, {
      id: item.prediction.predictionId,
      emailId: item.emailId,
      emailSubject: item.emailSubject,
      confidence: item.prediction.finalPrediction.confidence
    }, item.accountId)
  }

  const handleReject = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || !user?.id) return

    await onReject(itemId)
    updateTrustFromAction('rejected')

    logAIAction('rejected', user.id, `Rejected AI suggestion: ${getActionLabel(item.prediction.finalPrediction.action)}`, {
      id: item.prediction.predictionId,
      emailId: item.emailId,
      emailSubject: item.emailSubject,
      confidence: item.prediction.finalPrediction.confidence
    }, item.accountId)
  }

  const handleModify = async (itemId: string, newAction: AIActionType) => {
    const item = items.find(i => i.id === itemId)
    if (!item || !user?.id) return

    await onModify(itemId, newAction)
    updateTrustFromAction('modified')

    logAIAction('modified', user.id, `Modified AI suggestion from ${getActionLabel(item.prediction.finalPrediction.action)} to ${getActionLabel(newAction)}`, {
      id: item.prediction.predictionId,
      emailId: item.emailId,
      emailSubject: item.emailSubject,
      confidence: item.prediction.finalPrediction.confidence
    }, item.accountId)
  }

  // Empty state
  if (items.length === 0 || filteredItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 bg-purple-50 rounded-full mb-4">
          <SparklesIcon className="h-12 w-12 text-purple-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {items.length === 0 ? 'No AI Suggestions' : 'No Matching Suggestions'}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {items.length === 0
            ? 'AI suggestions for your emails will appear here. Process some emails to start getting intelligent recommendations.'
            : 'Try adjusting the confidence filter to see more suggestions.'}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Action Queue</h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
              {stats.total}
            </span>
          </div>

          {stats.highConfidence > 0 && (
            <button
              onClick={onApproveAll}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckSolidIcon className="h-4 w-4" />
              Approve All High ({stats.highConfidence})
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map((f) => {
            const count = f === 'all' ? stats.total
              : f === 'high' ? stats.highConfidence
              : f === 'medium' ? stats.mediumConfidence
              : stats.lowConfidence

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} {count > 0 && `(${count})`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <ActionQueueItemCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onModify={(action) => handleModify(item.id, action)}
              isExpanded={expandedId === item.id}
              onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">High: {stats.highConfidence}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Medium: {stats.mediumConfidence}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Low: {stats.lowConfidence}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <BoltIcon className="h-4 w-4" />
            <span>AI predictions powered by ensemble learning</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Hook for managing Action Queue state
// =============================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ActionQueueState {
  items: ActionQueueItem[]
  addItem: (item: ActionQueueItem) => void
  addItems: (items: ActionQueueItem[]) => void
  updateStatus: (itemId: string, status: ActionQueueStatus, executedAt?: string) => void
  removeItem: (itemId: string) => void
  clearCompleted: () => void
  getPendingItems: () => ActionQueueItem[]
  getItemById: (id: string) => ActionQueueItem | undefined
}

export const useActionQueueStore = create<ActionQueueState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => ({
          items: [item, ...state.items].slice(0, 100) // Keep max 100 items
        }))
      },

      addItems: (newItems) => {
        set((state) => ({
          items: [...newItems, ...state.items].slice(0, 100)
        }))
      },

      updateStatus: (itemId, status, executedAt) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status,
                  resolvedAt: ['approved', 'rejected'].includes(status)
                    ? new Date().toISOString()
                    : item.resolvedAt,
                  executedAt
                }
              : item
          )
        }))
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId)
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          items: state.items.filter((item) => item.status === 'pending')
        }))
      },

      getPendingItems: () => {
        return get().items.filter((item) => item.status === 'pending')
      },

      getItemById: (id) => {
        return get().items.find((item) => item.id === id)
      }
    }),
    {
      name: 'boxzero-action-queue',
      version: 1,
      partialize: (state) => ({
        items: state.items.slice(0, 50) // Only persist 50 items
      })
    }
  )
)
