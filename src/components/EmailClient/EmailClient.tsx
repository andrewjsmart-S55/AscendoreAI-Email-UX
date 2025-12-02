'use client'


import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import NavigationRail from './NavigationRail'
import Sidebar from './Sidebar'
import SearchBar from './SearchBar'
import ThreadView from './ThreadView'
import ThreadPanel from './ThreadPanel'
import ComposeModal from './ComposeModal'
import HomeView from './HomeView'
import SettingsModal from '../Settings/SettingsModal'
import { Email, EmailThread } from '@/types/email'
import { useStarEmail, useArchiveEmail, useDeleteEmail } from '@/hooks/useEmails'
// import AuthDebugPanel from '../Debug/AuthDebugPanel'
// import { usePubSubEmails } from '@/hooks/usePubSubEmails'

export default function EmailClient() {
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [selectedRailItem, setSelectedRailItem] = useState('mail')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>()
  const [replyToEmail, setReplyToEmail] = useState<Email>()
  const [forwardEmail, setForwardEmail] = useState<Email>()
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false)

  // API mutations
  const starMutation = useStarEmail()
  const archiveMutation = useArchiveEmail()
  const deleteMutation = useDeleteEmail()

  // Real-time email updates via PubSub - temporarily disabled for debugging
  // const { connectionStatus, isConnected, lastMessage, reconnectPubSub } = usePubSubEmails()

  // Log PubSub connection status for debugging
  // useEffect(() => {
  //   console.log('📡 PubSub Connection Status:', connectionStatus)
  //   console.log('🔌 Is Connected:', isConnected)
  //   if (lastMessage) {
  //     console.log('📨 Last PubSub Message:', lastMessage)
  //   }
  // }, [connectionStatus, isConnected, lastMessage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Compose shortcut (Cmd/Ctrl + N)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setIsComposeOpen(true)
      }

      // Search shortcut (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Search emails..."]') as HTMLInputElement
        searchInput?.focus()
      }

      // Theme shortcut (Cmd/Ctrl + T)
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        handleSettingsOpen('themes')
      }

      // Settings shortcut (Cmd/Ctrl + ,)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen(true)
      }

      // Navigation shortcuts
      if (e.key === 'Escape') {
        setIsComposeOpen(false)
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleThreadSelect = (thread: EmailThread) => {
    setSelectedThread(thread)
    setIsThreadPanelOpen(true)
  }

  const handleCloseThreadPanel = () => {
    setIsThreadPanelOpen(false)
    // Keep the thread selected for a moment to allow animation
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
    // For now, assume we're starring it. In a real app, you'd track the current state
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
    // Handle AI prompt functionality
    toast.success(`AI processing: ${prompt}`)
  }

  const handleSettingsOpen = (tab?: string) => {
    setSettingsInitialTab(tab)
    setIsSettingsOpen(true)
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Navigation Rail */}
      <NavigationRail
        selectedItem={selectedRailItem}
        onItemSelect={setSelectedRailItem}
      />
      
      {/* Sidebar - Always visible for email management */}
      <Sidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        selectedAccount={selectedAccount}
        onAccountSelect={setSelectedAccount}
        onThemeToggle={() => handleSettingsOpen('themes')}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAIPrompt={handleAIPrompt}
          onCompose={handleCompose}
          isThreadPanelOpen={isThreadPanelOpen}
          onSettingsOpen={handleSettingsOpen}
        />

        {/* Content based on selected rail item */}
        {selectedRailItem === 'home' ? (
          <HomeView />
        ) : selectedRailItem === 'mail' ? (
          <ThreadView
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
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-700 capitalize">
                {selectedRailItem.replace('-', ' ')} Coming Soon
              </h2>
              <p className="text-gray-500">
                This feature is under development
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={handleCloseCompose}
        replyTo={replyToEmail}
        forwardEmail={forwardEmail}
      />

      {/* Thread Panel - WhatsApp Style */}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />

      {/* Authentication Debug Panel - Temporarily disabled due to loading issues */}
      {/* <AuthDebugPanel /> */}
    </div>
  )
}