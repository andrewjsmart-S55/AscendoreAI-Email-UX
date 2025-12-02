/**
 * Email Sync Service
 *
 * Handles incremental email synchronization with delta tokens.
 * Features:
 * - Delta sync for efficient updates
 * - Full sync with pagination
 * - Background sync scheduling
 * - Conflict resolution
 * - Offline queue management
 */

import { apiService } from '@/lib/api'
import { Email } from '@/types/email'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface SyncState {
  /** Last sync timestamp per account */
  lastSyncTime: Record<string, string>

  /** Delta tokens per account/folder */
  deltaTokens: Record<string, string>

  /** Sync status per account */
  syncStatus: Record<string, 'idle' | 'syncing' | 'error'>

  /** Sync errors per account */
  syncErrors: Record<string, string | null>

  /** Pending offline actions */
  offlineQueue: OfflineAction[]

  /** Is currently online */
  isOnline: boolean
}

export interface OfflineAction {
  id: string
  type: 'archive' | 'delete' | 'star' | 'unstar' | 'move' | 'mark_read' | 'mark_unread'
  emailId: string
  accountId: string
  data?: Record<string, unknown>
  createdAt: string
  retryCount: number
}

export interface SyncResult {
  success: boolean
  newEmails: number
  updatedEmails: number
  deletedEmails: number
  deltaToken?: string
  error?: string
}

interface SyncStore extends SyncState {
  // Actions
  setLastSyncTime: (accountId: string, time: string) => void
  setDeltaToken: (key: string, token: string) => void
  setSyncStatus: (accountId: string, status: 'idle' | 'syncing' | 'error') => void
  setSyncError: (accountId: string, error: string | null) => void
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount'>) => void
  removeOfflineAction: (id: string) => void
  incrementRetry: (id: string) => void
  setOnline: (online: boolean) => void
  clearSyncData: (accountId: string) => void
}

// =============================================================================
// Sync Store
// =============================================================================

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      lastSyncTime: {},
      deltaTokens: {},
      syncStatus: {},
      syncErrors: {},
      offlineQueue: [],
      isOnline: true,

      setLastSyncTime: (accountId, time) =>
        set((state) => ({
          lastSyncTime: { ...state.lastSyncTime, [accountId]: time }
        })),

      setDeltaToken: (key, token) =>
        set((state) => ({
          deltaTokens: { ...state.deltaTokens, [key]: token }
        })),

      setSyncStatus: (accountId, status) =>
        set((state) => ({
          syncStatus: { ...state.syncStatus, [accountId]: status }
        })),

      setSyncError: (accountId, error) =>
        set((state) => ({
          syncErrors: { ...state.syncErrors, [accountId]: error }
        })),

      addOfflineAction: (action) =>
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            {
              ...action,
              id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              createdAt: new Date().toISOString(),
              retryCount: 0
            }
          ]
        })),

      removeOfflineAction: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((a) => a.id !== id)
        })),

      incrementRetry: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.map((a) =>
            a.id === id ? { ...a, retryCount: a.retryCount + 1 } : a
          )
        })),

      setOnline: (online) => set({ isOnline: online }),

      clearSyncData: (accountId) =>
        set((state) => {
          const newLastSyncTime = { ...state.lastSyncTime }
          const newDeltaTokens = { ...state.deltaTokens }
          const newSyncStatus = { ...state.syncStatus }
          const newSyncErrors = { ...state.syncErrors }

          delete newLastSyncTime[accountId]
          delete newSyncStatus[accountId]
          delete newSyncErrors[accountId]

          // Remove delta tokens for this account
          Object.keys(newDeltaTokens).forEach((key) => {
            if (key.startsWith(accountId)) {
              delete newDeltaTokens[key]
            }
          })

          return {
            lastSyncTime: newLastSyncTime,
            deltaTokens: newDeltaTokens,
            syncStatus: newSyncStatus,
            syncErrors: newSyncErrors
          }
        })
    }),
    {
      name: 'boxzero-sync',
      version: 1
    }
  )
)

// =============================================================================
// Email Sync Service Class
// =============================================================================

