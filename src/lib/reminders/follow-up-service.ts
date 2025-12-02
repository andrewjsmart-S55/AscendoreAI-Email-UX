/**
 * Follow-up Reminders Service
 *
 * Intelligent system for detecting when emails need follow-up
 * and scheduling reminders automatically.
 *
 * Features:
 * - AI-powered follow-up detection
 * - Customizable reminder schedules
 * - Snooze functionality
 * - Priority-based reminders
 * - Integration with notification system
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'dismissed'
export type ReminderTrigger = 'manual' | 'ai_detected' | 'no_response' | 'scheduled'

export interface FollowUpReminder {
  id: string
  emailId: string
  threadId: string
  userId: string

  // Reminder details
  title: string
  description?: string
  priority: ReminderPriority
  status: ReminderStatus
  trigger: ReminderTrigger

  // Timing
  dueAt: number // timestamp
  createdAt: number
  snoozedUntil?: number
  completedAt?: number

  // Email context
  emailSubject: string
  emailFrom: string
  emailSentAt: number

  // AI confidence (for auto-detected)
  confidence?: number
  reason?: string

  // Actions
  suggestedAction?: 'reply' | 'forward' | 'archive' | 'call' | 'meeting'
}

export interface ReminderRule {
  id: string
  name: string
  enabled: boolean

  // Conditions
  conditions: {
    senderDomain?: string[]
    senderEmail?: string[]
    subjectContains?: string[]
    labelIds?: string[]
    noResponseDays?: number // Remind if no response after X days
    isImportant?: boolean
  }

  // Actions
  priority: ReminderPriority
  reminderDelayDays: number
  autoSnoozeHours?: number
}

export interface FollowUpAnalysis {
  needsFollowUp: boolean
  confidence: number
  reason: string
  suggestedDueDate: Date
  priority: ReminderPriority
  suggestedAction?: 'reply' | 'forward' | 'archive' | 'call' | 'meeting'
}

// =============================================================================
// Follow-up Detection Patterns
// =============================================================================

const FOLLOW_UP_INDICATORS = {
  // Questions that expect a response
  pendingQuestions: [
    /\?[\s]*$/m,
    /could you (please )?(let me know|confirm|clarify|send|provide)/i,
    /can you (please )?(let me know|confirm|clarify|send|provide)/i,
    /would you (please )?(let me know|confirm|clarify|send|provide)/i,
    /please (let me know|confirm|get back|respond|reply)/i,
    /waiting for (your|a) (response|reply|confirmation|feedback)/i,
    /looking forward to (hearing|your response|your reply)/i,
    /get back to me/i,
  ],

  // Action items
  actionRequired: [
    /action required/i,
    /action needed/i,
    /please review/i,
    /needs your (attention|approval|review|input)/i,
    /pending your (approval|review|response)/i,
    /awaiting your/i,
    /by (monday|tuesday|wednesday|thursday|friday|tomorrow|end of (day|week))/i,
  ],

  // Deadlines
  deadlines: [
    /deadline[:\s]/i,
    /due (by|date|on)/i,
    /by (end of|close of|cob|eod)/i,
    /no later than/i,
    /asap/i,
    /urgent/i,
    /time.?sensitive/i,
  ],

  // Commitments made
  commitments: [
    /i('ll| will) (get back|send|follow up|respond|reply)/i,
    /let me (check|look into|get back|find out)/i,
    /i('ll| will) have (this|that|it|the) (to|for) you/i,
  ],

  // Requests for meetings/calls
  meetingRequests: [
    /schedule (a |)call/i,
    /set up (a |)(meeting|call)/i,
    /when (are you|is everyone) (available|free)/i,
    /let('s| us) (meet|talk|discuss|connect)/i,
    /would (you|everyone) be available/i,
  ]
}

// Priority keywords
const PRIORITY_INDICATORS = {
  urgent: [
    /urgent/i,
    /asap/i,
    /immediately/i,
    /critical/i,
    /emergency/i,
    /time.?sensitive/i,
  ],
  high: [
    /important/i,
    /priority/i,
    /deadline/i,
    /by (end of|close of)/i,
    /needs your (immediate |)attention/i,
  ],
  medium: [
    /please (let me know|respond|reply)/i,
    /when you (get a chance|have time)/i,
    /at your earliest convenience/i,
  ]
}

// =============================================================================
// Follow-up Detection Service
// =============================================================================

export class FollowUpDetector {
  /**
   * Analyze an email to determine if it needs follow-up
   */
  analyzeEmail(email: {
    id: string
    subject: string
    body: string
    from: string
    to: string[]
    sentAt: Date
    labels?: string[]
    isStarred?: boolean
    isImportant?: boolean
  }): FollowUpAnalysis {
    const content = `${email.subject} ${email.body}`.toLowerCase()
    let score = 0
    const reasons: string[] = []
    let suggestedAction: FollowUpAnalysis['suggestedAction']

    // Check for pending questions
    for (const pattern of FOLLOW_UP_INDICATORS.pendingQuestions) {
      if (pattern.test(email.body)) {
        score += 20
        if (!reasons.includes('Contains questions awaiting response')) {
          reasons.push('Contains questions awaiting response')
        }
        suggestedAction = 'reply'
        break
      }
    }

    // Check for action required
    for (const pattern of FOLLOW_UP_INDICATORS.actionRequired) {
      if (pattern.test(content)) {
        score += 25
        if (!reasons.includes('Action required from you')) {
          reasons.push('Action required from you')
        }
        suggestedAction = suggestedAction || 'reply'
        break
      }
    }

    // Check for deadlines
    for (const pattern of FOLLOW_UP_INDICATORS.deadlines) {
      if (pattern.test(content)) {
        score += 20
        if (!reasons.includes('Has deadline mentioned')) {
          reasons.push('Has deadline mentioned')
        }
        break
      }
    }

    // Check for commitments
    for (const pattern of FOLLOW_UP_INDICATORS.commitments) {
      if (pattern.test(email.body)) {
        score += 15
        if (!reasons.includes('Contains commitments to follow up')) {
          reasons.push('Contains commitments to follow up')
        }
        break
      }
    }

    // Check for meeting requests
    for (const pattern of FOLLOW_UP_INDICATORS.meetingRequests) {
      if (pattern.test(content)) {
        score += 15
        if (!reasons.includes('Meeting/call scheduling requested')) {
          reasons.push('Meeting/call scheduling requested')
        }
        suggestedAction = 'meeting'
        break
      }
    }

    // Boost score for important/starred emails
    if (email.isImportant || email.isStarred) {
      score += 10
    }

    // Determine priority
    let priority: ReminderPriority = 'low'

    for (const pattern of PRIORITY_INDICATORS.urgent) {
      if (pattern.test(content)) {
        priority = 'urgent'
        score += 15
        break
      }
    }

    if (priority !== 'urgent') {
      for (const pattern of PRIORITY_INDICATORS.high) {
        if (pattern.test(content)) {
          priority = 'high'
          score += 10
          break
        }
      }
    }

    if (priority === 'low') {
      for (const pattern of PRIORITY_INDICATORS.medium) {
        if (pattern.test(content)) {
          priority = 'medium'
          score += 5
          break
        }
      }
    }

    // Calculate confidence (0-100)
    const confidence = Math.min(score, 100)
    const needsFollowUp = confidence >= 40

    // Calculate suggested due date based on priority
    const suggestedDueDate = this.calculateDueDate(priority, email.sentAt)

    return {
      needsFollowUp,
      confidence,
      reason: reasons.join('. ') || 'No follow-up indicators detected',
      suggestedDueDate,
      priority: needsFollowUp ? priority : 'low',
      suggestedAction
    }
  }

  /**
   * Calculate suggested due date based on priority
   */
  private calculateDueDate(priority: ReminderPriority, sentAt: Date): Date {
    const now = new Date()
    const base = new Date(Math.max(now.getTime(), sentAt.getTime()))

    switch (priority) {
      case 'urgent':
        // Same day or next business day
        base.setHours(base.getHours() + 4)
        break
      case 'high':
        // 1-2 days
        base.setDate(base.getDate() + 1)
        break
      case 'medium':
        // 3-5 days
        base.setDate(base.getDate() + 3)
        break
      case 'low':
      default:
        // 1 week
        base.setDate(base.getDate() + 7)
        break
    }

    // Skip weekends for business emails
    const day = base.getDay()
    if (day === 0) base.setDate(base.getDate() + 1) // Sunday -> Monday
    if (day === 6) base.setDate(base.getDate() + 2) // Saturday -> Monday

    // Set to 9 AM
    base.setHours(9, 0, 0, 0)

    return base
  }

  /**
   * Check for no-response follow-up needs
   */
  checkNoResponse(
    sentEmail: { id: string; threadId: string; sentAt: Date },
    threadEmails: { from: string; sentAt: Date }[],
    userEmail: string,
    noResponseDays: number = 3
  ): boolean {
    const now = new Date()
    const daysSinceSent = (now.getTime() - sentEmail.sentAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceSent < noResponseDays) {
      return false
    }

    // Check if there's a response after the sent email
    const hasResponse = threadEmails.some(
      email =>
        email.from !== userEmail &&
        new Date(email.sentAt).getTime() > sentEmail.sentAt.getTime()
    )

    return !hasResponse
  }
}

