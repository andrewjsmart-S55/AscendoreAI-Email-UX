'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  ChartBarIcon,
  PaperAirplaneIcon,
  ClockIcon,
  MapPinIcon,
  FireIcon,
  InboxIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<'ai-chat' | 'dashboard'>('ai-chat')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])

  // Mock data for prompts
  const mostFrequentlyUsed = [
    'Summarize my unread emails',
    'Draft a professional response',
    'Find emails about the Q4 project',
    'Schedule a follow-up reminder',
    'Categorize my inbox',
    'Create a task list from emails',
    'Find all attachments from this week',
    'Analyze email sentiment',
    'Generate meeting notes',
    'Archive old conversations'
  ]

  const mostRecentlyUsed = [
    'Reply to John about the proposal',
    'Find invoices from last month',
    'Draft thank you email',
    'Search for flight confirmations',
    'Summarize team updates',
    'Create expense report from receipts',
    'Find all emails from Sarah',
    'Generate weekly status report',
    'Check calendar conflicts',
    'Review contract attachments'
  ]

  const pinnedPrompts = [
    'Daily inbox summary',
    'Priority email triage',
    'Meeting preparation checklist',
    'Follow-up reminder template',
    'Client communication draft',
    'Project status update',
    'Team announcement template',
    'Vacation auto-responder',
    'Invoice processing workflow',
    'Newsletter draft assistance'
  ]

  // Mock inbox statistics
  const inboxStats = {
    totalEmails: 145,
    unread: 12,
    flagged: 5,
    needsReply: 8,
    scheduled: 3,
    archived: 234,
    todayReceived: 23,
    todaySent: 15,
    averageResponseTime: '2.5 hours',
    inboxZeroProgress: 72 // percentage
  }

  const handleSendPrompt = () => {
    if (!prompt.trim()) return
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: prompt }])
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'll help you with: "${prompt}". Based on your email patterns, here's what I suggest...` 
      }])
    }, 1000)
    
    setPrompt('')
    toast.success('Processing your request...')
  }

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt)
    handleSendPrompt()
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-1 px-6 pt-4">
          <button
            onClick={() => setActiveTab('ai-chat')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'ai-chat'
                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              AI Chat
            </div>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4" />
              Dashboard
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'ai-chat' ? (
            <motion.div
              key="ai-chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col p-6"
            >
              {/* Top Section - Prompt Input */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    How can I help you today?
                  </h2>
                  <p className="text-gray-600">
                    Ask me anything about your emails, schedule, or tasks
                  </p>
                </div>

                {/* Prompt Input Box */}
                <div className="max-w-4xl mx-auto">
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSendPrompt()
                        }
                      }}
                      placeholder="Ask anything about your emails, schedule, or tasks..."
                      className="w-full h-32 p-4 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={handleSendPrompt}
                      disabled={!prompt.trim()}
                      className="absolute bottom-4 right-4 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to send
                  </p>
                </div>
              </div>

              {/* Bottom Section - Three Preset Prompt Lists Side-by-Side */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-6">
                  {/* Most Frequently Used */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FireIcon className="w-5 h-5 text-orange-500" />
                      <h3 className="font-medium text-gray-900">Most Frequently Used</h3>
                    </div>
                    <div className="space-y-2">
                      {mostFrequentlyUsed.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Most Recently Used */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ClockIcon className="w-5 h-5 text-blue-500" />
                      <h3 className="font-medium text-gray-900">Most Recently Used</h3>
                    </div>
                    <div className="space-y-2">
                      {mostRecentlyUsed.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pinned Prompts */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPinIcon className="w-5 h-5 text-purple-500" />
                      <h3 className="font-medium text-gray-900">Pinned</h3>
                    </div>
                    <div className="space-y-2">
                      {pinnedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Inbox Zero Dashboard</h2>
                
                {/* Progress Ring */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Progress</h3>
                      <p className="text-3xl font-bold text-primary-600">{inboxStats.inboxZeroProgress}%</p>
                      <p className="text-sm text-gray-500 mt-1">towards Inbox Zero</p>
                    </div>
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - inboxStats.inboxZeroProgress / 100)}`}
                          className="text-primary-600 transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{inboxStats.needsReply}</p>
                          <p className="text-xs text-gray-500">to action</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Emails</p>
                        <p className="text-2xl font-bold text-gray-900">{inboxStats.totalEmails}</p>
                      </div>
                      <InboxIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Unread</p>
                        <p className="text-2xl font-bold text-orange-600">{inboxStats.unread}</p>
                      </div>
                      <ExclamationTriangleIcon className="w-8 h-8 text-orange-400" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Needs Reply</p>
                        <p className="text-2xl font-bold text-red-600">{inboxStats.needsReply}</p>
                      </div>
                      <ClockIcon className="w-8 h-8 text-red-400" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Archived</p>
                        <p className="text-2xl font-bold text-green-600">{inboxStats.archived}</p>
                      </div>
                      <ArchiveBoxIcon className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Activity</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emails Received</span>
                        <span className="font-medium">{inboxStats.todayReceived}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emails Sent</span>
                        <span className="font-medium">{inboxStats.todaySent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Response Time</span>
                        <span className="font-medium">{inboxStats.averageResponseTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scheduled for Later</span>
                        <span className="font-medium">{inboxStats.scheduled}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Inbox Zero Tips</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                        <p className="text-sm text-gray-600">Process emails in batches, not continuously</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                        <p className="text-sm text-gray-600">Use the 2-minute rule: if it takes less than 2 minutes, do it now</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                        <p className="text-sm text-gray-600">Archive or delete emails after processing</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                        <p className="text-sm text-gray-600">Set specific times for checking email</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}