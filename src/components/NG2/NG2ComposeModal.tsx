'use client'

/**
 * NG2 Compose Modal with AI Draft Generation
 *
 * Features:
 * - AI-powered draft generation
 * - Multiple tone options
 * - Draft refinement
 * - Smart reply suggestions
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  AtSymbolIcon,
  MinusIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Email, EmailCompose } from '@/types/email'
import { toast } from 'react-hot-toast'
import { useSendEmail, useAccounts } from '@/hooks/useEmails'
import { logEmailAction } from '@/stores/activityStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

interface NG2ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: Email
  forwardEmail?: Email
}

type ToneOption = 'professional' | 'casual' | 'friendly' | 'formal' | 'concise'

interface AIState {
  isGenerating: boolean
  hasDraft: boolean
  tone: ToneOption
  instructions: string
  error: string | null
}

// =============================================================================
// Tone Options
// =============================================================================

const TONE_OPTIONS: { id: ToneOption; label: string; description: string }[] = [
  { id: 'professional', label: 'Professional', description: 'Clear and business-appropriate' },
  { id: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and personable' },
  { id: 'formal', label: 'Formal', description: 'Very structured and official' },
  { id: 'concise', label: 'Concise', description: 'Brief and to the point' }
]

// =============================================================================
// Main Component
// =============================================================================

export default function NG2ComposeModal({
  isOpen,
  onClose,
  replyTo,
  forwardEmail
}: NG2ComposeModalProps) {
  // API hooks
  const sendEmailMutation = useSendEmail()
  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.accounts || []

  const [isMinimized, setIsMinimized] = useState(false)
  const [compose, setCompose] = useState<EmailCompose>({
    to: replyTo ? [replyTo.from] : [],
    cc: [],
    bcc: [],
    subject: replyTo
      ? `Re: ${replyTo.subject}`
      : forwardEmail
      ? `Fwd: ${forwardEmail.subject}`
      : '',
    body: '',
    attachments: [],
    accountId: accounts.find((acc: any) => acc.isDefault)?.id || accounts[0]?.id || '',
  })

  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(!!replyTo)
  const [showToneDropdown, setShowToneDropdown] = useState(false)

  // AI state
  const [aiState, setAIState] = useState<AIState>({
    isGenerating: false,
    hasDraft: false,
    tone: 'professional',
    instructions: '',
    error: null
  })

  // Reset form when replyTo changes
  useEffect(() => {
    if (replyTo) {
      setCompose(prev => ({
        ...prev,
        to: [replyTo.from],
        subject: `Re: ${replyTo.subject}`,
        body: ''
      }))
      setShowAIPanel(true)
    }
  }, [replyTo])

  // Generate AI draft
  const handleGenerateDraft = async () => {
    if (!replyTo) {
      toast.error('AI drafts are available when replying to an email')
      return
    }

    setAIState(prev => ({ ...prev, isGenerating: true, error: null }))

    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: replyTo.from,
          subject: replyTo.subject,
          body: replyTo.body || '',
          instructions: aiState.instructions || 'Reply appropriately',
          tone: aiState.tone
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate draft')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setCompose(prev => ({ ...prev, body: data.draft }))
      setAIState(prev => ({ ...prev, hasDraft: true, isGenerating: false }))
      toast.success('Draft generated!')
    } catch (error) {
      console.error('Draft generation error:', error)
      setAIState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate draft'
      }))
      toast.error('Failed to generate draft')
    }
  }

  // Regenerate with different tone
  const handleRegenerateDraft = async () => {
    setAIState(prev => ({ ...prev, hasDraft: false }))
    await handleGenerateDraft()
  }

  const handleSend = async () => {
    if (!compose.to.length || !compose.subject.trim() || !compose.body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await sendEmailMutation.mutateAsync({
        to: compose.to,
        cc: compose.cc?.length ? compose.cc : undefined,
        bcc: compose.bcc?.length ? compose.bcc : undefined,
        subject: compose.subject,
        body: compose.body,
        attachments: compose.attachments?.length ? compose.attachments as unknown as File[] : undefined,
      })

      // Log the activity
      const user = ascendoreAuth.getUser()
      if (user?.id && replyTo) {
        logEmailAction('replied', user.id, {
          id: replyTo.id,
          subject: replyTo.subject,
          from: replyTo.from
        }, compose.accountId || 'default', {
          aiAssisted: aiState.hasDraft
        })
      }

      onClose()

      // Reset form
      setCompose({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        body: '',
        attachments: [],
        accountId: accounts.find((acc: any) => acc.isDefault)?.id || accounts[0]?.id || '',
      })
      setAIState({
        isGenerating: false,
        hasDraft: false,
        tone: 'professional',
        instructions: '',
        error: null
      })
    } catch (error) {
      console.error('Failed to send email:', error)
    }
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved')
  }

  const addRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    const fieldValue = compose[field] || []
    if (email.trim() && !fieldValue.includes(email.trim())) {
      setCompose(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), email.trim()]
      }))
    }
  }

  const removeRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    setCompose(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(e => e !== email)
    }))
  }

  const RecipientField = ({
    field,
    label,
    placeholder
  }: {
    field: 'to' | 'cc' | 'bcc'
    label: string
    placeholder: string
  }) => {
    const [inputValue, setInputValue] = useState('')

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
        e.preventDefault()
        addRecipient(field, inputValue)
        setInputValue('')
      }
    }

    return (
      <div className="flex items-start gap-3 py-2 border-b border-gray-100">
        <label className="text-sm text-gray-600 w-12 mt-2 font-medium">
          {label}:
        </label>
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {(compose[field] || []).map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm"
              >
                {email}
                <button
                  onClick={() => removeRecipient(field, email)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addRecipient(field, inputValue)
                setInputValue('')
              }
            }}
            placeholder={placeholder}
            className="w-full text-sm focus:outline-none"
          />
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: isMinimized ? 0.8 : 1
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed z-50 bg-white rounded-lg shadow-2xl border flex flex-col ${
            isMinimized
              ? 'bottom-4 right-4 w-80 h-12'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-3xl h-[85vh] max-h-[700px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {replyTo ? 'Reply' : forwardEmail ? 'Forward' : 'New Message'}
              </h2>
              {aiState.hasDraft && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  <SparklesIcon className="w-3 h-3" />
                  AI Draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Main Compose Area */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Recipients */}
                <div className="px-6 py-2 flex-shrink-0">
                  {/* Account Selector */}
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <label className="text-sm text-gray-600 w-12 font-medium">From:</label>
                    <select
                      value={compose.accountId}
                      onChange={(e) => setCompose(prev => ({ ...prev, accountId: e.target.value }))}
                      className="flex-1 text-sm focus:outline-none"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <RecipientField field="to" label="To" placeholder="Enter email addresses..." />

                  {showCc && (
                    <RecipientField field="cc" label="Cc" placeholder="Enter CC recipients..." />
                  )}

                  {showBcc && (
                    <RecipientField field="bcc" label="Bcc" placeholder="Enter BCC recipients..." />
                  )}

                  <div className="flex items-center gap-4 py-2">
                    {!showCc && (
                      <button
                        onClick={() => setShowCc(true)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        onClick={() => setShowBcc(true)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Bcc
                      </button>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <label className="text-sm text-gray-600 w-12 font-medium">Subject:</label>
                    <input
                      type="text"
                      value={compose.subject}
                      onChange={(e) => setCompose(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter subject..."
                      className="flex-1 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 px-6 min-h-0 overflow-hidden">
                  <textarea
                    value={compose.body}
                    onChange={(e) => setCompose(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Write your message..."
                    className="w-full h-full resize-none focus:outline-none text-sm leading-relaxed py-4 overflow-y-auto"
                  />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                      <PaperClipIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                      <FaceSmileIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                      <AtSymbolIcon className="w-4 h-4" />
                    </button>

                    {/* AI Toggle */}
                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                    <button
                      onClick={() => setShowAIPanel(!showAIPanel)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        showAIPanel
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <SparklesIcon className="w-4 h-4" />
                      AI Assist
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      Save Draft
                    </button>
                    <motion.button
                      onClick={handleSend}
                      disabled={sendEmailMutation.isPending}
                      whileHover={{ scale: sendEmailMutation.isPending ? 1 : 1.02 }}
                      whileTap={{ scale: sendEmailMutation.isPending ? 1 : 0.98 }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendEmailMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                      )}
                      {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* AI Panel */}
              <AnimatePresence>
                {showAIPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center gap-2 mb-1">
                        <SparklesIcon className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">AI Draft</h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        Let AI help you write a response
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Original Email Preview */}
                      {replyTo && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="text-xs text-gray-500 mb-1">Replying to:</div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {replyTo.from}
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {replyTo.subject}
                          </div>
                        </div>
                      )}

                      {/* Tone Selector */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                          Tone
                        </label>
                        <div className="relative">
                          <button
                            onClick={() => setShowToneDropdown(!showToneDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
                          >
                            <span>{TONE_OPTIONS.find(t => t.id === aiState.tone)?.label}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showToneDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          {showToneDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                              {TONE_OPTIONS.map((tone) => (
                                <button
                                  key={tone.id}
                                  onClick={() => {
                                    setAIState(prev => ({ ...prev, tone: tone.id }))
                                    setShowToneDropdown(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                                    aiState.tone === tone.id ? 'bg-purple-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {aiState.tone === tone.id && (
                                      <CheckIcon className="w-4 h-4 text-purple-600" />
                                    )}
                                    <div className={aiState.tone === tone.id ? '' : 'ml-6'}>
                                      <div className="text-sm font-medium text-gray-900">{tone.label}</div>
                                      <div className="text-xs text-gray-500">{tone.description}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Instructions */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                          Instructions (optional)
                        </label>
                        <textarea
                          value={aiState.instructions}
                          onChange={(e) => setAIState(prev => ({ ...prev, instructions: e.target.value }))}
                          placeholder="E.g., Confirm the meeting, ask for more details..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Error Message */}
                      {aiState.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          {aiState.error}
                        </div>
                      )}

                      {/* Generate Button */}
                      <button
                        onClick={aiState.hasDraft ? handleRegenerateDraft : handleGenerateDraft}
                        disabled={aiState.isGenerating || !replyTo}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiState.isGenerating ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : aiState.hasDraft ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4" />
                            Regenerate
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-4 h-4" />
                            Generate Draft
                          </>
                        )}
                      </button>

                      {!replyTo && (
                        <p className="text-xs text-gray-500 text-center">
                          AI drafts are available when replying to an email
                        </p>
                      )}

                      {/* Quick Suggestions */}
                      {replyTo && !aiState.hasDraft && (
                        <div className="pt-2">
                          <div className="text-xs font-medium text-gray-700 mb-2">Quick suggestions:</div>
                          <div className="space-y-2">
                            {[
                              'Confirm receipt and timeline',
                              'Request more information',
                              'Politely decline',
                              'Schedule a follow-up'
                            ].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => {
                                  setAIState(prev => ({ ...prev, instructions: suggestion }))
                                }}
                                className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