// =============================================================================
// Reminder Store
// =============================================================================

interface ReminderStore {
  reminders: FollowUpReminder[]
  rules: ReminderRule[]

  // Actions
  addReminder: (reminder: Omit<FollowUpReminder, 'id' | 'createdAt'>) => FollowUpReminder
  updateReminder: (id: string, updates: Partial<FollowUpReminder>) => void
  deleteReminder: (id: string) => void

  // Status changes
  snoozeReminder: (id: string, snoozeDuration: 'tomorrow' | '2days' | 'nextWeek' | 'custom', customDate?: Date) => void
  completeReminder: (id: string) => void
  dismissReminder: (id: string) => void

  // Rules
  addRule: (rule: Omit<ReminderRule, 'id'>) => ReminderRule
  updateRule: (id: string, updates: Partial<ReminderRule>) => void
  deleteRule: (id: string) => void
  toggleRule: (id: string) => void

  // Queries
  getPendingReminders: () => FollowUpReminder[]
  getOverdueReminders: () => FollowUpReminder[]
  getRemindersByEmail: (emailId: string) => FollowUpReminder[]
  getRemindersByThread: (threadId: string) => FollowUpReminder[]
}

export const useReminderStore = create<ReminderStore>()(
  persist(
    (set, get) => ({
      reminders: [],
      rules: getDefaultRules(),

      addReminder: (reminderData) => {
        const reminder: FollowUpReminder = {
          ...reminderData,
          id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          status: 'pending'
        }

        set(state => ({
          reminders: [...state.reminders, reminder]
        }))

        return reminder
      },

      updateReminder: (id, updates) => {
        set(state => ({
          reminders: state.reminders.map(r =>
            r.id === id ? { ...r, ...updates } : r
          )
        }))
      },

      deleteReminder: (id) => {
        set(state => ({
          reminders: state.reminders.filter(r => r.id !== id)
        }))
      },

      snoozeReminder: (id, duration, customDate) => {
        const now = new Date()
        let snoozedUntil: Date

        switch (duration) {
          case 'tomorrow':
            snoozedUntil = new Date(now)
            snoozedUntil.setDate(snoozedUntil.getDate() + 1)
            snoozedUntil.setHours(9, 0, 0, 0)
            break
          case '2days':
            snoozedUntil = new Date(now)
            snoozedUntil.setDate(snoozedUntil.getDate() + 2)
            snoozedUntil.setHours(9, 0, 0, 0)
            break
          case 'nextWeek':
            snoozedUntil = new Date(now)
            snoozedUntil.setDate(snoozedUntil.getDate() + 7)
            snoozedUntil.setHours(9, 0, 0, 0)
            break
          case 'custom':
            snoozedUntil = customDate || new Date(now.getTime() + 24 * 60 * 60 * 1000)
            break
          default:
            snoozedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }

        set(state => ({
          reminders: state.reminders.map(r =>
            r.id === id
              ? { ...r, status: 'snoozed' as const, snoozedUntil: snoozedUntil.getTime() }
              : r
          )
        }))
      },

      completeReminder: (id) => {
        set(state => ({
          reminders: state.reminders.map(r =>
            r.id === id
              ? { ...r, status: 'completed' as const, completedAt: Date.now() }
              : r
          )
        }))
      },

      dismissReminder: (id) => {
        set(state => ({
          reminders: state.reminders.map(r =>
            r.id === id
              ? { ...r, status: 'dismissed' as const }
              : r
          )
        }))
      },

      addRule: (ruleData) => {
        const rule: ReminderRule = {
          ...ruleData,
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        set(state => ({
          rules: [...state.rules, rule]
        }))

        return rule
      },

      updateRule: (id, updates) => {
        set(state => ({
          rules: state.rules.map(r =>
            r.id === id ? { ...r, ...updates } : r
          )
        }))
      },

      deleteRule: (id) => {
        set(state => ({
          rules: state.rules.filter(r => r.id !== id)
        }))
      },

      toggleRule: (id) => {
        set(state => ({
          rules: state.rules.map(r =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          )
        }))
      },

      getPendingReminders: () => {
        const { reminders } = get()
        const now = Date.now()

        return reminders.filter(r => {
          if (r.status === 'completed' || r.status === 'dismissed') return false
          if (r.status === 'snoozed' && r.snoozedUntil && r.snoozedUntil > now) return false
          return true
        }).sort((a, b) => a.dueAt - b.dueAt)
      },

      getOverdueReminders: () => {
        const { reminders } = get()
        const now = Date.now()

        return reminders.filter(r => {
          if (r.status !== 'pending') return false
          return r.dueAt < now
        }).sort((a, b) => a.dueAt - b.dueAt)
      },

      getRemindersByEmail: (emailId) => {
        return get().reminders.filter(r => r.emailId === emailId)
      },

      getRemindersByThread: (threadId) => {
        return get().reminders.filter(r => r.threadId === threadId)
      }
    }),
    {
      name: 'boxzero-reminders',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        reminders: state.reminders,
        rules: state.rules
      })
    }
  )
)

