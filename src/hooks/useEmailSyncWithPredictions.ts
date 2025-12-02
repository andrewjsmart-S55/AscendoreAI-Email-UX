/**
 * Email Sync with AI Predictions Hook
 *
 * Integrates email sync with the AI prediction pipeline:
 * - Automatically runs predictions on new emails
 * - Populates the action queue
 * - Handles auto-actions based on trust level
 * - Real-time notification support
 */

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Email } from '@/types/email'
import { PredictionResult, ActionQueueItem } from '@/types/ai'
import { ensemblePredictor } from '@/lib/ai/ensemble-predictor'
import { useActionQueueStore } from '@/components/NG2/NG2ActionQueue'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useActivityStore, logEmailAction, logAIAction } from '@/stores/activityStore'
import { useUndoStore } from '@/stores/undoStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

interface EmailSyncEvent {
  type: 'new_emails' | 'updated_emails' | 'deleted_emails'
  emails: Email[]
  accountId: string
  timestamp: string
}

interface UseEmailSyncWithPredictionsOptions {
  enabled?: boolean
  onNewEmails?: (emails: Email[], predictions: Map<string, PredictionResult>) => void
  onAutoAction?: (email: Email, action: string) => void
  onHighPriorityEmail?: (email: Email) => void
}

interface UseEmailSyncWithPredictionsReturn {
  processSyncedEmails: (emails: Email[], accountId: string) => Promise<void>
  isProcessing: boolean
  pendingCount: number
  autoActionsCount: number
}

// =============================================================================
// Main Hook
// =============================================================================

export function useEmailSyncWithPredictions(
  options: UseEmailSyncWithPredictionsOptions = {}
): UseEmailSyncWithPredictionsReturn {
  const {
    enabled = true,
    onNewEmails,
    onAutoAction,
    onHighPriorityEmail
  } = options

  const isProcessingRef = useRef(false)
  const processedEmailsRef = useRef<Set<string>>(new Set())
  const autoActionsCountRef = useRef(0)

  const queryClient = useQueryClient()
  const user = ascendoreAuth.getUser()
  const userId = user?.id || 'anonymous'

  // Stores
  const senderModels = useBehaviorStore((state) => state.senderModels)
  const trustProfile = useBehaviorStore((state) => state.trustProfile)
  const addQueueItems = useActionQueueStore((state) => state.addItems)
  const queueItems = useActionQueueStore((state) => state.items)
  const aiSettings = useSettingsStore((state) => state.ai)
  const notificationSettings = useSettingsStore((state) => state.notifications)
  const pushUndoAction = useUndoStore((state) => state.pushAction)

  // Count pending items
  const pendingCount = queueItems.filter((i) => i.status === 'pending').length

  // Check if we should auto-execute based on trust level
  const shouldAutoExecute = useCallback(
    (prediction: PredictionResult): boolean => {
      if (!aiSettings.enabled) return false

      const confidence = prediction.finalPrediction.confidence
      const action = prediction.finalPrediction.action

      // Check if action is in allowed auto-actions
      const allowedActions = aiSettings.allowedAutoActions as string[]
      if (!allowedActions.includes(action)) return false

      // Check confidence threshold
      if (confidence < aiSettings.autoActionThreshold) return false

      // Check trust-based threshold
      const trustThreshold = trustProfile?.autoApproveThreshold || 0.95
      if (confidence < trustThreshold) return false

      return true
    },
    [aiSettings, trustProfile]
  )

  // Process synced emails through AI pipeline
  const processSyncedEmails = useCallback(
    async (emails: Email[], accountId: string) => {
      if (!enabled || isProcessingRef.current || emails.length === 0) {
        return
      }

      // Filter out already processed emails
      const newEmails = emails.filter(
        (e) => !processedEmailsRef.current.has(e.id)
      )

      if (newEmails.length === 0) return

      isProcessingRef.current = true

      try {
        console.log(`[EmailSync] Processing ${newEmails.length} new emails for predictions`)

        // Run predictions in batches
        const predictions = await ensemblePredictor.predictBatch(
          newEmails,
          userId,
          senderModels
        )

        // Mark as processed
        newEmails.forEach((e) => processedEmailsRef.current.add(e.id))

        // Prepare queue items and auto-actions
        const queueItemsToAdd: ActionQueueItem[] = []
        const autoActions: { email: Email; prediction: PredictionResult }[] = []
        const highPriorityEmails: Email[] = []

        predictions.forEach((prediction, emailId) => {
          const email = newEmails.find((e) => e.id === emailId)
          if (!email) return

          // Check for high-priority emails (urgent)
          if (
            prediction.tier3Prediction?.classification?.intent === 'action_required' ||
            prediction.tier3Prediction?.classification?.intent === 'request'
          ) {
            highPriorityEmails.push(email)
          }

          // Skip 'keep' actions
          if (prediction.finalPrediction.action === 'keep') return

          // Check for auto-execution
          if (shouldAutoExecute(prediction)) {
            autoActions.push({ email, prediction })
          } else if (prediction.finalPrediction.confidence >= 0.4) {
            // Add to queue for review
            queueItemsToAdd.push(
              ensemblePredictor.createActionQueueItem(
                prediction,
                email,
                accountId
              )
            )
          }
        })

        // Add items to queue
        if (queueItemsToAdd.length > 0) {
          addQueueItems(queueItemsToAdd)
          console.log(`[EmailSync] Added ${queueItemsToAdd.length} items to action queue`)
        }

        // Execute auto-actions
        for (const { email, prediction } of autoActions) {
          await executeAutoAction(email, prediction, accountId)
          autoActionsCountRef.current++
          onAutoAction?.(email, prediction.finalPrediction.action)
        }

        // Notify about high-priority emails
        highPriorityEmails.forEach((email) => {
          onHighPriorityEmail?.(email)

          // Desktop notification if enabled
          if (notificationSettings.urgentEmailNotifications) {
            showDesktopNotification(email)
          }
        })

        // Callback with results
        onNewEmails?.(newEmails, predictions)

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['emails'] })
        queryClient.invalidateQueries({ queryKey: ['account-messages'] })
      } catch (err) {
        console.error('[EmailSync] Error processing emails:', err)
      } finally {
        isProcessingRef.current = false
      }
    },
    [
      enabled,
      userId,
      senderModels,
      shouldAutoExecute,
      addQueueItems,
      notificationSettings,
      onNewEmails,
      onAutoAction,
      onHighPriorityEmail,
      queryClient
    ]
  )

  // Execute an auto-action
  const executeAutoAction = async (
    email: Email,
    prediction: PredictionResult,
    accountId: string
  ) => {
    const action = prediction.finalPrediction.action

    try {
      // Log the auto-action
      logAIAction(
        'auto_executed',
        userId,
        `Auto-${action}: "${email.subject}"`,
        {
          id: prediction.predictionId,
          emailId: email.id,
          emailSubject: email.subject || '(no subject)',
          confidence: prediction.finalPrediction.confidence
        },
        accountId
      )

      // Create undo action
      pushUndoAction({
        type: 'ai_auto_action',
        emailId: email.id,
        accountId,
        description: `AI auto-${action}: ${email.subject?.substring(0, 30)}...`,
        undoData: {
          originalFolder: email.folder,
          previousState: {
            isRead: email.isRead,
            isStarred: email.isStarred,
            folder: email.folder
          }
        },
        userId
      })

      // Execute the action (integrate with your email API)
      console.log(`[EmailSync] Auto-executing ${action} on email ${email.id}`)

      // TODO: Call actual API
      // switch (action) {
      //   case 'archive':
      //     await emailApi.archive(email.id)
      //     break
      //   case 'delete':
      //     await emailApi.delete(email.id)
      //     break
      //   case 'mark_read':
      //     await emailApi.updateEmail(email.id, { isRead: true })
      //     break
      // }
    } catch (err) {
      console.error(`[EmailSync] Failed to auto-execute ${action}:`, err)
    }
  }

  return {
    processSyncedEmails,
    isProcessing: isProcessingRef.current,
    pendingCount,
    autoActionsCount: autoActionsCountRef.current
  }
}

