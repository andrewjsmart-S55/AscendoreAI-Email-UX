'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BellIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  AtSymbolIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useEmails'
import { NotificationSettings as NotificationSettingsType } from '@/types/email'

export default function NotificationSettings() {
  const { data: notificationData, isLoading } = useNotificationSettings()
  const updateNotificationsMutation = useUpdateNotificationSettings()

  const notifications = (notificationData as any)?.notifications

  const [formData, setFormData] = useState<NotificationSettingsType>({
    emailNotifications: notifications?.emailNotifications || true,
    pushNotifications: notifications?.pushNotifications || true,
    desktopNotifications: notifications?.desktopNotifications || false,
    soundNotifications: notifications?.soundNotifications || true,
    notifyOnImportant: notifications?.notifyOnImportant || true,
    notifyOnMentions: notifications?.notifyOnMentions || true,
    digestFrequency: notifications?.digestFrequency || 'hourly',
    quietHours: notifications?.quietHours || {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  })

  React.useEffect(() => {
    if (notifications) {
      setFormData(notifications)
    }
  }, [notifications])

  const handleToggle = (field: keyof NotificationSettingsType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleQuietHoursChange = (field: 'enabled' | 'start' | 'end', value: any) => {
    setFormData(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [field]: value }
    }))
  }

  const handleSave = () => {
    updateNotificationsMutation.mutate(formData)
  }

  const digestOptions = [
    { value: 'realtime', label: 'Real-time', description: 'Get notified immediately' },
    { value: 'hourly', label: 'Hourly', description: 'Summary every hour' },
    { value: 'daily', label: 'Daily', description: 'Daily digest at 9 AM' },
    { value: 'weekly', label: 'Weekly', description: 'Weekly summary on Monday' },
    { value: 'never', label: 'Never', description: 'No email notifications' }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BellIcon className="w-5 h-5" />
          Notification Preferences
        </h3>

        {/* Toggle Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <BellIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <DevicePhoneMobileIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-500">Get push notifications on your mobile device</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pushNotifications}
                onChange={(e) => handleToggle('pushNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <ComputerDesktopIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Desktop Notifications</h4>
                <p className="text-sm text-gray-500">Show notifications on your desktop</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.desktopNotifications}
                onChange={(e) => handleToggle('desktopNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <SpeakerWaveIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Sound Notifications</h4>
                <p className="text-sm text-gray-500">Play sound when receiving notifications</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundNotifications}
                onChange={(e) => handleToggle('soundNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Special Notifications */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Special Notifications</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-gray-900">Important Emails</h4>
                <p className="text-sm text-gray-500">Get notified for emails marked as important</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyOnImportant}
                onChange={(e) => handleToggle('notifyOnImportant', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <AtSymbolIcon className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">Mentions</h4>
                <p className="text-sm text-gray-500">Get notified when you're mentioned in emails</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyOnMentions}
                onChange={(e) => handleToggle('notifyOnMentions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Digest Frequency */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Digest</h3>
        <div className="space-y-3">
          {digestOptions.map((option) => (
            <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="digestFrequency"
                value={option.value}
                checked={formData.digestFrequency === option.value}
                onChange={(e) => handleToggle('digestFrequency', e.target.value)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Quiet Hours
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Enable Quiet Hours</h4>
              <p className="text-sm text-gray-500">Disable notifications during specified hours</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.quietHours.enabled}
                onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {formData.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.quietHours.start}
                  onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.quietHours.end}
                  onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <motion.button
          onClick={handleSave}
          disabled={updateNotificationsMutation.isPending}
          whileHover={{ scale: updateNotificationsMutation.isPending ? 1 : 1.02 }}
          whileTap={{ scale: updateNotificationsMutation.isPending ? 1 : 0.98 }}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateNotificationsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  )
}