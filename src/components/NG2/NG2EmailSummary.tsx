'use client'

/**
 * NG2 Email Summary Component
 *
 * AI-powered email and thread summarization.
 * Features:
 * - Single email summaries
 * - Thread conversation summaries
 * - Daily inbox digest
 * - Action item extraction
 * - Key points highlighting
 */

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  SparklesIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Email, EmailThread } from '@/types/email'
import { openAIService } from '@/lib/ai/openai-service'
import { EmailSummary } from '@/types/ai'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

interface NG2EmailSummaryProps {
  email?: Email
  thread?: EmailThread
  emails?: Email[] // For daily digest
  type?: 'email' | 'thread' | 'daily'
  className?: string
  compact?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function NG2EmailSummary({
  email,
  thread,
  emails,
  type = 'email',
  className = '',
  compact = false
}: NG2EmailSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)

  // Determine what to summarize
  const queryKey = type === 'email'
    ? ['email-summary', email?.id]
    : type === 'thread'
    ? ['thread-summary', thread?.id]
    : ['daily-summary', emails?.length]

  // Fetch summary
  const {
    data: summary,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<EmailSummary> => {
      if (type === 'email' && email) {
        return openAIService.generateEmailSummary({
          from: email.from || '',
          subject: email.subject || '',
          body: email.body || ''
        })
      } else if (type === 'thread' && thread) {
        return openAIService.generateThreadSummary(thread)
      } else if (type === 'daily' && emails) {
        return openAIService.generateDailySummary(emails)
      }
      throw new Error('Invalid summary type or missing data')
    },
    enabled: !!(
      (type === 'email' && email) ||
      (type === 'thread' && thread) ||
      (type === 'daily' && emails?.length)
    ),
    staleTime: 10 * 60 * 1000 // 10 minutes
  })

  // Copy summary to clipboard
  const handleCopy = () => {
    if (summary) {
      const text = [
        summary.content,
        '',
        summary.keyPoints?.length ? `Key Points:\n${summary.keyPoints.map(p => `- ${p}`).join('\n')}` : '',
        '',
        summary.actionItems?.length ? `Action Items:\n${summary.actionItems.map(a => `- ${a}`).join('\n')}` : ''
      ].filter(Boolean).join('\n')

      navigator.clipboard.writeText(text)
      toast.success('Summary copied to clipboard')
    }
  }

  // Get icon based on type
  const TypeIcon = type === 'email'
    ? DocumentTextIcon
    : type === 'thread'
    ? ChatBubbleLeftRightIcon
    : CalendarIcon

  // Get title based on type
  const title = type === 'email'
    ? 'Email Summary'
    : type === 'thread'
    ? 'Thread Summary'
    : 'Daily Digest'

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-purple-900/30 border border-purple-700/50 rounded text-sm text-purple-300 hover:bg-purple-900/50 transition-colors ${className}`}
      >
        <SparklesIcon className="w-4 h-4" />
        <span>View AI Summary</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          <TypeIcon className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
              title="Copy summary"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors disabled:opacity-50"
            title="Regenerate"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-purple-400">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm">Generating summary...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
            Failed to generate summary. Please try again.
          </div>
        )}

        {/* Summary Content */}
        {summary && !isLoading && (
          <>
            {/* Main Summary */}
            <div>
              <p className="text-sm text-gray-200 leading-relaxed">{summary.content}</p>
            </div>

            {/* Key Points */}
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <LightBulbIcon className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Key Points
                  </h4>
                </div>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {summary.actionItems && summary.actionItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action Items
                  </h4>
                </div>
                <ul className="space-y-1">
                  {summary.actionItems.map((action, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                      />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Model: {summary.model}</span>
                <span>
                  Generated{' '}
                  {new Date(summary.generatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Inline Summary Badge (for email list)
// =============================================================================

interface SummaryBadgeProps {
  email: Email
  onClick?: () => void
}

export function SummaryBadge({ email, onClick }: SummaryBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-900/40 text-purple-300 rounded-full hover:bg-purple-900/60 transition-colors"
    >
      <SparklesIcon className="w-3 h-3" />
      <span>AI Summary</span>
    </button>
  )
}

// =============================================================================
// Daily Digest Panel
// =============================================================================

interface DailyDigestProps {
  emails: Email[]
  className?: string
}

export function DailyDigest({ emails, className = '' }: DailyDigestProps) {
  const unreadCount = emails.filter((e) => !e.isRead).length
  const starredCount = emails.filter((e) => e.isStarred).length

  return (
    <div className={`bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-700/50">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Daily Digest</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{emails.length} emails</span>
          <span>{unreadCount} unread</span>
          <span>{starredCount} starred</span>
        </div>
      </div>

      {/* Summary */}
      <NG2EmailSummary
        emails={emails}
        type="daily"
        className="border-0 bg-transparent"
      />
    </div>
  )
}

export default NG2EmailSummary
