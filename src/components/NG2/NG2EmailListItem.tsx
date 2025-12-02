'use client'

/**
 * NG2 Email List Item with AI Features
 *
 * Enhanced email list item showing:
 * - AI confidence badges
 * - Predicted actions
 * - Quick action buttons
 * - Smart suggestions
 */

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  StarIcon as StarOutline,
  UserCircleIcon,
  SparklesIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { EmailThread } from '@/types/email'
import { PredictionResult, AIActionType } from '@/types/ai'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

interface NG2EmailListItemProps {
  thread: EmailThread
  prediction?: PredictionResult | null
  isSelected?: boolean
  onSelect: (thread: EmailThread) => void
  onStar: (emailId: string) => void
  onArchive: (emailId: string) => void
  onDelete: (emailId: string) => void
  onReply: (thread: EmailThread) => void
  onApplyPrediction?: (prediction: PredictionResult) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'green'
  if (confidence >= 0.7) return 'blue'
  if (confidence >= 0.5) return 'yellow'
  return 'gray'
}

function getActionIcon(action: AIActionType) {
  switch (action) {
    case 'archive':
      return ArchiveBoxIcon
    case 'delete':
      return TrashIcon
    case 'snooze':
      return ClockIcon
    case 'reply':
      return ArrowUturnLeftIcon
    case 'star':
      return StarOutline
    default:
      return CheckCircleIcon
  }
}

