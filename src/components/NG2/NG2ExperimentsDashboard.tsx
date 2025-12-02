'use client'

/**
 * NG2 Experiments Dashboard
 *
 * Admin dashboard for managing A/B tests with:
 * - Experiment list and status management
 * - Variant performance visualization
 * - Statistical significance indicators
 * - Event tracking analytics
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BeakerIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  useExperimentStore,
  useExperimentAnalytics,
  calculateSignificance,
  type Experiment,
  type ExperimentStatus,
  type ExperimentResults
} from '@/lib/experiments/ab-testing'

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const config = {
    draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
    running: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Running' },
    paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Paused' },
    completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Completed' }
  }

  const { bg, text, label } = config[status]

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

// =============================================================================
// Metric Card
// =============================================================================

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  icon: React.ElementType
  iconColor?: string
}

function MetricCard({ label, value, change, icon: Icon, iconColor = 'text-purple-400' }: MetricCardProps) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-700/50`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-white">{value}</p>
            {change !== undefined && change !== 0 && (
              <span className={`flex items-center text-xs ${
                change > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {change > 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3 mr-0.5" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Variant Comparison
// =============================================================================

interface VariantComparisonProps {
  experiment: Experiment
  results: ExperimentResults | null
}

function VariantComparison({ experiment, results }: VariantComparisonProps) {
  if (!results) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">No data collected yet</p>
      </div>
    )
  }

  const primaryMetric = experiment.metrics[0]
  const controlVariant = results.variantResults.find(v => v.variantId === 'control')
  const treatmentVariants = results.variantResults.filter(v => v.variantId !== 'control')

  return (
    <div className="space-y-4">
      {/* Variant bars */}
      <div className="space-y-3">
        {results.variantResults.map((variant, index) => {
          const maxParticipants = Math.max(...results.variantResults.map(v => v.participants))
          const width = maxParticipants > 0 ? (variant.participants / maxParticipants) * 100 : 0
          const isControl = variant.variantId === 'control'

          // Calculate conversion rate for primary metric
          const conversions = variant.conversions[primaryMetric?.name] || 0
          const conversionRate = variant.participants > 0
            ? ((conversions / variant.participants) * 100).toFixed(1)
            : '0.0'

          // Calculate significance vs control
          let significance = null
          if (!isControl && controlVariant && primaryMetric) {
            significance = calculateSignificance(
              controlVariant.conversions[primaryMetric.name] || 0,
              controlVariant.participants,
              conversions,
              variant.participants
            )
          }

          return (
            <div key={variant.variantId} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">
                    {variant.variantName}
                  </span>
                  {isControl && (
                    <span className="text-xs text-gray-500">(Control)</span>
                  )}
                  {significance?.isSignificant && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      significance.lift > 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {significance.lift > 0 ? '+' : ''}{significance.lift.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{variant.participants} users</span>
                  <span>{conversionRate}% conversion</span>
                </div>
              </div>

              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full rounded-full ${
                    isControl
                      ? 'bg-gray-500'
                      : significance?.isSignificant && significance.lift > 0
                        ? 'bg-green-500'
                        : 'bg-purple-500'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Statistical significance note */}
      {treatmentVariants.length > 0 && controlVariant && (
        <div className="p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-start gap-2">
            <ChartBarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="text-xs text-gray-400">
              <p className="font-medium text-gray-300 mb-1">Statistical Analysis</p>
              {treatmentVariants.map(variant => {
                const conversions = variant.conversions[primaryMetric?.name] || 0
                const sig = calculateSignificance(
                  controlVariant.conversions[primaryMetric?.name] || 0,
                  controlVariant.participants,
                  conversions,
                  variant.participants
                )

                return (
                  <p key={variant.variantId}>
                    {variant.variantName}:{' '}
                    {sig.isSignificant ? (
                      <span className={sig.lift > 0 ? 'text-green-400' : 'text-red-400'}>
                        Statistically significant (p {'<'} 0.05)
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        Not yet significant (p = {sig.pValue.toFixed(2)})
                      </span>
                    )}
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Experiment Card
// =============================================================================

interface ExperimentCardProps {
  experiment: Experiment
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (status: ExperimentStatus) => void
}

function ExperimentCard({ experiment, isExpanded, onToggle, onStatusChange }: ExperimentCardProps) {
  const { results, refresh } = useExperimentAnalytics(experiment.id)

  const totalParticipants = useMemo(() => {
    if (!results) return 0
    return results.variantResults.reduce((sum, v) => sum + v.participants, 0)
  }, [results])

  const totalEvents = useMemo(() => {
    if (!results) return 0
    return results.variantResults.reduce((sum, v) => {
      return sum + Object.values(v.events).reduce((s, n) => s + n, 0)
    }, 0)
  }, [results])

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BeakerIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">{experiment.name}</h3>
              <StatusBadge status={experiment.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{experiment.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3.5 h-3.5" />
              {totalParticipants} users
            </span>
            <span className="flex items-center gap-1">
              <CursorArrowRaysIcon className="w-3.5 h-3.5" />
              {totalEvents} events
            </span>
            <span>{experiment.variants.length} variants</span>
          </div>

          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t border-gray-700/50">
              {/* Actions */}
              <div className="flex items-center gap-2 py-3">
                {experiment.status === 'draft' && (
                  <button
                    onClick={() => onStatusChange('running')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Start Experiment
                  </button>
                )}
                {experiment.status === 'running' && (
                  <>
                    <button
                      onClick={() => onStatusChange('paused')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-sm rounded-lg hover:bg-yellow-500/30 transition-colors"
                    >
                      <PauseIcon className="w-4 h-4" />
                      Pause
                    </button>
                    <button
                      onClick={() => onStatusChange('completed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Complete
                    </button>
                  </>
                )}
                {experiment.status === 'paused' && (
                  <button
                    onClick={() => onStatusChange('running')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Resume
                  </button>
                )}
                <button
                  onClick={refresh}
                  className="px-3 py-1.5 text-gray-400 text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Refresh Data
                </button>
              </div>

              {/* Metrics summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <MetricCard
                  label="Participants"
                  value={totalParticipants}
                  icon={UsersIcon}
                  iconColor="text-blue-400"
                />
                <MetricCard
                  label="Total Events"
                  value={totalEvents}
                  icon={CursorArrowRaysIcon}
                  iconColor="text-green-400"
                />
                <MetricCard
                  label="Variants"
                  value={experiment.variants.length}
                  icon={BeakerIcon}
                  iconColor="text-purple-400"
                />
                <MetricCard
                  label="Duration"
                  value={experiment.startDate
                    ? `${Math.floor((Date.now() - experiment.startDate) / (1000 * 60 * 60 * 24))}d`
                    : 'N/A'
                  }
                  icon={ClockIcon}
                  iconColor="text-orange-400"
                />
              </div>

              {/* Variant comparison */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Variant Performance</h4>
                <VariantComparison experiment={experiment} results={results} />
              </div>

              {/* Metrics tracking */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Tracked Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {experiment.metrics.map(metric => (
                    <div
                      key={metric.name}
                      className="p-2 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{metric.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          metric.type === 'conversion' ? 'bg-green-500/20 text-green-400' :
                          metric.type === 'count' ? 'bg-blue-500/20 text-blue-400' :
                          metric.type === 'duration' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {metric.type}
                        </span>
                        {metric.goal && (
                          <span className="text-xs text-gray-500">
                            Goal: {metric.goal}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variant configs */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Variant Configurations</h4>
                <div className="space-y-2">
                  {experiment.variants.map(variant => (
                    <div
                      key={variant.id}
                      className="p-3 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {variant.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {variant.weight}% traffic
                        </span>
                      </div>
                      <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(variant.config, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Main Dashboard
// =============================================================================

interface ExperimentsDashboardProps {
  className?: string
}

export function ExperimentsDashboard({ className = '' }: ExperimentsDashboardProps) {
  const store = useExperimentStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ExperimentStatus>('all')

  const filteredExperiments = useMemo(() => {
    if (filter === 'all') return store.experiments
    return store.experiments.filter(e => e.status === filter)
  }, [store.experiments, filter])

  // Summary stats
  const stats = useMemo(() => {
    const running = store.experiments.filter(e => e.status === 'running').length
    const totalAssignments = store.assignments.length
    const totalEvents = store.events.length
    return { running, totalAssignments, totalEvents }
  }, [store.experiments, store.assignments, store.events])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">A/B Experiments</h2>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-white">{stats.running}</p>
            <p className="text-xs text-gray-400">Running</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-white">{stats.totalAssignments}</p>
            <p className="text-xs text-gray-400">Assigned Users</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
            <p className="text-xs text-gray-400">Events Tracked</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-3 border-b border-gray-700/50">
        {[
          { key: 'all', label: 'All' },
          { key: 'running', label: 'Running' },
          { key: 'paused', label: 'Paused' },
          { key: 'draft', label: 'Draft' },
          { key: 'completed', label: 'Completed' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === key
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Experiments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredExperiments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <BeakerIcon className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No experiments found</p>
          </div>
        ) : (
          filteredExperiments.map(experiment => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              isExpanded={expandedId === experiment.id}
              onToggle={() => setExpandedId(
                expandedId === experiment.id ? null : experiment.id
              )}
              onStatusChange={(status) => store.setExperimentStatus(experiment.id, status)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ExperimentsDashboard
