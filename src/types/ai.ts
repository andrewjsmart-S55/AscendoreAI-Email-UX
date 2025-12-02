/**
 * AI Intelligence Layer Type Definitions
 *
 * Implements the Hybrid Prediction Architecture from the BoxZero Product Specification:
 * - Tier 1: Bayesian Prediction Engine (fast, handles 70-80% of emails)
 * - Tier 2: Collaborative Filtering Layer (cross-user patterns)
 * - Tier 3: LLM Reasoning Layer (deep semantic understanding)
 */

// =============================================================================
// AI Action Types (extends existing AIAction in email.ts)
// =============================================================================

export type AIActionType =
  | 'archive'
  | 'delete'
  | 'star'
  | 'unstar'
  | 'mark_read'
  | 'mark_unread'
  | 'snooze'
  | 'reply'
  | 'forward'
  | 'create_task'
  | 'set_reminder'
  | 'move_to_folder'
  | 'apply_label'
  | 'unsubscribe'
  | 'keep' // No action needed

export type EmailCategory =
  | 'urgent'
  | 'important'
  | 'routine'
  | 'promotional'
  | 'newsletter'
  | 'automated'
  | 'social'
  | 'spam'

export type EmailIntent =
  | 'request'
  | 'action_required'
  | 'information'
  | 'fyi'
  | 'social'
  | 'transactional'
  | 'marketing'

// =============================================================================
// Sender Model (Bayesian Tier 1)
// =============================================================================

export interface SenderModel {
  /** Unique identifier (hash of email address) */
  senderId: string

  /** Full email address */
  senderEmail: string

  /** Domain part of email (e.g., 'company.com') */
  senderDomain: string

  /** Display name if available */
  senderName?: string

  // --- Bayesian Statistics ---

  /** Total emails received from this sender */
  totalEmails: number

  /** Emails the user responded to */
  respondedEmails: number

  /** Emails the user archived without action */
  archivedEmails: number

  /** Emails the user deleted */
  deletedEmails: number

  /** Emails the user starred */
  starredEmails: number

  /** Emails the user ignored (no action for extended period) */
  ignoredEmails: number

  /** Average time in seconds to read emails from this sender */
  avgReadTimeSeconds: number

  /** Average time in seconds to respond to this sender */
  avgResponseTimeSeconds: number

  // --- Computed Probabilities (Beta distributions) ---

  /** P(respond | sender) - Probability user will reply */
  responseRate: number

  /** P(archive | sender) - Probability user will archive */
  archiveRate: number

  /** P(delete | sender) - Probability user will delete */
  deleteRate: number

  /** P(important | sender) - Weighted importance score 0-1 */
  importanceScore: number

  /** P(read_quickly | sender) - Probability email read within 1 hour */
  urgencyScore: number

  // --- Time Factors ---

  /** ISO timestamp of first email from sender */
  firstSeen: string

  /** ISO timestamp of last interaction */
  lastInteraction: string

  /** Time-weighted relevance (decays over time) */
  decayedWeight: number

  /** ISO timestamp of last model update */
  lastUpdated: string

  // --- Metadata ---

  /** User ID this model belongs to */
  userId: string

  /** Is this sender marked as VIP by user? */
  isVIP: boolean

  /** User-assigned category for this sender */
  userCategory?: string
}

// =============================================================================
// User Behavior Tracking
// =============================================================================

export type BehaviorEventType =
  | 'read'
  | 'respond'
  | 'archive'
  | 'delete'
  | 'star'
  | 'unstar'
  | 'snooze'
  | 'ignore'
  | 'mark_spam'
  | 'unsubscribe'
  | 'move'
  | 'label'

export interface BehaviorEvent {
  /** Unique event ID */
  eventId: string

  /** User who performed the action */
  userId: string

  /** Email acted upon */
  emailId: string

  /** Thread ID if applicable */
  threadId?: string

  /** Sender ID for quick lookup */
  senderId: string

  /** Type of action taken */
  eventType: BehaviorEventType

  /** ISO timestamp */
  timestamp: string

  /** Time in ms user spent before taking action */
  durationMs?: number

  /** Account the email belongs to */
  accountId: string

  /** Context features for learning */
  contextFeatures: BehaviorContext
}

