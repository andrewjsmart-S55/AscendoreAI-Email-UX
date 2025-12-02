/**
 * Snooze Store
 *
 * Manages snoozed emails with:
 * - Snooze scheduling
 * - Smart snooze suggestions
 * - Unsnooze on due time
 * - Persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface SnoozedEmail {
  id: string
  emailId: string
  threadId?: string
  accountId: string
  subject: string
  from: string
  snoozedAt: string
  snoozeUntil: string
  reason?: string
  originalFolder: string
  isRecurring?: boolean
  recurringPattern?: 'daily' | 'weekly' | 'monthly'
}

export interface SnoozePreset {
  id: string
  label: string
  icon: string
  getTime: () => Date
}

// =============================================================================
// Snooze Presets
// =============================================================================

export const SNOOZE_PRESETS: SnoozePreset[] = [
  {
    id: 'later_today',
    label: 'Later Today',
    icon: '☀️',
    getTime: () => {
      const now = new Date()
      now.setHours(now.getHours() + 3)
      return now
    }
  },
  {
    id: 'tonight',
    label: 'Tonight',
    icon: '🌙',
    getTime: () => {
      const date = new Date()
      date.setHours(20, 0, 0, 0)
      if (date <= new Date()) {
        date.setDate(date.getDate() + 1)
      }
      return date
    }
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    icon: '📅',
    getTime: () => {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      date.setHours(9, 0, 0, 0)
      return date
    }
  },
  {
    id: 'this_weekend',
    label: 'This Weekend',
    icon: '🏖️',
    getTime: () => {
      const date = new Date()
      const day = date.getDay()
      const daysUntilSaturday = (6 - day + 7) % 7 || 7
      date.setDate(date.getDate() + daysUntilSaturday)
      date.setHours(10, 0, 0, 0)
      return date
    }
  },
  {
    id: 'next_week',
    label: 'Next Week',
    icon: '📆',
    getTime: () => {
      const date = new Date()
      const day = date.getDay()
      const daysUntilMonday = (8 - day) % 7 || 7
      date.setDate(date.getDate() + daysUntilMonday)
      date.setHours(9, 0, 0, 0)
      return date
    }
  },
  {
    id: 'next_month',
    label: 'Next Month',
    icon: '🗓️',
    getTime: () => {
      const date = new Date()
      date.setMonth(date.getMonth() + 1)
      date.setDate(1)
      date.setHours(9, 0, 0, 0)
      return date
    }
  }
]

// =============================================================================
// Store Interface
// =============================================================================

interface SnoozeState {
  snoozedEmails: SnoozedEmail[]

  // Actions
  snoozeEmail: (email: {
    emailId: string
    threadId?: string
    accountId: string
    subject: string
    from: string
    originalFolder: string
  }, snoozeUntil: Date, reason?: string) => string

  unsnoozeEmail: (id: string) => SnoozedEmail | undefined

  updateSnooze: (id: string, snoozeUntil: Date) => void

  cancelSnooze: (id: string) => void

  getDueEmails: () => SnoozedEmail[]

  getSnoozedByEmail: (emailId: string) => SnoozedEmail | undefined

  getUpcoming: (limit?: number) => SnoozedEmail[]

  clearExpired: () => number
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useSnoozeStore = create<SnoozeState>()(
  persist(
    (set, get) => ({
      snoozedEmails: [],

      snoozeEmail: (email, snoozeUntil, reason) => {
        const id = `snooze_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

        const snoozedEmail: SnoozedEmail = {
          id,
          emailId: email.emailId,
          threadId: email.threadId,
          accountId: email.accountId,
          subject: email.subject,
          from: email.from,
          snoozedAt: new Date().toISOString(),
          snoozeUntil: snoozeUntil.toISOString(),
          reason,
          originalFolder: email.originalFolder
        }

        set(state => ({
          snoozedEmails: [snoozedEmail, ...state.snoozedEmails]
        }))

        return id
      },

      unsnoozeEmail: (id) => {
        const email = get().snoozedEmails.find(e => e.id === id)
        if (email) {
          set(state => ({
            snoozedEmails: state.snoozedEmails.filter(e => e.id !== id)
          }))
        }
        return email
      },

      updateSnooze: (id, snoozeUntil) => {
        set(state => ({
          snoozedEmails: state.snoozedEmails.map(e =>
            e.id === id
              ? { ...e, snoozeUntil: snoozeUntil.toISOString() }
              : e
          )
        }))
      },

      cancelSnooze: (id) => {
        set(state => ({
          snoozedEmails: state.snoozedEmails.filter(e => e.id !== id)
        }))
      },

      getDueEmails: () => {
        const now = new Date()
        return get().snoozedEmails.filter(
          e => new Date(e.snoozeUntil) <= now
        )
      },

      getSnoozedByEmail: (emailId) => {
        return get().snoozedEmails.find(e => e.emailId === emailId)
      },

      getUpcoming: (limit = 10) => {
        const now = new Date()
        return get().snoozedEmails
          .filter(e => new Date(e.snoozeUntil) > now)
          .sort((a, b) =>
            new Date(a.snoozeUntil).getTime() - new Date(b.snoozeUntil).getTime()
          )
          .slice(0, limit)
      },

      clearExpired: () => {
        const due = get().getDueEmails()
        if (due.length > 0) {
          set(state => ({
            snoozedEmails: state.snoozedEmails.filter(
              e => new Date(e.snoozeUntil) > new Date()
            )
          }))
        }
        return due.length
      }
    }),
    {
      name: 'boxzero-snooze',
      version: 1
    }
  )
)

// =============================================================================
// Smart Snooze Suggestions
// =============================================================================

export function getSmartSnoozeSuggestions(email: {
  subject: string
  body?: string
  from: string
}): { preset: SnoozePreset; reason: string }[] {
  const suggestions: { preset: SnoozePreset; reason: string }[] = []
  const subject = email.subject.toLowerCase()
  const body = (email.body || '').toLowerCase()
  const content = subject + ' ' + body

  // Meeting-related - suggest before the meeting
  if (content.includes('meeting') || content.includes('call') || content.includes('zoom')) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'tomorrow')!,
      reason: 'Meeting preparation'
    })
  }

  // Deadline-related - suggest day before
  if (content.includes('deadline') || content.includes('due') || content.includes('by end of')) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'tomorrow')!,
      reason: 'Deadline reminder'
    })
  }

  // Weekend tasks
  if (content.includes('weekend') || content.includes('saturday') || content.includes('sunday')) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'this_weekend')!,
      reason: 'Weekend task'
    })
  }

  // Next week items
  if (content.includes('next week') || content.includes('monday')) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'next_week')!,
      reason: 'Next week follow-up'
    })
  }

  // Newsletter/digest - read later
  if (content.includes('newsletter') || content.includes('digest') || content.includes('weekly')) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'this_weekend')!,
      reason: 'Read when you have time'
    })
  }

  // Default: Later today for quick items
  if (suggestions.length === 0) {
    suggestions.push({
      preset: SNOOZE_PRESETS.find(p => p.id === 'later_today')!,
      reason: 'Review later'
    })
  }

  return suggestions
}

// =============================================================================
// Format Helpers
// =============================================================================

export function formatSnoozeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = d.toDateString() === now.toDateString()
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (isToday) {
    return `Today at ${timeStr}`
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`
  } else {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }
}

export function getRelativeSnoozeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `in ${diffMins} min`
  } else if (diffHours < 24) {
    return `in ${diffHours} hr`
  } else if (diffDays < 7) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}
