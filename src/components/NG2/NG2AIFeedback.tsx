'use client'

/**
 * NG2 AI Feedback Component
 *
 * Explicit feedback collection for AI suggestions:
 * - Thumbs up/down ratings
 * - Detailed feedback options
 * - Feedback history
 * - AI accuracy metrics
 */

import React, { useState, useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftEllipsisIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  HandThumbUpIcon as HandThumbUpSolidIcon,
  HandThumbDownIcon as HandThumbDownSolidIcon
} from '@heroicons/react/24/solid'
import { PredictionResult, AIActionType } from '@/types/ai'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

export type FeedbackType = 'positive' | 'negative' | 'neutral'
export type FeedbackReason =
  | 'correct_action'
  | 'wrong_action'
  | 'wrong_confidence'
  | 'helpful'
  | 'not_helpful'
  | 'too_aggressive'
  | 'too_conservative'
  | 'spam_missed'
  | 'important_missed'
  | 'other'

export interface AIFeedback {
  id: string
  predictionId: string
  emailId: string
  userId: string
  feedbackType: FeedbackType
  reason?: FeedbackReason
  suggestedAction?: AIActionType
  actualAction?: AIActionType
  comment?: string
  timestamp: string
}

interface FeedbackStats {
  totalFeedback: number
  positive: number
  negative: number
  neutral: number
  accuracyRate: number
  commonIssues: Record<FeedbackReason, number>
}

interface FeedbackStore {
  feedbackHistory: AIFeedback[]
  stats: FeedbackStats
  addFeedback: (feedback: Omit<AIFeedback, 'id' | 'timestamp'>) => void
  getFeedbackForPrediction: (predictionId: string) => AIFeedback | undefined
  getStats: () => FeedbackStats
  clearHistory: () => void
}

// =============================================================================
// Feedback Store
// =============================================================================

export const useFeedbackStore = create<FeedbackStore>()(
  persist(
    (set, get) => ({
      feedbackHistory: [],
      stats: {
        totalFeedback: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        accuracyRate: 0,
        commonIssues: {} as Record<FeedbackReason, number>
      },

      addFeedback: (feedbackData) => {
        const feedback: AIFeedback = {
          ...feedbackData,
          id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString()
        }

        set((state) => {
          const newHistory = [feedback, ...state.feedbackHistory].slice(0, 500) // Keep last 500

          // Update stats
          const positive = newHistory.filter((f) => f.feedbackType === 'positive').length
          const negative = newHistory.filter((f) => f.feedbackType === 'negative').length
          const neutral = newHistory.filter((f) => f.feedbackType === 'neutral').length
          const total = newHistory.length

          // Calculate common issues
          const commonIssues = {} as Record<FeedbackReason, number>
          newHistory.forEach((f) => {
            if (f.reason) {
              commonIssues[f.reason] = (commonIssues[f.reason] || 0) + 1
            }
          })

          return {
            feedbackHistory: newHistory,
            stats: {
              totalFeedback: total,
              positive,
              negative,
              neutral,
              accuracyRate: total > 0 ? positive / total : 0,
              commonIssues
            }
          }
        })
      },

      getFeedbackForPrediction: (predictionId) => {
        return get().feedbackHistory.find((f) => f.predictionId === predictionId)
      },

      getStats: () => get().stats,

      clearHistory: () => {
        set({
          feedbackHistory: [],
          stats: {
            totalFeedback: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
            accuracyRate: 0,
            commonIssues: {} as Record<FeedbackReason, number>
          }
        })
      }
    }),
    {
      name: 'boxzero-ai-feedback',
      version: 1
    }
  )
)

// =============================================================================
// Quick Feedback Component (Inline)
// =============================================================================

interface QuickFeedbackProps {
  prediction: PredictionResult
  userId: string
  onFeedbackGiven?: (type: FeedbackType) => void
  compact?: boolean
}

