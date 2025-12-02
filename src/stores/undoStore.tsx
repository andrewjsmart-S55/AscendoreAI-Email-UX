'use client'

/**
 * Undo Store - Email Action Undo System
 *
 * Provides 30-day undo capability for email actions:
 * - Archive, Delete, Star, Move
 * - AI auto-actions
 * - Batch operations
 */

import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'react-hot-toast'
import { apiService } from '@/lib/api'

// =============================================================================
// Types
// =============================================================================

export type UndoableActionType =
  | 'archive'
  | 'delete'
  | 'star'
  | 'unstar'
  | 'move'
  | 'label'
  | 'mark_read'
  | 'mark_unread'
  | 'snooze'
  | 'batch_archive'
  | 'batch_delete'
  | 'ai_auto_action'

export interface UndoableAction {
  /** Unique action ID */
  id: string

  /** Type of action */
  type: UndoableActionType

  /** Email ID affected */
  emailId: string

  /** Thread ID if applicable */
  threadId?: string

  /** Account ID */
  accountId: string

  /** Description for display */
  description: string

  /** Data needed to reverse the action */
  undoData: {
    originalFolder?: string
    originalLabels?: string[]
    originalIsRead?: boolean
    originalIsStarred?: boolean
    snoozeUntil?: string
    batchEmailIds?: string[]
    previousState?: Record<string, any>
  }

  /** When action was performed */
  performedAt: string

  /** When undo expires (30 days) */
  expiresAt: string

  /** Has this action been undone? */
  isUndone: boolean

  /** User who performed action */
  userId: string
}

interface UndoState {
  // Data
  actions: UndoableAction[]

  // Methods
  pushAction: (action: Omit<UndoableAction, 'id' | 'performedAt' | 'expiresAt' | 'isUndone'>) => UndoableAction
  undoAction: (actionId: string) => Promise<boolean>
  undoLatest: () => Promise<boolean>
  getLatestUndoable: () => UndoableAction | null
  getUndoableActions: (limit?: number) => UndoableAction[]
  cleanupExpired: () => void
  clearAll: () => void
}

// =============================================================================
// Constants
// =============================================================================

const UNDO_RETENTION_DAYS = 30
const MAX_UNDO_ACTIONS = 1000

// =============================================================================
// Store
// =============================================================================

export const useUndoStore = create<UndoState>()(
  persist(
    (set, get) => ({
      actions: [],

      pushAction: (actionData) => {
        const now = new Date()
        const expiresAt = new Date(now.getTime() + UNDO_RETENTION_DAYS * 24 * 60 * 60 * 1000)

        const action: UndoableAction = {
          ...actionData,
          id: `undo_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`,
          performedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          isUndone: false
        }

        set((state) => ({
          actions: [action, ...state.actions].slice(0, MAX_UNDO_ACTIONS)
        }))

        // Show undo toast
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span>{action.description}</span>
              <button
                onClick={() => {
                  get().undoAction(action.id)
                  toast.dismiss(t.id)
                }}
                className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 font-medium"
              >
                Undo
              </button>
            </div>
          ),
          {
            duration: 5000,
            style: { background: '#1f2937', color: '#fff' }
          }
        )

        return action
      },

      undoAction: async (actionId) => {
        const state = get()
        const action = state.actions.find((a) => a.id === actionId)

        if (!action || action.isUndone) {
          return false
        }

        // Check expiration
        if (new Date(action.expiresAt) < new Date()) {
          toast.error('This action can no longer be undone')
          return false
        }

        try {
          // Execute the actual undo operation based on action type
          // This would integrate with your email API
          await executeUndo(action)

          // Mark as undone
          set((state) => ({
            actions: state.actions.map((a) =>
              a.id === actionId ? { ...a, isUndone: true } : a
            )
          }))

          toast.success(`Undone: ${action.description}`)
          return true
        } catch (err) {
          console.error('[UndoStore] Failed to undo:', err)
          toast.error('Failed to undo action')
          return false
        }
      },

      undoLatest: async () => {
        const latest = get().getLatestUndoable()
        if (!latest) {
          toast.error('Nothing to undo')
          return false
        }
        return get().undoAction(latest.id)
      },

      getLatestUndoable: () => {
        const now = new Date()
        return (
          get().actions.find(
            (a) => !a.isUndone && new Date(a.expiresAt) > now
          ) || null
        )
      },

      getUndoableActions: (limit = 10) => {
        const now = new Date()
        return get()
          .actions.filter((a) => !a.isUndone && new Date(a.expiresAt) > now)
          .slice(0, limit)
      },

      cleanupExpired: () => {
        const now = new Date()
        set((state) => ({
          actions: state.actions.filter(
            (a) => new Date(a.expiresAt) > now || a.isUndone
          )
        }))
      },

      clearAll: () => {
        set({ actions: [] })
      }
    }),
    {
      name: 'boxzero-undo',
      version: 1
    }
  )
)

