/**
 * Bayesian Prediction Engine (Tier 1)
 *
 * Handles 70-80% of email predictions using sender history and behavior patterns.
 * Uses Bayesian probability with Laplace smoothing for sparse data.
 *
 * Key features:
 * - Per-sender probability models
 * - Time decay for older interactions
 * - Confidence scoring based on sample size
 * - Fast, local predictions (no API calls)
 */

import {
  SenderModel,
  BayesianPrediction,
  AIActionType,
  BehaviorEvent
} from '@/types/ai'
import { Email } from '@/types/email'

// =============================================================================
// Configuration
// =============================================================================

export const BAYESIAN_CONFIG = {
  /** Minimum emails from sender before high-confidence predictions */
  minEmailsForConfidence: 3,

  /** Lambda for time decay: e^(-lambda * days) */
  timeDecayLambda: 0.1,

  /** Confidence penalty for low sample size */
  sampleSizePenalty: 0.2,

  /** Prior probability for response */
  priorResponse: 0.3,

  /** Prior probability for archive */
  priorArchive: 0.4,

  /** Prior probability for delete */
  priorDelete: 0.1,

  /** Weight for recency in importance calculation */
  recencyWeight: 0.2,

  /** Weight for response rate in importance */
  responseWeight: 0.4,

  /** Weight for star rate in importance */
  starWeight: 0.3,

  /** Confidence threshold for auto-action suggestions */
  autoActionThreshold: 0.85,

  /** Domain patterns that indicate newsletters */
  newsletterDomains: [
    'noreply',
    'newsletter',
    'marketing',
    'notifications',
    'updates',
    'info@',
    'news@',
    'digest@'
  ],

  /** Keywords that indicate urgent emails */
  urgentKeywords: [
    'urgent',
    'asap',
    'immediately',
    'deadline',
    'critical',
    'important',
    'action required',
    'time sensitive'
  ],

  /** Keywords that indicate meeting-related emails */
  meetingKeywords: [
    'meeting',
    'calendar',
    'schedule',
    'invite',
    'appointment',
    'call',
    'zoom',
    'teams',
    'google meet'
  ]
}

// =============================================================================
// Bayesian Predictor Class
// =============================================================================

export class BayesianPredictor {
  private config = BAYESIAN_CONFIG

  /**
   * Update sender model based on a new behavior event
   */
  updateSenderModel(
    event: BehaviorEvent,
    currentModel?: SenderModel
  ): Partial<SenderModel> {
    const now = new Date().toISOString()

    // Initialize or update counts
    const updates: Partial<SenderModel> = {
      totalEmails: (currentModel?.totalEmails || 0) + 1,
      lastInteraction: now,
      decayedWeight: 1.0, // Reset decay on new interaction
      lastUpdated: now
    }

    // Update specific counters based on event type
    switch (event.eventType) {
      case 'respond':
        updates.respondedEmails = (currentModel?.respondedEmails || 0) + 1
        break
      case 'archive':
        updates.archivedEmails = (currentModel?.archivedEmails || 0) + 1
        break
      case 'delete':
        updates.deletedEmails = (currentModel?.deletedEmails || 0) + 1
        break
      case 'star':
        updates.starredEmails = (currentModel?.starredEmails || 0) + 1
        break
      case 'ignore':
        updates.ignoredEmails = (currentModel?.ignoredEmails || 0) + 1
        break
    }

    // Recalculate probabilities
    const totalEmails = updates.totalEmails!
    updates.responseRate = this.computeProbability(
      updates.respondedEmails || currentModel?.respondedEmails || 0,
      totalEmails,
      this.config.priorResponse
    )
    updates.archiveRate = this.computeProbability(
      updates.archivedEmails || currentModel?.archivedEmails || 0,
      totalEmails,
      this.config.priorArchive
    )
    updates.deleteRate = this.computeProbability(
      updates.deletedEmails || currentModel?.deletedEmails || 0,
      totalEmails,
      this.config.priorDelete
    )

    // Calculate importance score
    updates.importanceScore = this.calculateImportanceScore({
      ...currentModel,
      ...updates
    } as SenderModel)

    return updates
  }

