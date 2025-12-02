/**
 * Label Store - Email Labels & Categories
 *
 * Manages:
 * - User-created labels
 * - AI-suggested categories
 * - Smart tagging rules
 * - Label statistics
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Email } from '@/types/email'
import { EmailCategory } from '@/types/ai'

// =============================================================================
// Types
// =============================================================================

export interface Label {
  /** Unique label ID */
  id: string

  /** Label name */
  name: string

  /** Color for display */
  color: string

  /** Icon name (heroicon) */
  icon?: string

  /** Is this a system label? */
  isSystem: boolean

  /** Created by AI suggestion? */
  isAISuggested: boolean

  /** Email count */
  emailCount: number

  /** Created timestamp */
  createdAt: string

  /** Last used timestamp */
  lastUsedAt?: string

  /** User ID */
  userId: string
}

export interface LabelRule {
  /** Rule ID */
  id: string

  /** Label to apply */
  labelId: string

  /** Rule conditions */
  conditions: LabelRuleCondition[]

  /** Match all or any conditions */
  matchType: 'all' | 'any'

  /** Is rule active? */
  isActive: boolean

  /** Priority (lower = higher priority) */
  priority: number

  /** User ID */
  userId: string
}

export interface LabelRuleCondition {
  /** Field to check */
  field: 'from' | 'to' | 'subject' | 'body' | 'domain' | 'category'

  /** Operator */
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'matches' | 'is'

  /** Value to match */
  value: string

  /** Case sensitive? */
  caseSensitive: boolean
}

export interface CategoryMapping {
  category: EmailCategory
  labelId: string
  isEnabled: boolean
}

interface LabelState {
  // Data
  labels: Label[]
  rules: LabelRule[]
  categoryMappings: CategoryMapping[]

  // Label CRUD
  createLabel: (label: Omit<Label, 'id' | 'createdAt' | 'emailCount'>) => Label
  updateLabel: (id: string, updates: Partial<Label>) => void
  deleteLabel: (id: string) => void
  getLabel: (id: string) => Label | undefined
  getLabelsByUser: (userId: string) => Label[]

  // Rule CRUD
  createRule: (rule: Omit<LabelRule, 'id'>) => LabelRule
  updateRule: (id: string, updates: Partial<LabelRule>) => void
  deleteRule: (id: string) => void
  getRulesForLabel: (labelId: string) => LabelRule[]

  // Category mappings
  setCategoryMapping: (category: EmailCategory, labelId: string) => void
  getCategoryLabel: (category: EmailCategory) => Label | undefined

  // Apply labels
  applyLabelsToEmail: (email: Email, userId: string) => string[]
  suggestLabels: (email: Email, aiCategory?: EmailCategory) => Label[]
  incrementLabelCount: (labelId: string) => void

  // Initialize system labels
  initializeSystemLabels: (userId: string) => void
}

// =============================================================================
// Default Colors
// =============================================================================

export const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#000000'  // black
]

// =============================================================================
// System Labels
// =============================================================================

const SYSTEM_LABELS: Omit<Label, 'id' | 'createdAt' | 'emailCount' | 'userId'>[] = [
  { name: 'Important', color: '#ef4444', icon: 'ExclamationTriangleIcon', isSystem: true, isAISuggested: false },
  { name: 'Work', color: '#3b82f6', icon: 'BriefcaseIcon', isSystem: true, isAISuggested: false },
  { name: 'Personal', color: '#22c55e', icon: 'UserIcon', isSystem: true, isAISuggested: false },
  { name: 'Finance', color: '#eab308', icon: 'CurrencyDollarIcon', isSystem: true, isAISuggested: false },
  { name: 'Travel', color: '#14b8a6', icon: 'MapPinIcon', isSystem: true, isAISuggested: false },
  { name: 'Shopping', color: '#ec4899', icon: 'ShoppingBagIcon', isSystem: true, isAISuggested: false }
]

// =============================================================================
// Store
// =============================================================================

