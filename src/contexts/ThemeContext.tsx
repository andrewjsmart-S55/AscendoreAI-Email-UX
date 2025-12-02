'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface Theme {
  id: string
  name: string
  colors: {
    primary: {
      50: string
      100: string
      200: string
      300: string
      400: string
      500: string
      600: string
      700: string
      800: string
      900: string
    }
  }
  preview: string[]
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Ocean Blue',
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      }
    },
    preview: ['#f3f4f6', '#9ca3af', '#374151', '#111827']
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    colors: {
      primary: {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
      }
    },
    preview: ['#f3f4f6', '#10b981', '#374151', '#111827']
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      primary: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
      }
    },
    preview: ['#f3f4f6', '#f97316', '#374151', '#111827']
  },
  {
    id: 'rainbow',
    name: 'Vibrant Rainbow',
    colors: {
      primary: {
        50: '#fdf2f8',
        100: '#fce7f3',
        200: '#fbcfe8',
        300: '#f9a8d4',
        400: '#f472b6',
        500: '#ec4899',
        600: '#db2777',
        700: '#be185d',
        800: '#9d174d',
        900: '#831843',
      }
    },
    preview: ['#fbbf24', '#ec4899', '#8b5cf6', '#111827']
  },
  {
    id: 'desert',
    name: 'Desert Sand',
    colors: {
      primary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
      }
    },
    preview: ['#fef3c7', '#f59e0b', '#92400e', '#451a03']
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    colors: {
      primary: {
        50: '#fdf2f8',
        100: '#fce7f3',
        200: '#fbcfe8',
        300: '#f9a8d4',
        400: '#f472b6',
        500: '#ec4899',
        600: '#db2777',
        700: '#be185d',
        800: '#9d174d',
        900: '#831843',
      }
    },
    preview: ['#f3f4f6', '#f87171', '#6b7280', '#374151']
  },
  {
    id: 'slate',
    name: 'Professional Slate',
    colors: {
      primary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      }
    },
    preview: ['#f1f5f9', '#64748b', '#334155', '#0f172a']
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    colors: {
      primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7c3aed',
        800: '#6b21a8',
        900: '#581c87',
      }
    },
    preview: ['#fce7f3', '#c084fc', '#6b21a8', '#374151']
  }
]

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeId: string) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0])

  useEffect(() => {
    const savedThemeId = localStorage.getItem('boxzero-theme')
    if (savedThemeId) {
      const savedTheme = themes.find(theme => theme.id === savedThemeId)
      if (savedTheme) {
        setCurrentTheme(savedTheme)
      }
    }
  }, [])

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId)
    if (theme) {
      setCurrentTheme(theme)
      localStorage.setItem('boxzero-theme', themeId)
      
      // Update CSS custom properties
      const root = document.documentElement
      Object.entries(theme.colors.primary).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value)
      })
    }
  }

  useEffect(() => {
    // Set initial CSS custom properties
    const root = document.documentElement
    Object.entries(currentTheme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value)
    })
  }, [currentTheme])

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}