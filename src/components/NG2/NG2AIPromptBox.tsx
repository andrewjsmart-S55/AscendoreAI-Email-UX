'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperAirplaneIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface NG2AIPromptBoxProps {
  className?: string
  onPromptSubmit?: (prompt: string) => void
}

interface ConversationMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export default function NG2AIPromptBox({ className = '', onPromptSubmit }: NG2AIPromptBoxProps) {
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '👋 Welcome to BoxZero NG2! I\'m your AI email assistant. Try commands like "show my unread emails", "compose email to john@example.com", or "sync my accounts".',
      timestamp: new Date()
    }
  ])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [prompt])

  // Scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [conversation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isProcessing) return

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, userMessage])
    setIsProcessing(true)

    // Call the optional callback
    onPromptSubmit?.(prompt)

    // Simulate AI processing
    setTimeout(() => {
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: getAIResponse(prompt),
        timestamp: new Date()
      }

      setConversation(prev => [...prev, assistantMessage])
      setIsProcessing(false)
    }, 1500)

    setPrompt('')
  }

  const getAIResponse = (userPrompt: string): string => {
    const lowerPrompt = userPrompt.toLowerCase()

    if (lowerPrompt.includes('unread') || lowerPrompt.includes('inbox')) {
      return '📧 I found 25 unread emails across your 3 accounts. The most urgent ones are: "Q4 Budget Review Meeting" from Sarah Wilson, and "Course Registration Opens Tomorrow" from University. Would you like me to prioritize them by sender importance or show you the most recent ones first?'
    } else if (lowerPrompt.includes('compose') || lowerPrompt.includes('write')) {
      return '✍️ I can help you compose an email! Please provide the recipient and a brief description of what you\'d like to say. I can suggest subject lines and format the content professionally.'
    } else if (lowerPrompt.includes('sync') || lowerPrompt.includes('refresh')) {
      return '🔄 I\'ll start syncing your email accounts. Based on your current setup (Gmail, Outlook, and Personal accounts), this usually takes 2-3 minutes. I\'ll notify you when it\'s complete!'
    } else if (lowerPrompt.includes('search') || lowerPrompt.includes('find')) {
      return '🔍 I can search through your 390 emails across all accounts. What specific content, sender, or date range are you looking for? I can also search by labels like "important", "finance", or "personal".'
    } else if (lowerPrompt.includes('schedule') || lowerPrompt.includes('remind')) {
      return '⏰ I can help you schedule emails or set reminders. What would you like me to schedule? I can send emails at optimal times or remind you to follow up on important messages.'
    } else if (lowerPrompt.includes('summary') || lowerPrompt.includes('digest')) {
      return '📊 Here\'s your email summary: 25 unread emails, 3 require immediate attention, and 8 are newsletters/updates. Your busiest account is Personal Gmail with 156 emails. Would you like me to organize them by priority?'
    } else if (lowerPrompt.includes('today') || lowerPrompt.includes('today\'s')) {
      return '📅 Today\'s email activity: You received 8 emails and sent 3. Most active conversations are about Q4 budget planning and family reunion planning. Your average response time is excellent at 2.3 hours.'
    } else if (lowerPrompt.includes('accounts') || lowerPrompt.includes('account')) {
      return '🔗 You have 3 linked accounts: Corporate Email (Gmail, 145 emails), Project Team (Outlook, 89 emails), and Personal Gmail (156 emails). All accounts are currently synced and active.'
    } else {
      return `🤖 I understand you want to "${userPrompt}". I'm still learning this command. For now, I can help with: checking unread emails, composing messages, syncing accounts, searching emails, creating summaries, and providing daily insights. Try asking "show me today's summary" or "sync all accounts".`
    }
  }

  const quickActions = [
    { label: 'Show unread emails', icon: '📧' },
    { label: 'Sync all accounts', icon: '🔄' },
    { label: 'Daily email summary', icon: '📊' },
    { label: 'Compose new email', icon: '✍️' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={`bg-white rounded-xl shadow-sm border ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900">
            AI Email Assistant
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          Tell me what you'd like to do with your emails
        </p>
      </div>

      {/* Conversation History */}
      <div
        ref={conversationRef}
        className="h-80 overflow-y-auto p-6 space-y-4 bg-gray-50"
      >
        <AnimatePresence>
          {conversation.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'system'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="text-sm">
                  {message.content}
                </div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white text-gray-900 border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => setPrompt(action.label)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your request... (e.g., 'show me unread emails from this week')"
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              rows={1}
              maxLength={500}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <div className="text-xs text-gray-500 mt-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isProcessing}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Send</span>
          </button>
        </div>
      </form>
    </motion.div>
  )
}