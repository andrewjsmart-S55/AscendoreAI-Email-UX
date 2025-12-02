import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { toast } from 'react-hot-toast'

export interface SyncProgress {
  phase: 'initial' | 'lazy' | 'complete'
  currentFolder: string
  foldersCompleted: number
  totalFolders: number
  emailsSynced: number
}

export interface SyncState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  progress: SyncProgress
  error?: string
  startTime?: number
}

export interface BatchedSyncOptions {
  initialBatchSize?: number
  lazyBatchSize?: number
  onProgress?: (progress: SyncProgress) => void
  onComplete?: (totalSynced: number) => void
  onError?: (error: string) => void
}

interface FolderInfo {
  folderId: string
  name: string
  displayName?: string
  messageCount?: number
  type: 'inbox' | 'sent' | 'other'
}

export function useBatchedSync(accountId?: string, options: BatchedSyncOptions = {}) {
  const {
    initialBatchSize = 100,
    lazyBatchSize = 50,
    onProgress,
    onComplete,
    onError
  } = options

  const queryClient = useQueryClient()
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    progress: {
      phase: 'initial',
      currentFolder: '',
      foldersCompleted: 0,
      totalFolders: 0,
      emailsSynced: 0
    }
  })

  const abortController = useRef<AbortController | null>(null)
  const isSyncingRef = useRef(false)

  const updateProgress = useCallback((updates: Partial<SyncProgress>) => {
    setSyncState(prev => {
      const newProgress = { ...prev.progress, ...updates }
      onProgress?.(newProgress)
      return { ...prev, progress: newProgress }
    })
  }, [onProgress])

  const updateState = useCallback((updates: Partial<SyncState>) => {
    setSyncState(prev => ({ ...prev, ...updates }))
  }, [])

  // Helper to find priority folders (Inbox, Sent)
  const categorizeFolders = (folders: any[]): { priority: FolderInfo[], other: FolderInfo[] } => {
    const priority: FolderInfo[] = []
    const other: FolderInfo[] = []

    folders.forEach(folder => {
      const name = (folder.name || folder.displayName || '').toLowerCase()
      const folderInfo: FolderInfo = {
        folderId: folder.folderId,
        name: folder.name || folder.displayName || 'Unknown',
        displayName: folder.displayName,
        messageCount: folder.totalItemCount || folder.messageCount,
        type: 'other'
      }

      if (name.includes('inbox')) {
        folderInfo.type = 'inbox'
        priority.unshift(folderInfo) // Inbox first
      } else if (name.includes('sent')) {
        folderInfo.type = 'sent'
        priority.push(folderInfo) // Sent second
      } else if (!name.includes('deleted') && !name.includes('junk') && !name.includes('spam')) {
        // Skip deleted/junk/spam folders
        other.push(folderInfo)
      }
    })

    return { priority, other }
  }

  // Fetch messages from a folder
  const fetchFolderMessages = async (folderId: string, limit: number, offset: number = 0) => {
    const result = await apiService.getAccountEmails(accountId!, {
      folder_id: folderId,
      limit,
      offset
    })
    return result?.emails || []
  }

  // Main sync function
  const performBatchedSync = useCallback(async () => {
    if (!accountId) {
      throw new Error('No account ID provided')
    }

    if (isSyncingRef.current) {
      console.log('⚠️ Sync already in progress')
      return
    }

    isSyncingRef.current = true
    console.log(`🔄 Starting Smart Sync for account: ${accountId}`)

    const startTime = Date.now()
    let totalEmailsSynced = 0

    updateState({
      status: 'running',
      startTime,
      error: undefined
    })

    try {
      // Step 1: Trigger backend sync from email provider
      console.log('📡 Step 1: Triggering backend sync from email provider...')
      toast.loading('Connecting to email provider...', { id: 'sync-toast' })

      try {
        await apiService.syncAccountEmails(accountId)
        console.log('✅ Backend sync triggered')
      } catch (syncError: any) {
        if (syncError?.code === 'ECONNABORTED' || syncError?.message?.includes('timeout')) {
          console.log('⏱️ Sync request timed out - backend processing in background')
        } else {
          console.warn('⚠️ Backend sync error (continuing):', syncError.message)
        }
      }

      // Brief wait for backend to start processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 2: Get all folders
      console.log('📁 Step 2: Getting account folders...')
      const folders = await apiService.getAccountFolders(accountId)

      if (!Array.isArray(folders) || folders.length === 0) {
        throw new Error('No folders found for account')
      }

      const { priority, other } = categorizeFolders(folders)
      const totalFolders = priority.length + other.length

      console.log(`📊 Found ${priority.length} priority folders, ${other.length} other folders`)

      updateProgress({
        phase: 'initial',
        totalFolders,
        foldersCompleted: 0,
        emailsSynced: 0
      })

      // Step 3: INITIAL SYNC - Fetch latest 100 emails from Inbox and Sent
      console.log('🚀 Step 3: Initial sync - fetching latest emails from priority folders...')
      toast.loading('Fetching latest emails...', { id: 'sync-toast' })

      for (const folder of priority) {
        if (abortController.current?.signal.aborted) {
          throw new Error('Sync cancelled')
        }

        console.log(`📥 Fetching ${initialBatchSize} emails from ${folder.name}...`)
        updateProgress({ currentFolder: folder.name })

        try {
          const messages = await fetchFolderMessages(folder.folderId, initialBatchSize, 0)
          totalEmailsSynced += messages.length
          console.log(`✅ ${folder.name}: ${messages.length} emails fetched`)

          updateProgress({ emailsSynced: totalEmailsSynced })

          // Refresh UI immediately after fetching priority folders
          if (folder.type === 'inbox') {
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'accountMessages' && query.queryKey[1] === accountId
            })
          }
        } catch (error: any) {
          console.error(`❌ Error fetching ${folder.name}:`, error.message)
        }
      }

      updateProgress({
        foldersCompleted: priority.length
      })

      // Show success for initial sync
      toast.success(`Loaded ${totalEmailsSynced} emails. Syncing remaining folders...`, { id: 'sync-toast' })

      // Invalidate queries to show initial data
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'accountMessages' && query.queryKey[1] === accountId
      })

      // Step 4: LAZY SYNC - Continue syncing remaining messages in background
      console.log('🔄 Step 4: Lazy sync - fetching remaining emails...')
      updateProgress({ phase: 'lazy' })

      // Lazy sync priority folders (remaining emails beyond initial batch)
      for (const folder of priority) {
        if (abortController.current?.signal.aborted) break

        const messageCount = folder.messageCount || 0
        if (messageCount <= initialBatchSize) continue // Already fetched all

        console.log(`📥 Lazy sync ${folder.name}: ${messageCount - initialBatchSize} remaining emails...`)
        updateProgress({ currentFolder: `${folder.name} (remaining)` })

        let offset = initialBatchSize
        while (offset < messageCount) {
          if (abortController.current?.signal.aborted) break

          try {
            const messages = await fetchFolderMessages(folder.folderId, lazyBatchSize, offset)
            if (messages.length === 0) break

            totalEmailsSynced += messages.length
            offset += lazyBatchSize

            updateProgress({ emailsSynced: totalEmailsSynced })

            // Small delay to avoid overwhelming API
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (error: any) {
            console.error(`❌ Lazy sync error for ${folder.name}:`, error.message)
            break
          }
        }
      }

      // Lazy sync other folders
      for (let i = 0; i < other.length; i++) {
        const folder = other[i]
        if (abortController.current?.signal.aborted) break

        console.log(`📥 Syncing ${folder.name}...`)
        updateProgress({
          currentFolder: folder.name,
          foldersCompleted: priority.length + i + 1
        })

        let offset = 0
        const messageCount = folder.messageCount || 500 // Default estimate

        while (offset < messageCount) {
          if (abortController.current?.signal.aborted) break

          try {
            const messages = await fetchFolderMessages(folder.folderId, lazyBatchSize, offset)
            if (messages.length === 0) break

            totalEmailsSynced += messages.length
            offset += lazyBatchSize

            updateProgress({ emailsSynced: totalEmailsSynced })

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (error: any) {
            console.error(`❌ Error syncing ${folder.name}:`, error.message)
            break
          }
        }
      }

      // Sync complete
      const duration = Math.round((Date.now() - startTime) / 1000)
      console.log(`\n🎉 Smart Sync completed!`)
      console.log(`📊 Total emails synced: ${totalEmailsSynced}`)
      console.log(`⏱️ Duration: ${duration}s`)

      updateState({ status: 'completed' })
      updateProgress({
        phase: 'complete',
        foldersCompleted: totalFolders,
        currentFolder: ''
      })

      // Final query invalidation
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'accountMessages' && query.queryKey[1] === accountId
      })
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })

      onComplete?.(totalEmailsSynced)
      toast.dismiss('sync-toast')
      toast.success(`Sync complete! ${totalEmailsSynced} emails loaded.`)

    } catch (error: any) {
      console.error('🚨 Smart Sync failed:', error)

      const errorMessage = error.message || 'Unknown sync error'
      updateState({
        status: 'error',
        error: errorMessage
      })

      onError?.(errorMessage)
      toast.dismiss('sync-toast')
      toast.error(`Sync failed: ${errorMessage}`)
    } finally {
      isSyncingRef.current = false
    }
  }, [
    accountId,
    initialBatchSize,
    lazyBatchSize,
    updateState,
    updateProgress,
    queryClient,
    onComplete,
    onError
  ])

  const startBatchedSync = useCallback(async () => {
    if (syncState.status === 'running') {
      console.log('⚠️ Sync already running')
      return
    }

    abortController.current = new AbortController()

    try {
      await performBatchedSync()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }, [syncState.status, performBatchedSync])

  const pauseSync = useCallback(() => {
    // Pause not supported in new implementation
    console.log('⏸️ Pause not supported')
  }, [])

  const resumeSync = useCallback(() => {
    // Resume not supported in new implementation
    console.log('▶️ Resume not supported')
  }, [])

  const cancelSync = useCallback(() => {
    console.log('🛑 Cancelling sync...')
    abortController.current?.abort()

    updateState({
      status: 'idle',
      error: undefined
    })

    updateProgress({
      phase: 'initial',
      currentFolder: '',
      foldersCompleted: 0,
      totalFolders: 0,
      emailsSynced: 0
    })

    isSyncingRef.current = false
  }, [updateState, updateProgress])

  const resetSync = useCallback(() => {
    console.log('🔄 Resetting sync state...')
    cancelSync()
  }, [cancelSync])

  return {
    syncState,
    startBatchedSync,
    pauseSync,
    resumeSync,
    cancelSync,
    resetSync
  }
}
