/**
 * Search Index Service
 *
 * Client-side search indexing for fast email search:
 * - Full-text indexing with tokenization
 * - Fuzzy search support
 * - Search operators (from:, to:, has:, is:, etc.)
 * - IndexedDB persistence
 * - Incremental index updates
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface IndexedEmail {
  id: string
  threadId: string
  subject: string
  snippet: string
  from: string
  fromName: string
  to: string[]
  cc: string[]
  date: number
  labels: string[]
  isRead: boolean
  isStarred: boolean
  hasAttachment: boolean
  // Tokenized content for fast search
  tokens: string[]
  // Metadata for filtering
  size?: number
}

export interface SearchResult {
  email: IndexedEmail
  score: number
  highlights: {
    field: string
    matches: string[]
  }[]
}

export interface SearchQuery {
  text?: string
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  isRead?: boolean
  isStarred?: boolean
  labels?: string[]
  dateAfter?: Date
  dateBefore?: Date
  inFolder?: string
}

export interface SearchStats {
  totalIndexed: number
  lastIndexedAt: number
  indexSizeBytes: number
}

// =============================================================================
// Tokenization & Text Processing
// =============================================================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
  'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who',
  'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
  'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or',
  'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
  'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
])

/**
 * Tokenize text into searchable terms
 */
export function tokenize(text: string): string[] {
  if (!text) return []

  return text
    .toLowerCase()
    .replace(/[^\w\s@.-]/g, ' ') // Keep @ . - for emails
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
}

/**
 * Create n-grams for fuzzy matching
 */