  /**
   * Generate prediction for an email based on sender model
   */
  predict(
    email: Email,
    senderModel: SenderModel | null
  ): BayesianPrediction {
    // If no sender model, use rule-based prediction
    if (!senderModel || senderModel.totalEmails < this.config.minEmailsForConfidence) {
      return this.ruleBasedPrediction(email, senderModel)
    }

    // Apply time decay to sender model
    const decayedModel = this.applyTimeDecayToModel(senderModel)

    // Determine most likely action
    const actionScores = this.calculateActionScores(email, decayedModel)
    const [bestAction, bestScore] = this.getBestAction(actionScores)

    // Calculate confidence
    const confidence = this.calculateConfidence(decayedModel, bestScore)

    // Generate reasoning
    const reasoning = this.generateReasoning(email, decayedModel, bestAction, confidence)

    return {
      source: 'bayesian',
      senderModelId: senderModel.senderId,
      predictedAction: bestAction,
      confidence,
      reasoning,
      factors: {
        responseRate: decayedModel.responseRate,
        archiveRate: decayedModel.archiveRate,
        importanceScore: decayedModel.importanceScore,
        timeDecay: decayedModel.decayedWeight
      }
    }
  }

  /**
   * Compute Bayesian probability with Laplace smoothing
   * P = (k + alpha) / (n + alpha * 2)
   * where k = successes, n = total, alpha = prior strength
   */
  computeProbability(
    successes: number,
    total: number,
    prior: number = 0.5
  ): number {
    // Laplace smoothing with prior
    const alpha = prior * 2 // Strength of prior
    return (successes + alpha) / (total + 2 * alpha)
  }

  /**
   * Calculate time decay factor
   * weight = e^(-lambda * days)
   */
  calculateTimeDecay(lastInteractionDate: string): number {
    const daysSince =
      (Date.now() - new Date(lastInteractionDate).getTime()) /
      (1000 * 60 * 60 * 24)
    return Math.exp(-this.config.timeDecayLambda * daysSince)
  }

  /**
   * Apply time decay to all probabilities in a sender model
   */
  private applyTimeDecayToModel(model: SenderModel): SenderModel {
    const decay = this.calculateTimeDecay(model.lastInteraction)
    return {
      ...model,
      decayedWeight: decay,
      // Blend probabilities toward prior based on decay
      responseRate: this.blendWithPrior(
        model.responseRate,
        this.config.priorResponse,
        decay
      ),
      archiveRate: this.blendWithPrior(
        model.archiveRate,
        this.config.priorArchive,
        decay
      ),
      deleteRate: this.blendWithPrior(
        model.deleteRate,
        this.config.priorDelete,
        decay
      )
    }
  }

  /**
   * Blend a probability toward prior based on decay factor
   */
  private blendWithPrior(
    probability: number,
    prior: number,
    decayFactor: number
  ): number {
    // As decay increases (recent), use learned probability
    // As decay decreases (old), revert toward prior
    return probability * decayFactor + prior * (1 - decayFactor)
  }

  /**
   * Calculate importance score based on multiple factors
   */
  private calculateImportanceScore(model: SenderModel): number {
    const starRate =
      model.totalEmails > 0 ? (model.starredEmails || 0) / model.totalEmails : 0
    const volumeScore = Math.min(model.totalEmails / 100, 1)

    return (
      model.responseRate * this.config.responseWeight +
      starRate * this.config.starWeight +
      model.decayedWeight * this.config.recencyWeight +
      volumeScore * 0.1
    )
  }

