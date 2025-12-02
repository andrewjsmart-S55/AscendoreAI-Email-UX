'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeSelectorProps {
  isOpen: boolean
  onClose: () => void
}

export default function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
  const { themes, currentTheme, setTheme } = useTheme()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Choose Theme</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {themes.map((theme) => (
                <motion.button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    currentTheme.id === theme.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {/* Theme Preview */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1 mb-2">
                      {theme.preview.map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {Object.values(theme.colors.primary).slice(2, 8).map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 mb-1">{theme.name}</h3>
                    <p className="text-sm text-gray-500">
                      {theme.id === 'default' && 'Calm and professional'}
                      {theme.id === 'emerald' && 'Fresh and natural'}
                      {theme.id === 'sunset' && 'Warm and energetic'}
                      {theme.id === 'rainbow' && 'Vibrant and playful'}
                      {theme.id === 'desert' && 'Warm and golden'}
                      {theme.id === 'rose' && 'Elegant and sophisticated'}
                      {theme.id === 'slate' && 'Clean and minimal'}
                      {theme.id === 'lavender' && 'Soft and dreamy'}
                    </p>
                  </div>

                  {/* Selected Indicator */}
                  {currentTheme.id === theme.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                    >
                      <CheckIcon className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Your theme preference will be saved automatically
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}