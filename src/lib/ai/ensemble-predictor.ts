/**
 * Ensemble Predictor
 *
 * Combines predictions from multiple tiers:
 * - Tier 1: Bayesian (fast, local, sender history)
 * - Tier 2: Collaborative (cross-user patterns) - placeholder
 * - Tier 3: LLM (deep semantic understanding)
 *
 * Uses adaptive weighting based on confidence and historical accuracy.
 */

import {
  PredictionResult,
  BayesianPrediction,
  CollaborativePrediction,
  LLMPrediction,
  AIActionType,
  SenderModel,
  ActionQueueItem,
  ActionQueueStatus
} from '@/types/ai'
import { Email } from '@/types/email'
import { bayesianPredictor, BAYESIAN_CONFIG } from './bayesian-predictor'
import { openAIService } from './openai-service'
import { useBehaviorStore } from '@/stores/behaviorStore'

// =============================================================================
// Configuration
// =============================================================================

export interface EnsembleConfig {
  /** Use LLM when Bayesian confidence is below this threshold */
  llmFallbackThreshold: number

  /** Default weights for ensemble combination */
  defaultWeights: {
    tier1: number
    tier2: number
    tier3: number
  }

  /** Confidence boost when multiple tiers agree */
  agreementBoost: number

  /** Minimum confidence to suggest an action */
  suggestionThreshold: number

  /** Confidence threshold for auto-execution */
  autoExecuteThreshold: number

  /** Maximum concurrent LLM calls */
  maxConcurrentLLM: number

  /** Cache TTL for predictions (ms) */
  predictionCacheTTL: number
}

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  llmFallbackThreshold: 0.6,
  defaultWeights: {
    tier1: 0.5,
    tier2: 0.1, // Placeholder - collaborative not implemented
    tier3: 0.4
  },
  agreementBoost: 0.15,
  suggestionThreshold: 0.4,
  autoExecuteThreshold: 0.85,
  maxConcurrentLLM: 3,
  predictionCacheTTL: 5 * 60 * 1000 // 5 minutes
}

// =============================================================================
// Prediction Cache
// =============================================================================

interface CachedPrediction {
  result: PredictionResult
  timestamp: number
}

const predictionCache = new Map<string, CachedPrediction>()

function getCacheKey(emailId: string, userId: string): string {
  return `${userId}:${emailId}`
}

function getCachedPrediction(
  emailId: string,
  userId: string,
  ttl: number
): PredictionResult | null {
  const key = getCacheKey(emailId, userId)
  const cached = predictionCache.get(key)

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result
  }

  // Remove expired entry
  if (cached) {
    predictionCache.delete(key)
  }

  return null
}

