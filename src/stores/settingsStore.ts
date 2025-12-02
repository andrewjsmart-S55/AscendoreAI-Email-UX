/**
 * Settings Store
 *
 * Manages user preferences including:
 * - AI settings (trust levels, auto-actions)
 * - Notification preferences
 * - Display settings
 * - Keyboard shortcuts
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface AISettings {
  /** Enable AI predictions */
  enabled: boolean

  /** Confidence threshold for auto-actions (0-1) */
  autoActionThreshold: number

  /** Actions that can be auto-executed */
  allowedAutoActions: ('archive' | 'delete' | 'star' | 'mark_read')[]

  /** Show AI confidence badges on emails */
  showConfidenceBadges: boolean

  /** Show AI reasoning in action queue */
  showReasoning: boolean

  /** Use LLM for low-confidence predictions */
  useLLMFallback: boolean

  /** Daily LLM call limit */
  dailyLLMLimit: number
}

export interface NotificationSettings {
  /** Enable desktop notifications */
  desktopNotifications: boolean

  /** Enable sound notifications */
  soundNotifications: boolean

  /** Notify on snoozed email return */
  snoozeReminders: boolean

  /** Notify on streak milestones */
  streakNotifications: boolean

  /** Notify on high-priority emails */
  urgentEmailNotifications: boolean

  /** Quiet hours start (24h format) */
  quietHoursStart: string | null

  /** Quiet hours end (24h format) */
  quietHoursEnd: string | null
}

export interface DisplaySettings {
  /** Email list density */
  density: 'compact' | 'comfortable' | 'spacious'

  /** Show email preview in list */
  showPreview: boolean

  /** Preview line count */
  previewLines: 1 | 2 | 3

  /** Theme mode */
  theme: 'light' | 'dark' | 'system'

  /** Show thread count */
  showThreadCount: boolean

  /** Show labels/tags */
  showLabels: boolean

  /** Conversation view */
  conversationView: boolean
}

export interface KeyboardShortcut {
  id: string
  action: string
  key: string
  modifiers: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  description: string
  enabled: boolean
}

export interface SettingsState {
  ai: AISettings
  notifications: NotificationSettings
  display: DisplaySettings
  shortcuts: KeyboardShortcut[]

  // Actions
  updateAISettings: (settings: Partial<AISettings>) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void
  updateShortcut: (id: string, shortcut: Partial<KeyboardShortcut>) => void
  resetToDefaults: () => void
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  autoActionThreshold: 0.85,
  allowedAutoActions: ['archive', 'mark_read'],
  showConfidenceBadges: true,
  showReasoning: true,
  useLLMFallback: true,
  dailyLLMLimit: 100
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  desktopNotifications: true,
  soundNotifications: false,
  snoozeReminders: true,
  streakNotifications: true,
  urgentEmailNotifications: true,
  quietHoursStart: null,
  quietHoursEnd: null
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  density: 'comfortable',
  showPreview: true,
  previewLines: 2,
  theme: 'system',
  showThreadCount: true,
  showLabels: true,
  conversationView: true
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { id: 'nav_next', action: 'next_email', key: 'j', modifiers: [], description: 'Next email', enabled: true },
  { id: 'nav_prev', action: 'prev_email', key: 'k', modifiers: [], description: 'Previous email', enabled: true },
  { id: 'nav_open', action: 'open_email', key: 'Enter', modifiers: [], description: 'Open email', enabled: true },
  { id: 'nav_close', action: 'close_panel', key: 'Escape', modifiers: [], description: 'Close panel', enabled: true },

  // Actions
  { id: 'action_archive', action: 'archive', key: 'e', modifiers: [], description: 'Archive', enabled: true },
  { id: 'action_delete', action: 'delete', key: '#', modifiers: ['shift'], description: 'Delete', enabled: true },
  { id: 'action_star', action: 'star', key: 's', modifiers: [], description: 'Star/Unstar', enabled: true },
  { id: 'action_reply', action: 'reply', key: 'r', modifiers: [], description: 'Reply', enabled: true },
  { id: 'action_forward', action: 'forward', key: 'f', modifiers: [], description: 'Forward', enabled: true },
  { id: 'action_compose', action: 'compose', key: 'c', modifiers: [], description: 'Compose new', enabled: true },

  // AI Actions
  { id: 'ai_approve', action: 'approve_suggestion', key: 'a', modifiers: [], description: 'Approve AI suggestion', enabled: true },
  { id: 'ai_reject', action: 'reject_suggestion', key: 'x', modifiers: [], description: 'Reject AI suggestion', enabled: true },

  // View
  { id: 'view_inbox', action: 'go_inbox', key: 'g', modifiers: [], description: 'Go to Inbox (then i)', enabled: true },
  { id: 'view_starred', action: 'go_starred', key: 'g', modifiers: [], description: 'Go to Starred (then s)', enabled: true },
  { id: 'view_search', action: 'focus_search', key: '/', modifiers: [], description: 'Focus search', enabled: true },

  // Snooze
  { id: 'snooze_email', action: 'snooze', key: 'b', modifiers: [], description: 'Snooze email', enabled: true },

  // Bulk
  { id: 'select_all', action: 'select_all', key: 'a', modifiers: ['ctrl'], description: 'Select all', enabled: true },
  { id: 'deselect', action: 'deselect', key: 'Escape', modifiers: [], description: 'Deselect all', enabled: true },

  // Undo
  { id: 'undo', action: 'undo', key: 'z', modifiers: ['ctrl'], description: 'Undo last action', enabled: true }
]

// =============================================================================
// Store Implementation
// =============================================================================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: DEFAULT_AI_SETTINGS,
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      display: DEFAULT_DISPLAY_SETTINGS,
      shortcuts: DEFAULT_SHORTCUTS,

      updateAISettings: (settings) => {
        set(state => ({
          ai: { ...state.ai, ...settings }
        }))
      },

      updateNotificationSettings: (settings) => {
        set(state => ({
          notifications: { ...state.notifications, ...settings }
        }))
      },

      updateDisplaySettings: (settings) => {
        set(state => ({
          display: { ...state.display, ...settings }
        }))
      },

      updateShortcut: (id, shortcut) => {
        set(state => ({
          shortcuts: state.shortcuts.map(s =>
            s.id === id ? { ...s, ...shortcut } : s
          )
        }))
      },

      resetToDefaults: () => {
        set({
          ai: DEFAULT_AI_SETTINGS,
          notifications: DEFAULT_NOTIFICATION_SETTINGS,
          display: DEFAULT_DISPLAY_SETTINGS,
          shortcuts: DEFAULT_SHORTCUTS
        })
      }
    }),
    {
      name: 'boxzero-settings',
      version: 1
    }
  )
)

// =============================================================================
// Shortcut Helpers
// =============================================================================

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.modifiers.includes('ctrl')) parts.push('Ctrl')
  if (shortcut.modifiers.includes('alt')) parts.push('Alt')
  if (shortcut.modifiers.includes('shift')) parts.push('Shift')
  if (shortcut.modifiers.includes('meta')) parts.push('⌘')

  parts.push(shortcut.key.toUpperCase())

  return parts.join(' + ')
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  if (!shortcut.enabled) return false

  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
  const ctrlMatch = event.ctrlKey === shortcut.modifiers.includes('ctrl')
  const altMatch = event.altKey === shortcut.modifiers.includes('alt')
  const shiftMatch = event.shiftKey === shortcut.modifiers.includes('shift')
  const metaMatch = event.metaKey === shortcut.modifiers.includes('meta')

  return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch
}
