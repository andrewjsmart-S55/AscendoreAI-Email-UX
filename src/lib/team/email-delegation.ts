/**
 * Email Delegation Service
 *
 * Allow users to delegate emails to team members:
 * - Delegate individual emails or threads
 * - Track delegation status and history
 * - Notifications for delegated emails
 * - Delegation permissions and limits
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type DelegationStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'returned'
export type DelegationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Delegate {
  id: string
  userId: string
  email: string
  name: string
  avatarUrl?: string
  canDelegate: boolean
  maxDelegations?: number
  activeDelegations: number
}

export interface EmailDelegation {
  id: string
  emailId: string
  threadId: string

  // Delegation details
  delegatedBy: string // userId
  delegatedByName: string
  delegatedTo: string // userId
  delegatedToName: string
  delegatedAt: number

  // Status
  status: DelegationStatus
  acceptedAt?: number
  completedAt?: number
  returnedAt?: number

  // Context
  priority: DelegationPriority
  note?: string
  dueDate?: number
  tags: string[]

  // Email snapshot
  emailSubject: string
  emailFrom: string
  emailDate: number

  // Response
  response?: string
  responseAt?: number
}

export interface DelegationActivity {
  id: string
  delegationId: string
  type: 'delegated' | 'accepted' | 'declined' | 'completed' | 'returned' | 'commented' | 'reminder'
  actorId: string
  actorName: string
  message: string
  timestamp: number
}

export interface DelegationNotification {
  id: string
  userId: string
  delegationId: string
  type: 'new_delegation' | 'status_change' | 'reminder' | 'overdue'
  title: string
  message: string
  isRead: boolean
  createdAt: number
}

export interface DelegationSettings {
  allowDelegation: boolean
  maxActiveDelegations: number
  autoAcceptFromUsers: string[]
  notifyOnNew: boolean
  notifyOnComplete: boolean
  defaultDueDays: number
}

// =============================================================================
// Delegation Store
// =============================================================================

interface DelegationStore {
  delegations: EmailDelegation[]
  delegates: Delegate[]
  activities: DelegationActivity[]
  notifications: DelegationNotification[]
  settings: DelegationSettings

  // Delegation management
  createDelegation: (delegation: Omit<EmailDelegation, 'id' | 'delegatedAt' | 'status'>) => EmailDelegation
  updateDelegation: (id: string, updates: Partial<EmailDelegation>) => void
  deleteDelegation: (id: string) => void

  // Status changes
  acceptDelegation: (id: string, userId: string) => void
  declineDelegation: (id: string, userId: string, reason?: string) => void
  completeDelegation: (id: string, userId: string, response?: string) => void
  returnDelegation: (id: string, userId: string, reason?: string) => void

  // Delegate management
  addDelegate: (delegate: Omit<Delegate, 'activeDelegations'>) => void
  removeDelegate: (delegateId: string) => void
  updateDelegate: (id: string, updates: Partial<Delegate>) => void

  // Activities
  addActivity: (activity: Omit<DelegationActivity, 'id' | 'timestamp'>) => void

  // Notifications
  addNotification: (notification: Omit<DelegationNotification, 'id' | 'createdAt' | 'isRead'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void

  // Settings
  updateSettings: (settings: Partial<DelegationSettings>) => void

  // Queries
  getDelegationById: (id: string) => EmailDelegation | undefined
  getDelegationsFrom: (userId: string) => EmailDelegation[]
  getDelegationsTo: (userId: string) => EmailDelegation[]
  getActiveDelegationsTo: (userId: string) => EmailDelegation[]
  getDelegationsByEmail: (emailId: string) => EmailDelegation[]
  getOverdueDelegations: (userId: string) => EmailDelegation[]
  getActivities: (delegationId: string) => DelegationActivity[]
  getNotifications: (userId: string) => DelegationNotification[]
  getUnreadNotificationCount: (userId: string) => number
}

export const useDelegationStore = create<DelegationStore>()(
  persist(
    (set, get) => ({
      delegations: [],
      delegates: [],
      activities: [],
      notifications: [],
      settings: {
        allowDelegation: true,
        maxActiveDelegations: 10,
        autoAcceptFromUsers: [],
        notifyOnNew: true,
        notifyOnComplete: true,
        defaultDueDays: 3
      },

      createDelegation: (delegationData) => {
        const delegation: EmailDelegation = {
          ...delegationData,
          id: `deleg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          delegatedAt: Date.now(),
          status: 'pending'
        }

        set(state => ({
          delegations: [...state.delegations, delegation]
        }))

        // Update delegate count
        set(state => ({
          delegates: state.delegates.map(d =>
            d.userId === delegationData.delegatedTo
              ? { ...d, activeDelegations: d.activeDelegations + 1 }
              : d
          )
        }))

        // Add activity
        get().addActivity({
          delegationId: delegation.id,
          type: 'delegated',
          actorId: delegationData.delegatedBy,
          actorName: delegationData.delegatedByName,
          message: `${delegationData.delegatedByName} delegated an email to ${delegationData.delegatedToName}`
        })

        // Add notification
        if (get().settings.notifyOnNew) {
          get().addNotification({
            userId: delegationData.delegatedTo,
            delegationId: delegation.id,
            type: 'new_delegation',
            title: 'New Delegation',
            message: `${delegationData.delegatedByName} delegated "${delegationData.emailSubject}" to you`
          })
        }

        // Auto-accept if configured
        if (get().settings.autoAcceptFromUsers.includes(delegationData.delegatedBy)) {
          setTimeout(() => {
            get().acceptDelegation(delegation.id, delegationData.delegatedTo)
          }, 100)
        }

        return delegation
      },

      updateDelegation: (id, updates) => {
        set(state => ({
          delegations: state.delegations.map(d =>
            d.id === id ? { ...d, ...updates } : d
          )
        }))
      },

      deleteDelegation: (id) => {
        const delegation = get().delegations.find(d => d.id === id)
        if (!delegation) return

        set(state => ({
          delegations: state.delegations.filter(d => d.id !== id),
          delegates: state.delegates.map(d =>
            d.userId === delegation.delegatedTo && d.activeDelegations > 0
              ? { ...d, activeDelegations: d.activeDelegations - 1 }
              : d
          )
        }))
      },

      acceptDelegation: (id, userId) => {
        const delegation = get().delegations.find(d => d.id === id)
        if (!delegation || delegation.delegatedTo !== userId) return

        set(state => ({
          delegations: state.delegations.map(d =>
            d.id === id
              ? { ...d, status: 'accepted' as const, acceptedAt: Date.now() }
              : d
          )
        }))

        get().addActivity({
          delegationId: id,
          type: 'accepted',
          actorId: userId,
          actorName: delegation.delegatedToName,
          message: `${delegation.delegatedToName} accepted the delegation`
        })

        get().addNotification({
          userId: delegation.delegatedBy,
          delegationId: id,
          type: 'status_change',
          title: 'Delegation Accepted',
          message: `${delegation.delegatedToName} accepted your delegation for "${delegation.emailSubject}"`
        })
      },

      declineDelegation: (id, userId, reason) => {
        const delegation = get().delegations.find(d => d.id === id)
        if (!delegation || delegation.delegatedTo !== userId) return

        set(state => ({
          delegations: state.delegations.map(d =>
            d.id === id
              ? { ...d, status: 'declined' as const, response: reason, responseAt: Date.now() }
              : d
          ),
          delegates: state.delegates.map(d =>
            d.userId === userId && d.activeDelegations > 0
              ? { ...d, activeDelegations: d.activeDelegations - 1 }
              : d
          )
        }))

        get().addActivity({
          delegationId: id,
          type: 'declined',
          actorId: userId,
          actorName: delegation.delegatedToName,
          message: `${delegation.delegatedToName} declined the delegation${reason ? `: ${reason}` : ''}`
        })

        get().addNotification({
          userId: delegation.delegatedBy,
          delegationId: id,
          type: 'status_change',
          title: 'Delegation Declined',
          message: `${delegation.delegatedToName} declined your delegation for "${delegation.emailSubject}"`
        })
      },

      completeDelegation: (id, userId, response) => {
        const delegation = get().delegations.find(d => d.id === id)
        if (!delegation || delegation.delegatedTo !== userId) return

        set(state => ({
          delegations: state.delegations.map(d =>
            d.id === id
              ? { ...d, status: 'completed' as const, completedAt: Date.now(), response, responseAt: Date.now() }
              : d
          ),
          delegates: state.delegates.map(d =>
            d.userId === userId && d.activeDelegations > 0
              ? { ...d, activeDelegations: d.activeDelegations - 1 }
              : d
          )
        }))

        get().addActivity({
          delegationId: id,
          type: 'completed',
          actorId: userId,
          actorName: delegation.delegatedToName,
          message: `${delegation.delegatedToName} completed the delegation`
        })

        if (get().settings.notifyOnComplete) {
          get().addNotification({
            userId: delegation.delegatedBy,
            delegationId: id,
            type: 'status_change',
            title: 'Delegation Completed',
            message: `${delegation.delegatedToName} completed the delegation for "${delegation.emailSubject}"`
          })
        }
      },

      returnDelegation: (id, userId, reason) => {
        const delegation = get().delegations.find(d => d.id === id)
        if (!delegation || delegation.delegatedTo !== userId) return

        set(state => ({
          delegations: state.delegations.map(d =>
            d.id === id
              ? { ...d, status: 'returned' as const, returnedAt: Date.now(), response: reason, responseAt: Date.now() }
              : d
          ),
          delegates: state.delegates.map(d =>
            d.userId === userId && d.activeDelegations > 0
              ? { ...d, activeDelegations: d.activeDelegations - 1 }
              : d
          )
        }))

        get().addActivity({
          delegationId: id,
          type: 'returned',
          actorId: userId,
          actorName: delegation.delegatedToName,
          message: `${delegation.delegatedToName} returned the delegation${reason ? `: ${reason}` : ''}`
        })

        get().addNotification({
          userId: delegation.delegatedBy,
          delegationId: id,
          type: 'status_change',
          title: 'Delegation Returned',
          message: `${delegation.delegatedToName} returned your delegation for "${delegation.emailSubject}"`
        })
      },

      addDelegate: (delegateData) => {
        const delegate: Delegate = {
          ...delegateData,
          activeDelegations: 0
        }

        set(state => ({
          delegates: [...state.delegates, delegate]
        }))
      },

      removeDelegate: (delegateId) => {
        set(state => ({
          delegates: state.delegates.filter(d => d.id !== delegateId)
        }))
      },

      updateDelegate: (id, updates) => {
        set(state => ({
          delegates: state.delegates.map(d =>
            d.id === id ? { ...d, ...updates } : d
          )
        }))
      },

      addActivity: (activityData) => {
        const activity: DelegationActivity = {
          ...activityData,
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        }

        set(state => ({
          activities: [activity, ...state.activities].slice(0, 500)
        }))
      },

      addNotification: (notificationData) => {
        const notification: DelegationNotification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
          createdAt: Date.now()
        }

        set(state => ({
          notifications: [notification, ...state.notifications].slice(0, 100)
        }))
      },

      markNotificationRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
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

      updateSettings: (settings) => {
        set(state => ({
          settings: { ...state.settings, ...settings }
        }))
      },

      getDelegationById: (id) => {
        return get().delegations.find(d => d.id === id)
      },

      getDelegationsFrom: (userId) => {
        return get().delegations.filter(d => d.delegatedBy === userId)
      },

      getDelegationsTo: (userId) => {
        return get().delegations.filter(d => d.delegatedTo === userId)
      },

      getActiveDelegationsTo: (userId) => {
        return get().delegations.filter(d =>
          d.delegatedTo === userId &&
          (d.status === 'pending' || d.status === 'accepted')
        )
      },

      getDelegationsByEmail: (emailId) => {
        return get().delegations.filter(d => d.emailId === emailId)
      },

      getOverdueDelegations: (userId) => {
        const now = Date.now()
        return get().delegations.filter(d =>
          d.delegatedTo === userId &&
          d.dueDate &&
          d.dueDate < now &&
          (d.status === 'pending' || d.status === 'accepted')
        )
      },

      getActivities: (delegationId) => {
        return get().activities.filter(a => a.delegationId === delegationId)
      },

      getNotifications: (userId) => {
        return get().notifications.filter(n => n.userId === userId)
      },

      getUnreadNotificationCount: (userId) => {
        return get().notifications.filter(n => n.userId === userId && !n.isRead).length
      }
    }),
    {
      name: 'boxzero-delegation',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        delegations: state.delegations,
        delegates: state.delegates,
        activities: state.activities,
        notifications: state.notifications,
        settings: state.settings
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback } from 'react'

export function useDelegation(userId: string | null) {
  const store = useDelegationStore()

  const delegationsFrom = useMemo(
    () => userId ? store.getDelegationsFrom(userId) : [],
    [userId, store.delegations]
  )

  const delegationsTo = useMemo(
    () => userId ? store.getDelegationsTo(userId) : [],
    [userId, store.delegations]
  )

  const activeDelegations = useMemo(
    () => userId ? store.getActiveDelegationsTo(userId) : [],
    [userId, store.delegations]
  )

  const overdueDelegations = useMemo(
    () => userId ? store.getOverdueDelegations(userId) : [],
    [userId, store.delegations]
  )

  const notifications = useMemo(
    () => userId ? store.getNotifications(userId) : [],
    [userId, store.notifications]
  )

  const unreadCount = useMemo(
    () => userId ? store.getUnreadNotificationCount(userId) : 0,
    [userId, store.notifications]
  )

  const delegateEmail = useCallback((
    email: {
      id: string
      threadId: string
      subject: string
      from: string
      date: Date
    },
    delegateTo: Delegate,
    options: {
      priority?: DelegationPriority
      note?: string
      dueDate?: Date
      tags?: string[]
    } = {}
  ) => {
    if (!userId) return null

    // Get current user info (would come from auth context)
    const currentUserName = 'Current User' // Placeholder

    return store.createDelegation({
      emailId: email.id,
      threadId: email.threadId,
      delegatedBy: userId,
      delegatedByName: currentUserName,
      delegatedTo: delegateTo.userId,
      delegatedToName: delegateTo.name,
      priority: options.priority || 'normal',
      note: options.note,
      dueDate: options.dueDate?.getTime(),
      tags: options.tags || [],
      emailSubject: email.subject,
      emailFrom: email.from,
      emailDate: email.date.getTime()
    })
  }, [userId, store.createDelegation])

  return {
    delegationsFrom,
    delegationsTo,
    activeDelegations,
    overdueDelegations,
    notifications,
    unreadCount,
    delegates: store.delegates,
    settings: store.settings,

    // Actions
    delegateEmail,
    acceptDelegation: store.acceptDelegation,
    declineDelegation: store.declineDelegation,
    completeDelegation: store.completeDelegation,
    returnDelegation: store.returnDelegation,
    addDelegate: store.addDelegate,
    removeDelegate: store.removeDelegate,
    updateSettings: store.updateSettings,
    markNotificationRead: store.markNotificationRead,
    markAllNotificationsRead: () => userId && store.markAllNotificationsRead(userId)
  }
}

export default useDelegationStore