export interface BehaviorContext {
  /** Hour of day (0-23) */
  timeOfDay: number

  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number

  /** Is this a weekend? */
  isWeekend: boolean

  /** Length of email body in characters */
  emailLength: number

  /** Does email have attachments? */
  hasAttachments: boolean

  /** Number of attachments */
  attachmentCount: number

  /** Depth in thread (1 = first email) */
  threadDepth: number

  /** Number of recipients */
  recipientCount: number

  /** Subject line keywords */
  subjectKeywords: string[]

  /** Was this email opened multiple times? */
  multipleOpens: boolean
}

// =============================================================================
// Trust Progression
// =============================================================================

export type TrustStage =
  | 'training_wheels'     // Week 1: User reviews everything
  | 'building_confidence' // Weeks 2-4: Some auto-actions
  | 'earned_autonomy'     // Month 2+: High automation

export interface UserTrustProfile {
  /** User ID */
  userId: string

  /** Account creation date */
  accountCreated: string

  // --- Trust Metrics ---

  /** Total AI interactions */
  totalInteractions: number

  /** Actions user approved without modification */
  approvedActions: number

  /** Actions user rejected */
  rejectedActions: number

  /** Actions user modified before approval */
  modifiedActions: number

  // --- Computed Trust ---

  /** Current trust stage */
  trustStage: TrustStage

  /** Overall trust score 0-1 */
  trustScore: number

  /** Confidence in each prediction tier */
  tierConfidences: {
    tier1_bayesian: number
    tier2_collaborative: number
    tier3_llm: number
  }

  // --- Thresholds ---

  /** Actions above this confidence auto-execute */
  autoApproveThreshold: number

  /** Minimum confidence to show as suggestion */
  suggestionThreshold: number

  /** ISO timestamp of last update */
  lastUpdated: string
}

// Trust stage transition requirements
export const TRUST_TRANSITIONS = {
  training_wheels: {
    requiredInteractions: 50,
    minApprovalRate: 0.7,
    autoApproveThreshold: 0.95, // Only extremely confident
    next: 'building_confidence' as TrustStage
  },
  building_confidence: {
    requiredInteractions: 200,
    minApprovalRate: 0.85,
    autoApproveThreshold: 0.85,
    next: 'earned_autonomy' as TrustStage
  },
  earned_autonomy: {
    requiredInteractions: null, // No limit
    minApprovalRate: 0.9,
    autoApproveThreshold: 0.75, // Most predictions auto-execute
    next: null
  }
} as const

// =============================================================================
// Prediction Results
// =============================================================================

export interface BayesianPrediction {
  source: 'bayesian'
  senderModelId: string
  predictedAction: AIActionType
  confidence: number
  reasoning: string
  factors: {
    responseRate: number
    archiveRate: number
    importanceScore: number
    timeDecay: number
  }
}

export interface CollaborativePrediction {
  source: 'collaborative'
  similarUserCount: number
  patternId?: string
  predictedAction: AIActionType
  confidence: number
  reasoning: string
}

export interface LLMPrediction {
  source: 'llm'
  model: string // e.g., 'gpt-4o-mini'
  predictedAction: AIActionType
  confidence: number
  reasoning: string

  // Extracted entities
  extractedEntities?: {
    dates: string[]
    amounts: string[]
    people: string[]
    tasks: string[]
    locations: string[]
  }

  // Classification results
  classification?: {
    category: EmailCategory
    intent: EmailIntent
    sentiment: 'positive' | 'neutral' | 'negative'
    topics: string[]
  }

  // Optional generated content
  suggestedDraft?: string
  summary?: string
}

export interface PredictionResult {
  /** Unique prediction ID */
  predictionId: string

  /** Email being predicted */
  emailId: string

  /** Thread ID if applicable */
  threadId?: string

  /** User this prediction is for */
  userId: string

  // --- Tier Predictions ---

  tier1Prediction?: BayesianPrediction
  tier2Prediction?: CollaborativePrediction
  tier3Prediction?: LLMPrediction

  // --- Ensemble Result ---

  finalPrediction: {
    action: AIActionType
    confidence: number
    reasoning: string
    requiresApproval: boolean
  }

