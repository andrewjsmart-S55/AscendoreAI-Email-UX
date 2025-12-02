'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  TagIcon,
  ChartBarIcon,
  BoltIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { EmailThread } from '@/types/email'

interface AIInsightsPanelProps {
  thread: EmailThread
}

export default function AIInsightsPanel({ thread }: AIInsightsPanelProps) {
  // Generate AI insights based on thread content
  const generateInsights = () => {
    const latestEmail = thread.emails[thread.emails.length - 1]
    const hasAttachments = thread.emails.some(e => e.attachments.length > 0)
    const isUrgent = thread.labels.includes('important') || thread.isImportant
    const messageCount = thread.messageCount
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(thread)
    
    // Extract key topics
    const topics = extractTopics(thread)
    
    // Generate action items
    const actionItems = extractActionItems(thread)
    
    // Calculate response time metrics
    const responseMetrics = calculateResponseMetrics(thread)
    
    return {
      sentiment,
      topics,
      actionItems,
      responseMetrics,
      hasAttachments,
      isUrgent,
      messageCount,
    }
  }

  const analyzeSentiment = (thread: EmailThread) => {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['thanks', 'great', 'excellent', 'perfect', 'happy', 'pleased']
    const negativeWords = ['concern', 'issue', 'problem', 'urgent', 'disappointed', 'unfortunately']
    const neutralWords = ['update', 'inform', 'meeting', 'schedule']
    
    const allText = thread.emails.map(e => e.body.toLowerCase()).join(' ')
    
    let score = 0
    positiveWords.forEach(word => {
      if (allText.includes(word)) score += 1
    })
    negativeWords.forEach(word => {
      if (allText.includes(word)) score -= 1
    })
    
    if (score > 0) return { type: 'positive', label: 'Positive', color: 'green' }
    if (score < 0) return { type: 'negative', label: 'Needs Attention', color: 'red' }
    return { type: 'neutral', label: 'Neutral', color: 'gray' }
  }

  const extractTopics = (thread: EmailThread) => {
    const topics = []
    const allText = thread.emails.map(e => e.body.toLowerCase()).join(' ')
    
    if (allText.includes('budget') || allText.includes('cost') || allText.includes('expense')) {
      topics.push({ icon: ChartBarIcon, label: 'Budget & Finance', color: 'emerald' })
    }
    if (allText.includes('meeting') || allText.includes('schedule') || allText.includes('calendar')) {
      topics.push({ icon: CalendarIcon, label: 'Scheduling', color: 'blue' })
    }
    if (allText.includes('deadline') || allText.includes('due') || allText.includes('urgent')) {
      topics.push({ icon: ClockIcon, label: 'Time Sensitive', color: 'orange' })
    }
    if (allText.includes('project') || allText.includes('task') || allText.includes('deliverable')) {
      topics.push({ icon: DocumentTextIcon, label: 'Project Work', color: 'purple' })
    }
    
    return topics
  }

  const extractActionItems = (thread: EmailThread) => {
    const actionItems = []
    const latestEmail = thread.emails[thread.emails.length - 1]
    const emailText = latestEmail.body.toLowerCase()
    
    // Look for action-oriented phrases
    if (emailText.includes('please review')) {
      actionItems.push({
        text: 'Review requested documents',
        priority: 'high',
        icon: DocumentTextIcon,
      })
    }
    if (emailText.includes('let me know') || emailText.includes('please confirm')) {
      actionItems.push({
        text: 'Response required',
        priority: 'medium',
        icon: CheckCircleIcon,
      })
    }
    if (emailText.includes('schedule') || emailText.includes('set up')) {
      actionItems.push({
        text: 'Schedule meeting or call',
        priority: 'medium',
        icon: CalendarIcon,
      })
    }
    if (emailText.includes('deadline') || emailText.includes('by friday') || emailText.includes('end of')) {
      actionItems.push({
        text: 'Time-sensitive deadline approaching',
        priority: 'high',
        icon: ExclamationTriangleIcon,
      })
    }
    
    return actionItems
  }

  const calculateResponseMetrics = (thread: EmailThread) => {
    if (thread.emails.length < 2) {
      return { avgResponseTime: 'N/A', recommendation: 'New conversation' }
    }
    
    const times = thread.emails.map(e => new Date(e.receivedAt).getTime())
    const differences = []
    for (let i = 1; i < times.length; i++) {
      differences.push((times[i] - times[i - 1]) / (1000 * 60)) // in minutes
    }
    
    const avgMinutes = differences.reduce((a, b) => a + b, 0) / differences.length
    
    if (avgMinutes < 60) {
      return { avgResponseTime: `${Math.round(avgMinutes)}m`, recommendation: 'Quick responses - High engagement' }
    } else if (avgMinutes < 1440) {
      return { avgResponseTime: `${Math.round(avgMinutes / 60)}h`, recommendation: 'Normal response time' }
    } else {
      return { avgResponseTime: `${Math.round(avgMinutes / 1440)}d`, recommendation: 'Consider following up' }
    }
  }

  const insights = generateInsights()
  
  // Generate smart reply suggestions
  const smartReplies = [
    "Thanks for the update. I'll review and get back to you shortly.",
    "I agree with your proposal. Let's move forward with the next steps.",
    "Could we schedule a quick call to discuss this further?",
    "I need more information before I can proceed. Can you provide details on...",
  ]

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <p className="text-sm text-gray-500">Intelligent analysis of this conversation</p>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-primary-600" />
              Conversation Tone
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${insights.sentiment.color}-100 text-${insights.sentiment.color}-700`}>
              {insights.sentiment.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {insights.sentiment.type === 'positive' && 'The conversation has a positive and collaborative tone.'}
            {insights.sentiment.type === 'negative' && 'This conversation may require attention or conflict resolution.'}
            {insights.sentiment.type === 'neutral' && 'The conversation is professional and informational.'}
          </p>
        </motion.div>

        {/* Key Topics */}
        {insights.topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-primary-600" />
              Key Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {insights.topics.map((topic, idx) => {
                const IconComponent = topic.icon
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-${topic.color}-50 text-${topic.color}-700 rounded-lg text-sm font-medium`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {topic.label}
                  </span>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Action Items */}
        {insights.actionItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-primary-600" />
              Action Items
            </h4>
            <div className="space-y-2">
              {insights.actionItems.map((item, idx) => {
                const IconComponent = item.icon
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.priority === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <IconComponent className={`w-3 h-3 ${
                        item.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Response Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-primary-600" />
            Engagement Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Avg Response Time</p>
              <p className="text-xl font-semibold text-gray-900">{insights.responseMetrics.avgResponseTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Messages</p>
              <p className="text-xl font-semibold text-gray-900">{insights.messageCount}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">{insights.responseMetrics.recommendation}</p>
        </motion.div>

        {/* Smart Replies */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <LightBulbIcon className="w-4 h-4 text-primary-600" />
            Suggested Replies
          </h4>
          <div className="space-y-2">
            {smartReplies.map((reply, idx) => (
              <button
                key={idx}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <p className="text-sm text-gray-700 group-hover:text-gray-900">{reply}</p>
                <p className="text-xs text-gray-500 mt-1">Click to use this reply</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200"
        >
          <h4 className="font-medium text-primary-900 mb-2 flex items-center gap-2">
            <InformationCircleIcon className="w-4 h-4" />
            Summary
          </h4>
          <p className="text-sm text-primary-700">
            This {insights.isUrgent ? 'urgent ' : ''}conversation contains {insights.messageCount} messages
            {insights.hasAttachments && ' with attachments'}. 
            {insights.actionItems.length > 0 && ` You have ${insights.actionItems.length} action items to address.`}
            {insights.sentiment.type === 'positive' && ' The tone is positive and collaborative.'}
            {insights.sentiment.type === 'negative' && ' Consider addressing any concerns raised.'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}