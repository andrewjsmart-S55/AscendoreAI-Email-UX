'use client'

/**
 * Activity Feed Component
 *
 * Complete, searchable log of all email and system actions.
 * Supports filtering, search, and 30-day undo guarantee.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  EnvelopeOpenIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
  ArrowPathIcon,
  LinkIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import {
  ActivityEvent,
  ActivityCategory,
  ActivityFilter,
  ACTIVITY_CATEGORIES,
  getActivityIcon
} from '@/types/activity'
import { useActivityStore } from '@/stores/activityStore'

// =============================================================================
// Icon Mapping
// =============================================================================

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  EnvelopeOpenIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
  LinkIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
}

function getIconComponent(iconName: string) {
  return iconComponents[iconName] || CheckCircleIcon
}

// =============================================================================
// Color Mapping
// =============================================================================

function getColorClasses(color: string): { bg: string; text: string; border: string } {
  switch (color) {
    case 'blue':
      return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' }
    case 'purple':
      return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' }
    case 'green':
      return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
    case 'yellow':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' }
    case 'red':
      return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ActivityItemProps {
  event: ActivityEvent
  onUndo: (eventId: string) => void
  isUndoing: boolean
}

function ActivityItem({ event, onUndo, isUndoing }: ActivityItemProps) {
  const IconComponent = getIconComponent(event.icon)
  const colors = getColorClasses(event.color)
  const [showDetails, setShowDetails] = useState(false)

  const canUndo = event.isUndoable && !event.isUndone &&
    (!event.undoDeadline || new Date(event.undoDeadline) > new Date())

  const timeAgo = useMemo(() => {
    const date = new Date(event.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }, [event.timestamp])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative ${event.isUndone ? 'opacity-50' : ''}`}
    >
      <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg} hover:shadow-sm transition-shadow`}>
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg bg-white ${colors.text}`}>
          <IconComponent className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-medium ${event.isUndone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {event.description}
              </p>
              {event.emailSubject && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {event.senderEmail} • {event.emailSubject}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
          </div>

          {/* AI Badge */}
          {event.wasAutoExecuted && (
            <div className="flex items-center gap-1 mt-1">
              <SparklesIcon className="h-3 w-3 text-purple-500" />
              <span className="text-xs text-purple-600">
                AI auto-action ({Math.round((event.aiConfidence || 0) * 100)}% confidence)
              </span>
            </div>
          )}

          {/* Category Badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {event.category}
            </span>
            {event.isUndone && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Undone
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canUndo && (
            <button
              onClick={() => onUndo(event.id)}
              disabled={isUndoing}
              className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Undo this action"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-11 mt-1 p-3 bg-white rounded-lg border border-gray-100 text-xs space-y-1"
          >
            <div className="flex justify-between">
              <span className="text-gray-500">Event ID:</span>
              <span className="text-gray-700 font-mono">{event.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Timestamp:</span>
              <span className="text-gray-700">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
            {event.accountEmail && (
              <div className="flex justify-between">
                <span className="text-gray-500">Account:</span>
                <span className="text-gray-700">{event.accountEmail}</span>
              </div>
            )}
            {event.predictionId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Prediction ID:</span>
                <span className="text-gray-700 font-mono">{event.predictionId}</span>
              </div>
            )}
            {canUndo && event.undoDeadline && (
              <div className="flex justify-between">
                <span className="text-gray-500">Undo deadline:</span>
                <span className="text-gray-700">{new Date(event.undoDeadline).toLocaleDateString()}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

interface NG2ActivityFeedProps {
  maxHeight?: string
  showHeader?: boolean
  initialLimit?: number
}

export default function NG2ActivityFeed({
  maxHeight = 'h-full',
  showHeader = true,
  initialLimit = 50
}: NG2ActivityFeedProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [limit, setLimit] = useState(initialLimit)

  // Store hooks
  const events = useActivityStore(state => state.events)
  const undoEvent = useActivityStore(state => state.undoEvent)
  const setFilter = useActivityStore(state => state.setFilter)
  const setStoreSearchQuery = useActivityStore(state => state.setSearchQuery)

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.emailSubject?.toLowerCase().includes(query) ||
        e.senderEmail?.toLowerCase().includes(query)
      )
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(e => new Date(e.timestamp) >= startDate)
    }

    return filtered.slice(0, limit)
  }, [events, selectedCategory, searchQuery, dateRange, limit])

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayEvents = events.filter(e => e.timestamp.startsWith(today))

    return {
      total: events.length,
      today: todayEvents.length,
      undoable: events.filter(e => e.isUndoable && !e.isUndone).length,
      aiActions: events.filter(e => e.category === 'ai').length
    }
  }, [events])

  const handleUndo = useCallback(async (eventId: string) => {
    setUndoingId(eventId)
    try {
      await undoEvent(eventId)
    } finally {
      setUndoingId(null)
    }
  }, [undoEvent])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setStoreSearchQuery(query)
  }, [setStoreSearchQuery])

  const handleCategoryFilter = useCallback((category: ActivityCategory | null) => {
    setSelectedCategory(category)
    setFilter(category ? { category } : {})
  }, [setFilter])

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {}

    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp)
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

      let key: string
      if (date.toDateString() === today.toDateString()) {
        key = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday'
      } else {
        key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    })

    return groups
  }, [filteredEvents])

  // Empty state
  if (events.length === 0) {
    return (
      <div className={`${maxHeight} flex flex-col items-center justify-center p-8 text-center`}>
        <div className="p-4 bg-gray-50 rounded-full mb-4">
          <CalendarDaysIcon className="h-12 w-12 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Your email actions and AI suggestions will appear here. Start processing emails to see your activity log.
        </p>
      </div>
    )
  }

  return (
    <div className={`${maxHeight} flex flex-col bg-white`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{stats.today} today</span>
              <span>•</span>
              <span>{stats.undoable} undoable</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showFilters ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>

            {/* Category Quick Filters */}
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !selectedCategory ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {ACTIVITY_CATEGORIES.slice(0, 4).map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Extended Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Time Range</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Category</label>
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => handleCategoryFilter(e.target.value as ActivityCategory || null)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All Categories</option>
                      {ACTIVITY_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No matching activity found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {date}
                </h3>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {dateEvents.map((event) => (
                      <ActivityItem
                        key={event.id}
                        event={event}
                        onUndo={handleUndo}
                        isUndoing={undoingId === event.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredEvents.length >= limit && (
          <div className="text-center pt-4">
            <button
              onClick={() => setLimit(l => l + 50)}
              className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Load more activity
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filteredEvents.length} of {events.length} events</span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            30-day undo guarantee
          </span>
        </div>
      </div>
    </div>
  )
}
