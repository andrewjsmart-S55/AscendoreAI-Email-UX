'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import NG2ChatTab from './NG2ChatTab'
import NG2DashboardTab from './NG2DashboardTab'
import NG2Sidebar from './NG2Sidebar'
import NG2ActionQueue, { useActionQueueStore } from './NG2ActionQueue'
import NG2ActivityFeed from './NG2ActivityFeed'
import NG2ComposeModal from './NG2ComposeModal'
import NG2SnoozeModal from './NG2SnoozeModal'
import NG2SettingsPanel from './NG2SettingsPanel'
import NG2ThreadView from './NG2ThreadView'
import NG2AnalyticsDashboard from './NG2AnalyticsDashboard'
import NG2LabelManager from './NG2LabelManager'
import NG2AITester from './NG2AITester'
import AccountSelector from '../EmailClient/AccountSelector'
import Sidebar from '../EmailClient/Sidebar'
import SearchBar from '../EmailClient/SearchBar'
import ThreadPanel from '../EmailClient/ThreadPanel'
import HomeView from '../EmailClient/HomeView'
import SettingsModal from '../Settings/SettingsModal'
import { Email, EmailThread } from '@/types/email'
import { useStarEmail, useArchiveEmail, useDeleteEmail } from '@/hooks/useEmails'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useUndoStore, setupUndoKeyboardShortcut } from '@/stores/undoStore'
// Note: undoStore.tsx contains JSX for toast UI
import { useLabelStore } from '@/stores/labelStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

type TabType = 'chat' | 'dashboard' | 'queue' | 'activity' | 'analytics'
type ViewType = 'home' | 'mail' | 'accounts' | 'chat' | 'pinned' | 'settings'

