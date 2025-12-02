/**
 * Advanced Search Hook
 *
 * Features:
 * - Natural language search with AI
 * - Advanced filter operators
 * - Search history & saved searches
 * - Real-time suggestions
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Email, EmailThread } from '@/types/email'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface SearchFilter {
  field: string
  operator: 'is' | 'contains' | 'before' | 'after' | 'between' | 'has' | 'not'
  value: string | string[] | Date | { start: Date; end: Date }
}

export interface ParsedSearch {
  query: string
  filters: SearchFilter[]
  isNaturalLanguage: boolean
  aiInterpretation?: string
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFilter[]
  createdAt: string
  lastUsedAt: string
  useCount: number
  userId: string
}

export interface SearchSuggestion {
  type: 'recent' | 'saved' | 'filter' | 'contact' | 'label'
  text: string
  displayText: string
  icon?: string
  metadata?: Record<string, any>
}

// =============================================================================
// Search Operators
// =============================================================================

export const SEARCH_OPERATORS = {
  'from:': {
    field: 'from',
    description: 'Search by sender email',
    examples: ['from:john@example.com', 'from:@company.com']
  },
  'to:': {
    field: 'to',
    description: 'Search by recipient',
    examples: ['to:team@example.com']
  },
  'subject:': {
    field: 'subject',
    description: 'Search in subject line',
    examples: ['subject:meeting', 'subject:"project update"']
  },
  'has:': {
    field: 'has',
    description: 'Filter by attributes',
    examples: ['has:attachment', 'has:star', 'has:link']
  },
  'is:': {
    field: 'is',
    description: 'Filter by state',
    examples: ['is:unread', 'is:starred', 'is:important']
  },
  'label:': {
    field: 'label',
    description: 'Filter by label',
    examples: ['label:work', 'label:personal']
  },
  'in:': {
    field: 'folder',
    description: 'Filter by folder',
    examples: ['in:inbox', 'in:sent', 'in:archive']
  },
  'before:': {
    field: 'date',
    description: 'Emails before date',
    examples: ['before:2024-01-01', 'before:yesterday']
  },
  'after:': {
    field: 'date',
    description: 'Emails after date',
    examples: ['after:2024-01-01', 'after:last week']
  },
  'older_than:': {
    field: 'age',
    description: 'Emails older than',
    examples: ['older_than:7d', 'older_than:1m', 'older_than:1y']
  },
  'newer_than:': {
    field: 'age',
    description: 'Emails newer than',
    examples: ['newer_than:7d', 'newer_than:1m']
  },
  'size:': {
    field: 'size',
    description: 'Filter by size',
    examples: ['size:>5mb', 'size:<1mb']
  },
  'filename:': {
    field: 'attachment',
    description: 'Search attachment names',
    examples: ['filename:report.pdf', 'filename:*.xlsx']
  }
}

// =============================================================================
// Search Store
// =============================================================================

interface SearchState {
  recentSearches: string[]
  savedSearches: SavedSearch[]

  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void

  saveSearch: (name: string, query: string, filters: SearchFilter[], userId: string) => SavedSearch
  deleteSavedSearch: (id: string) => void
  updateSavedSearchUsage: (id: string) => void
  getSavedSearches: (userId: string) => SavedSearch[]
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      recentSearches: [],
      savedSearches: [],

      addRecentSearch: (query) => {
        if (!query.trim()) return

        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((s) => s !== query)
          ].slice(0, 10)
        }))
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] })
      },

      saveSearch: (name, query, filters, userId) => {
        const search: SavedSearch = {
          id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name,
          query,
          filters,
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          useCount: 0,
          userId
        }

        set((state) => ({
          savedSearches: [...state.savedSearches, search]
        }))

        return search
      },

      deleteSavedSearch: (id) => {
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== id)
        }))
      },

      updateSavedSearchUsage: (id) => {
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastUsedAt: new Date().toISOString(),
                  useCount: s.useCount + 1
                }
              : s
          )
        }))
      },

      getSavedSearches: (userId) => {
        return get().savedSearches.filter((s) => s.userId === userId)
      }
    }),
    {
      name: 'boxzero-search',
      version: 1
    }
  )
)

// =============================================================================
// Parse Search Query
// =============================================================================

export function parseSearchQuery(query: string): ParsedSearch {
  const filters: SearchFilter[] = []
  let remainingQuery = query.trim()

  // Check if it looks like natural language
  const isNaturalLanguage = detectNaturalLanguage(query)

  // Extract operator-based filters
  for (const [operator, config] of Object.entries(SEARCH_OPERATORS)) {
    const regex = new RegExp(`${operator.replace(':', '\\:')}(?:"([^"]+)"|([^\\s]+))`, 'gi')
    let match

    while ((match = regex.exec(query)) !== null) {
      const value = match[1] || match[2]
      filters.push({
        field: config.field,
        operator: getOperatorType(operator),
        value
      })
      remainingQuery = remainingQuery.replace(match[0], '').trim()
    }
  }

  return {
    query: remainingQuery,
    filters,
    isNaturalLanguage,
    aiInterpretation: undefined // Would be filled by AI
  }
}

function getOperatorType(operator: string): SearchFilter['operator'] {
  if (operator.startsWith('before')) return 'before'
  if (operator.startsWith('after')) return 'after'
  if (operator.startsWith('has') || operator.startsWith('is')) return 'has'
  return 'contains'
}

function detectNaturalLanguage(query: string): boolean {
  // Check if query contains natural language patterns
  const nlPatterns = [
    /emails? (from|to|about|regarding)/i,
    /show me/i,
    /find( all)?/i,
    /what (did|does|is)/i,
    /when did/i,
    /messages? (from|to|about)/i,
    /unread (from|about)/i,
    /\?$/
  ]

  return nlPatterns.some((pattern) => pattern.test(query))
}

// =============================================================================
// Date Parsing
// =============================================================================

export function parseRelativeDate(value: string): Date | null {
  const now = new Date()
  const lowerValue = value.toLowerCase()

  // Relative keywords
  if (lowerValue === 'today') {
    return new Date(now.setHours(0, 0, 0, 0))
  }
  if (lowerValue === 'yesterday') {
    return new Date(now.setDate(now.getDate() - 1))
  }
  if (lowerValue === 'last week' || lowerValue === 'lastweek') {
    return new Date(now.setDate(now.getDate() - 7))
  }
  if (lowerValue === 'last month' || lowerValue === 'lastmonth') {
    return new Date(now.setMonth(now.getMonth() - 1))
  }
  if (lowerValue === 'last year' || lowerValue === 'lastyear') {
    return new Date(now.setFullYear(now.getFullYear() - 1))
  }

  // Relative duration (7d, 2w, 3m, 1y)
  const durationMatch = lowerValue.match(/^(\d+)(d|w|m|y)$/)
  if (durationMatch) {
    const [, amount, unit] = durationMatch
    const num = parseInt(amount, 10)

    switch (unit) {
      case 'd':
        return new Date(now.setDate(now.getDate() - num))
      case 'w':
        return new Date(now.setDate(now.getDate() - num * 7))
      case 'm':
        return new Date(now.setMonth(now.getMonth() - num))
      case 'y':
        return new Date(now.setFullYear(now.getFullYear() - num))
    }
  }

  // ISO date format
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date
  }

  return null
}

// =============================================================================
// Main Hook
// =============================================================================

interface UseAdvancedSearchOptions {
  emails: Email[]
  enabled?: boolean
}

export function useAdvancedSearch(options: UseAdvancedSearchOptions) {
  const { emails, enabled = true } = options

  const [query, setQuery] = useState('')
  const [parsedSearch, setParsedSearch] = useState<ParsedSearch | null>(null)

  const addRecentSearch = useSearchStore((state) => state.addRecentSearch)
  const recentSearches = useSearchStore((state) => state.recentSearches)

  // Parse query when it changes
  useEffect(() => {
    if (query) {
      setParsedSearch(parseSearchQuery(query))
    } else {
      setParsedSearch(null)
    }
  }, [query])

  // Execute search
  const executeSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return

    setQuery(searchQuery)
    addRecentSearch(searchQuery)
  }, [addRecentSearch])

  // Filter emails based on parsed search
  const searchResults = useMemo(() => {
    if (!parsedSearch || !enabled) return emails

    return emails.filter((email) => {
      // Check text query
      if (parsedSearch.query) {
        const lowerQuery = parsedSearch.query.toLowerCase()
        const matchesText =
          email.subject?.toLowerCase().includes(lowerQuery) ||
          email.body?.toLowerCase().includes(lowerQuery) ||
          email.from?.toLowerCase().includes(lowerQuery) ||
          email.to?.some((t) => t.toLowerCase().includes(lowerQuery))

        if (!matchesText) return false
      }

      // Check filters
      for (const filter of parsedSearch.filters) {
        if (!matchesFilter(email, filter)) return false
      }

      return true
    })
  }, [emails, parsedSearch, enabled])

  // Generate suggestions
  const suggestions = useMemo((): SearchSuggestion[] => {
    const result: SearchSuggestion[] = []

    // Recent searches
    recentSearches.slice(0, 3).forEach((search) => {
      result.push({
        type: 'recent',
        text: search,
        displayText: search,
        icon: 'ClockIcon'
      })
    })

    // Filter suggestions based on current input
    if (query && !query.includes(':')) {
      Object.entries(SEARCH_OPERATORS).forEach(([op, config]) => {
        result.push({
          type: 'filter',
          text: `${op}`,
          displayText: `${op} - ${config.description}`,
          icon: 'FunnelIcon'
        })
      })
    }

    return result.slice(0, 8)
  }, [query, recentSearches])

  return {
    query,
    setQuery,
    parsedSearch,
    searchResults,
    suggestions,
    executeSearch,
    resultCount: searchResults.length
  }
}

// =============================================================================
// Filter Matching
// =============================================================================

function matchesFilter(email: Email, filter: SearchFilter): boolean {
  const value = typeof filter.value === 'string' ? filter.value.toLowerCase() : filter.value

  switch (filter.field) {
    case 'from':
      return email.from?.toLowerCase().includes(value as string) ?? false

    case 'to':
      return email.to?.some((t) => t.toLowerCase().includes(value as string)) ?? false

    case 'subject':
      return email.subject?.toLowerCase().includes(value as string) ?? false

    case 'has':
      switch (value) {
        case 'attachment':
          return (email as any).hasAttachment || (email as any).attachments?.length > 0
        case 'star':
          return email.isStarred === true
        case 'link':
          return email.body?.includes('http') ?? false
        default:
          return false
      }

    case 'is':
      switch (value) {
        case 'unread':
          return !email.isRead
        case 'read':
          return email.isRead === true
        case 'starred':
          return email.isStarred === true
        case 'important':
          return email.isImportant === true
        default:
          return false
      }

    case 'folder':
      return email.folder?.toLowerCase() === value

    case 'label':
      return email.labels?.some((l) => l.toLowerCase() === value) ?? false

    case 'date':
      const emailDate = new Date(email.receivedAt)
      if (filter.operator === 'before') {
        const beforeDate = parseRelativeDate(value as string)
        return beforeDate ? emailDate < beforeDate : false
      }
      if (filter.operator === 'after') {
        const afterDate = parseRelativeDate(value as string)
        return afterDate ? emailDate > afterDate : false
      }
      return false

    default:
      return true
  }
}

// =============================================================================
// Natural Language Search (AI-powered)
// =============================================================================

export async function interpretNaturalLanguageSearch(
  query: string
): Promise<ParsedSearch> {
  // This would call your AI service to interpret the natural language query
  // For now, return a basic parsing

  const parsed = parseSearchQuery(query)

  // Example NL interpretations
  if (query.toLowerCase().includes('unread from')) {
    const fromMatch = query.match(/from\s+(\S+)/i)
    if (fromMatch) {
      parsed.filters.push({
        field: 'is',
        operator: 'is',
        value: 'unread'
      })
      parsed.filters.push({
        field: 'from',
        operator: 'contains',
        value: fromMatch[1]
      })
    }
  }

  if (query.toLowerCase().includes('this week')) {
    parsed.filters.push({
      field: 'date',
      operator: 'after',
      value: 'last week'
    })
  }

  parsed.aiInterpretation = `Searching for: ${parsed.query || 'all emails'} with ${parsed.filters.length} filters`

  return parsed
}

// =============================================================================
// Search Bar Utilities
// =============================================================================

export function getSearchPlaceholder(activeFilters: SearchFilter[]): string {
  if (activeFilters.length === 0) {
    return 'Search emails... (try "from:john" or "has:attachment")'
  }

  const filterTexts = activeFilters.map((f) =>
    `${f.field}:${typeof f.value === 'string' ? f.value : '...'}`
  )

  return `Filtering by: ${filterTexts.join(', ')}`
}

export function formatFilterChip(filter: SearchFilter): string {
  const value = typeof filter.value === 'string' ? filter.value : '...'
  return `${filter.field}: ${value}`
}
