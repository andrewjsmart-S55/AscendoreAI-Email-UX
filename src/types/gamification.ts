/**
 * Gamification System Type Definitions
 *
 * Implements the streak system, achievements, and dashboard metrics
 * from the BoxZero Product Specification.
 *
 * Key features:
 * - Streak tracking with freeze tokens and vacation mode
 * - Achievement system with badges and milestones
 * - Daily/weekly/monthly statistics
 * - Celebration events for user engagement
 */

// =============================================================================
// Streak System
// =============================================================================

export type StreakMilestoneId =
  | 'seedling'   // 7 days
  | 'growing'    // 14 days
  | 'rooted'     // 30 days
  | 'star'       // 60 days
  | 'champion'   // 90 days
  | 'diamond'    // 180 days
  | 'legend'     // 365 days

export interface StreakMilestone {
  id: StreakMilestoneId
  days: number
  label: string
  emoji: string
  color: string
  description: string
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { id: 'seedling', days: 7, label: 'First Week', emoji: '🌱', color: '#10B981', description: 'Completed your first week of inbox zero!' },
  { id: 'growing', days: 14, label: 'Two Weeks', emoji: '🌿', color: '#059669', description: 'Two weeks strong! Building great habits.' },
  { id: 'rooted', days: 30, label: 'One Month', emoji: '🌳', color: '#047857', description: 'One month rooted! You\'ve earned a freeze token.' },
  { id: 'star', days: 60, label: 'Two Months', emoji: '⭐', color: '#F59E0B', description: 'Star performer! Two months of inbox mastery.' },
  { id: 'champion', days: 90, label: 'Quarter', emoji: '🏆', color: '#D97706', description: 'Quarter champion! 90 days of email excellence.' },
  { id: 'diamond', days: 180, label: 'Half Year', emoji: '💎', color: '#3B82F6', description: 'Diamond status! Six months of inbox zero.' },
  { id: 'legend', days: 365, label: 'One Year', emoji: '🏅', color: '#7C3AED', description: 'LEGEND! A full year of inbox zero!' }
]

export interface VacationMode {
  /** Is vacation mode currently active? */
  isActive: boolean

  /** ISO date vacation started */
  startDate: string | null

  /** ISO date vacation ends */
  endDate: string | null

  /** Streak value when vacation was activated */
  pausedStreak: number
}

export interface UnlockedMilestone {
  /** Which milestone was unlocked */
  milestoneId: StreakMilestoneId

  /** ISO timestamp when unlocked */
  unlockedAt: string

  /** Streak count when unlocked */
  streakAtUnlock: number
}

export interface FreezeToken {
  /** Unique token ID */
  id: string

  /** User ID */
  userId: string

  /** ISO timestamp when earned */
  earnedAt: string

  /** Streak milestone that earned this token (e.g., 30, 60, 90) */
  earnedAtStreak: number

  /** ISO timestamp when used (null if unused) */
  usedAt: string | null

  /** Which date the token protected */
  usedForDate: string | null
}

export interface UserStreak {
  /** User ID */
  userId: string

  /** Current consecutive days of inbox zero */
  currentStreak: number

  /** Longest streak ever achieved */
  longestStreak: number

  /** ISO date of last inbox zero (YYYY-MM-DD) */
  lastInboxZeroDate: string | null

  /** Full ISO timestamp of last inbox zero */
  lastInboxZeroTimestamp: string | null

  /** ISO date when current streak started */
  streakStartDate: string | null

  /** User's timezone (e.g., 'America/New_York') */
  timezone: string

  /** Available freeze tokens (max 3) */
  freezeTokens: number

  /** Freeze token history */
  freezeTokenHistory: FreezeToken[]

  /** Vacation mode settings */
  vacationMode: VacationMode

  /** Unlocked milestone badges */
  milestones: UnlockedMilestone[]

  /** Total lifetime inbox zero days */
  totalInboxZeroDays: number

  /** ISO timestamp created */
  createdAt: string

  /** ISO timestamp last updated */
  updatedAt: string
}

