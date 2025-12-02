'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  PaperClipIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import UserProfile from './UserProfile'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onAIPrompt?: (prompt: string) => void
  onCompose?: () => void
  showFilters?: boolean
  isThreadPanelOpen?: boolean
  onSettingsOpen?: (tab?: string) => void
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
  onAIPrompt,
  onCompose,
  showFilters = true,
  isThreadPanelOpen = false,
  onSettingsOpen
}: SearchBarProps) {
  const [mode, setMode] = useState<'search' | 'chat'>('search')
  const [chatInput, setChatInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: '',
    sender: '',
    hasAttachments: false,
    isUnread: false,
    isStarred: false,
  })

  useEffect(() => {
    if (isThreadPanelOpen) {
      setMode('chat')
    } else {
      setMode('search')
    }
  }, [isThreadPanelOpen])

  const handleModeSwitch = (newMode: 'search' | 'chat') => {
    setMode(newMode)
    if (newMode === 'search') {
      setChatInput('')
    } else {
      setIsFiltersOpen(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (chatInput.trim() && !isProcessing) {
      setIsProcessing(true)
      
      toast.loading('AI is processing your request...', { id: 'ai-processing' })
      
      setTimeout(() => {
        toast.success('AI response generated!', { id: 'ai-processing' })
        if (onAIPrompt) {
          onAIPrompt(chatInput)
        }
        
        const lowerPrompt = chatInput.toLowerCase()
        if (lowerPrompt.includes('summarize')) {
          toast.success('Generating email summary...')
        } else if (lowerPrompt.includes('draft') || lowerPrompt.includes('reply')) {
          toast.success('Drafting response...')
        } else if (lowerPrompt.includes('find') || lowerPrompt.includes('search')) {
          toast.success('Searching emails...')
        } else if (lowerPrompt.includes('schedule')) {
          toast.success('Checking calendar and suggesting times...')
        }
        
        setChatInput('')
        setIsProcessing(false)
      }, 2000)
    }
  }

  const clearSearch = () => {
    onSearchChange('')
  }

  const applyFilters = () => {
    setIsFiltersOpen(false)
  }

  const clearFilters = () => {
    setFilters({
      dateRange: '',
      sender: '',
      hasAttachments: false,
      isUnread: false,
      isStarred: false,
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    typeof value === 'boolean' ? value : value !== ''
  )

  const promptSuggestions = [
    "Summarize today's important emails",
    "Draft a professional reply to the latest email",
    "Find all emails with attachments from this week",
    "Schedule a follow-up for pending tasks",
    "Create action items from unread emails",
  ]

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 h-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Compose Button */}
            {onCompose && (
              <button
                onClick={onCompose}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                Compose
              </button>
            )}

            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 h-10 flex-shrink-0">
              <button
                onClick={() => handleModeSwitch('search')}
                className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 min-w-[100px] justify-center h-full ${
                  mode === 'search'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                Search
              </button>
              <button
                onClick={() => handleModeSwitch('chat')}
                className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 min-w-[100px] justify-center h-full ${
                  mode === 'chat'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                AI Chat
              </button>
            </div>

            {mode === 'search' ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 max-w-lg relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search emails..."
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {showFilters && (
                  <motion.button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                      hasActiveFilters || isFiltersOpen
                        ? 'bg-primary-50 text-primary-600 border border-primary-200'
                        : 'text-gray-400 hover:text-gray-600 border border-gray-300'
                    }`}
                  >
                    <FunnelIcon className="w-4 h-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <form onSubmit={handleChatSubmit} className="flex-1 max-w-lg flex items-center gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-primary-500" />
                    </div>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask AI about emails..."
                      className="block w-full pl-10 pr-12 py-2 bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-lg text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-10"
                      disabled={isProcessing}
                    />
                    {chatInput && (
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isProcessing}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <div className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50">
                          <PaperAirplaneIcon className="h-4 w-4" />
                        </div>
                      </motion.button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          <UserProfile onSettingsOpen={onSettingsOpen} />
        </div>

        {mode === 'chat' && !chatInput && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-thin"
          >
            <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
              <SparklesIcon className="w-3 h-3" />
              Try:
            </span>
            {promptSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setChatInput(suggestion)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full whitespace-nowrap transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}

        {mode === 'search' && isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                  <option value="year">Past year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <UserIcon className="w-4 h-4 inline mr-1" />
                  From
                </label>
                <input
                  type="email"
                  value={filters.sender}
                  onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))}
                  placeholder="sender@example.com"
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachments}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <PaperClipIcon className="w-4 h-4 mr-1" />
                    Has attachments
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isUnread}
                    onChange={(e) => setFilters(prev => ({ ...prev, isUnread: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Unread only
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isStarred}
                    onChange={(e) => setFilters(prev => ({ ...prev, isStarred: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Starred only
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear all filters
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilters}
                  className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'chat' && isProcessing && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="bg-gradient-to-r from-primary-500 to-purple-500 h-1 mt-4"
          >
            <motion.div
              animate={{ x: ['0%', '100%'] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-full w-1/3 bg-white opacity-30"
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}