export const useLabelStore = create<LabelState>()(
  persist(
    (set, get) => ({
      labels: [],
      rules: [],
      categoryMappings: [],

      createLabel: (labelData) => {
        const label: Label = {
          ...labelData,
          id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date().toISOString(),
          emailCount: 0
        }

        set((state) => ({
          labels: [...state.labels, label]
        }))

        return label
      },

      updateLabel: (id, updates) => {
        set((state) => ({
          labels: state.labels.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          )
        }))
      },

      deleteLabel: (id) => {
        set((state) => ({
          labels: state.labels.filter((l) => l.id !== id),
          rules: state.rules.filter((r) => r.labelId !== id),
          categoryMappings: state.categoryMappings.filter((m) => m.labelId !== id)
        }))
      },

      getLabel: (id) => {
        return get().labels.find((l) => l.id === id)
      },

      getLabelsByUser: (userId) => {
        return get().labels.filter((l) => l.userId === userId)
      },

      createRule: (ruleData) => {
        const rule: LabelRule = {
          ...ruleData,
          id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        }

        set((state) => ({
          rules: [...state.rules, rule]
        }))

        return rule
      },

      updateRule: (id, updates) => {
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
        }))
      },

      deleteRule: (id) => {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id)
        }))
      },

      getRulesForLabel: (labelId) => {
        return get().rules.filter((r) => r.labelId === labelId)
      },

      setCategoryMapping: (category, labelId) => {
        set((state) => {
          const existing = state.categoryMappings.findIndex(
            (m) => m.category === category
          )

          if (existing >= 0) {
            const updated = [...state.categoryMappings]
            updated[existing] = { category, labelId, isEnabled: true }
            return { categoryMappings: updated }
          }

          return {
            categoryMappings: [
              ...state.categoryMappings,
              { category, labelId, isEnabled: true }
            ]
          }
        })
      },

      getCategoryLabel: (category) => {
        const mapping = get().categoryMappings.find(
          (m) => m.category === category && m.isEnabled
        )
        if (!mapping) return undefined
        return get().labels.find((l) => l.id === mapping.labelId)
      },

      applyLabelsToEmail: (email, userId) => {
        const state = get()
        const appliedLabels: string[] = []

        // Get active rules sorted by priority
        const activeRules = state.rules
          .filter((r) => r.isActive && r.userId === userId)
          .sort((a, b) => a.priority - b.priority)

        for (const rule of activeRules) {
          if (matchesRule(email, rule)) {
            appliedLabels.push(rule.labelId)
          }
        }

        return [...new Set(appliedLabels)]
      },

      suggestLabels: (email, aiCategory) => {
        const state = get()
        const suggestions: Label[] = []

        // Get category-based label
        if (aiCategory) {
          const categoryLabel = state.getCategoryLabel(aiCategory)
          if (categoryLabel) {
            suggestions.push(categoryLabel)
          }
        }

        // Check content-based suggestions
        const subject = email.subject?.toLowerCase() || ''
        const from = email.from?.toLowerCase() || ''

        // Finance detection
        if (
          subject.includes('invoice') ||
          subject.includes('receipt') ||
          subject.includes('payment') ||
          subject.includes('bank')
        ) {
          const financeLabel = state.labels.find((l) => l.name === 'Finance')
          if (financeLabel) suggestions.push(financeLabel)
        }

        // Travel detection
        if (
          subject.includes('flight') ||
          subject.includes('hotel') ||
          subject.includes('booking') ||
          subject.includes('travel') ||
          subject.includes('airline')
        ) {
          const travelLabel = state.labels.find((l) => l.name === 'Travel')
          if (travelLabel) suggestions.push(travelLabel)
        }

        // Shopping detection
        if (
          subject.includes('order') ||
          subject.includes('shipping') ||
          subject.includes('delivery') ||
          from.includes('amazon') ||
          from.includes('ebay')
        ) {
          const shoppingLabel = state.labels.find((l) => l.name === 'Shopping')
          if (shoppingLabel) suggestions.push(shoppingLabel)
        }

        return [...new Set(suggestions)]
      },

      incrementLabelCount: (labelId) => {
        set((state) => ({
          labels: state.labels.map((l) =>
            l.id === labelId
              ? { ...l, emailCount: l.emailCount + 1, lastUsedAt: new Date().toISOString() }
              : l
          )
        }))
      },

      initializeSystemLabels: (userId) => {
        const state = get()
        const existingNames = new Set(
          state.labels.filter((l) => l.userId === userId).map((l) => l.name)
        )

        const newLabels: Label[] = SYSTEM_LABELS
          .filter((l) => !existingNames.has(l.name))
          .map((l) => ({
            ...l,
            id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            createdAt: new Date().toISOString(),
            emailCount: 0,
            userId
          }))

        if (newLabels.length > 0) {
          set((state) => ({
            labels: [...state.labels, ...newLabels]
          }))
        }
      }
    }),
    {
      name: 'boxzero-labels',
      version: 1
    }
  )
)

// =============================================================================
// Rule Matching
// =============================================================================

function matchesRule(email: Email, rule: LabelRule): boolean {
  const matches = rule.conditions.map((condition) =>
    matchesCondition(email, condition)
  )

  if (rule.matchType === 'all') {
    return matches.every((m) => m)
  } else {
    return matches.some((m) => m)
  }
}

function matchesCondition(email: Email, condition: LabelRuleCondition): boolean {
  let value = ''

  switch (condition.field) {
    case 'from':
      value = email.from || ''
      break
    case 'to':
      value = email.to?.join(', ') || ''
      break
    case 'subject':
      value = email.subject || ''
      break
    case 'body':
      value = email.body || ''
      break
    case 'domain':
      value = email.from?.split('@')[1] || ''
      break
    case 'category':
      // This would check AI category if available
      return false
  }

  const compareValue = condition.caseSensitive ? value : value.toLowerCase()
  const matchValue = condition.caseSensitive
    ? condition.value
    : condition.value.toLowerCase()

  switch (condition.operator) {
    case 'contains':
      return compareValue.includes(matchValue)
    case 'equals':
      return compareValue === matchValue
    case 'starts_with':
      return compareValue.startsWith(matchValue)
    case 'ends_with':
      return compareValue.endsWith(matchValue)
    case 'matches':
      try {
        const regex = new RegExp(condition.value, condition.caseSensitive ? '' : 'i')
        return regex.test(value)
      } catch {
        return false
      }
    case 'is':
      return compareValue === matchValue
    default:
      return false
  }
}

// =============================================================================
// Label Selector Hook
// =============================================================================

export function useLabelSelector(userId: string) {
  const labels = useLabelStore((state) => state.getLabelsByUser(userId))
  const createLabel = useLabelStore((state) => state.createLabel)

  const quickCreate = (name: string, color?: string) => {
    return createLabel({
      name,
      color: color || LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)],
      isSystem: false,
      isAISuggested: false,
      userId
    })
  }

  return {
    labels,
    quickCreate
  }
}