// Streak rules from product spec
export const STREAK_RULES = {
  /** Maximum freeze tokens user can hold */
  maxFreezeTokens: 3,

  /** Days between earning freeze tokens (every 30-day milestone) */
  freezeTokenInterval: 30,

  /** Maximum items in approve queue before streak breaks */
  maxQueueItemsForStreak: 10,

  /** Grace period in hours after midnight to achieve inbox zero */
  gracePeriodHours: 0 // No grace period - must be same calendar day
} as const

// =============================================================================
// Achievement System
// =============================================================================

export type AchievementId =
  | 'speed_demon'
  | 'clean_sweep'
  | 'ai_whisperer'
  | 'unsubscribe_hero'
  | 'everest'
  | 'early_bird'
  | 'night_owl'
  | 'zen_master'
  | 'social_butterfly'
  | 'inbox_zero_first'
  | 'week_warrior'
  | 'month_master'
  | 'efficiency_expert'
  | 'quick_responder'

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface AchievementCriteria {
  /** Type of criteria to check */
  type: 'streak' | 'time' | 'volume' | 'ai' | 'action' | 'composite'

  /** Target value to achieve */
  target: number

  /** Timeframe for the achievement */
  timeframe?: 'day' | 'week' | 'month' | 'all_time'

  /** Additional conditions */
  conditions?: Record<string, unknown>
}

export interface Achievement {
  /** Unique achievement ID */
  id: AchievementId

  /** Display name */
  name: string

  /** Description of how to earn */
  description: string

  /** Icon name (from icon library) */
  icon: string

  /** Rarity tier */
  rarity: AchievementRarity

  /** Criteria to unlock */
  criteria: AchievementCriteria

  /** ISO timestamp when unlocked (undefined if locked) */
  unlockedAt?: string

  /** Progress percentage 0-100 (for progressive achievements) */
  progress?: number

  /** Current value toward target */
  currentValue?: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'inbox_zero_first',
    name: 'First Zero',
    description: 'Achieve inbox zero for the first time',
    icon: 'CheckCircleIcon',
    rarity: 'common',
    criteria: { type: 'streak', target: 1, timeframe: 'all_time' }
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach inbox zero in under 10 minutes for 7 consecutive days',
    icon: 'BoltIcon',
    rarity: 'rare',
    criteria: {
      type: 'composite',
      target: 7,
      timeframe: 'day',
      conditions: { maxTimeToZero: 10, consecutiveDays: true }
    }
  },
  {
    id: 'clean_sweep',
    name: 'Clean Sweep',
    description: 'Achieve 100% inbox zero rate for 1 week',
    icon: 'SparklesIcon',
    rarity: 'rare',
    criteria: {
      type: 'streak',
      target: 7,
      timeframe: 'week',
      conditions: { perfectWeek: true }
    }
  },
  {
    id: 'ai_whisperer',
    name: 'AI Whisperer',
    description: 'Accept AI suggestions without corrections for 14 consecutive days',
    icon: 'CpuChipIcon',
    rarity: 'epic',
    criteria: {
      type: 'ai',
      target: 14,
      timeframe: 'day',
      conditions: { noCorrectionStreak: true }
    }
  },
  {
    id: 'unsubscribe_hero',
    name: 'Unsubscribe Hero',
    description: 'Remove 20+ unwanted subscriptions',
    icon: 'NoSymbolIcon',
    rarity: 'common',
    criteria: {
      type: 'action',
      target: 20,
      timeframe: 'all_time',
      conditions: { actionType: 'unsubscribe' }
    }
  },
  {
    id: 'everest',
    name: 'Everest',
    description: 'Process 10,000 emails total',
    icon: 'FlagIcon',
    rarity: 'legendary',
    criteria: { type: 'volume', target: 10000, timeframe: 'all_time' }
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Achieve inbox zero before 8 AM for 5 consecutive days',
    icon: 'SunIcon',
    rarity: 'rare',
    criteria: {
      type: 'time',
      target: 5,
      timeframe: 'day',
      conditions: { beforeHour: 8, consecutiveDays: true }
    }
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Achieve inbox zero after 10 PM for 5 consecutive days',
    icon: 'MoonIcon',
    rarity: 'rare',
    criteria: {
      type: 'time',
      target: 5,
      timeframe: 'day',
      conditions: { afterHour: 22, consecutiveDays: true }
    }
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    description: 'Maintain inbox zero for an entire week without checking email more than once per day',
    icon: 'SparklesIcon',
    rarity: 'epic',
    criteria: {
      type: 'composite',
      target: 7,
      timeframe: 'week',
      conditions: { maxSessionsPerDay: 1, perfectWeek: true }
    }
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete a full week streak',
    icon: 'CalendarIcon',
    rarity: 'common',
    criteria: { type: 'streak', target: 7, timeframe: 'all_time' }
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Complete a full month streak',
    icon: 'CalendarDaysIcon',
    rarity: 'rare',
    criteria: { type: 'streak', target: 30, timeframe: 'all_time' }
  },
  {
    id: 'efficiency_expert',
    name: 'Efficiency Expert',
    description: 'Have 90%+ AI accuracy for 30 days',
    icon: 'ChartBarIcon',
    rarity: 'epic',
    criteria: {
      type: 'ai',
      target: 30,
      timeframe: 'day',
      conditions: { minAccuracy: 90, consecutiveDays: true }
    }
  },
  {
    id: 'quick_responder',
    name: 'Quick Responder',
    description: 'Respond to 50 emails within 1 hour of receiving them',
    icon: 'ClockIcon',
    rarity: 'rare',
    criteria: {
      type: 'action',
      target: 50,
      timeframe: 'all_time',
      conditions: { actionType: 'respond', maxResponseMinutes: 60 }
    }
  }
]

