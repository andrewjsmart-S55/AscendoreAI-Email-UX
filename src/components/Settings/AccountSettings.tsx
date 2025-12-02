'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  InboxIcon,
  CogIcon,
  ArrowPathIcon,
  TrashIcon,
  SignalIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ClockIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { useAccounts, useAccountSettings, useUpdateAccountSettings, useTestAccountConnection, useSyncAccount, useDeleteAccount } from '@/hooks/useEmails'
import { AccountSettings as AccountSettingsType } from '@/types/email'
import DataDebugPanel from '../Debug/DataDebugPanel'

export default function AccountSettings() {
  const { data: accountsData, isLoading: accountsLoading } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [showAddAccount, setShowAddAccount] = useState(false)

  const accounts = accountsData?.accounts || []

  // Use the first account as default if none selected
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const { data: settingsData, isLoading: settingsLoading } = useAccountSettings(selectedAccountId)
  const updateSettingsMutation = useUpdateAccountSettings()
  const testConnectionMutation = useTestAccountConnection()
  const syncAccountMutation = useSyncAccount()
  const deleteAccountMutation = useDeleteAccount()

  const settings = (settingsData as any)?.settings

  const [formData, setFormData] = useState<Partial<AccountSettingsType>>({
    syncEnabled: settings?.syncEnabled || true,
    syncFrequency: settings?.syncFrequency || 15,
    maxSyncMessages: settings?.maxSyncMessages || 1000,
    downloadAttachments: settings?.downloadAttachments || true,
    autoReply: settings?.autoReply || {
      enabled: false,
      subject: 'Out of Office',
      message: 'I am currently out of the office and will respond when I return.',
    },
    forwarding: settings?.forwarding || {
      enabled: false,
      forwardTo: '',
      keepCopy: true
    },
    signature: settings?.signature || {
      enabled: true,
      htmlContent: '',
      plainContent: ''
    }
  })

  React.useEffect(() => {
    if (settings) {
      setFormData({
        syncEnabled: settings.syncEnabled,
        syncFrequency: settings.syncFrequency,
        maxSyncMessages: settings.maxSyncMessages,
        downloadAttachments: settings.downloadAttachments,
        autoReply: settings.autoReply,
        forwarding: settings.forwarding,
        signature: settings.signature
      })
    }
  }, [settings])

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = () => {
    if (selectedAccountId) {
      updateSettingsMutation.mutate({ accountId: selectedAccountId, settings: formData })
    }
  }

  const handleTestConnection = () => {
    if (selectedAccountId) {
      testConnectionMutation.mutate(selectedAccountId)
    }
  }

  const handleSync = () => {
    if (selectedAccountId) {
      syncAccountMutation.mutate(selectedAccountId)
    }
  }

  const handleDeleteAccount = () => {
    if (selectedAccountId && confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      deleteAccountMutation.mutate(selectedAccountId)
    }
  }

  const handleAddAccount = (provider: 'microsoft' | 'google' | 'imap') => {
    console.log('Adding account type:', provider)
    setShowAddAccount(false)

    // OAuth endpoints are not implemented in the current BoxZero API
    alert(`OAuth endpoints are not available in the current BoxZero API. The ${provider} OAuth endpoints return 404. Please contact the API developer to implement OAuth functionality.`)
  }

  const syncFrequencyOptions = [
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 240, label: '4 hours' },
    { value: 1440, label: '24 hours' }
  ]

  if (accountsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6 text-center">
        <InboxIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts</h3>
        <p className="text-gray-500 mb-4">Add an email account to manage its settings</p>
        <button
          onClick={() => setShowAddAccount(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Account
        </button>
      </div>
    )
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

  // Function to determine connection health
  const getConnectionHealth = (account: any) => {
    if (!account.lastSyncedAt) {
      return {
        status: 'Never Synced',
        color: 'bg-gray-400',
        textColor: 'text-gray-600',
        details: 'Account has never been synchronized'
      }
    }

    const lastSync = new Date(account.lastSyncedAt)
    const now = new Date()
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    if (account.status === 'active' && hoursSinceSync < 1) {
      return {
        status: 'Excellent',
        color: 'bg-green-500',
        textColor: 'text-green-700',
        details: 'Recently synchronized and active'
      }
    } else if (account.status === 'active' && hoursSinceSync < 24) {
      return {
        status: 'Good',
        color: 'bg-green-400',
        textColor: 'text-green-600',
        details: 'Synchronized within 24 hours'
      }
    } else if (account.status === 'active' && hoursSinceSync < 72) {
      return {
        status: 'Fair',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        details: 'Last sync more than 1 day ago'
      }
    } else if (account.status === 'active') {
      return {
        status: 'Poor',
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        details: 'Synchronization is outdated'
      }
    } else if (account.status === 'error' || account.status === 'failed') {
      return {
        status: 'Error',
        color: 'bg-red-500',
        textColor: 'text-red-700',
        details: 'Connection error - needs attention'
      }
    } else {
      return {
        status: 'Inactive',
        color: 'bg-gray-400',
        textColor: 'text-gray-600',
        details: 'Account is not active'
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Email Accounts List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Email Accounts</h3>
          <motion.button
            onClick={() => setShowAddAccount(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Email Address
          </motion.button>
        </div>

        <div className="space-y-3">
          {accounts.map((account) => {
            const connectionHealth = getConnectionHealth(account)
            const isSelected = selectedAccountId === account.id

            return (
              <motion.div
                key={account.id}
                whileHover={{ scale: 1.01 }}
                className={`p-4 border rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAccountId(account.id)}
              >
                <div className="flex items-center justify-between">
                  {/* Account Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={account.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-900">{account.email}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.provider === 'microsoft' ? 'bg-blue-100 text-blue-800' :
                          account.provider === 'google' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {account.provider === 'microsoft' ? 'Microsoft' :
                           account.provider === 'google' ? 'Google' :
                           account.provider.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600">{account.name}</p>
                        {account.lastSyncedAt && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            Last sync: {new Date(account.lastSyncedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connection Health & Actions */}
                  <div className="flex items-center gap-3">
                    {/* Health Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${connectionHealth.color}`}></div>
                      <span className={`text-sm font-medium ${connectionHealth.textColor}`}>
                        {connectionHealth.status}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTestConnection()
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Test Connection"
                      >
                        <SignalIcon className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSync()
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Sync Now"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAccountId(account.id)
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Account Settings"
                      >
                        <CogIcon className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Connection Status Details */}
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-3 pt-3 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Status</div>
                        <div className="text-xs text-gray-600 mt-1">{connectionHealth.details}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Messages</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {(account as any).messageCount || '-'} total
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Last Sync</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {selectedAccount && (
        <>
          {/* Account Info */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-lg border border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedAccount.avatar} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-medium text-gray-900">{selectedAccount.name}</h4>
                  <p className="text-sm text-gray-600">{selectedAccount.email}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedAccount.provider}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <SignalIcon className="w-4 h-4" />
                  {testConnectionMutation.isPending ? 'Testing...' : 'Test'}
                </motion.button>
                <motion.button
                  onClick={handleSync}
                  disabled={syncAccountMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  {syncAccountMutation.isPending ? 'Syncing...' : 'Sync'}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ArrowPathIcon className="w-5 h-5" />
              Sync Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Sync</h4>
                  <p className="text-sm text-gray-500">Automatically sync emails from this account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.syncEnabled}
                    onChange={(e) => handleInputChange('syncEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {formData.syncEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sync Frequency
                    </label>
                    <select
                      value={formData.syncFrequency}
                      onChange={(e) => handleInputChange('syncFrequency', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {syncFrequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Messages to Sync
                    </label>
                    <input
                      type="number"
                      value={formData.maxSyncMessages}
                      onChange={(e) => handleInputChange('maxSyncMessages', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Download Attachments</h4>
                  <p className="text-sm text-gray-500">Automatically download email attachments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.downloadAttachments}
                    onChange={(e) => handleInputChange('downloadAttachments', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Auto Reply */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5" />
              Auto Reply
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Auto Reply</h4>
                  <p className="text-sm text-gray-500">Send automatic replies to incoming emails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoReply?.enabled}
                    onChange={(e) => handleInputChange('autoReply.enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {formData.autoReply?.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.autoReply?.subject}
                      onChange={(e) => handleInputChange('autoReply.subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Out of Office"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={formData.autoReply?.message}
                      onChange={(e) => handleInputChange('autoReply.message', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="I am currently out of the office..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email Signature */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DocumentDuplicateIcon className="w-5 h-5" />
              Email Signature
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Include Signature</h4>
                  <p className="text-sm text-gray-500">Add signature to outgoing emails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signature?.enabled}
                    onChange={(e) => handleInputChange('signature.enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {formData.signature?.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signature Text
                  </label>
                  <textarea
                    value={formData.signature?.plainContent}
                    onChange={(e) => handleInputChange('signature.plainContent', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Best regards,\nYour Name\nYour Title"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Storage Information */}
          {settings?.quotaSettings && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CogIcon className="w-5 h-5" />
                Storage Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {((settings.quotaSettings.currentUsage / 1024) || 0).toFixed(1)} GB
                  </div>
                  <div className="text-sm text-gray-600">Used</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {((settings.quotaSettings.storageLimit / 1024) || 0).toFixed(1)} GB
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(((settings.quotaSettings.storageLimit - settings.quotaSettings.currentUsage) / 1024) || 0).toFixed(1)} GB
                  </div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((settings.quotaSettings.currentUsage / settings.quotaSettings.storageLimit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-900 mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 mb-4">
              These actions cannot be undone. Please proceed with caution.
            </p>
            <motion.button
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              whileHover={{ scale: deleteAccountMutation.isPending ? 1 : 1.02 }}
              whileTap={{ scale: deleteAccountMutation.isPending ? 1 : 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-4 h-4" />
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </motion.button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <motion.button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              whileHover={{ scale: updateSettingsMutation.isPending ? 1 : 1.02 }}
              whileTap={{ scale: updateSettingsMutation.isPending ? 1 : 0.98 }}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Email Account</h3>
              <button
                onClick={() => setShowAddAccount(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-6">Choose your email provider to connect a new account</p>

            <div className="space-y-3">
              <AccountTypeButton
                type="microsoft"
                name="Microsoft Outlook"
                description="Connect your Outlook.com or Office 365 account"
                icon="🏢"
                onClick={() => handleAddAccount('microsoft')}
              />
              <AccountTypeButton
                type="google"
                name="Google Gmail"
                description="Connect your Gmail account"
                icon="🌐"
                onClick={() => handleAddAccount('google')}
              />
              <AccountTypeButton
                type="imap"
                name="IMAP"
                description="Connect any email account using IMAP"
                icon="📧"
                onClick={() => handleAddAccount('imap')}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddAccount(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Debug Panel - Remove after debugging */}
      <DataDebugPanel />
    </div>
  )
}

// Account Type Button Component
function AccountTypeButton({ type, name, description, icon, onClick }: {
  type: string
  name: string
  description: string
  icon: string
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 hover:border-primary-300 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 group-hover:text-primary-600">{name}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  )
}