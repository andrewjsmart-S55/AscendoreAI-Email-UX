'use client'

/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcut handling for:
 * - Email navigation (j/k)
 * - Quick actions (e, #, s, r, f)
 * - AI actions (a, x)
 * - View navigation (g+i, g+s)
 * - Undo (Ctrl+Z)
 */

import React from 'react'
import { useEffect, useCallback, useRef } from 'react'
import { useSettingsStore, matchesShortcut } from '@/stores/settingsStore'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

export interface ShortcutHandlers {
  // Navigation
  onNextEmail?: () => void
  onPrevEmail?: () => void
  onOpenEmail?: () => void
  onClosePanel?: () => void

  // Actions
  onArchive?: () => void
  onDelete?: () => void
  onStar?: () => void
  onReply?: () => void
  onForward?: () => void
  onCompose?: () => void
  onSnooze?: () => void

  // AI
  onApproveSuggestion?: () => void
  onRejectSuggestion?: () => void

  // View
  onGoInbox?: () => void
  onGoStarred?: () => void
  onFocusSearch?: () => void

  // Bulk
  onSelectAll?: () => void
  onDeselect?: () => void

  // Undo
  onUndo?: () => void
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  handlers: ShortcutHandlers
}

// =============================================================================
// Main Hook
// =============================================================================

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { enabled = true, handlers } = options
  const shortcuts = useSettingsStore(state => state.shortcuts)

  // Track 'g' prefix for go commands
  const pendingGo = useRef(false)
  const goTimeout = useRef<NodeJS.Timeout | null>(null)

  // Map action names to handlers
  const actionMap: Record<string, (() => void) | undefined> = {
    next_email: handlers.onNextEmail,
    prev_email: handlers.onPrevEmail,
    open_email: handlers.onOpenEmail,
    close_panel: handlers.onClosePanel,
    archive: handlers.onArchive,
    delete: handlers.onDelete,
    star: handlers.onStar,
    reply: handlers.onReply,
    forward: handlers.onForward,
    compose: handlers.onCompose,
    snooze: handlers.onSnooze,
    approve_suggestion: handlers.onApproveSuggestion,
    reject_suggestion: handlers.onRejectSuggestion,
    go_inbox: handlers.onGoInbox,
    go_starred: handlers.onGoStarred,
    focus_search: handlers.onFocusSearch,
    select_all: handlers.onSelectAll,
    deselect: handlers.onDeselect,
    undo: handlers.onUndo
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    // Handle 'g' prefix for go commands
    if (event.key === 'g' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!pendingGo.current) {
        pendingGo.current = true
        goTimeout.current = setTimeout(() => {
          pendingGo.current = false
        }, 1000)
        return
      }
    }

    // Handle second key after 'g'
    if (pendingGo.current) {
      pendingGo.current = false
      if (goTimeout.current) {
        clearTimeout(goTimeout.current)
      }

      if (event.key === 'i') {
        handlers.onGoInbox?.()
        event.preventDefault()
        return
      } else if (event.key === 's') {
        handlers.onGoStarred?.()
        event.preventDefault()
        return
      }
    }

    // Check against defined shortcuts
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        const handler = actionMap[shortcut.action]
        if (handler) {
          event.preventDefault()
          handler()
          return
        }
      }
    }

    // Show help on '?'
    if (event.key === '?' && event.shiftKey) {
      event.preventDefault()
      showShortcutHelp()
    }
  }, [shortcuts, handlers, actionMap])

  // Show shortcut help modal/toast
  const showShortcutHelp = useCallback(() => {
    const helpText = shortcuts
      .filter(s => s.enabled)
      .slice(0, 10)
      .map(s => `${s.key.toUpperCase()}: ${s.description}`)
      .join('\n')

    toast(
      <div className="text-sm">
        <div className="font-semibold mb-2">Keyboard Shortcuts</div>
        <div className="space-y-1 font-mono text-xs">
          {shortcuts.filter(s => s.enabled).slice(0, 8).map(s => (
            <div key={s.id} className="flex justify-between gap-4">
              <span className="text-gray-500">{s.description}</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">{s.key.toUpperCase()}</kbd>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Press ? for full list
        </div>
      </div>,
      {
        duration: 5000,
        style: { maxWidth: '300px' }
      }
    )
  }, [shortcuts])

  // Attach event listener
  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (goTimeout.current) {
        clearTimeout(goTimeout.current)
      }
    }
  }, [enabled, handleKeyDown])

  return {
    showShortcutHelp
  }
}

// =============================================================================
// Shortcut Display Component Hook
// =============================================================================

export function useShortcutDisplay() {
  const shortcuts = useSettingsStore(state => state.shortcuts)

  const getShortcutForAction = useCallback((action: string): string | null => {
    const shortcut = shortcuts.find(s => s.action === action && s.enabled)
    if (!shortcut) return null

    const parts: string[] = []
    if (shortcut.modifiers.includes('ctrl')) parts.push('⌃')
    if (shortcut.modifiers.includes('alt')) parts.push('⌥')
    if (shortcut.modifiers.includes('shift')) parts.push('⇧')
    if (shortcut.modifiers.includes('meta')) parts.push('⌘')
    parts.push(shortcut.key.toUpperCase())

    return parts.join('')
  }, [shortcuts])

  return { getShortcutForAction }
}

// =============================================================================
// Email List Navigation Hook
// =============================================================================

export function useEmailListNavigation(
  emails: any[],
  selectedIndex: number,
  setSelectedIndex: (index: number) => void,
  onSelect: (email: any) => void
) {
  const handlers: ShortcutHandlers = {
    onNextEmail: () => {
      if (selectedIndex < emails.length - 1) {
        setSelectedIndex(selectedIndex + 1)
      }
    },
    onPrevEmail: () => {
      if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1)
      }
    },
    onOpenEmail: () => {
      if (emails[selectedIndex]) {
        onSelect(emails[selectedIndex])
      }
    }
  }

  useKeyboardShortcuts({
    enabled: emails.length > 0,
    handlers
  })

  return { selectedIndex }
}
