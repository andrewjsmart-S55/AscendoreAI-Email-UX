/**
 * Team Labels and Folders Service
 *
 * Shared labeling and folder system for teams:
 * - Team-wide labels with colors
 * - Shared folders with permissions
 * - Label/folder hierarchy
 * - Usage tracking and analytics
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type LabelColor =
  | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'blue' | 'purple' | 'pink' | 'gray'

export type PermissionLevel = 'view' | 'use' | 'edit' | 'admin'

export interface TeamLabel {
  id: string
  teamId: string
  name: string
  color: LabelColor
  description?: string

  // Hierarchy
  parentId?: string
  order: number

  // Permissions
  visibility: 'team' | 'private'
  createdBy: string
  permissions: {
    userId: string
    level: PermissionLevel
  }[]

  // Settings
  isSystem: boolean // Cannot be deleted
  autoApplyRules?: LabelAutoRule[]

  // Analytics
  usageCount: number
  lastUsedAt?: number

  createdAt: number
  updatedAt: number
}

export interface TeamFolder {
  id: string
  teamId: string
  name: string
  icon?: string
  color?: LabelColor

  // Hierarchy
  parentId?: string
  order: number

  // Permissions
  visibility: 'team' | 'private' | 'restricted'
  createdBy: string
  permissions: {
    userId: string
    level: PermissionLevel
  }[]

  // Settings
  isSystem: boolean
  defaultLabels: string[] // Auto-apply these labels to emails in folder

  // Analytics
  emailCount: number
  lastEmailAt?: number

  createdAt: number
  updatedAt: number
}

export interface LabelAutoRule {
  id: string
  condition: {
    field: 'from' | 'to' | 'subject' | 'body' | 'domain'
    operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex'
    value: string
  }
  isActive: boolean
}

export interface EmailLabelAssignment {
  id: string
  emailId: string
  labelId: string
  assignedBy: string
  assignedAt: number
}

export interface EmailFolderAssignment {
  id: string
  emailId: string
  folderId: string
  assignedBy: string
  assignedAt: number
}

// =============================================================================
// Color Utilities
// =============================================================================

export const LABEL_COLORS: Record<LabelColor, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/50' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/50' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' }
}

export function getLabelColorClasses(color: LabelColor): string {
  const colors = LABEL_COLORS[color]
  return `${colors.bg} ${colors.text}`
}

// =============================================================================
// Permission Helpers
// =============================================================================

export function canView(userPermission?: PermissionLevel): boolean {
  return !!userPermission
}

export function canUse(userPermission?: PermissionLevel): boolean {
  return userPermission === 'use' || userPermission === 'edit' || userPermission === 'admin'
}

export function canEdit(userPermission?: PermissionLevel): boolean {
  return userPermission === 'edit' || userPermission === 'admin'
}

export function canAdmin(userPermission?: PermissionLevel): boolean {
  return userPermission === 'admin'
}

export function getUserPermission(
  item: { permissions: { userId: string; level: PermissionLevel }[]; createdBy: string },
  userId: string
): PermissionLevel | undefined {
  if (item.createdBy === userId) return 'admin'
  return item.permissions.find(p => p.userId === userId)?.level
}

// =============================================================================
// Team Labels/Folders Store
// =============================================================================

interface TeamLabelsStore {
  labels: TeamLabel[]
  folders: TeamFolder[]
  labelAssignments: EmailLabelAssignment[]
  folderAssignments: EmailFolderAssignment[]

  // Label management
  createLabel: (label: Omit<TeamLabel, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => TeamLabel
  updateLabel: (id: string, updates: Partial<TeamLabel>) => void
  deleteLabel: (id: string) => void
  reorderLabels: (labelIds: string[]) => void

  // Folder management
  createFolder: (folder: Omit<TeamFolder, 'id' | 'createdAt' | 'updatedAt' | 'emailCount'>) => TeamFolder
  updateFolder: (id: string, updates: Partial<TeamFolder>) => void
  deleteFolder: (id: string) => void
  reorderFolders: (folderIds: string[]) => void

  // Assignment management
  assignLabel: (emailId: string, labelId: string, userId: string) => void
  removeLabel: (emailId: string, labelId: string) => void
  assignFolder: (emailId: string, folderId: string, userId: string) => void
  removeFromFolder: (emailId: string, folderId: string) => void

  // Permission management
  setLabelPermission: (labelId: string, userId: string, level: PermissionLevel) => void
  removeLabelPermission: (labelId: string, userId: string) => void
  setFolderPermission: (folderId: string, userId: string, level: PermissionLevel) => void
  removeFolderPermission: (folderId: string, userId: string) => void

  // Queries
  getLabelById: (id: string) => TeamLabel | undefined
  getFolderById: (id: string) => TeamFolder | undefined
  getLabelsByTeam: (teamId: string) => TeamLabel[]
  getFoldersByTeam: (teamId: string) => TeamFolder[]
  getLabelsForEmail: (emailId: string) => TeamLabel[]
  getFolderForEmail: (emailId: string) => TeamFolder | undefined
  getEmailsInFolder: (folderId: string) => string[]
  getChildLabels: (parentId: string) => TeamLabel[]
  getChildFolders: (parentId: string) => TeamFolder[]
}

export const useTeamLabelsStore = create<TeamLabelsStore>()(
  persist(
    (set, get) => ({
      labels: [],
      folders: [],
      labelAssignments: [],
      folderAssignments: [],

      createLabel: (labelData) => {
        const label: TeamLabel = {
          ...labelData,
          id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          labels: [...state.labels, label]
        }))

        return label
      },

      updateLabel: (id, updates) => {
        set(state => ({
          labels: state.labels.map(label =>
            label.id === id
              ? { ...label, ...updates, updatedAt: Date.now() }
              : label
          )
        }))
      },

      deleteLabel: (id) => {
        const label = get().labels.find(l => l.id === id)
        if (label?.isSystem) return

        set(state => ({
          labels: state.labels.filter(l => l.id !== id),
          labelAssignments: state.labelAssignments.filter(a => a.labelId !== id)
        }))
      },

      reorderLabels: (labelIds) => {
        set(state => ({
          labels: state.labels.map(label => {
            const newOrder = labelIds.indexOf(label.id)
            return newOrder >= 0 ? { ...label, order: newOrder } : label
          })
        }))
      },

      createFolder: (folderData) => {
        const folder: TeamFolder = {
          ...folderData,
          id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          emailCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          folders: [...state.folders, folder]
        }))

        return folder
      },

      updateFolder: (id, updates) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === id
              ? { ...folder, ...updates, updatedAt: Date.now() }
              : folder
          )
        }))
      },

      deleteFolder: (id) => {
        const folder = get().folders.find(f => f.id === id)
        if (folder?.isSystem) return

        set(state => ({
          folders: state.folders.filter(f => f.id !== id),
          folderAssignments: state.folderAssignments.filter(a => a.folderId !== id)
        }))
      },

      reorderFolders: (folderIds) => {
        set(state => ({
          folders: state.folders.map(folder => {
            const newOrder = folderIds.indexOf(folder.id)
            return newOrder >= 0 ? { ...folder, order: newOrder } : folder
          })
        }))
      },

      assignLabel: (emailId, labelId, userId) => {
        // Check if already assigned
        const existing = get().labelAssignments.find(
          a => a.emailId === emailId && a.labelId === labelId
        )
        if (existing) return

        const assignment: EmailLabelAssignment = {
          id: `la_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          emailId,
          labelId,
          assignedBy: userId,
          assignedAt: Date.now()
        }

        set(state => ({
          labelAssignments: [...state.labelAssignments, assignment],
          labels: state.labels.map(label =>
            label.id === labelId
              ? { ...label, usageCount: label.usageCount + 1, lastUsedAt: Date.now() }
              : label
          )
        }))
      },

      removeLabel: (emailId, labelId) => {
        set(state => ({
          labelAssignments: state.labelAssignments.filter(
            a => !(a.emailId === emailId && a.labelId === labelId)
          )
        }))
      },

      assignFolder: (emailId, folderId, userId) => {
        // Remove from other folders first (email can only be in one folder)
        set(state => ({
          folderAssignments: state.folderAssignments.filter(a => a.emailId !== emailId)
        }))

        const assignment: EmailFolderAssignment = {
          id: `fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          emailId,
          folderId,
          assignedBy: userId,
          assignedAt: Date.now()
        }

        set(state => ({
          folderAssignments: [...state.folderAssignments, assignment],
          folders: state.folders.map(folder =>
            folder.id === folderId
              ? { ...folder, emailCount: folder.emailCount + 1, lastEmailAt: Date.now() }
              : folder
          )
        }))
      },

      removeFromFolder: (emailId, folderId) => {
        set(state => ({
          folderAssignments: state.folderAssignments.filter(
            a => !(a.emailId === emailId && a.folderId === folderId)
          ),
          folders: state.folders.map(folder =>
            folder.id === folderId && folder.emailCount > 0
              ? { ...folder, emailCount: folder.emailCount - 1 }
              : folder
          )
        }))
      },

      setLabelPermission: (labelId, userId, level) => {
        set(state => ({
          labels: state.labels.map(label => {
            if (label.id !== labelId) return label

            const existingIndex = label.permissions.findIndex(p => p.userId === userId)
            const newPermissions = [...label.permissions]

            if (existingIndex >= 0) {
              newPermissions[existingIndex] = { userId, level }
            } else {
              newPermissions.push({ userId, level })
            }

            return { ...label, permissions: newPermissions }
          })
        }))
      },

      removeLabelPermission: (labelId, userId) => {
        set(state => ({
          labels: state.labels.map(label =>
            label.id === labelId
              ? {
                  ...label,
                  permissions: label.permissions.filter(p => p.userId !== userId)
                }
              : label
          )
        }))
      },

      setFolderPermission: (folderId, userId, level) => {
        set(state => ({
          folders: state.folders.map(folder => {
            if (folder.id !== folderId) return folder

            const existingIndex = folder.permissions.findIndex(p => p.userId === userId)
            const newPermissions = [...folder.permissions]

            if (existingIndex >= 0) {
              newPermissions[existingIndex] = { userId, level }
            } else {
              newPermissions.push({ userId, level })
            }

            return { ...folder, permissions: newPermissions }
          })
        }))
      },

      removeFolderPermission: (folderId, userId) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === folderId
              ? {
                  ...folder,
                  permissions: folder.permissions.filter(p => p.userId !== userId)
                }
              : folder
          )
        }))
      },

      getLabelById: (id) => get().labels.find(l => l.id === id),

      getFolderById: (id) => get().folders.find(f => f.id === id),

      getLabelsByTeam: (teamId) =>
        get().labels
          .filter(l => l.teamId === teamId)
          .sort((a, b) => a.order - b.order),

      getFoldersByTeam: (teamId) =>
        get().folders
          .filter(f => f.teamId === teamId)
          .sort((a, b) => a.order - b.order),

      getLabelsForEmail: (emailId) => {
        const labelIds = get().labelAssignments
          .filter(a => a.emailId === emailId)
          .map(a => a.labelId)

        return get().labels.filter(l => labelIds.includes(l.id))
      },

      getFolderForEmail: (emailId) => {
        const assignment = get().folderAssignments.find(a => a.emailId === emailId)
        if (!assignment) return undefined
        return get().folders.find(f => f.id === assignment.folderId)
      },

      getEmailsInFolder: (folderId) =>
        get().folderAssignments
          .filter(a => a.folderId === folderId)
          .map(a => a.emailId),

      getChildLabels: (parentId) =>
        get().labels
          .filter(l => l.parentId === parentId)
          .sort((a, b) => a.order - b.order),

      getChildFolders: (parentId) =>
        get().folders
          .filter(f => f.parentId === parentId)
          .sort((a, b) => a.order - b.order)
    }),
    {
      name: 'boxzero-team-labels',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        labels: state.labels,
        folders: state.folders,
        labelAssignments: state.labelAssignments,
        folderAssignments: state.folderAssignments
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback } from 'react'

export function useTeamLabels(teamId: string | null, userId: string | null) {
  const store = useTeamLabelsStore()

  const labels = useMemo(
    () => teamId ? store.getLabelsByTeam(teamId) : [],
    [teamId, store.labels]
  )

  const folders = useMemo(
    () => teamId ? store.getFoldersByTeam(teamId) : [],
    [teamId, store.folders]
  )

  // Filter by user permission
  const accessibleLabels = useMemo(
    () => userId
      ? labels.filter(label => {
          if (label.visibility === 'team') return true
          return getUserPermission(label, userId) !== undefined
        })
      : [],
    [labels, userId]
  )

  const accessibleFolders = useMemo(
    () => userId
      ? folders.filter(folder => {
          if (folder.visibility === 'team') return true
          return getUserPermission(folder, userId) !== undefined
        })
      : [],
    [folders, userId]
  )

  // Build hierarchy
  const labelHierarchy = useMemo(() => {
    const rootLabels = accessibleLabels.filter(l => !l.parentId)
    const buildTree = (parentId?: string): any[] => {
      return accessibleLabels
        .filter(l => l.parentId === parentId)
        .map(label => ({
          ...label,
          children: buildTree(label.id)
        }))
    }
    return rootLabels.map(label => ({
      ...label,
      children: buildTree(label.id)
    }))
  }, [accessibleLabels])

  const folderHierarchy = useMemo(() => {
    const rootFolders = accessibleFolders.filter(f => !f.parentId)
    const buildTree = (parentId?: string): any[] => {
      return accessibleFolders
        .filter(f => f.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }))
    }
    return rootFolders.map(folder => ({
      ...folder,
      children: buildTree(folder.id)
    }))
  }, [accessibleFolders])

  const createLabel = useCallback((
    name: string,
    color: LabelColor,
    options: {
      description?: string
      parentId?: string
      visibility?: 'team' | 'private'
    } = {}
  ) => {
    if (!teamId || !userId) return null

    return store.createLabel({
      teamId,
      name,
      color,
      description: options.description,
      parentId: options.parentId,
      order: labels.length,
      visibility: options.visibility || 'team',
      createdBy: userId,
      permissions: [],
      isSystem: false
    })
  }, [teamId, userId, labels.length, store.createLabel])

  const createFolder = useCallback((
    name: string,
    options: {
      icon?: string
      color?: LabelColor
      parentId?: string
      visibility?: 'team' | 'private' | 'restricted'
      defaultLabels?: string[]
    } = {}
  ) => {
    if (!teamId || !userId) return null

    return store.createFolder({
      teamId,
      name,
      icon: options.icon,
      color: options.color,
      parentId: options.parentId,
      order: folders.length,
      visibility: options.visibility || 'team',
      createdBy: userId,
      permissions: [],
      isSystem: false,
      defaultLabels: options.defaultLabels || []
    })
  }, [teamId, userId, folders.length, store.createFolder])

  return {
    labels: accessibleLabels,
    folders: accessibleFolders,
    labelHierarchy,
    folderHierarchy,

    // Actions
    createLabel,
    createFolder,
    updateLabel: store.updateLabel,
    updateFolder: store.updateFolder,
    deleteLabel: store.deleteLabel,
    deleteFolder: store.deleteFolder,
    reorderLabels: store.reorderLabels,
    reorderFolders: store.reorderFolders,

    // Email operations
    assignLabel: (emailId: string, labelId: string) =>
      userId && store.assignLabel(emailId, labelId, userId),
    removeLabel: store.removeLabel,
    assignFolder: (emailId: string, folderId: string) =>
      userId && store.assignFolder(emailId, folderId, userId),
    removeFromFolder: store.removeFromFolder,

    // Queries
    getLabelsForEmail: store.getLabelsForEmail,
    getFolderForEmail: store.getFolderForEmail,
    getEmailsInFolder: store.getEmailsInFolder
  }
}

export function useEmailLabels(emailId: string | null) {
  const store = useTeamLabelsStore()

  const labels = useMemo(
    () => emailId ? store.getLabelsForEmail(emailId) : [],
    [emailId, store.labelAssignments, store.labels]
  )

  const folder = useMemo(
    () => emailId ? store.getFolderForEmail(emailId) : undefined,
    [emailId, store.folderAssignments, store.folders]
  )

  return { labels, folder }
}

export default useTeamLabelsStore
