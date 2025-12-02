'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  UserCircleIcon,
  CheckIcon,
  InboxIcon,
  BuildingOfficeIcon,
  HomeIcon,
  HeartIcon,
  AcademicCapIcon,
  UserGroupIcon,
  EllipsisHorizontalCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { EmailAccount } from '@/types/email'
import { useAccounts } from '@/hooks/useEmails'

interface AccountSelectorProps {
  selectedAccount: string
  onAccountSelect: (accountId: string) => void
}

export default function AccountSelector({ selectedAccount, onAccountSelect }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)

  // API data - no mock fallback for production
  const { data: accountsData, isLoading: accountsLoading } = useAccounts()

  // Use API accounts only - no mock data
  const accounts = accountsData?.accounts || []
  const [selectedGroupType, setSelectedGroupType] = useState<string | null>(null)
  const selectorRef = useRef<HTMLDivElement>(null)

  // Group accounts by type (map real accounts to default types based on provider)
  const groupedAccounts = accounts.reduce((groups, account: any) => {
    // For real BoxZero accounts, use provider as basis for grouping
    // All Microsoft accounts go to Work, others to Personal
    const accountType = account.type || (account.provider === 'microsoft' ? 'Work' : 'Personal')
    if (!groups[accountType]) {
      groups[accountType] = []
    }
    groups[accountType].push(account)
    return groups
  }, {} as Record<string, any[]>)

  // Sort group order
  const groupOrder = ['Work', 'Personal', 'Family', 'School', 'Community', 'Other']
  const sortedGroups = groupOrder.filter(type => groupedAccounts[type])

  const getSelectedAccountName = () => {
    if (selectedAccount === 'all') return 'All Accounts'
    if (selectedAccount.startsWith('type:')) {
      const type = selectedAccount.replace('type:', '')
      return `${type} Accounts`
    }
    const account = accounts.find(acc => acc.id === selectedAccount)
    return account ? account.name : 'Select Account'
  }

  const getSelectedAccountDetail = () => {
    if (selectedAccount === 'all') return 'View emails from all accounts'
    if (selectedAccount.startsWith('type:')) {
      const type = selectedAccount.replace('type:', '')
      const count = groupedAccounts[type]?.length || 0
      return `${count} ${count === 1 ? 'account' : 'accounts'}`
    }
    const account = accounts.find(acc => acc.id === selectedAccount)
    return account ? account.email : ''
  }

  const getGroupIcon = (type: string) => {
    const icons = {
      Work: BuildingOfficeIcon,
      Personal: HomeIcon,
      Family: HeartIcon,
      School: AcademicCapIcon,
      Community: UserGroupIcon,
      Other: EllipsisHorizontalCircleIcon,
    }
    return icons[type as keyof typeof icons] || EllipsisHorizontalCircleIcon
  }

  const getTotalUnreadForGroup = (accounts: EmailAccount[]) => {
    // In a real app, you'd calculate actual unread counts
    return Math.floor(Math.random() * 20)
  }

  const handleGroupSelect = (groupType: string) => {
    onAccountSelect(`type:${groupType}`)
    setIsOpen(false)
    setSelectedGroupType(null)
  }

  const handleAccountSelect = (accountId: string) => {
    onAccountSelect(accountId)
    setIsOpen(false)
    setSelectedGroupType(null)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedGroupType(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={selectorRef}>
      {/* Selected Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center flex-shrink-0">
            {selectedAccount === 'all' ? (
              <InboxIcon className="w-3.5 h-3.5 text-white" />
            ) : selectedAccount.startsWith('type:') ? (
              <UserGroupIcon className="w-3.5 h-3.5 text-white" />
            ) : (
              <UserCircleIcon className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate text-sm">
              {getSelectedAccountName()}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {getSelectedAccountDetail()}
            </div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
      </button>

      {/* Pop-out Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            
            {/* Main Menu Panel */}
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute left-full top-0 ml-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-900 text-sm">Select Email Account</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose an account type or specific email</p>
              </div>

              {/* All Accounts Option */}
              <button
                onClick={() => handleAccountSelect('all')}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedAccount === 'all' ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                    <InboxIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className={`font-medium text-sm ${selectedAccount === 'all' ? 'text-primary-700' : 'text-gray-900'}`}>
                      All Accounts
                    </div>
                    <div className="text-xs text-gray-500">View emails from all accounts</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAccount === 'all' && (
                    <CheckIcon className="w-4 h-4 text-primary-600" />
                  )}
                </div>
              </button>

              {/* Account Groups */}
              {sortedGroups.map((groupType) => {
                const accounts = groupedAccounts[groupType]
                const IconComponent = getGroupIcon(groupType)
                const unreadCount = getTotalUnreadForGroup(accounts)
                const isGroupSelected = selectedAccount === `type:${groupType}`

                return (
                  <div key={groupType} className="border-b border-gray-100 last:border-b-0">
                    {/* Group Row */}
                    <div 
                      className={`flex items-center hover:bg-gray-50 transition-colors ${
                        isGroupSelected ? 'bg-primary-50' : ''
                      }`}
                      onMouseEnter={() => setHoveredGroup(groupType)}
                      onMouseLeave={() => setHoveredGroup(null)}
                    >
                      {/* Group Selection Button */}
                      <button
                        onClick={() => handleGroupSelect(groupType)}
                        className="flex-1 flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${isGroupSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                            {groupType} Accounts
                          </div>
                          <div className="text-xs text-gray-500">
                            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                            {unreadCount > 0 && ` • ${unreadCount} unread`}
                          </div>
                        </div>
                        {isGroupSelected && (
                          <CheckIcon className="w-4 h-4 text-primary-600" />
                        )}
                      </button>

                      {/* Expand Individual Accounts Button */}
                      <button
                        onClick={() => setSelectedGroupType(selectedGroupType === groupType ? null : groupType)}
                        className="px-3 py-3 hover:bg-gray-100 transition-colors"
                        title="View individual accounts"
                      >
                        <motion.div
                          animate={{ rotate: selectedGroupType === groupType ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </button>
                    </div>

                    {/* Individual Accounts */}
                    <AnimatePresence>
                      {selectedGroupType === groupType && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-gray-25"
                        >
                          {accounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => handleAccountSelect(account.id)}
                              className={`w-full flex items-center justify-between pl-8 pr-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                selectedAccount === account.id ? 'bg-primary-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                                  <UserCircleIcon className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className={`font-medium text-sm truncate ${
                                    selectedAccount === account.id ? 'text-primary-700' : 'text-gray-900'
                                  }`}>
                                    {account.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{account.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {account.provider}
                                </span>
                                {selectedAccount === account.id && (
                                  <CheckIcon className="w-4 h-4 text-primary-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}