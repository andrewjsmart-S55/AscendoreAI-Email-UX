/**
 * A/B Testing Framework for AI Features
 *
 * Enables controlled rollout and testing of AI features
 * with proper measurement and analytics.
 *
 * Features:
 * - User-based experiment assignment
 * - Consistent bucketing (same user always sees same variant)
 * - Feature flags with percentage rollout
 * - Event tracking for experiment analysis
 * - Integration with analytics
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import React, { createContext, useContext, useMemo, useCallback, useEffect, type ReactNode } from 'react'

// =============================================================================
// Types
// =============================================================================

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export interface ExperimentVariant {
  id: string
  name: string
  weight: number // 0-100 percentage
  config: Record<string, unknown>
}

export interface Experiment {
  id: string
  name: string
  description: string
  status: ExperimentStatus
  variants: ExperimentVariant[]
  startDate?: number
  endDate?: number
  targetAudience?: {
    userIds?: string[]
    percentage?: number // 0-100
    properties?: Record<string, unknown>
  }
  metrics: ExperimentMetric[]
  createdAt: number
  updatedAt: number
}

export interface ExperimentMetric {
  name: string
  type: 'count' | 'conversion' | 'duration' | 'value'
  goal?: 'increase' | 'decrease'
  minimumSampleSize?: number
}

export interface ExperimentAssignment {
  experimentId: string
  variantId: string
  assignedAt: number
  userId: string
}

export interface ExperimentEvent {
  experimentId: string
  variantId: string
  userId: string
  eventName: string
  eventData?: Record<string, unknown>
  timestamp: number
}

export interface ExperimentResults {
  experimentId: string
  variantResults: {
    variantId: string
    variantName: string
    participants: number
    events: Record<string, number>
    conversions: Record<string, number>
    avgDuration?: number
  }[]
  startDate: number
  lastUpdated: number
  isSignificant?: boolean
  winningVariant?: string
}

// =============================================================================
// Default Experiments
// =============================================================================

export const AI_EXPERIMENTS: Experiment[] = [
  {
    id: 'smart_reply_style',
    name: 'Smart Reply Style',
    description: 'Test different smart reply suggestion styles',
    status: 'running',
    variants: [
      {
        id: 'control',
        name: 'Control (3 replies)',
        weight: 50,
        config: { replyCount: 3, showTone: false }
      },
      {
        id: 'expanded',
        name: 'Expanded (5 replies with tone)',
        weight: 50,
        config: { replyCount: 5, showTone: true }
      }
    ],
    metrics: [
      { name: 'reply_selected', type: 'conversion', goal: 'increase' },
      { name: 'reply_edited', type: 'count', goal: 'decrease' },
      { name: 'time_to_reply', type: 'duration', goal: 'decrease' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'auto_categorization',
    name: 'Auto-Categorization Visibility',
    description: 'Test showing vs hiding auto-categorization confidence',
    status: 'running',
    variants: [
      {
        id: 'control',
        name: 'Control (hidden confidence)',
        weight: 50,
        config: { showConfidence: false, showExplanation: false }
      },
      {
        id: 'transparent',
        name: 'Transparent (show confidence)',
        weight: 50,
        config: { showConfidence: true, showExplanation: true }
      }
    ],
    metrics: [
      { name: 'category_override', type: 'count', goal: 'decrease' },
      { name: 'user_trust_score', type: 'value', goal: 'increase' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'email_summary_length',
    name: 'Email Summary Length',
    description: 'Test brief vs detailed email summaries',
    status: 'running',
    variants: [
      {
        id: 'brief',
        name: 'Brief (2-3 sentences)',
        weight: 33,
        config: { maxLength: 100, bulletPoints: false }
      },
      {
        id: 'standard',
        name: 'Standard (paragraph)',
        weight: 34,
        config: { maxLength: 200, bulletPoints: false }
      },
      {
        id: 'detailed',
        name: 'Detailed (bullet points)',
        weight: 33,
        config: { maxLength: 300, bulletPoints: true }
      }
    ],
    metrics: [
      { name: 'summary_expanded', type: 'count' },
      { name: 'email_opened', type: 'conversion' },
      { name: 'time_to_action', type: 'duration', goal: 'decrease' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'follow_up_suggestions',
    name: 'Follow-up Reminder Aggressiveness',
    description: 'Test different thresholds for follow-up suggestions',
    status: 'running',
    variants: [
      {
        id: 'conservative',
        name: 'Conservative (high confidence only)',
        weight: 50,
        config: { confidenceThreshold: 70, maxSuggestionsPerDay: 3 }
      },
      {
        id: 'aggressive',
        name: 'Aggressive (more suggestions)',
        weight: 50,
        config: { confidenceThreshold: 40, maxSuggestionsPerDay: 10 }
      }
    ],
    metrics: [
      { name: 'suggestion_accepted', type: 'conversion', goal: 'increase' },
      { name: 'suggestion_dismissed', type: 'count', goal: 'decrease' },
      { name: 'follow_up_completed', type: 'conversion', goal: 'increase' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'trust_progression_speed',
    name: 'Trust Progression Speed',
    description: 'Test faster vs slower trust level progression',
    status: 'draft',
    variants: [
      {
        id: 'slow',
        name: 'Slow (100 actions/stage)',
        weight: 50,
        config: { actionsPerStage: 100, approvalThreshold: 0.9 }
      },
      {
        id: 'fast',
        name: 'Fast (50 actions/stage)',
        weight: 50,
        config: { actionsPerStage: 50, approvalThreshold: 0.85 }
      }
    ],
    metrics: [
      { name: 'auto_action_used', type: 'count', goal: 'increase' },
      { name: 'auto_action_reverted', type: 'count', goal: 'decrease' },
      { name: 'trust_stage_reached', type: 'value', goal: 'increase' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
]

// =============================================================================
// Hashing Utility
// =============================================================================

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get a consistent bucket (0-99) for a user+experiment combination
 */
