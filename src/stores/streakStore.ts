/**
 * Streak Store - Zustand store for Gamification
 *
 * Manages streak tracking, achievements, and celebration events.
 * Implements the streak rules from the BoxZero Product Specification.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  UserStreak,
  DailyStats,
  Achievement,
  CelebrationEvent,
  StreakMilestone,
  STREAK_MILESTONES,
  ACHIEVEMENTS,
  STREAK_RULES,
  StreakCheckResult,
  InboxZeroCheck,
  CelebrationEventType
} from '@/types/gamification'

// =============================================================================
// Store State Interface
// =============================================================================

interface StreakState {
  // Core Data
  streak: UserStreak | null
  dailyStats: Map<string, DailyStats> // Key: YYYY-MM-DD
  achievements: Achievement[]
  celebrationQueue: CelebrationEvent[]

  // Initialization
  initializeStreak: (userId: string, timezone?: string) => void

  // Streak Operations
  checkAndUpdateStreak: (inboxCheck: InboxZeroCheck) => StreakCheckResult
  recordInboxZero: () => void
  useFreezeToken: (forDate?: string) => boolean
  activateVacationMode: (endDate: string) => void
  deactivateVacationMode: () => void

  // Daily Stats
  recordDailyStats: (stats: Partial<DailyStats>) => void
  getDailyStats: (date: string) => DailyStats | undefined
  getTodayStats: () => DailyStats | undefined
  getWeekStats: () => DailyStats[]

  // Achievements
  checkAchievements: () => Achievement[]
  unlockAchievement: (achievementId: string) => boolean
  getUnlockedAchievements: () => Achievement[]
  getAchievementProgress: (achievementId: string) => number

  // Celebrations
  addCelebration: (event: Omit<CelebrationEvent, 'id' | 'timestamp' | 'dismissed'>) => void
  dismissCelebration: (id: string) => void
  getPendingCelebrations: () => CelebrationEvent[]

  // Computed Values
  getCurrentMilestone: () => StreakMilestone | null
  getNextMilestone: () => StreakMilestone | null
  getDaysToNextMilestone: () => number
  getStreakHealth: () => 'healthy' | 'at_risk' | 'broken'
  getInboxZeroProgress: (inboxCheck: InboxZeroCheck) => number

  // Utilities
  clearAllData: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getTodayDate(timezone: string): string {
  // Get today's date in user's timezone
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function getYesterdayDate(timezone: string): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function createDefaultStreak(userId: string, timezone: string): UserStreak {
  const now = new Date().toISOString()
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastInboxZeroDate: null,
    lastInboxZeroTimestamp: null,
    streakStartDate: null,
    timezone,
    freezeTokens: 0,
    freezeTokenHistory: [],
    vacationMode: {
      isActive: false,
      startDate: null,
      endDate: null,
      pausedStreak: 0
    },
    milestones: [],
    totalInboxZeroDays: 0,
    createdAt: now,
    updatedAt: now
  }
}

function createDefaultDailyStats(date: string, userId: string): DailyStats {
  const now = new Date().toISOString()
  return {
    date,
    userId,
    emailsReceived: 0,
    emailsProcessed: 0,
    emailsArchived: 0,
    emailsDeleted: 0,
    emailsReplied: 0,
    emailsStarred: 0,
    emailsSnoozed: 0,
    timeToZero: null,
    inboxZeroAchieved: false,
    inboxZeroTime: null,
    inboxZeroCount: 0,
    aiActionsApproved: 0,
    aiActionsCorrected: 0,
    aiActionsRejected: 0,
    aiSuggestionsTotal: 0,
    unsubscribes: 0,
    peakUnreadCount: 0,
    sessionCount: 0,
    totalTimeSpent: 0,
    createdAt: now,
    updatedAt: now
  }
}

function getMilestoneForStreak(streak: number): StreakMilestone | null {
  // Find the highest milestone the user has reached
  const reached = STREAK_MILESTONES.filter(m => streak >= m.days)
  return reached.length > 0 ? reached[reached.length - 1] : null
}

function getNextMilestoneForStreak(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days > streak) || null
}

// =============================================================================
// Zustand Store
// =============================================================================

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      // Initial state
      streak: null,
      dailyStats: new Map(),
      achievements: ACHIEVEMENTS.map(a => ({ ...a })), // Copy defaults
      celebrationQueue: [],

      // Initialize streak for user
      initializeStreak: (userId, timezone = 'America/New_York') => {
        const existing = get().streak
        if (!existing || existing.userId !== userId) {
          set({ streak: createDefaultStreak(userId, timezone) })
        }
      },

      // Check and update streak status
      checkAndUpdateStreak: (inboxCheck) => {
        const state = get()
        const streak = state.streak
        if (!streak) {
          return {
            status: 'broken',
            currentStreak: 0,
            freezeTokenUsed: false,
            inboxZeroToday: false
          }
        }

        const today = getTodayDate(streak.timezone)
        const yesterday = getYesterdayDate(streak.timezone)

        // Case 1: Already achieved inbox zero today
        if (streak.lastInboxZeroDate === today) {
          return {
            status: 'healthy',
            currentStreak: streak.currentStreak,
            freezeTokenUsed: false,
            inboxZeroToday: true
          }
        }

        // Case 2: Vacation mode active
        if (streak.vacationMode.isActive) {
          return {
            status: 'healthy',
            currentStreak: streak.vacationMode.pausedStreak,
            freezeTokenUsed: false,
            inboxZeroToday: false
          }
        }

        // Case 3: Check if yesterday was covered
        const yesterdayCovered = streak.lastInboxZeroDate === yesterday

        if (!yesterdayCovered && streak.currentStreak > 0) {
          // Check if we have a freeze token
          if (streak.freezeTokens > 0) {
            // Auto-use freeze token
            const token = {
              id: generateId(),
              userId: streak.userId,
              earnedAt: new Date().toISOString(),
              earnedAtStreak: streak.currentStreak,
              usedAt: new Date().toISOString(),
              usedForDate: yesterday
            }

            set({
              streak: {
                ...streak,
                freezeTokens: streak.freezeTokens - 1,
                freezeTokenHistory: [...streak.freezeTokenHistory, token],
                updatedAt: new Date().toISOString()
              }
            })

            return {
              status: 'healthy',
              currentStreak: streak.currentStreak,
              freezeTokenUsed: true,
              inboxZeroToday: false
            }
          }

          // Streak broken
          set({
            streak: {
              ...streak,
              currentStreak: 0,
              streakStartDate: null,
              updatedAt: new Date().toISOString()
            }
          })

          // Add celebration (sad one)
          state.addCelebration({
            type: 'streak_milestone',
            title: 'Streak Reset',
            subtitle: `Your ${streak.currentStreak}-day streak ended. Start fresh today!`,
            icon: '😢',
            metadata: { previousStreak: streak.currentStreak }
          })

          return {
            status: 'broken',
            currentStreak: 0,
            freezeTokenUsed: false,
            inboxZeroToday: false
          }
        }

        // Case 4: Check current inbox status
        if (inboxCheck.allAccountsAtZero) {
          state.recordInboxZero()
          return {
            status: 'healthy',
            currentStreak: get().streak?.currentStreak || 0,
            freezeTokenUsed: false,
            inboxZeroToday: true,
            newMilestone: getMilestoneForStreak(get().streak?.currentStreak || 0) || undefined
          }
        }

        // Case 5: At risk - need to achieve inbox zero today
        return {
          status: 'at_risk',
          currentStreak: streak.currentStreak,
          freezeTokenUsed: false,
          inboxZeroToday: false,
          hoursRemaining: 24 - new Date().getHours()
        }
      },

      // Record inbox zero achievement
      recordInboxZero: () => {
        const state = get()
        const streak = state.streak
        if (!streak) return

        const today = getTodayDate(streak.timezone)
        const now = new Date()
        const timeStr = now.toTimeString().substring(0, 5) // HH:MM

        // Already recorded today
        if (streak.lastInboxZeroDate === today) {
          // Just update the count
          const todayStats = state.dailyStats.get(today)
          if (todayStats) {
            const newStats = new Map(state.dailyStats)
            newStats.set(today, {
              ...todayStats,
              inboxZeroCount: todayStats.inboxZeroCount + 1,
              updatedAt: now.toISOString()
            })
            set({ dailyStats: newStats })
          }
          return
        }

        // New day - update streak
        const yesterday = getYesterdayDate(streak.timezone)
        const isConsecutive = streak.lastInboxZeroDate === yesterday || streak.currentStreak === 0

        const newStreak = isConsecutive ? streak.currentStreak + 1 : 1
        const newLongest = Math.max(streak.longestStreak, newStreak)

        // Check for new milestone
        const previousMilestone = getMilestoneForStreak(streak.currentStreak)
        const newMilestone = getMilestoneForStreak(newStreak)
        const earnedNewMilestone = newMilestone && newMilestone !== previousMilestone

        // Check for freeze token earned (every 30 days)
        const earnedFreezeToken =
          newStreak > 0 &&
          newStreak % STREAK_RULES.freezeTokenInterval === 0 &&
          streak.freezeTokens < STREAK_RULES.maxFreezeTokens

        const updatedStreak: UserStreak = {
          ...streak,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastInboxZeroDate: today,
          lastInboxZeroTimestamp: now.toISOString(),
          streakStartDate: streak.streakStartDate || today,
          freezeTokens: earnedFreezeToken ? streak.freezeTokens + 1 : streak.freezeTokens,
          totalInboxZeroDays: streak.totalInboxZeroDays + 1,
          milestones: earnedNewMilestone
            ? [
                ...streak.milestones,
                {
                  milestoneId: newMilestone!.id,
                  unlockedAt: now.toISOString(),
                  streakAtUnlock: newStreak
                }
              ]
            : streak.milestones,
          updatedAt: now.toISOString()
        }

        // Update daily stats
        const todayStats = state.dailyStats.get(today) || createDefaultDailyStats(today, streak.userId)
        const newDailyStats = new Map(state.dailyStats)
        newDailyStats.set(today, {
          ...todayStats,
          inboxZeroAchieved: true,
          inboxZeroTime: timeStr,
          inboxZeroCount: 1,
          updatedAt: now.toISOString()
        })

        set({
          streak: updatedStreak,
          dailyStats: newDailyStats
        })

        // Add celebrations
        if (earnedNewMilestone) {
          state.addCelebration({
            type: 'streak_milestone',
            title: `${newMilestone!.emoji} ${newMilestone!.label}!`,
            subtitle: newMilestone!.description,
            icon: newMilestone!.emoji,
            metadata: { milestone: newMilestone, streak: newStreak }
          })
        } else if (newStreak === 1) {
          state.addCelebration({
            type: 'inbox_zero',
            title: 'Inbox Zero!',
            subtitle: 'Great start! Keep it up tomorrow.',
            icon: '✅',
            metadata: { streak: newStreak }
          })
        }

        if (earnedFreezeToken) {
          state.addCelebration({
            type: 'freeze_token_earned',
            title: 'Freeze Token Earned!',
            subtitle: `You now have ${updatedStreak.freezeTokens} freeze token(s) to protect your streak.`,
            icon: '🛡️',
            metadata: { tokens: updatedStreak.freezeTokens }
          })
        }

        if (newStreak > streak.longestStreak) {
          state.addCelebration({
            type: 'personal_best',
            title: 'New Personal Best!',
            subtitle: `${newStreak} days is your longest streak ever!`,
            icon: '🏆',
            metadata: { previousBest: streak.longestStreak, newBest: newStreak }
          })
        }
      },

      // Use a freeze token
      useFreezeToken: (forDate) => {
        const streak = get().streak
        if (!streak || streak.freezeTokens <= 0) return false

        const date = forDate || getYesterdayDate(streak.timezone)
        const token = {
          id: generateId(),
          userId: streak.userId,
          earnedAt: new Date().toISOString(),
          earnedAtStreak: streak.currentStreak,
          usedAt: new Date().toISOString(),
          usedForDate: date
        }

        set({
          streak: {
            ...streak,
            freezeTokens: streak.freezeTokens - 1,
            freezeTokenHistory: [...streak.freezeTokenHistory, token],
            updatedAt: new Date().toISOString()
          }
        })

        return true
      },

      // Activate vacation mode
      activateVacationMode: (endDate) => {
        const streak = get().streak
        if (!streak) return

        set({
          streak: {
            ...streak,
            vacationMode: {
              isActive: true,
              startDate: new Date().toISOString(),
              endDate,
              pausedStreak: streak.currentStreak
            },
            updatedAt: new Date().toISOString()
          }
        })
      },

      // Deactivate vacation mode
      deactivateVacationMode: () => {
        const streak = get().streak
        if (!streak) return

        set({
          streak: {
            ...streak,
            vacationMode: {
              isActive: false,
              startDate: null,
              endDate: null,
              pausedStreak: 0
            },
            // Restore streak from paused value
            currentStreak: streak.vacationMode.pausedStreak,
            updatedAt: new Date().toISOString()
          }
        })
      },

      // Record daily stats
      recordDailyStats: (stats) => {
        const streak = get().streak
        if (!streak) return

        const today = getTodayDate(streak.timezone)
        const existing = get().dailyStats.get(today) || createDefaultDailyStats(today, streak.userId)

        const newStats = new Map(get().dailyStats)
        newStats.set(today, {
          ...existing,
          ...stats,
          updatedAt: new Date().toISOString()
        })

        set({ dailyStats: newStats })
      },

      // Get daily stats for a date
      getDailyStats: (date) => {
        return get().dailyStats.get(date)
      },

      // Get today's stats
      getTodayStats: () => {
        const streak = get().streak
        if (!streak) return undefined
        return get().dailyStats.get(getTodayDate(streak.timezone))
      },

      // Get this week's stats
      getWeekStats: () => {
        const streak = get().streak
        if (!streak) return []

        const stats: DailyStats[] = []
        const today = new Date()

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const dayStats = get().dailyStats.get(dateStr)
          if (dayStats) stats.push(dayStats)
        }

        return stats
      },

      // Check all achievements
      checkAchievements: () => {
        // TODO: Implement full achievement checking logic
        return get().achievements.filter(a => a.unlockedAt)
      },

      // Unlock an achievement
      unlockAchievement: (achievementId) => {
        const achievements = get().achievements
        const index = achievements.findIndex(a => a.id === achievementId)
        if (index === -1 || achievements[index].unlockedAt) return false

        const newAchievements = [...achievements]
        newAchievements[index] = {
          ...newAchievements[index],
          unlockedAt: new Date().toISOString(),
          progress: 100
        }

        set({ achievements: newAchievements })

        // Add celebration
        get().addCelebration({
          type: 'achievement_unlock',
          title: `${newAchievements[index].name} Unlocked!`,
          subtitle: newAchievements[index].description,
          icon: newAchievements[index].icon,
          metadata: { achievement: newAchievements[index] }
        })

        return true
      },

      // Get unlocked achievements
      getUnlockedAchievements: () => {
        return get().achievements.filter(a => a.unlockedAt)
      },

      // Get achievement progress
      getAchievementProgress: (achievementId) => {
        const achievement = get().achievements.find(a => a.id === achievementId)
        return achievement?.progress || 0
      },

      // Add a celebration event
      addCelebration: (event) => {
        const celebration: CelebrationEvent = {
          ...event,
          id: generateId(),
          timestamp: new Date().toISOString(),
          dismissed: false
        }

        set(state => ({
          celebrationQueue: [...state.celebrationQueue, celebration]
        }))
      },

      // Dismiss a celebration
      dismissCelebration: (id) => {
        set(state => ({
          celebrationQueue: state.celebrationQueue.map(c =>
            c.id === id ? { ...c, dismissed: true } : c
          )
        }))
      },

      // Get pending celebrations
      getPendingCelebrations: () => {
        return get().celebrationQueue.filter(c => !c.dismissed)
      },

      // Get current milestone
      getCurrentMilestone: () => {
        const streak = get().streak
        if (!streak) return null
        return getMilestoneForStreak(streak.currentStreak)
      },

      // Get next milestone
      getNextMilestone: () => {
        const streak = get().streak
        if (!streak) return STREAK_MILESTONES[0]
        return getNextMilestoneForStreak(streak.currentStreak)
      },

      // Get days to next milestone
      getDaysToNextMilestone: () => {
        const streak = get().streak
        const next = get().getNextMilestone()
        if (!streak || !next) return 0
        return next.days - streak.currentStreak
      },

      // Get streak health status
      getStreakHealth: () => {
        const streak = get().streak
        if (!streak) return 'broken'

        const today = getTodayDate(streak.timezone)
        const yesterday = getYesterdayDate(streak.timezone)

        if (streak.lastInboxZeroDate === today) return 'healthy'
        if (streak.vacationMode.isActive) return 'healthy'
        if (streak.lastInboxZeroDate === yesterday) return 'at_risk'
        if (streak.currentStreak === 0) return 'broken'

        return 'at_risk'
      },

      // Get inbox zero progress percentage
      getInboxZeroProgress: (inboxCheck) => {
        return inboxCheck.progressPercent
      },

      // Clear all data
      clearAllData: () => {
        set({
          streak: null,
          dailyStats: new Map(),
          achievements: ACHIEVEMENTS.map(a => ({ ...a })),
          celebrationQueue: []
        })
      }
    }),
    {
      name: 'boxzero-streak',
      version: 1,
      partialize: (state) => ({
        streak: state.streak,
        dailyStats: Array.from(state.dailyStats.entries()),
        achievements: state.achievements,
        celebrationQueue: state.celebrationQueue.filter(c => !c.dismissed)
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<StreakState> & { dailyStats?: [string, DailyStats][] }
        return {
          ...current,
          ...persistedState,
          dailyStats: new Map(persistedState.dailyStats || [])
        }
      }
    }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectStreak = (state: StreakState) => state.streak

export const selectCurrentStreak = (state: StreakState) =>
  state.streak?.currentStreak || 0

export const selectStreakHealth = (state: StreakState) =>
  state.getStreakHealth()

export const selectPendingCelebrations = (state: StreakState) =>
  state.getPendingCelebrations()

export const selectUnlockedAchievements = (state: StreakState) =>
  state.getUnlockedAchievements()
