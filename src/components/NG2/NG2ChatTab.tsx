'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon,
  BookmarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import ThreadPanel from '../EmailClient/ThreadPanel'
import { EmailThread, Email } from '@/types/email'
import { toast } from 'react-hot-toast'

interface ConversationMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface PromptItem {
  id: string
  text: string
  category: 'frequent' | 'recent' | 'pinned'
  isPinned: boolean
  useCount: number
  lastUsed: Date
}

interface VIPEmail {
  id: string
  subject: string
  sender: string
  senderEmail: string
  preview: string
  timestamp: string
  isUnread: boolean
  isImportant: boolean
  priority: 'high' | 'medium' | 'low'
}

// Helper functions moved outside component
const getPromptsByCategory = (category: string, promptLists: PromptItem[]) => {
  return promptLists.filter(item => {
    if (category === 'frequent') return item.category === 'frequent' || (item.category === 'recent' && item.useCount > 10)
    if (category === 'recent') return item.category === 'recent'
    if (category === 'pinned') return item.isPinned
    return false
  }).sort((a, b) => {
    if (category === 'frequent') return b.useCount - a.useCount
    if (category === 'recent') return b.lastUsed.getTime() - a.lastUsed.getTime()
    return 0
  }).slice(0, 5)
}

const createThreadFromVIPEmail = (vipEmail: VIPEmail): EmailThread => {
  const thread: any = {
    id: vipEmail.id,
    subject: vipEmail.subject,
    participants: [vipEmail.senderEmail],
    lastActivity: new Date(vipEmail.timestamp).toISOString(),
    isUnread: vipEmail.isUnread,
    isImportant: vipEmail.isImportant,
    folder: 'inbox',
    labels: vipEmail.priority === 'high' ? ['important'] : [],
    emails: [
      {
        id: `${vipEmail.id}-1`,
        messageId: `${vipEmail.id}-1`,
        subject: vipEmail.subject,
        from: vipEmail.senderEmail,
        to: ['you@example.com'],
        cc: [],
        bcc: [],
        receivedAt: new Date(vipEmail.timestamp).toISOString(),
        body: `<p>Dear recipient,</p>
               <p>${vipEmail.preview}</p>
               <p>This is an important email that requires your attention.</p>
               <p>Best regards,<br>${vipEmail.sender}</p>`,
        isRead: !vipEmail.isUnread,
        isStarred: false,
        isImportant: vipEmail.isImportant,
        isSpam: false,
        isTrash: false,
        isDraft: false,
        attachments: [],
        labels: vipEmail.priority === 'high' ? ['important'] : [],
        folder: 'inbox',
        accountId: 'default'
      }
    ],
    messageCount: 1,
    isStarred: false,
    accountId: 'default'
  }
  return thread as EmailThread
}