  /**
   * Calculate action scores based on sender model and email content
   */
  private calculateActionScores(
    email: Email,
    model: SenderModel
  ): Map<AIActionType, number> {
    const scores = new Map<AIActionType, number>()

    // Base scores from sender model
    scores.set('archive', model.archiveRate)
    scores.set('delete', model.deleteRate)
    scores.set('keep', 1 - model.archiveRate - model.deleteRate)

    // Adjust for VIP senders
    if (model.isVIP) {
      scores.set('keep', (scores.get('keep') || 0) + 0.3)
      scores.set('star', 0.4)
    }

    // Adjust for email content
    const subject = email.subject?.toLowerCase() || ''

    // Urgent emails
    if (this.containsAny(subject, this.config.urgentKeywords)) {
      scores.set('keep', (scores.get('keep') || 0) + 0.2)
      scores.set('archive', (scores.get('archive') || 0) - 0.1)
    }

    // Meeting emails
    if (this.containsAny(subject, this.config.meetingKeywords)) {
      scores.set('keep', (scores.get('keep') || 0) + 0.15)
    }

    // Newsletter/promotional emails
    if (this.isLikelyNewsletter(email, model)) {
      scores.set('archive', (scores.get('archive') || 0) + 0.2)
      scores.set('unsubscribe', 0.3)
    }

    return scores
  }

  /**
   * Get the best action and its score
   */
  private getBestAction(
    scores: Map<AIActionType, number>
  ): [AIActionType, number] {
    let bestAction: AIActionType = 'keep'
    let bestScore = 0

    scores.forEach((score, action) => {
      if (score > bestScore) {
        bestScore = score
        bestAction = action
      }
    })

    return [bestAction, bestScore]
  }

