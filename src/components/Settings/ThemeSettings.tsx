'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  SwatchIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeSettings() {
  const { themes, currentTheme, setTheme } = useTheme()

  const getThemeIcon = (themeId: string) => {
    switch (themeId) {
      case 'light':
        return SunIcon
      case 'dark':
        return MoonIcon
      case 'system':
        return ComputerDesktopIcon
      default:
        return SwatchIcon
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <SwatchIcon className="w-5 h-5" />
          Theme Preferences
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose your preferred theme. System theme will automatically switch between light and dark based on your device settings.
        </p>

        {/* Theme Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const IconComponent = getThemeIcon(theme.id)
            const isSelected = currentTheme.id === theme.id

            return (
              <motion.button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-6 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Theme Icon and Info */}
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`w-6 h-6 ${
                      isSelected ? 'text-primary-600' : 'text-gray-600'
                    }`} />
                  </div>

                  <h4 className={`font-medium mb-1 ${
                    isSelected ? 'text-primary-900' : 'text-gray-900'
                  }`}>
                    {theme.name}
                  </h4>

                  <p className={`text-sm ${
                    isSelected ? 'text-primary-700' : 'text-gray-500'
                  }`}>
                    {(theme as any).description}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Theme Preview Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-medium text-gray-900 mb-4">Current Theme Preview</h4>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-semibold">BZ</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentTheme.name} Theme</p>
                <p className="text-sm text-gray-500">Active theme preview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs">
              Primary
            </div>
            <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
              Secondary
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              Success
            </div>
          </div>
        </div>
      </div>

      {/* Theme Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <SwatchIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Theme Information</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>Light Theme:</strong> Clean, bright interface ideal for daytime use and well-lit environments.
              </p>
              <p>
                <strong>Dark Theme:</strong> Reduces eye strain in low-light conditions and saves battery on OLED displays.
              </p>
              <p>
                <strong>System Theme:</strong> Automatically switches between light and dark based on your operating system settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}