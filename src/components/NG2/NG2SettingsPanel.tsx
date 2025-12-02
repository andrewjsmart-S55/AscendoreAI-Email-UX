'use client'

/**
 * NG2 Settings Panel
 *
 * Comprehensive settings UI for:
 * - AI configuration
 * - Notification preferences
 * - Display settings
 * - Keyboard shortcuts
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  SparklesIcon,
  BellIcon,
  PaintBrushIcon,
  CommandLineIcon,
  ArrowPathIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import {
  useSettingsStore,
  formatShortcut,
  AISettings,
  NotificationSettings,
  DisplaySettings
} from '@/stores/settingsStore'
import { useBehaviorStore } from '@/stores/behaviorStore'
import { TRUST_TRANSITIONS } from '@/types/ai'
import { toast } from 'react-hot-toast'

// =============================================================================
// Types
// =============================================================================

interface NG2SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'ai' | 'notifications' | 'display' | 'shortcuts'
}

type TabType = 'ai' | 'notifications' | 'display' | 'shortcuts'

// =============================================================================
// Tab Components
// =============================================================================

function AISettingsTab() {
  const ai = useSettingsStore(state => state.ai)
  const updateAISettings = useSettingsStore(state => state.updateAISettings)
  const trustProfile = useBehaviorStore(state => state.trustProfile)

  const currentStage = trustProfile?.trustStage || 'training_wheels'
  const thresholds = TRUST_TRANSITIONS[currentStage]

  return (
    <div className="space-y-6">
      {/* Trust Level Display */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900">AI Trust Level</h3>
            <p className="text-sm text-gray-600">
              {currentStage === 'training_wheels' && 'Learning your preferences'}
              {currentStage === 'building_confidence' && 'Building confidence with suggestions'}
              {currentStage === 'earned_autonomy' && 'Full AI automation enabled'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(['training_wheels', 'building_confidence', 'earned_autonomy'] as const).map((stage, idx) => (
            <div
              key={stage}
              className={`flex-1 text-center p-3 rounded-lg ${
                stage === currentStage
                  ? 'bg-white shadow-sm border-2 border-purple-300'
                  : 'bg-white/50'
              }`}
            >
              <div className={`text-2xl mb-1 ${stage === currentStage ? '' : 'opacity-50'}`}>
                {idx === 0 ? '🚲' : idx === 1 ? '🚀' : '🤖'}
              </div>
              <div className={`text-xs font-medium ${
                stage === currentStage ? 'text-purple-700' : 'text-gray-500'
              }`}>
                {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Auto-approve threshold: {Math.round((thresholds?.autoApproveThreshold || 0.85) * 100)}% confidence
        </div>
      </div>

      {/* AI Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="font-medium text-gray-900">Enable AI Predictions</div>
          <div className="text-sm text-gray-500">Get smart suggestions for your emails</div>
        </div>
        <button
          onClick={() => updateAISettings({ enabled: !ai.enabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            ai.enabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            ai.enabled ? 'left-7' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Auto-Action Threshold */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium text-gray-900">Auto-Action Threshold</div>
            <div className="text-sm text-gray-500">Minimum confidence for automatic actions</div>
          </div>
          <div className="text-lg font-semibold text-purple-600">
            {Math.round(ai.autoActionThreshold * 100)}%
          </div>
        </div>
        <input
          type="range"
          min="50"
          max="99"
          value={ai.autoActionThreshold * 100}
          onChange={(e) => updateAISettings({ autoActionThreshold: parseInt(e.target.value) / 100 })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>More actions</span>
          <span>Higher accuracy</span>
        </div>
      </div>

      {/* Allowed Auto-Actions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-medium text-gray-900 mb-3">Allowed Auto-Actions</div>
        <div className="space-y-2">
          {(['archive', 'delete', 'star', 'mark_read'] as const).map((action) => (
            <label key={action} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ai.allowedAutoActions.includes(action)}
                onChange={(e) => {
                  const newActions = e.target.checked
                    ? [...ai.allowedAutoActions, action]
                    : ai.allowedAutoActions.filter(a => a !== action)
                  updateAISettings({ allowedAutoActions: newActions })
                }}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 capitalize">{action.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-3">
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-medium text-gray-900">Show Confidence Badges</div>
            <div className="text-sm text-gray-500">Display AI confidence on emails</div>
          </div>
          <input
            type="checkbox"
            checked={ai.showConfidenceBadges}
            onChange={(e) => updateAISettings({ showConfidenceBadges: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-medium text-gray-900">Show AI Reasoning</div>
            <div className="text-sm text-gray-500">Explain why AI made suggestions</div>
          </div>
          <input
            type="checkbox"
            checked={ai.showReasoning}
            onChange={(e) => updateAISettings({ showReasoning: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-medium text-gray-900">Use LLM for Complex Emails</div>
            <div className="text-sm text-gray-500">Call AI for uncertain predictions</div>
          </div>
          <input
            type="checkbox"
            checked={ai.useLLMFallback}
            onChange={(e) => updateAISettings({ useLLMFallback: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>
      </div>
    </div>
  )
}

function NotificationSettingsTab() {
  const notifications = useSettingsStore(state => state.notifications)
  const updateNotificationSettings = useSettingsStore(state => state.updateNotificationSettings)

  return (
    <div className="space-y-4">
      {[
        { key: 'desktopNotifications', label: 'Desktop Notifications', desc: 'Show system notifications' },
        { key: 'soundNotifications', label: 'Sound Notifications', desc: 'Play sound for new emails' },
        { key: 'snoozeReminders', label: 'Snooze Reminders', desc: 'Notify when snoozed emails return' },
        { key: 'streakNotifications', label: 'Streak Milestones', desc: 'Celebrate inbox zero streaks' },
        { key: 'urgentEmailNotifications', label: 'Urgent Emails', desc: 'Alert for high-priority emails' }
      ].map((item) => (
        <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-medium text-gray-900">{item.label}</div>
            <div className="text-sm text-gray-500">{item.desc}</div>
          </div>
          <input
            type="checkbox"
            checked={notifications[item.key as keyof NotificationSettings] as boolean}
            onChange={(e) => updateNotificationSettings({ [item.key]: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>
      ))}

      {/* Quiet Hours */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-medium text-gray-900 mb-3">Quiet Hours</div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-gray-500">Start</label>
            <input
              type="time"
              value={notifications.quietHoursStart || ''}
              onChange={(e) => updateNotificationSettings({ quietHoursStart: e.target.value || null })}
              className="block w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <span className="text-gray-400 mt-5">to</span>
          <div>
            <label className="text-xs text-gray-500">End</label>
            <input
              type="time"
              value={notifications.quietHoursEnd || ''}
              onChange={(e) => updateNotificationSettings({ quietHoursEnd: e.target.value || null })}
              className="block w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function DisplaySettingsTab() {
  const display = useSettingsStore(state => state.display)
  const updateDisplaySettings = useSettingsStore(state => state.updateDisplaySettings)

  return (
    <div className="space-y-4">
      {/* Density */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-medium text-gray-900 mb-3">Email List Density</div>
        <div className="flex gap-2">
          {(['compact', 'comfortable', 'spacious'] as const).map((density) => (
            <button
              key={density}
              onClick={() => updateDisplaySettings({ density })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                display.density === density
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {density.charAt(0).toUpperCase() + density.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-medium text-gray-900 mb-3">Theme</div>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateDisplaySettings({ theme })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                display.theme === theme
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {theme === 'system' ? '🌓 System' : theme === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Lines */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-gray-900">Preview Lines</div>
          <span className="text-sm text-purple-600">{display.previewLines}</span>
        </div>
        <input
          type="range"
          min="1"
          max="3"
          value={display.previewLines}
          onChange={(e) => updateDisplaySettings({ previewLines: parseInt(e.target.value) as 1 | 2 | 3 })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
      </div>

      {/* Toggles */}
      {[
        { key: 'showPreview', label: 'Show Email Preview' },
        { key: 'showThreadCount', label: 'Show Thread Count' },
        { key: 'showLabels', label: 'Show Labels' },
        { key: 'conversationView', label: 'Conversation View' }
      ].map((item) => (
        <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
          <span className="font-medium text-gray-900">{item.label}</span>
          <input
            type="checkbox"
            checked={display[item.key as keyof DisplaySettings] as boolean}
            onChange={(e) => updateDisplaySettings({ [item.key]: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>
      ))}
    </div>
  )
}

function ShortcutsTab() {
  const shortcuts = useSettingsStore(state => state.shortcuts)
  const updateShortcut = useSettingsStore(state => state.updateShortcut)

  const categories = [
    { name: 'Navigation', prefix: 'nav_' },
    { name: 'Actions', prefix: 'action_' },
    { name: 'AI', prefix: 'ai_' },
    { name: 'View', prefix: 'view_' },
    { name: 'Other', prefix: '' }
  ]

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryShortcuts = shortcuts.filter(s =>
          category.prefix ? s.id.startsWith(category.prefix) : !categories.slice(0, -1).some(c => s.id.startsWith(c.prefix))
        )

        if (categoryShortcuts.length === 0) return null

        return (
          <div key={category.name}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{category.name}</h3>
            <div className="space-y-1">
              {categoryShortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={shortcut.enabled}
                      onChange={(e) => updateShortcut(shortcut.id, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`text-sm ${shortcut.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {shortcut.description}
                    </span>
                  </div>
                  <kbd className={`px-2 py-1 text-xs font-mono rounded ${
                    shortcut.enabled ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Keyboard shortcuts are active when the email list is focused. Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">?</kbd> to see all shortcuts.
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function NG2SettingsPanel({
  isOpen,
  onClose,
  initialTab = 'ai'
}: NG2SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const resetToDefaults = useSettingsStore(state => state.resetToDefaults)

  const tabs = [
    { id: 'ai' as TabType, label: 'AI', icon: SparklesIcon },
    { id: 'notifications' as TabType, label: 'Notifications', icon: BellIcon },
    { id: 'display' as TabType, label: 'Display', icon: PaintBrushIcon },
    { id: 'shortcuts' as TabType, label: 'Shortcuts', icon: CommandLineIcon }
  ]

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetToDefaults()
      toast.success('Settings reset to defaults')
    }
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

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Reset to defaults"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'ai' && <AISettingsTab />}
          {activeTab === 'notifications' && <NotificationSettingsTab />}
          {activeTab === 'display' && <DisplaySettingsTab />}
          {activeTab === 'shortcuts' && <ShortcutsTab />}
        </div>
      </motion.div>
    </>
  )
}
