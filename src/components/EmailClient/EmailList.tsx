'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StarIcon as StarOutline,
  ExclamationTriangleIcon,
  PaperClipIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Email, EmailThread } from '@/types/email'

interface EmailListProps {
  selectedFolder: string
  selectedAccount: string
  selectedEmailId?: string
  onEmailSelect: (emailId: string) => void
  searchQuery: string
  viewMode: 'list' | 'threads'
  emails?: Email[]
  isLoading?: boolean
}

export default function EmailList({
  selectedFolder,
  selectedAccount,
  selectedEmailId,
  onEmailSelect,
  searchQuery,
  viewMode = 'list',
  emails = [],
  isLoading = false
}: EmailListProps) {
  // Filter emails based on search query (folder/account filtering is done at API level)
  const filteredEmails = emails.filter(email => {
    const matchesSearch = searchQuery === '' ||
      email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d`
    }
  }

  const getSenderName = (email: string) => {
    const parts = email.split('@')
    if (parts[0].includes('.')) {
      return parts[0].split('.').map(name => 
        name.charAt(0).toUpperCase() + name.slice(1)
      ).join(' ')
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  }

  const getLabelColor = (labelId: string) => {
    // Labels will come from API when implemented
    return '#6b7280'
  }

  if (filteredEmails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <UserCircleIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
          <p className="text-gray-500 max-w-sm">
            {searchQuery ? 'Try adjusting your search terms' : 'This folder is empty'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 capitalize">
            {selectedFolder === 'inbox' ? 'Inbox' : selectedFolder}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
          </span>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {filteredEmails.map((email, index) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onEmailSelect(email.id)}
              className={`border-b border-gray-100 px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 ${
                selectedEmailId === email.id ? 'bg-primary-50 border-primary-200' : ''
              } ${!email.isRead ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-medium">
                    {getSenderName(email.from).split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </span>
                </div>

                {/* Email Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium text-sm text-gray-900 truncate ${
                        !email.isRead ? 'font-semibold' : ''
                      }`}>
                        {getSenderName(email.from)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {email.from}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {formatTime(email.receivedAt)}
                      </span>
                      {email.isStarred && (
                        <StarSolid className="w-4 h-4 text-yellow-400" />
                      )}
                      {email.isImportant && (
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      )}
                      {email.attachments.length > 0 && (
                        <PaperClipIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <h4 className={`text-sm mb-1 truncate ${
                    !email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  }`}>
                    {email.subject}
                  </h4>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {email.body.replace(/<[^>]*>/g, '').substring(0, 120)}...
                  </p>

                  {/* Labels */}
                  {email.labels && email.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {email.labels.map((labelId) => {
                        const color = getLabelColor(labelId)
                        return (
                          <span
                            key={labelId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                              border: `1px solid ${color}30`
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {labelId}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}