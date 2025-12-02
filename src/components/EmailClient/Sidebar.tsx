'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  FolderOpenIcon,
  FolderIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  InboxIcon as InboxSolid,
  StarIcon as StarSolid,
  ExclamationCircleIcon as ExclamationSolid
} from '@heroicons/react/24/solid'
import { InboxStats } from '@/types/email'
import AccountSelector from './AccountSelector'
import { useFolders, useAccounts } from '@/hooks/useEmails'

interface SidebarProps {
  selectedFolder: string
  onFolderSelect: (folderId: string) => void
  selectedAccount: string
  onAccountSelect: (accountId: string) => void
  onThemeToggle: () => void
}

export default function Sidebar({
  selectedFolder,
  onFolderSelect,
  selectedAccount,
  onAccountSelect,
  onThemeToggle
}: SidebarProps) {

  // API data - get accounts for fallback
  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.accounts || []

  // Determine which account ID to use for folders
  const accountIdForFolders = selectedAccount !== 'all' && !selectedAccount.startsWith('type:')
    ? selectedAccount
    : accounts.find((acc: any) => acc.email === 'andrew@boxzero.io')?.id || accounts[0]?.id

  const { data: foldersData, isLoading: foldersLoading } = useFolders(accountIdForFolders)

  // Get inbox stats from actual folder data
  const getInboxStats = (): InboxStats => {
    const folders = (foldersData as any)?.folders || []
    const inboxFolder = folders.find((f: any) => f.name?.toLowerCase() === 'inbox')
    const totalEmails = folders.reduce((sum: number, f: any) => sum + (f.count || 0), 0)
    const selectedAcc = accounts.find((acc: any) => acc.id === accountIdForFolders)

    return {
      accountName: selectedAcc?.email || 'All Accounts',
      totalEmails: totalEmails,
      clearedEmails: Math.floor(totalEmails * 0.7), // Placeholder - would need real data
      remainingEmails: inboxFolder?.count || 0,
      clearancePercentage: totalEmails > 0 ? Math.floor((1 - (inboxFolder?.count || 0) / totalEmails) * 100) : 0
    }
  }

  const inboxStats = getInboxStats()

  // Use API folders only - no mock data fallback
  const apiFolders = (foldersData as any)?.folders || []

  // Map API folders to expected format with proper typing
  const folders = apiFolders.length > 0 ? apiFolders.map((f: any) => ({
    id: f.id || f.name?.toLowerCase(),
    name: f.name,
    type: f.type?.toLowerCase() === 'inbox' ? 'inbox' as const :
          f.name?.toLowerCase() === 'sent items' || f.name?.toLowerCase() === 'sent' ? 'sent' as const :
          f.name?.toLowerCase() === 'drafts' ? 'drafts' as const :
          'custom' as const,
    unreadCount: f.count || 0
  })) : [
    // Show basic folders while loading
    { id: 'inbox', name: 'Inbox', type: 'inbox' as const, unreadCount: 0 },
    { id: 'sent', name: 'Sent', type: 'sent' as const, unreadCount: 0 },
  ]

  const folderIcons = {
    inbox: InboxIcon,
    sent: PaperAirplaneIcon,
    drafts: DocumentDuplicateIcon,
    custom: FolderIcon,
  }
  
  // Special handling for specific custom folders
  const getCustomFolderIcon = (folderId: string) => {
    if (folderId === 'archive') return ArchiveBoxIcon
    if (folderId === 'all-folders') return FolderOpenIcon
    return FolderIcon
  }

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-200 flex items-center h-20">
        {/* App Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <InboxSolid className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Boxzero NG V2</h1>
        </div>
      </div>

      {/* Account Selector */}
      <div className="px-4 py-6 border-b border-gray-200">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Email Accounts</h3>
        <AccountSelector
          selectedAccount={selectedAccount}
          onAccountSelect={onAccountSelect}
        />
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Folders</h3>
          <div className="space-y-1">
            {folders.map((folder: any) => {
              const IconComponent = folder.type === 'custom'
                ? getCustomFolderIcon(folder.id)
                : (folderIcons as any)[folder.type] || FolderIcon
              const isSelected = selectedFolder === folder.id
              
              return (
                <motion.button
                  key={folder.id}
                  onClick={() => onFolderSelect(folder.id)}
                  whileHover={{ x: 2 }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-4 h-4" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  {folder.unreadCount > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      isSelected
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {folder.unreadCount}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Inbox Zero Widget */}
        <div className="px-4 py-3 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Inbox Zero Progress</h3>
          <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">{inboxStats.accountName}</span>
                <p className="text-xs text-gray-500 mt-1">{inboxStats.remainingEmails} emails remaining</p>
              </div>
            </div>
            
            {/* Single Progress Ring */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  {/* Background ring */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-gray-200"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - inboxStats.clearancePercentage / 100)}`}
                    className={`transition-all duration-700 ${
                      inboxStats.clearancePercentage >= 80 ? 'text-green-500' :
                      inboxStats.clearancePercentage >= 60 ? 'text-blue-500' :
                      inboxStats.clearancePercentage >= 40 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{inboxStats.clearancePercentage}%</p>
                    <p className="text-xs text-gray-500">cleared</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-medium text-gray-700">{inboxStats.totalEmails}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cleared</p>
                <p className="text-sm font-medium text-gray-700">{inboxStats.clearedEmails}</p>
              </div>
            </div>
            
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-600">
                {inboxStats.clearancePercentage >= 80 ? 'Excellent progress! 🎉' :
                 inboxStats.clearancePercentage >= 60 ? 'Great work! Keep going! 💪' :
                 inboxStats.clearancePercentage >= 40 ? 'Making progress! 📈' :
                 'Time to focus! 🎯'}
              </p>
            </div>
          </div>
        </div>

        {/* Labels - placeholder until labels API is implemented */}
        <div className="px-4 py-3 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Labels</h3>
          <div className="text-sm text-gray-400 px-3 py-2">
            No labels yet
          </div>
        </div>

      </div>

    </div>
  )
}