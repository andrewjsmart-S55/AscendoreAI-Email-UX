/**
 * Email Templates Service
 *
 * Reusable email templates with:
 * - Variable substitution
 * - Template categories
 * - Personal and team templates
 * - Usage analytics
 * - AI-powered suggestions
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type TemplateCategory =
  | 'response'
  | 'follow_up'
  | 'introduction'
  | 'meeting'
  | 'feedback'
  | 'support'
  | 'sales'
  | 'custom'

export type TemplateScope = 'personal' | 'team' | 'global'

export interface TemplateVariable {
  name: string
  label: string
  defaultValue?: string
  type: 'text' | 'date' | 'email' | 'name' | 'custom'
  required: boolean
}

export interface EmailTemplate {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  scope: TemplateScope

  // Content
  subject: string
  body: string
  variables: TemplateVariable[]

  // Metadata
  ownerId: string
  teamId?: string
  isActive: boolean
  isPinned: boolean

  // Analytics
  usageCount: number
  lastUsedAt?: number

  // Timestamps
  createdAt: number
  updatedAt: number
}

export interface TemplateUsage {
  id: string
  templateId: string
  userId: string
  emailId?: string
  variableValues: Record<string, string>
  timestamp: number
}

export interface CompiledTemplate {
  subject: string
  body: string
  missingVariables: string[]
}

// =============================================================================
// Variable Extraction & Substitution
// =============================================================================

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g

/**
 * Extract variable names from template content
 */
export function extractVariables(content: string): string[] {
  const variables: string[] = []
  let match

  while ((match = VARIABLE_REGEX.exec(content)) !== null) {
    const varName = match[1].trim()
    if (!variables.includes(varName)) {
      variables.push(varName)
    }
  }

  VARIABLE_REGEX.lastIndex = 0 // Reset regex state
  return variables
}

/**
 * Substitute variables in template content
 */
export function substituteVariables(
  content: string,
  values: Record<string, string>
): { result: string; missing: string[] } {
  const missing: string[] = []

  const result = content.replace(VARIABLE_REGEX, (match, varName) => {
    const trimmedName = varName.trim()
    const value = values[trimmedName]

    if (value === undefined || value === '') {
      missing.push(trimmedName)
      return match // Keep original placeholder
    }

    return value
  })

  VARIABLE_REGEX.lastIndex = 0
  return { result, missing }
}

/**
 * Compile template with variable values
 */
export function compileTemplate(
  template: EmailTemplate,
  values: Record<string, string>
): CompiledTemplate {
  const subjectResult = substituteVariables(template.subject, values)
  const bodyResult = substituteVariables(template.body, values)

  const missingVariables = [...new Set([...subjectResult.missing, ...bodyResult.missing])]

  return {
    subject: subjectResult.result,
    body: bodyResult.result,
    missingVariables
  }
}

// =============================================================================
// Default Templates
// =============================================================================

