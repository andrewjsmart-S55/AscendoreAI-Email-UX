'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

interface NG2SidebarProps {
  activeView?: string
  onViewChange?: (view: string) => void
}

export default function NG2Sidebar({ activeView = 'chat', onViewChange }: NG2SidebarProps) {
  const railItems = [
    {
      icon: HomeIcon,
      label: 'Home',
      view: 'home',
      isLink: false
    },
    {
      icon: EnvelopeIcon,
      label: 'Mail',
      view: 'mail',
      isLink: false
    },
    {
      icon: UserCircleIcon,
      label: 'Accounts',
      view: 'accounts',
      isLink: false
    },
    {
      icon: ChatBubbleLeftRightIcon,
      label: 'Chat/Dashboard',
      view: 'chat',
      isLink: false
    },
    {
      icon: BookmarkIcon,
      label: 'Pinned',
      view: 'pinned',
      isLink: false
    },
    {
      icon: Cog6ToothIcon,
      label: 'Settings',
      view: 'settings',
      isLink: false
    }
  ]

  const handleItemClick = (item: typeof railItems[0]) => {
    if (onViewChange && item.view) {
      onViewChange(item.view)
    }
  }

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">B</span>
        </div>
      </div>

      {/* Rail Navigation */}
      <div className="pt-4">
        <nav className="space-y-4 px-2">
          {railItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.view

            return (
              <motion.div
                key={item.label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors group relative ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title={item.label}
                >
                  <Icon className="h-6 w-6" />

                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  )
}