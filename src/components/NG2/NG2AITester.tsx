'use client'

/**
 * NG2 AI Tester - End-to-End AI Prediction Testing Component
 *
 * Tests the complete AI prediction pipeline:
 * - Bayesian Predictor (Tier 1)
 * - Ensemble Predictor (Bayesian + LLM)
 * - Behavior Store & Sender Models
 * - Action Queue Integration
 * - Trust Profile Progression
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  BeakerIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Email } from '@/types/email'
import { SenderModel, PredictionResult, AIActionType, TrustStage } from '@/types/ai'
import { bayesianPredictor, BAYESIAN_CONFIG } from '@/lib/ai/bayesian-predictor'
import { ensemblePredictor, DEFAULT_ENSEMBLE_CONFIG } from '@/lib/ai/ensemble-predictor'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { useActionQueueStore } from '@/components/NG2/NG2ActionQueue'
import { useAIPredictions } from '@/hooks/useAIPredictions'

// =============================================================================
// Test Data
// =============================================================================

const MOCK_EMAILS: Email[] = [
  {
    id: 'test-email-1',
    messageId: 'msg-test-email-1',
    threadId: 'thread-1',
    from: 'newsletter@marketing.example.com',
    to: ['user@example.com'],
    subject: 'Weekly Newsletter: Top Stories',
    body: 'Check out our latest stories...',
    receivedAt: new Date().toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['INBOX'],
    folder: 'inbox',
    attachments: [],
    accountId: 'test-account'
  },
  {
    id: 'test-email-2',
    messageId: 'msg-test-email-2',
    threadId: 'thread-2',
    from: 'boss@company.com',
    to: ['user@example.com'],
    subject: 'URGENT: Project deadline today',
    body: 'Please submit the report by EOD...',
    receivedAt: new Date().toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['INBOX'],
    folder: 'inbox',
    attachments: [],
    accountId: 'test-account'
  },
  {
    id: 'test-email-3',
    messageId: 'msg-test-email-3',
    threadId: 'thread-3',
    from: 'colleague@company.com',
    to: ['user@example.com'],
    subject: 'Meeting tomorrow at 10am',
    body: 'Lets discuss the project updates...',
    receivedAt: new Date().toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['INBOX'],
    folder: 'inbox',
    attachments: [],
    accountId: 'test-account'
  },
  {
    id: 'test-email-4',
    messageId: 'msg-test-email-4',
    threadId: 'thread-4',
    from: 'noreply@notifications.social.com',
    to: ['user@example.com'],
    subject: 'You have new followers!',
    body: '5 people followed you...',
    receivedAt: new Date().toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['INBOX'],
    folder: 'inbox',
    attachments: [],
    accountId: 'test-account'
  },
  {
    id: 'test-email-5',
    messageId: 'msg-test-email-5',
    threadId: 'thread-5',
    from: 'vip@important-client.com',
    to: ['user@example.com'],
    subject: 'Contract renewal discussion',
    body: 'Would like to discuss extending our contract...',
    receivedAt: new Date().toISOString(),
    isRead: false,
    isStarred: false,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['INBOX'],
    folder: 'inbox',
    attachments: [],
    accountId: 'test-account'
  }
]

// Create mock sender models with varying behavior patterns
const MOCK_SENDER_MODELS: Map<string, SenderModel> = new Map([
  [
    'sender_newsletter_marketing_example_com',
    {
      senderId: 'sender_newsletter_marketing_example_com',
      senderEmail: 'newsletter@marketing.example.com',
      senderDomain: 'marketing.example.com',
      totalEmails: 50,
      respondedEmails: 2,
      archivedEmails: 45,
      deletedEmails: 3,
      starredEmails: 0,
      ignoredEmails: 0,
      avgReadTimeSeconds: 5,
      avgResponseTimeSeconds: 0,
      responseRate: 0.04,
      archiveRate: 0.9,
      deleteRate: 0.06,
      importanceScore: 0.1,
      urgencyScore: 0.05,
      firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastInteraction: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      decayedWeight: 0.8,
      lastUpdated: new Date().toISOString(),
      userId: 'test-user',
      isVIP: false
    }
  ],
  [
    'sender_boss_company_com',
    {
      senderId: 'sender_boss_company_com',
      senderEmail: 'boss@company.com',
      senderDomain: 'company.com',
      totalEmails: 30,
      respondedEmails: 28,
      archivedEmails: 2,
      deletedEmails: 0,
      starredEmails: 15,
      ignoredEmails: 0,
      avgReadTimeSeconds: 120,
      avgResponseTimeSeconds: 3600,
      responseRate: 0.93,
      archiveRate: 0.07,
      deleteRate: 0.0,
      importanceScore: 0.95,
      urgencyScore: 0.85,
      firstSeen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastInteraction: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      decayedWeight: 0.95,
      lastUpdated: new Date().toISOString(),
      userId: 'test-user',
      isVIP: true
    }
  ],
  [
    'sender_vip_important_client_com',
    {
      senderId: 'sender_vip_important_client_com',
      senderEmail: 'vip@important-client.com',
      senderDomain: 'important-client.com',
      totalEmails: 15,
      respondedEmails: 14,
      archivedEmails: 1,
      deletedEmails: 0,
      starredEmails: 10,
      ignoredEmails: 0,
      avgReadTimeSeconds: 180,
      avgResponseTimeSeconds: 1800,
      responseRate: 0.93,
      archiveRate: 0.07,
      deleteRate: 0.0,
      importanceScore: 0.92,
      urgencyScore: 0.75,
      firstSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      lastInteraction: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      decayedWeight: 0.7,
      lastUpdated: new Date().toISOString(),
      userId: 'test-user',
      isVIP: true
    }
  ]
])

// =============================================================================
// Test Result Type
// =============================================================================

interface TestResult {
  testName: string
  passed: boolean
  details: string
  duration: number
  data?: Record<string, unknown>
}

// =============================================================================
// Main Component
// =============================================================================

export function NG2AITester() {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedTab, setSelectedTab] = useState<'tests' | 'store' | 'predictions'>('tests')

  // Stores
  const behaviorStore = useBehaviorStore()
  const actionQueueStore = useActionQueueStore()

  // AI Predictions hook
  const {
    predictions,
    isLoading: isPredicting,
    predictEmails,
    clearPredictions,
    queuedCount
  } = useAIPredictions(undefined, { enabled: false, autoPredict: false, autoQueue: false })

  // =============================================================================
  // Test Functions
  // =============================================================================

  const runBayesianTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test 1: Predict newsletter email (should predict archive)
      const newsletterEmail = MOCK_EMAILS[0]
      const newsletterModel = MOCK_SENDER_MODELS.get('sender_newsletter_marketing_example_com')!
      const newsletterPrediction = bayesianPredictor.predict(newsletterEmail, newsletterModel)

      // Test 2: Predict urgent email from boss (should predict keep)
      const urgentEmail = MOCK_EMAILS[1]
      const bossModel = MOCK_SENDER_MODELS.get('sender_boss_company_com')!
      const urgentPrediction = bayesianPredictor.predict(urgentEmail, bossModel)

      // Test 3: Predict unknown sender (rule-based)
      const unknownEmail = MOCK_EMAILS[3]
      const unknownPrediction = bayesianPredictor.predict(unknownEmail, null)

      // Validate results
      const newsletterCorrect = newsletterPrediction.predictedAction === 'archive'
      const urgentCorrect = urgentPrediction.predictedAction === 'keep'
      const unknownHasReasoning = unknownPrediction.reasoning.includes('rule-based') ||
                                   unknownPrediction.reasoning.includes('New sender')

      const passed = newsletterCorrect && urgentCorrect && unknownHasReasoning

      return {
        testName: 'Bayesian Predictor',
        passed,
        duration: Date.now() - start,
        details: passed
          ? `All predictions correct: Newsletter→${newsletterPrediction.predictedAction} (${Math.round(newsletterPrediction.confidence * 100)}%), Urgent→${urgentPrediction.predictedAction} (${Math.round(urgentPrediction.confidence * 100)}%), Unknown→${unknownPrediction.predictedAction}`
          : `Prediction mismatch: Newsletter(expected archive, got ${newsletterPrediction.predictedAction}), Urgent(expected keep, got ${urgentPrediction.predictedAction})`,
        data: {
          newsletterPrediction,
          urgentPrediction,
          unknownPrediction
        }
      }
    } catch (error) {
      return {
        testName: 'Bayesian Predictor',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [])

  const runBatchBayesianTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const predictions = bayesianPredictor.predictBatch(MOCK_EMAILS, MOCK_SENDER_MODELS)

      const stats = bayesianPredictor.getStats(Array.from(predictions.values()))

      const passed = predictions.size === MOCK_EMAILS.length && stats.avgConfidence > 0

      return {
        testName: 'Batch Bayesian Predictions',
        passed,
        duration: Date.now() - start,
        details: `Predicted ${predictions.size} emails. Avg confidence: ${Math.round(stats.avgConfidence * 100)}%, High confidence: ${stats.highConfidenceCount}, Low confidence: ${stats.lowConfidenceCount}`,
        data: {
          count: predictions.size,
          stats,
          actionDistribution: stats.actionDistribution
        }
      }
    } catch (error) {
      return {
        testName: 'Batch Bayesian Predictions',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [])

  const runEnsembleTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test ensemble prediction (Bayesian only, no LLM)
      const email = MOCK_EMAILS[0]
      const senderModel = MOCK_SENDER_MODELS.get('sender_newsletter_marketing_example_com')!

      const prediction = await ensemblePredictor.predict(email, 'test-user', senderModel)

      // Validate prediction structure
      const hasRequiredFields = prediction.predictionId &&
                                 prediction.emailId === email.id &&
                                 prediction.tier1Prediction &&
                                 prediction.finalPrediction &&
                                 prediction.ensembleWeights

      // Newsletter should predict archive or unsubscribe (both are valid for newsletters)
      const validActions: AIActionType[] = ['archive', 'unsubscribe']
      const actionIsValid = validActions.includes(prediction.finalPrediction.action)
      const passed = hasRequiredFields && actionIsValid

      return {
        testName: 'Ensemble Predictor',
        passed,
        duration: Date.now() - start,
        details: `Prediction: ${prediction.finalPrediction.action} (confidence: ${Math.round(prediction.finalPrediction.confidence * 100)}%). Weights: Tier1=${Math.round(prediction.ensembleWeights.tier1 * 100)}%, Tier3=${Math.round(prediction.ensembleWeights.tier3 * 100)}%`,
        data: { prediction }
      }
    } catch (error) {
      return {
        testName: 'Ensemble Predictor',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [])

  const runBatchEnsembleTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const predictions = await ensemblePredictor.predictBatch(
        MOCK_EMAILS,
        'test-user',
        MOCK_SENDER_MODELS
      )

      // Check that all emails got predictions
      const allPredicted = MOCK_EMAILS.every((email) => predictions.has(email.id))

      // Count predictions by action
      const actionCounts: Record<AIActionType, number> = {} as Record<AIActionType, number>
      predictions.forEach((pred) => {
        const action = pred.finalPrediction.action
        actionCounts[action] = (actionCounts[action] || 0) + 1
      })

      const stats = ensemblePredictor.getStats()
      const passed = allPredicted && predictions.size === MOCK_EMAILS.length

      return {
        testName: 'Batch Ensemble Predictions',
        passed,
        duration: Date.now() - start,
        details: `Predicted ${predictions.size} emails. Actions: ${Object.entries(actionCounts).map(([a, c]) => `${a}:${c}`).join(', ')}. Cache size: ${stats.cacheSize}`,
        data: { predictions: Object.fromEntries(predictions), actionCounts }
      }
    } catch (error) {
      return {
        testName: 'Batch Ensemble Predictions',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [])

  const runBehaviorStoreTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Initialize trust profile
      behaviorStore.initializeTrustProfile('test-user')

      // Use a unique sender each time to avoid accumulation from previous test runs
      const uniqueId = Date.now().toString(36)
      const testSender = `test-sender-${uniqueId}@example.com`
      const model = behaviorStore.updateSenderModel(testSender, 'archive')

      // Verify model was created
      const retrievedModel = behaviorStore.getSenderModel(testSender)

      // Test trust update
      behaviorStore.updateTrustFromAction('approved')
      const trustStage = behaviorStore.getTrustStage()
      const threshold = behaviorStore.getAutoApproveThreshold()

      // Validation: model exists, has correct counts for THIS test run, trust stage is valid
      const passed = model &&
                     retrievedModel &&
                     retrievedModel.totalEmails >= 1 &&
                     retrievedModel.archivedEmails >= 1 &&
                     ['training_wheels', 'building_confidence', 'earned_autonomy'].includes(trustStage)

      return {
        testName: 'Behavior Store',
        passed,
        duration: Date.now() - start,
        details: `Sender model created: ${model ? 'yes' : 'no'}. Total emails: ${retrievedModel?.totalEmails || 0}. Trust stage: ${trustStage}. Threshold: ${Math.round(threshold * 100)}%`,
        data: { model: retrievedModel, trustStage, threshold }
      }
    } catch (error) {
      return {
        testName: 'Behavior Store',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [behaviorStore])

  const runActionQueueTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Generate predictions for queue
      const predictions = await ensemblePredictor.predictBatch(
        MOCK_EMAILS,
        'test-user',
        MOCK_SENDER_MODELS
      )

      // Create queue items
      const queueItems = Array.from(predictions.entries()).map(([emailId, prediction]) => {
        const email = MOCK_EMAILS.find((e) => e.id === emailId)!
        return ensemblePredictor.createActionQueueItem(
          prediction,
          email,
          'test-account'
        )
      })

      // Add items to queue
      actionQueueStore.addItems(queueItems)

      // Get queue stats
      const queueStats = actionQueueStore.items.length
      const pendingCount = actionQueueStore.items.filter((i) => i.status === 'pending').length

      const passed = queueStats > 0 && pendingCount > 0

      return {
        testName: 'Action Queue Integration',
        passed,
        duration: Date.now() - start,
        details: `Added ${queueStats} items to queue. Pending: ${pendingCount}`,
        data: { queueStats, pendingCount, items: actionQueueStore.items }
      }
    } catch (error) {
      return {
        testName: 'Action Queue Integration',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [actionQueueStore])

  const runTrustProgressionTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Initialize fresh trust profile
      behaviorStore.initializeTrustProfile('test-progression-user')

      // Simulate approved actions
      const approvalCount = 10
      for (let i = 0; i < approvalCount; i++) {
        behaviorStore.updateTrustFromAction('approved')
      }

      const profile = behaviorStore.trustProfile!
      const approvalRate = profile.approvedActions / profile.totalInteractions

      const passed = profile.totalInteractions === approvalCount &&
                     profile.approvedActions === approvalCount &&
                     approvalRate === 1.0

      return {
        testName: 'Trust Progression',
        passed,
        duration: Date.now() - start,
        details: `Total interactions: ${profile.totalInteractions}. Approved: ${profile.approvedActions}. Rate: ${Math.round(approvalRate * 100)}%. Stage: ${profile.trustStage}`,
        data: { profile }
      }
    } catch (error) {
      return {
        testName: 'Trust Progression',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [behaviorStore])

  const runConfigValidationTest = useCallback(async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Validate Bayesian config
      const bayesianValid = BAYESIAN_CONFIG.minEmailsForConfidence >= 1 &&
                            BAYESIAN_CONFIG.autoActionThreshold > 0.5 &&
                            BAYESIAN_CONFIG.autoActionThreshold <= 1

      // Validate Ensemble config
      const ensembleValid = DEFAULT_ENSEMBLE_CONFIG.llmFallbackThreshold > 0 &&
                             DEFAULT_ENSEMBLE_CONFIG.autoExecuteThreshold > 0.5 &&
                             DEFAULT_ENSEMBLE_CONFIG.maxConcurrentLLM >= 1

      // Validate weights sum
      const weightsSum = DEFAULT_ENSEMBLE_CONFIG.defaultWeights.tier1 +
                         DEFAULT_ENSEMBLE_CONFIG.defaultWeights.tier2 +
                         DEFAULT_ENSEMBLE_CONFIG.defaultWeights.tier3
      const weightsValid = Math.abs(weightsSum - 1.0) < 0.01

      const passed = bayesianValid && ensembleValid && weightsValid

      return {
        testName: 'Config Validation',
        passed,
        duration: Date.now() - start,
        details: `Bayesian: ${bayesianValid ? '✓' : '✗'}, Ensemble: ${ensembleValid ? '✓' : '✗'}, Weights sum: ${weightsSum.toFixed(2)} (${weightsValid ? '✓' : '✗'})`,
        data: {
          bayesianConfig: BAYESIAN_CONFIG,
          ensembleConfig: DEFAULT_ENSEMBLE_CONFIG
        }
      }
    } catch (error) {
      return {
        testName: 'Config Validation',
        passed: false,
        duration: Date.now() - start,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }, [])

  // =============================================================================
  // Run All Tests
  // =============================================================================

  const runAllTests = useCallback(async () => {
    setIsRunning(true)
    setTestResults([])

    const tests = [
      runBayesianTest,
      runBatchBayesianTest,
      runEnsembleTest,
      runBatchEnsembleTest,
      runBehaviorStoreTest,
      runActionQueueTest,
      runTrustProgressionTest,
      runConfigValidationTest
    ]

    const results: TestResult[] = []

    for (const test of tests) {
      const result = await test()
      results.push(result)
      setTestResults([...results])
      // Small delay between tests
      await new Promise((r) => setTimeout(r, 100))
    }

    setIsRunning(false)
  }, [
    runBayesianTest,
    runBatchBayesianTest,
    runEnsembleTest,
    runBatchEnsembleTest,
    runBehaviorStoreTest,
    runActionQueueTest,
    runTrustProgressionTest,
    runConfigValidationTest
  ])

  // =============================================================================
  // Live Prediction Test
  // =============================================================================

  const runLivePrediction = useCallback(async () => {
    // First, seed the behavior store with mock models
    MOCK_SENDER_MODELS.forEach((model, key) => {
      behaviorStore.senderModels.set(key, model)
    })

    // Run predictions through the hook
    await predictEmails(MOCK_EMAILS)
  }, [behaviorStore, predictEmails])

  // =============================================================================
  // Cleanup
  // =============================================================================

  const cleanup = useCallback(() => {
    clearPredictions()
    ensemblePredictor.clearCache()
    // Don't clear the behavior store as it persists user data
    setTestResults([])
  }, [clearPredictions])

  // =============================================================================
  // Summary Stats
  // =============================================================================

  const passedTests = testResults.filter((r) => r.passed).length
  const totalTests = testResults.length
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0)

  // =============================================================================
  // Render
  // =============================================================================

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 z-50"
        title="Open AI Tester"
      >
        <BeakerIcon className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BeakerIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">AI Prediction Tester</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setSelectedTab('tests')}
            className={`px-4 py-3 text-sm font-medium ${
              selectedTab === 'tests'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <PlayIcon className="w-4 h-4" />
              Tests
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('store')}
            className={`px-4 py-3 text-sm font-medium ${
              selectedTab === 'store'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4" />
              Store State
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('predictions')}
            className={`px-4 py-3 text-sm font-medium ${
              selectedTab === 'predictions'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              Live Predictions
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tests Tab */}
          {selectedTab === 'tests' && (
            <div className="space-y-4">
              {/* Test Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={runAllTests}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4" />
                      Run All Tests
                    </>
                  )}
                </button>

                <button
                  onClick={cleanup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  <TrashIcon className="w-4 h-4" />
                  Clear
                </button>

                {totalTests > 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className={passedTests === totalTests ? 'text-green-400' : 'text-yellow-400'}>
                      {passedTests}/{totalTests} passed
                    </span>
                    <span className="text-gray-500">
                      {totalDuration}ms total
                    </span>
                  </div>
                )}
              </div>

              {/* Test Results */}
              <div className="space-y-3">
                {testResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <InformationCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Run All Tests" to test the AI prediction pipeline</p>
                  </div>
                )}

                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      result.passed
                        ? 'bg-green-900/20 border-green-700'
                        : 'bg-red-900/20 border-red-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-medium text-white">{result.testName}</span>
                      </div>
                      <span className="text-xs text-gray-500">{result.duration}ms</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">{result.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store State Tab */}
          {selectedTab === 'store' && (
            <div className="space-y-6">
              {/* Trust Profile */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-purple-400" />
                  Trust Profile
                </h3>
                {behaviorStore.trustProfile ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Stage:</span>
                      <span className="ml-2 text-white capitalize">
                        {behaviorStore.trustProfile.trustStage.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Trust Score:</span>
                      <span className="ml-2 text-white">
                        {Math.round(behaviorStore.trustProfile.trustScore * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Interactions:</span>
                      <span className="ml-2 text-white">
                        {behaviorStore.trustProfile.totalInteractions}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Auto-Approve Threshold:</span>
                      <span className="ml-2 text-white">
                        {Math.round(behaviorStore.trustProfile.autoApproveThreshold * 100)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No trust profile initialized</p>
                )}
              </div>

              {/* Sender Models */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <CpuChipIcon className="w-5 h-5 text-purple-400" />
                  Sender Models ({behaviorStore.senderModels.size})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Array.from(behaviorStore.senderModels.values())
                    .slice(0, 10)
                    .map((model) => (
                      <div
                        key={model.senderId}
                        className="flex items-center justify-between text-sm p-2 bg-gray-700/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {model.isVIP && <span className="text-yellow-400">★</span>}
                          <span className="text-gray-300">{model.senderEmail}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Emails: {model.totalEmails}</span>
                          <span>Archive: {Math.round(model.archiveRate * 100)}%</span>
                          <span>Response: {Math.round(model.responseRate * 100)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Queue */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-purple-400" />
                  Action Queue ({actionQueueStore.items.length} items)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {actionQueueStore.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm p-2 bg-gray-700/50 rounded"
                    >
                      <div>
                        <span className="text-gray-300">{item.emailSubject}</span>
                        <span className="text-gray-500 text-xs ml-2">from {item.senderEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400">
                          {item.prediction.finalPrediction.action}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          item.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                          item.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Predictions Tab */}
          {selectedTab === 'predictions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={runLivePrediction}
                  disabled={isPredicting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isPredicting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      Run Live Predictions
                    </>
                  )}
                </button>

                <span className="text-sm text-gray-500">
                  Tests the full useAIPredictions hook with {MOCK_EMAILS.length} mock emails
                </span>
              </div>

              {/* Prediction Results */}
              <div className="space-y-3">
                {predictions.size === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Run Live Predictions" to test the AI hook</p>
                  </div>
                )}

                {Array.from(predictions.entries()).map(([emailId, prediction]) => {
                  const email = MOCK_EMAILS.find((e) => e.id === emailId)
                  return (
                    <div key={emailId} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-white">{email?.subject}</h4>
                          <p className="text-sm text-gray-500">{email?.from}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            prediction.finalPrediction.action === 'archive' ? 'bg-blue-900/50 text-blue-300' :
                            prediction.finalPrediction.action === 'keep' ? 'bg-green-900/50 text-green-300' :
                            prediction.finalPrediction.action === 'delete' ? 'bg-red-900/50 text-red-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {prediction.finalPrediction.action}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(prediction.finalPrediction.confidence * 100)}% confidence
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{prediction.finalPrediction.reasoning}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Tier 1: {prediction.tier1Prediction?.predictedAction} ({Math.round((prediction.tier1Prediction?.confidence || 0) * 100)}%)
                        </span>
                        {prediction.tier3Prediction && (
                          <span>
                            Tier 3: {prediction.tier3Prediction.predictedAction} ({Math.round(prediction.tier3Prediction.confidence * 100)}%)
                          </span>
                        )}
                        <span className={prediction.finalPrediction.requiresApproval ? 'text-yellow-400' : 'text-green-400'}>
                          {prediction.finalPrediction.requiresApproval ? 'Needs approval' : 'Auto-execute ready'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {queuedCount > 0 && (
                <div className="mt-4 p-3 bg-purple-900/30 rounded-lg text-sm text-purple-300">
                  {queuedCount} predictions added to Action Queue
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>
              Ensemble Config: LLM Fallback at {Math.round(DEFAULT_ENSEMBLE_CONFIG.llmFallbackThreshold * 100)}%, Auto-execute at {Math.round(DEFAULT_ENSEMBLE_CONFIG.autoExecuteThreshold * 100)}%
            </span>
            <span>
              Cache: {ensemblePredictor.getStats().cacheSize} predictions
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NG2AITester
