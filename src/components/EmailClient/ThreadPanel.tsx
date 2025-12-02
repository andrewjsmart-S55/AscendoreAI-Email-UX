'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  PaperAirplaneIcon,
  StarIcon as StarOutline,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PaperClipIcon,
  EllipsisHorizontalIcon,
  UserCircleIcon,
  SparklesIcon,
  UserPlusIcon,
  ShareIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Email, EmailThread, AIAction } from '@/types/email'
import { toast } from 'react-hot-toast'
import { useEmailThread } from '@/hooks/useEmails'
import { useAIActions, useApproveAIAction } from '@/hooks/useAIActions'

interface ThreadPanelProps {
  thread: EmailThread | null
  isOpen: boolean
  onClose: () => void
  onReply: (email: Email) => void
  onForward: (email: Email) => void
  onDelete: (emailId: string) => void
  onArchive: (emailId: string) => void
  onStar: (emailId: string) => void
  selectedFolder?: string
}

export default function ThreadPanel({
  thread,
  isOpen,
  onClose,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onStar,
  selectedFolder = 'inbox',
}: ThreadPanelProps) {
  const [replyText, setReplyText] = useState('')
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [activeTab, setActiveTab] = useState<'actions' | 'history'>('actions')

  // API hooks
  const { data: threadData } = useEmailThread(thread?.id || '')
  const { data: aiActionsData } = useAIActions(thread?.id || '')
  const approveActionMutation = useApproveAIAction()

  // Use API data or fallback to prop data
  const currentThread = (threadData || thread) as EmailThread | null
  const aiActions = aiActionsData?.actions || thread?.aiActions || []

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setShowReplyBox(false)
      setReplyText('')
    }
  }, [isOpen])

  const handleApproveAction = async (actionId: string) => {
    try {
      await approveActionMutation.mutateAsync(actionId)
    } catch (error) {
      console.error('Failed to approve action:', error)
    }
  }

  const getActionIcon = (type: AIAction['type']) => {
    switch (type) {
      case 'deleted': return TrashIcon
      case 'archived': return ArchiveBoxIcon
      case 'task_created': return DocumentTextIcon
      case 'reminder_set': return BellIcon
      case 'replied': return ArrowUturnLeftIcon
      case 'forwarded': return ArrowUturnRightIcon
      default: return CheckCircleIcon
    }
  }

  const getActionColor = (type: AIAction['type']) => {
    switch (type) {
      case 'deleted': return 'text-red-600 bg-red-50 border-red-200'
      case 'archived': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'task_created': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'reminder_set': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'replied': return 'text-green-600 bg-green-50 border-green-200'
      case 'forwarded': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Generate activity history for the thread
  const generateThreadHistory = () => {
    const activities: any[] = []

    if (!currentThread || !currentThread.emails) return activities

    // Add email activities
    currentThread.emails.forEach((email, index) => {
      activities.push({
        id: `email-${email.id}`,
        type: 'email_received',
        title: index === 0 ? 'Thread started' : 'Reply received',
        description: `Email from ${getSenderName(email.from)}`,
        timestamp: email.receivedAt,
        icon: index === 0 ? 'start' : 'reply',
        data: { sender: email.from, subject: email.subject }
      })
    })

    // Add AI action activities
    if (aiActions) {
      aiActions.forEach((action: any) => {
        activities.push({
          id: `action-${action.id}`,
          type: 'ai_action',
          title: `AI ${action.type.replace('_', ' ')}`,
          description: action.description,
          timestamp: action.timestamp,
          icon: 'ai',
          data: { confidence: action.confidence, approved: action.isApproved }
        })

        // Add approval activity if approved
        if (action.isApproved) {
          activities.push({
            id: `approval-${action.id}`,
            type: 'approval',
            title: 'Action approved',
            description: `Approved: ${action.description}`,
            timestamp: new Date(Date.now() + Math.random() * 10000).toISOString(), // Mock approval time
            icon: 'approved',
            data: { actionId: action.id }
          })
        }
      })
    }

    // Add mock user activities
    if (currentThread.isStarred) {
      activities.push({
        id: 'starred',
        type: 'user_action',
        title: 'Thread starred',
        description: 'Marked as important',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        icon: 'star',
        data: {}
      })
    }

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getHistoryIcon = (iconType: string) => {
    switch (iconType) {
      case 'start': return '🎬'
      case 'reply': return '💬'
      case 'ai': return '🤖'
      case 'approved': return '✅'
      case 'star': return '⭐'
      default: return '📧'
    }
  }

  const getFolderDisplayName = (folderId: string) => {
    const folderNames: Record<string, string> = {
      'inbox': 'Inbox',
      'sent': 'Sent',
      'drafts': 'Drafts',
      'archive': 'Archive',
      'all-folders': 'All Folders',
      'custom': 'Custom'
    }
    return folderNames[folderId] || folderId.charAt(0).toUpperCase() + folderId.slice(1)
  }

  const getSenderName = (email: string) => {
    if (!email || typeof email !== 'string') {
      return 'Unknown'
    }
    const parts = email.split('@')
    if (parts[0] && parts[0].includes('.')) {
      return parts[0].split('.').map(name =>
        name.charAt(0).toUpperCase() + name.slice(1)
      ).join(' ')
    }
    return parts[0] ? (parts[0].charAt(0).toUpperCase() + parts[0].slice(1)) : 'Unknown'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const handleSendReply = () => {
    if (!replyText.trim() || !currentThread || !currentThread.emails || currentThread.emails.length === 0) return

    toast.success('Reply sent!')
    setReplyText('')

    const latestEmail = currentThread.emails[currentThread.emails.length - 1]
    onReply(latestEmail)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSendReply()
    }
    // Allow Enter for new line, Ctrl+Enter for send
  }

  // Sort emails oldest to newest (chat style) - only if currentThread exists
  const sortedEmails = currentThread?.emails ? [...currentThread.emails].sort((a, b) => {
    return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
  }) : []

  // Group emails by date
  const emailsByDate = sortedEmails.reduce((groups, email) => {
    const date = formatDate(email.receivedAt)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(email)
    return groups
  }, {} as Record<string, Email[]>)

  return (
    <AnimatePresence>
      {isOpen && currentThread && (
        <>
          {/* Backdrop - Only covers main content area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bg-black bg-opacity-25 z-40"
            style={{
              top: '4rem', // Start below SearchBar header
              left: '21rem', // Start after navigation rail (5rem/80px) + sidebar (16rem/256px)
              right: 0,
              bottom: 0,
              width: 'calc(100vw - 21rem)'
            }}
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
            style={{
              top: '4rem', // Start below SearchBar header
              left: '21rem', // Navigation rail (5rem) + Sidebar width (16rem)
              right: 0,
              bottom: 0,
              width: 'calc(100vw - 21rem)' // Full width minus rail and sidebar
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex-1">
                {/* Title and Folder on same line */}
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>{getFolderDisplayName(selectedFolder)}</span>
                  </button>
                  <span className="text-gray-300">|</span>
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    Threads
                  </h2>
                </div>

                {/* Subject */}
                <h3 className="text-base font-medium text-gray-800 truncate mb-1">
                  {currentThread.subject}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentThread.messageCount} {currentThread.messageCount === 1 ? 'message' : 'messages'}
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => currentThread.emails?.[0]?.id && onStar(currentThread.emails[0].id)}
                  className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Star"
                >
                  {currentThread.isStarred ? (
                    <StarSolid className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <StarOutline className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={() => currentThread.emails?.[0]?.id && onArchive(currentThread.emails[0].id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Archive"
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => currentThread.emails?.[0]?.id && onDelete(currentThread.emails[0].id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                {Object.entries(emailsByDate).map(([date, emails]) => (
                  <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="px-3 text-xs font-medium text-gray-500 bg-white">
                      {date}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Emails for this date */}
                  {emails.map((email, emailIndex) => {
                    const isCurrentUser = email.from && typeof email.from === 'string' && email.from.includes('andrew') // Mock current user check with safety check
                    
                    return (
                      <motion.div
                        key={email.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: emailIndex * 0.1 }}
                        className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-medium ${
                          isCurrentUser 
                            ? 'from-primary-500 to-primary-600' 
                            : 'from-gray-400 to-gray-500'
                        }`}>
                          {getSenderName(email.from)[0]}
                        </div>

                        {/* Message */}
                        <div className={`flex-1 max-w-[70%] ${isCurrentUser ? 'text-right' : ''}`}>
                          <div className={`rounded-lg px-4 py-3 ${
                            isCurrentUser 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {/* Sender & Time */}
                            <div className={`flex items-center gap-2 mb-1 text-xs ${
                              isCurrentUser ? 'text-primary-100 justify-end' : 'text-gray-500'
                            }`}>
                              <span className="font-medium">
                                {isCurrentUser ? 'You' : getSenderName(email.from)}
                              </span>
                              <span>•</span>
                              <span>{formatTime(email.receivedAt)}</span>
                            </div>

                            {/* Content */}
                            <div
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: email.body }}
                            />

                            {/* Attachments */}
                            {email.attachments && email.attachments.length > 0 && (
                              <div className={`mt-2 pt-2 border-t ${
                                isCurrentUser ? 'border-primary-400' : 'border-gray-200'
                              }`}>
                                {email.attachments.map((attachment, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-2 text-xs ${
                                      isCurrentUser ? 'text-primary-100' : 'text-gray-600'
                                    }`}
                                  >
                                    <PaperClipIcon className="w-3 h-3" />
                                    <span>{attachment.name}</span>
                                    <span>({attachment.size})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Actions */}
                          <div className={`mt-2 flex items-center gap-2 ${
                            isCurrentUser ? 'justify-end' : ''
                          }`}>
                            <button
                              onClick={() => onReply(email)}
                              className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => onForward(email)}
                              className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                            >
                              Forward
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
                </div>
              </div>

              {/* AI Actions Sidebar */}
              {aiActions && aiActions.length > 0 && (
                <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto custom-scrollbar">
                  <div className="p-6">
                    {/* Header with Tabs */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <SparklesIcon className="w-5 h-5 text-primary-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setActiveTab('actions')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 flex-1 justify-center ${
                            activeTab === 'actions'
                              ? 'bg-white text-primary-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Actions
                        </button>
                        <button
                          onClick={() => setActiveTab('history')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 flex-1 justify-center ${
                            activeTab === 'history'
                              ? 'bg-white text-primary-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <ClockIcon className="w-4 h-4" />
                          History
                        </button>
                      </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'actions' ? (
                      <div>
                        {/* Actions List */}
                        <div className="space-y-4">
                          {aiActions.map((action: any) => {
                        const IconComponent = getActionIcon(action.type)
                        return (
                          <div
                            key={action.id}
                            className={`p-4 rounded-lg border ${getActionColor(action.type)} ${
                              action.isApproved ? 'opacity-70' : ''
                            }`}
                          >
                            {/* Action Header */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-white shadow-sm">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1">
                                  {action.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </h4>
                                <p className="text-sm leading-relaxed">
                                  {action.description}
                                </p>
                              </div>
                            </div>

                            {/* Action Details */}
                            {action.metadata && (
                              <div className="text-xs space-y-1 mb-3 pl-11">
                                {action.metadata.deadline && (
                                  <div className="flex items-center gap-2">
                                    <ClockIcon className="w-3 h-3" />
                                    <span>Deadline: {action.metadata.deadline}</span>
                                  </div>
                                )}
                                {action.metadata.amount && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{action.metadata.amount}</span>
                                    {action.metadata.expenseDate && (
                                      <span>• {action.metadata.expenseDate}</span>
                                    )}
                                  </div>
                                )}
                                {action.metadata.reminderDate && (
                                  <div className="flex items-center gap-2">
                                    <BellIcon className="w-3 h-3" />
                                    <span>Reminder: {new Date(action.metadata.reminderDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/20">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  action.confidence > 0.8 ? 'bg-green-400' :
                                  action.confidence > 0.6 ? 'bg-yellow-400' : 'bg-gray-400'
                                }`} />
                                <span className="text-xs">
                                  {Math.round(action.confidence * 100)}% confidence
                                </span>
                              </div>

                              {/* Approval Section */}
                              {action.isApproved ? (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircleIcon className="w-4 h-4" />
                                  Approved
                                </div>
                              ) : action.requiresApproval ? (
                                <button
                                  onClick={() => handleApproveAction(action.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Approve
                                </button>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Auto-approved
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                        {/* Summary */}
                        <div className="mt-6 p-3 bg-white rounded-lg border">
                          <div className="text-sm font-medium mb-2">Action Summary</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Total: {aiActions.length} actions</div>
                            <div>Approved: {aiActions.filter((a: any) => a.isApproved).length}</div>
                            <div>Pending: {aiActions.filter((a: any) => a.requiresApproval && !a.isApproved).length}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* History Timeline */}
                        <div className="relative">
                          {/* Timeline Line Background */}
                          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200"></div>

                          <div className="space-y-4">
                            {generateThreadHistory().map((activity, index) => (
                              <div key={activity.id} className="relative flex items-start gap-3">
                                {/* Timeline Icon */}
                                <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-sm relative z-10">
                                  {getHistoryIcon(activity.icon)}
                                </div>

                                {/* Timeline Content */}
                                <div className="flex-1">
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {activity.title}
                                      </h4>
                                      <span className="text-xs text-gray-500">
                                        {new Date(activity.timestamp).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2">
                                      {activity.description}
                                    </p>

                                    {/* Activity Details */}
                                    {activity.type === 'ai_action' && activity.data.confidence && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${
                                          activity.data.confidence > 0.8 ? 'bg-green-400' :
                                          activity.data.confidence > 0.6 ? 'bg-yellow-400' : 'bg-gray-400'
                                        }`} />
                                        <span className="text-gray-500">
                                          {Math.round(activity.data.confidence * 100)}% confidence
                                        </span>
                                        {activity.data.approved && (
                                          <span className="text-green-600">• Approved</span>
                                        )}
                                      </div>
                                    )}

                                    {activity.type === 'email_received' && activity.data.subject && (
                                      <div className="text-xs text-gray-500 font-mono">
                                        "{activity.data.subject}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* History Summary */}
                        <div className="mt-6 p-3 bg-white rounded-lg border">
                          <div className="text-sm font-medium mb-2">Activity Summary</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Total activities: {generateThreadHistory().length}</div>
                            <div>Emails: {currentThread.emails.length}</div>
                            <div>AI actions: {aiActions?.length || 0}</div>
                            <div>Last activity: {new Date(currentThread.lastActivity).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Reply Box */}
            <div className="border-t border-gray-200 bg-gray-50">
              {showReplyBox ? (
                <div className="p-6">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[8rem] max-h-[16rem]"
                    autoFocus
                  />
                  
                  {/* Advanced Reply Options */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowReplyBox(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      
                      {/* Attachment Button */}
                      <button
                        onClick={() => toast.success('File attachment coming soon!')}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        title="Attach file"
                      >
                        <PaperClipIcon className="w-4 h-4" />
                        Attach
                      </button>
                      
                      {/* Advanced Options Button */}
                      <button
                        onClick={() => {
                          if (currentThread.emails && currentThread.emails.length > 0) {
                            const latestEmail = currentThread.emails[currentThread.emails.length - 1]
                            onReply(latestEmail)
                            setShowReplyBox(false)
                          }
                        }}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        title="Advanced compose (CC, BCC, formatting)"
                      >
                        <EllipsisHorizontalIcon className="w-4 h-4" />
                        More Options
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* AI Assist Button */}
                      <button
                        onClick={() => toast.success('AI writing assistant activated!')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        title="Get AI writing suggestions"
                      >
                        ✨ AI Assist
                      </button>
                      
                      {/* Send Options */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Ctrl+Enter to send</span>
                        <div className="flex items-center">
                          <button
                            onClick={handleSendReply}
                            disabled={!replyText.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-l-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Send
                          </button>
                          
                          {/* Send Options Dropdown */}
                          <button
                            onClick={() => toast.success('Schedule send coming soon!')}
                            className="px-2 py-2 bg-primary-600 text-white border-l border-primary-700 rounded-r-lg hover:bg-primary-700 transition-colors"
                            title="Send options (Schedule, etc.)"
                          >
                            <ArrowUturnRightIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reply Type Indicators */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>Replying to thread</span>
                    <span>•</span>
                    <span>{currentThread.messageCount} messages</span>
                    <span>•</span>
                    <span>Enter for new line, Ctrl+Enter to send</span>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {/* Quick Reply Prompt */}
                  <button
                    onClick={() => setShowReplyBox(true)}
                    className="w-full p-4 text-left text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-dashed border-gray-300 mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>Click to write a quick reply...</span>
                    </div>
                  </button>
                  
                  {/* Quick Action Buttons - Enhanced with New Options */}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Primary Actions */}
                    <button
                      onClick={() => {
                        setShowReplyBox(true)
                        // Default Reply action replies to all in thread
                        toast.success('Replying to all participants')
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                      title="Reply to all participants in thread"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                      Reply
                    </button>
                    
                    <button
                      onClick={() => {
                        if (currentThread.emails && currentThread.emails.length > 0) {
                          const latestEmail = currentThread.emails[currentThread.emails.length - 1]
                          onForward(latestEmail)
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowUturnRightIcon className="w-4 h-4" />
                      Forward
                    </button>
                    
                    {/* AI Actions */}
                    <button
                      onClick={() => {
                        toast.success('AI is generating a reply to all...')
                        setShowReplyBox(true)
                        // Simulate AI generation for reply all
                        setTimeout(() => {
                          setReplyText('Thank you for your email. I\'ve reviewed the information and...')
                        }, 1000)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                      title="Generate AI reply to all participants"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      AI Reply
                    </button>
                    
                    {/* Additional Actions */}
                    <button
                      onClick={() => {
                        toast.success('Opening delegate options...')
                        // Handle delegate - like forward but with specific context
                        if (currentThread.emails && currentThread.emails.length > 0) {
                          const latestEmail = currentThread.emails[currentThread.emails.length - 1]
                          onForward(latestEmail)
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      title="Delegate this thread to someone else"
                    >
                      <ShareIcon className="w-4 h-4" />
                      Delegate
                    </button>
                    
                    <button
                      onClick={() => {
                        toast.success('Opening contacts selector...')
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      title="Add more contacts to this thread"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Add Contacts
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}