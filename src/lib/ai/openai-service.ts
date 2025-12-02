/**
 * OpenAI Service (Tier 3)
 *
 * Handles LLM-based predictions for complex emails where Bayesian
 * predictions have low confidence.
 *
 * Features:
 * - Email classification (category, intent, urgency)
 * - Summary generation (email, thread, daily)
 * - Draft response generation
 * - Action extraction (tasks, meetings, deadlines)
 */

import {
  EmailClassification,
  ExtractedAction,
  LLMPrediction,
  AIActionType,
  EmailSummary,
  SummaryType,
  DEFAULT_AI_CONFIG
} from '@/types/ai'
import { Email, EmailThread } from '@/types/email'

// =============================================================================
// Configuration
// =============================================================================

export interface OpenAIConfig {
  apiKey?: string
  classificationModel: string
  summaryModel: string
  draftModel: string
  maxSummaryTokens: number
  maxDraftTokens: number
  creativeTemperature: number
  factualTemperature: number
}

const config: OpenAIConfig = {
  ...DEFAULT_AI_CONFIG,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
}

// =============================================================================
// Prompt Templates
// =============================================================================

const PROMPTS = {
  classification: `You are an email classification assistant. Analyze the following email and provide a classification.

Email:
From: {from}
Subject: {subject}
Body: {body}

Respond in JSON format:
{
  "category": "urgent" | "important" | "routine" | "promotional" | "newsletter" | "automated" | "social" | "spam",
  "intent": "request" | "action_required" | "information" | "fyi" | "social" | "transactional" | "marketing",
  "sentiment": "positive" | "neutral" | "negative",
  "topics": ["topic1", "topic2"],
  "urgency": "high" | "medium" | "low" | "none",
  "requiresResponse": true | false,
  "hasDeadline": true | false,
  "deadline": "extracted deadline or null",
  "confidence": 0.0-1.0
}`,

  actionExtraction: `You are an assistant that extracts actionable items from emails.

Email:
From: {from}
Subject: {subject}
Body: {body}

Extract any tasks, meetings, deadlines, or follow-ups. Respond in JSON format:
{
  "actions": [
    {
      "type": "meeting" | "task" | "deadline" | "payment" | "follow_up" | "decision",
      "description": "Brief description of the action",
      "dueDate": "ISO date or null",
      "priority": "high" | "medium" | "low",
      "assignees": ["person1", "person2"],
      "confidence": 0.0-1.0
    }
  ]
}

If no actions are found, return {"actions": []}`,

  emailSummary: `Summarize this email in 2-3 sentences, focusing on the key message and any action items.

From: {from}
Subject: {subject}
Body: {body}

Respond in JSON format:
{
  "summary": "Your summary here",
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"]
}`,

  threadSummary: `Summarize this email conversation thread. Include:
- The main topic/purpose
- Key decisions or outcomes
- Any pending action items
- Current status

Thread:
{thread}

Respond in JSON format:
{
  "summary": "Your summary here",
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"],
  "status": "resolved" | "pending" | "needs_response"
}`,

  dailySummary: `Create a brief daily email summary for these {count} emails.
Group by priority and highlight urgent items.

Emails:
{emails}

Respond in JSON format:
{
  "summary": "Brief overview of the day's emails",
  "urgent": ["urgent item 1"],
  "important": ["important item 1"],
  "actionRequired": ["action 1"],
  "fyi": ["fyi item 1"],
  "stats": {
    "total": number,
    "urgent": number,
    "needsResponse": number
  }
}`,

  draftResponse: `Draft a professional email response.

Original Email:
From: {from}
Subject: {subject}
Body: {body}

User Instructions: {instructions}
Tone: {tone}

Write a clear, professional response. Do not include subject line.
Start with an appropriate greeting and end with a closing.`
}

// =============================================================================
// OpenAI Service Class
// =============================================================================

export class OpenAIService {
  private config: OpenAIConfig

  constructor(customConfig?: Partial<OpenAIConfig>) {
    this.config = { ...config, ...customConfig }
  }

  /**
   * Check if service is configured with API key
   */
  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  /**
   * Classify an email
   */
  async classifyEmail(email: {
    from: string
    subject: string
    body: string
  }): Promise<EmailClassification> {
    const prompt = PROMPTS.classification
      .replace('{from}', email.from)
      .replace('{subject}', email.subject)
      .replace('{body}', this.truncateBody(email.body, 2000))

    try {
      const response = await this.callAPI(
        prompt,
        this.config.classificationModel,
        this.config.factualTemperature
      )

      return this.parseJSON<EmailClassification>(response, {
        category: 'routine',
        intent: 'information',
        sentiment: 'neutral',
        topics: [],
        confidence: 0.5,
        isSpam: false,
        isPhishing: false,
        urgency: 'none',
        requiresResponse: false,
        hasDeadline: false
      })
    } catch (error) {
      console.error('[OpenAI] Classification error:', error)
      return {
        category: 'routine',
        intent: 'information',
        sentiment: 'neutral',
        topics: [],
        confidence: 0.3,
        isSpam: false,
        isPhishing: false,
        urgency: 'none',
        requiresResponse: false,
        hasDeadline: false
      }
    }
  }