// =============================================================================
// Desktop Notifications
// =============================================================================

function showDesktopNotification(email: Email) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification('High Priority Email', {
      body: `From: ${email.from}\n${email.subject}`,
      icon: '/icons/boxzero-icon.png',
      tag: email.id
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showDesktopNotification(email)
      }
    })
  }
}

// =============================================================================
// Real-time Sync Hook (WebSocket/Polling)
// =============================================================================

interface UseRealtimeSyncOptions {
  accountId?: string
  enabled?: boolean
  pollingInterval?: number // ms
  onSyncEvent?: (event: EmailSyncEvent) => void
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const {
    accountId,
    enabled = true,
    pollingInterval = 30000, // 30 seconds
    onSyncEvent
  } = options

  const queryClient = useQueryClient()
  const lastSyncRef = useRef<string>(new Date().toISOString())

  // Poll for new emails
  useEffect(() => {
    if (!enabled || !accountId) return

    const pollForUpdates = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await emailApi.checkForUpdates(accountId, lastSyncRef.current)
        // if (response.hasUpdates) {
        //   lastSyncRef.current = new Date().toISOString()
        //   onSyncEvent?.({
        //     type: 'new_emails',
        //     emails: response.newEmails,
        //     accountId,
        //     timestamp: lastSyncRef.current
        //   })
        //   queryClient.invalidateQueries({ queryKey: ['account-messages', accountId] })
        // }
      } catch (err) {
        console.error('[RealtimeSync] Polling error:', err)
      }
    }

    const interval = setInterval(pollForUpdates, pollingInterval)
    pollForUpdates() // Initial poll

    return () => clearInterval(interval)
  }, [enabled, accountId, pollingInterval, onSyncEvent, queryClient])

  return {
    lastSync: lastSyncRef.current
  }
}

// =============================================================================
// Notification Permission Hook
// =============================================================================

export function useNotificationPermission() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Desktop notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast.success('Desktop notifications enabled')
        return true
      }
    }

    toast.error('Notification permission denied')
    return false
  }, [])

  return {
    permission: typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied',
    requestPermission
  }
}
