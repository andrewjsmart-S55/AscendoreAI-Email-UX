'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheckIcon,
  EyeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { usePrivacySettings, useUpdatePrivacySettings } from '@/hooks/useEmails'
import { PrivacySettings as PrivacySettingsType } from '@/types/email'

export default function PrivacySettings() {
  const { data: privacyData, isLoading } = usePrivacySettings()
  const updatePrivacyMutation = useUpdatePrivacySettings()

  const privacy = (privacyData as any)?.privacy

  const [formData, setFormData] = useState<PrivacySettingsType>({
    showOnlineStatus: privacy?.showOnlineStatus || true,
    allowReadReceipts: privacy?.allowReadReceipts || true,
    shareAnalytics: privacy?.shareAnalytics || false,
    showInDirectory: privacy?.showInDirectory || true
  })

  React.useEffect(() => {
    if (privacy) {
      setFormData(privacy)
    }
  }, [privacy])

  const handleToggle = (field: keyof PrivacySettingsType, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updatePrivacyMutation.mutate(formData)
  }

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
          <ShieldCheckIcon className="w-5 h-5" />
          Privacy Settings
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Control what information is shared and how others can interact with you.
        </p>

        {/* Privacy Options */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <EyeIcon className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Show Online Status</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Allow others to see when you're online and active
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showOnlineStatus}
                  onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <ChartBarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Read Receipts</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Send read receipts to let senders know when you've read their emails
                  </p>
                  <div className="mt-2 p-2 bg-blue-100 rounded-md">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> Disabling this also prevents you from seeing read receipts from others
                    </p>
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowReadReceipts}
                  onChange={(e) => handleToggle('allowReadReceipts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <ChartBarIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Share Analytics</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Help improve BoxZero by sharing anonymous usage analytics
                  </p>
                  <div className="mt-2 p-2 bg-purple-100 rounded-md">
                    <p className="text-xs text-purple-700">
                      All data is anonymized and used only for product improvement
                    </p>
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shareAnalytics}
                  onChange={(e) => handleToggle('shareAnalytics', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <UserGroupIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Show in Directory</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Allow your profile to appear in the organization directory
                  </p>
                  <div className="mt-2 p-2 bg-green-100 rounded-md">
                    <p className="text-xs text-green-700">
                      This helps colleagues find and contact you within your organization
                    </p>
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showInDirectory}
                  onChange={(e) => handleToggle('showInDirectory', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data Protection Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data Protection</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>Your data is protected:</strong> We use industry-standard encryption to protect your information.
              </p>
              <p>
                <strong>Data retention:</strong> Your data is retained only as long as necessary for service operation.
              </p>
              <p>
                <strong>Data portability:</strong> You can export your data at any time from your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Actions */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Actions</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="font-medium text-gray-900">Download Your Data</div>
            <div className="text-sm text-gray-500 mt-1">
              Export all your personal data in a portable format
            </div>
          </button>

          <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="font-medium text-gray-900">View Privacy Policy</div>
            <div className="text-sm text-gray-500 mt-1">
              Read our complete privacy policy and terms of service
            </div>
          </button>

          <button className="w-full text-left p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600">
            <div className="font-medium">Delete Account</div>
            <div className="text-sm text-red-500 mt-1">
              Permanently delete your account and all associated data
            </div>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <motion.button
          onClick={handleSave}
          disabled={updatePrivacyMutation.isPending}
          whileHover={{ scale: updatePrivacyMutation.isPending ? 1 : 1.02 }}
          whileTap={{ scale: updatePrivacyMutation.isPending ? 1 : 0.98 }}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updatePrivacyMutation.isPending ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  )
}