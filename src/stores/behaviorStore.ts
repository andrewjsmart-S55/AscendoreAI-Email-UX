/**
 * Behavior Store - Zustand store for Sender Models & Behavior Tracking
 *
 * Manages the Bayesian sender models used for Tier 1 predictions.
 * Tracks all user behavior events for learning.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  SenderModel,
  BehaviorEvent,
  BehaviorEventType,
  BehaviorContext,
  UserTrustProfile,
  TrustStage,
  TRUST_TRANSITIONS
} from '@/types/ai'

// =============================================================================
// Store State Interface
// =============================================================================

interface BehaviorState {
  // Sender Models
  senderModels: Map<string, SenderModel>

  // Behavior Events (recent only, for analysis)
  recentEvents: BehaviorEvent[]

  // User Trust Profile
  trustProfile: UserTrustProfile | null

  // Stats
  totalEventsTracked: number

  // Sender Model Actions
  getSenderModel: (senderEmail: string) => SenderModel | undefined
  updateSenderModel: (senderEmail: string, event: BehaviorEventType) => SenderModel
  markSenderAsVIP: (senderEmail: string, isVIP: boolean) => void
  getSendersByImportance: (limit?: number) => SenderModel[]

  // Behavior Event Actions
  trackBehavior: (event: Omit<BehaviorEvent, 'eventId' | 'timestamp'>) => void
  getRecentEvents: (limit?: number) => BehaviorEvent[]
  getEventsBySender: (senderId: string) => BehaviorEvent[]

  // Trust Profile Actions
  initializeTrustProfile: (userId: string) => void
  updateTrustFromAction: (outcome: 'approved' | 'rejected' | 'modified') => void
  getTrustStage: () => TrustStage
  getAutoApproveThreshold: () => number

  // Utilities
  clearAllData: () => void
  exportData: () => { senderModels: SenderModel[]; events: BehaviorEvent[] }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateSenderId(email: string): string {
  // Simple hash for sender ID
  return `sender_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
}

function extractDomain(email: string): string {
  const parts = email.split('@')
  return parts.length > 1 ? parts[1].toLowerCase() : ''
}

function createDefaultSenderModel(
  senderEmail: string,
  userId: string
): SenderModel {
  const now = new Date().toISOString()
  return {
    senderId: generateSenderId(senderEmail),
    senderEmail: senderEmail.toLowerCase(),
    senderDomain: extractDomain(senderEmail),
    totalEmails: 0,
    respondedEmails: 0,
    archivedEmails: 0,
    deletedEmails: 0,
    starredEmails: 0,
    ignoredEmails: 0,
    avgReadTimeSeconds: 0,
    avgResponseTimeSeconds: 0,
    responseRate: 0.5, // Prior: 50%
    archiveRate: 0.3,  // Prior: 30%
    deleteRate: 0.1,   // Prior: 10%
    importanceScore: 0.5, // Prior: 50%
    urgencyScore: 0.3, // Prior: 30%
    firstSeen: now,
    lastInteraction: now,
    decayedWeight: 1.0,
    lastUpdated: now,
    userId,
    isVIP: false
  }
}

/**
 * Bayesian probability update with Laplace smoothing
 * P = (k + 1) / (n + 2) where k = successes, n = total
 */
function updateBayesianProbability(successes: number, total: number): number {
  return (successes + 1) / (total + 2)
}

/**
 * Time decay function: weight = e^(-lambda * days)
 * lambda = 0.1 means ~90% weight after 1 day, ~37% after 10 days
 */
function calculateTimeDecay(lastInteractionDate: string, lambda = 0.1): number {
  const daysSince = (Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-lambda * daysSince)
}

/**
 * Calculate importance score based on multiple factors
 */
function calculateImportanceScore(model: SenderModel): number {
  // Weighted combination of factors
  const responseWeight = 0.4
  const starWeight = 0.3
  const recencyWeight = 0.2
  const volumeWeight = 0.1

  const starRate = model.totalEmails > 0 ? model.starredEmails / model.totalEmails : 0
  const volumeScore = Math.min(model.totalEmails / 100, 1) // Normalize to 0-1

  return (
    model.responseRate * responseWeight +
    starRate * starWeight +
    model.decayedWeight * recencyWeight +
    volumeScore * volumeWeight
  )
}

function createDefaultTrustProfile(userId: string): UserTrustProfile {
  return {
    userId,
    accountCreated: new Date().toISOString(),
    totalInteractions: 0,
    approvedActions: 0,
    rejectedActions: 0,
    modifiedActions: 0,
    trustStage: 'training_wheels',
    trustScore: 0,
    tierConfidences: {
      tier1_bayesian: 0.5,
      tier2_collaborative: 0.3,
      tier3_llm: 0.7
    },
    autoApproveThreshold: TRUST_TRANSITIONS.training_wheels.autoApproveThreshold,
    suggestionThreshold: 0.3,
    lastUpdated: new Date().toISOString()
  }
}

