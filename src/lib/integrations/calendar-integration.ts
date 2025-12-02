/**
 * Calendar Integration Service
 *
 * Integrate with Google Calendar and Outlook to:
 * - Display calendar events alongside emails
 * - Create events from emails
 * - Detect meeting requests
 * - Show availability for scheduling
 * - Link emails to calendar events
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type CalendarProvider = 'google' | 'outlook' | 'apple'

export interface CalendarAccount {
  id: string
  provider: CalendarProvider
  email: string
  name: string
  color: string
  isConnected: boolean
  isPrimary: boolean
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: number
  lastSynced?: number
}

export interface CalendarEvent {
  id: string
  calendarId: string
  provider: CalendarProvider

  // Event details
  title: string
  description?: string
  location?: string
  isAllDay: boolean

  // Time
  start: number
  end: number
  timezone: string

  // Recurrence
  isRecurring: boolean
  recurrenceRule?: string
  recurrenceId?: string

  // Attendees
  organizer?: {
    email: string
    name?: string
    self?: boolean
  }
  attendees: {
    email: string
    name?: string
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction'
    self?: boolean
  }[]

  // Status
  status: 'confirmed' | 'tentative' | 'cancelled'
  visibility: 'public' | 'private' | 'confidential'
  isBusy: boolean

  // Links
  meetingLink?: string
  htmlLink?: string

  // Email association
  linkedEmailIds: string[]
  linkedThreadIds: string[]

  // Metadata
  createdAt: number
  updatedAt: number
  etag?: string
}

export interface AvailabilitySlot {
  start: number
  end: number
  isBusy: boolean
  events?: CalendarEvent[]
}

export interface MeetingRequest {
  id: string
  emailId: string
  threadId: string
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
  event: Partial<CalendarEvent>
  icsData?: string
  detectedAt: number
}

// =============================================================================
// OAuth Configuration
// =============================================================================

export const CALENDAR_OAUTH_CONFIG = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'Calendars.Read',
      'Calendars.ReadWrite'
    ]
  }
}

// =============================================================================
// Meeting Detection
// =============================================================================

const MEETING_PATTERNS = [
  /let'?s (meet|schedule|chat|talk|connect|sync)/i,
  /can we (meet|schedule|chat|talk|connect|sync)/i,
  /would you be (available|free) (for|to)/i,
  /how about (meeting|a call|a meeting)/i,
  /schedule a (call|meeting|chat|sync)/i,
  /set up a (meeting|call|time)/i,
  /(meeting|call) (at|on|for) (\d{1,2}(:\d{2})?(\s?(am|pm))?)/i,
  /calendar invite/i,
  /block some time/i,
  /find a time/i
]

const TIME_PATTERNS = [
  /(\d{1,2}:\d{2})\s?(am|pm)?/gi,
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  /(tomorrow|next week|this week)/gi,
  /(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/gi
]

export function detectMeetingRequest(emailContent: string): boolean {
  return MEETING_PATTERNS.some(pattern => pattern.test(emailContent))
}

export function extractMeetingDetails(emailContent: string): {
  hasMeetingRequest: boolean
  suggestedTimes: string[]
  duration?: number
} {
  const hasMeetingRequest = detectMeetingRequest(emailContent)
  const suggestedTimes: string[] = []

  if (hasMeetingRequest) {
    for (const pattern of TIME_PATTERNS) {
      const matches = emailContent.match(pattern)
      if (matches) {
        suggestedTimes.push(...matches)
      }
    }
  }

  return {
    hasMeetingRequest,
    suggestedTimes: [...new Set(suggestedTimes)],
    duration: undefined // Would need NLP for duration extraction
  }
}

// =============================================================================
// ICS Parsing
// =============================================================================

export function parseICSData(icsContent: string): Partial<CalendarEvent> | null {
  try {
    const lines = icsContent.split(/\r?\n/)
    const event: Partial<CalendarEvent> = {
      attendees: []
    }

    let currentKey = ''
    let currentValue = ''

    for (const line of lines) {
      // Handle line continuations
      if (line.startsWith(' ') || line.startsWith('\t')) {
        currentValue += line.substring(1)
        continue
      }

      // Process previous key-value pair
      if (currentKey && currentValue) {
        processICSField(event, currentKey, currentValue)
      }

      // Parse new key-value
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        currentKey = line.substring(0, colonIndex)
        currentValue = line.substring(colonIndex + 1)
      }
    }

    // Process last field
    if (currentKey && currentValue) {
      processICSField(event, currentKey, currentValue)
    }

    return event
  } catch (error) {
    console.error('Failed to parse ICS data:', error)
    return null
  }
}

function processICSField(event: Partial<CalendarEvent>, key: string, value: string): void {
  // Handle property parameters (e.g., DTSTART;TZID=America/New_York:20231225T100000)
  const [baseKey, ...params] = key.split(';')

  switch (baseKey) {
    case 'SUMMARY':
      event.title = value
      break
    case 'DESCRIPTION':
      event.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',')
      break
    case 'LOCATION':
      event.location = value
      break
    case 'DTSTART':
      event.start = parseICSDateTime(value, params)
      event.isAllDay = !value.includes('T')
      break
    case 'DTEND':
      event.end = parseICSDateTime(value, params)
      break
    case 'UID':
      event.id = value
      break
    case 'ORGANIZER':
      const orgEmail = value.replace('mailto:', '')
      event.organizer = { email: orgEmail }
      break
    case 'ATTENDEE':
      const attendeeEmail = value.replace('mailto:', '')
      event.attendees?.push({
        email: attendeeEmail,
        status: 'needsAction'
      })
      break
    case 'RRULE':
      event.isRecurring = true
      event.recurrenceRule = value
      break
    case 'STATUS':
      event.status = value.toLowerCase() as CalendarEvent['status']
      break
  }
}

function parseICSDateTime(value: string, params: string[]): number {
  // Extract timezone if present
  const tzParam = params.find(p => p.startsWith('TZID='))
  const timezone = tzParam ? tzParam.split('=')[1] : 'UTC'

  // Remove 'Z' suffix if present (indicates UTC)
  const cleanValue = value.replace('Z', '')

  // Parse YYYYMMDDTHHMMSS or YYYYMMDD format
  let year, month, day, hour = 0, minute = 0, second = 0

  if (cleanValue.length === 8) {
    // All-day event: YYYYMMDD
    year = parseInt(cleanValue.substring(0, 4))
    month = parseInt(cleanValue.substring(4, 6)) - 1
    day = parseInt(cleanValue.substring(6, 8))
  } else if (cleanValue.length >= 15) {
    // Date-time: YYYYMMDDTHHMMSS
    year = parseInt(cleanValue.substring(0, 4))
    month = parseInt(cleanValue.substring(4, 6)) - 1
    day = parseInt(cleanValue.substring(6, 8))
    hour = parseInt(cleanValue.substring(9, 11))
    minute = parseInt(cleanValue.substring(11, 13))
    second = parseInt(cleanValue.substring(13, 15))
  } else {
    return Date.now()
  }

  return new Date(year, month, day, hour, minute, second).getTime()
}

// =============================================================================
// Calendar Store
// =============================================================================

interface CalendarStore {
  accounts: CalendarAccount[]
  events: CalendarEvent[]
  meetingRequests: MeetingRequest[]
  syncStatus: 'idle' | 'syncing' | 'error'
  lastError?: string

  // Account management
  addAccount: (account: Omit<CalendarAccount, 'id'>) => CalendarAccount
  updateAccount: (id: string, updates: Partial<CalendarAccount>) => void
  removeAccount: (id: string) => void
  setPrimaryAccount: (id: string) => void

  // Event management
  addEvents: (events: CalendarEvent[]) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  removeEvent: (id: string) => void
  linkEmailToEvent: (eventId: string, emailId: string, threadId?: string) => void
  unlinkEmailFromEvent: (eventId: string, emailId: string) => void

  // Meeting requests
  addMeetingRequest: (request: Omit<MeetingRequest, 'id' | 'detectedAt'>) => MeetingRequest
  updateMeetingRequest: (id: string, status: MeetingRequest['status']) => void
  removeMeetingRequest: (id: string) => void

  // Sync
  setSyncStatus: (status: 'idle' | 'syncing' | 'error', error?: string) => void

  // Queries
  getAccountById: (id: string) => CalendarAccount | undefined
  getPrimaryAccount: () => CalendarAccount | undefined
  getEventById: (id: string) => CalendarEvent | undefined
  getEventsForDateRange: (start: number, end: number) => CalendarEvent[]
  getEventsForDay: (date: Date) => CalendarEvent[]
  getUpcomingEvents: (hours: number) => CalendarEvent[]
  getLinkedEvents: (emailId: string) => CalendarEvent[]
  getPendingMeetingRequests: () => MeetingRequest[]
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      events: [],
      meetingRequests: [],
      syncStatus: 'idle',

      addAccount: (accountData) => {
        const account: CalendarAccount = {
          ...accountData,
          id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        set(state => ({
          accounts: [...state.accounts, account]
        }))

        return account
      },

      updateAccount: (id, updates) => {
        set(state => ({
          accounts: state.accounts.map(a =>
            a.id === id ? { ...a, ...updates } : a
          )
        }))
      },

      removeAccount: (id) => {
        set(state => ({
          accounts: state.accounts.filter(a => a.id !== id),
          events: state.events.filter(e => e.calendarId !== id)
        }))
      },

      setPrimaryAccount: (id) => {
        set(state => ({
          accounts: state.accounts.map(a => ({
            ...a,
            isPrimary: a.id === id
          }))
        }))
      },

      addEvents: (newEvents) => {
        set(state => {
          const existingIds = new Set(state.events.map(e => e.id))
          const uniqueEvents = newEvents.filter(e => !existingIds.has(e.id))
          return { events: [...state.events, ...uniqueEvents] }
        })
      },

      updateEvent: (id, updates) => {
        set(state => ({
          events: state.events.map(e =>
            e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
          )
        }))
      },

      removeEvent: (id) => {
        set(state => ({
          events: state.events.filter(e => e.id !== id)
        }))
      },

      linkEmailToEvent: (eventId, emailId, threadId) => {
        set(state => ({
          events: state.events.map(e => {
            if (e.id !== eventId) return e
            return {
              ...e,
              linkedEmailIds: [...new Set([...e.linkedEmailIds, emailId])],
              linkedThreadIds: threadId
                ? [...new Set([...e.linkedThreadIds, threadId])]
                : e.linkedThreadIds
            }
          })
        }))
      },

      unlinkEmailFromEvent: (eventId, emailId) => {
        set(state => ({
          events: state.events.map(e => {
            if (e.id !== eventId) return e
            return {
              ...e,
              linkedEmailIds: e.linkedEmailIds.filter(id => id !== emailId)
            }
          })
        }))
      },

      addMeetingRequest: (requestData) => {
        const request: MeetingRequest = {
          ...requestData,
          id: `mtgreq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          detectedAt: Date.now()
        }

        set(state => ({
          meetingRequests: [...state.meetingRequests, request]
        }))

        return request
      },

      updateMeetingRequest: (id, status) => {
        set(state => ({
          meetingRequests: state.meetingRequests.map(r =>
            r.id === id ? { ...r, status } : r
          )
        }))
      },

      removeMeetingRequest: (id) => {
        set(state => ({
          meetingRequests: state.meetingRequests.filter(r => r.id !== id)
        }))
      },

      setSyncStatus: (syncStatus, lastError) => {
        set({ syncStatus, lastError })
      },

      getAccountById: (id) => get().accounts.find(a => a.id === id),

      getPrimaryAccount: () => get().accounts.find(a => a.isPrimary),

      getEventById: (id) => get().events.find(e => e.id === id),

      getEventsForDateRange: (start, end) => {
        return get().events
          .filter(e => e.start <= end && e.end >= start && e.status !== 'cancelled')
          .sort((a, b) => a.start - b.start)
      },

      getEventsForDay: (date) => {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        return get().getEventsForDateRange(start.getTime(), end.getTime())
      },

      getUpcomingEvents: (hours) => {
        const now = Date.now()
        const end = now + hours * 60 * 60 * 1000

        return get().events
          .filter(e => e.start >= now && e.start <= end && e.status !== 'cancelled')
          .sort((a, b) => a.start - b.start)
      },

      getLinkedEvents: (emailId) => {
        return get().events.filter(e => e.linkedEmailIds.includes(emailId))
      },

      getPendingMeetingRequests: () => {
        return get().meetingRequests.filter(r => r.status === 'pending')
      }
    }),
    {
      name: 'boxzero-calendar',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts.map(a => ({
          ...a,
          accessToken: undefined,
          refreshToken: undefined
        })),
        events: state.events.slice(-500), // Keep last 500 events
        meetingRequests: state.meetingRequests.filter(r => r.status === 'pending')
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useEffect, useState } from 'react'

export function useCalendar() {
  const store = useCalendarStore()

  const connectedAccounts = useMemo(
    () => store.accounts.filter(a => a.isConnected),
    [store.accounts]
  )

  const primaryAccount = useMemo(
    () => store.getPrimaryAccount(),
    [store.accounts]
  )

  const connectAccount = useCallback(async (provider: CalendarProvider) => {
    // In a real implementation, this would initiate OAuth flow
    const config = CALENDAR_OAUTH_CONFIG[provider as 'google' | 'outlook']
    if (!config) {
      console.error('Unsupported calendar provider:', provider)
      return null
    }

    // This would redirect to OAuth URL in production
    console.log('Would initiate OAuth for:', provider, config.authUrl)

    // For demo, create a mock account
    return store.addAccount({
      provider,
      email: `demo@${provider}.com`,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar`,
      color: provider === 'google' ? '#4285F4' : '#0078D4',
      isConnected: false,
      isPrimary: store.accounts.length === 0
    })
  }, [store.addAccount, store.accounts.length])

  const disconnectAccount = useCallback((accountId: string) => {
    store.removeAccount(accountId)
  }, [store.removeAccount])

  return {
    accounts: store.accounts,
    connectedAccounts,
    primaryAccount,
    syncStatus: store.syncStatus,
    lastError: store.lastError,

    // Actions
    connectAccount,
    disconnectAccount,
    setPrimaryAccount: store.setPrimaryAccount,
    updateAccount: store.updateAccount
  }
}

export function useCalendarEvents(dateRange?: { start: Date; end: Date }) {
  const store = useCalendarStore()

  const events = useMemo(() => {
    if (!dateRange) {
      // Default to current week
      const start = new Date()
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)

      const end = new Date(start)
      end.setDate(end.getDate() + 7)

      return store.getEventsForDateRange(start.getTime(), end.getTime())
    }

    return store.getEventsForDateRange(dateRange.start.getTime(), dateRange.end.getTime())
  }, [dateRange, store.events])

  const upcomingEvents = useMemo(
    () => store.getUpcomingEvents(24), // Next 24 hours
    [store.events]
  )

  const todayEvents = useMemo(
    () => store.getEventsForDay(new Date()),
    [store.events]
  )

  return {
    events,
    upcomingEvents,
    todayEvents,

    // Actions
    updateEvent: store.updateEvent,
    removeEvent: store.removeEvent,
    linkEmailToEvent: store.linkEmailToEvent,
    unlinkEmailFromEvent: store.unlinkEmailFromEvent
  }
}

export function useMeetingRequests() {
  const store = useCalendarStore()

  const pendingRequests = useMemo(
    () => store.getPendingMeetingRequests(),
    [store.meetingRequests]
  )

  const processEmail = useCallback((
    emailId: string,
    threadId: string,
    content: string,
    attachments?: { filename: string; content: string }[]
  ) => {
    // Check for ICS attachments
    const icsAttachment = attachments?.find(a =>
      a.filename.endsWith('.ics') || a.filename.endsWith('.ical')
    )

    if (icsAttachment) {
      const event = parseICSData(icsAttachment.content)
      if (event) {
        return store.addMeetingRequest({
          emailId,
          threadId,
          status: 'pending',
          event,
          icsData: icsAttachment.content
        })
      }
    }

    // Check for meeting request in email content
    const meetingDetails = extractMeetingDetails(content)
    if (meetingDetails.hasMeetingRequest) {
      return store.addMeetingRequest({
        emailId,
        threadId,
        status: 'pending',
        event: {
          title: 'Meeting request',
          description: `Suggested times: ${meetingDetails.suggestedTimes.join(', ')}`
        }
      })
    }

    return null
  }, [store.addMeetingRequest])

  return {
    pendingRequests,
    allRequests: store.meetingRequests,

    // Actions
    processEmail,
    acceptRequest: (id: string) => store.updateMeetingRequest(id, 'accepted'),
    declineRequest: (id: string) => store.updateMeetingRequest(id, 'declined'),
    tentativeRequest: (id: string) => store.updateMeetingRequest(id, 'tentative'),
    removeRequest: store.removeMeetingRequest
  }
}

export function useAvailability(date: Date, durationMinutes: number = 30) {
  const store = useCalendarStore()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])

  useEffect(() => {
    const events = store.getEventsForDay(date)

    // Generate availability slots for business hours (9 AM - 6 PM)
    const generatedSlots: AvailabilitySlot[] = []
    const dayStart = new Date(date)
    dayStart.setHours(9, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(18, 0, 0, 0)

    let currentTime = dayStart.getTime()
    const slotDuration = durationMinutes * 60 * 1000

    while (currentTime + slotDuration <= dayEnd.getTime()) {
      const slotEnd = currentTime + slotDuration

      // Check if slot overlaps with any events
      const overlappingEvents = events.filter(e =>
        e.start < slotEnd && e.end > currentTime && e.isBusy
      )

      generatedSlots.push({
        start: currentTime,
        end: slotEnd,
        isBusy: overlappingEvents.length > 0,
        events: overlappingEvents.length > 0 ? overlappingEvents : undefined
      })

      currentTime += slotDuration
    }

    setSlots(generatedSlots)
  }, [date, durationMinutes, store.events])

  const freeSlots = useMemo(
    () => slots.filter(s => !s.isBusy),
    [slots]
  )

  const busySlots = useMemo(
    () => slots.filter(s => s.isBusy),
    [slots]
  )

  return {
    slots,
    freeSlots,
    busySlots,
    hasAvailability: freeSlots.length > 0
  }
}

export function useEmailCalendarLink(emailId: string | null) {
  const store = useCalendarStore()

  const linkedEvents = useMemo(
    () => emailId ? store.getLinkedEvents(emailId) : [],
    [emailId, store.events]
  )

  const linkToEvent = useCallback((eventId: string, threadId?: string) => {
    if (!emailId) return
    store.linkEmailToEvent(eventId, emailId, threadId)
  }, [emailId, store.linkEmailToEvent])

  const unlinkFromEvent = useCallback((eventId: string) => {
    if (!emailId) return
    store.unlinkEmailFromEvent(eventId, emailId)
  }, [emailId, store.unlinkEmailFromEvent])

  return {
    linkedEvents,
    hasLinkedEvents: linkedEvents.length > 0,
    linkToEvent,
    unlinkFromEvent
  }
}

export default useCalendarStore
