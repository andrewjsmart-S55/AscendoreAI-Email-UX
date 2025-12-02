/**
 * AI Features Hook
 *
 * Central hook for accessing all AI features:
 * - Smart replies
 * - Email summarization
 * - Auto-actions
 * - Predictions
 * - Sync status
 */

import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Email, EmailThread } from '@/types/email'
import { openAIService } from '@/lib/ai/openai-service'
import { ensemblePredictor, processAutoActions } from '@/lib/ai/ensemble-predictor'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { emailSyncService, useSyncStatus } from '@/lib/sync/email-sync-service'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

export interface UseAIFeaturesOptions {
  accountId?: string
  enabled?: boolean
}

export interface AIFeaturesState {
  // Smart Reply
  isGeneratingReply: boolean
  generateReply: (email: Email, tone?: 'professional' | 'casual' | 'friendly' | 'formal', instructions?: string) => Promise<string>

  // Summarization
  isGeneratingSummary: boolean
  generateEmailSummary: (email: Email) => Promise<{ summary: string; keyPoints: string[]; actionItems: string[] }>
  generateThreadSummary: (thread: EmailThread) => Promise<{ summary: string; keyPoints: string[]; actionItems: string[] }>
  generateDailySummary: (emails: Email[]) => Promise<{ summary: string; urgent: string[]; actionRequired: string[] }>

  // Auto-actions
  processAutoActions: (emails: Email[]) => Promise<{ autoExecuted: number; queued: number }>

  // Sync
  syncStatus: {
    status: 'idle' | 'syncing' | 'error'
    lastSync: string | null
    error: string | null
    offlineQueueSize: number
    isOnline: boolean
  }
  triggerSync: (folderId?: string) => Promise<void>

  // Trust
  trustStage: 'training_wheels' | 'building_confidence' | 'earned_autonomy'
  trustScore: number
}

// =============================================================================
// Hook
// =============================================================================

