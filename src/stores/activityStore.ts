/**
 * Activity Store - Zustand store for Activity Feed
 *
 * Manages the immutable log of all user and system actions.
 * Supports 30-day undo guarantee and filtering.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ActivityEvent,
  ActivityEventType,
  ActivityFilter,
  ActivityCategory,
  CreateActivityEventInput,
  getActivityCategory,
  getActivityColor,
  getActivityIcon,
  MAX_ACTIVITY_EVENTS,
  ACTIVITY_RETENTION_DAYS
} from '@/types/activity'

// =============================================================================
// Store State Interface
// =============================================================================

interface ActivityState {
  // Data
  events: ActivityEvent[]
  filter: ActivityFilter
  searchQuery: string

  // Actions
  addEvent: (input: CreateActivityEventInput) => ActivityEvent
  addEvents: (inputs: CreateActivityEventInput[]) => ActivityEvent[]
  undoEvent: (eventId: string) => Promise<boolean>
  dismissEvent: (eventId: string) => void
  setFilter: (filter: ActivityFilter) => void
  setSearchQuery: (query: string) => void
  clearFilter: () => void

  // Queries
  getRecentEvents: (limit?: number) => ActivityEvent[]
  getEventsByType: (type: ActivityEventType) => ActivityEvent[]
  getEventsByCategory: (category: ActivityCategory) => ActivityEvent[]
  getUndoableEvents: () => ActivityEvent[]
  getEventById: (id: string) => ActivityEvent | undefined
  searchEvents: (query: string) => ActivityEvent[]

  // Maintenance
  cleanupOldEvents: () => void
  clearAllEvents: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function createActivityEvent(input: CreateActivityEventInput): ActivityEvent {
  const now = new Date().toISOString()
  const undoDeadline = new Date(Date.now() + ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: generateId(),
    type: input.type,
    timestamp: now,
    userId: input.userId,
    description: input.description,
    category: getActivityCategory(input.type),
    icon: getActivityIcon(input.type),
    color: getActivityColor(input.type),
    isUndoable: input.isUndoable ?? isUndoableType(input.type),
    isUndone: false,
    undoDeadline: input.isUndoable ? undoDeadline : undefined,
    undoData: input.undoData,
    emailId: input.emailId,
    emailSubject: input.emailSubject,
    senderEmail: input.senderEmail,
    threadId: input.threadId,
    accountId: input.accountId,
    accountEmail: input.accountEmail,
    predictionId: input.predictionId,
    aiConfidence: input.aiConfidence,
    wasAutoExecuted: input.wasAutoExecuted,
    metadata: input.metadata
  }
}

function isUndoableType(type: ActivityEventType): boolean {
  const undoableTypes: ActivityEventType[] = [
    'email_archived',
    'email_deleted',
    'email_starred',
    'email_unstarred',
    'email_moved',
    'email_labeled',
    'email_snoozed',
    'ai_action_auto_executed'
  ]
  return undoableTypes.includes(type)
}

function matchesFilter(event: ActivityEvent, filter: ActivityFilter): boolean {
  // Type filter
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(event.type)) return false
  }

  // Category filter
  if (filter.category) {
    if (event.category !== filter.category) return false
  }

  // Account filter
  if (filter.accountId) {
    if (event.accountId !== filter.accountId) return false
  }

  // Date range filter
  if (filter.dateRange) {
    const eventDate = new Date(event.timestamp)
    const startDate = new Date(filter.dateRange.start)
    const endDate = new Date(filter.dateRange.end)
    if (eventDate < startDate || eventDate > endDate) return false
  }

  // Undoable only filter
  if (filter.undoableOnly) {
    if (!event.isUndoable || event.isUndone) return false
  }

  // AI only filter
  if (filter.aiOnly) {
    if (event.category !== 'ai') return false
  }

  return true
}

function matchesSearch(event: ActivityEvent, query: string): boolean {
  const lowerQuery = query.toLowerCase()
  return (
    event.description.toLowerCase().includes(lowerQuery) ||
    event.emailSubject?.toLowerCase().includes(lowerQuery) ||
    event.senderEmail?.toLowerCase().includes(lowerQuery) ||
    event.type.toLowerCase().includes(lowerQuery)
  )
}

// =============================================================================
// Zustand Store
// =============================================================================

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      // Initial state
      events: [],
      filter: {},
      searchQuery: '',

      // Add single event
      addEvent: (input) => {
        const event = createActivityEvent(input)

        set((state) => ({
          events: [event, ...state.events].slice(0, MAX_ACTIVITY_EVENTS)
        }))

        return event
      },

      // Add multiple events (batch)
      addEvents: (inputs) => {
        const newEvents = inputs.map(createActivityEvent)

        set((state) => ({
          events: [...newEvents, ...state.events].slice(0, MAX_ACTIVITY_EVENTS)
        }))

        return newEvents
      },

      // Undo an event
      undoEvent: async (eventId) => {
        const state = get()
        const event = state.events.find((e) => e.id === eventId)

        if (!event || !event.isUndoable || event.isUndone) {
          return false
        }

        // Check if within undo deadline
        if (event.undoDeadline && new Date(event.undoDeadline) < new Date()) {
          console.warn(`[Activity] Undo deadline passed for event ${eventId}`)
          return false
        }

        // TODO: Execute the actual undo operation based on event.undoData
        // This would call the appropriate API to reverse the action

        // Mark event as undone
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, isUndone: true } : e
          )
        }))

        // Log the undo action
        get().addEvent({
          type: 'ai_action_rejected', // Using as generic "action reversed"
          userId: event.userId,
          description: `Undid: ${event.description}`,
          emailId: event.emailId,
          emailSubject: event.emailSubject,
          accountId: event.accountId,
          metadata: { undoneEventId: eventId }
        })

        return true
      },

      // Dismiss an event (hide from feed)
      dismissEvent: (eventId) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId)
        }))
      },

      // Set filter
      setFilter: (filter) => {
        set({ filter })
      },

      // Set search query
      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      // Clear all filters
      clearFilter: () => {
        set({ filter: {}, searchQuery: '' })
      },

      // Get recent events (respects current filter)
      getRecentEvents: (limit = 50) => {
        const state = get()
        let filtered = state.events

        // Apply filter
        if (Object.keys(state.filter).length > 0) {
          filtered = filtered.filter((e) => matchesFilter(e, state.filter))
        }

        // Apply search
        if (state.searchQuery) {
          filtered = filtered.filter((e) => matchesSearch(e, state.searchQuery))
        }

        return filtered.slice(0, limit)
      },

      // Get events by type
      getEventsByType: (type) => {
        return get().events.filter((e) => e.type === type)
      },

      // Get events by category
      getEventsByCategory: (category) => {
        return get().events.filter((e) => e.category === category)
      },

      // Get undoable events
      getUndoableEvents: () => {
        const now = new Date()
        return get().events.filter(
          (e) =>
            e.isUndoable &&
            !e.isUndone &&
            (!e.undoDeadline || new Date(e.undoDeadline) > now)
        )
      },

      // Get event by ID
      getEventById: (id) => {
        return get().events.find((e) => e.id === id)
      },

      // Search events
      searchEvents: (query) => {
        if (!query) return get().events
        return get().events.filter((e) => matchesSearch(e, query))
      },

      // Cleanup old events (beyond retention period)
      cleanupOldEvents: () => {
        const cutoffDate = new Date(
          Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000
        )

        set((state) => ({
          events: state.events.filter(
            (e) => new Date(e.timestamp) > cutoffDate
          )
        }))
      },

      // Clear all events (for testing/reset)
      clearAllEvents: () => {
        set({ events: [] })
      }
    }),
    {
      name: 'boxzero-activity',
      version: 1,
      // Only persist essential fields
      partialize: (state) => ({
        events: state.events
      })
    }
  )
)

// =============================================================================
// Selectors (for use with React)
// =============================================================================

export const selectRecentEvents = (limit = 20) => (state: ActivityState) =>
  state.getRecentEvents(limit)

export const selectEventsByCategory = (category: ActivityCategory) => (state: ActivityState) =>
  state.getEventsByCategory(category)

export const selectUndoableEvents = (state: ActivityState) =>
  state.getUndoableEvents()

export const selectTodayStats = (state: ActivityState) => {
  const today = new Date().toISOString().split('T')[0]
  const todayEvents = state.events.filter(
    (e) => e.timestamp.startsWith(today)
  )

  return {
    total: todayEvents.length,
    emailActions: todayEvents.filter((e) => e.category === 'email').length,
    aiActions: todayEvents.filter((e) => e.category === 'ai').length,
    undoCount: todayEvents.filter((e) => e.isUndone).length
  }
}

// =============================================================================
// Activity Logging Utilities
// =============================================================================

/**
 * Log an email action
 */
