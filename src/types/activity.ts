/**
 * Activity Feed Type Definitions
 *
 * The Activity Feed is an immutable, searchable log of every email event
 * and system action. It serves as the foundation of user trust.
 *
 * Key features from Product Specification:
 * - Complete log of all actions with timestamp
 * - 30-day undo guarantee
 * - Searchable and filterable
 * - Supports bulk undo operations
 */

// =============================================================================
// Activity Event Types
// =============================================================================

export type ActivityEventType =
  // Email actions
  | 'email_read'
  | 'email_archived'
  | 'email_deleted'
  | 'email_starred'
  | 'email_unstarred'
  | 'email_replied'
  | 'email_forwarded'
  | 'email_moved'
  | 'email_labeled'
  | 'email_snoozed'
  | 'email_unsubscribed'
  // AI actions
  | 'ai_action_suggested'
  | 'ai_action_approved'
  | 'ai_action_rejected'
  | 'ai_action_modified'
  | 'ai_action_auto_executed'
  // Sync events
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  // Account events
  | 'account_linked'
  | 'account_unlinked'
  | 'account_synced'
  // Gamification events
  | 'inbox_zero_achieved'
  | 'streak_updated'
  | 'streak_broken'
  | 'streak_recovered'
  | 'achievement_unlocked'
  | 'milestone_reached'
  | 'freeze_token_earned'
  | 'freeze_token_used'
  | 'vacation_mode_activated'
  | 'vacation_mode_deactivated'
  // System events
  | 'settings_changed'
  | 'login'
  | 'logout'

// =============================================================================
// Activity Event
// =============================================================================

export interface ActivityEvent {
  /** Unique event ID */
  id: string

  /** Type of activity */
  type: ActivityEventType

  /** ISO timestamp when event occurred */
  timestamp: string

  /** User who performed or triggered the action */
  userId: string

  // --- Email Context (optional) ---

  /** Email ID if event relates to an email */
  emailId?: string

  /** Email subject for display */
  emailSubject?: string

  /** Sender email for display */
  senderEmail?: string

  /** Thread ID if applicable */
  threadId?: string

  // --- Account Context ---

  /** Which account the action was on */
  accountId?: string

  /** Account email for display */
  accountEmail?: string

  // --- AI Context (optional) ---

  /** AI prediction ID if this was an AI action */
  predictionId?: string

  /** AI confidence score */
  aiConfidence?: number

  /** Was this auto-executed by AI? */
  wasAutoExecuted?: boolean

  // --- Action Details ---

  /** Human-readable description of the action */
  description: string

  /** Category for filtering */
  category: ActivityCategory

  /** Icon to display */
  icon: string

  /** Color theme for the event */
  color: ActivityColor

  // --- Undo Support ---

  /** Can this action be undone? */
  isUndoable: boolean

  /** Has this action been undone? */
  isUndone: boolean

  /** ID of the undo event (if undone) */
  undoEventId?: string

  /** Deadline for undo (30 days from timestamp) */
  undoDeadline?: string

  /** Data needed to undo this action */
  undoData?: UndoData

  // --- Additional Metadata ---

  /** Additional context-specific data */
  metadata?: Record<string, unknown>
}

// =============================================================================
// Activity Categories (for filtering)
// =============================================================================

export type ActivityCategory =
  | 'email'        // Email actions (archive, delete, etc.)
  | 'ai'           // AI suggestions and actions
  | 'sync'         // Sync operations
  | 'account'      // Account management
  | 'gamification' // Streaks, achievements
  | 'system'       // Settings, login/logout

export type ActivityColor =
  | 'blue'    // Email actions
  | 'purple'  // AI actions
  | 'green'   // Success (inbox zero, achievements)
  | 'yellow'  // Warnings, pending
  | 'red'     // Errors, deletions
  | 'gray'    // System events

// =============================================================================
// Undo Support
// =============================================================================

export interface UndoData {
  /** Type of undo operation needed */
  undoType: 'restore_email' | 'unarchive' | 'unstar' | 'move_back' | 'remove_label'

  /** Original state to restore */
  originalState: {
    folderId?: string
    folderName?: string
    labels?: string[]
    isStarred?: boolean
    isRead?: boolean
    [key: string]: unknown
  }
}

export interface UndoOperation {
  /** Event ID to undo */
  eventId: string

  /** ISO timestamp of undo */
  undoTimestamp: string

  /** Was undo successful? */
  success: boolean

  /** Error message if failed */
  errorMessage?: string
}

// =============================================================================
// Activity Feed State
// =============================================================================

export interface ActivityFeedState {
  /** All activity events (most recent first) */
  events: ActivityEvent[]

  /** Is data loading? */
  isLoading: boolean

  /** Current filter */
  filter: ActivityFilter

  /** Search query */
  searchQuery: string

  /** Pagination */
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface ActivityFilter {
  /** Filter by event types */
  types?: ActivityEventType[]

  /** Filter by category */
  category?: ActivityCategory

  /** Filter by account */
  accountId?: string

  /** Filter by date range */
  dateRange?: {
    start: string // ISO date
    end: string   // ISO date
  }

  /** Show only undoable events */
  undoableOnly?: boolean

  /** Show only AI-related events */
  aiOnly?: boolean
}

// =============================================================================
// Activity Summary (for dashboard)
// =============================================================================

export interface ActivitySummary {
  /** Time period */
  period: 'today' | 'week' | 'month'