  /**
   * Calculate confidence based on sample size and score
   */
  private calculateConfidence(model: SenderModel, actionScore: number): number {
    // Base confidence from action score
    let confidence = actionScore

    // Penalty for small sample size
    if (model.totalEmails < this.config.minEmailsForConfidence) {
      confidence *= 1 - this.config.sampleSizePenalty
    } else if (model.totalEmails < 10) {
      confidence *= 1 - this.config.sampleSizePenalty * 0.5
    }

    // Factor in time decay
    confidence *= 0.8 + 0.2 * model.decayedWeight

    // Clamp to 0-1
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Generate human-readable reasoning for the prediction
   */
  private generateReasoning(
    email: Email,
    model: SenderModel,
    action: AIActionType,
    confidence: number
  ): string {
    const senderName = model.senderName || model.senderEmail
    const totalEmails = model.totalEmails

    const parts: string[] = []

    // Sample size context
    if (totalEmails < this.config.minEmailsForConfidence) {
      parts.push(`Limited history with ${senderName} (${totalEmails} emails).`)
    } else {
      parts.push(`Based on ${totalEmails} emails from ${senderName}.`)
    }

    // Action-specific reasoning
    switch (action) {
      case 'archive':
        parts.push(
          `You archive ${Math.round(model.archiveRate * 100)}% of emails from this sender.`
        )
        break
      case 'delete':
        parts.push(
          `You delete ${Math.round(model.deleteRate * 100)}% of emails from this sender.`
        )
        break
      case 'keep':
        if (model.responseRate > 0.5) {
          parts.push(
            `You respond to ${Math.round(model.responseRate * 100)}% of emails from this sender.`
          )
        }
        if (model.isVIP) {
          parts.push('This sender is marked as VIP.')
        }
        break
      case 'star':
        parts.push('High importance sender based on your interaction history.')
        break
      case 'unsubscribe':
        parts.push('This appears to be a newsletter with low engagement.')
        break
    }

    // Confidence qualifier
    if (confidence < 0.5) {
      parts.push('Low confidence - please review.')
    } else if (confidence < 0.7) {
      parts.push('Moderate confidence.')
    }

    return parts.join(' ')
  }

  /**
   * Rule-based prediction for new senders or low-data situations
   */
  private ruleBasedPrediction(
    email: Email,
    model: SenderModel | null
  ): BayesianPrediction {
    const subject = email.subject?.toLowerCase() || ''
    const from = email.from?.toLowerCase() || ''
    let action: AIActionType = 'keep'
    let confidence = 0.3
    let reasoning = 'New sender - using rule-based prediction.'

    // Check for newsletter patterns
    if (this.containsAny(from, this.config.newsletterDomains)) {
      action = 'archive'
      confidence = 0.6
      reasoning = 'Appears to be an automated/newsletter email based on sender address.'
    }

    // Check for urgent patterns
    if (this.containsAny(subject, this.config.urgentKeywords)) {
      action = 'keep'
      confidence = 0.7
      reasoning = 'Contains urgent keywords - keeping for review.'
    }

    // Check for meeting patterns
    if (this.containsAny(subject, this.config.meetingKeywords)) {
      action = 'keep'
      confidence = 0.65
      reasoning = 'Appears to be meeting-related.'
    }

    return {
      source: 'bayesian',
      senderModelId: model?.senderId || 'unknown',
      predictedAction: action,
      confidence,
      reasoning,
      factors: {
        responseRate: model?.responseRate || this.config.priorResponse,
        archiveRate: model?.archiveRate || this.config.priorArchive,
        importanceScore: model?.importanceScore || 0.5,
        timeDecay: model?.decayedWeight || 1.0
      }
    }
  }

  /**
   * Check if email is likely a newsletter
   */
  private isLikelyNewsletter(email: Email, model: SenderModel): boolean {
    const from = email.from?.toLowerCase() || ''

    // Check sender address patterns
    if (this.containsAny(from, this.config.newsletterDomains)) {
      return true
    }

    // Check if user rarely responds to this sender
    if (model.totalEmails >= 5 && model.responseRate < 0.1) {
      return true
    }

    // Check if user frequently archives without reading
    if (model.totalEmails >= 5 && model.archiveRate > 0.8) {
      return true
    }

    return false
  }

  /**
   * Helper to check if text contains any of the given patterns
   */
  private containsAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern.toLowerCase()))
  }

  /**
   * Batch predict for multiple emails
   */
  predictBatch(
    emails: Email[],
    senderModels: Map<string, SenderModel>
  ): Map<string, BayesianPrediction> {
    const predictions = new Map<string, BayesianPrediction>()

    for (const email of emails) {
      const senderEmail = email.from?.toLowerCase() || ''
      const senderId = `sender_${senderEmail.replace(/[^a-z0-9]/g, '_')}`
      const model = senderModels.get(senderId) || null

      predictions.set(email.id, this.predict(email, model))
    }

    return predictions
  }

  /**
   * Get prediction statistics
   */
  getStats(predictions: BayesianPrediction[]): {
    avgConfidence: number
    actionDistribution: Record<AIActionType, number>
    highConfidenceCount: number
    lowConfidenceCount: number
  } {
    const stats = {
      avgConfidence: 0,
      actionDistribution: {} as Record<AIActionType, number>,
      highConfidenceCount: 0,
      lowConfidenceCount: 0
    }

    if (predictions.length === 0) return stats

    let totalConfidence = 0

    for (const pred of predictions) {
      totalConfidence += pred.confidence
      stats.actionDistribution[pred.predictedAction] =
        (stats.actionDistribution[pred.predictedAction] || 0) + 1

      if (pred.confidence >= this.config.autoActionThreshold) {
        stats.highConfidenceCount++
      } else if (pred.confidence < 0.5) {
        stats.lowConfidenceCount++
      }
    }

    stats.avgConfidence = totalConfidence / predictions.length

    return stats
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const bayesianPredictor = new BayesianPredictor()

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick check if an email should be auto-archived based on Bayesian prediction
 */
export function shouldAutoArchive(
  email: Email,
  senderModel: SenderModel | null
): { should: boolean; confidence: number; reason: string } {
  const prediction = bayesianPredictor.predict(email, senderModel)

  return {
    should:
      prediction.predictedAction === 'archive' &&
      prediction.confidence >= BAYESIAN_CONFIG.autoActionThreshold,
    confidence: prediction.confidence,
    reason: prediction.reasoning
  }
}

/**
 * Get sender importance score
 */
export function getSenderImportance(senderModel: SenderModel | null): number {
  if (!senderModel) return 0.5
  return senderModel.importanceScore
}

/**
 * Check if sender should be treated as VIP based on behavior
 */
export function shouldBeVIP(senderModel: SenderModel): boolean {
  // VIP if high response rate and recent interaction
  return (
    senderModel.responseRate > 0.7 &&
    senderModel.totalEmails >= 5 &&
    bayesianPredictor.calculateTimeDecay(senderModel.lastInteraction) > 0.5
  )
}