function getActionLabel(action: AIActionType): string {
  const labels: Record<string, string> = {
    archive: 'Archive',
    delete: 'Delete',
    star: 'Star',
    snooze: 'Snooze',
    keep: 'Keep',
    reply: 'Reply',
    forward: 'Forward',
    mark_read: 'Mark Read',
    unsubscribe: 'Unsubscribe'
  }
  return labels[action] || action
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getSenderName(email: string): string {
  if (!email) return 'Unknown'
  const parts = email.split('@')
  if (parts[0].includes('.')) {
    return parts[0].split('.').map(name =>
      name.charAt(0).toUpperCase() + name.slice(1)
    ).join(' ')
  }
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
}

function getThreadSummary(thread: EmailThread): string {
  if (!thread.emails || thread.emails.length === 0) {
    return 'No content available...'
  }
  const latestEmail = thread.emails[thread.emails.length - 1] as any
  const content = latestEmail?.body || latestEmail?.preview || latestEmail?.bodyPreview || ''
  if (!content) return 'No content available...'
  const summary = content.replace(/<[^>]*>/g, '').substring(0, 100)
  return summary.trim() ? summary + '...' : 'No content available...'
}

// =============================================================================
// Main Component
// =============================================================================

export default function NG2EmailListItem({
  thread,
  prediction,
  isSelected,
  onSelect,
  onStar,
  onArchive,
  onDelete,
  onReply,
  onApplyPrediction
}: NG2EmailListItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const latestEmail = thread.emails?.[thread.emails.length - 1]
  const senderName = getSenderName(latestEmail?.from || thread.participants?.[0] || '')
  const summary = getThreadSummary(thread)

  // AI prediction info
  const hasPrediction = prediction && prediction.finalPrediction
  const predictedAction = hasPrediction ? prediction.finalPrediction.action : null
  const confidence = hasPrediction ? prediction.finalPrediction.confidence : 0
  const confidenceColor = getConfidenceColor(confidence)
  const requiresApproval = hasPrediction ? prediction.finalPrediction.requiresApproval : true

  // Determine urgency based on prediction
  const isUrgent = hasPrediction && prediction.tier3Prediction?.classification?.intent === 'action_required'
  const requiresResponse = hasPrediction && prediction.tier3Prediction?.classification?.intent === 'request'

  const handleQuickAction = (action: AIActionType, e: React.MouseEvent) => {
    e.stopPropagation()

    switch (action) {
      case 'archive':
        onArchive(latestEmail?.id || thread.id)
        toast.success('Archived')
        break
      case 'delete':
        onDelete(latestEmail?.id || thread.id)
        toast.success('Deleted')
        break
      case 'star':
        onStar(latestEmail?.id || thread.id)
        toast.success(thread.isStarred ? 'Unstarred' : 'Starred')
        break
      case 'reply':
        onReply(thread)
        break
      default:
        toast.success(`Applied: ${getActionLabel(action)}`)
    }
  }

  const handleApplyPrediction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (prediction && onApplyPrediction) {
      onApplyPrediction(prediction)
    } else if (predictedAction) {
      handleQuickAction(predictedAction, e)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowActions(false)
      }}
      onClick={() => onSelect(thread)}
      className={`relative group cursor-pointer ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
    >
      <div
        className={`bg-white rounded-lg border transition-all p-4 ${
          thread.isUnread
            ? 'border-purple-200 shadow-sm'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar / Unread Indicator */}
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              thread.isUnread ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <UserCircleIcon className={`w-6 h-6 ${
                thread.isUnread ? 'text-purple-600' : 'text-gray-400'
              }`} />
            </div>
            {thread.isUnread && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-purple-600 rounded-full border-2 border-white"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm truncate ${
                  thread.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                }`}>
                  {senderName}
                </span>

                {/* Message Count */}
                {thread.messageCount > 1 && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    {thread.messageCount}
                  </span>
                )}

                {/* Urgent Badge */}
                {isUrgent && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    <ExclamationCircleIcon className="w-3 h-3" />
                    Urgent
                  </span>
                )}

                {/* Needs Response Badge */}
                {requiresResponse && !isUrgent && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    <ArrowUturnLeftIcon className="w-3 h-3" />
                    Reply
                  </span>
                )}
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(thread.lastActivity)}
                </span>
                {thread.isStarred && (
                  <StarSolid className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            </div>

            {/* Subject */}
            <h3 className={`text-sm truncate mb-1 ${
              thread.isUnread ? 'font-medium text-gray-900' : 'text-gray-700'
            }`}>
              {thread.subject || '(no subject)'}
            </h3>

            {/* Preview */}
            <p className="text-xs text-gray-500 line-clamp-1 mb-2">
              {summary}
            </p>

            {/* AI Prediction Row */}
            {hasPrediction && predictedAction !== 'keep' && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-${confidenceColor}-50 text-${confidenceColor}-700`}>
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>{getActionLabel(predictedAction!)}</span>
                  <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
                </div>

                {/* Quick Apply Button */}
                {!requiresApproval && (
                  <button
                    onClick={handleApplyPrediction}
                    className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Apply
                  </button>
                )}

                {requiresApproval && (
                  <button
                    onClick={handleApplyPrediction}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-2 top-2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10"
        >
          {/* Star */}
          <button
            onClick={(e) => handleQuickAction('star', e)}
            className={`p-1.5 rounded transition-colors ${
              thread.isStarred
                ? 'text-yellow-500 hover:bg-yellow-50'
                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={thread.isStarred ? 'Unstar' : 'Star'}
          >
            {thread.isStarred ? (
              <StarSolid className="w-4 h-4" />
            ) : (
              <StarOutline className="w-4 h-4" />
            )}
          </button>

          {/* Reply */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onReply(thread)
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Reply"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </button>

          {/* Archive */}
          <button
            onClick={(e) => handleQuickAction('archive', e)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Archive"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => handleQuickAction('delete', e)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          {/* More */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowActions(!showActions)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            title="More actions"
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Extended Actions Menu */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-2 top-12 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20 min-w-[150px]"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              toast.success('Snoozed for 1 hour')
              setShowActions(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <ClockIcon className="w-4 h-4" />
            Snooze
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toast.success('Marked as unread')
              setShowActions(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <EnvelopeIcon className="w-4 h-4" />
            Mark Unread
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const latestEmail = thread.emails[thread.emails.length - 1]
              // Forward functionality
              toast.success('Forward')
              setShowActions(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
            Forward
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
