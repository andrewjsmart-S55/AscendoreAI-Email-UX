'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StarIcon as StarOutline,
  ArrowUturnRightIcon,
  ArrowUturnLeftIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  ArchiveBoxIcon,
  PaperClipIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  TagIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Email } from '@/types/email'

interface EmailViewProps {
  email?: Email | null
  onReply: (email: Email) => void
  onForward: (email: Email) => void
  onDelete: (emailId: string) => void
  onArchive: (emailId: string) => void
  onStar: (emailId: string) => void
}

export default function EmailView({
  email,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onStar
}: EmailViewProps) {
  const [showRawContent, setShowRawContent] = useState(false)
  
  if (!email) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-gray-400">📧</div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
          <p className="text-gray-500 max-w-sm">
            Choose an email from the list to view its contents
          </p>
        </div>
      </div>
    )
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Account info would come from props or context when needed

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 bg-white flex flex-col"
    >
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 mb-2 pr-4">
              {email.subject}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getSenderName(email.from).split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{getSenderName(email.from)}</div>
                  <div className="text-gray-500">{email.from}</div>
                </div>
              </div>
              <div className="text-gray-500">
                to <span className="text-gray-700">{email.to.join(', ')}</span>
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="text-gray-500">
                  cc <span className="text-gray-700">{email.cc.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStar(email.id)}
              className={`p-2 rounded-lg transition-colors ${
                email.isStarred 
                  ? 'text-yellow-400 hover:text-yellow-500' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {email.isStarred ? (
                <StarSolid className="w-5 h-5" />
              ) : (
                <StarOutline className="w-5 h-5" />
              )}
            </button>
            {email.isImportant && (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-gray-500 ml-2">
              {formatDate(email.receivedAt)}
            </span>
          </div>
        </div>

        {/* Labels */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {email.labels.map((labelId) => {
              const color = '#6b7280' // Default color - labels from API when implemented
              return (
                <span
                  key={labelId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                    border: `1px solid ${color}30`
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {labelId}
                </span>
              )
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(email)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
            Reply
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Reply All
          </button>
          <button
            onClick={() => onForward(email)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            Forward
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onArchive(email.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Archive"
          >
            <ArchiveBoxIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Attachments */}
        {email.attachments.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <PaperClipIcon className="w-4 h-4" />
              {email.attachments.length} {email.attachments.length === 1 ? 'Attachment' : 'Attachments'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <PaperClipIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="px-6 py-6">
          <div 
            className="email-content prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </div>
    </motion.div>
  )
}