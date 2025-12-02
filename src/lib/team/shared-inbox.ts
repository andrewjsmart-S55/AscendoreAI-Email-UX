/**
 * Shared Inbox Service
 *
 * Team collaboration features for shared email management:
 * - Shared inbox creation and management
 * - Email assignment and claiming
 * - Team member roles and permissions
 * - Activity tracking and notifications
 * - Collision detection for concurrent editing
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'
export type EmailAssignmentStatus = 'unassigned' | 'assigned' | 'in_progress' | 'completed'
export type InboxType = 'support' | 'sales' | 'info' | 'custom'

export interface TeamMember {
  id: string
  userId: string
  email: string
  name: string
  avatarUrl?: string
  role: TeamRole
  joinedAt: number
  lastActiveAt: number
  isOnline: boolean
}

export interface SharedInbox {
  id: string
  name: string
  description?: string
  type: InboxType
  emailAddress: string

  // Team
  teamId: string
  members: TeamMember[]

  // Settings
  settings: {
    autoAssignment: boolean
    roundRobin: boolean
    notifyOnNew: boolean
    allowSelfAssign: boolean
    maxAssignmentsPerMember?: number
    workingHoursOnly?: boolean
    slaHours?: number
  }

  // Stats
  stats: {
    totalEmails: number
    unassigned: number
    inProgress: number
    completedToday: number
    avgResponseTime: number // minutes
  }

  createdAt: number
  updatedAt: number
}

export interface EmailAssignment {
  id: string
  emailId: string
  threadId: string
  inboxId: string

  // Assignment
  status: EmailAssignmentStatus
  assignedTo?: string // memberId
  assignedBy?: string // memberId
  assignedAt?: number

  // Progress
  startedAt?: number
  completedAt?: number

  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent'
  tags: string[]
  notes?: string

  // Collision detection
  lockedBy?: string // memberId
  lockedAt?: number

  // SLA
  dueAt?: number
  isOverdue: boolean

  createdAt: number
  updatedAt: number
}

export interface InboxActivity {
  id: string
  inboxId: string
  emailId?: string
  assignmentId?: string

  type: 'assigned' | 'claimed' | 'released' | 'completed' | 'commented' | 'sla_warning' | 'sla_breach'
  actorId: string
  actorName: string
  targetId?: string
  targetName?: string

  message: string
  timestamp: number
}

export interface InboxNotification {
  id: string
  inboxId: string
  userId: string

  type: 'new_email' | 'assignment' | 'mention' | 'sla_warning' | 'sla_breach'
  title: string
  message: string
  emailId?: string

  isRead: boolean
  createdAt: number
}

// =============================================================================
// Permission Helpers
// =============================================================================

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  owner: ['manage_inbox', 'manage_members', 'assign_emails', 'claim_emails', 'complete_emails', 'view_analytics', 'delete_inbox'],
  admin: ['manage_members', 'assign_emails', 'claim_emails', 'complete_emails', 'view_analytics'],
  member: ['claim_emails', 'complete_emails', 'view_analytics'],
  viewer: ['view_analytics']
}

export function hasPermission(role: TeamRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

export function canManageInbox(role: TeamRole): boolean {
  return hasPermission(role, 'manage_inbox')
}

export function canManageMembers(role: TeamRole): boolean {
  return hasPermission(role, 'manage_members')
}

export function canAssignEmails(role: TeamRole): boolean {
  return hasPermission(role, 'assign_emails')
}

export function canClaimEmails(role: TeamRole): boolean {
  return hasPermission(role, 'claim_emails')
}

// =============================================================================
// Auto-Assignment Logic
// =============================================================================

export function selectNextAssignee(
  inbox: SharedInbox,
  assignments: EmailAssignment[]
): TeamMember | null {
  if (!inbox.settings.autoAssignment) return null

  const availableMembers = inbox.members.filter(m => {
    // Only members and above can be assigned
    if (!canClaimEmails(m.role)) return false

    // Check online status if working hours only
    if (inbox.settings.workingHoursOnly && !m.isOnline) return false

    // Check max assignments
    if (inbox.settings.maxAssignmentsPerMember) {
      const currentAssignments = assignments.filter(
        a => a.assignedTo === m.id && a.status !== 'completed'
      ).length
      if (currentAssignments >= inbox.settings.maxAssignmentsPerMember) return false
    }

    return true
  })

  if (availableMembers.length === 0) return null

  if (inbox.settings.roundRobin) {
    // Round-robin: pick member with oldest last assignment
    const memberAssignmentTimes = availableMembers.map(m => {
      const lastAssignment = assignments
        .filter(a => a.assignedTo === m.id)
        .sort((a, b) => (b.assignedAt || 0) - (a.assignedAt || 0))[0]
      return {
        member: m,
        lastAssignedAt: lastAssignment?.assignedAt || 0
      }
    })

    memberAssignmentTimes.sort((a, b) => a.lastAssignedAt - b.lastAssignedAt)
    return memberAssignmentTimes[0].member
  }

  // Default: pick member with fewest active assignments
  const memberWorkload = availableMembers.map(m => ({
    member: m,
    workload: assignments.filter(
      a => a.assignedTo === m.id && a.status !== 'completed'
    ).length
  }))

  memberWorkload.sort((a, b) => a.workload - b.workload)
  return memberWorkload[0].member
}

// =============================================================================
// Shared Inbox Store
// =============================================================================

interface SharedInboxStore {
  inboxes: SharedInbox[]
  assignments: EmailAssignment[]
  activities: InboxActivity[]
  notifications: InboxNotification[]

  // Inbox management
  createInbox: (inbox: Omit<SharedInbox, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => SharedInbox
  updateInbox: (id: string, updates: Partial<SharedInbox>) => void
  deleteInbox: (id: string) => void

  // Member management
  addMember: (inboxId: string, member: Omit<TeamMember, 'joinedAt' | 'lastActiveAt' | 'isOnline'>) => void
  removeMember: (inboxId: string, memberId: string) => void
  updateMemberRole: (inboxId: string, memberId: string, role: TeamRole) => void
  setMemberOnlineStatus: (inboxId: string, memberId: string, isOnline: boolean) => void

  // Assignment management
  createAssignment: (assignment: Omit<EmailAssignment, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue'>) => EmailAssignment
  assignEmail: (assignmentId: string, memberId: string, assignedBy: string) => void
  claimEmail: (assignmentId: string, memberId: string) => void
  releaseEmail: (assignmentId: string, memberId: string) => void
  startEmail: (assignmentId: string, memberId: string) => void
  completeEmail: (assignmentId: string, memberId: string) => void

  // Lock management
  lockEmail: (assignmentId: string, memberId: string) => boolean
  unlockEmail: (assignmentId: string, memberId: string) => void
  checkLock: (assignmentId: string) => { isLocked: boolean; lockedBy?: string; lockedAt?: number }

  // Activity
  addActivity: (activity: Omit<InboxActivity, 'id' | 'timestamp'>) => void

  // Notifications
  addNotification: (notification: Omit<InboxNotification, 'id' | 'createdAt' | 'isRead'>) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: (userId: string) => void

  // Queries
  getInboxById: (id: string) => SharedInbox | undefined
  getInboxesForUser: (userId: string) => SharedInbox[]
  getAssignmentsForInbox: (inboxId: string) => EmailAssignment[]
  getAssignmentsForMember: (memberId: string) => EmailAssignment[]
  getUnassignedEmails: (inboxId: string) => EmailAssignment[]
  getOverdueAssignments: (inboxId: string) => EmailAssignment[]
  getActivities: (inboxId: string, limit?: number) => InboxActivity[]
  getNotifications: (userId: string) => InboxNotification[]
  getUnreadNotificationCount: (userId: string) => number
}

export const useSharedInboxStore = create<SharedInboxStore>()(
  persist(
    (set, get) => ({
      inboxes: [],
      assignments: [],
      activities: [],
      notifications: [],

      createInbox: (inboxData) => {
        const inbox: SharedInbox = {
          ...inboxData,
          id: `inbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          stats: {
            totalEmails: 0,
            unassigned: 0,
            inProgress: 0,
            completedToday: 0,
            avgResponseTime: 0
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          inboxes: [...state.inboxes, inbox]
        }))

        return inbox
      },

      updateInbox: (id, updates) => {
        set(state => ({
          inboxes: state.inboxes.map(inbox =>
            inbox.id === id
              ? { ...inbox, ...updates, updatedAt: Date.now() }
              : inbox
          )
        }))
      },

      deleteInbox: (id) => {
        set(state => ({
          inboxes: state.inboxes.filter(inbox => inbox.id !== id),
          assignments: state.assignments.filter(a => a.inboxId !== id),
          activities: state.activities.filter(a => a.inboxId !== id)
        }))
      },

      addMember: (inboxId, memberData) => {
        const member: TeamMember = {
          ...memberData,
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          isOnline: true
        }

        set(state => ({
          inboxes: state.inboxes.map(inbox =>
            inbox.id === inboxId
              ? { ...inbox, members: [...inbox.members, member], updatedAt: Date.now() }
              : inbox
          )
        }))
      },

      removeMember: (inboxId, memberId) => {
        set(state => ({
          inboxes: state.inboxes.map(inbox =>
            inbox.id === inboxId
              ? {
                  ...inbox,
                  members: inbox.members.filter(m => m.id !== memberId),
                  updatedAt: Date.now()
                }
              : inbox
          )
        }))
      },

      updateMemberRole: (inboxId, memberId, role) => {
        set(state => ({
          inboxes: state.inboxes.map(inbox =>
            inbox.id === inboxId
              ? {
                  ...inbox,
                  members: inbox.members.map(m =>
                    m.id === memberId ? { ...m, role } : m
                  ),
                  updatedAt: Date.now()
                }
              : inbox
          )
        }))
      },

      setMemberOnlineStatus: (inboxId, memberId, isOnline) => {
        set(state => ({
          inboxes: state.inboxes.map(inbox =>
            inbox.id === inboxId
              ? {
                  ...inbox,
                  members: inbox.members.map(m =>
                    m.id === memberId
                      ? { ...m, isOnline, lastActiveAt: Date.now() }
                      : m
                  )
                }
              : inbox
          )
        }))
      },

      createAssignment: (assignmentData) => {
        const assignment: EmailAssignment = {
          ...assignmentData,
          id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isOverdue: assignmentData.dueAt ? assignmentData.dueAt < Date.now() : false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          assignments: [...state.assignments, assignment]
        }))

        return assignment
      },

      assignEmail: (assignmentId, memberId, assignedBy) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId
              ? {
                  ...a,
                  status: 'assigned' as const,
                  assignedTo: memberId,
                  assignedBy,
                  assignedAt: Date.now(),
                  updatedAt: Date.now()
                }
              : a
          )
        }))

        // Add activity
        const assignment = get().assignments.find(a => a.id === assignmentId)
        const inbox = get().inboxes.find(i => i.id === assignment?.inboxId)
        const assignee = inbox?.members.find(m => m.id === memberId)
        const assigner = inbox?.members.find(m => m.id === assignedBy)

        if (assignment && assignee && assigner) {
          get().addActivity({
            inboxId: assignment.inboxId,
            emailId: assignment.emailId,
            assignmentId,
            type: 'assigned',
            actorId: assignedBy,
            actorName: assigner.name,
            targetId: memberId,
            targetName: assignee.name,
            message: `${assigner.name} assigned to ${assignee.name}`
          })
        }
      },

      claimEmail: (assignmentId, memberId) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId
              ? {
                  ...a,
                  status: 'assigned' as const,
                  assignedTo: memberId,
                  assignedAt: Date.now(),
                  updatedAt: Date.now()
                }
              : a
          )
        }))

        const assignment = get().assignments.find(a => a.id === assignmentId)
        const inbox = get().inboxes.find(i => i.id === assignment?.inboxId)
        const member = inbox?.members.find(m => m.id === memberId)

        if (assignment && member) {
          get().addActivity({
            inboxId: assignment.inboxId,
            emailId: assignment.emailId,
            assignmentId,
            type: 'claimed',
            actorId: memberId,
            actorName: member.name,
            message: `${member.name} claimed this email`
          })
        }
      },

      releaseEmail: (assignmentId, memberId) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId
              ? {
                  ...a,
                  status: 'unassigned' as const,
                  assignedTo: undefined,
                  assignedAt: undefined,
                  lockedBy: undefined,
                  lockedAt: undefined,
                  updatedAt: Date.now()
                }
              : a
          )
        }))

        const assignment = get().assignments.find(a => a.id === assignmentId)
        const inbox = get().inboxes.find(i => i.id === assignment?.inboxId)
        const member = inbox?.members.find(m => m.id === memberId)

        if (assignment && member) {
          get().addActivity({
            inboxId: assignment.inboxId,
            emailId: assignment.emailId,
            assignmentId,
            type: 'released',
            actorId: memberId,
            actorName: member.name,
            message: `${member.name} released this email`
          })
        }
      },

      startEmail: (assignmentId, memberId) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId && a.assignedTo === memberId
              ? {
                  ...a,
                  status: 'in_progress' as const,
                  startedAt: Date.now(),
                  updatedAt: Date.now()
                }
              : a
          )
        }))
      },

      completeEmail: (assignmentId, memberId) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId && a.assignedTo === memberId
              ? {
                  ...a,
                  status: 'completed' as const,
                  completedAt: Date.now(),
                  lockedBy: undefined,
                  lockedAt: undefined,
                  updatedAt: Date.now()
                }
              : a
          )
        }))

        const assignment = get().assignments.find(a => a.id === assignmentId)
        const inbox = get().inboxes.find(i => i.id === assignment?.inboxId)
        const member = inbox?.members.find(m => m.id === memberId)

        if (assignment && member) {
          get().addActivity({
            inboxId: assignment.inboxId,
            emailId: assignment.emailId,
            assignmentId,
            type: 'completed',
            actorId: memberId,
            actorName: member.name,
            message: `${member.name} completed this email`
          })
        }
      },

      lockEmail: (assignmentId, memberId) => {
        const assignment = get().assignments.find(a => a.id === assignmentId)
        if (!assignment) return false

        // Check if already locked by someone else
        const lockTimeout = 5 * 60 * 1000 // 5 minutes
        if (
          assignment.lockedBy &&
          assignment.lockedBy !== memberId &&
          assignment.lockedAt &&
          Date.now() - assignment.lockedAt < lockTimeout
        ) {
          return false
        }

        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId
              ? { ...a, lockedBy: memberId, lockedAt: Date.now() }
              : a
          )
        }))

        return true
      },

      unlockEmail: (assignmentId, memberId) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a.id === assignmentId && a.lockedBy === memberId
              ? { ...a, lockedBy: undefined, lockedAt: undefined }
              : a
          )
        }))
      },

      checkLock: (assignmentId) => {
        const assignment = get().assignments.find(a => a.id === assignmentId)
        if (!assignment) return { isLocked: false }

        const lockTimeout = 5 * 60 * 1000 // 5 minutes
        const isLocked = !!(
          assignment.lockedBy &&
          assignment.lockedAt &&
          Date.now() - assignment.lockedAt < lockTimeout
        )

        return {
          isLocked,
          lockedBy: isLocked ? assignment.lockedBy : undefined,
          lockedAt: isLocked ? assignment.lockedAt : undefined
        }
      },

      addActivity: (activityData) => {
        const activity: InboxActivity = {
          ...activityData,
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        }

        set(state => ({
          activities: [activity, ...state.activities].slice(0, 1000) // Keep last 1000
        }))
      },

      addNotification: (notificationData) => {
        const notification: InboxNotification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
          createdAt: Date.now()
        }

        set(state => ({
          notifications: [notification, ...state.notifications].slice(0, 100)
        }))
      },

      markNotificationRead: (notificationId) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        }))
      },

      markAllNotificationsRead: (userId) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.userId === userId ? { ...n, isRead: true } : n
          )
        }))
      },

      getInboxById: (id) => {
        return get().inboxes.find(inbox => inbox.id === id)
      },

      getInboxesForUser: (userId) => {
        return get().inboxes.filter(inbox =>
          inbox.members.some(m => m.userId === userId)
        )
      },

      getAssignmentsForInbox: (inboxId) => {
        return get().assignments.filter(a => a.inboxId === inboxId)
      },

      getAssignmentsForMember: (memberId) => {
        return get().assignments.filter(a => a.assignedTo === memberId)
      },

      getUnassignedEmails: (inboxId) => {
        return get().assignments.filter(
          a => a.inboxId === inboxId && a.status === 'unassigned'
        )
      },

      getOverdueAssignments: (inboxId) => {
        const now = Date.now()
        return get().assignments.filter(
          a => a.inboxId === inboxId && a.dueAt && a.dueAt < now && a.status !== 'completed'
        )
      },

      getActivities: (inboxId, limit = 50) => {
        return get().activities
          .filter(a => a.inboxId === inboxId)
          .slice(0, limit)
      },

      getNotifications: (userId) => {
        return get().notifications.filter(n => n.userId === userId)
      },

      getUnreadNotificationCount: (userId) => {
        return get().notifications.filter(n => n.userId === userId && !n.isRead).length
      }
    }),
    {
      name: 'boxzero-shared-inbox',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        inboxes: state.inboxes,
        assignments: state.assignments,
        activities: state.activities,
        notifications: state.notifications
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useEffect } from 'react'

export function useSharedInbox(inboxId: string | null) {
  const store = useSharedInboxStore()

  const inbox = useMemo(
    () => inboxId ? store.getInboxById(inboxId) : undefined,
    [inboxId, store.inboxes]
  )

  const assignments = useMemo(
    () => inboxId ? store.getAssignmentsForInbox(inboxId) : [],
    [inboxId, store.assignments]
  )

  const unassigned = useMemo(
    () => inboxId ? store.getUnassignedEmails(inboxId) : [],
    [inboxId, store.assignments]
  )

  const overdue = useMemo(
    () => inboxId ? store.getOverdueAssignments(inboxId) : [],
    [inboxId, store.assignments]
  )

  const activities = useMemo(
    () => inboxId ? store.getActivities(inboxId) : [],
    [inboxId, store.activities]
  )

  return {
    inbox,
    assignments,
    unassigned,
    overdue,
    activities,

    // Actions
    assignEmail: store.assignEmail,
    claimEmail: store.claimEmail,
    releaseEmail: store.releaseEmail,
    startEmail: store.startEmail,
    completeEmail: store.completeEmail,
    lockEmail: store.lockEmail,
    unlockEmail: store.unlockEmail,
    checkLock: store.checkLock
  }
}

export function useMyInboxes(userId: string | null) {
  const store = useSharedInboxStore()

  const inboxes = useMemo(
    () => userId ? store.getInboxesForUser(userId) : [],
    [userId, store.inboxes]
  )

  const notifications = useMemo(
    () => userId ? store.getNotifications(userId) : [],
    [userId, store.notifications]
  )

  const unreadCount = useMemo(
    () => userId ? store.getUnreadNotificationCount(userId) : 0,
    [userId, store.notifications]
  )

  return {
    inboxes,
    notifications,
    unreadCount,

    // Actions
    createInbox: store.createInbox,
    markNotificationRead: store.markNotificationRead,
    markAllNotificationsRead: () => userId && store.markAllNotificationsRead(userId)
  }
}

export function useMyAssignments(memberId: string | null) {
  const store = useSharedInboxStore()

  const assignments = useMemo(
    () => memberId ? store.getAssignmentsForMember(memberId) : [],
    [memberId, store.assignments]
  )

  const activeAssignments = useMemo(
    () => assignments.filter(a => a.status !== 'completed'),
    [assignments]
  )

  const completedToday = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return assignments.filter(
      a => a.status === 'completed' && a.completedAt && a.completedAt >= today.getTime()
    ).length
  }, [assignments])

  return {
    assignments,
    activeAssignments,
    completedToday
  }
}

export default useSharedInboxStore