// =============================================================================
// Execute Undo (API Integration)
// =============================================================================

async function executeUndo(action: UndoableAction): Promise<void> {
  const originalFolder = action.undoData.originalFolder || 'INBOX'

  switch (action.type) {
    case 'archive':
      // Move email back from archive to original folder
      console.log(`[Undo] Moving ${action.emailId} back from archive to ${originalFolder}`)
      await apiService.unarchiveEmail(action.emailId, originalFolder)
      break

    case 'delete':
      // Restore from trash
      console.log(`[Undo] Restoring ${action.emailId} from trash to ${originalFolder}`)
      await apiService.restoreFromTrash(action.emailId, originalFolder)
      break

    case 'star':
      // Unstar the email
      console.log(`[Undo] Unstarring ${action.emailId}`)
      await apiService.markEmailAsStarred(action.emailId, false)
      break

    case 'unstar':
      // Re-star the email
      console.log(`[Undo] Re-starring ${action.emailId}`)
      await apiService.markEmailAsStarred(action.emailId, true)
      break

    case 'move':
      // Move back to original folder
      console.log(`[Undo] Moving ${action.emailId} back to ${originalFolder}`)
      await apiService.moveEmail(action.emailId, originalFolder)
      break

    case 'label':
      // Restore original labels
      console.log(`[Undo] Restoring labels on ${action.emailId}`)
      if (action.undoData.originalLabels) {
        await apiService.updateEmailLabels(action.emailId, action.undoData.originalLabels)
      }
      break

    case 'mark_read':
      // Mark as unread
      console.log(`[Undo] Marking ${action.emailId} as unread`)
      await apiService.markEmailAsUnread(action.emailId)
      break

    case 'mark_unread':
      // Mark as read
      console.log(`[Undo] Marking ${action.emailId} as read`)
      await apiService.markEmailAsRead(action.emailId)
      break

    case 'snooze':
      // Unsnooze the email
      console.log(`[Undo] Unsnoozing ${action.emailId}`)
      await apiService.unsnoozeEmail(action.emailId)
      break

    case 'batch_archive':
    case 'batch_delete':
      // Undo batch operation - restore all emails
      const emailIds = action.undoData.batchEmailIds || []
      console.log(`[Undo] Restoring batch of ${emailIds.length} emails to ${originalFolder}`)
      await apiService.batchRestoreEmails(emailIds, originalFolder)
      break

    case 'ai_auto_action':
      // Undo AI action - restore previous state based on what the AI did
      console.log(`[Undo] Reverting AI action on ${action.emailId}`)
      const prevState = action.undoData.previousState
      if (prevState) {
        // Determine what action to reverse based on previousState
        if (prevState.wasArchived === false) {
          await apiService.unarchiveEmail(action.emailId, originalFolder)
        } else if (prevState.wasDeleted === false) {
          await apiService.restoreFromTrash(action.emailId, originalFolder)
        } else if (prevState.wasStarred !== undefined) {
          await apiService.markEmailAsStarred(action.emailId, prevState.wasStarred)
        } else if (prevState.wasRead !== undefined) {
          if (prevState.wasRead) {
            await apiService.markEmailAsRead(action.emailId)
          } else {
            await apiService.markEmailAsUnread(action.emailId)
          }
        } else if (prevState.folder) {
          await apiService.moveEmail(action.emailId, prevState.folder)
        }
      }
      break

    default:
      throw new Error(`Unknown undo action type: ${action.type}`)
  }
}

// =============================================================================
// Helper Hook for Easy Undo Integration
// =============================================================================

export function useUndoableAction() {
  const pushAction = useUndoStore((state) => state.pushAction)
  const undoLatest = useUndoStore((state) => state.undoLatest)

  const createUndoableAction = (
    type: UndoableActionType,
    emailId: string,
    accountId: string,
    description: string,
    undoData: UndoableAction['undoData'],
    userId: string
  ) => {
    return pushAction({
      type,
      emailId,
      accountId,
      description,
      undoData,
      userId
    })
  }

  return {
    createUndoableAction,
    undoLatest
  }
}

// =============================================================================
// Keyboard Shortcut Integration
// =============================================================================

export function setupUndoKeyboardShortcut() {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Z or Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Don't trigger in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      e.preventDefault()
      useUndoStore.getState().undoLatest()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}