export function createNGrams(text: string, n: number = 3): string[] {
  const ngrams: string[] = []
  const cleaned = text.toLowerCase().replace(/\s+/g, '')

  for (let i = 0; i <= cleaned.length - n; i++) {
    ngrams.push(cleaned.substring(i, i + n))
  }

  return ngrams
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if two strings are similar (fuzzy match)
 */
export function isSimilar(a: string, b: string, threshold: number = 0.3): boolean {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return true

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  return distance / maxLen <= threshold
}

// =============================================================================
// Search Query Parser
// =============================================================================

export function parseSearchQuery(queryString: string): SearchQuery {
  const query: SearchQuery = {}
  let remainingText = queryString

  // Parse operators
  const operators: [string, keyof SearchQuery][] = [
    ['from:', 'from'],
    ['to:', 'to'],
    ['subject:', 'subject'],
    ['in:', 'inFolder'],
    ['label:', 'labels' as keyof SearchQuery]
  ]

  for (const [prefix, field] of operators) {
    const regex = new RegExp(`${prefix}(\\S+|"[^"]+")`, 'gi')
    let match

    while ((match = regex.exec(remainingText)) !== null) {
      let value = match[1].replace(/"/g, '')

      if (field === 'labels') {
        query.labels = query.labels || []
        query.labels.push(value)
      } else {
        (query as any)[field] = value
      }

      remainingText = remainingText.replace(match[0], '')
    }
  }

  // Parse boolean operators
  if (/has:attachment/i.test(remainingText)) {
    query.hasAttachment = true
    remainingText = remainingText.replace(/has:attachment/gi, '')
  }

  if (/is:unread/i.test(remainingText)) {
    query.isRead = false
    remainingText = remainingText.replace(/is:unread/gi, '')
  }

  if (/is:read/i.test(remainingText)) {
    query.isRead = true
    remainingText = remainingText.replace(/is:read/gi, '')
  }

  if (/is:starred/i.test(remainingText)) {
    query.isStarred = true
    remainingText = remainingText.replace(/is:starred/gi, '')
  }

  // Parse date operators
  const afterMatch = /after:(\d{4}[-/]\d{2}[-/]\d{2})/i.exec(remainingText)
  if (afterMatch) {
    query.dateAfter = new Date(afterMatch[1])
    remainingText = remainingText.replace(afterMatch[0], '')
  }

  const beforeMatch = /before:(\d{4}[-/]\d{2}[-/]\d{2})/i.exec(remainingText)
  if (beforeMatch) {
    query.dateBefore = new Date(beforeMatch[1])
    remainingText = remainingText.replace(beforeMatch[0], '')
  }

  // Remaining text is free-form search
  query.text = remainingText.trim()

  return query
}

// =============================================================================
// Search Index
// =============================================================================

class SearchIndex {
  private index: Map<string, Set<string>> = new Map() // token -> emailIds
  private emails: Map<string, IndexedEmail> = new Map()
  private ngramIndex: Map<string, Set<string>> = new Map() // ngram -> emailIds

  /**
   * Add or update an email in the index
   */
  indexEmail(email: {
    id: string
    threadId: string
    subject: string
    snippet: string
    from: string
    to: string[]
    cc?: string[]
    date: Date | number
    labels?: string[]
    isRead?: boolean
    isStarred?: boolean
    hasAttachment?: boolean
    body?: string
  }): void {
    // Extract from name from email address
    const fromMatch = email.from.match(/^([^<]+)<[^>]+>$/)
    const fromName = fromMatch ? fromMatch[1].trim() : email.from.split('@')[0]

    // Create tokens from all searchable content
    const contentTokens = [
      ...tokenize(email.subject),
      ...tokenize(email.snippet),
      ...tokenize(fromName),
      ...tokenize(email.from),
      ...(email.body ? tokenize(email.body) : [])
    ]

    const indexedEmail: IndexedEmail = {
      id: email.id,
      threadId: email.threadId,
      subject: email.subject,
      snippet: email.snippet,
      from: email.from,
      fromName,
      to: email.to || [],
      cc: email.cc || [],
      date: typeof email.date === 'number' ? email.date : email.date.getTime(),
      labels: email.labels || [],
      isRead: email.isRead ?? false,
      isStarred: email.isStarred ?? false,
      hasAttachment: email.hasAttachment ?? false,
      tokens: [...new Set(contentTokens)]
    }

    // Remove old index entries if updating
    if (this.emails.has(email.id)) {
      this.removeFromIndex(email.id)
    }

    // Store the email
    this.emails.set(email.id, indexedEmail)

    // Add to token index
    for (const token of indexedEmail.tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set())
      }
      this.index.get(token)!.add(email.id)
    }

    // Add to n-gram index for fuzzy search
    const subjectNgrams = createNGrams(email.subject)
    for (const ngram of subjectNgrams) {
      if (!this.ngramIndex.has(ngram)) {
        this.ngramIndex.set(ngram, new Set())
      }
      this.ngramIndex.get(ngram)!.add(email.id)
    }
  }

  /**
   * Remove an email from the index
   */
  removeFromIndex(emailId: string): void {
    const email = this.emails.get(emailId)
    if (!email) return

    // Remove from token index
    for (const token of email.tokens) {
      const emailIds = this.index.get(token)
      if (emailIds) {
        emailIds.delete(emailId)
        if (emailIds.size === 0) {
          this.index.delete(token)
        }
      }
    }

    // Remove from n-gram index
    const subjectNgrams = createNGrams(email.subject)
    for (const ngram of subjectNgrams) {
      const emailIds = this.ngramIndex.get(ngram)
      if (emailIds) {
        emailIds.delete(emailId)
        if (emailIds.size === 0) {
          this.ngramIndex.delete(ngram)
        }
      }
    }

    this.emails.delete(emailId)
  }

  /**
   * Search the index
   */
  search(queryString: string, options: {
    limit?: number
    fuzzy?: boolean
    sortBy?: 'relevance' | 'date'
  } = {}): SearchResult[] {
    const { limit = 50, fuzzy = true, sortBy = 'relevance' } = options
    const query = parseSearchQuery(queryString)
    const results: SearchResult[] = []
    const scoredEmails = new Map<string, { score: number; highlights: SearchResult['highlights'] }>()

    // Get candidate emails based on text search
    let candidateIds: Set<string>

    if (query.text) {
      const searchTokens = tokenize(query.text)
      candidateIds = new Set()

      for (const token of searchTokens) {
        // Exact match
        const exactMatches = this.index.get(token)
        if (exactMatches) {
          exactMatches.forEach(id => candidateIds.add(id))
        }

        // Fuzzy match via n-grams
        if (fuzzy) {
          const ngrams = createNGrams(token)
          for (const ngram of ngrams) {
            const ngramMatches = this.ngramIndex.get(ngram)
            if (ngramMatches) {
              ngramMatches.forEach(id => candidateIds.add(id))
            }
          }
        }
      }
    } else {
      // No text query - consider all emails
      candidateIds = new Set(this.emails.keys())
    }

    // Filter and score candidates
    for (const emailId of candidateIds) {
      const email = this.emails.get(emailId)
      if (!email) continue

      // Apply filters
      if (query.from && !email.from.toLowerCase().includes(query.from.toLowerCase()) &&
          !email.fromName.toLowerCase().includes(query.from.toLowerCase())) {
        continue
      }

      if (query.to) {
        const toMatch = email.to.some(t => t.toLowerCase().includes(query.to!.toLowerCase()))
        if (!toMatch) continue
      }

      if (query.subject && !email.subject.toLowerCase().includes(query.subject.toLowerCase())) {
        continue
      }

      if (query.hasAttachment !== undefined && email.hasAttachment !== query.hasAttachment) {
        continue
      }

      if (query.isRead !== undefined && email.isRead !== query.isRead) {
        continue
      }

      if (query.isStarred !== undefined && email.isStarred !== query.isStarred) {
        continue
      }

      if (query.labels && query.labels.length > 0) {
        const hasLabel = query.labels.some(l => email.labels.includes(l))
        if (!hasLabel) continue
      }

      if (query.dateAfter && email.date < query.dateAfter.getTime()) {
        continue
      }

      if (query.dateBefore && email.date > query.dateBefore.getTime()) {
        continue
      }

      // Calculate relevance score
      let score = 0
      const highlights: SearchResult['highlights'] = []

      if (query.text) {
        const searchTokens = tokenize(query.text)

        for (const searchToken of searchTokens) {
          // Subject match (higher weight)
          if (email.subject.toLowerCase().includes(searchToken)) {
            score += 10
            highlights.push({ field: 'subject', matches: [searchToken] })
          }

          // From match
          if (email.from.toLowerCase().includes(searchToken) ||
              email.fromName.toLowerCase().includes(searchToken)) {
            score += 5
            highlights.push({ field: 'from', matches: [searchToken] })
          }

          // Token match
          if (email.tokens.includes(searchToken)) {
            score += 2
          }

          // Fuzzy match
          if (fuzzy) {
            for (const token of email.tokens) {
              if (isSimilar(token, searchToken)) {
                score += 1
              }
            }
          }
        }
      } else {
        // No text query - base score on recency
        score = 1
      }

      // Boost recent emails
      const daysSinceEmail = (Date.now() - email.date) / (1000 * 60 * 60 * 24)
      if (daysSinceEmail < 7) score *= 1.5
      else if (daysSinceEmail < 30) score *= 1.2

      // Boost starred emails
      if (email.isStarred) score *= 1.3

      scoredEmails.set(emailId, { score, highlights })
    }

    // Sort results
    const sortedIds = Array.from(scoredEmails.entries())
      .sort((a, b) => {
        if (sortBy === 'date') {
          const emailA = this.emails.get(a[0])!
          const emailB = this.emails.get(b[0])!
          return emailB.date - emailA.date
        }
        return b[1].score - a[1].score
      })
      .slice(0, limit)

    // Build results
    for (const [emailId, { score, highlights }] of sortedIds) {
      const email = this.emails.get(emailId)!
      results.push({ email, score, highlights })
    }

    return results
  }

  /**
   * Get autocomplete suggestions
   */
  getSuggestions(prefix: string, limit: number = 10): string[] {
    const lowerPrefix = prefix.toLowerCase()
    const suggestions: string[] = []

    // Search through tokens
    for (const token of this.index.keys()) {
      if (token.startsWith(lowerPrefix)) {
        suggestions.push(token)
        if (suggestions.length >= limit) break
      }
    }

    return suggestions
  }

  /**
   * Get index statistics
   */
  getStats(): SearchStats {
    let indexSize = 0

    // Estimate size
    for (const [token, ids] of this.index) {
      indexSize += token.length * 2 + ids.size * 36 // ~36 bytes per ID
    }

    return {
      totalIndexed: this.emails.size,
      lastIndexedAt: Date.now(),
      indexSizeBytes: indexSize
    }
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.index.clear()
    this.emails.clear()
    this.ngramIndex.clear()
  }

  /**
   * Export index data for persistence
   */
  export(): { emails: IndexedEmail[]; stats: SearchStats } {
    return {
      emails: Array.from(this.emails.values()),
      stats: this.getStats()
    }
  }

  /**
   * Import index data
   */
  import(data: { emails: IndexedEmail[] }): void {
    this.clear()
    for (const email of data.emails) {
      this.emails.set(email.id, email)

      // Rebuild token index
      for (const token of email.tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, new Set())
        }
        this.index.get(token)!.add(email.id)
      }

      // Rebuild n-gram index
      const subjectNgrams = createNGrams(email.subject)
      for (const ngram of subjectNgrams) {
        if (!this.ngramIndex.has(ngram)) {
          this.ngramIndex.set(ngram, new Set())
        }
        this.ngramIndex.get(ngram)!.add(email.id)
      }
    }
  }
}

