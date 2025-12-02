/**
 * Internal Comments Service
 *
 * Private comments on email threads for team collaboration:
 * - Thread-level and email-level comments
 * - @mentions with notifications
 * - Comment reactions
 * - Comment history and editing
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type CommentType = 'note' | 'question' | 'action_item' | 'resolved'

export interface InternalComment {
  id: string
  threadId: string
  emailId?: string // Optional - can be thread-level or email-specific

  // Content
  content: string
  type: CommentType
  mentions: string[] // userIds

  // Author
  authorId: string
  authorName: string
  authorAvatarUrl?: string

  // Status
  isResolved: boolean
  resolvedBy?: string
  resolvedAt?: number

  // Editing
  isEdited: boolean
  editedAt?: number
  editHistory: {
    content: string
    editedAt: number
  }[]

  // Reactions
  reactions: {
    emoji: string
    userIds: string[]
  }[]

  // Metadata
  createdAt: number
  updatedAt: number
}

export interface CommentNotification {
  id: string
  userId: string
  commentId: string
  threadId: string
  type: 'mention' | 'reply' | 'reaction' | 'resolved'
  title: string
  message: string
  isRead: boolean
  createdAt: number
}

// =============================================================================
// Mention Extraction
// =============================================================================

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g // @[Name](userId)
const SIMPLE_MENTION_REGEX = /@(\w+)/g

export function extractMentions(content: string): string[] {
  const mentions: string[] = []

  // Match @[Name](userId) format
  let match
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push(match[2]) // userId
  }
  MENTION_REGEX.lastIndex = 0

  return [...new Set(mentions)]
}

export function formatMention(name: string, userId: string): string {
  return `@[${name}](${userId})`
}

export function renderContent(content: string): string {
  // Convert @[Name](userId) to just @Name for display
  return content.replace(MENTION_REGEX, '@$1')
}

// =============================================================================
// Comments Store
// =============================================================================

interface CommentsStore {
  comments: InternalComment[]
  notifications: CommentNotification[]

  // Comment management
  addComment: (comment: Omit<InternalComment, 'id' | 'createdAt' | 'updatedAt' | 'isEdited' | 'editHistory' | 'reactions' | 'isResolved'>) => InternalComment
  updateComment: (id: string, content: string, authorId: string) => void
  deleteComment: (id: string, authorId: string) => void

  // Status
  resolveComment: (id: string, userId: string) => void
  unresolveComment: (id: string) => void

  // Reactions
  addReaction: (commentId: string, emoji: string, userId: string) => void
  removeReaction: (commentId: string, emoji: string, userId: string) => void

  // Notifications
  addNotification: (notification: Omit<CommentNotification, 'id' | 'createdAt' | 'isRead'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void

  // Queries
  getCommentById: (id: string) => InternalComment | undefined
  getCommentsForThread: (threadId: string) => InternalComment[]
  getCommentsForEmail: (emailId: string) => InternalComment[]
  getUnresolvedComments: (threadId: string) => InternalComment[]
  getCommentsByAuthor: (authorId: string) => InternalComment[]
  getMentionsForUser: (userId: string) => InternalComment[]
  getNotifications: (userId: string) => CommentNotification[]
  getUnreadNotificationCount: (userId: string) => number
}

export const useCommentsStore = create<CommentsStore>()(
  persist(
    (set, get) => ({
      comments: [],
      notifications: [],

      addComment: (commentData) => {
        const comment: InternalComment = {
          ...commentData,
          id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isResolved: false,
          isEdited: false,
          editHistory: [],
          reactions: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          comments: [...state.comments, comment]
        }))

        // Create notifications for mentions
        for (const mentionedUserId of commentData.mentions) {
          if (mentionedUserId !== commentData.authorId) {
            get().addNotification({
              userId: mentionedUserId,
              commentId: comment.id,
              threadId: commentData.threadId,
              type: 'mention',
              title: 'You were mentioned',
              message: `${commentData.authorName} mentioned you in a comment`
            })
          }
        }

        return comment
      },

      updateComment: (id, content, authorId) => {
        const comment = get().comments.find(c => c.id === id)
        if (!comment || comment.authorId !== authorId) return

        set(state => ({
          comments: state.comments.map(c =>
            c.id === id
              ? {
                  ...c,
                  content,
                  mentions: extractMentions(content),
                  isEdited: true,
                  editedAt: Date.now(),
                  editHistory: [...c.editHistory, { content: c.content, editedAt: Date.now() }],
                  updatedAt: Date.now()
                }
              : c
          )
        }))
      },

      deleteComment: (id, authorId) => {
        const comment = get().comments.find(c => c.id === id)
        if (!comment || comment.authorId !== authorId) return

        set(state => ({
          comments: state.comments.filter(c => c.id !== id)
        }))
      },

      resolveComment: (id, userId) => {
        set(state => ({
          comments: state.comments.map(c =>
            c.id === id
              ? {
                  ...c,
                  isResolved: true,
                  resolvedBy: userId,
                  resolvedAt: Date.now(),
                  updatedAt: Date.now()
                }
              : c
          )
        }))

        // Notify comment author
        const comment = get().comments.find(c => c.id === id)
        if (comment && comment.authorId !== userId) {
          get().addNotification({
            userId: comment.authorId,
            commentId: id,
            threadId: comment.threadId,
            type: 'resolved',
            title: 'Comment resolved',
            message: 'Your comment was marked as resolved'
          })
        }
      },

      unresolveComment: (id) => {
        set(state => ({
          comments: state.comments.map(c =>
            c.id === id
              ? {
                  ...c,
                  isResolved: false,
                  resolvedBy: undefined,
                  resolvedAt: undefined,
                  updatedAt: Date.now()
                }
              : c
          )
        }))
      },

      addReaction: (commentId, emoji, userId) => {
        set(state => ({
          comments: state.comments.map(comment => {
            if (comment.id !== commentId) return comment

            const existingReaction = comment.reactions.find(r => r.emoji === emoji)
            let newReactions

            if (existingReaction) {
              // Add user to existing reaction
              if (existingReaction.userIds.includes(userId)) return comment
              newReactions = comment.reactions.map(r =>
                r.emoji === emoji
                  ? { ...r, userIds: [...r.userIds, userId] }
                  : r
              )
            } else {
              // Create new reaction
              newReactions = [...comment.reactions, { emoji, userIds: [userId] }]
            }

            return { ...comment, reactions: newReactions }
          })
        }))

        // Notify comment author
        const comment = get().comments.find(c => c.id === commentId)
        if (comment && comment.authorId !== userId) {
          get().addNotification({
            userId: comment.authorId,
            commentId,
            threadId: comment.threadId,
            type: 'reaction',
            title: 'New reaction',
            message: `Someone reacted ${emoji} to your comment`
          })
        }
      },

      removeReaction: (commentId, emoji, userId) => {
        set(state => ({
          comments: state.comments.map(comment => {
            if (comment.id !== commentId) return comment

            const newReactions = comment.reactions
              .map(r => r.emoji === emoji
                ? { ...r, userIds: r.userIds.filter(id => id !== userId) }
                : r
              )
              .filter(r => r.userIds.length > 0)

            return { ...comment, reactions: newReactions }
          })
        }))
      },

      addNotification: (notificationData) => {
        const notification: CommentNotification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
          createdAt: Date.now()
        }

        set(state => ({
          notifications: [notification, ...state.notifications].slice(0, 100)
        }))
      },

      markNotificationRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          )
        }))
      },

      markAllNotificationsRead: (userId) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.userId === userId ? { ...n, isRead: true } : n
          )
        }))
      },

      getCommentById: (id) => get().comments.find(c => c.id === id),

      getCommentsForThread: (threadId) =>
        get().comments
          .filter(c => c.threadId === threadId)
          .sort((a, b) => a.createdAt - b.createdAt),

      getCommentsForEmail: (emailId) =>
        get().comments
          .filter(c => c.emailId === emailId)
          .sort((a, b) => a.createdAt - b.createdAt),

      getUnresolvedComments: (threadId) =>
        get().comments
          .filter(c => c.threadId === threadId && !c.isResolved)
          .sort((a, b) => a.createdAt - b.createdAt),

      getCommentsByAuthor: (authorId) =>
        get().comments.filter(c => c.authorId === authorId),

      getMentionsForUser: (userId) =>
        get().comments.filter(c => c.mentions.includes(userId)),

      getNotifications: (userId) =>
        get().notifications.filter(n => n.userId === userId),

      getUnreadNotificationCount: (userId) =>
        get().notifications.filter(n => n.userId === userId && !n.isRead).length
    }),
    {
      name: 'boxzero-comments',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        comments: state.comments,
        notifications: state.notifications
      })
    }
  )
)

// =============================================================================
// React Hooks
// =============================================================================

import { useMemo, useCallback, useState } from 'react'

export function useThreadComments(threadId: string | null, userId: string | null) {
  const store = useCommentsStore()

  const comments = useMemo(
    () => threadId ? store.getCommentsForThread(threadId) : [],
    [threadId, store.comments]
  )

  const unresolvedCount = useMemo(
    () => comments.filter(c => !c.isResolved).length,
    [comments]
  )

  const addComment = useCallback((
    content: string,
    options: {
      emailId?: string
      type?: CommentType
      authorName: string
      authorAvatarUrl?: string
    }
  ) => {
    if (!threadId || !userId) return null

    const mentions = extractMentions(content)

    return store.addComment({
      threadId,
      emailId: options.emailId,
      content,
      type: options.type || 'note',
      mentions,
      authorId: userId,
      authorName: options.authorName,
      authorAvatarUrl: options.authorAvatarUrl
    })
  }, [threadId, userId, store.addComment])

  const editComment = useCallback((commentId: string, content: string) => {
    if (!userId) return
    store.updateComment(commentId, content, userId)
  }, [userId, store.updateComment])

  const deleteComment = useCallback((commentId: string) => {
    if (!userId) return
    store.deleteComment(commentId, userId)
  }, [userId, store.deleteComment])

  return {
    comments,
    unresolvedCount,

    // Actions
    addComment,
    editComment,
    deleteComment,
    resolveComment: (id: string) => userId && store.resolveComment(id, userId),
    unresolveComment: store.unresolveComment,
    addReaction: (commentId: string, emoji: string) =>
      userId && store.addReaction(commentId, emoji, userId),
    removeReaction: (commentId: string, emoji: string) =>
      userId && store.removeReaction(commentId, emoji, userId)
  }
}

export function useCommentNotifications(userId: string | null) {
  const store = useCommentsStore()

  const notifications = useMemo(
    () => userId ? store.getNotifications(userId) : [],
    [userId, store.notifications]
  )

  const unreadCount = useMemo(
    () => userId ? store.getUnreadNotificationCount(userId) : 0,
    [userId, store.notifications]
  )

  return {
    notifications,
    unreadCount,
    markRead: store.markNotificationRead,
    markAllRead: () => userId && store.markAllNotificationsRead(userId)
  }
}

export function useCommentMentions(userId: string | null) {
  const store = useCommentsStore()

  const mentions = useMemo(
    () => userId ? store.getMentionsForUser(userId) : [],
    [userId, store.comments]
  )

  const unresolvedMentions = useMemo(
    () => mentions.filter(c => !c.isResolved),
    [mentions]
  )

  return {
    mentions,
    unresolvedMentions,
    count: unresolvedMentions.length
  }
}

// =============================================================================
// Comment Input with Mention Autocomplete
// =============================================================================

export interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export function useMentionAutocomplete(
  teamMembers: TeamMember[],
  inputValue: string
) {
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(-1)

  // Detect if user is typing a mention
  const mentionMatch = useMemo(() => {
    const match = /@(\w*)$/.exec(inputValue)
    return match ? match[1] : null
  }, [inputValue])

  // Filter team members based on mention query
  const suggestions = useMemo(() => {
    if (mentionMatch === null) return []

    const query = mentionMatch.toLowerCase()
    return teamMembers.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    ).slice(0, 5)
  }, [mentionMatch, teamMembers])

  const insertMention = useCallback((member: TeamMember, currentValue: string): string => {
    // Replace @query with @[Name](userId)
    return currentValue.replace(/@\w*$/, formatMention(member.name, member.id))
  }, [])

  return {
    isShowingSuggestions: suggestions.length > 0,
    suggestions,
    mentionQuery: mentionMatch,
    selectedIndex: mentionIndex,
    setSelectedIndex: setMentionIndex,
    insertMention
  }
}

export default useCommentsStore
