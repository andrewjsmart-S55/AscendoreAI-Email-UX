/**
 * Send Later Service
 *
 * Schedule emails to be sent at a specific time:
 * - Configurable send times
 * - Time zone support
 * - Edit/cancel scheduled emails
 * - Retry logic for failed sends
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type ScheduleStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'

export interface ScheduledEmail {
  id: string
  userId: string

  // Email content
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  bodyHtml?: string
  replyToId?: string
  threadId?: string
  attachments: {
    id: string
    filename: string
    mimeType: string
    size: number
    data?: string // Base64
  }[]

  // Schedule details
  scheduledFor: number // timestamp
  timezone: string
  status: ScheduleStatus

  // Tracking
  createdAt: number
  updatedAt: number
  sentAt?: number
  failedAt?: number
  failedReason?: string
  retryCount: number
  maxRetries: number
}

export interface SendLaterPreset {
  id: string
  name: string
  description?: string
  calculateTime: () => Date
}

// =============================================================================
// Time Calculation Helpers
// =============================================================================

export function getNextBusinessDay(from: Date = new Date()): Date {
  const result = new Date(from)
  result.setDate(result.getDate() + 1)

  // Skip weekends
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1)
  }

  return result
}

export function setTimeOfDay(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

export function formatScheduleTime(timestamp: number, timezone?: string): string {
  const date = new Date(timestamp)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  }

  return date.toLocaleString('en-US', options)
}

export function getTimeUntilSend(timestamp: number): string {
  const now = Date.now()
  const diff = timestamp - now

  if (diff <= 0) return 'Sending now'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`
  if (hours < 24) return `in ${hours} hour${hours !== 1 ? 's' : ''}`
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

// =============================================================================
// Default Presets
// =============================================================================

export const SEND_LATER_PRESETS: SendLaterPreset[] = [
  {
    id: 'in_1_hour',
    name: 'In 1 hour',
    calculateTime: () => new Date(Date.now() + 60 * 60 * 1000)
  },
  {
    id: 'in_2_hours',
    name: 'In 2 hours',
    calculateTime: () => new Date(Date.now() + 2 * 60 * 60 * 1000)
  },
  {
    id: 'in_4_hours',
    name: 'In 4 hours',
    calculateTime: () => new Date(Date.now() + 4 * 60 * 60 * 1000)
  },
  {
    id: 'tomorrow_morning',
    name: 'Tomorrow morning',
    description: '8:00 AM',
    calculateTime: () => setTimeOfDay(getNextBusinessDay(), 8)
  },
  {
    id: 'tomorrow_afternoon',
    name: 'Tomorrow afternoon',
    description: '1:00 PM',
    calculateTime: () => setTimeOfDay(getNextBusinessDay(), 13)
  },
  {
    id: 'monday_morning',
    name: 'Monday morning',
    description: '8:00 AM',
    calculateTime: () => {
      const now = new Date()
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      const monday = new Date(now)
      monday.setDate(monday.getDate() + daysUntilMonday)
      return setTimeOfDay(monday, 8)
    }
  }
]

// =============================================================================
// Send Later Store
// =============================================================================

interface SendLaterStore {
  scheduledEmails: ScheduledEmail[]
  customPresets: SendLaterPreset[]
  defaultTimezone: string

  // Actions
  scheduleEmail: (email: Omit<ScheduledEmail, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount'>) => ScheduledEmail
  updateScheduledEmail: (id: string, updates: Partial<ScheduledEmail>) => void
  cancelScheduledEmail: (id: string) => void
  deleteScheduledEmail: (id: string) => void
  rescheduleEmail: (id: string, newTime: Date) => void

  // Status updates
  markAsSending: (id: string) => void
  markAsSent: (id: string) => void
  markAsFailed: (id: string, reason: string) => void
  incrementRetry: (id: string) => boolean

  // Preset management
  addCustomPreset: (preset: Omit<SendLaterPreset, 'id'>) => void
  removeCustomPreset: (id: string) => void

  // Settings
  setDefaultTimezone: (timezone: string) => void

  // Queries
  getScheduledById: (id: string) => ScheduledEmail | undefined
  getScheduledByUser: (userId: string) => ScheduledEmail[]
  getPendingEmails: (userId: string) => ScheduledEmail[]
  getReadyToSend: () => ScheduledEmail[]
  getFailedEmails: (userId: string) => ScheduledEmail[]
}

export const useSendLaterStore = create<SendLaterStore>()(
  persist(
    (set, get) => ({
      scheduledEmails: [],
      customPresets: [],
      defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      scheduleEmail: (emailData) => {
        const scheduled: ScheduledEmail = {
          ...emailData,
          id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'scheduled',
          retryCount: 0,
          maxRetries: emailData.maxRetries || 3,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          scheduledEmails: [...state.scheduledEmails, scheduled]
        }))

        return scheduled
      },

      updateScheduledEmail: (id, updates) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id
              ? { ...email, ...updates, updatedAt: Date.now() }
              : email
          )
        }))
      },

      cancelScheduledEmail: (id) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id && email.status === 'scheduled'
              ? { ...email, status: 'cancelled' as const, updatedAt: Date.now() }
              : email
          )
        }))
      },

      deleteScheduledEmail: (id) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.filter(email => email.id !== id)
        }))
      },

      rescheduleEmail: (id, newTime) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id && (email.status === 'scheduled' || email.status === 'failed')
              ? {
                  ...email,
                  scheduledFor: newTime.getTime(),
                  status: 'scheduled' as const,
                  retryCount: 0,
                  failedReason: undefined,
                  updatedAt: Date.now()
                }
              : email
          )
        }))
      },

      markAsSending: (id) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id
              ? { ...email, status: 'sending' as const, updatedAt: Date.now() }
              : email
          )
        }))
      },

      markAsSent: (id) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id
              ? { ...email, status: 'sent' as const, sentAt: Date.now(), updatedAt: Date.now() }
              : email
          )
        }))
      },

      markAsFailed: (id, reason) => {
        set(state => ({
          scheduledEmails: state.scheduledEmails.map(email =>
            email.id === id
              ? {
                  ...email,
                  status: 'failed' as const,
                  failedAt: Date.now(),
                  failedReason: reason,
                  updatedAt: Date.now()
                }
              : email
          )
        }))
      },

      incrementRetry: (id) => {
        const email = get().scheduledEmails.find(e => e.id === id)
        if (!email || email.retryCount >= email.maxRetries) {
          return false
        }

        set(state => ({
          scheduledEmails: state.scheduledEmails.map(e =>
            e.id === id
              ? {
                  ...e,
                  retryCount: e.retryCount + 1,
                  status: 'scheduled' as const,
                  updatedAt: Date.now()
                }
              : e
          )
        }))

        return true
      },

      addCustomPreset: (presetData) => {
        const preset: SendLaterPreset = {
          ...presetData,
          id: `preset_${Date.now()}`
        }

        set(state => ({
          customPresets: [...state.customPresets, preset]
        }))
      },

      removeCustomPreset: (id) => {
        set(state => ({
          customPresets: state.customPresets.filter(p => p.id !== id)
        }))
      },

      setDefaultTimezone: (timezone) => {
        set({ defaultTimezone: timezone })
      },

      getScheduledById: (id) => {
        return get().scheduledEmails.find(e => e.id === id)
      },

      getScheduledByUser: (userId) => {
        return get().scheduledEmails.filter(e => e.userId === userId)
      },

      getPendingEmails: (userId) => {
        return get().scheduledEmails
          .filter(e => e.userId === userId && e.status === 'scheduled')
          .sort((a, b) => a.scheduledFor - b.scheduledFor)
      },

      getReadyToSend: () => {
        const now = Date.now()
        return get().scheduledEmails.filter(e =>
          e.status === 'scheduled' && e.scheduledFor <= now
        )
      },

      getFailedEmails: (userId) => {
        return get().scheduledEmails.filter(e =>
          e.userId === userId && e.status === 'failed'
        )
      }
    }),
    {
      name: 'boxzero-send-later',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scheduledEmails: state.scheduledEmails,
        customPresets: state.customPresets,
        defaultTimezone: state.defaultTimezone
      })
    }
  )
)

// =============================================================================
// Send Later Worker
// =============================================================================

type SendFunction = (email: ScheduledEmail) => Promise<void>

class SendLaterWorker {
  private intervalId: NodeJS.Timeout | null = null
  private sendFunction: SendFunction | null = null
  private isRunning = false

  start(sendFunction: SendFunction, checkIntervalMs: number = 30000) {
    if (this.isRunning) return

    this.sendFunction = sendFunction
    this.isRunning = true

    // Check immediately
    this.processQueue()

    // Then check periodically
    this.intervalId = setInterval(() => {
      this.processQueue()
    }, checkIntervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  private async processQueue() {
    if (!this.sendFunction) return

    const store = useSendLaterStore.getState()
    const readyToSend = store.getReadyToSend()

    for (const email of readyToSend) {
      try {
        store.markAsSending(email.id)
        await this.sendFunction(email)
        store.markAsSent(email.id)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error'

        // Try to retry
        const canRetry = store.incrementRetry(email.id)
        if (!canRetry) {
          store.markAsFailed(email.id, reason)
        }
      }
    }
  }
}

export const sendLaterWorker = new SendLaterWorker()

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useEffect } from 'react'

export function useSendLater(userId: string | null) {
  const store = useSendLaterStore()

  const pendingEmails = useMemo(
    () => userId ? store.getPendingEmails(userId) : [],
    [userId, store.scheduledEmails]
  )

  const failedEmails = useMemo(
    () => userId ? store.getFailedEmails(userId) : [],
    [userId, store.scheduledEmails]
  )

  const scheduleEmail = useCallback((
    email: {
      to: string[]
      cc?: string[]
      bcc?: string[]
      subject: string
      body: string
      bodyHtml?: string
      replyToId?: string
      threadId?: string
      attachments?: ScheduledEmail['attachments']
    },
    sendAt: Date,
    timezone?: string
  ) => {
    if (!userId) return null

    return store.scheduleEmail({
      userId,
      to: email.to,
      cc: email.cc || [],
      bcc: email.bcc || [],
      subject: email.subject,
      body: email.body,
      bodyHtml: email.bodyHtml,
      replyToId: email.replyToId,
      threadId: email.threadId,
      attachments: email.attachments || [],
      scheduledFor: sendAt.getTime(),
      timezone: timezone || store.defaultTimezone,
      maxRetries: 3
    })
  }, [userId, store.scheduleEmail, store.defaultTimezone])

  const scheduleWithPreset = useCallback((
    email: Parameters<typeof scheduleEmail>[0],
    presetId: string
  ) => {
    const preset = [...SEND_LATER_PRESETS, ...store.customPresets].find(p => p.id === presetId)
    if (!preset) return null

    return scheduleEmail(email, preset.calculateTime())
  }, [scheduleEmail, store.customPresets])

  return {
    pendingEmails,
    failedEmails,
    presets: [...SEND_LATER_PRESETS, ...store.customPresets],
    defaultTimezone: store.defaultTimezone,

    // Actions
    scheduleEmail,
    scheduleWithPreset,
    cancelEmail: store.cancelScheduledEmail,
    rescheduleEmail: store.rescheduleEmail,
    deleteEmail: store.deleteScheduledEmail,
    retryEmail: (id: string) => {
      const email = store.getScheduledById(id)
      if (email) {
        store.rescheduleEmail(id, new Date(Date.now() + 60000)) // Retry in 1 minute
      }
    },

    // Settings
    setDefaultTimezone: store.setDefaultTimezone
  }
}

export function useScheduledEmailStatus(emailId: string | null) {
  const store = useSendLaterStore()

  const email = useMemo(
    () => emailId ? store.getScheduledById(emailId) : undefined,
    [emailId, store.scheduledEmails]
  )

  return {
    isScheduled: email?.status === 'scheduled',
    isSending: email?.status === 'sending',
    isSent: email?.status === 'sent',
    isFailed: email?.status === 'failed',
    isCancelled: email?.status === 'cancelled',
    scheduledFor: email?.scheduledFor,
    scheduledForFormatted: email
      ? formatScheduleTime(email.scheduledFor, email.timezone)
      : null,
    timeUntilSend: email
      ? getTimeUntilSend(email.scheduledFor)
      : null
  }
}

export default useSendLaterStore