export const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>[] = [
  {
    name: 'Quick Acknowledgment',
    description: 'Acknowledge receipt of an email',
    category: 'response',
    scope: 'global',
    subject: 'Re: {{original_subject}}',
    body: `Hi {{sender_name}},

Thank you for your email. I've received it and will get back to you {{response_time}}.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'original_subject', label: 'Original Subject', type: 'text', required: true },
      { name: 'sender_name', label: 'Sender Name', type: 'name', required: true },
      { name: 'response_time', label: 'Response Time', type: 'text', required: false, defaultValue: 'within 24 hours' },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Meeting Request',
    description: 'Request a meeting with someone',
    category: 'meeting',
    scope: 'global',
    subject: 'Meeting Request: {{meeting_topic}}',
    body: `Hi {{recipient_name}},

I hope this email finds you well. I would like to schedule a meeting to discuss {{meeting_topic}}.

Would you be available {{proposed_time}}? The meeting would take approximately {{duration}}.

Please let me know what works best for you.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'recipient_name', label: 'Recipient Name', type: 'name', required: true },
      { name: 'meeting_topic', label: 'Meeting Topic', type: 'text', required: true },
      { name: 'proposed_time', label: 'Proposed Time', type: 'text', required: false, defaultValue: 'this week' },
      { name: 'duration', label: 'Duration', type: 'text', required: false, defaultValue: '30 minutes' },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Follow-up',
    description: 'Follow up on a previous conversation',
    category: 'follow_up',
    scope: 'global',
    subject: 'Following up: {{topic}}',
    body: `Hi {{recipient_name}},

I wanted to follow up on {{topic}} that we discussed {{when}}.

{{additional_context}}

Please let me know if you have any questions or need any additional information.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'recipient_name', label: 'Recipient Name', type: 'name', required: true },
      { name: 'topic', label: 'Topic', type: 'text', required: true },
      { name: 'when', label: 'When', type: 'text', required: false, defaultValue: 'earlier' },
      { name: 'additional_context', label: 'Additional Context', type: 'text', required: false },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Introduction',
    description: 'Introduce yourself or your company',
    category: 'introduction',
    scope: 'global',
    subject: 'Introduction: {{my_name}} from {{company}}',
    body: `Hi {{recipient_name}},

My name is {{my_name}} and I'm {{my_role}} at {{company}}.

{{introduction_reason}}

I would love to connect and learn more about {{their_interest}}.

Best regards,
{{my_name}}
{{my_title}}`,
    variables: [
      { name: 'recipient_name', label: 'Recipient Name', type: 'name', required: true },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true },
      { name: 'my_role', label: 'Your Role', type: 'text', required: true },
      { name: 'company', label: 'Company', type: 'text', required: true },
      { name: 'introduction_reason', label: 'Reason for Introduction', type: 'text', required: false },
      { name: 'their_interest', label: 'Their Interest/Work', type: 'text', required: false },
      { name: 'my_title', label: 'Your Title', type: 'text', required: false }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Thank You',
    description: 'Thank someone for their help or time',
    category: 'response',
    scope: 'global',
    subject: 'Thank you{{subject_suffix}}',
    body: `Hi {{recipient_name}},

Thank you so much for {{reason}}. {{additional_message}}

I really appreciate {{appreciation_detail}}.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'recipient_name', label: 'Recipient Name', type: 'name', required: true },
      { name: 'subject_suffix', label: 'Subject Suffix', type: 'text', required: false, defaultValue: '' },
      { name: 'reason', label: 'Reason for Thanks', type: 'text', required: true },
      { name: 'additional_message', label: 'Additional Message', type: 'text', required: false },
      { name: 'appreciation_detail', label: 'Appreciation Detail', type: 'text', required: false, defaultValue: 'your help' },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Out of Office',
    description: 'Auto-reply for when you are away',
    category: 'response',
    scope: 'global',
    subject: 'Out of Office: {{my_name}}',
    body: `Hi,

Thank you for your email. I am currently out of the office {{dates}} with {{access_level}} access to email.

{{contact_alternative}}

I will respond to your email when I return.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'dates', label: 'Dates Away', type: 'text', required: true },
      { name: 'access_level', label: 'Email Access', type: 'text', required: false, defaultValue: 'limited' },
      { name: 'contact_alternative', label: 'Alternative Contact', type: 'text', required: false },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  },
  {
    name: 'Decline Request',
    description: 'Politely decline a request',
    category: 'response',
    scope: 'global',
    subject: 'Re: {{original_subject}}',
    body: `Hi {{sender_name}},

Thank you for thinking of me regarding {{request}}.

Unfortunately, I'm unable to {{what}} at this time due to {{reason}}.

{{alternative_suggestion}}

I hope you understand, and please don't hesitate to reach out in the future.

