'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BellAlertIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid,
  EnvelopeIcon as EnvelopeSolid,
  UserGroupIcon as UserGroupSolid,
  CheckCircleIcon as CheckSolid,
  BellAlertIcon as BellSolid,
  DocumentTextIcon as DocumentSolid
} from '@heroicons/react/24/solid'

interface NavigationRailProps {
  selectedItem: string
  onItemSelect: (item: string) => void
}

export default function NavigationRail({ selectedItem, onItemSelect }: NavigationRailProps) {
  const navigationItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: HomeIcon, 
      solidIcon: HomeSolid,
      color: 'from-purple-500 to-purple-600'
    },
    { 
      id: 'mail', 
      label: 'Mail', 
      icon: EnvelopeIcon, 
      solidIcon: EnvelopeSolid,
      color: 'from-primary-500 to-primary-600'
    },
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: UserGroupIcon, 
      solidIcon: UserGroupSolid,
      color: 'from-green-500 to-green-600'
    },
    { 
      id: 'tasks', 
      label: 'Tasks', 
      icon: CheckCircleIcon, 
      solidIcon: CheckSolid,
      color: 'from-orange-500 to-orange-600'
    },
    { 
      id: 'reminders', 
      label: 'Reminders', 
      icon: BellAlertIcon, 
      solidIcon: BellSolid,
      color: 'from-red-500 to-red-600'
    },
    { 
      id: 'daily-notes', 
      label: 'Daily Notes', 
      icon: DocumentTextIcon, 
      solidIcon: DocumentSolid,
      color: 'from-indigo-500 to-indigo-600'
    }
  ]

  return (
    <div className="w-20 h-screen bg-gray-900 flex flex-col items-center py-4 border-r border-gray-800">
      {/* App Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-2 w-full px-2">
        {navigationItems.map((item) => {
          const isSelected = selectedItem === item.id
          const IconComponent = isSelected ? item.solidIcon : item.icon

          return (
            <motion.button
              key={item.id}
              onClick={() => onItemSelect(item.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <div
                className={`
                  w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1
                  transition-all duration-200
                  ${isSelected 
                    ? `bg-gradient-to-br ${item.color} shadow-lg` 
                    : 'hover:bg-gray-800'
                  }
                `}
              >
                <IconComponent 
                  className={`w-6 h-6 ${
                    isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                  }`} 
                />
                <span 
                  className={`text-[10px] font-medium ${
                    isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="selectedIndicator"
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Bottom Section - Add more items if needed */}
      <div className="pt-4 border-t border-gray-800 w-full px-2">
        {/* Can add settings or other items here */}
      </div>
    </div>
  )
}