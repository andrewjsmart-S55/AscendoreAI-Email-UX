'use client'

/**
 * Snooze Modal Component
 *
 * Modal for snoozing emails with:
 * - Quick preset options
 * - Custom date/time picker
 * - Smart suggestions based on email content
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
  SparklesIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Email } from '@/types/email'
import {
  useSnoozeStore,
  SNOOZE_PRESETS,
  getSmartSnoozeSuggestions,
  formatSnoozeTime
} from '@/stores/snoozeStore'
import { toast } from 'react-hot-toast'
import { logEmailAction } from '@/stores/activityStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

interface NG2SnoozeModalProps {
  isOpen: boolean
  onClose: () => void
  email: Email | null
  onSnooze?: (snoozeUntil: Date) => void
}

// =============================================================================
// Main Component
// =============================================================================

export default function NG2SnoozeModal({
  isOpen,
  onClose,
  email,
  onSnooze
}: NG2SnoozeModalProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const snoozeEmail = useSnoozeStore(state => state.snoozeEmail)
  const user = ascendoreAuth.getUser()

  // Smart suggestions based on email content
  const smartSuggestions = useMemo(() => {
    if (!email) return []
    return getSmartSnoozeSuggestions({
      subject: email.subject || '',
      body: email.body,
      from: email.from || ''
    })
  }, [email])

  const handleSnooze = (snoozeUntil: Date, reason?: string) => {
    if (!email) return

    snoozeEmail(
      {
        emailId: email.id,
        threadId: email.threadId,
        accountId: email.accountId || 'default',
        subject: email.subject || '(no subject)',
        from: email.from || 'unknown',
        originalFolder: 'inbox'
      },
      snoozeUntil,
      reason
    )

    // Log activity
    if (user?.id) {
      logEmailAction('snoozed', user.id, email, email.accountId || 'default', {
        snoozeUntil: snoozeUntil.toISOString(),
        reason
      })
    }

    onSnooze?.(snoozeUntil)
    toast.success(`Snoozed until ${formatSnoozeTime(snoozeUntil)}`)
    onClose()
  }

  const handlePresetClick = (presetId: string) => {
    const preset = SNOOZE_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      setTimeout(() => {
        handleSnooze(preset.getTime())
      }, 200)
    }
  }

  const handleCustomSnooze = () => {
    if (!customDate) {
      toast.error('Please select a date')
      return
    }

    const [hours, minutes] = customTime.split(':').map(Number)
    const date = new Date(customDate)
    date.setHours(hours, minutes, 0, 0)

    if (date <= new Date()) {
      toast.error('Please select a future time')
      return
    }

    handleSnooze(date, 'Custom reminder')
  }

  if (!isOpen || !email) return null

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Snooze Email</h2>
                <p className="text-sm text-gray-500 truncate max-w-[250px]">
                  {email.subject || '(no subject)'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Smart Suggestions */}
          {smartSuggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-3">
                <SparklesIcon className="w-4 h-4" />
                Smart Suggestions
              </div>
              <div className="space-y-2">
                {smartSuggestions.slice(0, 2).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSnooze(suggestion.preset.getTime(), suggestion.reason)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{suggestion.preset.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-purple-900">
                          {suggestion.preset.label}
                        </div>
                        <div className="text-xs text-purple-600">
                          {suggestion.reason}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-purple-500">
                      {formatSnoozeTime(suggestion.preset.getTime())}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Quick Options</div>
            <div className="grid grid-cols-2 gap-2">
              {SNOOZE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    selectedPreset === preset.id
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedPreset === preset.id ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-lg">{preset.icon}</span>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-500">
                      {formatSnoozeTime(preset.getTime())}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3 hover:text-gray-900"
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Pick Date & Time
              <motion.span
                animate={{ rotate: showCustom ? 180 : 0 }}
                className="text-gray-400"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {showCustom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs text-gray-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCustomSnooze}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Set Custom Reminder
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Snoozed emails will reappear in your inbox at the scheduled time
          </p>
        </div>
      </motion.div>
    </>
  )
}
