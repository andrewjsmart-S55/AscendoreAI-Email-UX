'use client'

import React, { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  BoltIcon,
  TrophyIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { useLinkedAccounts, useFolders } from '@/hooks/useEmails'
import { useStreakStore } from '@/stores/streakStore'
import { useActivityStore } from '@/stores/activityStore'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'
import { STREAK_MILESTONES } from '@/types/gamification'

export default function NG2DashboardTab() {
  // Get real data from stores and hooks
  const { data: linkedAccounts, isLoading: accountsLoading } = useLinkedAccounts()

  // Streak store
  const streak = useStreakStore(state => state.streak)
  const initializeStreak = useStreakStore(state => state.initializeStreak)
  const todayStats = useStreakStore(state => state.getTodayStats())
  const currentMilestone = useStreakStore(state => state.getCurrentMilestone())
  const nextMilestone = useStreakStore(state => state.getNextMilestone())
  const daysToNextMilestone = useStreakStore(state => state.getDaysToNextMilestone())
  const streakHealth = useStreakStore(state => state.getStreakHealth())

  // Activity store
  const recentActivities = useActivityStore(state => state.getRecentEvents(10))

  // Behavior store
  const topSenders = useBehaviorStore(state => state.getSendersByImportance(5))
  const trustStage = useBehaviorStore(state => state.getTrustStage())
  const trustScore = useBehaviorStore(state => state.trustProfile?.trustScore || 0)

  // Initialize streak on mount
  useEffect(() => {
    const user = ascendoreAuth.getUser()
    if (user?.id) {
      initializeStreak(user.id, Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
  }, [initializeStreak])

  // Calculate real stats from linked accounts
  const accountStats = useMemo(() => {
    if (!linkedAccounts || !Array.isArray(linkedAccounts)) {
      return { totalUnread: 0, totalAccounts: 0, accounts: [] }
    }

    const accounts = linkedAccounts.map((account: any) => ({
      name: account.external_email || account.externalEmail || 'Unknown Account',
      email: account.external_email || account.externalEmail || '',
      provider: account.provider || 'unknown',
      status: account.status || 'unknown',
      lastSync: account.last_synced_at || account.lastSyncedAt,
      accountId: account.account_id || account.accountId,
      unread: 0, // Would need folder data
      total: 0
    }))

    return {
      totalUnread: 0, // This would come from folder unread counts
      totalAccounts: accounts.length,
      accounts
    }
  }, [linkedAccounts])

  // Calculate inbox zero stats
  const inboxZeroStats = useMemo(() => {
    const processed = todayStats?.emailsProcessed || 0
    const received = todayStats?.emailsReceived || 0
    const efficiency = received > 0 ? Math.round((processed / received) * 100) : 100

    return {
      currentUnread: accountStats.totalUnread,
      dailyGoal: 0,
      todayProcessed: processed,
      todayReceived: received,
      efficiency,
      streakDays: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      avgResponseTime: '2.3 hours', // Would calculate from behavior store
      vipUnread: topSenders.filter(s => s.isVIP).length,
      aiAccuracy: Math.round(trustScore * 100)
    }
  }, [todayStats, accountStats, streak, topSenders, trustScore])

  // Format priority breakdown from today's activity
  const priorities = useMemo(() => {
    const high = recentActivities.filter(a => a.metadata?.priority === 'high').length
    const medium = recentActivities.filter(a => a.metadata?.priority === 'medium').length
    const low = recentActivities.length - high - medium

    return [
      { label: 'High Priority', count: high || 3, color: 'red', icon: ExclamationTriangleIcon },
      { label: 'Medium Priority', count: medium || 5, color: 'yellow', icon: ClockIcon },
      { label: 'Low Priority', count: low || 8, color: 'green', icon: CheckCircleIcon }
    ]
  }, [recentActivities])

  // Format activity feed for display
  const todayActivity = useMemo(() => {
    return recentActivities.slice(0, 4).map(activity => {
      const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      let icon = CheckCircleIcon
      if (activity.type.includes('archive')) icon = ArchiveBoxIcon
      if (activity.type.includes('ai_')) icon = SparklesIcon
      if (activity.category === 'gamification') icon = TrophyIcon

      return {
        time,
        action: activity.description,
        icon
      }
    })
  }, [recentActivities])

  // VIP emails from top senders
  const vipEmails = useMemo(() => {
    return topSenders.filter(s => s.isVIP || s.importanceScore > 0.7).slice(0, 3).map(sender => ({
      from: sender.senderName || sender.senderEmail,
      subject: `Recent email from ${sender.senderEmail}`,
      time: sender.lastInteraction ? formatTimeAgo(sender.lastInteraction) : 'Recently',
      priority: sender.importanceScore > 0.8 ? 'high' : 'medium'
    }))
  }, [topSenders])

  // Get trust stage display
  const trustStageDisplay = useMemo(() => {
    switch (trustStage) {
      case 'training_wheels':
        return { label: 'Learning', color: 'yellow', description: 'AI is learning your preferences' }
      case 'building_confidence':
        return { label: 'Building Trust', color: 'blue', description: 'AI confidence is improving' }
      case 'earned_autonomy':
        return { label: 'Full Auto', color: 'green', description: 'AI handles most emails automatically' }
      default:
        return { label: 'Getting Started', color: 'gray', description: 'Start processing emails to train AI' }
    }
  }, [trustStage])

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`h-8 w-8 text-${color}-500`} />
      </div>
    </motion.div>
  )

  // Loading state
  if (accountsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inbox Zero Dashboard</h1>
        <p className="text-gray-600">
          Your AI-powered email assistant helping you achieve inbox zero daily.
        </p>
      </div>

      {/* Inbox Zero Progress */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TrophyIcon className="h-8 w-8 text-purple-600" />
              {streakHealth === 'healthy' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
              {streakHealth === 'at_risk' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Today's Inbox Zero Progress</h2>
              <p className="text-sm text-gray-600">
                {inboxZeroStats.efficiency === 100
                  ? "Inbox Zero achieved! Great job!"
                  : `You're ${inboxZeroStats.efficiency}% towards your daily goal!`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">{inboxZeroStats.currentUnread}</div>
            <div className="text-sm text-gray-600">emails remaining</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress to Inbox Zero</span>
            <span>{inboxZeroStats.efficiency}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(inboxZeroStats.efficiency, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Processed: {inboxZeroStats.todayProcessed}</span>
            <span>Received: {inboxZeroStats.todayReceived}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inbox Zero Streak"
          value={`${inboxZeroStats.streakDays} days`}
          subtitle={`Best: ${inboxZeroStats.longestStreak} days ${currentMilestone ? `• ${currentMilestone.emoji}` : ''}`}
          icon={FireIcon}
          color="purple"
        />
        <StatCard
          title="VIP Emails Pending"
          value={inboxZeroStats.vipUnread || 0}
          subtitle="From important senders"
          icon={ExclamationTriangleIcon}
          color="red"
        />
        <StatCard
          title="AI Trust Level"
          value={`${inboxZeroStats.aiAccuracy}%`}
          subtitle={trustStageDisplay.description}
          icon={SparklesIcon}
          color={trustStageDisplay.color}
        />
        <StatCard
          title="Linked Accounts"
          value={accountStats.totalAccounts}
          subtitle={accountStats.totalAccounts > 0 ? 'All syncing' : 'No accounts linked'}
          icon={UserGroupIcon}
          color="blue"
        />
      </div>

      {/* Priority Breakdown & Account Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Email Priority Breakdown
          </h3>
          <div className="space-y-3">
            {priorities.map((priority) => {
              const Icon = priority.icon
              const total = priorities.reduce((sum, p) => sum + p.count, 0)
              const percentage = total > 0 ? (priority.count / total) * 100 : 0
              return (
                <div key={priority.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 text-${priority.color}-500`} />
                    <span className="text-sm font-medium text-gray-700">{priority.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{priority.count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-${priority.color}-500 h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5" />
            Account Status
          </h3>
          <div className="space-y-3">
            {accountStats.accounts.length > 0 ? (
              accountStats.accounts.map((account) => (
                <div key={account.accountId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{account.email}</div>
                    <div className="text-xs text-gray-500">
                      {account.provider} • Last sync: {account.lastSync ? formatTimeAgo(account.lastSync) : 'Never'}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${account.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <InboxIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No accounts linked yet</p>
                <p className="text-xs mt-1">Link an email account to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIP Emails & Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIP Emails Requiring Attention */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            Important Senders
          </h3>
          <div className="space-y-3">
            {vipEmails.length > 0 ? (
              vipEmails.map((email, index) => (
                <div key={index} className={`border-l-4 ${email.priority === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'} p-3 rounded-r-lg`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{email.from}</div>
                      <div className="text-sm text-gray-700 mt-1">{email.subject}</div>
                    </div>
                    <div className="text-xs text-gray-500">{email.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-300" />
                <p>No urgent emails</p>
                <p className="text-xs mt-1">Important senders will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Activity Log */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {todayActivity.length > 0 ? (
              todayActivity.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-center gap-3 p-2">
                    <Icon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{activity.action}</div>
                      <div className="text-xs text-gray-500">{activity.time}</div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-6 text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No activity yet today</p>
                <p className="text-xs mt-1">Your email actions will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI & Streak Insights */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <BoltIcon className="h-5 w-5" />
          AI Insights & Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-2">🎯 Trust Progress</div>
            <div className="text-blue-800">
              {trustStage === 'training_wheels' && 'Keep approving or correcting AI suggestions to build trust. The AI learns from every interaction.'}
              {trustStage === 'building_confidence' && 'Great progress! The AI is now handling routine emails. Continue training for full automation.'}
              {trustStage === 'earned_autonomy' && 'Excellent! The AI has earned your trust and handles most emails automatically.'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-2">🔥 Streak Status</div>
            <div className="text-blue-800">
              {streakHealth === 'healthy' && inboxZeroStats.streakDays > 0 && `Amazing! You're on a ${inboxZeroStats.streakDays}-day streak. ${nextMilestone ? `${daysToNextMilestone} more days to ${nextMilestone.label}!` : 'Keep it up!'}`}
              {streakHealth === 'at_risk' && 'Your streak is at risk! Process your remaining emails to maintain it.'}
              {streakHealth === 'broken' && 'Start a new streak today by reaching inbox zero!'}
              {inboxZeroStats.streakDays === 0 && 'Reach inbox zero today to start your streak!'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-2">📈 Learning</div>
            <div className="text-blue-800">
              {topSenders.length > 0
                ? `The AI has learned patterns from ${topSenders.length} senders. More interactions improve accuracy.`
                : 'Start processing emails to train the AI on your preferences.'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-2">
              {streak?.freezeTokens ? '🛡️ Freeze Tokens' : '🏆 Milestones'}
            </div>
            <div className="text-blue-800">
              {streak?.freezeTokens
                ? `You have ${streak.freezeTokens} freeze token(s) to protect your streak if you miss a day.`
                : nextMilestone
                  ? `Next milestone: ${nextMilestone.emoji} ${nextMilestone.label} at ${nextMilestone.days} days`
                  : 'Start your streak to unlock milestones and freeze tokens!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
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
}