export function logEmailAction(
  type: 'read' | 'archived' | 'deleted' | 'starred' | 'unstarred' | 'replied' | 'forwarded' | 'moved' | 'labeled' | 'snoozed' | 'unsubscribed',
  userId: string,
  email: { id: string; subject: string; from: string },
  accountId: string,
  metadata?: Record<string, unknown>
) {
  const actionDescriptions: Record<string, string> = {
    read: `Marked "${email.subject}" as read`,
    archived: `Archived "${email.subject}"`,
    deleted: `Deleted "${email.subject}"`,
    starred: `Starred "${email.subject}"`,
    unstarred: `Removed star from "${email.subject}"`,
    replied: `Replied to "${email.subject}"`,
    forwarded: `Forwarded "${email.subject}"`,
    moved: `Moved "${email.subject}"`,
    labeled: `Added label to "${email.subject}"`,
    snoozed: `Snoozed "${email.subject}"`,
    unsubscribed: `Unsubscribed from ${email.from}`
  }

  return useActivityStore.getState().addEvent({
    type: `email_${type}` as ActivityEventType,
    userId,
    description: actionDescriptions[type],
    emailId: email.id,
    emailSubject: email.subject,
    senderEmail: email.from,
    accountId,
    metadata
  })
}

/**
 * Log an AI action
 */
export function logAIAction(
  type: 'suggested' | 'approved' | 'rejected' | 'modified' | 'auto_executed',
  userId: string,
  description: string,
  prediction: {
    id: string
    emailId: string
    emailSubject: string
    confidence: number
  },
  accountId: string
) {
  return useActivityStore.getState().addEvent({
    type: `ai_action_${type}` as ActivityEventType,
    userId,
    description,
    emailId: prediction.emailId,
    emailSubject: prediction.emailSubject,
    predictionId: prediction.id,
    aiConfidence: prediction.confidence,
    wasAutoExecuted: type === 'auto_executed',
    accountId
  })
}

/**
 * Log a gamification event
 */
export function logGamificationEvent(
  type: 'inbox_zero_achieved' | 'streak_updated' | 'streak_broken' | 'achievement_unlocked' | 'milestone_reached',
  userId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  return useActivityStore.getState().addEvent({
    type,
    userId,
    description,
    metadata
  })
}
