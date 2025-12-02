'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useAscendoreAuth } from '@/contexts/AscendoreAuthContext'

interface UserProfileProps {
  className?: string
  onSettingsOpen?: (tab?: string) => void
}

export default function UserProfile({ className = '', onSettingsOpen }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user: authUser, logout } = useAscendoreAuth()

  // User data from Ascendore auth context or fallback
  const user = authUser ? {
    name: authUser.displayName || 'User',
    email: authUser.email || '',
    avatar: authUser.avatarUrl,
    initials: authUser.displayName ?
      authUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase() :
      (authUser.email ? authUser.email[0].toUpperCase() : 'U'),
    role: 'Ascendore User'
  } : {
    name: 'User',
    email: '',
    avatar: null,
    initials: 'U',
    role: 'User'
  }

  const handleProfileAction = async (action: string) => {
    setIsOpen(false)

    if (action === 'Sign Out') {
      try {
        await logout()
        toast.success('Signed out successfully')
      } catch (error: any) {
        toast.error(error.message || 'Failed to sign out')
      }
    } else if (action === 'Settings' && onSettingsOpen) {
      // Open settings modal with default tab (profile)
      onSettingsOpen()
    } else {
      toast.success(`${action} clicked`)
    }
  }

  const menuItems = [
    {
      icon: Cog6ToothIcon,
      label: 'Settings',
      action: 'Settings'
    },
    {
      divider: true
    },
    {
      icon: ArrowRightOnRectangleIcon,
      label: 'Sign Out',
      action: 'Sign Out',
      className: 'text-red-600 hover:bg-red-50'
    }
  ]

  return (
    <div className={`relative ${className}`}>
      {/* Profile Button - Compact */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
        title={`${user.name} - ${user.role}`}
      >
        {/* Avatar Only */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-semibold">
            {user.initials}
          </span>
        </div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
            >
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {menuItems.map((item, index) => {
                  if (item.divider) {
                    return (
                      <div key={index} className="my-1 border-t border-gray-100" />
                    )
                  }

                  const IconComponent = item.icon!
                  
                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleProfileAction(item.action!)}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                        item.className || 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      {(item as any).badge && (
                        <span className="text-xs text-gray-500">{(item as any).badge}</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}