// =============================================================================
// Default Rules
// =============================================================================

function getDefaultRules(): ReminderRule[] {
  return [
    {
      id: 'rule_no_response_3days',
      name: 'No response in 3 days',
      enabled: true,
      conditions: {
        noResponseDays: 3
      },
      priority: 'medium',
      reminderDelayDays: 0
    },
    {
      id: 'rule_important_emails',
      name: 'Important emails',
      enabled: true,
      conditions: {
        isImportant: true
      },
      priority: 'high',
      reminderDelayDays: 1
    },
    {
      id: 'rule_no_response_7days',
      name: 'No response in 7 days',
      enabled: true,
      conditions: {
        noResponseDays: 7
      },
      priority: 'low',
      reminderDelayDays: 0
    }
  ]
}

// =============================================================================
// React Hooks
// =============================================================================

import { useEffect, useState, useCallback } from 'react'

export function useFollowUpDetection(email: {
  id: string
  subject: string
  body: string
  from: string
  to: string[]
  sentAt: Date
  labels?: string[]
  isStarred?: boolean
  isImportant?: boolean
} | null) {
  const [analysis, setAnalysis] = useState<FollowUpAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (!email) {
      setAnalysis(null)
      return
    }

    setIsAnalyzing(true)

    // Simulate async analysis (could be replaced with actual AI call)
    const detector = new FollowUpDetector()
    const result = detector.analyzeEmail(email)

    setAnalysis(result)
    setIsAnalyzing(false)
  }, [email?.id])

  return { analysis, isAnalyzing }
}