function getBucket(userId: string, experimentId: string): number {
  const combined = `${userId}_${experimentId}`
  return hashString(combined) % 100
}

// =============================================================================
// Experiment Store
// =============================================================================

interface ExperimentStore {
  experiments: Experiment[]
  assignments: ExperimentAssignment[]
  events: ExperimentEvent[]
  results: Record<string, ExperimentResults>

  // Experiment management
  addExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>) => Experiment
  updateExperiment: (id: string, updates: Partial<Experiment>) => void
  deleteExperiment: (id: string) => void
  setExperimentStatus: (id: string, status: ExperimentStatus) => void

  // Assignment
  getAssignment: (userId: string, experimentId: string) => ExperimentAssignment | null
  assignVariant: (userId: string, experiment: Experiment) => ExperimentVariant

  // Event tracking
  trackEvent: (
    experimentId: string,
    userId: string,
    eventName: string,
    eventData?: Record<string, unknown>
  ) => void

  // Results
  calculateResults: (experimentId: string) => ExperimentResults | null
}

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set, get) => ({
      experiments: AI_EXPERIMENTS,
      assignments: [],
      events: [],
      results: {},

      addExperiment: (experimentData) => {
        const experiment: Experiment = {
          ...experimentData,
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          experiments: [...state.experiments, experiment]
        }))

        return experiment
      },

      updateExperiment: (id, updates) => {
        set(state => ({
          experiments: state.experiments.map(exp =>
            exp.id === id
              ? { ...exp, ...updates, updatedAt: Date.now() }
              : exp
          )
        }))
      },

      deleteExperiment: (id) => {
        set(state => ({
          experiments: state.experiments.filter(exp => exp.id !== id)
        }))
      },

      setExperimentStatus: (id, status) => {
        set(state => ({
          experiments: state.experiments.map(exp =>
            exp.id === id
              ? {
                  ...exp,
                  status,
                  updatedAt: Date.now(),
                  startDate: status === 'running' && !exp.startDate ? Date.now() : exp.startDate,
                  endDate: status === 'completed' ? Date.now() : exp.endDate
                }
              : exp
          )
        }))
      },

      getAssignment: (userId, experimentId) => {
        return get().assignments.find(
          a => a.userId === userId && a.experimentId === experimentId
        ) || null
      },

      assignVariant: (userId, experiment) => {
        const { assignments, getAssignment } = get()

        // Check for existing assignment
        const existing = getAssignment(userId, experiment.id)
        if (existing) {
          const variant = experiment.variants.find(v => v.id === existing.variantId)
          if (variant) return variant
        }

        // Get consistent bucket
        const bucket = getBucket(userId, experiment.id)

        // Check if user is in target audience
        if (experiment.targetAudience?.percentage !== undefined) {
          if (bucket >= experiment.targetAudience.percentage) {
            // User not in experiment, return control
            return experiment.variants[0]
          }
        }

        // Assign based on variant weights
        let cumulativeWeight = 0
        const adjustedBucket = bucket % 100 // Normalize bucket for variant selection

        for (const variant of experiment.variants) {
          cumulativeWeight += variant.weight
          if (adjustedBucket < cumulativeWeight) {
            // Save assignment
            const assignment: ExperimentAssignment = {
              experimentId: experiment.id,
              variantId: variant.id,
              assignedAt: Date.now(),
              userId
            }

            set(state => ({
              assignments: [...state.assignments, assignment]
            }))

            return variant
          }
        }

        // Fallback to first variant
        return experiment.variants[0]
      },

      trackEvent: (experimentId, userId, eventName, eventData) => {
        const { assignments } = get()
        const assignment = assignments.find(
          a => a.userId === userId && a.experimentId === experimentId
        )

        if (!assignment) return

        const event: ExperimentEvent = {
          experimentId,
          variantId: assignment.variantId,
          userId,
          eventName,
          eventData,
          timestamp: Date.now()
        }

        set(state => ({
          events: [...state.events, event]
        }))
      },

      calculateResults: (experimentId) => {
        const { experiments, assignments, events } = get()
        const experiment = experiments.find(e => e.id === experimentId)
        if (!experiment) return null

        const experimentAssignments = assignments.filter(a => a.experimentId === experimentId)
        const experimentEvents = events.filter(e => e.experimentId === experimentId)

        const variantResults = experiment.variants.map(variant => {
          const variantAssignments = experimentAssignments.filter(a => a.variantId === variant.id)
          const variantEvents = experimentEvents.filter(e => e.variantId === variant.id)

          // Count events by name
          const eventCounts: Record<string, number> = {}
          variantEvents.forEach(e => {
            eventCounts[e.eventName] = (eventCounts[e.eventName] || 0) + 1
          })

          // Calculate conversions (unique users who performed action)
          const conversions: Record<string, number> = {}
          const uniqueUserEvents = new Map<string, Set<string>>()

          variantEvents.forEach(e => {
            if (!uniqueUserEvents.has(e.eventName)) {
              uniqueUserEvents.set(e.eventName, new Set())
            }
            uniqueUserEvents.get(e.eventName)!.add(e.userId)
          })

          uniqueUserEvents.forEach((users, eventName) => {
            conversions[eventName] = users.size
          })

          return {
            variantId: variant.id,
            variantName: variant.name,
            participants: variantAssignments.length,
            events: eventCounts,
            conversions
          }
        })

        const results: ExperimentResults = {
          experimentId,
          variantResults,
          startDate: experiment.startDate || experiment.createdAt,
          lastUpdated: Date.now()
        }

        // Store results
        set(state => ({
          results: { ...state.results, [experimentId]: results }
        }))

        return results
      }
    }),
    {
      name: 'boxzero-experiments',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        experiments: state.experiments,
        assignments: state.assignments,
        events: state.events,
        results: state.results
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to get experiment variant for current user
 */
export function useExperiment(
  experimentId: string,
  userId: string | null
): {
  variant: ExperimentVariant | null
  config: Record<string, unknown>
  trackEvent: (eventName: string, eventData?: Record<string, unknown>) => void
  isLoading: boolean
} {
  const store = useExperimentStore()

  const experiment = useMemo(
    () => store.experiments.find(e => e.id === experimentId && e.status === 'running'),
    [store.experiments, experimentId]
  )

  const variant = useMemo(() => {
    if (!experiment || !userId) return null
    return store.assignVariant(userId, experiment)
  }, [experiment, userId, store.assignVariant])

  const trackEvent = useCallback(
    (eventName: string, eventData?: Record<string, unknown>) => {
      if (!userId) return
      store.trackEvent(experimentId, userId, eventName, eventData)
    },
    [experimentId, userId, store.trackEvent]
  )

  return {
    variant,
    config: variant?.config || {},
    trackEvent,
    isLoading: !userId
  }
}

/**
 * Hook to get multiple experiment variants
 */
export function useExperiments(
  experimentIds: string[],
  userId: string | null
): Record<string, { variant: ExperimentVariant | null; config: Record<string, unknown> }> {
  const store = useExperimentStore()

  return useMemo(() => {
    const results: Record<string, { variant: ExperimentVariant | null; config: Record<string, unknown> }> = {}

    for (const experimentId of experimentIds) {
      const experiment = store.experiments.find(e => e.id === experimentId && e.status === 'running')
      const variant = experiment && userId ? store.assignVariant(userId, experiment) : null

      results[experimentId] = {
        variant,
        config: variant?.config || {}
      }
    }

    return results
  }, [experimentIds, userId, store.experiments, store.assignVariant])
}

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagId: string,
  userId: string | null,
  defaultValue: boolean = false
): boolean {
  const { variant } = useExperiment(flagId, userId)

  if (!variant) return defaultValue

  // Treat 'control' variant as disabled, others as enabled
  return variant.id !== 'control'
}

