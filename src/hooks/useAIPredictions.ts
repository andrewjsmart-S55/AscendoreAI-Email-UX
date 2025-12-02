/**
 * AI Predictions Hook
 *
 * Manages AI predictions for emails, integrating with:
 * - Ensemble predictor (Bayesian + LLM)
 * - Action Queue store
 * - Behavior tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Email, EmailThread } from '@/types/email'
import { PredictionResult, ActionQueueItem, AIActionType } from '@/types/ai'
import {
  ensemblePredictor,
  predictEmail,
  getSmartSuggestions,
  processAutoActions
} from '@/lib/ai/ensemble-predictor'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { useActionQueueStore } from '@/components/NG2/NG2ActionQueue'
import { logAIAction } from '@/stores/activityStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

interface UseAIPredictionsOptions {
  enabled?: boolean
  autoPredict?: boolean
  autoQueue?: boolean
}

interface UseAIPredictionsReturn {
  predictions: Map<string, PredictionResult>
  isLoading: boolean
  error: Error | null
  getPrediction: (emailId: string) => PredictionResult | undefined
  predictEmails: (emails: Email[]) => Promise<void>
  clearPredictions: () => void
  queuedCount: number
  autoExecutedCount: number
}

// =============================================================================
// Main Hook
// =============================================================================

export function useAIPredictions(
  emails: Email[] | undefined,
  options: UseAIPredictionsOptions = {}
): UseAIPredictionsReturn {
  const {
    enabled = true,
    autoPredict = true,
    autoQueue = true
  } = options

  const [predictions, setPredictions] = useState<Map<string, PredictionResult>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [autoExecutedCount, setAutoExecutedCount] = useState(0)

  const senderModels = useBehaviorStore(state => state.senderModels)
  const addItems = useActionQueueStore(state => state.addItems)
  const queueItems = useActionQueueStore(state => state.items)

  const user = ascendoreAuth.getUser()
  const userId = user?.id || 'anonymous'

  // Predict emails
  const predictEmails = useCallback(async (emailsToPredict: Email[]) => {
    if (!enabled || !emailsToPredict.length) return

    setIsLoading(true)
    setError(null)

    try {
      const results = await ensemblePredictor.predictBatch(
        emailsToPredict,
        userId,
        senderModels
      )

      setPredictions(results)

      // Auto-queue suggestions if enabled
      if (autoQueue) {
        const suggestions: ActionQueueItem[] = []

        results.forEach((prediction, emailId) => {
          const email = emailsToPredict.find(e => e.id === emailId)
          if (!email) return

          // Only queue if action is not 'keep' and has reasonable confidence
          if (
            prediction.finalPrediction.action !== 'keep' &&
            prediction.finalPrediction.confidence >= 0.4
          ) {
            suggestions.push(
              ensemblePredictor.createActionQueueItem(
                prediction,
                email,
                email.accountId || 'default'
              )
            )
          }
        })

        if (suggestions.length > 0) {
          addItems(suggestions)
        }
      }
    } catch (err) {
      console.error('[useAIPredictions] Error:', err)
      setError(err instanceof Error ? err : new Error('Prediction failed'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled, userId, senderModels, autoQueue, addItems])

  // Auto-predict when emails change
  useEffect(() => {
    if (autoPredict && emails && emails.length > 0) {
      // Only predict emails we haven't seen yet
      const newEmails = emails.filter(e => !predictions.has(e.id))
      if (newEmails.length > 0) {
        predictEmails(newEmails)
      }
    }
  }, [emails, autoPredict, predictEmails, predictions])

  // Get prediction for a specific email
  const getPrediction = useCallback((emailId: string): PredictionResult | undefined => {
    return predictions.get(emailId)
  }, [predictions])

  // Clear all predictions
  const clearPredictions = useCallback(() => {
    setPredictions(new Map())
    ensemblePredictor.clearCache()
  }, [])

  // Count queued items
  const queuedCount = useMemo(() => {
    return queueItems.filter(i => i.status === 'pending').length
  }, [queueItems])

  return {
    predictions,
    isLoading,
    error,
    getPrediction,
    predictEmails,
    clearPredictions,
    queuedCount,
    autoExecutedCount
  }
}

// =============================================================================
// Single Email Prediction Hook
// =============================================================================

export function useEmailPrediction(email: Email | null) {
  const senderModels = useBehaviorStore(state => state.senderModels)
  const user = ascendoreAuth.getUser()
  const userId = user?.id || 'anonymous'

  return useQuery({
    queryKey: ['email-prediction', email?.id, userId],
    queryFn: async () => {
      if (!email) return null

      const senderEmail = email.from?.toLowerCase() || ''
      const senderId = `sender_${senderEmail.replace(/[^a-z0-9]/g, '_')}`
      const senderModel = senderModels.get(senderId) || null

      return ensemblePredictor.predict(email, userId, senderModel)
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000
  })
}

// =============================================================================
// Apply Prediction Mutation
// =============================================================================

export function useApplyPrediction() {
  const queryClient = useQueryClient()
  const updateStatus = useActionQueueStore(state => state.updateStatus)
  const updateTrustFromAction = useBehaviorStore(state => state.updateTrustFromAction)
  const user = ascendoreAuth.getUser()

  return useMutation({
    mutationFn: async ({
      prediction,
      action,
      executeAction,
      emailSubject
    }: {
      prediction: PredictionResult
      action: AIActionType
      executeAction: (emailId: string, action: AIActionType) => Promise<void>
      emailSubject?: string
    }) => {
      await executeAction(prediction.emailId, action)

      // Log the AI action
      if (user?.id) {
        logAIAction(
          'approved',
          user.id,
          `Applied AI suggestion: ${action}`,
          {
            id: prediction.predictionId,
            emailId: prediction.emailId,
            emailSubject: emailSubject || '(no subject)',
            confidence: prediction.finalPrediction.confidence
          },
          'default'
        )
      }

      return { prediction, action }
    },
    onSuccess: ({ prediction, action }) => {
      // Update trust based on whether user modified the action
      if (action === prediction.finalPrediction.action) {
        updateTrustFromAction('approved')
      } else {
        updateTrustFromAction('modified')
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['account-messages'] })
    }
  })
}

// =============================================================================
// Thread Predictions Hook
// =============================================================================

export function useThreadPredictions(threads: EmailThread[] | undefined) {
  const emails = useMemo(() => {
    if (!threads) return []
    return threads.flatMap(thread => thread.emails || [])
  }, [threads])

  return useAIPredictions(emails, {
    autoPredict: true,
    autoQueue: true
  })
}

// =============================================================================
// Export Utility
// =============================================================================

export { predictEmail, getSmartSuggestions, processAutoActions }