export function QuickFeedback({
  prediction,
  userId,
  onFeedbackGiven,
  compact = false
}: QuickFeedbackProps) {
  const addFeedback = useFeedbackStore((state) => state.addFeedback)
  const existingFeedback = useFeedbackStore((state) =>
    state.getFeedbackForPrediction(prediction.predictionId)
  )

  const handleFeedback = useCallback(
    (type: FeedbackType) => {
      addFeedback({
        predictionId: prediction.predictionId,
        emailId: prediction.emailId,
        userId,
        feedbackType: type,
        suggestedAction: prediction.finalPrediction.action
      })
      onFeedbackGiven?.(type)
      toast.success('Thanks for your feedback!')
    },
    [prediction, userId, addFeedback, onFeedbackGiven]
  )

  if (existingFeedback) {
    return (
      <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {existingFeedback.feedbackType === 'positive' ? (
          <HandThumbUpSolidIcon className="w-4 h-4 text-green-400" />
        ) : existingFeedback.feedbackType === 'negative' ? (
          <HandThumbDownSolidIcon className="w-4 h-4 text-red-400" />
        ) : (
          <span className="text-gray-400">Feedback sent</span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'gap-2'}`}>
      <button
        onClick={() => handleFeedback('positive')}
        className="p-1 text-gray-400 hover:text-green-400 transition-colors"
        title="Good suggestion"
      >
        <HandThumbUpIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
      <button
        onClick={() => handleFeedback('negative')}
        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
        title="Bad suggestion"
      >
        <HandThumbDownIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
    </div>
  )
}

// =============================================================================
// Detailed Feedback Modal
// =============================================================================

interface DetailedFeedbackProps {
  prediction: PredictionResult
  userId: string
  isOpen: boolean
  onClose: () => void
}

const FEEDBACK_REASONS: { value: FeedbackReason; label: string; type: FeedbackType }[] = [
  { value: 'correct_action', label: 'Correct action suggested', type: 'positive' },
  { value: 'helpful', label: 'Helpful suggestion', type: 'positive' },
  { value: 'wrong_action', label: 'Wrong action suggested', type: 'negative' },
  { value: 'wrong_confidence', label: 'Confidence was off', type: 'negative' },
  { value: 'too_aggressive', label: 'Too aggressive (archiving important emails)', type: 'negative' },
  { value: 'too_conservative', label: 'Too conservative (keeping junk)', type: 'negative' },
  { value: 'spam_missed', label: 'Missed spam/promotional email', type: 'negative' },
  { value: 'important_missed', label: 'Marked important email for archive', type: 'negative' },
  { value: 'not_helpful', label: 'Not helpful', type: 'negative' },
  { value: 'other', label: 'Other', type: 'neutral' }
]

const ACTION_OPTIONS: { value: AIActionType; label: string }[] = [
  { value: 'keep', label: 'Keep in inbox' },
  { value: 'archive', label: 'Archive' },
  { value: 'delete', label: 'Delete' },
  { value: 'star', label: 'Star' },
  { value: 'snooze', label: 'Snooze' },
  { value: 'unsubscribe', label: 'Unsubscribe' }
]

export function DetailedFeedback({
  prediction,
  userId,
  isOpen,
  onClose
}: DetailedFeedbackProps) {
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(null)
  const [correctAction, setCorrectAction] = useState<AIActionType | null>(null)
  const [comment, setComment] = useState('')
  const addFeedback = useFeedbackStore((state) => state.addFeedback)

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return

    const reasonConfig = FEEDBACK_REASONS.find((r) => r.value === selectedReason)
    addFeedback({
      predictionId: prediction.predictionId,
      emailId: prediction.emailId,
      userId,
      feedbackType: reasonConfig?.type || 'neutral',
      reason: selectedReason,
      suggestedAction: prediction.finalPrediction.action,
      actualAction: correctAction || undefined,
      comment: comment || undefined
    })

    toast.success('Detailed feedback submitted!')
    onClose()
  }, [prediction, userId, selectedReason, correctAction, comment, addFeedback, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-medium text-white">Feedback on AI Suggestion</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Suggestion */}
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">AI suggested:</p>
            <p className="text-sm text-white capitalize">
              {prediction.finalPrediction.action} ({Math.round(prediction.finalPrediction.confidence * 100)}% confidence)
            </p>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">What's your feedback?</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {FEEDBACK_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? 'bg-purple-600/30 border border-purple-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedReason === reason.value
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-500'
                    }`}
                  >
                    {selectedReason === reason.value && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </span>
                  <span className="text-sm text-gray-200">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Correct Action (if wrong) */}
          {selectedReason && ['wrong_action', 'spam_missed', 'important_missed'].includes(selectedReason) && (
            <div>
              <label className="block text-xs text-gray-400 mb-2">What should the action be?</label>
              <select
                value={correctAction || ''}
                onChange={(e) => setCorrectAction(e.target.value as AIActionType)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              >
                <option value="">Select correct action...</option>
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Additional comments (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any other feedback..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Feedback Stats Dashboard
// =============================================================================

interface FeedbackStatsDashboardProps {
  className?: string
}

export function FeedbackStatsDashboard({ className = '' }: FeedbackStatsDashboardProps) {
  const stats = useFeedbackStore((state) => state.stats)
  const clearHistory = useFeedbackStore((state) => state.clearHistory)

  const topIssues = Object.entries(stats.commonIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-white">AI Feedback Stats</h3>
        </div>
        <button
          onClick={() => {
            if (confirm('Clear all feedback history?')) {
              clearHistory()
              toast.success('Feedback history cleared')
            }
          }}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          Clear History
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.totalFeedback}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{stats.positive}</p>
          <p className="text-xs text-gray-400">Positive</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400">{stats.negative}</p>
          <p className="text-xs text-gray-400">Negative</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">
            {Math.round(stats.accuracyRate * 100)}%
          </p>
          <p className="text-xs text-gray-400">Accuracy</p>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>AI Accuracy</span>
          <span>{Math.round(stats.accuracyRate * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            style={{ width: `${stats.accuracyRate * 100}%` }}
          />
        </div>
      </div>

      {/* Top Issues */}
      {topIssues.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Common Issues</p>
          <div className="space-y-1">
            {topIssues.map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between text-xs">
                <span className="text-gray-300 capitalize">{reason.replace(/_/g, ' ')}</span>
                <span className="text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalFeedback === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No feedback yet</p>
          <p className="text-xs">Rate AI suggestions to improve accuracy</p>
        </div>
      )}
    </div>
  )
}

export default QuickFeedback