export default function NG2TabbedInterface() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [activeView, setActiveView] = useState<ViewType>('mail')
  const [selectedAccount, setSelectedAccount] = useState<string>('all')

  // Mail state
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>()
  const [replyToEmail, setReplyToEmail] = useState<Email>()
  const [forwardEmail, setForwardEmail] = useState<Email>()
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false)
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false)
  const [snoozeEmail, setSnoozeEmail] = useState<Email | null>(null)
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false)
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false)

  // API mutations
  const starMutation = useStarEmail()
  const archiveMutation = useArchiveEmail()
  const deleteMutation = useDeleteEmail()

  // Undo store
  const undoLatest = useUndoStore(state => state.undoLatest)
  const pushUndoAction = useUndoStore(state => state.pushAction)

  // Label store - initialize system labels
  const initializeLabels = useLabelStore(state => state.initializeSystemLabels)

  // Initialize undo keyboard shortcut and labels
  useEffect(() => {
    const cleanup = setupUndoKeyboardShortcut()

    // Initialize system labels for user
    const user = ascendoreAuth.getUser()
    if (user?.id) {
      initializeLabels(user.id)
    }

    return cleanup
  }, [initializeLabels])

  // Mail handlers
  const handleThreadSelect = (thread: EmailThread) => {
    setSelectedThread(thread)
    setIsThreadPanelOpen(true)
  }

  const handleCloseThreadPanel = () => {
    setIsThreadPanelOpen(false)
    setTimeout(() => setSelectedThread(null), 300)
  }

  const handleReply = (email: Email) => {
    setReplyToEmail(email)
    setForwardEmail(undefined)
    setIsComposeOpen(true)
  }

  const handleForward = (email: Email) => {
    setForwardEmail(email)
    setReplyToEmail(undefined)
    setIsComposeOpen(true)
  }

  const handleDelete = (emailId: string) => {
    deleteMutation.mutate({ emailId })
  }

  const handleArchive = (emailId: string) => {
    archiveMutation.mutate({ emailId })
  }

  const handleStar = (emailId: string) => {
    starMutation.mutate({ emailId, starred: true })
  }

  const handleCompose = () => {
    setReplyToEmail(undefined)
    setForwardEmail(undefined)
    setIsComposeOpen(true)
  }

  const handleCloseCompose = () => {
    setIsComposeOpen(false)
    setReplyToEmail(undefined)
    setForwardEmail(undefined)
  }

  const handleAIPrompt = (prompt: string) => {
    toast.success(`AI processing: ${prompt}`)
  }

  const handleSettingsOpen = (tab?: string) => {
    setSettingsInitialTab(tab)
    setIsSettingsOpen(true)
  }

  const handleSnooze = (email: Email) => {
    setSnoozeEmail(email)
    setIsSnoozeOpen(true)
  }

  const handleCloseSnooze = () => {
    setIsSnoozeOpen(false)
    setSnoozeEmail(null)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: activeView === 'mail',
    handlers: {
      onCompose: handleCompose,
      onArchive: () => {
        if (selectedThread?.emails?.[0]) {
          archiveMutation.mutate({ emailId: selectedThread.emails[0].id })
        }
      },
      onDelete: () => {
        if (selectedThread?.emails?.[0]) {
          deleteMutation.mutate({ emailId: selectedThread.emails[0].id })
        }
      },
      onStar: () => {
        if (selectedThread?.emails?.[0]) {
          starMutation.mutate({ emailId: selectedThread.emails[0].id, starred: !selectedThread.isStarred })
        }
      },
      onReply: () => {
        if (selectedThread?.emails) {
          handleReply(selectedThread.emails[selectedThread.emails.length - 1])
        }
      },
      onSnooze: () => {
        if (selectedThread?.emails) {
          handleSnooze(selectedThread.emails[selectedThread.emails.length - 1])
        }
      },
      onClosePanel: handleCloseThreadPanel,
      onGoInbox: () => setSelectedFolder('inbox'),
      onGoStarred: () => setSelectedFolder('starred'),
      onUndo: () => {
        undoLatest().then(success => {
          if (!success) {
            toast.error('Nothing to undo')
          }
        })
      }
    }
  })

  // Action queue store for badge counts
  const queueItems = useActionQueueStore(state => state.items)
  const pendingCount = queueItems.filter(i => i.status === 'pending').length

  const tabs = [
    {
      id: 'chat' as TabType,
      name: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      description: 'AI Email Assistant',
      badge: null
    },
    {
      id: 'dashboard' as TabType,
      name: 'Dashboard',
      icon: ChartBarIcon,
      description: 'Inbox Zero Insights',
      badge: null
    },
    {
      id: 'queue' as TabType,
      name: 'AI Queue',
      icon: SparklesIcon,
      description: 'Review AI Suggestions',
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      id: 'activity' as TabType,
      name: 'Activity',
      icon: ClockIcon,
      description: 'Action History',
      badge: null
    },
    {
      id: 'analytics' as TabType,
      name: 'Analytics',
      icon: ChartPieIcon,
      description: 'Email Insights',
      badge: null
    }
  ]

  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    // If switching to chat/dashboard views, maintain current tab
    if (view === 'chat') {
      setActiveTab('chat')
    }
  }

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId)
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />

      case 'mail':
        return (
          <div className="flex-1 flex overflow-hidden">
            {/* Mail Sidebar */}
            <Sidebar
              selectedFolder={selectedFolder}
              onFolderSelect={setSelectedFolder}
              selectedAccount={selectedAccount}
              onAccountSelect={setSelectedAccount}
              onThemeToggle={() => handleSettingsOpen('themes')}
            />

            {/* Mail Content - Use AI-Enhanced NG2ThreadView */}
            <NG2ThreadView
              selectedFolder={selectedFolder}
              selectedAccount={selectedAccount}
              searchQuery={searchQuery}
              onThreadSelect={handleThreadSelect}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onStar={handleStar}
              onCompose={handleCompose}
              onSnooze={handleSnooze}
              onOpenLabels={() => setIsLabelManagerOpen(true)}
            />

            {/* Thread Panel */}
            <ThreadPanel
              thread={selectedThread}
              isOpen={isThreadPanelOpen}
              onClose={handleCloseThreadPanel}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onStar={handleStar}
              selectedFolder={selectedFolder}
            />
          </div>
        )

      case 'accounts':
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Selection</h1>
                <p className="text-gray-600">Choose an email account type or individual email address</p>
              </div>
              <AccountSelector
                selectedAccount={selectedAccount}
                onAccountSelect={setSelectedAccount}
              />
              {selectedAccount && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Selected Account</h3>
                  <p className="text-sm text-blue-700">
                    {selectedAccount === 'all'
                      ? 'All accounts selected'
                      : selectedAccount.startsWith('type:')
                      ? `${selectedAccount.replace('type:', '')} account type selected`
                      : `Individual account: ${selectedAccount}`
                    }
                  </p>
                  <button
                    onClick={() => {
                      setActiveView('mail')
                    }}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    Continue to Mail
                  </button>
                </div>
              )}
            </div>
          </div>
        )

      case 'chat':
        return (
          <div className="h-full flex flex-col">
            {/* Header with Tab Navigation and User Section - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6">
              <div className="flex justify-between items-start mb-4">
                {/* Tab Navigation */}
                <div className="flex space-x-8">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative pb-4 px-1 flex items-center gap-2 transition-colors ${
                          activeTab === tab.id
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.name}</span>
                        {tab.badge && (
                          <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-purple-600 text-white">
                            {tab.badge}
                          </span>
                        )}
                        {activeTab === tab.id && (
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                            layoutId="activeTab"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* User Profile and Progress Widget */}
                <div className="flex items-center gap-4">
                  {/* Progress Widget */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg px-4 py-2 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">24</span>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">75% to zero</div>
                        <div className="text-xs text-gray-600">12-day streak</div>
                      </div>
                    </div>
                  </div>

                  {/* User Profile */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">Andrew Smart</div>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">AS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && <NG2ChatTab />}
              {activeTab === 'dashboard' && <NG2DashboardTab />}
              {activeTab === 'queue' && (
                <NG2ActionQueue
                  items={queueItems}
                  onApprove={async (itemId) => {
                    const store = useActionQueueStore.getState()
                    store.updateStatus(itemId, 'approved')
                    // TODO: Execute the actual action
                    toast.success('Action approved')
                  }}
                  onReject={async (itemId) => {
                    const store = useActionQueueStore.getState()
                    store.updateStatus(itemId, 'rejected')
                    toast.success('Action rejected')
                  }}
                  onModify={async (itemId, newAction) => {
                    const store = useActionQueueStore.getState()
                    const item = store.getItemById(itemId)
                    if (item) {
                      // Update the prediction with new action
                      store.updateStatus(itemId, 'approved')
                      toast.success(`Changed to ${newAction}`)
                    }
                  }}
                  onApproveAll={async () => {
                    const store = useActionQueueStore.getState()
                    const pending = store.getPendingItems()
                    const highConfidence = pending.filter(
                      i => i.prediction.finalPrediction.confidence >= 0.85
                    )
                    highConfidence.forEach(item => {
                      store.updateStatus(item.id, 'approved')
                    })
                    toast.success(`Approved ${highConfidence.length} high-confidence actions`)
                  }}
                />
              )}
              {activeTab === 'activity' && <NG2ActivityFeed />}
              {activeTab === 'analytics' && <NG2AnalyticsDashboard />}
            </div>
          </div>
        )

      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h2>
              <p className="text-gray-600">This view is coming soon!</p>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        {/* Left Sidebar Rail - Fixed */}
        <div className="flex-shrink-0">
          <NG2Sidebar activeView={activeView} onViewChange={handleViewChange} />
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {renderMainContent()}
        </div>
      </div>

      {/* AI-Powered Compose Modal */}
      <NG2ComposeModal
        isOpen={isComposeOpen}
        onClose={handleCloseCompose}
        replyTo={replyToEmail}
        forwardEmail={forwardEmail}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />

      {/* AI Settings Panel */}
      <NG2SettingsPanel
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        initialTab="ai"
      />

      {/* Snooze Modal */}
      <NG2SnoozeModal
        isOpen={isSnoozeOpen}
        onClose={handleCloseSnooze}
        email={snoozeEmail}
        onSnooze={(snoozeUntil) => {
          toast.success(`Email snoozed until ${snoozeUntil.toLocaleString()}`)
        }}
      />

      {/* Label Manager Modal */}
      <NG2LabelManager
        isOpen={isLabelManagerOpen}
        onClose={() => setIsLabelManagerOpen(false)}
      />

      {/* AI Tester (Dev Mode) - Floating button in bottom right */}
      <NG2AITester />
    </>
  )
}