  /** Total events in period */
  totalEvents: number

  /** Breakdown by category */
  byCategory: Record<ActivityCategory, number>

  /** Most active hours */
  peakHours: Array<{ hour: number; count: number }>

  /** Recent undos */
  recentUndos: number

  /** AI auto-actions in period */
  aiAutoActions: number
}

// =============================================================================
// Activity Event Builders (helper types)
// =============================================================================

export interface CreateActivityEventInput {
  type: ActivityEventType
  userId: string
  description: string
  emailId?: string
  emailSubject?: string
  senderEmail?: string
  threadId?: string
  accountId?: string
  accountEmail?: string
  predictionId?: string
  aiConfidence?: number
  wasAutoExecuted?: boolean
  isUndoable?: boolean
  undoData?: UndoData
  metadata?: Record<string, unknown>
}

// Helper to determine category from event type
export function getActivityCategory(type: ActivityEventType): ActivityCategory {
  if (type.startsWith('email_')) return 'email'
  if (type.startsWith('ai_')) return 'ai'
  if (type.startsWith('sync_')) return 'sync'
  if (type.startsWith('account_')) return 'account'
  if (['inbox_zero_achieved', 'streak_updated', 'streak_broken', 'streak_recovered',
       'achievement_unlocked', 'milestone_reached', 'freeze_token_earned',
       'freeze_token_used', 'vacation_mode_activated', 'vacation_mode_deactivated'].includes(type)) {
    return 'gamification'
  }
  return 'system'
}

// Helper to determine color from event type
export function getActivityColor(type: ActivityEventType): ActivityColor {
  switch (type) {
    case 'email_deleted':
    case 'streak_broken':
    case 'sync_failed':
      return 'red'
    case 'ai_action_suggested':
    case 'ai_action_approved':
    case 'ai_action_auto_executed':
      return 'purple'
    case 'inbox_zero_achieved':
    case 'achievement_unlocked':
    case 'milestone_reached':
    case 'sync_completed':
      return 'green'
    case 'ai_action_rejected':
    case 'ai_action_modified':
    case 'streak_recovered':
      return 'yellow'
    case 'settings_changed':
    case 'login':
    case 'logout':
      return 'gray'
    default:
      return 'blue'
  }
}

// Helper to determine icon from event type
export function getActivityIcon(type: ActivityEventType): string {
  switch (type) {
    case 'email_read':
      return 'EnvelopeOpenIcon'
    case 'email_archived':
      return 'ArchiveBoxIcon'
    case 'email_deleted':
      return 'TrashIcon'
    case 'email_starred':
      return 'StarIcon'
    case 'email_unstarred':
      return 'StarIcon' // outline version in component
    case 'email_replied':
      return 'ArrowUturnLeftIcon'
    case 'email_forwarded':
      return 'ArrowUturnRightIcon'
    case 'email_moved':
      return 'FolderArrowDownIcon'
    case 'email_labeled':
      return 'TagIcon'
    case 'email_snoozed':
      return 'ClockIcon'
    case 'email_unsubscribed':
      return 'NoSymbolIcon'
    case 'ai_action_suggested':
    case 'ai_action_approved':
    case 'ai_action_rejected':
    case 'ai_action_modified':
    case 'ai_action_auto_executed':
      return 'SparklesIcon'
    case 'sync_started':
    case 'sync_completed':
    case 'sync_failed':
      return 'ArrowPathIcon'
    case 'account_linked':
    case 'account_unlinked':
    case 'account_synced':
      return 'LinkIcon'
    case 'inbox_zero_achieved':
      return 'CheckCircleIcon'
    case 'streak_updated':
    case 'streak_broken':
    case 'streak_recovered':
      return 'FireIcon'
    case 'achievement_unlocked':
    case 'milestone_reached':
      return 'TrophyIcon'
    case 'freeze_token_earned':
    case 'freeze_token_used':
      return 'ShieldCheckIcon'
    case 'vacation_mode_activated':
    case 'vacation_mode_deactivated':
      return 'SunIcon'
    case 'settings_changed':
      return 'Cog6ToothIcon'
    case 'login':
    case 'logout':
      return 'UserIcon'
    default:
      return 'InformationCircleIcon'
  }
}

// =============================================================================
// Exported Constants
// =============================================================================

export const ACTIVITY_CATEGORIES: Array<{ id: ActivityCategory; label: string; icon: string }> = [
  { id: 'email', label: 'Email Actions', icon: 'EnvelopeIcon' },
  { id: 'ai', label: 'AI Actions', icon: 'SparklesIcon' },
  { id: 'sync', label: 'Sync', icon: 'ArrowPathIcon' },
  { id: 'account', label: 'Accounts', icon: 'LinkIcon' },
  { id: 'gamification', label: 'Progress', icon: 'TrophyIcon' },
  { id: 'system', label: 'System', icon: 'Cog6ToothIcon' }
]

/** How long activities are retained (30 days for undo guarantee) */
export const ACTIVITY_RETENTION_DAYS = 30

/** Maximum events to keep in memory */
export const MAX_ACTIVITY_EVENTS = 1000

/** Page size for activity feed */
export const ACTIVITY_PAGE_SIZE = 50