/**
 * Hook for experiment analytics dashboard
 */
export function useExperimentAnalytics(experimentId: string) {
  const store = useExperimentStore()

  const experiment = useMemo(
    () => store.experiments.find(e => e.id === experimentId),
    [store.experiments, experimentId]
  )

  const results = useMemo(
    () => store.calculateResults(experimentId),
    [experimentId, store.events, store.assignments]
  )

  const refresh = useCallback(() => {
    store.calculateResults(experimentId)
  }, [experimentId, store.calculateResults])

  return {
    experiment,
    results,
    refresh
  }
}

// =============================================================================
// Provider Component
// =============================================================================

interface ExperimentContextValue {
  userId: string | null
  trackEvent: (experimentId: string, eventName: string, eventData?: Record<string, unknown>) => void
}

const ExperimentContext = createContext<ExperimentContextValue>({
  userId: null,
  trackEvent: () => {}
})

export function ExperimentProvider({
  userId,
  children
}: {
  userId: string | null
  children: ReactNode
}) {
  const store = useExperimentStore()

  const trackEvent = useCallback(
    (experimentId: string, eventName: string, eventData?: Record<string, unknown>) => {
      if (userId) {
        store.trackEvent(experimentId, userId, eventName, eventData)
      }
    },
    [userId, store.trackEvent]
  )

  return React.createElement(
    ExperimentContext.Provider,
    { value: { userId, trackEvent } },
    children
  )
}

