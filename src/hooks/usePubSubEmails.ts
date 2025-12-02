import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pubsubService, PubSubMessage } from '@/lib/pubsub-service'
import { emailQueryKeys } from './useEmails'
import { toast } from 'react-hot-toast'

/**
 * Hook to handle real-time email updates via PubSub
 * Automatically updates React Query cache when new emails arrive
 */
export function usePubSubEmails() {
  const queryClient = useQueryClient()
  const [connectionStatus, setConnectionStatus] = useState<Record<string, any>>({})
  const [lastMessage, setLastMessage] = useState<PubSubMessage | null>(null)

  useEffect(() => {
    // Message handler for PubSub events
    const handlePubSubMessage = (message: PubSubMessage) => {
      console.log('📨 Real-time email update received:', message)
      setLastMessage(message)

      switch (message.type) {
        case 'email_received':
          handleNewEmail(message)
          break

        case 'email_updated':
          handleEmailUpdate(message)
          break

        case 'folder_updated':
          handleFolderUpdate(message)
          break

        case 'sync_status':
          handleSyncStatus(message)
          break

        default:
          console.log('Unknown PubSub message type:', message.type)
      }

      // Update connection status
      setConnectionStatus(pubsubService.getConnectionStatus())
    }

    // Add listener to PubSub service
    pubsubService.addListener(handlePubSubMessage)

    // Get initial connection status
    setConnectionStatus(pubsubService.getConnectionStatus())

    // Cleanup on unmount
    return () => {
      pubsubService.removeListener(handlePubSubMessage)
    }
  }, [queryClient])

  // Handle new email received
  const handleNewEmail = (message: PubSubMessage) => {
    const { data, accountId } = message

    try {
      // Show notification for new email
      if (data.subject && data.sender) {
        toast.success(`📧 New email from ${data.sender.name || data.sender.email}`, {
          duration: 4000,
          icon: '📧'
        })
      }

      // Invalidate and refetch email lists to include the new email
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })

      // If we have the full email data, we can optimistically update the cache
      if (data.id && data.subject) {
        const transformedEmail = {
          id: data.id,
          subject: data.subject,
          sender: data.sender || { name: 'Unknown', email: 'unknown@example.com' },
          recipients: data.recipients || [],
          date: data.receivedAt || new Date().toISOString(),
          isRead: false,
          isStarred: false,
          hasAttachments: data.hasAttachments || false,
          preview: data.preview || data.content?.substring(0, 150) || '',
          folder: data.folder || 'inbox',
          accountId
        }

        // Add to existing email lists in cache
        const existingQueries = queryClient.getQueriesData({ queryKey: emailQueryKeys.lists() })
        existingQueries.forEach(([queryKey, oldData]) => {
          if (Array.isArray(oldData)) {
            const updatedData = [transformedEmail, ...oldData]
            queryClient.setQueryData(queryKey, updatedData)
          }
        })
      }

    } catch (error) {
      console.error('Error handling new email message:', error)
    }
  }

  // Handle email update (read/unread, starred, etc.)
  const handleEmailUpdate = (message: PubSubMessage) => {
    const { data } = message

    try {
      // Invalidate specific email if we have the ID
      if (data.emailId) {
        queryClient.invalidateQueries({
          queryKey: emailQueryKeys.detail(data.emailId)
        })
      }

      // Invalidate email lists to reflect changes
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.lists() })

      console.log('✅ Email update processed:', data)

    } catch (error) {
      console.error('Error handling email update message:', error)
    }
  }

  // Handle folder update (new folder, folder changes)
  const handleFolderUpdate = (message: PubSubMessage) => {
    const { data, accountId } = message

    try {
      // Invalidate folder-related queries
      queryClient.invalidateQueries({ queryKey: ['folders', accountId] })
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })

      console.log('✅ Folder update processed for account:', accountId)

    } catch (error) {
      console.error('Error handling folder update message:', error)
    }
  }

  // Handle sync status updates
  const handleSyncStatus = (message: PubSubMessage) => {
    const { data, accountId } = message

    try {
      if (data.status === 'sync_completed') {
        // Show notification that sync is complete
        toast.success(`✅ Email sync completed for ${accountId}`, {
          duration: 3000
        })

        // Refresh all email data
        queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
        queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })

      } else if (data.status === 'sync_started') {
        toast.loading(`🔄 Syncing emails for ${accountId}...`, {
          id: `sync-${accountId}`,
          duration: 10000
        })

      } else if (data.status === 'sync_error') {
        toast.error(`❌ Email sync failed for ${accountId}`, {
          id: `sync-${accountId}`,
          duration: 5000
        })
      }

      console.log('✅ Sync status processed:', data.status, accountId)

    } catch (error) {
      console.error('Error handling sync status message:', error)
    }
  }

  // Manual reconnection function
  const reconnectPubSub = async () => {
    try {
      await pubsubService.reconnectAll()
      setConnectionStatus(pubsubService.getConnectionStatus())
      toast.success('🔌 PubSub connections reestablished')
    } catch (error) {
      toast.error('❌ Failed to reconnect PubSub')
      console.error('Error reconnecting PubSub:', error)
    }
  }

  return {
    connectionStatus,
    lastMessage,
    reconnectPubSub,
    isConnected: Object.values(connectionStatus).some(conn => conn.status === 'connected')
  }
}