  /**
   * Extract actions from an email
   */
  async extractActions(email: {
    from: string
    subject: string
    body: string
  }): Promise<ExtractedAction[]> {
    const prompt = PROMPTS.actionExtraction
      .replace('{from}', email.from)
      .replace('{subject}', email.subject)
      .replace('{body}', this.truncateBody(email.body, 2000))

    try {
      const response = await this.callAPI(
        prompt,
        this.config.classificationModel,
        this.config.factualTemperature
      )

      const result = this.parseJSON<{ actions: ExtractedAction[] }>(response, {
        actions: []
      })
      return result.actions
    } catch (error) {
      console.error('[OpenAI] Action extraction error:', error)
      return []
    }
  }

  /**
   * Generate email summary
   */
  async generateEmailSummary(email: {
    from: string
    subject: string
    body: string
  }): Promise<EmailSummary> {
    const prompt = PROMPTS.emailSummary
      .replace('{from}', email.from)
      .replace('{subject}', email.subject)
      .replace('{body}', this.truncateBody(email.body, 3000))

    try {
      const response = await this.callAPI(
        prompt,
        this.config.summaryModel,
        this.config.factualTemperature
      )

      const result = this.parseJSON<{
        summary: string
        keyPoints: string[]
        actionItems: string[]
      }>(response, {
        summary: 'Unable to generate summary.',
        keyPoints: [],
        actionItems: []
      })

      return {
        type: 'email',
        content: result.summary,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        model: this.config.summaryModel,
        tokensUsed: 0, // Would need to track from API response
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[OpenAI] Summary error:', error)
      return {
        type: 'email',
        content: 'Unable to generate summary.',
        keyPoints: [],
        actionItems: [],
        model: this.config.summaryModel,
        tokensUsed: 0,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Generate thread summary
   */
  async generateThreadSummary(thread: EmailThread): Promise<EmailSummary> {
    const threadText = thread.emails
      ?.map(
        (m, i) =>
          `[Email ${i + 1}]\nFrom: ${m.from}\nDate: ${m.receivedAt}\nBody: ${this.truncateBody(m.body || '', 500)}`
      )
      .join('\n\n')

    const prompt = PROMPTS.threadSummary.replace(
      '{thread}',
      threadText || 'No messages'
    )

    try {
      const response = await this.callAPI(
        prompt,
        this.config.summaryModel,
        this.config.factualTemperature
      )

      const result = this.parseJSON<{
        summary: string
        keyPoints: string[]
        actionItems: string[]
        status: string
      }>(response, {
        summary: 'Unable to generate summary.',
        keyPoints: [],
        actionItems: [],
        status: 'pending'
      })

      return {
        type: 'thread',
        content: result.summary,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        model: this.config.summaryModel,
        tokensUsed: 0,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[OpenAI] Thread summary error:', error)
      return {
        type: 'thread',
        content: 'Unable to generate summary.',
        keyPoints: [],
        actionItems: [],
        model: this.config.summaryModel,
        tokensUsed: 0,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Generate daily summary for multiple emails
   */
  async generateDailySummary(emails: Email[]): Promise<EmailSummary> {
    const emailsText = emails
      .slice(0, 20) // Limit to 20 emails
      .map(
        (e, i) =>
          `${i + 1}. From: ${e.from}, Subject: ${e.subject}, Starred: ${e.isStarred}`
      )
      .join('\n')

    const prompt = PROMPTS.dailySummary
      .replace('{count}', emails.length.toString())
      .replace('{emails}', emailsText)

    try {
      const response = await this.callAPI(
        prompt,
        this.config.summaryModel,
        this.config.factualTemperature
      )

      const result = this.parseJSON<{
        summary: string
        urgent: string[]
        important: string[]
        actionRequired: string[]
        fyi: string[]
      }>(response, {
        summary: `You have ${emails.length} emails today.`,
        urgent: [],
        important: [],
        actionRequired: [],
        fyi: []
      })

      return {
        type: 'daily',
        content: result.summary,
        keyPoints: [...result.urgent, ...result.important],
        actionItems: result.actionRequired,
        model: this.config.summaryModel,
        tokensUsed: 0,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[OpenAI] Daily summary error:', error)
      return {
        type: 'daily',
        content: `You have ${emails.length} emails today.`,
        keyPoints: [],
        actionItems: [],
        model: this.config.summaryModel,
        tokensUsed: 0,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Generate draft response
   */
  async generateDraft(context: {
    originalEmail: {
      from: string
      subject: string
      body: string
    }
    instructions?: string
    tone?: 'formal' | 'casual' | 'friendly' | 'professional'
  }): Promise<string> {
    const prompt = PROMPTS.draftResponse
      .replace('{from}', context.originalEmail.from)
      .replace('{subject}', context.originalEmail.subject)
      .replace('{body}', this.truncateBody(context.originalEmail.body, 2000))
      .replace('{instructions}', context.instructions || 'Reply appropriately')
      .replace('{tone}', context.tone || 'professional')

    try {
      const response = await this.callAPI(
        prompt,
        this.config.draftModel,
        this.config.creativeTemperature
      )

      return response.trim()
    } catch (error) {
      console.error('[OpenAI] Draft generation error:', error)
      return 'Unable to generate draft. Please try again.'
    }
  }

  /**
   * Generate LLM prediction (combines classification + action extraction)
   */
  async predict(email: {
    id: string
    from: string
    subject: string
    body: string
  }): Promise<LLMPrediction> {
    // Run classification and action extraction in parallel
    const [classification, actions] = await Promise.all([
      this.classifyEmail(email),
      this.extractActions(email)
    ])

    // Determine predicted action based on classification
    let predictedAction: AIActionType = 'keep'
    let confidence = classification.confidence

    if (classification.category === 'spam' || classification.isSpam) {
      predictedAction = 'delete'
      confidence = 0.9
    } else if (classification.category === 'promotional' || classification.category === 'newsletter') {
      predictedAction = 'archive'
      confidence = 0.7
    } else if (classification.urgency === 'high' || classification.requiresResponse) {
      predictedAction = 'keep'
      confidence = 0.8
    } else if (classification.category === 'automated') {
      predictedAction = 'archive'
      confidence = 0.6
    }

    // Generate reasoning
    const reasoning = this.generateLLMReasoning(classification, actions, predictedAction)

    return {
      source: 'llm',
      model: this.config.classificationModel,
      predictedAction,
      confidence,
      reasoning,
      extractedEntities: {
        dates: actions.filter(a => a.dueDate).map(a => a.dueDate!),
        amounts: [], // Could extract from body
        people: actions.flatMap(a => a.assignees),
        tasks: actions.filter(a => a.type === 'task').map(a => a.description),
        locations: []
      },
      classification: {
        category: classification.category,
        intent: classification.intent,
        sentiment: classification.sentiment,
        topics: classification.topics
      }
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Call the OpenAI API
   */
  private async callAPI(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    // Use server-side API route to keep API key secure
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, temperature })
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content || ''
  }

  /**
   * Parse JSON response with fallback
   */
  private parseJSON<T>(text: string, fallback: T): T {
    try {
      // Try to extract JSON from response (may have markdown wrapper)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T
      }
      return fallback
    } catch {
      console.warn('[OpenAI] Failed to parse JSON response')
      return fallback
    }
  }

  /**
   * Truncate email body to fit token limits
   */
  private truncateBody(body: string, maxChars: number): string {
    if (!body) return ''
    if (body.length <= maxChars) return body
    return body.substring(0, maxChars) + '...[truncated]'
  }

  /**
   * Generate reasoning text from LLM analysis
   */
  private generateLLMReasoning(
    classification: EmailClassification,
    actions: ExtractedAction[],
    predictedAction: AIActionType
  ): string {
    const parts: string[] = []

    // Category
    parts.push(`Classified as ${classification.category} email.`)

    // Intent
    if (classification.intent !== 'information') {
      parts.push(`Intent: ${classification.intent.replace('_', ' ')}.`)
    }

    // Urgency
    if (classification.urgency !== 'none') {
      parts.push(`${classification.urgency.charAt(0).toUpperCase() + classification.urgency.slice(1)} urgency.`)
    }

    // Actions found
    if (actions.length > 0) {
      parts.push(`Found ${actions.length} action item(s).`)
    }

    // Response needed
    if (classification.requiresResponse) {
      parts.push('Response required.')
    }

    // Deadline
    if (classification.hasDeadline && classification.deadline) {
      parts.push(`Deadline: ${classification.deadline}.`)
    }

    // Predicted action reasoning
    switch (predictedAction) {
      case 'archive':
        parts.push('Recommended for archive.')
        break
      case 'delete':
        parts.push('Recommended for deletion.')
        break
      case 'keep':
        parts.push('Keep in inbox for review.')
        break
    }

    return parts.join(' ')
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const openAIService = new OpenAIService()

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick classification check
 */
export async function quickClassify(email: Email): Promise<{
  category: string
  urgency: string
  requiresResponse: boolean
}> {
  const result = await openAIService.classifyEmail({
    from: email.from || '',
    subject: email.subject || '',
    body: email.body || ''
  })

  return {
    category: result.category,
    urgency: result.urgency,
    requiresResponse: result.requiresResponse
  }
}

/**
 * Get AI summary for display
 */
export async function getAISummary(email: Email): Promise<string> {
  const summary = await openAIService.generateEmailSummary({
    from: email.from || '',
    subject: email.subject || '',
    body: email.body || ''
  })

  return summary.content
}
