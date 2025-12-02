/**
 * Email Snooze Service
 *
 * Defer emails to reappear later:
 * - Configurable snooze durations
 * - Custom date/time selection
 * - Automatic unsnooze at scheduled time
 * - Snooze management and editing
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type SnoozeDuration =
  | 'later_today'
  | 'tomorrow'
  | 'this_weekend'
  | 'next_week'
  | 'next_month'
  | 'custom'

export interface SnoozedEmail {
  id: string
  emailId: string
  threadId: string
  userId: string

  // Snooze details
  snoozedAt: number
  snoozeUntil: number
  duration: SnoozeDuration
  customNote?: string

  // Email snapshot
  subject: string
  from: string
  snippet: string
  isRead: boolean
  isStarred: boolean
  labels: string[]

  // Status
  isActive: boolean
  unsnoozedAt?: number
}

export interface SnoozePreset {
  id: string
  name: string
  duration: SnoozeDuration
  calculateTime: () => Date
}

// =============================================================================
// Snooze Time Calculators
// =============================================================================

export function calculateSnoozeTime(duration: SnoozeDuration, customDate?: Date): Date {
  const now = new Date()

  switch (duration) {
    case 'later_today': {
      // 3 hours from now, or 6 PM if after 3 PM
      const laterToday = new Date(now)
      if (now.getHours() < 15) {
        laterToday.setHours(now.getHours() + 3, 0, 0, 0)
      } else {
        laterToday.setHours(18, 0, 0, 0)
      }
      return laterToday
    }

    case 'tomorrow': {
      // Tomorrow at 8 AM
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)
      return tomorrow
    }

    case 'this_weekend': {
      // Saturday at 9 AM
      const weekend = new Date(now)
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7
      weekend.setDate(weekend.getDate() + daysUntilSaturday)
      weekend.setHours(9, 0, 0, 0)
      return weekend
    }

    case 'next_week': {
      // Monday at 8 AM
      const nextWeek = new Date(now)
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      nextWeek.setDate(nextWeek.getDate() + daysUntilMonday)
      nextWeek.setHours(8, 0, 0, 0)
      return nextWeek
    }

    case 'next_month': {
      // First day of next month at 8 AM
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
      nextMonth.setHours(8, 0, 0, 0)
      return nextMonth
    }

    case 'custom': {
      return customDate || new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }

    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

export function formatSnoozeTime(date: Date): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (isToday) {
    return `Today at ${timeStr}`
  }

  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`
  }

  const dayStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  return `${dayStr} at ${timeStr}`
}

export function getRelativeSnoozeTime(snoozeUntil: number): string {
  const now = Date.now()
  const diff = snoozeUntil - now

  if (diff < 0) return 'Now'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) return `in ${minutes}m`
  if (hours < 24) return `in ${hours}h`
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `in ${days} days`

  return formatSnoozeTime(new Date(snoozeUntil))
}

// =============================================================================
// Default Presets
// =============================================================================

export const SNOOZE_PRESETS: SnoozePreset[] = [
  {
    id: 'later_today',
    name: 'Later today',
    duration: 'later_today',
    calculateTime: () => calculateSnoozeTime('later_today')
  },
  {
    id: 'tomorrow',
    name: 'Tomorrow',
    duration: 'tomorrow',
    calculateTime: () => calculateSnoozeTime('tomorrow')
  },
  {
    id: 'this_weekend',
    name: 'This weekend',
    duration: 'this_weekend',
    calculateTime: () => calculateSnoozeTime('this_weekend')
  },
  {
    id: 'next_week',
    name: 'Next week',
    duration: 'next_week',
    calculateTime: () => calculateSnoozeTime('next_week')
  },
  {
    id: 'next_month',
    name: 'Next month',
    duration: 'next_month',
    calculateTime: () => calculateSnoozeTime('next_month')
  }
]

// =============================================================================
// Snooze Store
// =============================================================================

interface SnoozeStore {
  snoozedEmails: SnoozedEmail[]
  customPresets: SnoozePreset[]

  // Actions
  snoozeEmail: (snooze: Omit<SnoozedEmail, 'id' | 'snoozedAt' | 'isActive'>) => SnoozedEmail
  unsnoozeEmail: (id: string) => void
  updateSnooze: (id: string, updates: Partial<SnoozedEmail>) => void
  deleteSnooze: (id: string) => void

  // Preset management
  addCustomPreset: (preset: Omit<SnoozePreset, 'id'>) => void
  removeCustomPreset: (id: string) => void

  // Auto-unsnooze checker
  checkAndUnsnooze: () => SnoozedEmail[]

  // Queries
  getSnoozedByEmail: (emailId: string) => SnoozedEmail | undefined
  getSnoozedByUser: (userId: string) => SnoozedEmail[]
  getActiveSnoozed: (userId: string) => SnoozedEmail[]
  getUpcomingUnsnooze: (userId: string, hours: number) => SnoozedEmail[]
}

export const useSnoozeStore = create<SnoozeStore>()(
  persist(
    (set, get) => ({
      snoozedEmails: [],
      customPresets: [],

      snoozeEmail: (snoozeData) => {
        const snooze: SnoozedEmail = {
          ...snoozeData,
          id: `snooze_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          snoozedAt: Date.now(),
          isActive: true
        }

        set(state => ({
          snoozedEmails: [...state.snoozedEmails, snooze]
        }))

        return snooze
      },

      unsnoozeEmail: (id) => {
        set(state => ({
          snoozedEmails: state.snoozedEmails.map(s =>
            s.id === id
              ? { ...s, isActive: false, unsnoozedAt: Date.now() }
              : s
          )
        }))
      },

      updateSnooze: (id, updates) => {
        set(state => ({
          snoozedEmails: state.snoozedEmails.map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        }))
      },

      deleteSnooze: (id) => {
        set(state => ({
          snoozedEmails: state.snoozedEmails.filter(s => s.id !== id)
        }))
      },

      addCustomPreset: (presetData) => {
        const preset: SnoozePreset = {
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

      checkAndUnsnooze: () => {
        const now = Date.now()
        const toUnsnooze: SnoozedEmail[] = []

        const { snoozedEmails } = get()
        const updated = snoozedEmails.map(snooze => {
          if (snooze.isActive && snooze.snoozeUntil <= now) {
            toUnsnooze.push(snooze)
            return { ...snooze, isActive: false, unsnoozedAt: now }
          }
          return snooze
        })

        if (toUnsnooze.length > 0) {
          set({ snoozedEmails: updated })
        }

        return toUnsnooze
      },

      getSnoozedByEmail: (emailId) => {
        return get().snoozedEmails.find(s => s.emailId === emailId && s.isActive)
      },

      getSnoozedByUser: (userId) => {
        return get().snoozedEmails.filter(s => s.userId === userId)
      },

      getActiveSnoozed: (userId) => {
        return get().snoozedEmails
          .filter(s => s.userId === userId && s.isActive)
          .sort((a, b) => a.snoozeUntil - b.snoozeUntil)
      },

      getUpcomingUnsnooze: (userId, hours) => {
        const now = Date.now()
        const threshold = now + hours * 60 * 60 * 1000

        return get().snoozedEmails
          .filter(s =>
            s.userId === userId &&
            s.isActive &&
            s.snoozeUntil <= threshold &&
            s.snoozeUntil > now
          )
          .sort((a, b) => a.snoozeUntil - b.snoozeUntil)
      }
    }),
    {
      name: 'boxzero-snooze',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        snoozedEmails: state.snoozedEmails,
        customPresets: state.customPresets
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useEffect, useState } from 'react'

export function useSnooze(userId: string | null) {
  const store = useSnoozeStore()
  const [recentlyUnsnoozed, setRecentlyUnsnoozed] = useState<SnoozedEmail[]>([])

  // Check for emails to unsnooze periodically
  useEffect(() => {
    const checkSnooze = () => {
      const unsnoozed = store.checkAndUnsnooze()
      if (unsnoozed.length > 0) {
        setRecentlyUnsnoozed(prev => [...unsnoozed, ...prev].slice(0, 10))
      }
    }

    // Check immediately and then every minute
    checkSnooze()
    const interval = setInterval(checkSnooze, 60000)

    return () => clearInterval(interval)
  }, [store.checkAndUnsnooze])

  const activeSnoozed = useMemo(
    () => userId ? store.getActiveSnoozed(userId) : [],
    [userId, store.snoozedEmails]
  )

  const upcomingSoon = useMemo(
    () => userId ? store.getUpcomingUnsnooze(userId, 2) : [], // Next 2 hours
    [userId, store.snoozedEmails]
  )

  const snoozeEmail = useCallback((
    email: {
      id: string
      threadId: string
      subject: string
      from: string
      snippet: string
      isRead?: boolean
      isStarred?: boolean
      labels?: string[]
    },
    duration: SnoozeDuration,
    customDate?: Date,
    note?: string
  ) => {
    if (!userId) return null

    const snoozeUntil = calculateSnoozeTime(duration, customDate)

    return store.snoozeEmail({
      emailId: email.id,
      threadId: email.threadId,
      userId,
      snoozeUntil: snoozeUntil.getTime(),
      duration,
      customNote: note,
      subject: email.subject,
      from: email.from,
      snippet: email.snippet,
      isRead: email.isRead ?? false,
      isStarred: email.isStarred ?? false,
      labels: email.labels || []
    })
  }, [userId, store.snoozeEmail])

  const rescheduleSnooze = useCallback((
    snoozeId: string,
    duration: SnoozeDuration,
    customDate?: Date
  ) => {
    const snoozeUntil = calculateSnoozeTime(duration, customDate)
    store.updateSnooze(snoozeId, {
      snoozeUntil: snoozeUntil.getTime(),
      duration
    })
  }, [store.updateSnooze])

  const clearRecentlyUnsnoozed = useCallback((snoozeId?: string) => {
    if (snoozeId) {
      setRecentlyUnsnoozed(prev => prev.filter(s => s.id !== snoozeId))
    } else {
      setRecentlyUnsnoozed([])
    }
  }, [])

  return {
    activeSnoozed,
    upcomingSoon,
    recentlyUnsnoozed,
    presets: [...SNOOZE_PRESETS, ...store.customPresets],

    // Actions
    snoozeEmail,
    unsnoozeEmail: store.unsnoozeEmail,
    rescheduleSnooze,
    deleteSnooze: store.deleteSnooze,
    clearRecentlyUnsnoozed,

    // Helpers
    isEmailSnoozed: (emailId: string) => !!store.getSnoozedByEmail(emailId),
    getSnoozeInfo: (emailId: string) => store.getSnoozedByEmail(emailId)
  }
}

export function useEmailSnoozeStatus(emailId: string | null) {
  const store = useSnoozeStore()

  const snoozeInfo = useMemo(
    () => emailId ? store.getSnoozedByEmail(emailId) : undefined,
    [emailId, store.snoozedEmails]
  )

  return {
    isSnoozed: !!snoozeInfo,
    snoozeUntil: snoozeInfo?.snoozeUntil,
    snoozeUntilFormatted: snoozeInfo
      ? formatSnoozeTime(new Date(snoozeInfo.snoozeUntil))
      : null,
    relativeTime: snoozeInfo
      ? getRelativeSnoozeTime(snoozeInfo.snoozeUntil)
      : null
  }
}

export default useSnoozeStore
