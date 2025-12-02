'use client'

/**
 * NG2 Analytics Dashboard
 *
 * Email productivity insights:
 * - Volume trends
 * - Response time tracking
 * - AI accuracy metrics
 * - Inbox Zero streaks
 * - Gamification elements
 */

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useActivityStore, selectTodayStats } from '@/stores/activityStore'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { useActionQueueStore } from './NG2ActionQueue'

// =============================================================================
// Types
// =============================================================================

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

type TimeRange = '7d' | '30d' | '90d' | 'all'

// =============================================================================
// Components
// =============================================================================

function StatCard({ title, value, change, changeLabel, icon: Icon, color, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4" />}
              {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
              {changeLabel && <span className="text-gray-400">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

function SimpleBarChart({ data, height = 120 }: { data: ChartDataPoint[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(point.value / maxValue) * 100}%` }}
            transition={{ delay: i * 0.05 }}
            className={`w-full rounded-t ${point.color || 'bg-purple-500'}`}
            style={{ minHeight: point.value > 0 ? 4 : 0 }}
          />
          <span className="text-xs text-gray-400">{point.label}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressRing({ progress, size = 80, strokeWidth = 8, color = '#8b5cf6' }: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function NG2AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')

  // Stores
  const todayStats = useActivityStore(selectTodayStats)
  const events = useActivityStore((state) => state.events)
  const trustProfile = useBehaviorStore((state) => state.trustProfile)
  const senderModels = useBehaviorStore((state) => state.senderModels)
  const queueItems = useActionQueueStore((state) => state.items)

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date()
    const rangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    }[timeRange]

    const cutoff = new Date(now.getTime() - rangeMs)
    const rangeEvents = events.filter((e) => new Date(e.timestamp) > cutoff)

    // Email volume by day
    const volumeByDay: Record<string, number> = {}
    rangeEvents.forEach((e) => {
      if (e.category === 'email') {
        const day = e.timestamp.split('T')[0]
        volumeByDay[day] = (volumeByDay[day] || 0) + 1
      }
    })

    // AI actions
    const aiEvents = rangeEvents.filter((e) => e.category === 'ai')
    const approvedAI = aiEvents.filter((e) => e.type === 'ai_action_approved').length
    const rejectedAI = aiEvents.filter((e) => e.type === 'ai_action_rejected').length
    const autoExecutedAI = aiEvents.filter((e) => e.type === 'ai_action_auto_executed').length

    // Calculate AI accuracy
    const totalAIDecisions = approvedAI + rejectedAI
    const aiAccuracy = totalAIDecisions > 0 ? (approvedAI / totalAIDecisions) * 100 : 0

    // Inbox Zero streak (mock - would come from gamification store)
    const inboxZeroStreak = 12

    // Response time (mock calculation)
    const avgResponseTime = 45 // minutes

    // Top senders
    const senderArray = Array.from(senderModels.values())
    const topSenders = senderArray
      .sort((a, b) => b.totalEmails - a.totalEmails)
      .slice(0, 5)

    return {
      totalEmailActions: rangeEvents.filter((e) => e.category === 'email').length,
      totalAIActions: aiEvents.length,
      aiAccuracy,
      approvedAI,
      rejectedAI,
      autoExecutedAI,
      inboxZeroStreak,
      avgResponseTime,
      volumeByDay,
      topSenders,
      pendingReview: queueItems.filter((i) => i.status === 'pending').length
    }
  }, [events, timeRange, senderModels, queueItems])

  // Chart data
  const volumeChartData = useMemo((): ChartDataPoint[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 14
    const data: ChartDataPoint[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2)

      data.push({
        label: dayLabel,
        value: metrics.volumeByDay[dateStr] || 0,
        color: 'bg-purple-500'
      })
    }

    return data
  }, [metrics.volumeByDay, timeRange])

  const aiActionsChartData: ChartDataPoint[] = [
    { label: 'Approved', value: metrics.approvedAI, color: 'bg-green-500' },
    { label: 'Rejected', value: metrics.rejectedAI, color: 'bg-red-500' },
    { label: 'Auto', value: metrics.autoExecutedAI, color: 'bg-blue-500' }
  ]

  // Trust progress
  const trustProgress = trustProfile
    ? Math.min((trustProfile.totalInteractions / 200) * 100, 100)
    : 0

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Email productivity insights</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Emails Processed"
          value={metrics.totalEmailActions}
          change={12}
          changeLabel="vs last period"
          icon={EnvelopeIcon}
          color="bg-purple-500"
          trend="up"
        />
        <StatCard
          title="AI Suggestions"
          value={metrics.totalAIActions}
          change={-5}
          changeLabel="vs last period"
          icon={SparklesIcon}
          color="bg-blue-500"
          trend="down"
        />
        <StatCard
          title="AI Accuracy"
          value={`${metrics.aiAccuracy.toFixed(1)}%`}
          change={3}
          changeLabel="improvement"
          icon={CheckCircleIcon}
          color="bg-green-500"
          trend="up"
        />
        <StatCard
          title="Avg Response Time"
          value={`${metrics.avgResponseTime}m`}
          change={-8}
          changeLabel="faster"
          icon={ClockIcon}
          color="bg-amber-500"
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Email Volume Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Email Volume</h3>
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
          </div>
          <SimpleBarChart data={volumeChartData} height={150} />
        </div>

        {/* AI Actions Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI Actions</h3>
            <SparklesIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <SimpleBarChart data={aiActionsChartData} height={120} />
            </div>
            <div className="text-center">
              <div className="relative inline-block">
                <ProgressRing progress={metrics.aiAccuracy} size={100} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">
                    {metrics.aiAccuracy.toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gamification Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Inbox Zero Streak */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <FireIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Inbox Zero Streak</h3>
              <p className="text-sm text-purple-200">Keep it going!</p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-5xl font-bold">{metrics.inboxZeroStreak}</span>
            <span className="text-lg text-purple-200 mb-1">days</span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-purple-200">
              Best: 24 days • Avg: 8 days
            </p>
          </div>
        </div>

        {/* Trust Level */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrophyIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Trust Level</h3>
              <p className="text-sm text-gray-500">
                {trustProfile?.trustStage === 'training_wheels' && 'Training Wheels'}
                {trustProfile?.trustStage === 'building_confidence' && 'Building Confidence'}
                {trustProfile?.trustStage === 'earned_autonomy' && 'Earned Autonomy'}
                {!trustProfile && 'Getting Started'}
              </p>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium text-gray-900">{trustProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${trustProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {trustProfile?.totalInteractions || 0} / 200 interactions to next level
          </p>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Pending Review</h3>
              <p className="text-sm text-gray-500">AI suggestions waiting</p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-gray-900">{metrics.pendingReview}</span>
            <span className="text-sm text-gray-500 mb-1">items</span>
          </div>
          {metrics.pendingReview > 0 && (
            <button className="mt-4 w-full py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
              Review Now
            </button>
          )}
        </div>
      </div>

      {/* Top Senders */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <UserGroupIcon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Top Senders</h3>
        </div>
        <div className="space-y-3">
          {metrics.topSenders.length > 0 ? (
            metrics.topSenders.map((sender, idx) => (
              <div key={sender.senderId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {sender.senderName || sender.senderEmail}
                  </p>
                  <p className="text-xs text-gray-500">{sender.senderEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{sender.totalEmails}</p>
                  <p className="text-xs text-gray-500">emails</p>
                </div>
                <div className="w-20">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${(sender.responseRate || 0) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 text-center">
                    {((sender.responseRate || 0) * 100).toFixed(0)}% reply
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No sender data yet. Keep using BoxZero to build insights!
            </p>
          )}
        </div>
      </div>

      {/* Today's Summary */}
      <div className="mt-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold">Today's Summary</h3>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-bold">{todayStats.total}</p>
            <p className="text-sm text-gray-400">Total Actions</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{todayStats.emailActions}</p>
            <p className="text-sm text-gray-400">Email Actions</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{todayStats.aiActions}</p>
            <p className="text-sm text-gray-400">AI Actions</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{todayStats.undoCount}</p>
            <p className="text-sm text-gray-400">Undos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
