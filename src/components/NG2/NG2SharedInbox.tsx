'use client'

/**
 * NG2 Shared Inbox Component
 *
 * Team collaboration UI for shared email management:
 * - Inbox overview with stats
 * - Email queue with assignment status
 * - Quick claim/assign actions
 * - Team member list with online status
 * - Activity feed
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  InboxIcon,
  UsersIcon,
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  ArrowPathIcon,
  UserCircleIcon,
  ChevronRightIcon,
  BellIcon,
  Cog6ToothIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import {
  useSharedInbox,
  useMyInboxes,
  useMyAssignments,
  type SharedInbox,
  type EmailAssignment,
  type TeamMember,
  type InboxActivity,
  hasPermission,
  canAssignEmails,
  canClaimEmails
} from '@/lib/team/shared-inbox'

// =============================================================================
// Status Badge
// =============================================================================

function AssignmentStatusBadge({ status }: { status: EmailAssignment['status'] }) {
  const config = {
    unassigned: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Unassigned' },
    assigned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Assigned' },
    in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' }
  }

  const { bg, text, label } = config[status]

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

// =============================================================================
// Online Indicator
// =============================================================================

function OnlineIndicator({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-800 ${
        isOnline ? 'bg-green-500' : 'bg-gray-500'
      }`}
    />
  )
}

// =============================================================================
// Team Member Avatar
// =============================================================================

interface MemberAvatarProps {
  member: TeamMember
  size?: 'sm' | 'md' | 'lg'
  showOnline?: boolean
}

function MemberAvatar({ member, size = 'md', showOnline = true }: MemberAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  return (
    <div className="relative">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium`}>
          {member.name.charAt(0).toUpperCase()}
        </div>
      )}
      {showOnline && <OnlineIndicator isOnline={member.isOnline} />}
    </div>
  )
}

// =============================================================================
// Stats Card
// =============================================================================

interface StatsCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconColor?: string
  alert?: boolean
}

function StatsCard({ label, value, icon: Icon, iconColor = 'text-purple-400', alert }: StatsCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${
      alert ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800/50 border-gray-700/50'
    }`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : iconColor}`} />
        <div>
          <p className={`text-lg font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Assignment Card
// =============================================================================

interface AssignmentCardProps {
  assignment: EmailAssignment
  inbox: SharedInbox
  currentMemberId: string
  onClaim: () => void
  onRelease: () => void
  onComplete: () => void
  onAssign: (memberId: string) => void
  onClick?: () => void
}

function AssignmentCard({
  assignment,
  inbox,
  currentMemberId,
  onClaim,
  onRelease,
  onComplete,
  onAssign,
  onClick
}: AssignmentCardProps) {
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const assignedMember = inbox.members.find(m => m.id === assignment.assignedTo)
  const currentMember = inbox.members.find(m => m.id === currentMemberId)
  const isAssignedToMe = assignment.assignedTo === currentMemberId
  const canClaim = currentMember && canClaimEmails(currentMember.role)
  const canAssign = currentMember && canAssignEmails(currentMember.role)

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        assignment.isOverdue
          ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate">
              Email Subject Placeholder
            </h4>
            <AssignmentStatusBadge status={assignment.status} />
            {assignment.isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <ExclamationTriangleIcon className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {assignedMember ? (
              <span className="flex items-center gap-1">
                <MemberAvatar member={assignedMember} size="sm" showOnline={false} />
                {assignedMember.name}
              </span>
            ) : (
              <span className="text-gray-500">Unassigned</span>
            )}

            {assignment.dueAt && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Due: {new Date(assignment.dueAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {assignment.status === 'unassigned' && canClaim && (
            <button
              onClick={onClaim}
              className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded hover:bg-purple-500/30 transition-colors"
            >
              <HandRaisedIcon className="w-3.5 h-3.5" />
              Claim
            </button>
          )}

          {isAssignedToMe && assignment.status !== 'completed' && (
            <>
              <button
                onClick={onComplete}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Done
              </button>
              <button
                onClick={onRelease}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 text-xs rounded hover:bg-gray-700 transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Release
              </button>
            </>
          )}

          {canAssign && assignment.status === 'unassigned' && (
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 text-xs rounded hover:bg-gray-700 transition-colors"
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                Assign
              </button>

              <AnimatePresence>
                {showAssignMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1"
                  >
                    {inbox.members
                      .filter(m => canClaimEmails(m.role))
                      .map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            onAssign(member.id)
                            setShowAssignMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                        >
                          <MemberAvatar member={member} size="sm" />
                          <span>{member.name}</span>
                          {member.isOnline && (
                            <span className="ml-auto text-xs text-green-400">Online</span>
                          )}
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Activity Feed
// =============================================================================

interface ActivityFeedProps {
  activities: InboxActivity[]
  className?: string
}

function ActivityFeed({ activities, className = '' }: ActivityFeedProps) {
  const getActivityIcon = (type: InboxActivity['type']) => {
    switch (type) {
      case 'assigned': return UserPlusIcon
      case 'claimed': return HandRaisedIcon
      case 'released': return ArrowPathIcon
      case 'completed': return CheckCircleIcon
      case 'sla_warning':
      case 'sla_breach': return ExclamationTriangleIcon
      default: return InboxIcon
    }
  }

  const getActivityColor = (type: InboxActivity['type']) => {
    switch (type) {
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'sla_warning': return 'text-yellow-400 bg-yellow-500/20'
      case 'sla_breach': return 'text-red-400 bg-red-500/20'
      default: return 'text-purple-400 bg-purple-500/20'
    }
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
      ) : (
        activities.map(activity => {
          const Icon = getActivityIcon(activity.type)
          const colorClass = getActivityColor(activity.type)

          return (
            <div key={activity.id} className="flex items-start gap-2 py-2">
              <div className={`p-1.5 rounded-lg ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300">{activity.message}</p>
                <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// =============================================================================
// Team Members List
// =============================================================================

interface TeamMembersListProps {
  members: TeamMember[]
  className?: string
}

function TeamMembersList({ members, className = '' }: TeamMembersListProps) {
  const onlineMembers = members.filter(m => m.isOnline)
  const offlineMembers = members.filter(m => !m.isOnline)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Online */}
      {onlineMembers.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Online ({onlineMembers.length})
          </p>
          <div className="space-y-1">
            {onlineMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50">
                <MemberAvatar member={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline */}
      {offlineMembers.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Offline ({offlineMembers.length})
          </p>
          <div className="space-y-1">
            {offlineMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg opacity-60">
                <MemberAvatar member={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Shared Inbox View
// =============================================================================

interface SharedInboxViewProps {
  inboxId: string
  currentMemberId: string
  className?: string
  onSelectEmail?: (emailId: string) => void
}

export function SharedInboxView({
  inboxId,
  currentMemberId,
  className = '',
  onSelectEmail
}: SharedInboxViewProps) {
  const {
    inbox,
    assignments,
    unassigned,
    overdue,
    activities,
    claimEmail,
    releaseEmail,
    completeEmail,
    assignEmail
  } = useSharedInbox(inboxId)

  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned' | 'overdue'>('all')
  const [showTeam, setShowTeam] = useState(false)

  const filteredAssignments = useMemo(() => {
    switch (filter) {
      case 'mine':
        return assignments.filter(a => a.assignedTo === currentMemberId && a.status !== 'completed')
      case 'unassigned':
        return unassigned
      case 'overdue':
        return overdue
      default:
        return assignments.filter(a => a.status !== 'completed')
    }
  }, [filter, assignments, unassigned, overdue, currentMemberId])

  if (!inbox) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500">Inbox not found</p>
      </div>
    )
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <InboxIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{inbox.name}</h2>
                <p className="text-xs text-gray-400">{inbox.emailAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTeam(!showTeam)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showTeam
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                Team
              </button>
              <button className="p-1.5 text-gray-400 hover:bg-gray-800 rounded-lg">
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatsCard
              label="Queue"
              value={unassigned.length}
              icon={InboxIcon}
              iconColor="text-blue-400"
            />
            <StatsCard
              label="In Progress"
              value={assignments.filter(a => a.status === 'in_progress').length}
              icon={ClockIcon}
              iconColor="text-yellow-400"
            />
            <StatsCard
              label="Completed"
              value={inbox.stats.completedToday}
              icon={CheckCircleIcon}
              iconColor="text-green-400"
            />
            <StatsCard
              label="Overdue"
              value={overdue.length}
              icon={ExclamationTriangleIcon}
              alert={overdue.length > 0}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-3 border-b border-gray-700/50">
          {[
            { key: 'all', label: 'All Active' },
            { key: 'mine', label: 'My Emails' },
            { key: 'unassigned', label: 'Unassigned' },
            { key: 'overdue', label: 'Overdue' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === key
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <InboxIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No emails in this view</p>
            </div>
          ) : (
            filteredAssignments.map(assignment => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                inbox={inbox}
                currentMemberId={currentMemberId}
                onClaim={() => claimEmail(assignment.id, currentMemberId)}
                onRelease={() => releaseEmail(assignment.id, currentMemberId)}
                onComplete={() => completeEmail(assignment.id, currentMemberId)}
                onAssign={(memberId) => assignEmail(assignment.id, memberId, currentMemberId)}
                onClick={() => onSelectEmail?.(assignment.emailId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Team Sidebar */}
      <AnimatePresence>
        {showTeam && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-gray-700 overflow-hidden"
          >
            <div className="w-[280px] h-full flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-medium text-white">Team</h3>
                <p className="text-xs text-gray-400">{inbox.members.length} members</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <TeamMembersList members={inbox.members} />
              </div>

              {/* Activity Feed */}
              <div className="border-t border-gray-700 p-3">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Activity</h4>
                <ActivityFeed activities={activities.slice(0, 5)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Inbox Selector
// =============================================================================

interface InboxSelectorProps {
  userId: string
  selectedId?: string
  onSelect: (inboxId: string) => void
  className?: string
}

export function InboxSelector({ userId, selectedId, onSelect, className = '' }: InboxSelectorProps) {
  const { inboxes, unreadCount } = useMyInboxes(userId)

  return (
    <div className={`space-y-1 ${className}`}>
      {inboxes.map(inbox => {
        const isSelected = inbox.id === selectedId
        const unassignedCount = inbox.stats.unassigned

        return (
          <button
            key={inbox.id}
            onClick={() => onSelect(inbox.id)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
              isSelected
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <InboxIcon className="w-5 h-5" />
            <span className="flex-1 text-left text-sm truncate">{inbox.name}</span>
            {unassignedCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                isSelected
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {unassignedCount}
              </span>
            )}
          </button>
        )
      })}

      {inboxes.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No shared inboxes
        </p>
      )}
    </div>
  )
}

// =============================================================================
// My Assignments Widget
// =============================================================================

interface MyAssignmentsWidgetProps {
  memberId: string
  className?: string
}

export function MyAssignmentsWidget({ memberId, className = '' }: MyAssignmentsWidgetProps) {
  const { activeAssignments, completedToday } = useMyAssignments(memberId)

  return (
    <div className={`p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-3">My Work</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{activeAssignments.length}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{completedToday}</p>
          <p className="text-xs text-gray-400">Completed Today</p>
        </div>
      </div>

      {activeAssignments.length > 0 && (
        <div className="space-y-2">
          {activeAssignments.slice(0, 3).map(assignment => (
            <div
              key={assignment.id}
              className="p-2 bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white truncate">Email #{assignment.id.slice(-6)}</span>
                <AssignmentStatusBadge status={assignment.status} />
              </div>
            </div>
          ))}
          {activeAssignments.length > 3 && (
            <p className="text-xs text-gray-500 text-center">
              +{activeAssignments.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default SharedInboxView
