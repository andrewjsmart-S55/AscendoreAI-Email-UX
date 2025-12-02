/**
 * Meeting Detector
 *
 * AI-powered detection of meeting invitations and scheduling requests
 * from email content, with calendar integration support.
 *
 * Features:
 * - Detect meeting invitations
 * - Extract date/time information
 * - Parse attendees and locations
 * - Generate calendar events
 * - Suggest meeting responses
 */

import { Email } from '@/types/email'

// =============================================================================
// Types
// =============================================================================

export interface DetectedMeeting {
  id: string
  emailId: string
  confidence: number
  type: MeetingType
  title: string
  description?: string
  dateTime?: ParsedDateTime
  duration?: number // minutes
  location?: MeetingLocation
  attendees: Attendee[]
  organizer?: Attendee
  isRecurring: boolean
  recurrencePattern?: string
  meetingLink?: string
  calendarLink?: string // ICS or Google Calendar link
  suggestedResponse?: MeetingResponse
  rawText: string
}

export type MeetingType =
  | 'meeting'
  | 'call'
  | 'video_conference'
  | 'interview'
  | 'appointment'
  | 'event'
  | 'webinar'
  | 'deadline'

export interface ParsedDateTime {
  date: string // ISO date
  time?: string // HH:MM format
  timezone?: string
  isAllDay: boolean
  isFlexible: boolean
  alternativeTimes?: string[]
}

export interface MeetingLocation {
  type: 'physical' | 'virtual' | 'phone' | 'unknown'
  address?: string
  roomName?: string
  meetingUrl?: string
  dialIn?: string
}

export interface Attendee {
  email: string
  name?: string
  role: 'required' | 'optional' | 'organizer'
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'pending'
}

export type MeetingResponse = 'accept' | 'decline' | 'tentative' | 'propose_new_time'

// =============================================================================
// Detection Patterns
// =============================================================================

