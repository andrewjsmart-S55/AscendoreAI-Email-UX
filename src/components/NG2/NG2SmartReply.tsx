'use client'

/**
 * NG2 Smart Reply Component
 *
 * AI-powered reply suggestions and draft generation.
 * Features:
 * - One-click quick replies
 * - Tone selection (formal, casual, friendly, professional)
 * - Custom instruction input
 * - Draft editing and refinement
 */

import React, { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  SparklesIcon,
  PencilIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Email } from '@/types/email'
import { openAIService } from '@/lib/ai/openai-service'

// =============================================================================
// Types
// =============================================================================

interface NG2SmartReplyProps {
  email: Email
  onReplyGenerated?: (draft: string) => void
  onClose?: () => void
  className?: string
}

type ToneType = 'formal' | 'casual' | 'friendly' | 'professional'

interface QuickReplyOption {
  id: string
  label: string
  instruction: string
  tone: ToneType
}

// =============================================================================
// Quick Reply Options
// =============================================================================

const QUICK_REPLIES: QuickReplyOption[] = [
  {
    id: 'acknowledge',
    label: 'Acknowledge',
    instruction: 'Acknowledge receipt and thank them',
    tone: 'professional'
  },
  {
    id: 'confirm',
    label: 'Confirm',
    instruction: 'Confirm the details and express agreement',
    tone: 'professional'
  },
  {
    id: 'decline',
    label: 'Politely Decline',
    instruction: 'Politely decline the request with a brief explanation',
    tone: 'professional'
  },
  {
    id: 'schedule',
    label: 'Schedule Meeting',
    instruction: 'Propose a meeting time and ask for their availability',
    tone: 'professional'
  },
  {
    id: 'followup',
    label: 'Follow Up',
    instruction: 'Follow up on the previous discussion and ask for an update',
    tone: 'professional'
  },
  {
    id: 'thanks',
    label: 'Thank You',
    instruction: 'Express gratitude for their help or information',
    tone: 'friendly'
  }
]

const TONE_OPTIONS: { value: ToneType; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Clear and business-appropriate' },
  { value: 'formal', label: 'Formal', description: 'Very polite and structured' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal' }
]

// =============================================================================
// Component
// =============================================================================

export function NG2SmartReply({
  email,
  onReplyGenerated,
  onClose,
  className = ''
}: NG2SmartReplyProps) {
  const [selectedTone, setSelectedTone] = useState<ToneType>('professional')
  const [customInstruction, setCustomInstruction] = useState('')
  const [generatedDraft, setGeneratedDraft] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Generate draft mutation
  const generateMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const draft = await openAIService.generateDraft({
        originalEmail: {
          from: email.from || '',
          subject: email.subject || '',
          body: email.body || ''
        },
        instructions: instruction,
        tone: selectedTone
      })
      return draft
    },
    onSuccess: (draft) => {
      setGeneratedDraft(draft)
      setIsEditing(false)
    }
  })

  // Handle quick reply click
  const handleQuickReply = useCallback((option: QuickReplyOption) => {
    setSelectedTone(option.tone)
    generateMutation.mutate(option.instruction)
  }, [generateMutation])

  // Handle custom instruction submit
  const handleCustomGenerate = useCallback(() => {
    if (customInstruction.trim()) {
      generateMutation.mutate(customInstruction)
    }
  }, [customInstruction, generateMutation])

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    const instruction = customInstruction || 'Reply appropriately to this email'
    generateMutation.mutate(instruction)
  }, [customInstruction, generateMutation])

  // Handle use draft
  const handleUseDraft = useCallback(() => {
    onReplyGenerated?.(generatedDraft)
    onClose?.()
  }, [generatedDraft, onReplyGenerated, onClose])

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Smart Reply</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick Replies */}
        {!generatedDraft && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Quick Replies</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickReply(option)}
                  disabled={generateMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-full hover:bg-purple-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tone Selection */}
        {!generatedDraft && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Tone</label>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    selectedTone === tone.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={tone.description}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Instruction */}
        {!generatedDraft && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Custom Instructions</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="e.g., Ask about the project timeline..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomGenerate()
                  }
                }}
              />
              <button
                onClick={handleCustomGenerate}
                disabled={!customInstruction.trim() || generateMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generateMutation.isPending ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SparklesIcon className="w-4 h-4" />
                )}
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {generateMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-purple-400">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm">Generating reply...</span>
            </div>
          </div>
        )}

        {/* Generated Draft */}
        {generatedDraft && !generateMutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs text-gray-400">Generated Draft</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  {selectedTone}
                </span>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={generatedDraft}
                onChange={(e) => setGeneratedDraft(e.target.value)}
                className="w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white resize-none focus:outline-none focus:border-purple-500"
              />
            ) : (
              <div className="p-3 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {generatedDraft}
              </div>
            )}

            {/* Draft Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600 flex items-center gap-1"
                >
                  <PencilIcon className="w-3 h-3" />
                  {isEditing ? 'Preview' : 'Edit'}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={generateMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    setGeneratedDraft('')
                    setIsEditing(false)
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                >
                  Start Over
                </button>
              </div>

              <button
                onClick={handleUseDraft}
                className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
              >
                <CheckIcon className="w-3 h-3" />
                Use This Draft
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {generateMutation.isError && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
            Failed to generate reply. Please try again.
          </div>
        )}
      </div>

      {/* Context Info */}
      <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ChatBubbleLeftRightIcon className="w-3 h-3" />
          <span>Replying to: {email.from}</span>
          <span className="mx-1">•</span>
          <span className="truncate">{email.subject}</span>
        </div>
      </div>
    </div>
  )
}

export default NG2SmartReply
