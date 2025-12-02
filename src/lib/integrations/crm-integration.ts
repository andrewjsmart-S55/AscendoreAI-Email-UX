/**
 * CRM Integration Service
 *
 * Integrate with Salesforce, HubSpot, and other CRMs to:
 * - Link emails to contacts and deals
 * - View contact information alongside emails
 * - Log email interactions automatically
 * - Create tasks and follow-ups
 * - Sync contact data bidirectionally
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type CRMProvider = 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom'

export interface CRMConnection {
  id: string
  provider: CRMProvider
  name: string
  instanceUrl?: string
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: number
  lastSynced?: number
  settings: {
    autoLogEmails: boolean
    createContactsFromEmails: boolean
    syncInterval: number // minutes
    syncDirection: 'bidirectional' | 'crm_to_email' | 'email_to_crm'
  }
}

export interface CRMContact {
  id: string
  crmId: string
  connectionId: string
  provider: CRMProvider

  // Contact info
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string

  // Company
  companyId?: string
  companyName?: string
  companyWebsite?: string

  // Social
  linkedInUrl?: string
  twitterHandle?: string

  // CRM-specific
  ownerId?: string
  ownerName?: string
  leadSource?: string
  leadStatus?: string
  lifecycleStage?: string

  // Engagement
  lastEmailDate?: number
  emailCount: number
  lastActivityDate?: number

  // Metadata
  createdAt: number
  updatedAt: number
  lastSyncedAt?: number
}

export interface CRMDeal {
  id: string
  crmId: string
  connectionId: string
  provider: CRMProvider

  // Deal info
  name: string
  amount?: number
  currency?: string
  stage: string
  probability?: number
  closeDate?: number

  // Associations
  contactIds: string[]
  companyId?: string
  companyName?: string
  ownerId?: string
  ownerName?: string

  // Status
  isClosed: boolean
  isWon: boolean

  // Linked emails
  linkedEmailIds: string[]
  linkedThreadIds: string[]

  // Metadata
  createdAt: number
  updatedAt: number
  lastSyncedAt?: number
}

export interface CRMTask {
  id: string
  crmId: string
  connectionId: string
  provider: CRMProvider

  // Task info
  subject: string
  description?: string
  dueDate?: number
  priority: 'low' | 'normal' | 'high'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  type: 'call' | 'email' | 'meeting' | 'todo'

  // Associations
  contactId?: string
  dealId?: string
  emailId?: string

  // Metadata
  createdAt: number
  updatedAt: number
  completedAt?: number
}

export interface EmailLogEntry {
  id: string
  emailId: string
  threadId: string
  connectionId: string
  crmActivityId?: string

  // Log details
  subject: string
  body: string
  direction: 'inbound' | 'outbound'
  sentAt: number

  // Associations
  contactIds: string[]
  dealIds: string[]

  // Status
  isLogged: boolean
  loggedAt?: number
  error?: string
}

export interface ContactMatch {
  contact: CRMContact
  matchConfidence: number
  matchReason: 'exact_email' | 'domain_match' | 'name_match'
}

// =============================================================================
// OAuth Configuration
// =============================================================================

export const CRM_OAUTH_CONFIG = {
  salesforce: {
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token', 'offline_access']
  },
  hubspot: {
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['contacts', 'crm.objects.deals.read', 'crm.objects.deals.write']
  },
  pipedrive: {
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['base']
  }
}

// =============================================================================
// Contact Matching
// =============================================================================

export function matchEmailToContacts(
  email: string,
  contacts: CRMContact[]
): ContactMatch[] {
  const matches: ContactMatch[] = []
  const emailLower = email.toLowerCase()
  const domain = emailLower.split('@')[1]

  for (const contact of contacts) {
    const contactEmailLower = contact.email.toLowerCase()

    // Exact email match
    if (contactEmailLower === emailLower) {
      matches.push({
        contact,
        matchConfidence: 100,
        matchReason: 'exact_email'
      })
      continue
    }

    // Domain match (same company)
    const contactDomain = contactEmailLower.split('@')[1]
    if (contactDomain === domain && !isCommonDomain(domain)) {
      matches.push({
        contact,
        matchConfidence: 60,
        matchReason: 'domain_match'
      })
    }
  }

  return matches.sort((a, b) => b.matchConfidence - a.matchConfidence)
}

function isCommonDomain(domain: string): boolean {
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
  ]
  return commonDomains.includes(domain)
}

export function extractCompanyFromEmail(email: string): string | null {
  const domain = email.split('@')[1]
  if (!domain || isCommonDomain(domain)) return null

  // Extract company name from domain
  const parts = domain.split('.')
  if (parts.length < 2) return null

  // Remove common TLDs and format
  const companyPart = parts[0]
  return companyPart.charAt(0).toUpperCase() + companyPart.slice(1)
}

// =============================================================================
// CRM Store
// =============================================================================

interface CRMStore {
  connections: CRMConnection[]
  contacts: CRMContact[]
  deals: CRMDeal[]
  tasks: CRMTask[]
  emailLogs: EmailLogEntry[]
  syncStatus: 'idle' | 'syncing' | 'error'
  lastError?: string

  // Connection management
  addConnection: (connection: Omit<CRMConnection, 'id'>) => CRMConnection
  updateConnection: (id: string, updates: Partial<CRMConnection>) => void
  removeConnection: (id: string) => void

  // Contact management
  addContacts: (contacts: CRMContact[]) => void
  updateContact: (id: string, updates: Partial<CRMContact>) => void
  removeContact: (id: string) => void

  // Deal management
  addDeals: (deals: CRMDeal[]) => void
  updateDeal: (id: string, updates: Partial<CRMDeal>) => void
  linkEmailToDeal: (dealId: string, emailId: string, threadId?: string) => void
  unlinkEmailFromDeal: (dealId: string, emailId: string) => void

  // Task management
  addTask: (task: Omit<CRMTask, 'id' | 'createdAt' | 'updatedAt'>) => CRMTask
  updateTask: (id: string, updates: Partial<CRMTask>) => void
  completeTask: (id: string) => void
  removeTask: (id: string) => void

  // Email logging
  logEmail: (entry: Omit<EmailLogEntry, 'id' | 'isLogged' | 'loggedAt'>) => EmailLogEntry
  markEmailLogged: (id: string, crmActivityId: string) => void
  markEmailLogFailed: (id: string, error: string) => void

  // Sync
  setSyncStatus: (status: 'idle' | 'syncing' | 'error', error?: string) => void

  // Queries
  getConnectionById: (id: string) => CRMConnection | undefined
  getContactByEmail: (email: string) => CRMContact | undefined
  getContactById: (id: string) => CRMContact | undefined
  getContactsByCompany: (companyId: string) => CRMContact[]
  getDealById: (id: string) => CRMDeal | undefined
  getOpenDeals: () => CRMDeal[]
  getDealsForContact: (contactId: string) => CRMDeal[]
  getTasksForContact: (contactId: string) => CRMTask[]
  getOpenTasks: () => CRMTask[]
  getEmailLog: (emailId: string) => EmailLogEntry | undefined
  getUnloggedEmails: () => EmailLogEntry[]
}

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      connections: [],
      contacts: [],
      deals: [],
      tasks: [],
      emailLogs: [],
      syncStatus: 'idle',

      addConnection: (connectionData) => {
        const connection: CRMConnection = {
          ...connectionData,
          id: `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        set(state => ({
          connections: [...state.connections, connection]
        }))

        return connection
      },

      updateConnection: (id, updates) => {
        set(state => ({
          connections: state.connections.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }))
      },

      removeConnection: (id) => {
        set(state => ({
          connections: state.connections.filter(c => c.id !== id),
          contacts: state.contacts.filter(c => c.connectionId !== id),
          deals: state.deals.filter(d => d.connectionId !== id),
          tasks: state.tasks.filter(t => t.connectionId !== id)
        }))
      },

      addContacts: (newContacts) => {
        set(state => {
          const existingIds = new Set(state.contacts.map(c => c.crmId))
          const uniqueContacts = newContacts.filter(c => !existingIds.has(c.crmId))

          // Update existing contacts
          const updatedContacts = state.contacts.map(existing => {
            const updated = newContacts.find(c => c.crmId === existing.crmId)
            return updated ? { ...existing, ...updated, lastSyncedAt: Date.now() } : existing
          })

          return { contacts: [...updatedContacts, ...uniqueContacts] }
        })
      },

      updateContact: (id, updates) => {
        set(state => ({
          contacts: state.contacts.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          )
        }))
      },

      removeContact: (id) => {
        set(state => ({
          contacts: state.contacts.filter(c => c.id !== id)
        }))
      },

      addDeals: (newDeals) => {
        set(state => {
          const existingIds = new Set(state.deals.map(d => d.crmId))
          const uniqueDeals = newDeals.filter(d => !existingIds.has(d.crmId))

          const updatedDeals = state.deals.map(existing => {
            const updated = newDeals.find(d => d.crmId === existing.crmId)
            return updated ? { ...existing, ...updated, lastSyncedAt: Date.now() } : existing
          })

          return { deals: [...updatedDeals, ...uniqueDeals] }
        })
      },

      updateDeal: (id, updates) => {
        set(state => ({
          deals: state.deals.map(d =>
            d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
          )
        }))
      },

      linkEmailToDeal: (dealId, emailId, threadId) => {
        set(state => ({
          deals: state.deals.map(d => {
            if (d.id !== dealId) return d
            return {
              ...d,
              linkedEmailIds: [...new Set([...d.linkedEmailIds, emailId])],
              linkedThreadIds: threadId
                ? [...new Set([...d.linkedThreadIds, threadId])]
                : d.linkedThreadIds
            }
          })
        }))
      },

      unlinkEmailFromDeal: (dealId, emailId) => {
        set(state => ({
          deals: state.deals.map(d => {
            if (d.id !== dealId) return d
            return {
              ...d,
              linkedEmailIds: d.linkedEmailIds.filter(id => id !== emailId)
            }
          })
        }))
      },

      addTask: (taskData) => {
        const task: CRMTask = {
          ...taskData,
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          tasks: [...state.tasks, task]
        }))

        return task
      },

      updateTask: (id, updates) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          )
        }))
      },

      completeTask: (id) => {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id
              ? { ...t, status: 'completed' as const, completedAt: Date.now(), updatedAt: Date.now() }
              : t
          )
        }))
      },

      removeTask: (id) => {
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }))
      },

      logEmail: (entryData) => {
        const entry: EmailLogEntry = {
          ...entryData,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isLogged: false
        }

        set(state => ({
          emailLogs: [...state.emailLogs, entry]
        }))

        return entry
      },

      markEmailLogged: (id, crmActivityId) => {
        set(state => ({
          emailLogs: state.emailLogs.map(e =>
            e.id === id
              ? { ...e, isLogged: true, loggedAt: Date.now(), crmActivityId }
              : e
          )
        }))
      },

      markEmailLogFailed: (id, error) => {
        set(state => ({
          emailLogs: state.emailLogs.map(e =>
            e.id === id ? { ...e, error } : e
          )
        }))
      },

      setSyncStatus: (syncStatus, lastError) => {
        set({ syncStatus, lastError })
      },

      getConnectionById: (id) => get().connections.find(c => c.id === id),

      getContactByEmail: (email) => {
        const emailLower = email.toLowerCase()
        return get().contacts.find(c => c.email.toLowerCase() === emailLower)
      },

      getContactById: (id) => get().contacts.find(c => c.id === id),

      getContactsByCompany: (companyId) =>
        get().contacts.filter(c => c.companyId === companyId),

      getDealById: (id) => get().deals.find(d => d.id === id),

      getOpenDeals: () =>
        get().deals.filter(d => !d.isClosed).sort((a, b) => (a.closeDate || 0) - (b.closeDate || 0)),

      getDealsForContact: (contactId) =>
        get().deals.filter(d => d.contactIds.includes(contactId)),

      getTasksForContact: (contactId) =>
        get().tasks.filter(t => t.contactId === contactId),

      getOpenTasks: () =>
        get().tasks
          .filter(t => t.status === 'open' || t.status === 'in_progress')
          .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0)),

      getEmailLog: (emailId) => get().emailLogs.find(e => e.emailId === emailId),

      getUnloggedEmails: () => get().emailLogs.filter(e => !e.isLogged && !e.error)
    }),
    {
      name: 'boxzero-crm',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        connections: state.connections.map(c => ({
          ...c,
          accessToken: undefined,
          refreshToken: undefined
        })),
        contacts: state.contacts.slice(-1000), // Keep last 1000 contacts
        deals: state.deals.filter(d => !d.isClosed).slice(-200), // Keep open deals
        tasks: state.tasks.filter(t => t.status !== 'completed').slice(-100),
        emailLogs: state.emailLogs.filter(e => !e.isLogged).slice(-500)
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useEffect } from 'react'

export function useCRM() {
  const store = useCRMStore()

  const connectedCRMs = useMemo(
    () => store.connections.filter(c => c.isConnected),
    [store.connections]
  )

  const connectCRM = useCallback(async (provider: CRMProvider, instanceUrl?: string) => {
    const config = CRM_OAUTH_CONFIG[provider as keyof typeof CRM_OAUTH_CONFIG]
    if (!config && provider !== 'custom') {
      console.error('Unsupported CRM provider:', provider)
      return null
    }

    // In production, this would initiate OAuth flow
    console.log('Would initiate OAuth for:', provider)

    return store.addConnection({
      provider,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      instanceUrl,
      isConnected: false,
      settings: {
        autoLogEmails: true,
        createContactsFromEmails: false,
        syncInterval: 15,
        syncDirection: 'bidirectional'
      }
    })
  }, [store.addConnection])

  const disconnectCRM = useCallback((connectionId: string) => {
    store.removeConnection(connectionId)
  }, [store.removeConnection])

  return {
    connections: store.connections,
    connectedCRMs,
    syncStatus: store.syncStatus,
    lastError: store.lastError,

    // Actions
    connectCRM,
    disconnectCRM,
    updateSettings: (connectionId: string, settings: Partial<CRMConnection['settings']>) => {
      const connection = store.getConnectionById(connectionId)
      if (connection) {
        store.updateConnection(connectionId, {
          settings: { ...connection.settings, ...settings }
        })
      }
    }
  }
}

export function useCRMContacts(options?: { companyId?: string }) {
  const store = useCRMStore()

  const contacts = useMemo(() => {
    if (options?.companyId) {
      return store.getContactsByCompany(options.companyId)
    }
    return store.contacts
  }, [options?.companyId, store.contacts])

  const findContactByEmail = useCallback((email: string) => {
    return store.getContactByEmail(email)
  }, [store.contacts])

  const findContactMatches = useCallback((email: string) => {
    return matchEmailToContacts(email, store.contacts)
  }, [store.contacts])

  return {
    contacts,
    totalCount: store.contacts.length,

    // Actions
    findContactByEmail,
    findContactMatches,
    updateContact: store.updateContact,
    removeContact: store.removeContact
  }
}

export function useCRMDeals(options?: { contactId?: string; openOnly?: boolean }) {
  const store = useCRMStore()

  const deals = useMemo(() => {
    let result = store.deals

    if (options?.contactId) {
      result = store.getDealsForContact(options.contactId)
    }

    if (options?.openOnly) {
      result = result.filter(d => !d.isClosed)
    }

    return result.sort((a, b) => (a.closeDate || 0) - (b.closeDate || 0))
  }, [options?.contactId, options?.openOnly, store.deals])

  const openDeals = useMemo(
    () => store.getOpenDeals(),
    [store.deals]
  )

  return {
    deals,
    openDeals,
    totalValue: openDeals.reduce((sum, d) => sum + (d.amount || 0), 0),

    // Actions
    updateDeal: store.updateDeal,
    linkEmailToDeal: store.linkEmailToDeal,
    unlinkEmailFromDeal: store.unlinkEmailFromDeal
  }
}

export function useCRMTasks(options?: { contactId?: string; dealId?: string }) {
  const store = useCRMStore()

  const tasks = useMemo(() => {
    if (options?.contactId) {
      return store.getTasksForContact(options.contactId)
    }
    return store.tasks
  }, [options?.contactId, store.tasks])

  const openTasks = useMemo(
    () => store.getOpenTasks(),
    [store.tasks]
  )

  const overdueTasks = useMemo(
    () => openTasks.filter(t => t.dueDate && t.dueDate < Date.now()),
    [openTasks]
  )

  const createFollowUpTask = useCallback((
    email: {
      id: string
      subject: string
      from: string
    },
    connectionId: string,
    dueDate: Date
  ) => {
    const contact = store.getContactByEmail(email.from)

    return store.addTask({
      crmId: '',
      connectionId,
      provider: store.getConnectionById(connectionId)?.provider || 'custom',
      subject: `Follow up: ${email.subject}`,
      description: `Follow up on email from ${email.from}`,
      dueDate: dueDate.getTime(),
      priority: 'normal',
      status: 'open',
      type: 'email',
      contactId: contact?.id,
      emailId: email.id
    })
  }, [store.addTask, store.getContactByEmail, store.getConnectionById])

  return {
    tasks,
    openTasks,
    overdueTasks,
    upcomingTasks: openTasks.filter(t => t.dueDate && t.dueDate > Date.now()).slice(0, 5),

    // Actions
    createTask: store.addTask,
    createFollowUpTask,
    updateTask: store.updateTask,
    completeTask: store.completeTask,
    removeTask: store.removeTask
  }
}

export function useEmailCRMLink(email: {
  id: string
  threadId: string
  subject: string
  body: string
  from: string
  to: string[]
  direction: 'inbound' | 'outbound'
  sentAt: number
} | null) {
  const store = useCRMStore()

  const contact = useMemo(
    () => email ? store.getContactByEmail(email.from) : undefined,
    [email, store.contacts]
  )

  const contactMatches = useMemo(
    () => email ? matchEmailToContacts(email.from, store.contacts) : [],
    [email, store.contacts]
  )

  const linkedDeals = useMemo(
    () => email
      ? store.deals.filter(d => d.linkedEmailIds.includes(email.id))
      : [],
    [email, store.deals]
  )

  const emailLog = useMemo(
    () => email ? store.getEmailLog(email.id) : undefined,
    [email, store.emailLogs]
  )

  const logTocrm = useCallback((connectionId: string, contactIds: string[], dealIds: string[] = []) => {
    if (!email) return null

    return store.logEmail({
      emailId: email.id,
      threadId: email.threadId,
      connectionId,
      subject: email.subject,
      body: email.body,
      direction: email.direction,
      sentAt: email.sentAt,
      contactIds,
      dealIds
    })
  }, [email, store.logEmail])

  return {
    contact,
    contactMatches,
    linkedDeals,
    isLogged: emailLog?.isLogged ?? false,
    logError: emailLog?.error,

    // Actions
    logTocrm,
    linkToDeal: (dealId: string) => email && store.linkEmailToDeal(dealId, email.id, email.threadId),
    unlinkFromDeal: (dealId: string) => email && store.unlinkEmailFromDeal(dealId, email.id)
  }
}

export function useCRMSidebar(emailAddress: string | null) {
  const store = useCRMStore()

  const contact = useMemo(
    () => emailAddress ? store.getContactByEmail(emailAddress) : undefined,
    [emailAddress, store.contacts]
  )

  const contactDeals = useMemo(
    () => contact ? store.getDealsForContact(contact.id) : [],
    [contact, store.deals]
  )

  const contactTasks = useMemo(
    () => contact ? store.getTasksForContact(contact.id) : [],
    [contact, store.tasks]
  )

  const companyContacts = useMemo(
    () => contact?.companyId ? store.getContactsByCompany(contact.companyId) : [],
    [contact, store.contacts]
  )

  return {
    contact,
    hasContact: !!contact,
    deals: contactDeals,
    openDeals: contactDeals.filter(d => !d.isClosed),
    tasks: contactTasks,
    openTasks: contactTasks.filter(t => t.status === 'open'),
    companyContacts,
    company: contact?.companyName ? {
      id: contact.companyId,
      name: contact.companyName,
      website: contact.companyWebsite
    } : undefined
  }
}

export default useCRMStore