  /** Weights used for ensemble */
  ensembleWeights: {
    tier1: number
    tier2: number
    tier3: number
  }

  /** ISO timestamp */
  timestamp: string

  /** Has user acted on this prediction? */
  isResolved: boolean

  /** User's response to prediction */
  userResponse?: 'approved' | 'rejected' | 'modified'
}

// =============================================================================
// Action Queue
// =============================================================================

export type ActionQueueStatus =
  | 'pending'    // Awaiting user review
  | 'approved'   // User approved, ready to execute
  | 'rejected'   // User rejected
  | 'executed'   // Action completed
  | 'failed'     // Execution failed
  | 'expired'    // Timed out waiting for review

export interface ActionQueueItem {
  /** Unique ID */
  id: string

  /** User ID */
  userId: string

  /** Email to act on */
  emailId: string

  /** Thread ID if applicable */
  threadId?: string

  /** Account ID */
  accountId: string

  /** Email subject for display */
  emailSubject: string

  /** Sender email for display */
  senderEmail: string

  /** The prediction that generated this item */
  prediction: PredictionResult

  /** Current status */
  status: ActionQueueStatus

  /** ISO timestamp created */
  createdAt: string

  /** ISO timestamp resolved */
  resolvedAt?: string

  /** ISO timestamp executed */
  executedAt?: string

  /** Error message if failed */
  errorMessage?: string

  /** User modification if any */
  modifiedAction?: AIActionType
}

// =============================================================================
// Email Classification (for OpenAI responses)
// =============================================================================

export interface EmailClassification {
  /** Primary category */
  category: EmailCategory

  /** User intent */
  intent: EmailIntent

  /** Sentiment */
  sentiment: 'positive' | 'neutral' | 'negative'

  /** Detected topics */
  topics: string[]

  /** Confidence 0-1 */
  confidence: number

  /** Is this likely spam? */
  isSpam: boolean

  /** Is this likely phishing? */
  isPhishing: boolean

  /** Urgency level */
  urgency: 'high' | 'medium' | 'low' | 'none'

  /** Requires response? */
  requiresResponse: boolean

  /** Has deadline? */
  hasDeadline: boolean

  /** Extracted deadline if any */
  deadline?: string
}

// =============================================================================
// Extracted Actions (from email content)
// =============================================================================

export interface ExtractedAction {
  /** Type of action found */
  type: 'meeting' | 'task' | 'deadline' | 'payment' | 'follow_up' | 'decision'

  /** Human-readable description */
  description: string

  /** Due date if applicable */
  dueDate?: string

  /** Priority level */
  priority: 'high' | 'medium' | 'low'

  /** People involved */
  assignees: string[]

  /** Confidence in extraction */
  confidence: number
}

// =============================================================================
// Summary Types
// =============================================================================

export type SummaryType =
  | 'email'   // Single email summary
  | 'thread'  // Thread/conversation summary
  | 'daily'   // Daily digest summary
  | 'sender'  // Sender relationship summary

export interface EmailSummary {
  /** Type of summary */
  type: SummaryType

  /** The summary text */
  content: string

  /** Key points as bullet list */
  keyPoints: string[]

  /** Detected action items */
  actionItems: string[]

  /** Model used */
  model: string

  /** Tokens used */
  tokensUsed: number

  /** ISO timestamp generated */
  generatedAt: string
}

// =============================================================================
// AI Service Configuration
// =============================================================================

export interface AIServiceConfig {
  /** OpenAI API key */
  apiKey: string

  /** Default model for classification */
  classificationModel: string

  /** Default model for summaries */
  summaryModel: string

  /** Default model for drafts */
  draftModel: string

  /** Maximum tokens for summaries */
  maxSummaryTokens: number

  /** Maximum tokens for drafts */
  maxDraftTokens: number

  /** Temperature for creative tasks */
  creativeTemperature: number

  /** Temperature for factual tasks */
  factualTemperature: number
}

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  apiKey: '', // Set from environment
  classificationModel: 'gpt-4o-mini',
  summaryModel: 'gpt-4o-mini',
  draftModel: 'gpt-4o',
  maxSummaryTokens: 500,
  maxDraftTokens: 1000,
  creativeTemperature: 0.7,
  factualTemperature: 0.3
}
