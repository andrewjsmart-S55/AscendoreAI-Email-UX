/**
 * PubSub Service
 * Handles real-time email synchronization via WebSocket/PubSub connections
 */

import { ascendoreAuth } from './ascendore-auth'

export interface PubSubMessage {
  type: 'email_received' | 'email_updated' | 'folder_updated' | 'sync_status'
  data: any
  timestamp: string
  accountId: string
}

export interface PubSubConnection {
  accountId: string
  url: string
  websocket: WebSocket | null
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastMessage?: string
}

class PubSubService {
  private connections: Map<string, PubSubConnection> = new Map()
  private listeners: Set<(message: PubSubMessage) => void> = new Set()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second

  /**
   * Initialize PubSub connections for all linked accounts
   */
  async initializeConnections(): Promise<void> {
    console.log('🔌 Initializing PubSub connections...')

    try {
      // Get current user's authentication token
      const token = ascendoreAuth.getToken()
      if (!token) {
        console.warn('⚠️  No authentication token available for PubSub')
        return
      }

      // Get linked accounts from API
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ascendore-email-api.azurewebsites.net'
      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ Failed to fetch linked accounts for PubSub:', response.status)
        return
      }

      const accounts = await response.json()
      console.log(`📋 Found ${accounts.length} linked accounts for PubSub`)

      // Establish PubSub connection for each account
      for (const account of accounts) {
        const accountId = account.account_id || account.accountId
        if (accountId) {
          await this.connectToAccount(accountId, token)
        }
      }

    } catch (error) {
      console.error('❌ Error initializing PubSub connections:', error)
    }
  }

  /**
   * Connect to PubSub for a specific account
   */
  private async connectToAccount(accountId: string, token: string): Promise<void> {
    try {
      console.log(`🔗 Connecting to PubSub for account: ${accountId}`)

      // Get PubSub URL for this account
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ascendore-email-api.azurewebsites.net'
      const response = await fetch(
        `${API_BASE_URL}/api/accounts/${accountId}/pubsub-url`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        console.error(`❌ Failed to get PubSub URL for ${accountId}:`, response.status)
        return
      }

      const { url, websocket_url } = await response.json()
      const pubsubUrl = websocket_url || url

      if (!pubsubUrl) {
        console.error(`❌ No PubSub URL returned for account ${accountId}`)
        return
      }

      // Create connection entry
      const connection: PubSubConnection = {
        accountId,
        url: pubsubUrl,
        websocket: null,
        status: 'connecting'
      }

      this.connections.set(accountId, connection)

      // Establish WebSocket connection
      this.establishWebSocketConnection(connection, token)

    } catch (error) {
      console.error(`❌ Error connecting to PubSub for account ${accountId}:`, error)
    }
  }

  /**
   * Establish WebSocket connection for PubSub
   */
  private establishWebSocketConnection(connection: PubSubConnection, token: string): void {
    const { accountId, url } = connection

    try {
      // Add auth token to WebSocket URL if needed
      const wsUrl = url.includes('?')
        ? `${url}&token=${encodeURIComponent(token)}`
        : `${url}?token=${encodeURIComponent(token)}`

      console.log(`🌐 Establishing WebSocket connection for ${accountId}`)
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log(`✅ PubSub connected for account: ${accountId}`)
        connection.status = 'connected'
        connection.websocket = ws
        this.reconnectAttempts.delete(accountId)

        // Send initial subscription message if needed
        this.sendSubscriptionMessage(ws, accountId)
      }

      ws.onmessage = (event) => {
        try {
          const message: PubSubMessage = JSON.parse(event.data)
          message.accountId = accountId
          message.timestamp = message.timestamp || new Date().toISOString()

          console.log(`📨 PubSub message received for ${accountId}:`, message.type)
          connection.lastMessage = new Date().toISOString()

          // Notify all listeners
          this.listeners.forEach(listener => {
            try {
              listener(message)
            } catch (error) {
              console.error('Error in PubSub listener:', error)
            }
          })

        } catch (error) {
          console.error(`❌ Error parsing PubSub message for ${accountId}:`, error)
        }
      }

      ws.onclose = () => {
        console.log(`🔌 PubSub connection closed for account: ${accountId}`)
        connection.status = 'disconnected'
        connection.websocket = null

        // Attempt reconnection with exponential backoff
        this.scheduleReconnection(connection, token)
      }

      ws.onerror = (error) => {
        console.error(`❌ PubSub WebSocket error for ${accountId}:`, error)
        connection.status = 'error'
      }

      connection.websocket = ws

    } catch (error) {
      console.error(`❌ Error establishing WebSocket for ${accountId}:`, error)
      connection.status = 'error'
    }
  }

  /**
   * Send subscription message to establish email monitoring
   */
  private sendSubscriptionMessage(ws: WebSocket, accountId: string): void {
    const subscriptionMessage = {
      type: 'subscribe',
      accountId,
      events: ['email_received', 'email_updated', 'folder_updated', 'sync_status']
    }

    try {
      ws.send(JSON.stringify(subscriptionMessage))
      console.log(`📡 Sent subscription message for account: ${accountId}`)
    } catch (error) {
      console.error(`❌ Error sending subscription message for ${accountId}:`, error)
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(connection: PubSubConnection, token: string): void {
    const { accountId } = connection
    const attempts = this.reconnectAttempts.get(accountId) || 0

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for account: ${accountId}`)
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts) // Exponential backoff
    this.reconnectAttempts.set(accountId, attempts + 1)

    console.log(`🔄 Scheduling reconnection for ${accountId} in ${delay}ms (attempt ${attempts + 1})`)

    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect PubSub for account: ${accountId}`)
      this.establishWebSocketConnection(connection, token)
    }, delay)
  }

  /**
   * Add a message listener
   */
  addListener(listener: (message: PubSubMessage) => void): void {
    this.listeners.add(listener)
  }

  /**
   * Remove a message listener
   */
  removeListener(listener: (message: PubSubMessage) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * Get connection status for all accounts
   */
  getConnectionStatus(): Record<string, { status: string; lastMessage?: string }> {
    const status: Record<string, { status: string; lastMessage?: string }> = {}

    this.connections.forEach((connection, accountId) => {
      status[accountId] = {
        status: connection.status,
        lastMessage: connection.lastMessage
      }
    })

    return status
  }

  /**
   * Disconnect all PubSub connections
   */
  disconnectAll(): void {
    console.log('🔌 Disconnecting all PubSub connections...')

    this.connections.forEach((connection) => {
      if (connection.websocket) {
        connection.websocket.close()
      }
    })

    this.connections.clear()
    this.reconnectAttempts.clear()
    this.listeners.clear()
  }

  /**
   * Manually trigger reconnection for all accounts
   */
  async reconnectAll(): Promise<void> {
    console.log('🔄 Manually triggering reconnection for all accounts...')
    this.disconnectAll()
    await this.initializeConnections()
  }
}

// Export singleton instance
export const pubsubService = new PubSubService()
export default pubsubService