Best regards,
{{my_name}}`,
    variables: [
      { name: 'sender_name', label: 'Sender Name', type: 'name', required: true },
      { name: 'original_subject', label: 'Original Subject', type: 'text', required: true },
      { name: 'request', label: 'The Request', type: 'text', required: true },
      { name: 'what', label: 'What You Cannot Do', type: 'text', required: true },
      { name: 'reason', label: 'Reason', type: 'text', required: false },
      { name: 'alternative_suggestion', label: 'Alternative Suggestion', type: 'text', required: false },
      { name: 'my_name', label: 'Your Name', type: 'name', required: true }
    ],
    isActive: true,
    isPinned: false,
    usageCount: 0
  }
]

// =============================================================================
// Template Store
// =============================================================================

interface TemplateStore {
  templates: EmailTemplate[]
  usageHistory: TemplateUsage[]

  // CRUD
  addTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => EmailTemplate
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string, newName: string) => EmailTemplate | null

  // Usage
  useTemplate: (templateId: string, userId: string, variableValues: Record<string, string>, emailId?: string) => void
  recordUsage: (usage: Omit<TemplateUsage, 'id' | 'timestamp'>) => void

  // Queries
  getTemplateById: (id: string) => EmailTemplate | undefined
  getTemplatesByCategory: (category: TemplateCategory) => EmailTemplate[]
  getTemplatesByScope: (scope: TemplateScope, userId?: string, teamId?: string) => EmailTemplate[]
  getPersonalTemplates: (userId: string) => EmailTemplate[]
  getTeamTemplates: (teamId: string) => EmailTemplate[]
  getMostUsedTemplates: (limit?: number) => EmailTemplate[]
  getRecentlyUsedTemplates: (userId: string, limit?: number) => EmailTemplate[]
  searchTemplates: (query: string) => EmailTemplate[]

  // Actions
  togglePin: (id: string) => void
  toggleActive: (id: string) => void
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES.map((t, i) => ({
        ...t,
        id: `template_default_${i}`,
        ownerId: 'system',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      })),
      usageHistory: [],

      addTemplate: (templateData) => {
        const template: EmailTemplate = {
          ...templateData,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          templates: [...state.templates, template]
        }))

        return template
      },

      updateTemplate: (id, updates) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          )
        }))
      },

      deleteTemplate: (id) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id)
        }))
      },

      duplicateTemplate: (id, newName) => {
        const original = get().templates.find(t => t.id === id)
        if (!original) return null

        const duplicate: EmailTemplate = {
          ...original,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: newName,
          scope: 'personal',
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          templates: [...state.templates, duplicate]
        }))

        return duplicate
      },

      useTemplate: (templateId, userId, variableValues, emailId) => {
        // Record usage
        get().recordUsage({ templateId, userId, variableValues, emailId })

        // Update template usage count and last used
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, usageCount: t.usageCount + 1, lastUsedAt: Date.now() }
              : t
          )
        }))
      },

      recordUsage: (usageData) => {
        const usage: TemplateUsage = {
          ...usageData,
          id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        }

        set(state => ({
          usageHistory: [usage, ...state.usageHistory].slice(0, 500) // Keep last 500
        }))
      },

      getTemplateById: (id) => {
        return get().templates.find(t => t.id === id)
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter(t => t.category === category && t.isActive)
      },

      getTemplatesByScope: (scope, userId, teamId) => {
        return get().templates.filter(t => {
          if (t.scope !== scope || !t.isActive) return false
          if (scope === 'personal' && userId && t.ownerId !== userId) return false
          if (scope === 'team' && teamId && t.teamId !== teamId) return false
          return true
        })
      },

      getPersonalTemplates: (userId) => {
        return get().templates.filter(t => t.ownerId === userId && t.isActive)
      },

      getTeamTemplates: (teamId) => {
        return get().templates.filter(t => t.teamId === teamId && t.scope === 'team' && t.isActive)
      },

      getMostUsedTemplates: (limit = 10) => {
        return [...get().templates]
          .filter(t => t.isActive)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit)
      },

      getRecentlyUsedTemplates: (userId, limit = 5) => {
        const recentUsage = get().usageHistory
          .filter(u => u.userId === userId)
          .slice(0, 20)

        const templateIds = [...new Set(recentUsage.map(u => u.templateId))]
        const templates: EmailTemplate[] = []

        for (const id of templateIds) {
          const template = get().templates.find(t => t.id === id && t.isActive)
          if (template) templates.push(template)
          if (templates.length >= limit) break
        }

        return templates
      },

      searchTemplates: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().templates.filter(t =>
          t.isActive && (
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description?.toLowerCase().includes(lowerQuery) ||
            t.body.toLowerCase().includes(lowerQuery)
          )
        )
      },

      togglePin: (id) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, isPinned: !t.isPinned } : t
          )
        }))
      },

      toggleActive: (id) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, isActive: !t.isActive } : t
          )
        }))
      }
    }),
    {
      name: 'boxzero-templates',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        usageHistory: state.usageHistory
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useState } from 'react'

export function useTemplates(userId: string | null, teamId?: string) {
  const store = useTemplateStore()

  const personalTemplates = useMemo(
    () => userId ? store.getPersonalTemplates(userId) : [],
    [userId, store.templates]
  )

  const teamTemplates = useMemo(
    () => teamId ? store.getTeamTemplates(teamId) : [],
    [teamId, store.templates]
  )

  const globalTemplates = useMemo(
    () => store.getTemplatesByScope('global'),
    [store.templates]
  )

  const recentTemplates = useMemo(
    () => userId ? store.getRecentlyUsedTemplates(userId) : [],
    [userId, store.usageHistory, store.templates]
  )

  const allTemplates = useMemo(
    () => [...personalTemplates, ...teamTemplates, ...globalTemplates],
    [personalTemplates, teamTemplates, globalTemplates]
  )

  const templatesByCategory = useMemo(() => {
    const grouped: Record<TemplateCategory, EmailTemplate[]> = {
      response: [],
      follow_up: [],
      introduction: [],
      meeting: [],
      feedback: [],
      support: [],
      sales: [],
      custom: []
    }

    allTemplates.forEach(t => {
      grouped[t.category].push(t)
    })

    return grouped
  }, [allTemplates])

  return {
    personalTemplates,
    teamTemplates,
    globalTemplates,
    recentTemplates,
    allTemplates,
    templatesByCategory,

    // Actions
    addTemplate: store.addTemplate,
    updateTemplate: store.updateTemplate,
    deleteTemplate: store.deleteTemplate,
    duplicateTemplate: store.duplicateTemplate,
    useTemplate: store.useTemplate,
    searchTemplates: store.searchTemplates,
    togglePin: store.togglePin,
    toggleActive: store.toggleActive
  }
}

export function useTemplateEditor(templateId: string | null) {
  const store = useTemplateStore()
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const template = useMemo(
    () => templateId ? store.getTemplateById(templateId) : undefined,
    [templateId, store.templates]
  )

  const compiledTemplate = useMemo(
    () => template ? compileTemplate(template, variableValues) : null,
    [template, variableValues]
  )

  const setVariable = useCallback((name: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const clearVariables = useCallback(() => {
    setVariableValues({})
  }, [])

  const applyDefaults = useCallback(() => {
    if (!template) return

    const defaults: Record<string, string> = {}
    template.variables.forEach(v => {
      if (v.defaultValue) {
        defaults[v.name] = v.defaultValue
      }
    })
    setVariableValues(defaults)
  }, [template])

  return {
    template,
    variableValues,
    compiledTemplate,
    setVariable,
    setVariableValues,
    clearVariables,
    applyDefaults,
    isComplete: compiledTemplate?.missingVariables.length === 0
  }
}

// =============================================================================
// AI Template Suggestions
// =============================================================================

export interface TemplateSuggestion {
  templateId: string
  template: EmailTemplate
  confidence: number
  reason: string
  suggestedValues: Record<string, string>
}

/**
 * Suggest templates based on email context
 */
export function suggestTemplates(
  email: {
    subject: string
    body: string
    from: string
    fromName?: string
  },
  templates: EmailTemplate[]
): TemplateSuggestion[] {
  const suggestions: TemplateSuggestion[] = []
  const subject = email.subject.toLowerCase()
  const body = email.body.toLowerCase()

  // Keywords to template category mapping
  const categoryKeywords: Record<TemplateCategory, string[]> = {
    response: ['thanks', 'received', 'got it', 'will do'],
    follow_up: ['following up', 'checking in', 'any update', 'status'],
    introduction: ['introduce', 'hello', 'nice to meet'],
    meeting: ['meeting', 'call', 'schedule', 'availability', 'calendar'],
    feedback: ['feedback', 'review', 'thoughts', 'opinion'],
    support: ['help', 'issue', 'problem', 'support', 'error'],
    sales: ['interested', 'pricing', 'demo', 'trial'],
    custom: []
  }

  // Check for meeting-related content
  if (/meeting|call|schedule|availability|calendar/.test(body)) {
    const meetingTemplates = templates.filter(t => t.category === 'meeting')
    meetingTemplates.forEach(template => {
      suggestions.push({
        templateId: template.id,
        template,
        confidence: 75,
        reason: 'Email mentions scheduling or meetings',
        suggestedValues: {
          recipient_name: email.fromName || email.from.split('@')[0],
          my_name: '' // Would need user context
        }
      })
    })
  }

  // Check for follow-up content
  if (/follow.?up|checking in|any update|status|waiting/.test(body)) {
    const followUpTemplates = templates.filter(t => t.category === 'follow_up')
    followUpTemplates.forEach(template => {
      suggestions.push({
        templateId: template.id,
        template,
        confidence: 70,
        reason: 'Email appears to be a follow-up',
        suggestedValues: {
          recipient_name: email.fromName || email.from.split('@')[0]
        }
      })
    })
  }

  // Check for thank you context
  if (/thank|appreciate|grateful/.test(body)) {
    const thankYouTemplates = templates.filter(t =>
      t.name.toLowerCase().includes('thank') || t.body.toLowerCase().includes('thank you')
    )
    thankYouTemplates.forEach(template => {
      suggestions.push({
        templateId: template.id,
        template,
        confidence: 65,
        reason: 'Email contains gratitude expressions',
        suggestedValues: {
          recipient_name: email.fromName || email.from.split('@')[0],
          original_subject: email.subject
        }
      })
    })
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence)

  // Return top 3 unique templates
  const uniqueTemplateIds = new Set<string>()
  return suggestions.filter(s => {
    if (uniqueTemplateIds.has(s.templateId)) return false
    uniqueTemplateIds.add(s.templateId)
    return true
  }).slice(0, 3)
}

export default useTemplateStore