export default function NG2ChatTab() {
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showThreadView, setShowThreadView] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [conversations, setConversations] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to BoxZero NG! I\'m your AI email assistant. Ask me anything about your emails, get summaries, or let me help you craft responses.',
      timestamp: new Date()
    }
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const vipEmailsRef = useRef<HTMLDivElement>(null)

  const promptLists: PromptItem[] = [
    { id: '1', text: 'Summarize my unread emails', category: 'frequent', isPinned: true, useCount: 15, lastUsed: new Date() },
    { id: '2', text: 'Draft a professional follow-up email', category: 'frequent', isPinned: false, useCount: 12, lastUsed: new Date() },
    { id: '3', text: 'Find emails about project deadlines', category: 'recent', isPinned: false, useCount: 8, lastUsed: new Date() },
    { id: '4', text: 'Help me respond to client inquiries', category: 'frequent', isPinned: true, useCount: 20, lastUsed: new Date() },
    { id: '5', text: 'Show me emails from my manager', category: 'recent', isPinned: false, useCount: 5, lastUsed: new Date() },
  ]

  const vipEmails: VIPEmail[] = [
    {
      id: 'vip-1',
      subject: 'Urgent: Q4 Budget Review Meeting',
      sender: 'Sarah Johnson',
      senderEmail: 'sarah.johnson@company.com',
      preview: 'We need to discuss the Q4 budget allocations before the board meeting next week...',
      timestamp: '2 hours ago',
      isUnread: true,
      isImportant: true,
      priority: 'high'
    },
    {
      id: 'vip-2',
      subject: 'Client Proposal Feedback',
      sender: 'Michael Chen',
      senderEmail: 'michael.chen@client.com',
      preview: 'Thank you for the comprehensive proposal. I have a few questions regarding...',
      timestamp: '5 hours ago',
      isUnread: true,
      isImportant: true,
      priority: 'high'
    },
    {
      id: 'vip-3',
      subject: 'Team Performance Review Schedule',
      sender: 'Jennifer Williams',
      senderEmail: 'jennifer.williams@company.com',
      preview: 'Please find attached the schedule for next month\'s performance reviews...',
      timestamp: '1 day ago',
      isUnread: false,
      isImportant: true,
      priority: 'medium'
    }
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations])

  useEffect(() => {
    if (showThreadView && vipEmailsRef.current) {
      vipEmailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [showThreadView])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isProcessing) return

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    }

    setConversations(prev => [...prev, userMessage])
    setPrompt('')
    setIsProcessing(true)
    setShowThreadView(true)

    setTimeout(() => {
      const aiResponse: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: getAIResponse(prompt),
        timestamp: new Date()
      }
      setConversations(prev => [...prev, aiResponse])
      setIsProcessing(false)
    }, 1500)
  }

  const getAIResponse = (userPrompt: string): string => {
    const responses = [
      `Based on your request "${userPrompt}", I've analyzed your emails and found several key insights. I've also prepared a list of VIP emails that might need your immediate attention. You can click on any email title below to view the full thread.`,
      `I've processed your query "${userPrompt}" and identified important emails that match your criteria. The VIP emails section below shows the most relevant messages. Click on any email to see the complete conversation thread.`,
      `Your request "${userPrompt}" has been analyzed. I've surfaced the most important emails in the VIP section below. Each email can be clicked to open the full thread view where you can read, reply, or take actions.`
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handlePromptClick = (promptText: string) => {
    setPrompt(promptText)
  }

  const togglePin = (promptId: string) => {
    toast.success('Prompt pinned!')
  }

  const handleEmailClick = (emailId: string) => {
    const email = vipEmails.find(e => e.id === emailId)
    if (email) {
      const thread = createThreadFromVIPEmail(email)
      setSelectedThread(thread)
      setSelectedThreadId(emailId)
    }
  }

  const handleCloseThreadPanel = () => {
    setSelectedThread(null)
    setSelectedThreadId(null)
  }

  const handleReply = (email: Email) => {
    toast.success('Reply functionality would open here')
  }

  const handleForward = (email: Email) => {
    toast.success('Forward functionality would open here')
  }

  const handleDelete = (emailId: string) => {
    toast.success('Email deleted')
  }

  const handleArchive = (emailId: string) => {
    toast.success('Email archived')
  }

  const handleStar = (emailId: string) => {
    toast.success('Email starred')
  }

  // VIP Emails Component
  const VIPEmailsView = () => {
    if (!showThreadView) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4"
        data-vip-emails
        ref={vipEmailsRef}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            VIP Emails
          </h3>
          <button
            onClick={() => setShowThreadView(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {vipEmails.map((email) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleEmailClick(email.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-1 cursor-pointer">
                    {email.subject}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{email.sender} • {email.timestamp}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{email.preview}</p>
                </div>
                {email.isUnread && (
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-3 mt-1"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click on any email title to view the full thread and conversation details
          </p>
        </div>
      </motion.div>
    )
  }

  // Prompt List Component
  const PromptList = ({ title, category, icon: Icon }: { title: string, category: string, icon: any }) => {
    const prompts = getPromptsByCategory(category, promptLists)

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <div className="space-y-2">
          {prompts.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={() => handlePromptClick(item.text)}
            >
              <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1 line-clamp-2">
                {item.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePin(item.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
              >
                {item.isPinned ? (
                  <BookmarkSolidIcon className="h-3 w-3 text-purple-600" />
                ) : (
                  <BookmarkIcon className="h-3 w-3 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Thread Panel Overlay
  if (selectedThread) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <ThreadPanel
          isOpen={true}
          thread={selectedThread}
          onClose={handleCloseThreadPanel}
          onReply={handleReply}
          onForward={handleForward}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onStar={handleStar}
          selectedFolder="inbox"
        />
      </div>
    )
  }

  // Main component return
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Centered Chat Container - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center px-6 py-8 min-h-full">
          <div className="w-full max-w-4xl flex flex-col">
            {/* Chat Area */}
            <div className="flex flex-col bg-white rounded-xl shadow-sm border mb-6">
              {/* Conversation History */}
              <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
                <AnimatePresence>
                  {conversations.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-purple-600 text-white'
                            : message.type === 'system'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 text-gray-900 p-4 rounded-lg max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="text-sm text-gray-600 ml-2">Processing your request...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask me anything about your emails..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isProcessing}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </div>

            {/* VIP Emails Section */}
            <VIPEmailsView />

            {/* Quick Prompts Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <PromptList
                title="Frequent"
                category="frequent"
                icon={FireIcon}
              />
              <PromptList
                title="Recent"
                category="recent"
                icon={ClockIcon}
              />
              <PromptList
                title="Pinned"
                category="pinned"
                icon={BookmarkSolidIcon}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}