function cachePrediction(emailId: string, userId: string, result: PredictionResult): void {
  const key = getCacheKey(emailId, userId)
  predictionCache.set(key, {
    result,
    timestamp: Date.now()
  })

  // Cleanup old entries (keep max 100)
  if (predictionCache.size > 100) {
    const entries = Array.from(predictionCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    entries.slice(0, 50).forEach(([k]) => predictionCache.delete(k))
  }
}

// =============================================================================
// Ensemble Predictor Class
// =============================================================================

export class EnsemblePredictor {
  private config: EnsembleConfig
  private pendingLLMCalls = 0

  constructor(config: Partial<EnsembleConfig> = {}) {
    this.config = { ...DEFAULT_ENSEMBLE_CONFIG, ...config }
  }

  /**
   * Generate ensemble prediction for a single email
   */
  async predict(
    email: Email,
    userId: string,
    senderModel: SenderModel | null,
    forceRefresh = false
  ): Promise<PredictionResult> {
    // Check cache
    if (!forceRefresh) {
      const cached = getCachedPrediction(
        email.id,
        userId,
        this.config.predictionCacheTTL
      )
      if (cached) return cached
    }

    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const timestamp = new Date().toISOString()

    // Get Tier 1 (Bayesian) prediction
    const tier1Prediction = bayesianPredictor.predict(email, senderModel)

    // Determine if we need LLM
    let tier3Prediction: LLMPrediction | undefined
    const needsLLM = tier1Prediction.confidence < this.config.llmFallbackThreshold

    if (needsLLM && this.pendingLLMCalls < this.config.maxConcurrentLLM) {
      tier3Prediction = await this.getLLMPrediction(email)
    }

    // Get user trust profile for threshold adjustment
    const trustProfile = useBehaviorStore.getState().trustProfile
    const autoApproveThreshold = trustProfile?.autoApproveThreshold ||
      this.config.autoExecuteThreshold

    // Combine predictions
    const { finalPrediction, weights } = this.combinePredictons(
      tier1Prediction,
      undefined, // Tier 2 placeholder
      tier3Prediction,
      autoApproveThreshold
    )

    const result: PredictionResult = {
      predictionId,
      emailId: email.id,
      threadId: email.threadId,
      userId,
      tier1Prediction,
      tier2Prediction: undefined,
      tier3Prediction,
      finalPrediction,
      ensembleWeights: weights,
      timestamp,
      isResolved: false
    }

    // Cache result
    cachePrediction(email.id, userId, result)

    return result
  }

  /**
   * Batch predict for multiple emails
   */
  async predictBatch(
    emails: Email[],
    userId: string,
    senderModels: Map<string, SenderModel>
  ): Promise<Map<string, PredictionResult>> {
    const results = new Map<string, PredictionResult>()

    // First pass: Get all Bayesian predictions
    const bayesianPredictions = bayesianPredictor.predictBatch(emails, senderModels)

    // Identify emails that need LLM
    const needsLLM: Email[] = []
    emails.forEach((email) => {
      const bayesian = bayesianPredictions.get(email.id)
      if (bayesian && bayesian.confidence < this.config.llmFallbackThreshold) {
        needsLLM.push(email)
      }
    })

    // Batch LLM calls with concurrency limit
    const llmResults = new Map<string, LLMPrediction>()
    const batches = this.chunkArray(needsLLM, this.config.maxConcurrentLLM)

    for (const batch of batches) {
      const llmPromises = batch.map(async (email) => {
        const prediction = await this.getLLMPrediction(email)
        return { emailId: email.id, prediction }
      })

      const batchResults = await Promise.all(llmPromises)
      batchResults.forEach(({ emailId, prediction }) => {
        if (prediction) {
          llmResults.set(emailId, prediction)
        }
      })
    }

    // Combine all predictions
    const trustProfile = useBehaviorStore.getState().trustProfile
    const autoApproveThreshold = trustProfile?.autoApproveThreshold ||
      this.config.autoExecuteThreshold

    emails.forEach((email) => {
      const tier1 = bayesianPredictions.get(email.id)!
      const tier3 = llmResults.get(email.id)

      const { finalPrediction, weights } = this.combinePredictons(
        tier1,
        undefined,
        tier3,
        autoApproveThreshold
      )

      const result: PredictionResult = {
        predictionId: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        emailId: email.id,
        threadId: email.threadId,
        userId,
        tier1Prediction: tier1,
        tier3Prediction: tier3,
        finalPrediction,
        ensembleWeights: weights,
        timestamp: new Date().toISOString(),
        isResolved: false
      }

      results.set(email.id, result)
      cachePrediction(email.id, userId, result)
    })

    return results
  }

  /**
   * Get LLM prediction with rate limiting
   */
  private async getLLMPrediction(email: Email): Promise<LLMPrediction | undefined> {
    this.pendingLLMCalls++
    try {
      const prediction = await openAIService.predict({
        id: email.id,
        from: email.from || '',
        subject: email.subject || '',
        body: email.body || ''
      })
      return prediction
    } catch (error) {
      console.error('[Ensemble] LLM prediction failed:', error)
      return undefined
    } finally {
      this.pendingLLMCalls--
    }
  }

  /**
   * Combine predictions from multiple tiers
   */
  private combinePredictons(
    tier1: BayesianPrediction,
    tier2: CollaborativePrediction | undefined,
    tier3: LLMPrediction | undefined,
    autoApproveThreshold: number
  ): {
    finalPrediction: PredictionResult['finalPrediction']
    weights: PredictionResult['ensembleWeights']
  } {
    // Adjust weights based on what's available
    let weights = { ...this.config.defaultWeights }

    if (!tier3) {
      // No LLM, redistribute weight to Bayesian
      weights.tier1 += weights.tier3
      weights.tier3 = 0
    }

    if (!tier2) {
      // No collaborative, redistribute
      weights.tier1 += weights.tier2 / 2
      weights.tier3 += weights.tier2 / 2
      weights.tier2 = 0
    }

    // Normalize weights
    const totalWeight = weights.tier1 + weights.tier2 + weights.tier3
    weights.tier1 /= totalWeight
    weights.tier2 /= totalWeight
    weights.tier3 /= totalWeight

    // Calculate weighted action scores
    const actionScores = new Map<AIActionType, number>()

    // Add Tier 1 scores
    actionScores.set(
      tier1.predictedAction,
      (actionScores.get(tier1.predictedAction) || 0) + tier1.confidence * weights.tier1
    )

    // Add Tier 3 scores
    if (tier3) {
      actionScores.set(
        tier3.predictedAction,
        (actionScores.get(tier3.predictedAction) || 0) + tier3.confidence * weights.tier3
      )
    }

    // Find best action
    let bestAction: AIActionType = tier1.predictedAction
    let bestScore = 0

    actionScores.forEach((score, action) => {
      if (score > bestScore) {
        bestScore = score
        bestAction = action
      }
    })

    // Calculate final confidence
    let confidence = bestScore

    // Agreement boost
    const predictions = [tier1, tier3].filter(Boolean) as Array<{ predictedAction: AIActionType }>
    const allAgree = predictions.every((p) => p.predictedAction === bestAction)
    if (allAgree && predictions.length > 1) {
      confidence = Math.min(1, confidence + this.config.agreementBoost)
    }

    // Build reasoning
    const reasoningParts: string[] = []
    reasoningParts.push(`Bayesian: ${tier1.predictedAction} (${Math.round(tier1.confidence * 100)}%)`)
    if (tier3) {
      reasoningParts.push(`LLM: ${tier3.predictedAction} (${Math.round(tier3.confidence * 100)}%)`)
    }
    if (allAgree && predictions.length > 1) {
      reasoningParts.push('All tiers agree.')
    }

    return {
      finalPrediction: {
        action: bestAction,
        confidence,
        reasoning: reasoningParts.join(' | '),
        requiresApproval: confidence < autoApproveThreshold
      },
      weights
    }
  }

  /**
   * Create action queue item from prediction
   */
  createActionQueueItem(
    prediction: PredictionResult,
    email: Email,
    accountId: string
  ): ActionQueueItem {
    return {
      id: `aq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: prediction.userId,
      emailId: prediction.emailId,
      threadId: prediction.threadId,
      accountId,
      emailSubject: email.subject || '(no subject)',
      senderEmail: email.from || 'unknown',
      prediction,
      status: 'pending' as ActionQueueStatus,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * Get prediction statistics
   */
  getStats(): {
    cacheSize: number
    pendingLLMCalls: number
    config: EnsembleConfig
  } {
    return {
      cacheSize: predictionCache.size,
      pendingLLMCalls: this.pendingLLMCalls,
      config: this.config
    }
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    predictionCache.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EnsembleConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Helper to chunk array for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const ensemblePredictor = new EnsemblePredictor()

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick prediction for single email
 */
export async function predictEmail(
  email: Email,
  userId: string
): Promise<PredictionResult> {
  const senderEmail = email.from?.toLowerCase() || ''
  const senderId = `sender_${senderEmail.replace(/[^a-z0-9]/g, '_')}`
  const senderModel = useBehaviorStore.getState().senderModels.get(senderId) || null

  return ensemblePredictor.predict(email, userId, senderModel)
}

/**
 * Should this email be auto-archived?
 */
export async function shouldAutoArchive(
  email: Email,
  userId: string
): Promise<{ should: boolean; confidence: number; reason: string }> {
  const prediction = await predictEmail(email, userId)
  const final = prediction.finalPrediction

  return {
    should: final.action === 'archive' && !final.requiresApproval,
    confidence: final.confidence,
    reason: final.reasoning
  }
}

/**
 * Get smart suggestions for inbox
 */
export async function getSmartSuggestions(
  emails: Email[],
  userId: string,
  maxSuggestions = 10
): Promise<ActionQueueItem[]> {
  const senderModels = useBehaviorStore.getState().senderModels
  const predictions = await ensemblePredictor.predictBatch(emails, userId, senderModels)

  const suggestions: ActionQueueItem[] = []

  predictions.forEach((prediction, emailId) => {
    const email = emails.find((e) => e.id === emailId)
    if (!email) return

    // Only suggest if confidence is above threshold and action is not 'keep'
    if (
      prediction.finalPrediction.confidence >= DEFAULT_ENSEMBLE_CONFIG.suggestionThreshold &&
      prediction.finalPrediction.action !== 'keep'
    ) {
      suggestions.push(
        ensemblePredictor.createActionQueueItem(prediction, email, email.accountId || 'default')
      )
    }
  })

  // Sort by confidence (highest first) and limit
  return suggestions
    .sort((a, b) => b.prediction.finalPrediction.confidence - a.prediction.finalPrediction.confidence)
    .slice(0, maxSuggestions)
}

/**
 * Process auto-execute actions
 */
export async function processAutoActions(
  emails: Email[],
  userId: string,
  executeAction: (emailId: string, action: AIActionType) => Promise<void>
): Promise<{
  autoExecuted: number
  queued: ActionQueueItem[]
}> {
  const senderModels = useBehaviorStore.getState().senderModels
  const predictions = await ensemblePredictor.predictBatch(emails, userId, senderModels)

  const autoExecuted: string[] = []
  const queued: ActionQueueItem[] = []

  for (const [emailId, prediction] of predictions) {
    const email = emails.find((e) => e.id === emailId)
    if (!email) continue

    const { action, requiresApproval, confidence } = prediction.finalPrediction

    if (!requiresApproval && action !== 'keep') {
      // Auto-execute
      try {
        await executeAction(emailId, action)
        autoExecuted.push(emailId)
      } catch (error) {
        console.error(`[Ensemble] Auto-action failed for ${emailId}:`, error)
        // Add to queue if auto-execute fails
        queued.push(
          ensemblePredictor.createActionQueueItem(prediction, email, email.accountId || 'default')
        )
      }
    } else if (action !== 'keep' && confidence >= DEFAULT_ENSEMBLE_CONFIG.suggestionThreshold) {
      // Add to queue for review
      queued.push(
        ensemblePredictor.createActionQueueItem(prediction, email, email.accountId || 'default')
      )
    }
  }

  return {
    autoExecuted: autoExecuted.length,
    queued
  }
}
