/**
 * Email Type Adapters
 *
 * Transforms backend API responses (snake_case) to frontend types (camelCase)
 * and vice versa for requests.
 */

import { Email, EmailThread, EmailFolder, EmailAccount } from '@/types/email'

// Backend types (snake_case)
export interface BackendEmail {
  id: string
  account_id: string
  provider_message_id: string
  thread_id?: string
  subject?: string
  from_address?: string
  from_name?: string
  to_addresses?: string[]
  cc_addresses?: string[]
  bcc_addresses?: string[]
  reply_to?: string
  body_plain?: string
  body_html?: string
  snippet?: string
  is_read: boolean
  is_starred: boolean
  is_important: boolean
  has_attachments: boolean
  attachment_count: number
  folder_id?: string
  labels?: string[]
  category_id?: string
  ai_summary?: string
  ai_priority?: string
  sentiment?: string
  received_at?: string
  sent_at?: string
  created_at: string
  updated_at: string
  account_email?: string
  provider?: string
}

export interface BackendFolder {
  id: string
  account_id: string
  provider_folder_id: string
  name: string
  type: string
  parent_id?: string
  unread_count: number
  total_count: number
  created_at: string
  updated_at: string
}

export interface BackendEmailAccount {
  id: string
  user_id: string
  provider: string
  email_address: string
  display_name?: string
  is_active: boolean
  last_sync?: string
  sync_enabled: boolean
  created_at: string
  updated_at: string
}

// Transform backend email to frontend Email type
export function adaptBackendEmail(backend: BackendEmail): Email {
  // Format "from" field as "Name <email>" or just email
  const from = backend.from_name
    ? `${backend.from_name} <${backend.from_address}>`
    : backend.from_address || ''

  return {
    id: backend.id,
    messageId: backend.provider_message_id,
    threadId: backend.thread_id,
    from,
    to: backend.to_addresses || [],
    cc: backend.cc_addresses || [],
    bcc: backend.bcc_addresses || [],
    subject: backend.subject || '(No Subject)',
    body: backend.body_html || backend.body_plain || '',
    bodyPlain: backend.body_plain,
    attachments: [], // Attachments would need separate fetch
    receivedAt: backend.received_at || backend.created_at,
    sentAt: backend.sent_at,
    isRead: backend.is_read,
    isStarred: backend.is_starred,
    isImportant: backend.is_important,
    isSpam: false, // Determine from labels or folder
    isTrash: false, // Determine from folder
    isDraft: false, // Determine from folder
    labels: backend.labels || [],
    folder: backend.folder_id || 'inbox',
    accountId: backend.account_id
  }
}

// Transform array of backend emails
export function adaptBackendEmails(backendEmails: BackendEmail[]): Email[] {
  return backendEmails.map(adaptBackendEmail)
}

// Transform backend folder to frontend EmailFolder type
export function adaptBackendFolder(backend: BackendFolder): EmailFolder {
  const typeMap: Record<string, EmailFolder['type']> = {
    inbox: 'inbox',
    sent: 'sent',
    drafts: 'drafts',
    trash: 'trash',
    spam: 'spam'
  }

  return {
    id: backend.id,
    name: backend.name,
    type: typeMap[backend.type.toLowerCase()] || 'custom',
    unreadCount: backend.unread_count,
    totalCount: backend.total_count,
    accountId: backend.account_id
  }
}

// Transform array of backend folders
export function adaptBackendFolders(backendFolders: BackendFolder[]): EmailFolder[] {
  return backendFolders.map(adaptBackendFolder)
}

// Transform backend account to frontend EmailAccount type
export function adaptBackendAccount(backend: BackendEmailAccount): EmailAccount {
  const providerMap: Record<string, EmailAccount['provider']> = {
    gmail: 'Gmail',
    outlook: 'Outlook',
    yahoo: 'Yahoo'
  }

  return {
    id: backend.id,
    name: backend.display_name || backend.email_address,
    email: backend.email_address,
    provider: providerMap[backend.provider.toLowerCase()] || 'Other',
    type: 'Personal', // Default, could be enhanced with metadata
    isDefault: false, // Would need to track this in backend
    avatar: undefined,
    signature: undefined
  }
}

// Transform array of backend accounts
export function adaptBackendAccounts(backendAccounts: BackendEmailAccount[]): EmailAccount[] {
  return backendAccounts.map(adaptBackendAccount)
}

// Group emails into threads (frontend EmailThread type)
export function groupEmailsIntoThreads(emails: Email[]): EmailThread[] {
  const threadMap = new Map<string, Email[]>()

  // Group emails by threadId
  for (const email of emails) {
    const threadId = email.threadId || email.id
    if (!threadMap.has(threadId)) {
      threadMap.set(threadId, [])
    }
    threadMap.get(threadId)!.push(email)
  }

  // Transform groups into EmailThread objects
  const threads: EmailThread[] = []

  for (const [threadId, threadEmails] of threadMap) {
    // Sort emails by date (newest first)
    threadEmails.sort((a, b) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )

    const latestEmail = threadEmails[0]
    const participants = [...new Set(threadEmails.flatMap(e => [e.from, ...e.to]))]

    threads.push({
      id: threadId,
      subject: latestEmail.subject,
      participants,
      lastActivity: latestEmail.receivedAt,
      messageCount: threadEmails.length,
      isUnread: threadEmails.some(e => !e.isRead),
      isStarred: threadEmails.some(e => e.isStarred),
      isImportant: threadEmails.some(e => e.isImportant),
      labels: [...new Set(threadEmails.flatMap(e => e.labels))],
      folder: latestEmail.folder,
      accountId: latestEmail.accountId,
      emails: threadEmails
    })
  }

  // Sort threads by lastActivity (newest first)
  threads.sort((a, b) =>
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )

  return threads
}

// Transform frontend email for sending to backend
export function adaptEmailForBackend(email: Partial<Email>): Partial<BackendEmail> {
  return {
    subject: email.subject,
    to_addresses: email.to,
    cc_addresses: email.cc,
    bcc_addresses: email.bcc,
    body_html: email.body,
    body_plain: email.bodyPlain,
    is_read: email.isRead,
    is_starred: email.isStarred,
    is_important: email.isImportant,
    labels: email.labels,
    folder_id: email.folder,
    account_id: email.accountId
  }
}
