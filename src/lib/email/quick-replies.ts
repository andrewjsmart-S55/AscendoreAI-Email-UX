/**
 * Quick Reply Shortcuts Service
 *
 * Keyboard-triggered quick replies:
 * - Customizable shortcuts
 * - Context-aware suggestions
 * - Expansion with variables
 * - Usage analytics
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type ShortcutCategory =
  | 'acknowledgment'
  | 'scheduling'
  | 'follow_up'
  | 'closing'
  | 'question'
  | 'custom'

export interface QuickReplyShortcut {
  id: string
  trigger: string // e.g., "/ty", "/ack", "/mtg"
  name: string
  content: string
  category: ShortcutCategory

  // Variables
  variables: {
    name: string
    defaultValue?: string
    type: 'text' | 'date' | 'time' | 'name'
  }[]

  // Settings
  isEnabled: boolean
  isGlobal: boolean // Available in all contexts
  contextFilters?: {
    senderDomains?: string[]
    hasAttachment?: boolean
    isReply?: boolean
  }

  // Analytics
  usageCount: number
  lastUsedAt?: number

  // Metadata
  userId?: string // Owner for personal shortcuts
  createdAt: number
  updatedAt: number
}

export interface QuickReplyUsage {
  shortcutId: string
  emailId?: string
  expandedContent: string
  timestamp: number
}

// =============================================================================
// Variable Substitution
// =============================================================================

const VARIABLE_REGEX = /\{([^}]+)\}/g

export function extractVariables(content: string): string[] {
  const variables: string[] = []
  let match

  while ((match = VARIABLE_REGEX.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  VARIABLE_REGEX.lastIndex = 0
  return variables
}

export function expandVariables(
  content: string,
  values: Record<string, string>,
  defaults: Record<string, string> = {}
): string {
  return content.replace(VARIABLE_REGEX, (match, varName) => {
    return values[varName] || defaults[varName] || match
  })
}

export function getDefaultVariables(): Record<string, string> {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    today: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    tomorrow: tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    year: now.getFullYear().toString()
  }
}

// =============================================================================
// Default Shortcuts
// =============================================================================

export const DEFAULT_SHORTCUTS: Omit<QuickReplyShortcut, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  // Acknowledgments
  {
    trigger: '/ty',
    name: 'Thank You',
    content: 'Thank you for your email. I appreciate you reaching out.',
    category: 'acknowledgment',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/ack',
    name: 'Acknowledge Receipt',
    content: 'Thank you for sending this over. I\'ve received it and will review it shortly.',
    category: 'acknowledgment',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/rec',
    name: 'Received & Will Review',
    content: 'Got it! I\'ll take a look and get back to you by {deadline}.',
    category: 'acknowledgment',
    variables: [{ name: 'deadline', defaultValue: 'end of day', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  },

  // Scheduling
  {
    trigger: '/mtg',
    name: 'Meeting Request',
    content: 'I\'d love to set up a quick call to discuss this further. Are you available {time_suggestion}? Here\'s my calendar link: {calendar_link}',
    category: 'scheduling',
    variables: [
      { name: 'time_suggestion', defaultValue: 'this week', type: 'text' },
      { name: 'calendar_link', type: 'text' }
    ],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/avail',
    name: 'Availability',
    content: 'I\'m available:\n- {option1}\n- {option2}\n- {option3}\n\nLet me know what works best for you!',
    category: 'scheduling',
    variables: [
      { name: 'option1', type: 'text' },
      { name: 'option2', type: 'text' },
      { name: 'option3', type: 'text' }
    ],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/reschedule',
    name: 'Reschedule Request',
    content: 'I apologize, but I need to reschedule our meeting. Would {new_time} work for you instead?',
    category: 'scheduling',
    variables: [{ name: 'new_time', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  },

  // Follow-ups
  {
    trigger: '/fu',
    name: 'Follow Up',
    content: 'Just following up on my previous email. Please let me know if you have any questions or need any additional information.',
    category: 'follow_up',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/bump',
    name: 'Gentle Bump',
    content: 'Hi! Just wanted to bump this to the top of your inbox. Let me know when you get a chance to look at it.',
    category: 'follow_up',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/check',
    name: 'Check In',
    content: 'Hi {name}, just checking in on the status of {topic}. Any updates you can share?',
    category: 'follow_up',
    variables: [
      { name: 'name', type: 'name' },
      { name: 'topic', type: 'text' }
    ],
    isEnabled: true,
    isGlobal: true
  },

  // Closings
  {
    trigger: '/lmk',
    name: 'Let Me Know',
    content: 'Let me know if you have any questions!',
    category: 'closing',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/best',
    name: 'Best Regards',
    content: 'Best regards,\n{name}',
    category: 'closing',
    variables: [{ name: 'name', type: 'name' }],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/cheers',
    name: 'Cheers',
    content: 'Cheers,\n{name}',
    category: 'closing',
    variables: [{ name: 'name', type: 'name' }],
    isEnabled: true,
    isGlobal: true
  },

  // Questions
  {
    trigger: '/clarify',
    name: 'Request Clarification',
    content: 'Thanks for reaching out. Could you please clarify {question}? That will help me provide a more accurate response.',
    category: 'question',
    variables: [{ name: 'question', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/more',
    name: 'Need More Info',
    content: 'I\'d be happy to help! Could you please provide some additional details about {topic}?',
    category: 'question',
    variables: [{ name: 'topic', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  },

  // Other common responses
  {
    trigger: '/ooo',
    name: 'Out of Office',
    content: 'Thanks for your email. I\'m currently out of the office with limited access to email. I\'ll respond to your message when I return on {return_date}.',
    category: 'custom',
    variables: [{ name: 'return_date', type: 'date' }],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/busy',
    name: 'Busy Right Now',
    content: 'Thanks for reaching out. I\'m currently tied up with other commitments, but I\'ll get back to you by {date}.',
    category: 'custom',
    variables: [{ name: 'date', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/no',
    name: 'Polite Decline',
    content: 'Thank you for thinking of me, but I\'m not able to take this on at the moment. I appreciate you reaching out!',
    category: 'custom',
    variables: [],
    isEnabled: true,
    isGlobal: true
  },
  {
    trigger: '/yes',
    name: 'Confirm',
    content: 'Yes, that works for me! {additional_info}',
    category: 'custom',
    variables: [{ name: 'additional_info', defaultValue: '', type: 'text' }],
    isEnabled: true,
    isGlobal: true
  }
]

// =============================================================================
// Quick Replies Store
// =============================================================================

interface QuickRepliesStore {
  shortcuts: QuickReplyShortcut[]
  recentUsage: QuickReplyUsage[]
  userVariables: Record<string, string> // Persistent user-specific variables

  // Shortcut management
  addShortcut: (shortcut: Omit<QuickReplyShortcut, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => QuickReplyShortcut
  updateShortcut: (id: string, updates: Partial<QuickReplyShortcut>) => void
  deleteShortcut: (id: string) => void
  toggleShortcut: (id: string) => void

  // Usage
  useShortcut: (shortcutId: string, expandedContent: string, emailId?: string) => void

  // User variables
  setUserVariable: (name: string, value: string) => void

  // Queries
  getShortcutById: (id: string) => QuickReplyShortcut | undefined
  getShortcutByTrigger: (trigger: string) => QuickReplyShortcut | undefined
  getEnabledShortcuts: () => QuickReplyShortcut[]
  getShortcutsByCategory: (category: ShortcutCategory) => QuickReplyShortcut[]
  getMostUsedShortcuts: (limit?: number) => QuickReplyShortcut[]
  searchShortcuts: (query: string) => QuickReplyShortcut[]
}

export const useQuickRepliesStore = create<QuickRepliesStore>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS.map((s, i) => ({
        ...s,
        id: `shortcut_default_${i}`,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })),
      recentUsage: [],
      userVariables: {},

      addShortcut: (shortcutData) => {
        // Ensure trigger starts with /
        const trigger = shortcutData.trigger.startsWith('/')
          ? shortcutData.trigger
          : `/${shortcutData.trigger}`

        const shortcut: QuickReplyShortcut = {
          ...shortcutData,
          trigger,
          id: `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          shortcuts: [...state.shortcuts, shortcut]
        }))

        return shortcut
      },

      updateShortcut: (id, updates) => {
        set(state => ({
          shortcuts: state.shortcuts.map(s =>
            s.id === id
              ? { ...s, ...updates, updatedAt: Date.now() }
              : s
          )
        }))
      },

      deleteShortcut: (id) => {
        set(state => ({
          shortcuts: state.shortcuts.filter(s => s.id !== id)
        }))
      },

      toggleShortcut: (id) => {
        set(state => ({
          shortcuts: state.shortcuts.map(s =>
            s.id === id
              ? { ...s, isEnabled: !s.isEnabled, updatedAt: Date.now() }
              : s
          )
        }))
      },

      useShortcut: (shortcutId, expandedContent, emailId) => {
        const usage: QuickReplyUsage = {
          shortcutId,
          emailId,
          expandedContent,
          timestamp: Date.now()
        }

        set(state => ({
          shortcuts: state.shortcuts.map(s =>
            s.id === shortcutId
              ? { ...s, usageCount: s.usageCount + 1, lastUsedAt: Date.now() }
              : s
          ),
          recentUsage: [usage, ...state.recentUsage].slice(0, 100)
        }))
      },

      setUserVariable: (name, value) => {
        set(state => ({
          userVariables: { ...state.userVariables, [name]: value }
        }))
      },

      getShortcutById: (id) => get().shortcuts.find(s => s.id === id),

      getShortcutByTrigger: (trigger) => {
        const normalizedTrigger = trigger.toLowerCase()
        return get().shortcuts.find(
          s => s.trigger.toLowerCase() === normalizedTrigger && s.isEnabled
        )
      },

      getEnabledShortcuts: () =>
        get().shortcuts.filter(s => s.isEnabled),

      getShortcutsByCategory: (category) =>
        get().shortcuts.filter(s => s.category === category && s.isEnabled),

      getMostUsedShortcuts: (limit = 10) =>
        [...get().shortcuts]
          .filter(s => s.isEnabled)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit),

      searchShortcuts: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().shortcuts.filter(s =>
          s.isEnabled && (
            s.trigger.toLowerCase().includes(lowerQuery) ||
            s.name.toLowerCase().includes(lowerQuery) ||
            s.content.toLowerCase().includes(lowerQuery)
          )
        )
      }
    }),
    {
      name: 'boxzero-quick-replies',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        shortcuts: state.shortcuts,
        recentUsage: state.recentUsage,
        userVariables: state.userVariables
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useState, useEffect } from 'react'

export function useQuickReplies() {
  const store = useQuickRepliesStore()

  const enabledShortcuts = useMemo(
    () => store.getEnabledShortcuts(),
    [store.shortcuts]
  )

  const mostUsed = useMemo(
    () => store.getMostUsedShortcuts(5),
    [store.shortcuts]
  )

  const expandShortcut = useCallback((
    trigger: string,
    variableValues: Record<string, string> = {},
    emailContext?: { senderName?: string; senderDomain?: string }
  ): string | null => {
    const shortcut = store.getShortcutByTrigger(trigger)
    if (!shortcut) return null

    // Merge all variable sources
    const allVariables = {
      ...getDefaultVariables(),
      ...store.userVariables,
      ...variableValues,
      ...(emailContext?.senderName ? { sender_name: emailContext.senderName } : {})
    }

    // Get default values from shortcut definition
    const shortcutDefaults: Record<string, string> = {}
    shortcut.variables.forEach(v => {
      if (v.defaultValue) shortcutDefaults[v.name] = v.defaultValue
    })

    return expandVariables(shortcut.content, allVariables, shortcutDefaults)
  }, [store.getShortcutByTrigger, store.userVariables])

  const recordUsage = useCallback((
    shortcutId: string,
    expandedContent: string,
    emailId?: string
  ) => {
    store.useShortcut(shortcutId, expandedContent, emailId)
  }, [store.useShortcut])

  return {
    shortcuts: enabledShortcuts,
    mostUsed,
    userVariables: store.userVariables,

    // Actions
    addShortcut: store.addShortcut,
    updateShortcut: store.updateShortcut,
    deleteShortcut: store.deleteShortcut,
    toggleShortcut: store.toggleShortcut,
    setUserVariable: store.setUserVariable,

    // Expansion
    expandShortcut,
    recordUsage,
    getByTrigger: store.getShortcutByTrigger,
    searchShortcuts: store.searchShortcuts
  }
}

export function useQuickReplyInput(
  inputValue: string,
  onExpand: (content: string) => void
) {
  const { expandShortcut, recordUsage, getByTrigger, searchShortcuts } = useQuickReplies()
  const [suggestions, setSuggestions] = useState<QuickReplyShortcut[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Detect if user is typing a shortcut trigger
  const triggerMatch = useMemo(() => {
    const match = /\/(\w*)$/.exec(inputValue)
    return match ? `/${match[1]}` : null
  }, [inputValue])

  // Update suggestions when trigger changes
  useEffect(() => {
    if (!triggerMatch) {
      setSuggestions([])
      return
    }

    const matches = searchShortcuts(triggerMatch)
    setSuggestions(matches.slice(0, 5))
    setSelectedIndex(0)
  }, [triggerMatch, searchShortcuts])

  const handleExpand = useCallback((shortcut: QuickReplyShortcut) => {
    const expanded = expandShortcut(shortcut.trigger)
    if (expanded) {
      // Replace the trigger with expanded content
      const newContent = inputValue.replace(/\/\w*$/, expanded)
      onExpand(newContent)
      recordUsage(shortcut.id, expanded)
      setSuggestions([])
    }
  }, [inputValue, expandShortcut, onExpand, recordUsage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Tab':
      case 'Enter':
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          handleExpand(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setSuggestions([])
        break
    }
  }, [suggestions, selectedIndex, handleExpand])

  return {
    suggestions,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    handleExpand,
    isShowingSuggestions: suggestions.length > 0
  }
}

export default useQuickRepliesStore
