'use client'

/**
 * NG2 Auto Actions Component
 *
 * Trust-based automatic email actions with progressive autonomy.
 * Features:
 * - Trust level configuration
 * - Auto-action rules management
 * - Action history and statistics
 * - Undo capabilities
 * - Learning from user corrections
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  SparklesIcon,
  CogIcon,
  ShieldCheckIcon,
  BoltIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { TrustStage } from '@/types/ai'
import { useUndoStore } from '@/stores/undoStore'
import { processAutoActions } from '@/lib/ai/ensemble-predictor'
import { Email } from '@/types/email'
import { AIActionType } from '@/types/ai'
import { apiService } from '@/lib/api'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

interface NG2AutoActionsProps {
  emails: Email[]
  accountId: string
  userId: string
  onActionsCompleted?: (results: AutoActionResults) => void
  className?: string
}

interface AutoActionResults {
  autoExecuted: number
  queued: number
  errors: number
}

interface AutoActionRule {
  id: string
  name: string
  description: string
  action: AIActionType
  conditions: {
    senderPattern?: string
    subjectPattern?: string
    minConfidence: number
  }
  enabled: boolean
}

// =============================================================================
// Trust Level Configuration
// =============================================================================

const TRUST_CONFIG: Record<TrustStage, {
  label: string
  description: string
  color: string
  icon: React.ElementType
  autoThreshold: number
  maxAutoActions: number
}> = {
  training_wheels: {
    label: 'Training Wheels',
    description: 'All AI actions require your approval. Learning your preferences.',
    color: 'text-yellow-400',
    icon: ShieldCheckIcon,
    autoThreshold: 0.95, // Very high threshold - almost never auto-execute
    maxAutoActions: 0
  },
  building_confidence: {
    label: 'Building Confidence',
    description: 'High-confidence actions can be auto-executed. Learning patterns.',
    color: 'text-blue-400',
    icon: AdjustmentsHorizontalIcon,
    autoThreshold: 0.85,
    maxAutoActions: 10
  },
  earned_autonomy: {
    label: 'Earned Autonomy',
    description: 'AI confidently handles routine emails. You review only important ones.',
    color: 'text-green-400',
    icon: BoltIcon,
    autoThreshold: 0.75,
    maxAutoActions: 50
  }
}

// =============================================================================
// Default Rules
// =============================================================================

const DEFAULT_RULES: AutoActionRule[] = [
  {
    id: 'newsletter-archive',
    name: 'Archive Newsletters',
    description: 'Auto-archive newsletter emails after reading',
    action: 'archive',
    conditions: {
      subjectPattern: 'newsletter|digest|weekly|monthly update',
      minConfidence: 0.8
    },
    enabled: true
  },
  {
    id: 'promotional-archive',
    name: 'Archive Promotions',
    description: 'Auto-archive promotional emails',
    action: 'archive',
    conditions: {
      subjectPattern: 'sale|discount|offer|deal|promo',
      minConfidence: 0.85
    },
    enabled: true
  },
  {
    id: 'noreply-archive',
    name: 'Archive No-Reply',
    description: 'Auto-archive emails from no-reply addresses',
    action: 'archive',
    conditions: {
      senderPattern: 'noreply|no-reply|donotreply',
      minConfidence: 0.7
    },
    enabled: true
  }
]

// =============================================================================
// Component
// =============================================================================

export function NG2AutoActions({
  emails,
  accountId,
  userId,
  onActionsCompleted,
  className = ''
}: NG2AutoActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rules, setRules] = useState<AutoActionRule[]>(DEFAULT_RULES)
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 })

  // Stores
  const trustProfile = useBehaviorStore((state) => state.trustProfile)
  const updateTrustFromAction = useBehaviorStore((state) => state.updateTrustFromAction)
  const pushUndoAction = useUndoStore((state) => state.pushAction)

  // Get trust configuration
  const trustConfig = trustProfile?.trustStage
    ? TRUST_CONFIG[trustProfile.trustStage]
    : TRUST_CONFIG.training_wheels

  // Execute email action
  const executeAction = useCallback(async (emailId: string, action: AIActionType) => {
    const email = emails.find((e) => e.id === emailId)
    if (!email) return

    try {
      switch (action) {
        case 'archive':
          await apiService.archiveEmail(emailId)
          pushUndoAction({
            type: 'archive',
            emailId,
            accountId,
            description: `Archived: ${email.subject?.substring(0, 30)}...`,
            undoData: { originalFolder: 'INBOX' },
            userId
          })
          break
        case 'delete':
          await apiService.deleteEmail(emailId)
          pushUndoAction({
            type: 'delete',
            emailId,
            accountId,
            description: `Deleted: ${email.subject?.substring(0, 30)}...`,
            undoData: { originalFolder: 'INBOX' },
            userId
          })
          break
        case 'star':
          await apiService.markEmailAsStarred(emailId, true)
          break
        case 'unsubscribe':
          // Mark as spam/unsubscribe
          await apiService.archiveEmail(emailId)
          break
        default:
          // 'keep' - do nothing
          break
      }
    } catch (error) {
      console.error('[AutoActions] Failed to execute action:', error)
      throw error
    }
  }, [emails, accountId, userId, pushUndoAction])

  // Process auto-actions
  const handleProcessAutoActions = useCallback(async () => {
    if (isProcessing || !emails.length) return

    setIsProcessing(true)

    try {
      const result = await processAutoActions(emails, userId, executeAction)

      // Update stats
      setStats((prev) => ({
        today: prev.today + result.autoExecuted,
        week: prev.week + result.autoExecuted,
        total: prev.total + result.autoExecuted
      }))

      // Update trust based on actions
      if (result.autoExecuted > 0) {
        updateTrustFromAction('approved')
      }

      // Notify parent
      onActionsCompleted?.({
        autoExecuted: result.autoExecuted,
        queued: result.queued.length,
        errors: 0
      })

      if (result.autoExecuted > 0) {
        toast.success(`Auto-processed ${result.autoExecuted} email${result.autoExecuted > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('[AutoActions] Processing failed:', error)
      toast.error('Failed to process auto-actions')
    } finally {
      setIsProcessing(false)
    }
  }, [emails, userId, executeAction, updateTrustFromAction, onActionsCompleted, isProcessing])

  // Toggle rule
  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    )
  }

  // Trust stage badge color
  const getStageBadgeClass = (stage: TrustStage) => {
    switch (stage) {
      case 'training_wheels':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
      case 'building_confidence':
        return 'bg-blue-900/50 text-blue-300 border-blue-700'
      case 'earned_autonomy':
        return 'bg-green-900/50 text-green-300 border-green-700'
    }
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/50 rounded-lg">
            <BoltIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Auto Actions</h3>
            <p className="text-xs text-gray-400">
              {trustConfig.label} • {stats.today} today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Trust Badge */}
          <span className={`px-2 py-1 text-xs rounded-full border ${getStageBadgeClass(trustProfile?.trustStage || 'training_wheels')}`}>
            {trustConfig.label}
          </span>

          {/* Process Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleProcessAutoActions()
            }}
            disabled={isProcessing || trustProfile?.trustStage === 'training_wheels'}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isProcessing ? (
              <ArrowPathIcon className="w-3 h-3 animate-spin" />
            ) : (
              <SparklesIcon className="w-3 h-3" />
            )}
            Process
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Trust Level Info */}
          <div className="p-4 bg-gray-900/50">
            <div className="flex items-start gap-3">
              <trustConfig.icon className={`w-5 h-5 ${trustConfig.color} mt-0.5`} />
              <div>
                <p className="text-sm text-gray-200">{trustConfig.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Threshold: {Math.round(trustConfig.autoThreshold * 100)}%</span>
                  <span>Max auto: {trustConfig.maxAutoActions}/batch</span>
                  {trustProfile && (
                    <span>
                      Score: {Math.round((trustProfile.trustScore || 0) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-gray-700">
            <div className="p-3 bg-gray-800 text-center">
              <p className="text-lg font-semibold text-white">{stats.today}</p>
              <p className="text-xs text-gray-400">Today</p>
            </div>
            <div className="p-3 bg-gray-800 text-center">
              <p className="text-lg font-semibold text-white">{stats.week}</p>
              <p className="text-xs text-gray-400">This Week</p>
            </div>
            <div className="p-3 bg-gray-800 text-center">
              <p className="text-lg font-semibold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">All Time</p>
            </div>
          </div>

          {/* Rules */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Auto-Action Rules</h4>
              <button className="text-xs text-purple-400 hover:text-purple-300">
                + Add Rule
              </button>
            </div>

            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    rule.enabled
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-gray-800/50 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-8 h-5 rounded-full transition-colors ${
                        rule.enabled ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform ${
                          rule.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm text-white">{rule.name}</p>
                      <p className="text-xs text-gray-400">{rule.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                      {rule.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(rule.conditions.minConfidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Progression */}
          <div className="p-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-white mb-3">Trust Progression</h4>
            <div className="relative">
              {/* Progress Bar */}
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 via-blue-500 to-green-500 transition-all duration-500"
                  style={{
                    width: `${
                      trustProfile?.trustStage === 'training_wheels'
                        ? 15
                        : trustProfile?.trustStage === 'building_confidence'
                        ? 50
                        : 85
                    }%`
                  }}
                />
              </div>

              {/* Stage Markers */}
              <div className="flex justify-between mt-2">
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto ${
                      trustProfile?.trustStage === 'training_wheels'
                        ? 'bg-yellow-400'
                        : 'bg-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Training</p>
                </div>
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto ${
                      trustProfile?.trustStage === 'building_confidence'
                        ? 'bg-blue-400'
                        : 'bg-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Building</p>
                </div>
                <div className="text-center">
                  <div
                    className={`w-3 h-3 rounded-full mx-auto ${
                      trustProfile?.trustStage === 'earned_autonomy'
                        ? 'bg-green-400'
                        : 'bg-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Autonomy</p>
                </div>
              </div>
            </div>

            {/* Progress Info */}
            {trustProfile && trustProfile.trustStage !== 'earned_autonomy' && (
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-xs text-gray-300">
                    <p className="font-medium">How to progress:</p>
                    <ul className="mt-1 space-y-1 text-gray-400">
                      <li>• Review and approve AI suggestions</li>
                      <li>• Correct any mistakes (AI learns from corrections)</li>
                      <li>• Consistent usage builds trust over time</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NG2AutoActions
