'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  InboxIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import ProfileSettings from './ProfileSettings'
import NotificationSettings from './NotificationSettings'
import PrivacySettings from './PrivacySettings'
import AccountSettings from './AccountSettings'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
}

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
  { id: 'accounts', label: 'Accounts', icon: InboxIcon }
]

export default function SettingsModal({ isOpen, onClose, initialTab = 'profile' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />
      case 'notifications':
        return <NotificationSettings />
      case 'privacy':
        return <PrivacySettings />
      case 'accounts':
        return <AccountSettings />
      default:
        return <ProfileSettings />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex h-[calc(90vh-80px)]">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                  <nav className="space-y-1">
                    {settingsTabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            activeTab === tab.id
                              ? 'bg-primary-100 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {tab.label}
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderTabContent()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}