// =============================================================================
// Daily Statistics
// =============================================================================

export interface DailyStats {
  /** Date in YYYY-MM-DD format */
  date: string

  /** User ID */
  userId: string

  /** Optional account ID for per-account stats */
  accountId?: string

  // --- Email Volume ---

  /** Emails received today */
  emailsReceived: number

  /** Emails processed (any action taken) */
  emailsProcessed: number

  /** Emails archived */
  emailsArchived: number

  /** Emails deleted */
  emailsDeleted: number

  /** Emails replied to */
  emailsReplied: number

  /** Emails starred */
  emailsStarred: number

  /** Emails snoozed */
  emailsSnoozed: number

  // --- Inbox Zero ---

  /** Minutes to reach inbox zero (null if not achieved) */
  timeToZero: number | null

  /** Did user achieve inbox zero today? */
  inboxZeroAchieved: boolean

  /** Time of day inbox zero was achieved (HH:MM) */
  inboxZeroTime: string | null

  /** Number of times inbox zero was achieved today */
  inboxZeroCount: number

  // --- AI Performance ---

  /** AI actions approved without modification */
  aiActionsApproved: number

  /** AI actions user corrected/modified */
  aiActionsCorrected: number

  /** AI actions user rejected */
  aiActionsRejected: number

  /** Total AI suggestions shown */
  aiSuggestionsTotal: number

  // --- Other Metrics ---

  /** Number of unsubscribes */
  unsubscribes: number

  /** Peak unread count for the day */
  peakUnreadCount: number

  /** Number of email sessions (periods of activity) */
  sessionCount: number

  /** Total time spent on email (minutes) */
  totalTimeSpent: number

  /** ISO timestamp created */
  createdAt: string

  /** ISO timestamp updated */
  updatedAt: string
}

// =============================================================================
// Period Statistics (Weekly/Monthly)
// =============================================================================

export interface SenderStats {
  /** Sender email */
  email: string

  /** Sender display name */
  name: string

  /** Number of emails from this sender */
  emailCount: number

  /** Average response time in hours (null if never responded) */
  avgResponseTime: number | null

  /** Is this sender a VIP? */
  isVIP: boolean

  /** Most common action for this sender */
  commonAction: 'respond' | 'archive' | 'delete' | 'ignore'
}

export interface CategoryStats {
  /** Email category */
  category: string

  /** Number of emails in this category */
  count: number

  /** Percentage of total emails */
  percentOfTotal: number

  /** Average time to process (minutes) */
  avgTimeToProcess: number

  /** Auto-handle rate for this category */
  autoHandleRate: number
}

export interface AIPerformanceStats {
  /** Total AI suggestions made */
  totalSuggestions: number