export function useAIFeatures(options: UseAIFeaturesOptions = {}): AIFeaturesState {
  const { accountId, enabled = true } = options
  const queryClient = useQueryClient()

  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Get user
  const user = ascendoreAuth.getUser()
  const userId = user?.id || 'anonymous'

  // Behavior store
  const trustProfile = useBehaviorStore((state) => state.trustProfile)
  const senderModels = useBehaviorStore((state) => state.senderModels)

  // Sync status - map to the expected interface
  const rawSyncStatus = useSyncStatus(accountId || '')
  const syncStatusMapped = {
    status: rawSyncStatus.syncStatus,
    lastSync: rawSyncStatus.lastSyncTime || null,
    error: rawSyncStatus.syncError || null,
    offlineQueueSize: rawSyncStatus.offlineQueueSize,
    isOnline: rawSyncStatus.isOnline
  }

  // =============================================================================
  // Smart Reply
  // =============================================================================

  const generateReply = useCallback(
    async (
      email: Email,
      tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
      instructions?: string
    ): Promise<string> => {
      if (!enabled) return ''

      setIsGeneratingReply(true)
      try {
        const draft = await openAIService.generateDraft({
          originalEmail: {
            from: email.from || '',
            subject: email.subject || '',
            body: email.body || ''
          },
          instructions: instructions || 'Reply appropriately to this email',
          tone
        })
        return draft
      } finally {
        setIsGeneratingReply(false)
      }
    },
    [enabled]
  )

  // =============================================================================
  // Summarization
  // =============================================================================

  const generateEmailSummary = useCallback(
    async (email: Email) => {
      if (!enabled) return { summary: '', keyPoints: [], actionItems: [] }

      setIsGeneratingSummary(true)
      try {
        const result = await openAIService.generateEmailSummary({
          from: email.from || '',
          subject: email.subject || '',
          body: email.body || ''
        })
        return {
          summary: result.content,
          keyPoints: result.keyPoints || [],
          actionItems: result.actionItems || []
        }
      } finally {
        setIsGeneratingSummary(false)
      }
    },
    [enabled]
  )

  const generateThreadSummary = useCallback(
    async (thread: EmailThread) => {
      if (!enabled) return { summary: '', keyPoints: [], actionItems: [] }

      setIsGeneratingSummary(true)
      try {
        const result = await openAIService.generateThreadSummary(thread)
        return {
          summary: result.content,
          keyPoints: result.keyPoints || [],
          actionItems: result.actionItems || []
        }
      } finally {
        setIsGeneratingSummary(false)
      }
    },
    [enabled]
  )

  const generateDailySummary = useCallback(
    async (emails: Email[]) => {
      if (!enabled) return { summary: '', urgent: [], actionRequired: [] }

      setIsGeneratingSummary(true)
      try {
        const result = await openAIService.generateDailySummary(emails)
        return {
          summary: result.content,
          urgent: result.keyPoints || [],
          actionRequired: result.actionItems || []
        }
      } finally {
        setIsGeneratingSummary(false)
      }
    },
    [enabled]
  )

  // =============================================================================
  // Auto-actions
  // =============================================================================

  const handleProcessAutoActions = useCallback(
    async (emails: Email[]) => {
      if (!enabled) return { autoExecuted: 0, queued: 0 }

      // Placeholder action executor - in production this would call real API
      const executeAction = async (emailId: string, action: string) => {
        console.log(`[AI Features] Would execute ${action} on ${emailId}`)
        // In production: await apiService.executeAction(emailId, action)
      }

      const result = await processAutoActions(emails, userId, executeAction)
      return {
        autoExecuted: result.autoExecuted,
        queued: result.queued.length
      }
    },
    [enabled, userId]
  )

  // =============================================================================
  // Sync
  // =============================================================================

  const triggerSync = useCallback(
    async (folderId?: string) => {
      if (!accountId) return

      if (folderId) {
        await emailSyncService.syncFolder(accountId, folderId)
      } else {
        await emailSyncService.syncAllFolders(accountId)
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['account-messages'] })
    },
    [accountId, queryClient]
  )

  // =============================================================================
  // Trust
  // =============================================================================

  const trustStage = trustProfile?.trustStage || 'training_wheels'
  const trustScore = trustProfile?.trustScore || 0

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // Smart Reply
    isGeneratingReply,
    generateReply,

    // Summarization
    isGeneratingSummary,
    generateEmailSummary,
    generateThreadSummary,
    generateDailySummary,

    // Auto-actions
    processAutoActions: handleProcessAutoActions,

    // Sync
    syncStatus: syncStatusMapped,
    triggerSync,

    // Trust
    trustStage,
    trustScore
  }
}

// =============================================================================
// Individual Feature Hooks (for more focused usage)
// =============================================================================

/**
 * Hook for just smart reply functionality
 */
export function useSmartReply() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReply = useCallback(
    async (
      email: Email,
      options?: {
        tone?: 'professional' | 'casual' | 'friendly' | 'formal'
        instructions?: string
      }
    ) => {
      setIsGenerating(true)
      try {
        const draft = await openAIService.generateDraft({
          originalEmail: {
            from: email.from || '',
            subject: email.subject || '',
            body: email.body || ''
          },
          instructions: options?.instructions || 'Reply appropriately',
          tone: options?.tone || 'professional'
        })
        return draft
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  return { isGenerating, generateReply }
}

/**
 * Hook for email summarization
 */
export function useEmailSummary(email: Email | null) {
  return useQuery({
    queryKey: ['email-summary', email?.id],
    queryFn: async () => {
      if (!email) return null
      return openAIService.generateEmailSummary({
        from: email.from || '',
        subject: email.subject || '',
        body: email.body || ''
      })
    },
    enabled: !!email,
    staleTime: 10 * 60 * 1000 // 10 minutes
  })
}

/**
 * Hook for thread summarization
 */
export function useThreadSummary(thread: EmailThread | null) {
  return useQuery({
    queryKey: ['thread-summary', thread?.id],
    queryFn: async () => {
      if (!thread) return null
      return openAIService.generateThreadSummary(thread)
    },
    enabled: !!thread,
    staleTime: 10 * 60 * 1000 // 10 minutes
  })
}

export default useAIFeatures
