'use client'

/**
 * NG2 Bulk Actions Panel
 *
 * Multi-select email management with:
 * - Selection state management
 * - Batch operations (archive, delete, label, etc.)
 * - Progress tracking
 * - Undo support
 * - Keyboard shortcuts
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckIcon,
  XMarkIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EnvelopeOpenIcon,
  EnvelopeIcon,
  TagIcon,
  StarIcon,
  FolderIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { create } from 'zustand'

// =============================================================================
// Types
// =============================================================================

export type BulkAction =
  | 'archive'
  | 'delete'
  | 'mark_read'
  | 'mark_unread'
  | 'star'
  | 'unstar'
  | 'label'
  | 'move'
  | 'snooze'

export interface SelectedEmail {
  id: string
  threadId: string
  subject: string
  isRead: boolean
  isStarred: boolean
  labels: string[]
}

export interface BulkOperation {
  id: string
  action: BulkAction
  emailIds: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'undone'
  progress: number // 0-100
  error?: string
  timestamp: number
  canUndo: boolean
  undoDeadline?: number
}

// =============================================================================
// Selection Store
// =============================================================================

interface SelectionStore {
  selectedIds: Set<string>
  selectedEmails: Map<string, SelectedEmail>
  isSelectMode: boolean
  lastSelectedId: string | null

  // Actions
  select: (email: SelectedEmail) => void
  deselect: (id: string) => void
  toggleSelection: (email: SelectedEmail) => void
  selectRange: (emails: SelectedEmail[], targetId: string) => void
  selectAll: (emails: SelectedEmail[]) => void
  deselectAll: () => void
  toggleSelectMode: () => void
  exitSelectMode: () => void
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedIds: new Set(),
  selectedEmails: new Map(),
  isSelectMode: false,
  lastSelectedId: null,

  select: (email) => {
    set(state => {
      const newIds = new Set(state.selectedIds)
      const newEmails = new Map(state.selectedEmails)
      newIds.add(email.id)
      newEmails.set(email.id, email)
      return {
        selectedIds: newIds,
        selectedEmails: newEmails,
        lastSelectedId: email.id,
        isSelectMode: true
      }
    })
  },

  deselect: (id) => {
    set(state => {
      const newIds = new Set(state.selectedIds)
      const newEmails = new Map(state.selectedEmails)
      newIds.delete(id)
      newEmails.delete(id)
      return {
        selectedIds: newIds,
        selectedEmails: newEmails,
        isSelectMode: newIds.size > 0
      }
    })
  },

  toggleSelection: (email) => {
    const { selectedIds } = get()
    if (selectedIds.has(email.id)) {
      get().deselect(email.id)
    } else {
      get().select(email)
    }
  },

  selectRange: (emails, targetId) => {
    const { lastSelectedId, selectedIds, selectedEmails } = get()
    if (!lastSelectedId) {
      const targetEmail = emails.find(e => e.id === targetId)
      if (targetEmail) get().select(targetEmail)
      return
    }

    const lastIndex = emails.findIndex(e => e.id === lastSelectedId)
    const targetIndex = emails.findIndex(e => e.id === targetId)

    if (lastIndex === -1 || targetIndex === -1) return

    const start = Math.min(lastIndex, targetIndex)
    const end = Math.max(lastIndex, targetIndex)

    const newIds = new Set(selectedIds)
    const newEmails = new Map(selectedEmails)

    for (let i = start; i <= end; i++) {
      newIds.add(emails[i].id)
      newEmails.set(emails[i].id, emails[i])
    }

    set({
      selectedIds: newIds,
      selectedEmails: newEmails,
      isSelectMode: true
    })
  },

  selectAll: (emails) => {
    const newIds = new Set<string>()
    const newEmails = new Map<string, SelectedEmail>()

    emails.forEach(email => {
      newIds.add(email.id)
      newEmails.set(email.id, email)
    })

    set({
      selectedIds: newIds,
      selectedEmails: newEmails,
      isSelectMode: true
    })
  },

  deselectAll: () => {
    set({
      selectedIds: new Set(),
      selectedEmails: new Map(),
      lastSelectedId: null
    })
  },

  toggleSelectMode: () => {
    set(state => ({
      isSelectMode: !state.isSelectMode,
      selectedIds: state.isSelectMode ? new Set() : state.selectedIds,
      selectedEmails: state.isSelectMode ? new Map() : state.selectedEmails
    }))
  },

  exitSelectMode: () => {
    set({
      isSelectMode: false,
      selectedIds: new Set(),
      selectedEmails: new Map(),
      lastSelectedId: null
    })
  }
}))

// =============================================================================
// Operations Store
// =============================================================================

interface OperationsStore {
  operations: BulkOperation[]
  currentOperation: BulkOperation | null

  // Actions
  startOperation: (action: BulkAction, emailIds: string[]) => BulkOperation
  updateProgress: (operationId: string, progress: number) => void
  completeOperation: (operationId: string) => void
  failOperation: (operationId: string, error: string) => void
  undoOperation: (operationId: string) => void
  clearCompletedOperations: () => void
}

export const useOperationsStore = create<OperationsStore>((set, get) => ({
  operations: [],
  currentOperation: null,

  startOperation: (action, emailIds) => {
    const operation: BulkOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      emailIds,
      status: 'pending',
      progress: 0,
      timestamp: Date.now(),
      canUndo: ['archive', 'delete', 'mark_read', 'mark_unread', 'star', 'unstar', 'label'].includes(action),
      undoDeadline: Date.now() + 10000 // 10 seconds to undo
    }

    set(state => ({
      operations: [operation, ...state.operations].slice(0, 20),
      currentOperation: operation
    }))

    return operation
  },

  updateProgress: (operationId, progress) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === operationId
          ? { ...op, progress, status: 'in_progress' as const }
          : op
      ),
      currentOperation: state.currentOperation?.id === operationId
        ? { ...state.currentOperation, progress, status: 'in_progress' as const }
        : state.currentOperation
    }))
  },

  completeOperation: (operationId) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === operationId
          ? { ...op, status: 'completed' as const, progress: 100 }
          : op
      ),
      currentOperation: state.currentOperation?.id === operationId
        ? null
        : state.currentOperation
    }))
  },

  failOperation: (operationId, error) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === operationId
          ? { ...op, status: 'failed' as const, error }
          : op
      ),
      currentOperation: state.currentOperation?.id === operationId
        ? null
        : state.currentOperation
    }))
  },

  undoOperation: (operationId) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === operationId
          ? { ...op, status: 'undone' as const }
          : op
      )
    }))
  },

  clearCompletedOperations: () => {
    set(state => ({
      operations: state.operations.filter(op =>
        op.status !== 'completed' && op.status !== 'undone'
      )
    }))
  }
}))

// =============================================================================
// Action Button
// =============================================================================

interface ActionButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  shortcut?: string
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled,
  shortcut
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'text-red-400 hover:bg-red-500/20'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden md:inline">{label}</span>
      {shortcut && (
        <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

// =============================================================================
// Progress Toast
// =============================================================================

interface ProgressToastProps {
  operation: BulkOperation
  onUndo?: () => void
  onDismiss: () => void
}

function ProgressToast({ operation, onUndo, onDismiss }: ProgressToastProps) {
  const [timeLeft, setTimeLeft] = useState(10)

  useEffect(() => {
    if (operation.status !== 'completed' || !operation.canUndo) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [operation.status, operation.canUndo, onDismiss])

  const actionLabels: Record<BulkAction, string> = {
    archive: 'Archiving',
    delete: 'Deleting',
    mark_read: 'Marking as read',
    mark_unread: 'Marking as unread',
    star: 'Starring',
    unstar: 'Unstarring',
    label: 'Labeling',
    move: 'Moving',
    snooze: 'Snoozing'
  }

  const completedLabels: Record<BulkAction, string> = {
    archive: 'Archived',
    delete: 'Deleted',
    mark_read: 'Marked as read',
    mark_unread: 'Marked as unread',
    star: 'Starred',
    unstar: 'Unstarred',
    label: 'Labeled',
    move: 'Moved',
    snooze: 'Snoozed'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className={`flex items-center gap-3 p-3 rounded-lg shadow-xl border ${
        operation.status === 'failed'
          ? 'bg-red-900/90 border-red-700'
          : operation.status === 'completed'
            ? 'bg-green-900/90 border-green-700'
            : 'bg-gray-800/90 border-gray-700'
      }`}
    >
      {/* Icon */}
      {operation.status === 'in_progress' && (
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      )}
      {operation.status === 'completed' && (
        <CheckCircleIcon className="w-5 h-5 text-green-400" />
      )}
      {operation.status === 'failed' && (
        <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          {operation.status === 'completed'
            ? completedLabels[operation.action]
            : actionLabels[operation.action]}{' '}
          {operation.emailIds.length} email{operation.emailIds.length !== 1 ? 's' : ''}
        </p>

        {operation.status === 'in_progress' && (
          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${operation.progress}%` }}
            />
          </div>
        )}

        {operation.status === 'failed' && operation.error && (
          <p className="text-xs text-red-300 mt-1">{operation.error}</p>
        )}
      </div>

      {/* Actions */}
      {operation.status === 'completed' && operation.canUndo && onUndo && (
        <button
          onClick={onUndo}
          className="flex items-center gap-1 px-2 py-1 text-sm text-white hover:bg-white/10 rounded transition-colors"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
          Undo ({timeLeft}s)
        </button>
      )}

      <button
        onClick={onDismiss}
        className="p-1 text-gray-400 hover:text-white rounded transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// =============================================================================
// Bulk Actions Bar
// =============================================================================

interface BulkActionsBarProps {
  onArchive: (ids: string[]) => Promise<void>
  onDelete: (ids: string[]) => Promise<void>
  onMarkRead: (ids: string[]) => Promise<void>
  onMarkUnread: (ids: string[]) => Promise<void>
  onStar: (ids: string[]) => Promise<void>
  onUnstar: (ids: string[]) => Promise<void>
  onLabel: (ids: string[], labelId: string) => Promise<void>
  onMove: (ids: string[], folderId: string) => Promise<void>
  availableLabels?: { id: string; name: string; color?: string }[]
  availableFolders?: { id: string; name: string }[]
  className?: string
}

export function BulkActionsBar({
  onArchive,
  onDelete,
  onMarkRead,
  onMarkUnread,
  onStar,
  onUnstar,
  onLabel,
  onMove,
  availableLabels = [],
  availableFolders = [],
  className = ''
}: BulkActionsBarProps) {
  const {
    selectedIds,
    selectedEmails,
    isSelectMode,
    deselectAll,
    exitSelectMode
  } = useSelectionStore()

  const {
    operations,
    currentOperation,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    undoOperation
  } = useOperationsStore()

  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showToast, setShowToast] = useState<BulkOperation | null>(null)

  const selectedCount = selectedIds.size
  const selectedArray = Array.from(selectedIds)

  // Check selection states
  const selectionState = useMemo(() => {
    const emails = Array.from(selectedEmails.values())
    const allRead = emails.every(e => e.isRead)
    const allUnread = emails.every(e => !e.isRead)
    const allStarred = emails.every(e => e.isStarred)
    const allUnstarred = emails.every(e => !e.isStarred)

    return { allRead, allUnread, allStarred, allUnstarred }
  }, [selectedEmails])

  // Execute bulk action
  const executeBulkAction = useCallback(async (
    action: BulkAction,
    handler: (ids: string[]) => Promise<void>
  ) => {
    const operation = startOperation(action, selectedArray)
    setShowToast(operation)

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        updateProgress(operation.id, i)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await handler(selectedArray)
      completeOperation(operation.id)
      deselectAll()
    } catch (error) {
      failOperation(operation.id, error instanceof Error ? error.message : 'Operation failed')
    }
  }, [selectedArray, startOperation, updateProgress, completeOperation, failOperation, deselectAll])

  // Handle undo
  const handleUndo = useCallback((operationId: string) => {
    undoOperation(operationId)
    setShowToast(null)
    // In a real implementation, this would reverse the action
  }, [undoOperation])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isSelectMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          exitSelectMode()
          break
        case 'a':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            // Select all would need access to all emails
          }
          break
        case 'e':
          if (!e.metaKey && !e.ctrlKey && selectedCount > 0) {
            executeBulkAction('archive', onArchive)
          }
          break
        case '#':
        case 'Delete':
          if (selectedCount > 0) {
            executeBulkAction('delete', onDelete)
          }
          break
        case 'r':
          if (!e.metaKey && !e.ctrlKey && selectedCount > 0) {
            if (selectionState.allRead) {
              executeBulkAction('mark_unread', onMarkUnread)
            } else {
              executeBulkAction('mark_read', onMarkRead)
            }
          }
          break
        case 's':
          if (!e.metaKey && !e.ctrlKey && selectedCount > 0) {
            if (selectionState.allStarred) {
              executeBulkAction('unstar', onUnstar)
            } else {
              executeBulkAction('star', onStar)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelectMode, selectedCount, selectionState, exitSelectMode, executeBulkAction, onArchive, onDelete, onMarkRead, onMarkUnread, onStar, onUnstar])

  if (!isSelectMode || selectedCount === 0) return null

  return (
    <>
      {/* Actions Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className={`flex items-center justify-between px-4 py-2 bg-purple-900/50 border-b border-purple-700/50 ${className}`}
      >
        <div className="flex items-center gap-3">
          {/* Selection info */}
          <div className="flex items-center gap-2">
            <button
              onClick={deselectAll}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <span className="text-sm text-white font-medium">
              {selectedCount} selected
            </span>
          </div>

          <div className="w-px h-6 bg-gray-600" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ActionButton
              icon={ArchiveBoxIcon}
              label="Archive"
              shortcut="E"
              onClick={() => executeBulkAction('archive', onArchive)}
            />

            <ActionButton
              icon={TrashIcon}
              label="Delete"
              shortcut="#"
              variant="danger"
              onClick={() => executeBulkAction('delete', onDelete)}
            />

            {selectionState.allRead ? (
              <ActionButton
                icon={EnvelopeIcon}
                label="Unread"
                shortcut="R"
                onClick={() => executeBulkAction('mark_unread', onMarkUnread)}
              />
            ) : (
              <ActionButton
                icon={EnvelopeOpenIcon}
                label="Read"
                shortcut="R"
                onClick={() => executeBulkAction('mark_read', onMarkRead)}
              />
            )}

            {selectionState.allStarred ? (
              <ActionButton
                icon={StarIconSolid}
                label="Unstar"
                shortcut="S"
                onClick={() => executeBulkAction('unstar', onUnstar)}
              />
            ) : (
              <ActionButton
                icon={StarIcon}
                label="Star"
                shortcut="S"
                onClick={() => executeBulkAction('star', onStar)}
              />
            )}

            {/* Label dropdown */}
            <div className="relative">
              <ActionButton
                icon={TagIcon}
                label="Label"
                onClick={() => setShowLabelMenu(!showLabelMenu)}
              />

              <AnimatePresence>
                {showLabelMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1"
                  >
                    {availableLabels.map(label => (
                      <button
                        key={label.id}
                        onClick={() => {
                          executeBulkAction('label', (ids) => onLabel(ids, label.id))
                          setShowLabelMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color || '#6B7280' }}
                        />
                        {label.name}
                      </button>
                    ))}
                    {availableLabels.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">No labels</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Move dropdown */}
            <div className="relative">
              <ActionButton
                icon={FolderIcon}
                label="Move"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
              />

              <AnimatePresence>
                {showMoveMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1"
                  >
                    {availableFolders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          executeBulkAction('move', (ids) => onMove(ids, folder.id))
                          setShowMoveMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                      >
                        <FolderIcon className="w-4 h-4" />
                        {folder.name}
                      </button>
                    ))}
                    {availableFolders.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">No folders</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Exit button */}
        <button
          onClick={exitSelectMode}
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          Done
        </button>
      </motion.div>

      {/* Progress Toast */}
      <AnimatePresence>
        {showToast && (
          <div className="fixed bottom-4 right-4 z-50">
            <ProgressToast
              operation={showToast}
              onUndo={showToast.canUndo ? () => handleUndo(showToast.id) : undefined}
              onDismiss={() => setShowToast(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// =============================================================================
// Selection Checkbox
// =============================================================================

interface SelectionCheckboxProps {
  email: SelectedEmail
  className?: string
}

export function SelectionCheckbox({ email, className = '' }: SelectionCheckboxProps) {
  const { selectedIds, toggleSelection, isSelectMode } = useSelectionStore()
  const isSelected = selectedIds.has(email.id)

  if (!isSelectMode) return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleSelection(email)
      }}
      className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
        isSelected
          ? 'bg-purple-500 border-purple-500'
          : 'border-gray-500 hover:border-gray-400'
      } ${className}`}
    >
      {isSelected && <CheckIcon className="w-full h-full text-white p-0.5" />}
    </button>
  )
}

// =============================================================================
// Select Mode Toggle
// =============================================================================

interface SelectModeToggleProps {
  className?: string
}

export function SelectModeToggle({ className = '' }: SelectModeToggleProps) {
  const { isSelectMode, toggleSelectMode, selectedIds } = useSelectionStore()

  return (
    <button
      onClick={toggleSelectMode}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isSelectMode
          ? 'bg-purple-500/20 text-purple-400'
          : 'text-gray-400 hover:text-white hover:bg-gray-700'
      } ${className}`}
    >
      <Squares2X2Icon className="w-4 h-4" />
      {isSelectMode ? `${selectedIds.size} selected` : 'Select'}
    </button>
  )
}

// =============================================================================
// Select All Button
// =============================================================================

interface SelectAllButtonProps {
  emails: SelectedEmail[]
  className?: string
}

export function SelectAllButton({ emails, className = '' }: SelectAllButtonProps) {
  const { selectedIds, selectAll, deselectAll, isSelectMode } = useSelectionStore()
  const allSelected = emails.length > 0 && selectedIds.size === emails.length

  if (!isSelectMode) return null

  return (
    <button
      onClick={() => allSelected ? deselectAll() : selectAll(emails)}
      className={`flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
        allSelected
          ? 'bg-purple-500/20 text-purple-400'
          : 'text-gray-400 hover:text-white'
      } ${className}`}
    >
      {allSelected ? 'Deselect All' : `Select All (${emails.length})`}
    </button>
  )
}

export default BulkActionsBar