export function useExperimentContext() {
  return useContext(ExperimentContext)
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate statistical significance between two variants
 * Using simplified chi-square test
 */
export function calculateSignificance(
  controlConversions: number,
  controlParticipants: number,
  treatmentConversions: number,
  treatmentParticipants: number
): { pValue: number; isSignificant: boolean; lift: number } {
  const controlRate = controlParticipants > 0 ? controlConversions / controlParticipants : 0
  const treatmentRate = treatmentParticipants > 0 ? treatmentConversions / treatmentParticipants : 0

  const lift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0

  // Simplified p-value calculation
  const totalParticipants = controlParticipants + treatmentParticipants
  const totalConversions = controlConversions + treatmentConversions
  const expectedRate = totalParticipants > 0 ? totalConversions / totalParticipants : 0

  const expectedControl = controlParticipants * expectedRate
  const expectedTreatment = treatmentParticipants * expectedRate

  let chiSquare = 0
  if (expectedControl > 0) {
    chiSquare += Math.pow(controlConversions - expectedControl, 2) / expectedControl
  }
  if (expectedTreatment > 0) {
    chiSquare += Math.pow(treatmentConversions - expectedTreatment, 2) / expectedTreatment
  }

  // Approximate p-value from chi-square (1 degree of freedom)
  const pValue = chiSquare > 3.84 ? 0.05 : chiSquare > 2.71 ? 0.10 : chiSquare > 1.32 ? 0.25 : 0.50

  return {
    pValue,
    isSignificant: pValue < 0.05,
    lift
  }
}

export default useExperimentStore
