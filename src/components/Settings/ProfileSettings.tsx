'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  UserCircleIcon,
  CameraIcon,
  ClockIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  CogIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SwatchIcon
} from '@heroicons/react/24/outline'
import { useUserProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useEmails'
import { UserProfile } from '@/types/email'
import { useTheme } from '@/contexts/ThemeContext'

export default function ProfileSettings() {
  const { data: profileData, isLoading } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { themes, currentTheme, setTheme } = useTheme()

  const profile = (profileData as any)?.profile

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


  const [formData, setFormData] = useState<Partial<UserProfile>>({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    timezone: profile?.timezone || 'America/New_York',
    language: profile?.language || 'en',
    theme: profile?.theme || 'system',
    dateFormat: profile?.dateFormat || 'MM/DD/YYYY',
    timeFormat: profile?.timeFormat || '12h',
    emailSignature: profile?.emailSignature || ''
  })

  React.useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        phone: profile.phone,
        timezone: profile.timezone,
        language: profile.language,
        theme: profile.theme,
        dateFormat: profile.dateFormat,
        timeFormat: profile.timeFormat,
        emailSignature: profile.emailSignature
      })
    }
  }, [profile])

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updateProfileMutation.mutate(formData)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatarMutation.mutate(file)
    }
  }

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time' }
  ]

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' }
  ]


  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'MMM DD, YYYY', label: 'Dec 25, 2024' }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>

        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
                <UserCircleIcon className="w-12 h-12 text-white" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              disabled={uploadAvatarMutation.isPending}
            >
              <CameraIcon className="w-4 h-4 text-gray-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{profile?.displayName}</h4>
            <p className="text-sm text-gray-500">Click the camera icon to update your photo</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <CogIcon className="w-5 h-5" />
          Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4" />
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => handleInputChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {dateFormats.map(format => (
                <option key={format.value} value={format.value}>{format.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Format
            </label>
            <select
              value={formData.timeFormat}
              onChange={(e) => handleInputChange('timeFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="12h">12 Hour (AM/PM)</option>
              <option value="24h">24 Hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
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

        {/* Theme Preview Section */}
        <div className="mt-6 border-t border-gray-200 pt-6">
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
      </div>

      {/* Email Signature */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          Email Signature
        </label>
        <textarea
          value={formData.emailSignature}
          onChange={(e) => handleInputChange('emailSignature', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Your email signature..."
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <motion.button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          whileHover={{ scale: updateProfileMutation.isPending ? 1 : 1.02 }}
          whileTap={{ scale: updateProfileMutation.isPending ? 1 : 0.98 }}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  )
}