const MEETING_INDICATORS = {
  // Strong indicators
  strong: [
    /(?:you(?:'re| are)? )?invited? to/i,
    /meeting (?:request|invitation)/i,
    /calendar (?:invite|invitation)/i,
    /please (?:join|attend)/i,
    /(?:zoom|teams|meet|webex) (?:meeting|call)/i,
    /interview (?:scheduled|invitation)/i,
    /appointment (?:scheduled|confirmation)/i
  ],
  // Moderate indicators
  moderate: [
    /let(?:'s| us) meet/i,
    /schedule(?:d)? (?:a )?(?:call|meeting)/i,
    /(?:call|meeting|sync) (?:at|on|tomorrow|today)/i,
    /(?:can|could) we (?:meet|talk|discuss)/i,
    /(?:available|free) (?:for|to) (?:a )?(?:call|meeting|chat)/i,
    /(?:set up|arrange|book) (?:a )?(?:time|meeting|call)/i
  ],
  // Weak indicators (need context)
  weak: [
    /(?:discuss|talk about) this/i,
    /(?:touch base|catch up|sync)/i,
    /(?:quick|brief) (?:call|chat)/i
  ]
}

const DATE_PATTERNS = [
  // Specific dates
  /(?:on )?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
  /(?:on )?(\w+) (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})?/gi,
  /(?:on )?(\d{1,2})(?:st|nd|rd|th)? (?:of )?(\w+),? (\d{4})?/gi,
  // Relative dates
  /(?:this|next) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  /tomorrow/gi,
  /today/gi,
  /(?:in )?(\d+) days?/gi
]

const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
  /(\d{1,2})\s*(am|pm)/gi,
  /(\d{1,2})\s*(?:o'clock)/gi,
  /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
  /(\d{1,2})\s*(am|pm)\s*-\s*(\d{1,2})\s*(am|pm)/gi
]

const LOCATION_PATTERNS = {
  zoom: /(?:https?:\/\/)?(?:\w+\.)?zoom\.us\/j\/\d+/gi,
  teams: /(?:https?:\/\/)?teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/gi,
  meet: /(?:https?:\/\/)?meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/gi,
  webex: /(?:https?:\/\/)?(?:\w+\.)?webex\.com\/[^\s]+/gi,
  physical: /(?:at|in|@)\s+(?:\d+\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?/g
}

// =============================================================================
// Meeting Detector Class
// =============================================================================

export class MeetingDetector {
  /**
   * Detect meetings in an email
   */
  async detectMeeting(email: Email): Promise<DetectedMeeting | null> {
    const content = `${email.subject || ''}\n${email.body || ''}`

    // Calculate confidence based on indicators
    let confidence = 0
    let matchedPatterns: string[] = []

    // Check strong indicators
    for (const pattern of MEETING_INDICATORS.strong) {
      if (pattern.test(content)) {
        confidence += 0.3
        matchedPatterns.push(pattern.source)
      }
    }

    // Check moderate indicators
    for (const pattern of MEETING_INDICATORS.moderate) {
      if (pattern.test(content)) {
        confidence += 0.15
        matchedPatterns.push(pattern.source)
      }
    }

    // Check weak indicators
    for (const pattern of MEETING_INDICATORS.weak) {
      if (pattern.test(content)) {
        confidence += 0.05
        matchedPatterns.push(pattern.source)
      }
    }

    // Cap confidence at 1.0
    confidence = Math.min(1, confidence)

    // If confidence is too low, return null
    if (confidence < 0.3) {
      return null
    }

    // Extract meeting details
    const dateTime = this.extractDateTime(content)
    const location = this.extractLocation(content)
    const attendees = this.extractAttendees(email)
    const meetingType = this.determineMeetingType(content, location)

    // Generate meeting title
    const title = this.generateTitle(email, meetingType)

    // Suggest response based on content
    const suggestedResponse = this.suggestResponse(email, confidence)

    return {
      id: `meeting_${email.id}_${Date.now()}`,
      emailId: email.id,
      confidence,
      type: meetingType,
      title,
      description: this.extractDescription(content),
      dateTime,
      duration: this.extractDuration(content),
      location,
      attendees,
      organizer: this.extractOrganizer(email),
      isRecurring: this.detectRecurring(content),
      meetingLink: location?.meetingUrl,
      calendarLink: this.generateCalendarLink(title, dateTime, location),
      suggestedResponse,
      rawText: content.substring(0, 500)
    }
  }

  /**
   * Batch detect meetings from multiple emails
   */
  async detectMeetings(emails: Email[]): Promise<DetectedMeeting[]> {
    const results: DetectedMeeting[] = []

    for (const email of emails) {
      const meeting = await this.detectMeeting(email)
      if (meeting) {
        results.push(meeting)
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Extract date and time from text
   */
  private extractDateTime(text: string): ParsedDateTime | undefined {
    let date: string | undefined
    let time: string | undefined
    let isAllDay = true
    const alternativeTimes: string[] = []

    // Try to find dates
    for (const pattern of DATE_PATTERNS) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        // Parse the first match (simplified)
        const match = matches[0]
        const parsed = this.parseDate(match)
        if (parsed) {
          date = parsed
          break
        }
      }
    }

    // Try to find times
    for (const pattern of TIME_PATTERNS) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        time = this.normalizeTime(matches[0])
        isAllDay = false

        // Look for alternative times
        if (matches.length > 1) {
          matches.slice(1, 4).forEach(m => {
            const normalized = this.normalizeTime(m)
            if (normalized && !alternativeTimes.includes(normalized)) {
              alternativeTimes.push(normalized)
            }
          })
        }
        break
      }
    }

    if (!date && !time) {
      return undefined
    }

    return {
      date: date || new Date().toISOString().split('T')[0],
      time,
      isAllDay,
      isFlexible: alternativeTimes.length > 0 || text.toLowerCase().includes('flexible'),
      alternativeTimes: alternativeTimes.length > 0 ? alternativeTimes : undefined
    }
  }

  /**
   * Parse a date string
   */
  private parseDate(dateStr: string): string | undefined {
    const today = new Date()

    // Handle relative dates
    if (/tomorrow/i.test(dateStr)) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }

    if (/today/i.test(dateStr)) {
      return today.toISOString().split('T')[0]
    }

    // Handle day names
    const dayMatch = dateStr.match(/(?:this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
    if (dayMatch) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase())
      const currentDay = today.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0 || dateStr.toLowerCase().includes('next')) {
        daysUntil += 7
      }
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + daysUntil)
      return targetDate.toISOString().split('T')[0]
    }

    // Try to parse as date
    try {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    } catch {
      // Ignore
    }

    return undefined
  }

  /**
   * Normalize time string to HH:MM format
   */
  private normalizeTime(timeStr: string): string | undefined {
    const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (!match) return undefined

    let hours = parseInt(match[1])
    const minutes = match[2] ? parseInt(match[2]) : 0
    const meridiem = match[3]?.toLowerCase()

    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  /**
   * Extract location information
   */
  private extractLocation(text: string): MeetingLocation | undefined {
    // Check for virtual meeting links
    for (const [platform, pattern] of Object.entries(LOCATION_PATTERNS)) {
      if (platform === 'physical') continue
      const match = text.match(pattern)
      if (match) {
        return {
          type: 'virtual',
          meetingUrl: match[0]
        }
      }
    }

    // Check for physical locations
    const physicalMatch = text.match(LOCATION_PATTERNS.physical)
    if (physicalMatch) {
      return {
        type: 'physical',
        address: physicalMatch[0].replace(/^(?:at|in|@)\s+/i, '')
      }
    }

    // Check for phone/dial-in
    const phoneMatch = text.match(/(?:dial|call)(?:-in)?:?\s*([+\d\s\-()]+)/i)
    if (phoneMatch) {
      return {
        type: 'phone',
        dialIn: phoneMatch[1].trim()
      }
    }

    return undefined
  }

  /**
   * Extract attendees from email
   */
  private extractAttendees(email: Email): Attendee[] {
    const attendees: Attendee[] = []

    // Add recipients
    if (email.to) {
      const toEmails = Array.isArray(email.to) ? email.to : [email.to]
      toEmails.forEach(to => {
        attendees.push({
          email: to,
          role: 'required'
        })
      })
    }

    // Add CC as optional
    if (email.cc) {
      const ccEmails = Array.isArray(email.cc) ? email.cc : [email.cc]
      ccEmails.forEach(cc => {
        attendees.push({
          email: cc,
          role: 'optional'
        })
      })
    }

    return attendees
  }

  /**
   * Extract organizer from email
   */
  private extractOrganizer(email: Email): Attendee | undefined {
    if (email.from) {
      // Extract name from email format like "Name <email@domain.com>" or just use email
      const nameMatch = email.from.match(/^([^<]+)\s*</)
      const name = nameMatch ? nameMatch[1].trim() : email.from.split('@')[0]
      return {
        email: email.from,
        name,
        role: 'organizer'
      }
    }
    return undefined
  }

  /**
   * Determine meeting type
   */
  private determineMeetingType(text: string, location?: MeetingLocation): MeetingType {
    const lowerText = text.toLowerCase()

    if (/interview/i.test(lowerText)) return 'interview'
    if (/webinar/i.test(lowerText)) return 'webinar'
    if (/appointment/i.test(lowerText)) return 'appointment'
    if (/deadline/i.test(lowerText)) return 'deadline'
    if (/event/i.test(lowerText)) return 'event'

    if (location?.type === 'virtual' || /video|zoom|teams|meet/i.test(lowerText)) {
      return 'video_conference'
    }

    if (location?.type === 'phone' || /call|phone/i.test(lowerText)) {
      return 'call'
    }

    return 'meeting'
  }

  /**
   * Generate meeting title
   */
  private generateTitle(email: Email, type: MeetingType): string {
    // Use subject if it looks like a meeting title
    if (email.subject && email.subject.length < 100) {
      const cleaned = email.subject
        .replace(/^(re:|fwd?:|fw:)\s*/gi, '')
        .replace(/\[.*?\]/g, '')
        .trim()

      if (cleaned.length > 5) {
        return cleaned
      }
    }

    // Generate based on type
    const typeLabels: Record<MeetingType, string> = {
      meeting: 'Meeting',
      call: 'Call',
      video_conference: 'Video Conference',
      interview: 'Interview',
      appointment: 'Appointment',
      event: 'Event',
      webinar: 'Webinar',
      deadline: 'Deadline'
    }

    // Extract name from email format like "Name <email@domain.com>" or just use email
    const nameMatch = email.from?.match(/^([^<]+)\s*</)
    const from = nameMatch ? nameMatch[1].trim() : email.from?.split('@')[0] || 'Unknown'
    return `${typeLabels[type]} with ${from}`
  }

  /**
   * Extract description from content
   */
  private extractDescription(text: string): string | undefined {
    // Look for agenda or description sections
    const agendaMatch = text.match(/(?:agenda|description|details|notes):?\s*([\s\S]*?)(?:\n\n|$)/i)
    if (agendaMatch) {
      return agendaMatch[1].trim().substring(0, 500)
    }
    return undefined
  }

  /**
   * Extract meeting duration
   */
  private extractDuration(text: string): number | undefined {
    const durationMatch = text.match(/(\d+)\s*(?:hour|hr)s?(?:\s*(?:and\s*)?(\d+)\s*(?:min|minute)s?)?/i)
    if (durationMatch) {
      const hours = parseInt(durationMatch[1])
      const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0
      return hours * 60 + minutes
    }

    const minMatch = text.match(/(\d+)\s*(?:min|minute)s?/i)
    if (minMatch) {
      return parseInt(minMatch[1])
    }

    // Default durations by type
    return 30
  }

  /**
   * Detect if meeting is recurring
   */
  private detectRecurring(text: string): boolean {
    return /(?:every|weekly|daily|monthly|recurring|repeat)/i.test(text)
  }

  /**
   * Suggest response based on content
   */
  private suggestResponse(email: Email, confidence: number): MeetingResponse {
    const text = `${email.subject || ''} ${email.body || ''}`.toLowerCase()

    // Check for mandatory attendance indicators
    if (/mandatory|required|must attend/i.test(text)) {
      return 'accept'
    }

    // Check for optional indicators
    if (/optional|if available|no pressure/i.test(text)) {
      return 'tentative'
    }

    // High confidence meetings default to accept
    if (confidence > 0.7) {
      return 'accept'
    }

    return 'tentative'
  }

  /**
   * Generate calendar link (Google Calendar)
   */
  private generateCalendarLink(
    title: string,
    dateTime?: ParsedDateTime,
    location?: MeetingLocation
  ): string | undefined {
    if (!dateTime?.date) return undefined

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title
    })

    // Add date/time
    if (dateTime.time && !dateTime.isAllDay) {
      const start = `${dateTime.date.replace(/-/g, '')}T${dateTime.time.replace(':', '')}00`
      params.set('dates', `${start}/${start}`)
    } else {
      const dateFormatted = dateTime.date.replace(/-/g, '')
      params.set('dates', `${dateFormatted}/${dateFormatted}`)
    }

    // Add location
    if (location?.meetingUrl) {
      params.set('location', location.meetingUrl)
    } else if (location?.address) {
      params.set('location', location.address)
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const meetingDetector = new MeetingDetector()

// =============================================================================
// React Hook
// =============================================================================

import { useState, useEffect } from 'react'

export function useMeetingDetection(email: Email | null) {
  const [meeting, setMeeting] = useState<DetectedMeeting | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    if (!email) {
      setMeeting(null)
      return
    }

    let isMounted = true
    setIsDetecting(true)

    meetingDetector.detectMeeting(email).then(result => {
      if (isMounted) {
        setMeeting(result)
        setIsDetecting(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [email?.id])

  return { meeting, isDetecting }
}

export default meetingDetector
