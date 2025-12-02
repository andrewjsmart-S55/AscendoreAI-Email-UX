'use client'

/**
 * NG2 Search Bar - Advanced Search with Operator Autocomplete
 *
 * Features:
 * - Gmail-style search operators (from:, to:, has:, is:, etc.)
 * - Autocomplete suggestions for operators
 * - Recent search history
 * - Saved searches
 * - Filter chips for active filters
 * - Natural language detection
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  BookmarkIcon,
  FunnelIcon,
  SparklesIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import {
  useAdvancedSearch,
  SEARCH_OPERATORS,
  useSearchStore,
  SearchSuggestion,
  parseSearchQuery
} from '@/hooks/useAdvancedSearch'
import { Email } from '@/types/email'

interface NG2SearchBarProps {
  emails: Email[]
  onSearchResults?: (results: Email[]) => void
  onSearchChange?: (query: string) => void
  placeholder?: string
  className?: string
}

export function NG2SearchBar({
  emails,
  onSearchResults,
  onSearchChange,
  placeholder = 'Search emails... (try "from:john" or "has:attachment")',
  className = ''
}: NG2SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showOperatorHelp, setShowOperatorHelp] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    query,
    setQuery,
    parsedSearch,
    searchResults,
    suggestions,
    executeSearch,
    resultCount
  } = useAdvancedSearch({ emails, enabled: true })

  const recentSearches = useSearchStore((state) => state.recentSearches)
  const savedSearches = useSearchStore((state) => state.savedSearches)
  const saveSearch = useSearchStore((state) => state.saveSearch)
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches)

  // Build combined suggestions
  const allSuggestions = useCallback((): SearchSuggestion[] => {
    const result: SearchSuggestion[] = []

    // Check if user is typing an operator
    const lastWord = inputValue.split(' ').pop() || ''
    const isTypingOperator = lastWord.length > 0 && !lastWord.includes(':')

    // Add operator suggestions if typing
    if (isTypingOperator) {
      Object.entries(SEARCH_OPERATORS).forEach(([op, config]) => {
        if (op.toLowerCase().startsWith(lastWord.toLowerCase())) {
          result.push({
            type: 'filter',
            text: op,
            displayText: `${op} - ${config.description}`,
            icon: 'FunnelIcon',
            metadata: { examples: config.examples }
          })
        }
      })
    }

    // Add recent searches
    if (!isTypingOperator && recentSearches.length > 0) {
      recentSearches.slice(0, 3).forEach((search) => {
        result.push({
          type: 'recent',
          text: search,
          displayText: search,
          icon: 'ClockIcon'
        })
      })
    }

    // Add saved searches
    savedSearches.slice(0, 2).forEach((search) => {
      result.push({
        type: 'saved',
        text: search.query,
        displayText: `${search.name}: ${search.query}`,
        icon: 'BookmarkIcon'
      })
    })

    return result.slice(0, 8)
  }, [inputValue, recentSearches, savedSearches])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setQuery(value)
    setSelectedIndex(0)
    setIsOpen(true)
    onSearchChange?.(value)
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'filter') {
      // Append operator to input
      const words = inputValue.split(' ')
      words.pop()
      const newValue = [...words, suggestion.text].join(' ')
      setInputValue(newValue)
      setQuery(newValue)
      inputRef.current?.focus()
    } else {
      // Execute the search
      setInputValue(suggestion.text)
      executeSearch(suggestion.text)
    }
    setIsOpen(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentSuggestions = allSuggestions()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < currentSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : currentSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (currentSuggestions[selectedIndex]) {
          handleSelectSuggestion(currentSuggestions[selectedIndex])
        } else if (inputValue) {
          executeSearch(inputValue)
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      case 'Tab':
        if (currentSuggestions[selectedIndex]?.type === 'filter') {
          e.preventDefault()
          handleSelectSuggestion(currentSuggestions[selectedIndex])
        }
        break
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Notify parent of search results
  useEffect(() => {
    onSearchResults?.(searchResults)
  }, [searchResults, onSearchResults])

  // Clear search
  const handleClear = () => {
    setInputValue('')
    setQuery('')
    onSearchChange?.('')
    inputRef.current?.focus()
  }

  // Save current search
  const handleSaveSearch = () => {
    if (inputValue) {
      const name = prompt('Name this search:')
      if (name) {
        const parsed = parseSearchQuery(inputValue)
        saveSearch(name, inputValue, parsed.filters, 'user')
      }
    }
  }

  const currentSuggestions = allSuggestions()

  return (
    <div className={`relative ${className}`}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />

        {/* Right side buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Natural language indicator */}
          {parsedSearch?.isNaturalLanguage && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              AI
            </span>
          )}

          {/* Result count */}
          {query && (
            <span className="text-xs text-gray-500 mr-2">
              {resultCount} results
            </span>
          )}

          {/* Clear button */}
          {inputValue && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}

          {/* Save search button */}
          {inputValue && (
            <button
              onClick={handleSaveSearch}
              className="p-1 text-gray-400 hover:text-purple-400"
              title="Save this search"
            >
              <BookmarkIcon className="w-4 h-4" />
            </button>
          )}

          {/* Operator help toggle */}
          <button
            onClick={() => setShowOperatorHelp(!showOperatorHelp)}
            className="p-1 text-gray-400 hover:text-white"
            title="Search operators"
          >
            <FunnelIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {parsedSearch && parsedSearch.filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {parsedSearch.filters.map((filter, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-full"
            >
              <FunnelIcon className="w-3 h-3" />
              {filter.field}: {String(filter.value)}
              <button
                onClick={() => {
                  // Remove this filter from query
                  const newQuery = inputValue
                    .replace(
                      new RegExp(`${filter.field}:(?:"[^"]+"|\\S+)\\s*`, 'gi'),
                      ''
                    )
                    .trim()
                  setInputValue(newQuery)
                  setQuery(newQuery)
                }}
                className="ml-1 hover:text-white"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (currentSuggestions.length > 0 || showOperatorHelp) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Suggestions List */}
          {currentSuggestions.length > 0 && !showOperatorHelp && (
            <div className="max-h-64 overflow-y-auto">
              {currentSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700 ${
                    idx === selectedIndex ? 'bg-gray-700' : ''
                  }`}
                >
                  {/* Icon */}
                  <span className="text-gray-400">
                    {suggestion.type === 'recent' && (
                      <ClockIcon className="w-4 h-4" />
                    )}
                    {suggestion.type === 'saved' && (
                      <BookmarkIcon className="w-4 h-4" />
                    )}
                    {suggestion.type === 'filter' && (
                      <FunnelIcon className="w-4 h-4" />
                    )}
                  </span>

                  {/* Text */}
                  <span className="flex-1">
                    <span className="text-white">{suggestion.displayText}</span>
                    {suggestion.metadata?.examples && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        e.g. {suggestion.metadata.examples[0]}
                      </span>
                    )}
                  </span>

                  {/* Type badge */}
                  <span className="text-xs text-gray-500 capitalize">
                    {suggestion.type === 'filter' ? 'operator' : suggestion.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Operator Help */}
          {showOperatorHelp && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-white mb-3">
                Search Operators
              </h4>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {Object.entries(SEARCH_OPERATORS).map(([op, config]) => (
                  <button
                    key={op}
                    onClick={() => {
                      setInputValue(inputValue + (inputValue ? ' ' : '') + op)
                      setShowOperatorHelp(false)
                      inputRef.current?.focus()
                    }}
                    className="text-left p-2 rounded hover:bg-gray-700"
                  >
                    <span className="text-purple-400 font-mono text-sm">
                      {op}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {config.description}
                    </span>
                  </button>
                ))}
              </div>

              {/* Clear recent searches */}
              {recentSearches.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      clearRecentSearches()
                      setShowOperatorHelp(false)
                    }}
                    className="text-xs text-gray-500 hover:text-red-400"
                  >
                    Clear recent searches
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NG2SearchBar
