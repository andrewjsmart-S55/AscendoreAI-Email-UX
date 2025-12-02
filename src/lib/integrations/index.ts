/**
 * Integrations Index
 *
 * Export all integration services for Calendar, CRM, and Messaging platforms.
 */

// Calendar Integration (Google Calendar, Outlook)
export {
  useCalendarStore,
  useCalendar,
  useCalendarEvents,
  useMeetingRequests,
  useAvailability,
  useEmailCalendarLink,
  detectMeetingRequest,
  extractMeetingDetails,
  parseICSData,
  CALENDAR_OAUTH_CONFIG
} from './calendar-integration'

export type {
  CalendarProvider,
  CalendarAccount,
  CalendarEvent,
  AvailabilitySlot,
  MeetingRequest
} from './calendar-integration'

// CRM Integration (Salesforce, HubSpot, Pipedrive)
export {
  useCRMStore,
  useCRM,
  useCRMContacts,
  useCRMDeals,
  useCRMTasks,
  useEmailCRMLink,
  useCRMSidebar,
  matchEmailToContacts,
  extractCompanyFromEmail,
  CRM_OAUTH_CONFIG
} from './crm-integration'

export type {
  CRMProvider,
  CRMConnection,
  CRMContact,
  CRMDeal,
  CRMTask,
  EmailLogEntry,
  ContactMatch
} from './crm-integration'

// Messaging Integration (Slack, Microsoft Teams)
export {
  useMessagingStore,
  useMessaging,
  useMessagingChannels,
  useShareEmail,
  useMessagingNotifications,
  useEmailFromMessage,
  useSlackIntegration,
  useTeamsIntegration,
  formatEmailForSlack,
  formatEmailForTeams,
  formatNotificationForSlack,
  MESSAGING_OAUTH_CONFIG
} from './messaging-integration'

export type {
  MessagingProvider,
  MessagingConnection,
  MessagingChannel,
  MessagingUser,
  SharedEmail,
  MessagingNotification,
  EmailFromMessage
} from './messaging-integration'