// =============================================================================
// Search Store
// =============================================================================

interface SearchStore {
  recentSearches: string[]
  savedSearches: { id: string; name: string; query: string }[]
  searchHistory: { query: string; timestamp: number; resultCount: number }[]

  // Actions
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  saveSearch: (name: string, query: string) => void
  deleteSavedSearch: (id: string) => void
  recordSearch: (query: string, resultCount: number) => void
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      recentSearches: [],
      savedSearches: [],
      searchHistory: [],

      addRecentSearch: (query) => {
        set(state => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(q => q !== query)
          ].slice(0, 10)
        }))
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] })
      },

      saveSearch: (name, query) => {
        set(state => ({
          savedSearches: [
            ...state.savedSearches,
            {
              id: `search_${Date.now()}`,
              name,
              query
            }
          ]
        }))
      },

      deleteSavedSearch: (id) => {
        set(state => ({
          savedSearches: state.savedSearches.filter(s => s.id !== id)
        }))
      },

      recordSearch: (query, resultCount) => {
        set(state => ({
          searchHistory: [
            { query, timestamp: Date.now(), resultCount },
            ...state.searchHistory
          ].slice(0, 100)
        }))
      }
    }),
    {
      name: 'boxzero-search',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

// Global search index instance
let searchIndexInstance: SearchIndex | null = null

export function getSearchIndex(): SearchIndex {
  if (!searchIndexInstance) {
    searchIndexInstance = new SearchIndex()
  }
  return searchIndexInstance
}

export function useSearchIndex() {
  const indexRef = useRef(getSearchIndex())
  const [stats, setStats] = useState<SearchStats>({ totalIndexed: 0, lastIndexedAt: 0, indexSizeBytes: 0 })

  const indexEmails = useCallback((emails: Parameters<SearchIndex['indexEmail']>[0][]) => {
    for (const email of emails) {
      indexRef.current.indexEmail(email)
    }
    setStats(indexRef.current.getStats())
  }, [])

  const removeEmail = useCallback((emailId: string) => {
    indexRef.current.removeFromIndex(emailId)
    setStats(indexRef.current.getStats())
  }, [])

  const search = useCallback((query: string, options?: Parameters<SearchIndex['search']>[1]) => {
    return indexRef.current.search(query, options)
  }, [])

  const getSuggestions = useCallback((prefix: string) => {
    return indexRef.current.getSuggestions(prefix)
  }, [])

  const clearIndex = useCallback(() => {
    indexRef.current.clear()
    setStats(indexRef.current.getStats())
  }, [])

  return {
    stats,
    indexEmails,
    removeEmail,
    search,
    getSuggestions,
    clearIndex
  }
}

export function useSearch(initialQuery: string = '') {
  const { search, getSuggestions } = useSearchIndex()
  const searchStore = useSearchStore()

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const executeSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults = search(searchQuery)
    setResults(searchResults)
    setIsSearching(false)

    searchStore.addRecentSearch(searchQuery)
    searchStore.recordSearch(searchQuery, searchResults.length)
  }, [search, searchStore])

  const updateSuggestions = useCallback((text: string) => {
    if (text.length < 2) {
      setSuggestions([])
      return
    }

    const words = text.split(/\s+/)
    const lastWord = words[words.length - 1]

    if (lastWord.length >= 2) {
      setSuggestions(getSuggestions(lastWord))
    } else {
      setSuggestions([])
    }
  }, [getSuggestions])

  return {
    query,
    setQuery,
    results,
    suggestions,
    isSearching,
    executeSearch,
    updateSuggestions,
    recentSearches: searchStore.recentSearches,
    savedSearches: searchStore.savedSearches,
    saveSearch: searchStore.saveSearch,
    clearRecentSearches: searchStore.clearRecentSearches
  }
}

export default SearchIndex