export function useReminders() {
  const store = useReminderStore()
  const [overdueCount, setOverdueCount] = useState(0)

  // Update overdue count periodically
  useEffect(() => {
    const updateCount = () => {
      setOverdueCount(store.getOverdueReminders().length)
    }

    updateCount()
    const interval = setInterval(updateCount, 60000) // Every minute

    return () => clearInterval(interval)
  }, [store.reminders])

  const createReminder = useCallback((
    email: {
      id: string
      threadId: string
      subject: string
      from: string
      sentAt: Date
    },
    options: {
      title?: string
      description?: string
      priority?: ReminderPriority
      dueAt?: Date
      trigger?: ReminderTrigger
    } = {}
  ) => {
    return store.addReminder({
      emailId: email.id,
      threadId: email.threadId,
      userId: '', // Will be set by context
      title: options.title || `Follow up: ${email.subject}`,
      description: options.description,
      priority: options.priority || 'medium',
      status: 'pending',
      trigger: options.trigger || 'manual',
      dueAt: options.dueAt?.getTime() || Date.now() + 3 * 24 * 60 * 60 * 1000, // Default 3 days
      emailSubject: email.subject,
      emailFrom: email.from,
      emailSentAt: email.sentAt.getTime()
    })
  }, [store.addReminder])

  const createFromAnalysis = useCallback((
    email: {
      id: string
      threadId: string
      subject: string
      from: string
      sentAt: Date
    },
    analysis: FollowUpAnalysis
  ) => {
    return store.addReminder({
      emailId: email.id,
      threadId: email.threadId,
      userId: '',
      title: `Follow up: ${email.subject}`,
      description: analysis.reason,
      priority: analysis.priority,
      status: 'pending',
      trigger: 'ai_detected',
      dueAt: analysis.suggestedDueDate.getTime(),
      emailSubject: email.subject,
      emailFrom: email.from,
      emailSentAt: email.sentAt.getTime(),
      confidence: analysis.confidence,
      reason: analysis.reason,
      suggestedAction: analysis.suggestedAction
    })
  }, [store.addReminder])

  return {
    reminders: store.reminders,
    rules: store.rules,
    pendingReminders: store.getPendingReminders(),
    overdueReminders: store.getOverdueReminders(),
    overdueCount,

    // Actions
    createReminder,
    createFromAnalysis,
    snoozeReminder: store.snoozeReminder,
    completeReminder: store.completeReminder,
    dismissReminder: store.dismissReminder,
    deleteReminder: store.deleteReminder,

    // Rules
    addRule: store.addRule,
    updateRule: store.updateRule,
    deleteRule: store.deleteRule,
    toggleRule: store.toggleRule,

    // Queries
    getRemindersByEmail: store.getRemindersByEmail,
    getRemindersByThread: store.getRemindersByThread
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const followUpDetector = new FollowUpDetector()
export default followUpDetector