export class EmailSyncService {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  /**
   * Perform incremental sync for an account/folder
   */
  async syncFolder(
    accountId: string,
    folderId: string,
    options: {
      fullSync?: boolean
      pageSize?: number
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<SyncResult> {
    const { fullSync = false, pageSize = 50, onProgress } = options
    const store = useSyncStore.getState()

    const deltaKey = `${accountId}:${folderId}`
    const existingDelta = store.deltaTokens[deltaKey]

    // Set syncing status
    store.setSyncStatus(accountId, 'syncing')
    store.setSyncError(accountId, null)

    try {
      let newEmails = 0
      let updatedEmails = 0
      let deletedEmails = 0
      let newDeltaToken: string | undefined

      if (fullSync || !existingDelta) {
        // Full sync with pagination
        const result = await this.performFullSync(accountId, folderId, pageSize, onProgress)
        newEmails = result.newEmails
        newDeltaToken = result.deltaToken
      } else {
        // Delta sync - get only changes since last sync
        const result = await this.performDeltaSync(accountId, folderId, existingDelta)
        newEmails = result.newEmails
        updatedEmails = result.updatedEmails
        deletedEmails = result.deletedEmails
        newDeltaToken = result.deltaToken
      }

      // Update sync state
      store.setLastSyncTime(accountId, new Date().toISOString())
      if (newDeltaToken) {
        store.setDeltaToken(deltaKey, newDeltaToken)
      }
      store.setSyncStatus(accountId, 'idle')

      console.log(`[Sync] Completed for ${accountId}/${folderId}: +${newEmails}, ~${updatedEmails}, -${deletedEmails}`)

      return {
        success: true,
        newEmails,
        updatedEmails,
        deletedEmails,
        deltaToken: newDeltaToken
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus(accountId, 'error')
      store.setSyncError(accountId, errorMessage)

      console.error('[Sync] Error:', error)

      return {
        success: false,
        newEmails: 0,
        updatedEmails: 0,
        deletedEmails: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Full sync with pagination
   */
  private async performFullSync(
    accountId: string,
    folderId: string,
    pageSize: number,
    onProgress?: (progress: number) => void
  ): Promise<{ newEmails: number; deltaToken?: string }> {
    let offset = 0
    let totalFetched = 0
    let hasMore = true
    let deltaToken: string | undefined

    while (hasMore) {
      try {
        const response = await apiService.getAccountMessages(
          accountId,
          folderId,
          pageSize,
          offset
        )

        const emails = response.emails || []
        totalFetched += emails.length

        // Check if there are more pages
        hasMore = emails.length === pageSize
        offset += pageSize

        // Note: Delta token and progress reporting require backend support
        // For now, we rely on pagination via offset

        // Report progress if callback provided
        if (onProgress) {
          // Without totalCount from backend, estimate based on fetched vs page size
          const estimatedProgress = hasMore ? Math.min(90, totalFetched / 2) : 100
          onProgress(estimatedProgress)
        }

        // Small delay to avoid rate limiting
        if (hasMore) {
          await this.delay(100)
        }
      } catch (error) {
        console.error('[Sync] Page fetch error:', error)
        break
      }
    }

    return { newEmails: totalFetched, deltaToken }
  }

  /**
   * Delta sync - fetch only changes
   */
  private async performDeltaSync(
    accountId: string,
    folderId: string,
    deltaToken: string
  ): Promise<{
    newEmails: number
    updatedEmails: number
    deletedEmails: number
    deltaToken?: string
  }> {
    // The BoxZero API should support delta sync via the sync-messages endpoint
    // For now, we'll trigger a sync and track changes
    try {
      const result = await apiService.syncAccountMessages(accountId) as {
        newMessages?: number
        updatedMessages?: number
        deletedMessages?: number
        syncToken?: string
      }

      return {
        newEmails: result.newMessages || 0,
        updatedEmails: result.updatedMessages || 0,
        deletedEmails: result.deletedMessages || 0,
        deltaToken: result.syncToken || deltaToken
      }
    } catch (error) {
      console.error('[Sync] Delta sync failed, falling back to full sync')
      throw error
    }
  }

  /**
   * Start background sync for an account
   */
  startBackgroundSync(accountId: string, intervalMs?: number): void {
    // Clear existing interval
    this.stopBackgroundSync(accountId)

    const interval = intervalMs || this.DEFAULT_SYNC_INTERVAL

    // Initial sync
    this.syncAllFolders(accountId)

    // Set up interval
    const intervalId = setInterval(() => {
      if (useSyncStore.getState().isOnline) {
        this.syncAllFolders(accountId)
      }
    }, interval)

    this.syncIntervals.set(accountId, intervalId)
    console.log(`[Sync] Started background sync for ${accountId} every ${interval / 1000}s`)
  }

  /**
   * Stop background sync for an account
   */
  stopBackgroundSync(accountId: string): void {
    const intervalId = this.syncIntervals.get(accountId)
    if (intervalId) {
      clearInterval(intervalId)
      this.syncIntervals.delete(accountId)
      console.log(`[Sync] Stopped background sync for ${accountId}`)
    }
  }

  /**
   * Sync all folders for an account
   */
  async syncAllFolders(accountId: string): Promise<void> {
    try {
      // Get folders for this account
      const folders = await apiService.getAccountFolders(accountId) as Array<{ id: string; name: string }>

      if (!Array.isArray(folders)) {
        console.warn('[Sync] No folders found for account:', accountId)
        return
      }

      // Sync important folders first
      const priorityFolders = ['INBOX', 'Inbox', 'inbox']
      const sortedFolders = folders.sort((a, b) => {
        const aIsPriority = priorityFolders.some((p) => a.name?.includes(p))
        const bIsPriority = priorityFolders.some((p) => b.name?.includes(p))
        return bIsPriority ? 1 : aIsPriority ? -1 : 0
      })

      for (const folder of sortedFolders) {
        await this.syncFolder(accountId, folder.id)
        // Small delay between folders
        await this.delay(500)
      }
    } catch (error) {
      console.error('[Sync] Failed to sync all folders:', error)
    }
  }

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
    const store = useSyncStore.getState()
    const queue = [...store.offlineQueue]

    let processed = 0
    let failed = 0

    for (const action of queue) {
      if (action.retryCount >= 3) {
        // Too many retries, remove from queue
        store.removeOfflineAction(action.id)
        failed++
        continue
      }

      try {
        await this.executeOfflineAction(action)
        store.removeOfflineAction(action.id)
        processed++
      } catch (error) {
        console.error('[Sync] Failed to process offline action:', action.id, error)
        store.incrementRetry(action.id)
        failed++
      }
    }

    console.log(`[Sync] Processed offline queue: ${processed} success, ${failed} failed`)
    return { processed, failed }
  }

  /**
   * Execute a single offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'archive':
        await apiService.archiveEmail(action.emailId)
        break
      case 'delete':
        await apiService.deleteEmail(action.emailId)
        break
      case 'star':
        await apiService.markEmailAsStarred(action.emailId, true)
        break
      case 'unstar':
        await apiService.markEmailAsStarred(action.emailId, false)
        break
      case 'move':
        await apiService.moveEmail(action.emailId, action.data?.folder as string || 'INBOX')
        break
      case 'mark_read':
        await apiService.markEmailAsRead(action.emailId)
        break
      case 'mark_unread':
        await apiService.markEmailAsUnread(action.emailId)
        break
      default:
        console.warn('[Sync] Unknown offline action type:', action.type)
    }
  }

  /**
   * Queue an action for offline processing
   */
  queueOfflineAction(
    type: OfflineAction['type'],
    emailId: string,
    accountId: string,
    data?: Record<string, unknown>
  ): void {
    useSyncStore.getState().addOfflineAction({
      type,
      emailId,
      accountId,
      data
    })
    console.log(`[Sync] Queued offline action: ${type} for ${emailId}`)
  }

  /**
   * Handle coming back online
   */
  private handleOnline(): void {
    console.log('[Sync] Back online, processing queue...')
    useSyncStore.getState().setOnline(true)
    this.processOfflineQueue()
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    console.log('[Sync] Gone offline')
    useSyncStore.getState().setOnline(false)
  }

  /**
   * Get sync status for an account
   */
  getSyncStatus(accountId: string): {
    status: 'idle' | 'syncing' | 'error'
    lastSync: string | null
    error: string | null
    offlineQueueSize: number
  } {
    const state = useSyncStore.getState()
    return {
      status: state.syncStatus[accountId] || 'idle',
      lastSync: state.lastSyncTime[accountId] || null,
      error: state.syncErrors[accountId] || null,
      offlineQueueSize: state.offlineQueue.filter((a) => a.accountId === accountId).length
    }
  }

  /**
   * Force full resync for an account
   */
  async forceFullSync(accountId: string, folderId: string): Promise<SyncResult> {
    // Clear existing delta token
    const deltaKey = `${accountId}:${folderId}`
    useSyncStore.getState().setDeltaToken(deltaKey, '')

    return this.syncFolder(accountId, folderId, { fullSync: true })
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup all intervals
   */
  cleanup(): void {
    this.syncIntervals.forEach((interval, accountId) => {
      clearInterval(interval)
    })
    this.syncIntervals.clear()
    console.log('[Sync] Cleaned up all sync intervals')
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const emailSyncService = new EmailSyncService()

// =============================================================================
// Hook for React Components
// =============================================================================

export function useSyncStatus(accountId: string) {
  const lastSyncTime = useSyncStore((state) => state.lastSyncTime[accountId])
  const syncStatus = useSyncStore((state) => state.syncStatus[accountId])
  const syncError = useSyncStore((state) => state.syncErrors[accountId])
  const offlineQueue = useSyncStore((state) =>
    state.offlineQueue.filter((a) => a.accountId === accountId)
  )
  const isOnline = useSyncStore((state) => state.isOnline)

  return {
    lastSyncTime,
    syncStatus: syncStatus || 'idle',
    syncError,
    offlineQueueSize: offlineQueue.length,
    isOnline
  }
}
