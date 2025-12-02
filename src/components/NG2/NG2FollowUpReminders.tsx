'use client'

/**
 * NG2 Follow-Up Reminders Component
 *
 * UI for managing follow-up reminders with:
 * - Pending reminders list with overdue indicators
 * - Quick snooze options
 * - AI-suggested follow-ups
 * - Reminder creation modal
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChevronRightIcon,
  SparklesIcon,
  PlusIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline'
import {
  useReminders,
  useFollowUpDetection,
  type FollowUpReminder,
  type ReminderPriority,
  type FollowUpAnalysis
} from '@/lib/reminders/follow-up-service'

// =============================================================================
// Priority Badge
// =============================================================================

function PriorityBadge({ priority }: { priority: ReminderPriority }) {
  const config = {
    urgent: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Urgent' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High' },
    medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium' },
    low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Low' }
  }

  const { bg, text, label } = config[priority]

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

// =============================================================================
// Time Display
// =============================================================================

function TimeDisplay({ timestamp, overdue = false }: { timestamp: number; overdue?: boolean }) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = timestamp - now.getTime()
  const diffDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60))

  let display: string
  if (diffHours < 1) {
    display = overdue ? 'Overdue' : 'Due soon'
  } else if (diffHours < 24) {
    display = overdue ? `${diffHours}h overdue` : `In ${diffHours}h`
  } else if (diffDays === 1) {
    display = overdue ? '1 day overdue' : 'Tomorrow'
  } else if (diffDays < 7) {
    display = overdue ? `${diffDays} days overdue` : `In ${diffDays} days`
  } else {
    display = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
      {display}
    </span>
  )
}

// =============================================================================
// Reminder Card
// =============================================================================

interface ReminderCardProps {
  reminder: FollowUpReminder
  onSnooze: (duration: 'tomorrow' | '2days' | 'nextWeek') => void
  onComplete: () => void
  onDismiss: () => void
  onClick?: () => void
}

function ReminderCard({ reminder, onSnooze, onComplete, onDismiss, onClick }: ReminderCardProps) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const isOverdue = reminder.dueAt < Date.now()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-3 rounded-lg border ${
        isOverdue
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-gray-800/50 border-gray-700/50'
      } hover:border-gray-600 transition-colors cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${
          isOverdue ? 'bg-red-500/20' : 'bg-purple-500/20'
        }`}>
          {isOverdue ? (
            <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
          ) : (
            <BellIcon className="w-4 h-4 text-purple-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate">
              {reminder.emailSubject}
            </h4>
            <PriorityBadge priority={reminder.priority} />
          </div>

          <p className="text-xs text-gray-400 truncate mb-1">
            From: {reminder.emailFrom}
          </p>

          <div className="flex items-center gap-3">
            <TimeDisplay timestamp={reminder.dueAt} overdue={isOverdue} />
            {reminder.trigger === 'ai_detected' && (
              <span className="flex items-center gap-1 text-xs text-purple-400">
                <SparklesIcon className="w-3 h-3" />
                AI suggested
              </span>
            )}
          </div>

          {reminder.reason && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {reminder.reason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* Snooze */}
          <div className="relative">
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Snooze"
            >
              <ClockIcon className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showSnoozeMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10"
                >
                  <button
                    onClick={() => { onSnooze('tomorrow'); setShowSnoozeMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 first:rounded-t-lg"
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => { onSnooze('2days'); setShowSnoozeMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                  >
                    In 2 days
                  </button>
                  <button
                    onClick={() => { onSnooze('nextWeek'); setShowSnoozeMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 last:rounded-b-lg"
                  >
                    Next week
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Complete */}
          <button
            onClick={onComplete}
            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors"
            title="Mark complete"
          >
            <CheckCircleIcon className="w-4 h-4" />
          </button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// AI Suggestion Card
// =============================================================================

interface AISuggestionCardProps {
  email: {
    id: string
    threadId: string
    subject: string
    from: string
    sentAt: Date
  }
  analysis: FollowUpAnalysis
  onAccept: () => void
  onDismiss: () => void
}

function AISuggestionCard({ email, analysis, onAccept, onDismiss }: AISuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <SparklesIcon className="w-4 h-4 text-purple-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-purple-400 font-medium">AI Suggestion</span>
            <span className="text-xs text-gray-500">
              {analysis.confidence}% confident
            </span>
          </div>

          <h4 className="text-sm font-medium text-white mb-1">
            Set reminder for: {email.subject}
          </h4>

          <p className="text-xs text-gray-400 mb-2">
            {analysis.reason}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarIcon className="w-3.5 h-3.5" />
            Suggested: {analysis.suggestedDueDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
            <PriorityBadge priority={analysis.priority} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onAccept}
            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors"
          >
            Add Reminder
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// Create Reminder Modal
// =============================================================================

interface CreateReminderModalProps {
  isOpen: boolean
  onClose: () => void
  email: {
    id: string
    threadId: string
    subject: string
    from: string
    sentAt: Date
  }
  onSave: (options: {
    title: string
    priority: ReminderPriority
    dueAt: Date
    description?: string
  }) => void
}

function CreateReminderModal({ isOpen, onClose, email, onSave }: CreateReminderModalProps) {
  const [title, setTitle] = useState(`Follow up: ${email.subject}`)
  const [priority, setPriority] = useState<ReminderPriority>('medium')
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [description, setDescription] = useState('')

  const handleSave = () => {
    onSave({
      title,
      priority,
      dueAt: new Date(dueDate),
      description: description || undefined
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Create Reminder</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              placeholder="Reminder title..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'urgent'] as ReminderPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    priority === p
                      ? p === 'urgent' ? 'bg-red-500 text-white' :
                        p === 'high' ? 'bg-orange-500 text-white' :
                        p === 'medium' ? 'bg-yellow-500 text-gray-900' :
                        'bg-gray-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Add any notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
          >
            Create Reminder
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// =============================================================================
// Reminders Panel
// =============================================================================

interface RemindersPanelProps {
  className?: string
  onSelectEmail?: (emailId: string) => void
}

export function RemindersPanel({ className = '', onSelectEmail }: RemindersPanelProps) {
  const {
    pendingReminders,
    overdueReminders,
    overdueCount,
    snoozeReminder,
    completeReminder,
    dismissReminder
  } = useReminders()

  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all')

  // Filter reminders
  const filteredReminders = React.useMemo(() => {
    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (filter) {
      case 'overdue':
        return overdueReminders
      case 'today':
        return pendingReminders.filter(r => r.dueAt <= todayEnd.getTime())
      default:
        return pendingReminders
    }
  }, [filter, pendingReminders, overdueReminders])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Follow-ups</h2>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-3 border-b border-gray-700/50">
        {[
          { key: 'all', label: 'All' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'today', label: 'Today' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === key
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredReminders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <BellIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No reminders</p>
              <p className="text-xs mt-1">
                {filter === 'overdue'
                  ? 'Great! Nothing overdue'
                  : 'Add reminders to emails you need to follow up on'}
              </p>
            </motion.div>
          ) : (
            filteredReminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onSnooze={(duration) => snoozeReminder(reminder.id, duration)}
                onComplete={() => completeReminder(reminder.id)}
                onDismiss={() => dismissReminder(reminder.id)}
                onClick={() => onSelectEmail?.(reminder.emailId)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// =============================================================================
// Inline Reminder Indicator
// =============================================================================

interface ReminderIndicatorProps {
  emailId: string
  className?: string
}

export function ReminderIndicator({ emailId, className = '' }: ReminderIndicatorProps) {
  const { getRemindersByEmail, overdueReminders } = useReminders()
  const reminders = getRemindersByEmail(emailId)

  if (reminders.length === 0) return null

  const hasOverdue = reminders.some(r => overdueReminders.find(o => o.id === r.id))
  const pendingCount = reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length

  if (pendingCount === 0) return null

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <BellIcon className={`w-3.5 h-3.5 ${hasOverdue ? 'text-red-400' : 'text-purple-400'}`} />
      {pendingCount > 1 && (
        <span className={`text-xs ${hasOverdue ? 'text-red-400' : 'text-purple-400'}`}>
          {pendingCount}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// Add Reminder Button
// =============================================================================

interface AddReminderButtonProps {
  email: {
    id: string
    threadId: string
    subject: string
    from: string
    sentAt: Date
  }
  className?: string
}

export function AddReminderButton({ email, className = '' }: AddReminderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { createReminder, getRemindersByEmail } = useReminders()

  const existingReminders = getRemindersByEmail(email.id)
  const hasReminder = existingReminders.some(r => r.status === 'pending' || r.status === 'snoozed')

  const handleSave = (options: {
    title: string
    priority: ReminderPriority
    dueAt: Date
    description?: string
  }) => {
    createReminder(email, {
      title: options.title,
      priority: options.priority,
      dueAt: options.dueAt,
      description: options.description,
      trigger: 'manual'
    })
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors ${
          hasReminder
            ? 'bg-purple-500/20 text-purple-400'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        } ${className}`}
        title={hasReminder ? 'Edit reminder' : 'Add reminder'}
      >
        {hasReminder ? (
          <>
            <BellIcon className="w-3.5 h-3.5" />
            <span>Reminder set</span>
          </>
        ) : (
          <>
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add reminder</span>
          </>
        )}
      </button>

      <CreateReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        email={email}
        onSave={handleSave}
      />
    </>
  )
}

// =============================================================================
// AI Follow-up Suggestion Widget
// =============================================================================

interface FollowUpSuggestionProps {
  email: {
    id: string
    threadId: string
    subject: string
    body: string
    from: string
    to: string[]
    sentAt: Date
    labels?: string[]
    isStarred?: boolean
    isImportant?: boolean
  }
  className?: string
  onDismiss?: () => void
}

export function FollowUpSuggestion({ email, className = '', onDismiss }: FollowUpSuggestionProps) {
  const { analysis, isAnalyzing } = useFollowUpDetection(email)
  const { createFromAnalysis, getRemindersByEmail } = useReminders()
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if reminder already exists
  const existingReminders = getRemindersByEmail(email.id)
  const hasReminder = existingReminders.some(r => r.status === 'pending' || r.status === 'snoozed')

  // Don't show if dismissed, already has reminder, or doesn't need follow-up
  if (isDismissed || hasReminder || !analysis?.needsFollowUp || analysis.confidence < 50) {
    return null
  }

  if (isAnalyzing) {
    return (
      <div className={`p-3 bg-gray-800/50 rounded-lg animate-pulse ${className}`}>
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400">Analyzing for follow-up...</span>
        </div>
      </div>
    )
  }

  const handleAccept = () => {
    createFromAnalysis(email, analysis)
    setIsDismissed(true)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <AISuggestionCard
      email={email}
      analysis={analysis}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
    />
  )
}

// =============================================================================
// Main Export
// =============================================================================

export default RemindersPanel