  /** Accepted without editing */
  acceptedWithoutEdit: number

  /** Accepted after user edit */
  acceptedWithEdit: number

  /** Rejected by user */
  rejected: number

  /** Overall accuracy rate (0-100) */
  accuracyRate: number

  /** Auto-handle rate (0-100) */
  autoHandleRate: number
}

export interface ResponseMetrics {
  /** Average response time in hours */
  avgResponseTime: number

  /** Median response time in hours */
  medianResponseTime: number

  /** Response rate (percentage of emails responded to) */
  responseRate: number

  /** SLA compliance (percentage within user-defined SLA) */
  slaCompliance: number

  /** Number of pending responses */
  pendingResponses: number
}

export interface PeriodStats {
  /** Start date of period */
  startDate: string

  /** End date of period */
  endDate: string

  /** User ID */
  userId: string

  // --- Summary Metrics ---

  /** Average minutes to inbox zero */
  avgTimeToZero: number | null

  /** Total emails processed in period */
  totalEmailsProcessed: number

  /** Total emails received in period */
  totalEmailsReceived: number

  /** Days inbox zero was achieved */
  inboxZeroDays: number

  /** Total days in period */
  totalDays: number

  /** Inbox zero rate (0-100) */
  inboxZeroRate: number

  // --- Breakdowns ---

  /** Top senders by volume */
  topSenders: SenderStats[]

  /** Email distribution by category */
  categoryBreakdown: CategoryStats[]

  /** AI performance metrics */
  aiPerformance: AIPerformanceStats

  /** Response time metrics */
  responseMetrics: ResponseMetrics

  // --- Trends ---

  /** Daily email volume trend */
  volumeTrend: Array<{ date: string; received: number; processed: number }>

  /** Daily time spent trend */
  timeTrend: Array<{ date: string; minutes: number }>
}

// =============================================================================
// Celebration Events
// =============================================================================

export type CelebrationEventType =
  | 'streak_milestone'
  | 'achievement_unlock'
  | 'inbox_zero'
  | 'personal_best'
  | 'freeze_token_earned'
  | 'level_up'

export interface CelebrationEvent {
  /** Unique event ID */
  id: string

  /** Type of celebration */
  type: CelebrationEventType

  /** Main title */
  title: string

  /** Subtitle/description */
  subtitle: string

  /** Icon or emoji */
  icon: string

  /** ISO timestamp */
  timestamp: string

  /** Additional data (achievement info, streak count, etc.) */
  metadata: Record<string, unknown>

  /** Has user dismissed this celebration? */
  dismissed: boolean
}

// =============================================================================
// Gamification State (for context/store)
// =============================================================================

export interface GamificationState {
  /** User streak data */
  streak: UserStreak | null

  /** Today's statistics */
  todayStats: DailyStats | null

  /** Current week statistics */
  weekStats: PeriodStats | null

  /** All achievements */
  achievements: Achievement[]

  /** Pending celebration events */
  pendingCelebrations: CelebrationEvent[]

  /** Is data loading? */
  isLoading: boolean

  /** Loading error if any */
  error: string | null
}

// =============================================================================
// Helper Functions (types for utilities)
// =============================================================================

export interface StreakCheckResult {
  /** Current streak status */
  status: 'healthy' | 'at_risk' | 'broken'

  /** Current streak count */
  currentStreak: number

  /** Was a freeze token used? */
  freezeTokenUsed: boolean

  /** Did user achieve inbox zero today? */
  inboxZeroToday: boolean

  /** Hours remaining to maintain streak (if at risk) */
  hoursRemaining?: number

  /** New milestone reached (if any) */
  newMilestone?: StreakMilestone

  /** Freeze token earned (if any) */
  freezeTokenEarned?: boolean
}

export interface InboxZeroCheck {
  /** Are all accounts at inbox zero? */
  allAccountsAtZero: boolean

  /** Per-account status */
  accountStatus: Array<{
    accountId: string
    accountEmail: string
    unreadCount: number
    snoozedCount: number
    isAtZero: boolean
  }>

  /** Total unread across all accounts */
  totalUnread: number

  /** Progress percentage toward zero */
  progressPercent: number
}