// =============================================================================
// Zustand Store
// =============================================================================

// Custom storage to handle Map serialization
const mapStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name)
    if (!str) return null
    const parsed = JSON.parse(str)
    if (parsed.state?.senderModels) {
      // Convert array back to Map
      parsed.state.senderModels = new Map(parsed.state.senderModels)
    }
    return parsed
  },
  setItem: (name: string, value: unknown) => {
    const toStore = value as { state: BehaviorState }
    if (toStore.state?.senderModels instanceof Map) {
      // Convert Map to array for storage
      toStore.state = {
        ...toStore.state,
        senderModels: Array.from(toStore.state.senderModels.entries()) as unknown as Map<string, SenderModel>
      }
    }
    localStorage.setItem(name, JSON.stringify(toStore))
  },
  removeItem: (name: string) => localStorage.removeItem(name)
}

export const useBehaviorStore = create<BehaviorState>()(
  persist(
    (set, get) => ({
      // Initial state
      senderModels: new Map(),
      recentEvents: [],
      trustProfile: null,
      totalEventsTracked: 0,

      // Get sender model
      getSenderModel: (senderEmail) => {
        const id = generateSenderId(senderEmail)
        return get().senderModels.get(id)
      },

      // Update sender model based on user action
      updateSenderModel: (senderEmail, eventType) => {
        const state = get()
        const id = generateSenderId(senderEmail)
        const existingModel = state.senderModels.get(id)
        const userId = state.trustProfile?.userId || 'default'

        const model = existingModel || createDefaultSenderModel(senderEmail, userId)
        const now = new Date().toISOString()

        // Update counts based on event type
        model.totalEmails += 1

        switch (eventType) {
          case 'respond':
            model.respondedEmails += 1
            break
          case 'archive':
            model.archivedEmails += 1
            break
          case 'delete':
            model.deletedEmails += 1
            break
          case 'star':
            model.starredEmails += 1
            break
          case 'ignore':
            model.ignoredEmails += 1
            break
        }

        // Update Bayesian probabilities
        model.responseRate = updateBayesianProbability(
          model.respondedEmails,
          model.totalEmails
        )
        model.archiveRate = updateBayesianProbability(
          model.archivedEmails,
          model.totalEmails
        )
        model.deleteRate = updateBayesianProbability(
          model.deletedEmails,
          model.totalEmails
        )

        // Update time factors
        model.lastInteraction = now
        model.decayedWeight = 1.0 // Reset decay on new interaction
        model.lastUpdated = now

        // Recalculate importance
        model.importanceScore = calculateImportanceScore(model)

        // Update store
        const newModels = new Map(state.senderModels)
        newModels.set(id, model)

        set({ senderModels: newModels })

        return model
      },

      // Mark sender as VIP
      markSenderAsVIP: (senderEmail, isVIP) => {
        const state = get()
        const id = generateSenderId(senderEmail)
        const model = state.senderModels.get(id)

        if (model) {
          const newModels = new Map(state.senderModels)
          newModels.set(id, {
            ...model,
            isVIP,
            lastUpdated: new Date().toISOString()
          })
          set({ senderModels: newModels })
        }
      },

      // Get top senders by importance
      getSendersByImportance: (limit = 10) => {
        const models = Array.from(get().senderModels.values())

        // Apply time decay to all models
        const now = new Date().toISOString()
        const decayedModels = models.map((model) => ({
          ...model,
          decayedWeight: calculateTimeDecay(model.lastInteraction),
          importanceScore: calculateImportanceScore({
            ...model,
            decayedWeight: calculateTimeDecay(model.lastInteraction)
          })
        }))

        // Sort by importance (VIPs first, then by score)
        return decayedModels
          .sort((a, b) => {
            if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1
            return b.importanceScore - a.importanceScore
          })
          .slice(0, limit)
      },

      // Track a behavior event
      trackBehavior: (event) => {
        const eventId = `bev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const timestamp = new Date().toISOString()

        const fullEvent: BehaviorEvent = {
          ...event,
          eventId,
          timestamp
        }

        set((state) => ({
          recentEvents: [fullEvent, ...state.recentEvents].slice(0, 500), // Keep last 500
          totalEventsTracked: state.totalEventsTracked + 1
        }))

        // Also update sender model
        get().updateSenderModel(event.senderId, event.eventType)
      },

      // Get recent events
      getRecentEvents: (limit = 50) => {
        return get().recentEvents.slice(0, limit)
      },

      // Get events by sender
      getEventsBySender: (senderId) => {
        return get().recentEvents.filter((e) => e.senderId === senderId)
      },

      // Initialize trust profile
      initializeTrustProfile: (userId) => {
        const existing = get().trustProfile
        if (!existing || existing.userId !== userId) {
          set({ trustProfile: createDefaultTrustProfile(userId) })
        }
      },

      // Update trust based on action outcome
      updateTrustFromAction: (outcome) => {
        const profile = get().trustProfile
        if (!profile) return

        const now = new Date().toISOString()
        const updated = { ...profile, lastUpdated: now }

        // Update counters
        updated.totalInteractions += 1
        if (outcome === 'approved') {
          updated.approvedActions += 1
        } else if (outcome === 'rejected') {
          updated.rejectedActions += 1
        } else {
          updated.modifiedActions += 1
        }

        // Calculate approval rate
        const approvalRate =
          updated.totalInteractions > 0
            ? (updated.approvedActions + updated.modifiedActions * 0.5) /
              updated.totalInteractions
            : 0

        // Update trust score
        updated.trustScore = approvalRate

        // Check for stage transition
        const currentTransition = TRUST_TRANSITIONS[updated.trustStage]
        if (
          currentTransition.next &&
          currentTransition.requiredInteractions &&
          updated.totalInteractions >= currentTransition.requiredInteractions &&
          approvalRate >= currentTransition.minApprovalRate
        ) {
          updated.trustStage = currentTransition.next
          const newTransition = TRUST_TRANSITIONS[updated.trustStage]
          updated.autoApproveThreshold = newTransition.autoApproveThreshold
        }

        set({ trustProfile: updated })
      },

      // Get current trust stage
      getTrustStage: () => {
        return get().trustProfile?.trustStage || 'training_wheels'
      },

      // Get auto-approve threshold
      getAutoApproveThreshold: () => {
        return (
          get().trustProfile?.autoApproveThreshold ||
          TRUST_TRANSITIONS.training_wheels.autoApproveThreshold
        )
      },

      // Clear all data
      clearAllData: () => {
        set({
          senderModels: new Map(),
          recentEvents: [],
          trustProfile: null,
          totalEventsTracked: 0
        })
      },

      // Export data
      exportData: () => {
        const state = get()
        return {
          senderModels: Array.from(state.senderModels.values()),
          events: state.recentEvents
        }
      }
    }),
    {
      name: 'boxzero-behavior',
      version: 1,
      storage: createJSONStorage(() => mapStorage),
      partialize: (state) => ({
        senderModels: state.senderModels,
        recentEvents: state.recentEvents.slice(0, 200), // Only persist recent events
        trustProfile: state.trustProfile,
        totalEventsTracked: state.totalEventsTracked
      })
    }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectTopSenders = (limit = 10) => (state: BehaviorState) =>
  state.getSendersByImportance(limit)

export const selectVIPSenders = (state: BehaviorState) =>
  Array.from(state.senderModels.values()).filter((m) => m.isVIP)

export const selectTrustStage = (state: BehaviorState) =>
  state.trustProfile?.trustStage || 'training_wheels'

export const selectTrustScore = (state: BehaviorState) =>
  state.trustProfile?.trustScore || 0

// =============================================================================
// Behavior Tracking Utilities
// =============================================================================

/**
 * Create context features for a behavior event
 */
export function createBehaviorContext(
  email: {
    body?: string
    attachments?: unknown[]
    recipients?: string[]
    threadDepth?: number
  }
): BehaviorContext {
  const now = new Date()
  return {
    timeOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    emailLength: email.body?.length || 0,
    hasAttachments: (email.attachments?.length || 0) > 0,
    attachmentCount: email.attachments?.length || 0,
    threadDepth: email.threadDepth || 1,
    recipientCount: email.recipients?.length || 1,
    subjectKeywords: [], // TODO: Extract keywords
    multipleOpens: false
  }
}

/**
 * Track an email action with full context
 */
export function trackEmailBehavior(
  eventType: BehaviorEventType,
  userId: string,
  email: {
    id: string
    threadId?: string
    from: string
    body?: string
    attachments?: unknown[]
    recipients?: string[]
    threadDepth?: number
  },
  accountId: string,
  durationMs?: number
) {
  useBehaviorStore.getState().trackBehavior({
    userId,
    emailId: email.id,
    threadId: email.threadId,
    senderId: email.from,
    eventType,
    accountId,
    durationMs,
    contextFeatures: createBehaviorContext(email)
  })
}
