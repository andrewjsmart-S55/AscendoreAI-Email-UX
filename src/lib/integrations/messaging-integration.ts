/**
 * Messaging Integration Service (Slack & Microsoft Teams)
 *
 * Integrate with Slack and Microsoft Teams to:
 * - Share emails to channels
 * - Receive notifications in messaging apps
 * - Create email drafts from messages
 * - Link conversations across platforms
 * - Team collaboration on emails
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type MessagingProvider = 'slack' | 'teams'

export interface MessagingConnection {
  id: string
  provider: MessagingProvider
  workspaceName: string
  workspaceId: string
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: number
  botUserId?: string
  installedAt: number
  settings: {
    defaultChannelId?: string
    defaultChannelName?: string
    notifyOnNewEmail: boolean
    notifyOnMention: boolean
    notifyOnReply: boolean
    includeEmailPreview: boolean
    unfurlLinks: boolean
  }
}

export interface MessagingChannel {
  id: string
  connectionId: string
  provider: MessagingProvider
  channelId: string
  channelName: string
  isPrivate: boolean
  isMember: boolean
  memberCount?: number
}

export interface MessagingUser {
  id: string
  connectionId: string
  provider: MessagingProvider
  userId: string
  username: string
  displayName: string
  email?: string
  avatarUrl?: string
  isBot: boolean
}

export interface SharedEmail {
  id: string
  emailId: string
  threadId: string
  connectionId: string
  channelId: string
  channelName: string
  messageId: string // Slack/Teams message ID
  messageUrl?: string

  // Email snapshot
  subject: string
  from: string
  snippet: string
  receivedAt: number

  // Sharing details
  sharedBy: string
  sharedAt: number
  comment?: string

  // Thread info
  replyCount: number
  reactions: {
    emoji: string
    count: number
  }[]
}

export interface MessagingNotification {
  id: string
  connectionId: string
  type: 'new_email' | 'reply' | 'mention' | 'shared_email_reply'
  title: string
  message: string
  emailId?: string
  threadId?: string
  channelId?: string
  messageUrl?: string
  createdAt: number
  isSent: boolean
  sentAt?: number
  error?: string
}

export interface EmailFromMessage {
  id: string
  connectionId: string
  messageId: string
  messageUrl: string
  channelId: string
  channelName: string

  // Message content
  content: string
  author: string
  authorEmail?: string
  timestamp: number

  // Draft info
  draftId?: string
  convertedAt?: number
}

// =============================================================================
// OAuth Configuration
// =============================================================================

export const MESSAGING_OAUTH_CONFIG = {
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'channels:join',
      'chat:write',
      'users:read',
      'users:read.email',
      'reactions:read',
      'files:write'
    ]
  },
  teams: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'Channel.ReadBasic.All',
      'ChannelMessage.Send',
      'User.Read',
      'Team.ReadBasic.All'
    ]
  }
}

// =============================================================================
// Message Formatting
// =============================================================================

export function formatEmailForSlack(email: {
  subject: string
  from: string
  to: string[]
  snippet: string
  receivedAt: number
  includePreview?: boolean
}): object {
  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: email.subject,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*From:*\n${email.from}`
        },
        {
          type: 'mrkdwn',
          text: `*To:*\n${email.to.join(', ')}`
        }
      ]
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Received: ${new Date(email.receivedAt).toLocaleString()}`
        }
      ]
    }
  ]

  if (email.includePreview && email.snippet) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `> ${email.snippet.substring(0, 500)}${email.snippet.length > 500 ? '...' : ''}`
      }
    })
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View in BoxZero',
          emoji: true
        },
        style: 'primary',
        action_id: 'view_email'
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Reply',
          emoji: true
        },
        action_id: 'reply_email'
      }
    ]
  })

  return { blocks }
}

export function formatEmailForTeams(email: {
  subject: string
  from: string
  to: string[]
  snippet: string
  receivedAt: number
  includePreview?: boolean
}): object {
  const card = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: email.subject,
        size: 'Large',
        weight: 'Bolder',
        wrap: true
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'From', value: email.from },
          { title: 'To', value: email.to.join(', ') },
          { title: 'Received', value: new Date(email.receivedAt).toLocaleString() }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View in BoxZero',
        url: '#' // Would be replaced with actual URL
      },
      {
        type: 'Action.Submit',
        title: 'Reply',
        data: { action: 'reply_email' }
      }
    ]
  }

  if (email.includePreview && email.snippet) {
    (card.body as Array<{ type: string; text?: string; size?: string; weight?: string; wrap?: boolean; separator?: boolean; facts?: Array<{ title: string; value: string }> }>).push({
      type: 'TextBlock',
      text: email.snippet.substring(0, 500),
      wrap: true,
      separator: true
    })
  }

  return { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] }
}

export function formatNotificationForSlack(notification: {
  type: MessagingNotification['type']
  title: string
  message: string
  emailSubject?: string
  emailFrom?: string
}): object {
  const emoji = {
    new_email: ':envelope:',
    reply: ':speech_balloon:',
    mention: ':bell:',
    shared_email_reply: ':thread:'
  }[notification.type]

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${notification.title}*\n${notification.message}`
        }
      },
      ...(notification.emailSubject ? [{
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Re: ${notification.emailSubject}${notification.emailFrom ? ` from ${notification.emailFrom}` : ''}`
        }]
      }] : [])
    ]
  }
}

// =============================================================================
// Messaging Store
// =============================================================================

interface MessagingStore {
  connections: MessagingConnection[]
  channels: MessagingChannel[]
  users: MessagingUser[]
  sharedEmails: SharedEmail[]
  notifications: MessagingNotification[]
  emailsFromMessages: EmailFromMessage[]

  // Connection management
  addConnection: (connection: Omit<MessagingConnection, 'id' | 'installedAt'>) => MessagingConnection
  updateConnection: (id: string, updates: Partial<MessagingConnection>) => void
  removeConnection: (id: string) => void

  // Channel management
  setChannels: (connectionId: string, channels: Omit<MessagingChannel, 'id' | 'connectionId'>[]) => void
  updateChannel: (id: string, updates: Partial<MessagingChannel>) => void

  // User management
  setUsers: (connectionId: string, users: Omit<MessagingUser, 'id' | 'connectionId'>[]) => void

  // Email sharing
  shareEmail: (share: Omit<SharedEmail, 'id' | 'sharedAt' | 'replyCount' | 'reactions'>) => SharedEmail
  updateSharedEmail: (id: string, updates: Partial<SharedEmail>) => void
  removeSharedEmail: (id: string) => void

  // Notifications
  addNotification: (notification: Omit<MessagingNotification, 'id' | 'createdAt' | 'isSent'>) => MessagingNotification
  markNotificationSent: (id: string, messageUrl?: string) => void
  markNotificationFailed: (id: string, error: string) => void

  // Email from messages
  addEmailFromMessage: (entry: Omit<EmailFromMessage, 'id'>) => EmailFromMessage
  updateEmailFromMessage: (id: string, updates: Partial<EmailFromMessage>) => void

  // Queries
  getConnectionById: (id: string) => MessagingConnection | undefined
  getChannelsForConnection: (connectionId: string) => MessagingChannel[]
  getUsersForConnection: (connectionId: string) => MessagingUser[]
  getSharedEmailsForThread: (threadId: string) => SharedEmail[]
  getSharedEmailsForChannel: (channelId: string) => SharedEmail[]
  getPendingNotifications: () => MessagingNotification[]
}

export const useMessagingStore = create<MessagingStore>()(
  persist(
    (set, get) => ({
      connections: [],
      channels: [],
      users: [],
      sharedEmails: [],
      notifications: [],
      emailsFromMessages: [],

      addConnection: (connectionData) => {
        const connection: MessagingConnection = {
          ...connectionData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          installedAt: Date.now()
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
          channels: state.channels.filter(c => c.connectionId !== id),
          users: state.users.filter(u => u.connectionId !== id),
          sharedEmails: state.sharedEmails.filter(s => s.connectionId !== id)
        }))
      },

      setChannels: (connectionId, channelData) => {
        const connection = get().connections.find(c => c.id === connectionId)
        if (!connection) return

        const channels: MessagingChannel[] = channelData.map(c => ({
          ...c,
          id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          connectionId,
          provider: connection.provider
        }))

        set(state => ({
          channels: [
            ...state.channels.filter(c => c.connectionId !== connectionId),
            ...channels
          ]
        }))
      },

      updateChannel: (id, updates) => {
        set(state => ({
          channels: state.channels.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }))
      },

      setUsers: (connectionId, userData) => {
        const connection = get().connections.find(c => c.id === connectionId)
        if (!connection) return

        const users: MessagingUser[] = userData.map(u => ({
          ...u,
          id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          connectionId,
          provider: connection.provider
        }))

        set(state => ({
          users: [
            ...state.users.filter(u => u.connectionId !== connectionId),
            ...users
          ]
        }))
      },

      shareEmail: (shareData) => {
        const share: SharedEmail = {
          ...shareData,
          id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sharedAt: Date.now(),
          replyCount: 0,
          reactions: []
        }

        set(state => ({
          sharedEmails: [...state.sharedEmails, share]
        }))

        return share
      },

      updateSharedEmail: (id, updates) => {
        set(state => ({
          sharedEmails: state.sharedEmails.map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        }))
      },

      removeSharedEmail: (id) => {
        set(state => ({
          sharedEmails: state.sharedEmails.filter(s => s.id !== id)
        }))
      },

      addNotification: (notificationData) => {
        const notification: MessagingNotification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          isSent: false
        }

        set(state => ({
          notifications: [...state.notifications, notification].slice(-100) // Keep last 100
        }))

        return notification
      },

      markNotificationSent: (id, messageUrl) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id
              ? { ...n, isSent: true, sentAt: Date.now(), messageUrl }
              : n
          )
        }))
      },

      markNotificationFailed: (id, error) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, error } : n
          )
        }))
      },

      addEmailFromMessage: (entryData) => {
        const entry: EmailFromMessage = {
          ...entryData,
          id: `efm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        set(state => ({
          emailsFromMessages: [...state.emailsFromMessages, entry]
        }))

        return entry
      },

      updateEmailFromMessage: (id, updates) => {
        set(state => ({
          emailsFromMessages: state.emailsFromMessages.map(e =>
            e.id === id ? { ...e, ...updates } : e
          )
        }))
      },

      getConnectionById: (id) => get().connections.find(c => c.id === id),

      getChannelsForConnection: (connectionId) =>
        get().channels.filter(c => c.connectionId === connectionId),

      getUsersForConnection: (connectionId) =>
        get().users.filter(u => u.connectionId === connectionId),

      getSharedEmailsForThread: (threadId) =>
        get().sharedEmails.filter(s => s.threadId === threadId),

      getSharedEmailsForChannel: (channelId) =>
        get().sharedEmails
          .filter(s => s.channelId === channelId)
          .sort((a, b) => b.sharedAt - a.sharedAt),

      getPendingNotifications: () =>
        get().notifications.filter(n => !n.isSent && !n.error)
    }),
    {
      name: 'boxzero-messaging',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        connections: state.connections.map(c => ({
          ...c,
          accessToken: undefined,
          refreshToken: undefined
        })),
        channels: state.channels,
        sharedEmails: state.sharedEmails.slice(-200),
        notifications: state.notifications.filter(n => !n.isSent).slice(-50)
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useState } from 'react'

export function useMessaging() {
  const store = useMessagingStore()

  const connectedWorkspaces = useMemo(
    () => store.connections.filter(c => c.isConnected),
    [store.connections]
  )

  const slackConnections = useMemo(
    () => store.connections.filter(c => c.provider === 'slack'),
    [store.connections]
  )

  const teamsConnections = useMemo(
    () => store.connections.filter(c => c.provider === 'teams'),
    [store.connections]
  )

  const connectWorkspace = useCallback(async (provider: MessagingProvider) => {
    const config = MESSAGING_OAUTH_CONFIG[provider]

    // In production, this would initiate OAuth flow
    console.log('Would initiate OAuth for:', provider, config.authUrl)

    return store.addConnection({
      provider,
      workspaceName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Workspace`,
      workspaceId: `ws_${Date.now()}`,
      isConnected: false,
      settings: {
        notifyOnNewEmail: true,
        notifyOnMention: true,
        notifyOnReply: false,
        includeEmailPreview: true,
        unfurlLinks: true
      }
    })
  }, [store.addConnection])

  const disconnectWorkspace = useCallback((connectionId: string) => {
    store.removeConnection(connectionId)
  }, [store.removeConnection])

  return {
    connections: store.connections,
    connectedWorkspaces,
    slackConnections,
    teamsConnections,

    // Actions
    connectWorkspace,
    disconnectWorkspace,
    updateSettings: (connectionId: string, settings: Partial<MessagingConnection['settings']>) => {
      const connection = store.getConnectionById(connectionId)
      if (connection) {
        store.updateConnection(connectionId, {
          settings: { ...connection.settings, ...settings }
        })
      }
    },
    setDefaultChannel: (connectionId: string, channelId: string, channelName: string) => {
      const connection = store.getConnectionById(connectionId)
      if (connection) {
        store.updateConnection(connectionId, {
          settings: {
            ...connection.settings,
            defaultChannelId: channelId,
            defaultChannelName: channelName
          }
        })
      }
    }
  }
}

export function useMessagingChannels(connectionId: string | null) {
  const store = useMessagingStore()

  const channels = useMemo(
    () => connectionId ? store.getChannelsForConnection(connectionId) : [],
    [connectionId, store.channels]
  )

  const publicChannels = useMemo(
    () => channels.filter(c => !c.isPrivate && c.isMember),
    [channels]
  )

  const privateChannels = useMemo(
    () => channels.filter(c => c.isPrivate && c.isMember),
    [channels]
  )

  return {
    channels,
    publicChannels,
    privateChannels,
    channelCount: channels.length
  }
}

export function useShareEmail(email: {
  id: string
  threadId: string
  subject: string
  from: string
  to: string[]
  snippet: string
  receivedAt: number
} | null) {
  const store = useMessagingStore()
  const [isSharing, setIsSharing] = useState(false)

  const existingShares = useMemo(
    () => email ? store.getSharedEmailsForThread(email.threadId) : [],
    [email, store.sharedEmails]
  )

  const shareToChannel = useCallback(async (
    connectionId: string,
    channelId: string,
    channelName: string,
    options?: {
      comment?: string
      sharedBy?: string
    }
  ) => {
    if (!email) return null

    setIsSharing(true)

    try {
      const connection = store.getConnectionById(connectionId)
      if (!connection) throw new Error('Connection not found')

      // Format message based on provider
      const formattedMessage = connection.provider === 'slack'
        ? formatEmailForSlack({
            ...email,
            includePreview: connection.settings.includeEmailPreview
          })
        : formatEmailForTeams({
            ...email,
            includePreview: connection.settings.includeEmailPreview
          })

      // In production, this would call the Slack/Teams API
      console.log('Would share to channel:', channelId, formattedMessage)

      // Create share record
      const share = store.shareEmail({
        emailId: email.id,
        threadId: email.threadId,
        connectionId,
        channelId,
        channelName,
        messageId: `msg_${Date.now()}`, // Would come from API response
        subject: email.subject,
        from: email.from,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        sharedBy: options?.sharedBy || 'user',
        comment: options?.comment
      })

      return share
    } finally {
      setIsSharing(false)
    }
  }, [email, store.shareEmail, store.getConnectionById])

  return {
    existingShares,
    isAlreadyShared: existingShares.length > 0,
    isSharing,
    shareToChannel
  }
}

export function useMessagingNotifications(connectionId: string | null) {
  const store = useMessagingStore()

  const pendingNotifications = useMemo(
    () => store.getPendingNotifications().filter(
      n => !connectionId || n.connectionId === connectionId
    ),
    [connectionId, store.notifications]
  )

  const sendNotification = useCallback(async (
    targetConnectionId: string,
    notification: {
      type: MessagingNotification['type']
      title: string
      message: string
      emailId?: string
      threadId?: string
      channelId?: string
    }
  ) => {
    const connection = store.getConnectionById(targetConnectionId)
    if (!connection || !connection.isConnected) return null

    // Check settings
    const shouldSend = {
      new_email: connection.settings.notifyOnNewEmail,
      reply: connection.settings.notifyOnReply,
      mention: connection.settings.notifyOnMention,
      shared_email_reply: true
    }[notification.type]

    if (!shouldSend) return null

    const notif = store.addNotification({
      ...notification,
      connectionId: targetConnectionId
    })

    // Format for provider
    const formatted = formatNotificationForSlack({
      ...notification
    })

    // In production, would send via API
    console.log('Would send notification:', formatted)

    // Simulate sending
    store.markNotificationSent(notif.id)

    return notif
  }, [store.getConnectionById, store.addNotification, store.markNotificationSent])

  return {
    pendingNotifications,
    pendingCount: pendingNotifications.length,
    sendNotification
  }
}

export function useEmailFromMessage() {
  const store = useMessagingStore()

  const createDraftFromMessage = useCallback((
    connectionId: string,
    message: {
      id: string
      url: string
      channelId: string
      channelName: string
      content: string
      author: string
      authorEmail?: string
      timestamp: number
    }
  ) => {
    return store.addEmailFromMessage({
      connectionId,
      messageId: message.id,
      messageUrl: message.url,
      channelId: message.channelId,
      channelName: message.channelName,
      content: message.content,
      author: message.author,
      authorEmail: message.authorEmail,
      timestamp: message.timestamp
    })
  }, [store.addEmailFromMessage])

  const markAsConverted = useCallback((id: string, draftId: string) => {
    store.updateEmailFromMessage(id, {
      draftId,
      convertedAt: Date.now()
    })
  }, [store.updateEmailFromMessage])

  return {
    pendingConversions: store.emailsFromMessages.filter(e => !e.convertedAt),
    createDraftFromMessage,
    markAsConverted
  }
}

export function useSlackIntegration(connectionId: string | null) {
  const store = useMessagingStore()

  const connection = useMemo(
    () => connectionId ? store.getConnectionById(connectionId) : undefined,
    [connectionId, store.connections]
  )

  const channels = useMemo(
    () => connectionId ? store.getChannelsForConnection(connectionId) : [],
    [connectionId, store.channels]
  )

  const users = useMemo(
    () => connectionId ? store.getUsersForConnection(connectionId) : [],
    [connectionId, store.users]
  )

  const isSlack = connection?.provider === 'slack'

  return {
    connection,
    isConnected: connection?.isConnected ?? false,
    isSlack,
    channels,
    users,
    defaultChannel: channels.find(
      c => c.channelId === connection?.settings.defaultChannelId
    )
  }
}

export function useTeamsIntegration(connectionId: string | null) {
  const store = useMessagingStore()

  const connection = useMemo(
    () => connectionId ? store.getConnectionById(connectionId) : undefined,
    [connectionId, store.connections]
  )

  const channels = useMemo(
    () => connectionId ? store.getChannelsForConnection(connectionId) : [],
    [connectionId, store.channels]
  )

  const users = useMemo(
    () => connectionId ? store.getUsersForConnection(connectionId) : [],
    [connectionId, store.users]
  )

  const isTeams = connection?.provider === 'teams'

  return {
    connection,
    isConnected: connection?.isConnected ?? false,
    isTeams,
    channels,
    users,
    defaultChannel: channels.find(
      c => c.channelId === connection?.settings.defaultChannelId
    )
  }
}

export default useMessagingStore
