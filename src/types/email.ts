export interface EmailAccount {
  id: string
  name: string
  email: string
  provider: 'Gmail' | 'Outlook' | 'Yahoo' | 'Other'
  type: 'Work' | 'Personal' | 'Family' | 'School' | 'Community' | 'Other'
  isDefault: boolean
  avatar?: string
  signature?: string
}

export interface EmailAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export interface Email {
  id: string
  messageId: string
  threadId?: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  bodyPlain?: string
  attachments: EmailAttachment[]
  receivedAt: string
  sentAt?: string
  isRead: boolean
  isStarred: boolean
  isImportant: boolean
  isSpam: boolean
  isTrash: boolean
  isDraft: boolean
  labels: string[]
  folder: string
  accountId: string
}

export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  lastActivity: string
  messageCount: number
  isUnread: boolean
  isStarred: boolean
  isImportant: boolean
  labels: string[]
  folder: string
  accountId: string
  emails: Email[]
  aiActions?: AIAction[]
}

export interface EmailFolder {
  id: string
  name: string
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'custom'
  unreadCount: number
  totalCount: number
  accountId: string
}

export interface EmailLabel {
  id: string
  name: string
  color: string
  accountId: string
}

export interface EmailFilter {
  accountId?: string
  folder?: string
  isUnread?: boolean
  isStarred?: boolean
  isImportant?: boolean
  labels?: string[]
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

export interface EmailCompose {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  attachments: EmailAttachment[]
  accountId: string
  replyTo?: string
  inReplyTo?: string
  references?: string[]
}

export interface AIAction {
  id: string
  type: 'deleted' | 'archived' | 'task_created' | 'reminder_set' | 'replied' | 'forwarded'
  description: string
  timestamp: string
  confidence: number // 0-1 confidence score
  requiresApproval: boolean
  isApproved?: boolean
  metadata?: {
    taskTitle?: string
    reminderDate?: string
    recipientCount?: number
    amount?: string
    deadline?: string
    expenseDate?: string
  }
}

export interface InboxStats {
  totalEmails: number
  clearedEmails: number
  remainingEmails: number
  clearancePercentage: number
  accountName: string
}

export type EmailView = 'list' | 'thread' | 'compose'
export type EmailSort = 'date' | 'sender' | 'subject' | 'size'
export type EmailSortDirection = 'asc' | 'desc'
export type InboxMode = 'read' | 'approve'

// Profile and Account Settings Types
export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  displayName: string
  avatar?: string
  phone?: string
  timezone: string
  language: string
  theme: 'light' | 'dark' | 'system'
  dateFormat: string
  timeFormat: '12h' | '24h'
  emailSignature?: string
  notifications: NotificationSettings
  privacy: PrivacySettings
  createdAt: string
  updatedAt: string
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  desktopNotifications: boolean
  soundNotifications: boolean
  notifyOnImportant: boolean
  notifyOnMentions: boolean
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never'
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
  }
}

export interface PrivacySettings {
  showOnlineStatus: boolean
  allowReadReceipts: boolean
  shareAnalytics: boolean
  showInDirectory: boolean
}

export interface AccountSettings {
  id: string
  accountId: string
  syncEnabled: boolean
  syncFrequency: number // minutes
  maxSyncMessages: number
  downloadAttachments: boolean
  autoReply: {
    enabled: boolean
    subject: string
    message: string
    startDate?: string
    endDate?: string
  }
  forwarding: {
    enabled: boolean
    forwardTo: string
    keepCopy: boolean
  }
  filters: EmailFilter[]
  signature: {
    enabled: boolean
    htmlContent: string
    plainContent: string
  }
  security: {
    twoFactorEnabled: boolean
    allowLessSecureApps: boolean
    trustedDevices: string[]
  }
  quotaSettings: {
    storageLimit: number // MB
    currentUsage: number // MB
    attachmentLimit: number // MB per file
  }
  createdAt: string
  updatedAt: string
}

export interface AccountCredentials {
  id: string
  accountType: 'imap' | 'pop3' | 'exchange' | 'gmail' | 'outlook'
  serverSettings: {
    imapServer?: string
    imapPort?: number
    smtpServer?: string
    smtpPort?: number
    useSSL: boolean
    useTLS: boolean
  }
  authentication: {
    username: string
    password?: string // encrypted
    oauth?: {
      accessToken: string
      refreshToken: string
      expiresAt: string
    }
  }
  isActive: boolean
}