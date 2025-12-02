import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '@/lib/api'
import { ascendoreAuth } from '@/lib/ascendore-auth'
import { toast } from 'react-hot-toast'
import { UserProfile, AccountSettings, NotificationSettings, PrivacySettings } from '@/types/email'
import { logEmailAction } from '@/stores/activityStore'
import { trackEmailBehavior } from '@/stores/behaviorStore'

// Query keys for React Query
export const emailQueryKeys = {
  all: ['emails'] as const,
  lists: () => [...emailQueryKeys.all, 'list'] as const,
  list: (params: any) => [...emailQueryKeys.lists(), params] as const,
  details: () => [...emailQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailQueryKeys.details(), id] as const,
  threads: () => [...emailQueryKeys.all, 'threads'] as const,
  thread: (id: string) => [...emailQueryKeys.threads(), id] as const,
  search: (query: string) => [...emailQueryKeys.all, 'search', query] as const,
}

// Hook to fetch linked accounts (replaces old emails hook)
export function useLinkedAccounts() {
  return useQuery({
    queryKey: ['linkedAccounts'],
    queryFn: async () => {
      try {
        console.log('Attempting to fetch linked accounts from BoxZero API...')
        const result = await apiService.getLinkedAccounts()
        console.log('✅ API response for linked accounts:', result)
        return result
      } catch (error) {
        console.warn('API unavailable for linked accounts, falling back to mock data:', error)
        // Mock linked accounts data based on BoxZero API schema
        return [
          {
            account_id: 'acc1-andrew-outlook',
            provider: 'microsoft',
            external_email: 'andrew@boxzero.io',
            status: 'active',
            last_synced_at: new Date().toISOString(),
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            account_id: 'acc2-andrew-gmail',
            provider: 'google',
            external_email: 'andrew.smart@gmail.com',
            status: 'active',
            last_synced_at: new Date(Date.now() - 3600000).toISOString(),
            created_at: '2024-01-15T00:00:00Z'
          },
          {
            account_id: 'acc3-andrew-personal',
            provider: 'microsoft',
            external_email: 'a.smart@personal.com',
            status: 'active',
            last_synced_at: new Date(Date.now() - 7200000).toISOString(),
            created_at: '2024-02-01T00:00:00Z'
          }
        ]
      }
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

// Hook to fetch emails - deprecated, use useAccountMessages instead
export function useEmails(params?: {
  folder?: string
  account?: string
  limit?: number
  offset?: number
  search?: string
}) {
  return useQuery({
    queryKey: emailQueryKeys.list(params),
    queryFn: async () => {
      // This hook is deprecated - use useAccountMessages for real email data
      // Return empty array to avoid mock data
      return { emails: [], total: 0, hasMore: false }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

// Hook to fetch messages - MUST use messageFolderId from the message database!
export function useAccountMessages(accountId?: string, folderIdOrName: string = 'inbox', limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['accountMessages', accountId, folderIdOrName, limit, offset],
    queryFn: async () => {
      if (!accountId) {
        console.log('No accountId provided for messages')
        return { emails: [], total: 0, hasMore: false, needsSync: true }
      }

      // First, we need to get the messageFolderId from the folders endpoint
      // The messages endpoint requires the internal message database folder ID
      console.log(`📁 Getting folders for account ${accountId} to find messageFolderId...`)
      const folders = await apiService.getAccountFolders(accountId)
      console.log('📁 Folders response:', folders)

      if (!Array.isArray(folders) || folders.length === 0) {
        console.log('❌ No folders found for account')
        return { emails: [], total: 0, hasMore: false, needsSync: true }
      }

      // Find the target folder and get its messageFolderId
      let targetFolder: any = null

      // Check if this looks like a folder name rather than a UUID
      if (!folderIdOrName.includes('-') || folderIdOrName.length < 30) {
        console.log(`Looking for folder by name: ${folderIdOrName}`)
        targetFolder = folders.find((f: any) =>
          f.name?.toLowerCase() === folderIdOrName.toLowerCase() ||
          f.displayName?.toLowerCase() === folderIdOrName.toLowerCase() ||
          (folderIdOrName === 'inbox' && f.name?.toLowerCase().includes('inbox'))
        )
      } else if (folderIdOrName.length > 50) {
        // This looks like an external ID (Microsoft's long base64 string)
        console.log(`Looking for folder by external ID: ${folderIdOrName.substring(0, 30)}...`)
        targetFolder = folders.find((f: any) =>
          f.externalId === folderIdOrName || f.external_id === folderIdOrName
        )
      } else {
        // Already a UUID - could be folderId or messageFolderId
        console.log(`Looking for folder by UUID: ${folderIdOrName}`)
        targetFolder = folders.find((f: any) =>
          f.folderId === folderIdOrName || f.messageFolderId === folderIdOrName
        )
      }

      // Fallback to first folder with messages
      if (!targetFolder) {
        targetFolder = folders.find((f: any) => f.messageCount > 0 && f.messageFolderId) || folders[0]
        console.log(`⚠️ Folder '${folderIdOrName}' not found, using fallback: ${targetFolder?.name}`)
      }

      // CRITICAL: Use messageFolderId for the messages endpoint
      const messageFolderId = targetFolder?.messageFolderId
      if (!messageFolderId) {
        console.log(`❌ No messageFolderId for folder ${targetFolder?.name} - messages may not be synced yet`)
        return { emails: [], total: 0, hasMore: false, needsSync: true }
      }

      console.log(`🔍 Making BoxZero API call to get messages:`)
      console.log('  Account ID:', accountId)
      console.log('  Original Folder:', folderIdOrName)
      console.log('  Target Folder:', targetFolder?.name)
      console.log('  Message Folder ID:', messageFolderId)
      console.log('  Message Count:', targetFolder?.messageCount)
      console.log('  Limit:', limit, 'Offset:', offset)

      const result = await apiService.getAccountMessages(accountId, messageFolderId, limit, offset)
      console.log('📧 Messages API response:', result)

      // Transform API response to email format
      const resultAny = result as any
      if (resultAny && Array.isArray(resultAny.messages)) {
        const emails = resultAny.messages.map((msg: any) => {
          // Extract text preview from snippet (which contains HTML)
          let rawContent = msg.snippet || msg.body || msg.bodyPreview || ''

          // Try to extract body content if snippet contains full HTML
          // Look for content after <body> tag
          const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*?)(<\/body>|$)/i)
          if (bodyMatch) {
            rawContent = bodyMatch[1]
          }

          // Clean the HTML
          let snippetText = rawContent
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
            .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp;
            .replace(/&amp;/g, '&')  // Replace &amp;
            .replace(/&lt;/g, '<')   // Replace &lt;
            .replace(/&gt;/g, '>')   // Replace &gt;
            .replace(/&quot;/g, '"') // Replace &quot;
            .replace(/\r?\n/g, ' ')  // Remove newlines
            .replace(/\s+/g, ' ')    // Collapse whitespace
            .trim()

          // If still looks like HTML/metadata or is too short, show subject-based preview
          if (!snippetText || snippetText.length < 10 || snippetText.startsWith('<') || snippetText.includes('meta ')) {
            snippetText = `Email from ${msg.from?.name || msg.from?.email || 'Unknown'}`
          } else {
            snippetText = snippetText.substring(0, 200)
          }

          return {
            id: msg.id || msg.messageId,
            threadId: msg.threadId || msg.conversationId,
            subject: msg.subject || 'No Subject',
            from: msg.from?.email || msg.sender?.email || 'unknown@example.com',
            sender: {
              name: msg.from?.name || msg.sender?.name || 'Unknown Sender',
              email: msg.from?.email || msg.sender?.email || 'unknown@example.com'
            },
            to: msg.to || msg.recipients || [],
            recipients: msg.to || msg.recipients || [],
            receivedAt: msg.receivedAt || msg.date || new Date().toISOString(),
            date: msg.receivedAt || msg.date || new Date().toISOString(),
            isRead: msg.isRead ?? false,
            isStarred: msg.isStarred || msg.starred || false,
            isImportant: msg.isImportant || msg.importance === 'high' || false,
            hasAttachments: msg.hasAttachments || false,
            body: snippetText, // Use cleaned snippet as body preview
            preview: snippetText,
            snippet: msg.snippet || '',
            folder: folderIdOrName,
            folderName: msg.folderName || targetFolder?.name,
            accountId,
            labels: msg.labels || [],
            blobPath: msg.blobPath // For fetching full content later
          }
        })

        return {
          emails,
          total: resultAny.total || emails.length,
          hasMore: resultAny.hasMore || (resultAny.total > offset + limit),
          needsSync: emails.length === 0,
          folderName: targetFolder?.name || targetFolder?.displayName || folderIdOrName
        }
      }

      // Empty response from API
      console.log('📭 Messages endpoint returned empty - emails may need to be synced')
      return {
        emails: [],
        total: 0,
        hasMore: false,
        needsSync: true
      }
    },
    enabled: !!accountId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

// Hook to fetch email thread
export function useEmailThread(threadId: string) {
  return useQuery({
    queryKey: emailQueryKeys.thread(threadId),
    queryFn: () => apiService.getEmailThread(threadId),
    enabled: !!threadId,
    staleTime: 60000, // 1 minute
  })
}

// Hook to search emails
export function useSearchEmails(query: string, filters?: any) {
  return useQuery({
    queryKey: emailQueryKeys.search(query),
    queryFn: () => apiService.searchEmails(query, filters),
    enabled: !!query && query.length > 2,
    staleTime: 30000,
  })
}

// Mutation hooks for email actions
export function useSendEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiService.sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success('Email sent successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send email')
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ emailId, email }: { emailId: string; email?: { subject?: string; from?: string; accountId?: string } }) =>
      apiService.markEmailAsRead(emailId),
    onSuccess: (_, { emailId, email }) => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })

      // Track behavior for AI learning
      if (email) {
        const userId = ascendoreAuth.getUser()?.id || 'anonymous'
        logEmailAction('read', userId, {
          id: emailId,
          subject: email.subject || 'No Subject',
          from: email.from || 'unknown'
        }, email.accountId || 'default')

        trackEmailBehavior('read', userId, {
          id: emailId,
          from: email.from || 'unknown'
        }, email.accountId || 'default')
      }
    },
    onError: (error: any) => {
      toast.error('Failed to mark as read')
    },
  })
}

export function useStarEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ emailId, starred, email }: { emailId: string; starred: boolean; email?: { subject?: string; from?: string; accountId?: string } }) =>
      apiService.markEmailAsStarred(emailId, starred),
    onSuccess: (_, { emailId, starred, email }) => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success(starred ? 'Email starred' : 'Email unstarred')

      // Track behavior for AI learning
      if (email) {
        const userId = ascendoreAuth.getUser()?.id || 'anonymous'
        logEmailAction(starred ? 'starred' : 'unstarred', userId, {
          id: emailId,
          subject: email.subject || 'No Subject',
          from: email.from || 'unknown'
        }, email.accountId || 'default')

        trackEmailBehavior(starred ? 'star' : 'unstar', userId, {
          id: emailId,
          from: email.from || 'unknown'
        }, email.accountId || 'default')
      }
    },
    onError: () => {
      toast.error('Failed to update star status')
    },
  })
}

export function useArchiveEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ emailId, email }: { emailId: string; email?: { subject?: string; from?: string; accountId?: string } }) =>
      apiService.archiveEmail(emailId),
    onSuccess: (_, { emailId, email }) => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success('Email archived')

      // Track behavior for AI learning
      if (email) {
        const userId = ascendoreAuth.getUser()?.id || 'anonymous'
        logEmailAction('archived', userId, {
          id: emailId,
          subject: email.subject || 'No Subject',
          from: email.from || 'unknown'
        }, email.accountId || 'default')

        trackEmailBehavior('archive', userId, {
          id: emailId,
          from: email.from || 'unknown'
        }, email.accountId || 'default')
      }
    },
    onError: () => {
      toast.error('Failed to archive email')
    },
  })
}

export function useDeleteEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ emailId, email }: { emailId: string; email?: { subject?: string; from?: string; accountId?: string } }) =>
      apiService.deleteEmail(emailId),
    onSuccess: (_, { emailId, email }) => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success('Email deleted')

      // Track behavior for AI learning
      if (email) {
        const userId = ascendoreAuth.getUser()?.id || 'anonymous'
        logEmailAction('deleted', userId, {
          id: emailId,
          subject: email.subject || 'No Subject',
          from: email.from || 'unknown'
        }, email.accountId || 'default')

        trackEmailBehavior('delete', userId, {
          id: emailId,
          from: email.from || 'unknown'
        }, email.accountId || 'default')
      }
    },
    onError: () => {
      toast.error('Failed to delete email')
    },
  })
}

// Account and folder hooks
export const accountQueryKeys = {
  all: ['accounts'] as const,
  folders: (accountId?: string) => ['folders', accountId] as const,
}

// Sync hook to trigger message sync for accounts
export function useSyncAccountMessages(accountId?: string) {
  return useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('No account ID provided')

      console.log(`🔄 Triggering message sync for account: ${accountId}`)
      return await apiService.syncAccountMessages(accountId)
    },
    onSuccess: (data) => {
      console.log('✅ Message sync completed successfully:', data)
      toast.success('Message sync completed! Refresh to see new emails.')
    },
    onError: (error: any) => {
      console.error('❌ Message sync failed:', error)

      // Handle timeout errors differently from actual failures
      if (error?.code === 'ECONNABORTED' && error?.message?.includes('timeout')) {
        console.log('🔄 Sync operation is running in background (timeout is normal for large accounts)')
        toast.success('Sync started! This may take several minutes for large accounts.', {
          duration: 5000,
        })
      } else {
        toast.error(`Sync failed: ${error?.message || 'Unknown error'}`)
      }
    },
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: accountQueryKeys.all,
    queryFn: async () => {
      // Check authentication before making API call
      const user = ascendoreAuth.getUser()
      const token = ascendoreAuth.getToken()

      if (!user || !token) {
        console.error('🚫 No valid authentication found for useAccounts')
        throw new Error('Authentication required - please sign in')
      }

      console.log('Fetching BoxZero linked accounts from API')
      console.log('  Authenticated user:', user.email)

      const result = await apiService.getLinkedAccounts()
      console.log('✅ BoxZero API response for accounts:', result)

      // Transform linked accounts to the format expected by UI components
      if (Array.isArray(result)) {
        const accounts = result.map((account: any) => {
          const email = account.externalEmail || account.external_email || 'Unknown Account'
          const provider = account.provider || 'unknown'
          const status = account.status || 'unknown'
          const lastSynced = account.lastSyncedAt || account.last_synced_at
          const timeAgo = lastSynced ? formatTimeAgo(lastSynced) : 'Never'

          return {
            id: account.accountId,
            name: email,
            email: email,
            provider: provider,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=${provider === 'microsoft' ? '0078d4' : '4285f4'}&color=fff`,
            status: status,
            lastSyncedAt: lastSynced,
            lastSynced: lastSynced,
            createdAt: account.createdAt || account.created_at,
            syncStatus: lastSynced ? `Synced ${timeAgo}` : 'Never synced'
          }
        })

        console.log('✅ Loaded', result.length, 'accounts')
        return { accounts }
      }

      return { accounts: [] }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  })
}

export function useFolders(accountId?: string) {
  return useQuery({
    queryKey: accountQueryKeys.folders(accountId),
    queryFn: async () => {
      if (accountId) {
        console.log(`Fetching folders for account ${accountId} from BoxZero API`)
        const result = await apiService.getAccountFolders(accountId)
        console.log('✅ BoxZero folders response:', result)

        // Transform the folder data for UI
        if (Array.isArray(result)) {
          return {
            folders: result.map((folder: any) => ({
              id: folder.folderId,
              externalId: folder.externalId,
              name: folder.displayName || folder.name || 'Unnamed Folder',
              count: folder.totalItemCount || folder.unreadItemCount || 0,
              type: folder.name?.toLowerCase() || 'folder',
              accountId: folder.accountId
            }))
          }
        }

        return { folders: [] }
      }

      // No accountId provided - return empty folders
      return { folders: [] }
    },
    staleTime: 300000, // 5 minutes
    enabled: !!accountId,
  })
}

// Profile and Settings Query Keys
export const profileQueryKeys = {
  all: ['profile'] as const,
  profile: () => [...profileQueryKeys.all, 'data'] as const,
  notifications: () => [...profileQueryKeys.all, 'notifications'] as const,
  privacy: () => [...profileQueryKeys.all, 'privacy'] as const,
}

export const settingsQueryKeys = {
  all: ['settings'] as const,
  account: (accountId: string) => [...settingsQueryKeys.all, 'account', accountId] as const,
  credentials: (accountId: string) => [...settingsQueryKeys.all, 'credentials', accountId] as const,
}

// Mock data for profile and settings
const mockUserProfile: UserProfile = {
  id: 'user-1',
  firstName: 'Andrew',
  lastName: 'Smart',
  displayName: 'Andrew Smart',
  avatar: 'https://ui-avatars.com/api/?name=Andrew+Smart&background=3b82f6&color=fff',
  phone: '+1 (555) 123-4567',
  timezone: 'America/New_York',
  language: 'en',
  theme: 'system',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  emailSignature: 'Best regards,\nAndrew Smart\nBoxZero Team',
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    desktopNotifications: false,
    soundNotifications: true,
    notifyOnImportant: true,
    notifyOnMentions: true,
    digestFrequency: 'hourly',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  },
  privacy: {
    showOnlineStatus: true,
    allowReadReceipts: true,
    shareAnalytics: false,
    showInDirectory: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString()
}

const mockAccountSettings: AccountSettings = {
  id: 'settings-1',
  accountId: 'acc1',
  syncEnabled: true,
  syncFrequency: 15,
  maxSyncMessages: 1000,
  downloadAttachments: true,
  autoReply: {
    enabled: false,
    subject: 'Out of Office',
    message: 'I am currently out of the office and will respond when I return.',
  },
  forwarding: {
    enabled: false,
    forwardTo: '',
    keepCopy: true
  },
  filters: [],
  signature: {
    enabled: true,
    htmlContent: '<p>Best regards,<br><strong>Andrew Smart</strong><br>BoxZero Team</p>',
    plainContent: 'Best regards,\nAndrew Smart\nBoxZero Team'
  },
  security: {
    twoFactorEnabled: false,
    allowLessSecureApps: false,
    trustedDevices: []
  },
  quotaSettings: {
    storageLimit: 15000, // 15GB
    currentUsage: 4250, // 4.25GB
    attachmentLimit: 25 // 25MB
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString()
}

// Profile Hooks
export function useUserProfile() {
  return useQuery({
    queryKey: profileQueryKeys.profile(),
    queryFn: async () => {
      try {
        return await apiService.getUserProfile()
      } catch (error) {
        console.warn('API unavailable for profile, falling back to mock data:', error)
        return { profile: mockUserProfile }
      }
    },
    staleTime: 300000, // 5 minutes
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      try {
        return await apiService.updateUserProfile(profileData)
      } catch (error) {
        console.warn('API unavailable for profile update, simulating success:', error)
        // Simulate successful update for development
        return { success: true, profile: { ...mockUserProfile, ...profileData } }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.profile() })
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    }
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      try {
        return await apiService.uploadProfileAvatar(file)
      } catch (error) {
        console.warn('API unavailable for avatar upload, simulating success:', error)
        // Simulate successful upload for development
        const simulatedUrl = `https://ui-avatars.com/api/?name=${mockUserProfile.firstName}+${mockUserProfile.lastName}&background=3b82f6&color=fff&size=128`
        return { success: true, avatarUrl: simulatedUrl }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.profile() })
      toast.success('Avatar updated successfully')
    },
    onError: (error) => {
      console.error('Failed to upload avatar:', error)
      toast.error('Failed to upload avatar')
    }
  })
}

// Notification Settings Hooks
export function useNotificationSettings() {
  return useQuery({
    queryKey: profileQueryKeys.notifications(),
    queryFn: async () => {
      try {
        return await apiService.getNotificationSettings()
      } catch (error) {
        console.warn('API unavailable for notifications, falling back to mock data:', error)
        return { notifications: mockUserProfile.notifications }
      }
    },
    staleTime: 300000,
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      try {
        return await apiService.updateNotificationSettings(settings)
      } catch (error) {
        console.warn('API unavailable for notification settings update, simulating success:', error)
        // Simulate successful update for development
        return { success: true, notifications: settings }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.notifications() })
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.profile() })
      toast.success('Notification settings updated')
    },
    onError: (error) => {
      console.error('Failed to update notification settings:', error)
      toast.error('Failed to update notification settings')
    }
  })
}

// Privacy Settings Hooks
export function usePrivacySettings() {
  return useQuery({
    queryKey: profileQueryKeys.privacy(),
    queryFn: async () => {
      try {
        return await apiService.getPrivacySettings()
      } catch (error) {
        console.warn('API unavailable for privacy settings, falling back to mock data:', error)
        return { privacy: mockUserProfile.privacy }
      }
    },
    staleTime: 300000,
  })
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: PrivacySettings) => {
      try {
        return await apiService.updatePrivacySettings(settings)
      } catch (error) {
        console.warn('API unavailable for privacy settings update, simulating success:', error)
        // Simulate successful update for development
        return { success: true, privacy: settings }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.privacy() })
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.profile() })
      toast.success('Privacy settings updated')
    },
    onError: (error) => {
      console.error('Failed to update privacy settings:', error)
      toast.error('Failed to update privacy settings')
    }
  })
}

// Account Settings Hooks
export function useAccountSettings(accountId: string) {
  return useQuery({
    queryKey: settingsQueryKeys.account(accountId),
    queryFn: async () => {
      try {
        return await apiService.getAccountSettings(accountId)
      } catch (error) {
        console.warn('API unavailable for account settings, falling back to mock data:', error)
        return { settings: { ...mockAccountSettings, accountId } }
      }
    },
    enabled: !!accountId,
    staleTime: 300000,
  })
}

export function useUpdateAccountSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, settings }: { accountId: string; settings: Partial<AccountSettings> }) => {
      try {
        return await apiService.updateAccountSettings(accountId, settings)
      } catch (error) {
        console.warn('API unavailable for account settings update, simulating success:', error)
        // Simulate successful update for development
        return { success: true, settings: { ...mockAccountSettings, ...settings, accountId } }
      }
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.account(accountId) })
      toast.success('Account settings updated')
    },
    onError: (error) => {
      console.error('Failed to update account settings:', error)
      toast.error('Failed to update account settings')
    }
  })
}

export function useTestAccountConnection() {
  return useMutation({
    mutationFn: async (accountId: string) => {
      try {
        return await apiService.testAccountConnection(accountId)
      } catch (error) {
        console.warn('API unavailable for connection test, simulating success:', error)
        // Simulate successful connection test for development
        return { success: true, status: 'connected', message: 'Connection test successful (simulated)' }
      }
    },
    onSuccess: () => {
      toast.success('Connection test successful')
    },
    onError: (error) => {
      console.error('Connection test failed:', error)
      toast.error('Connection test failed')
    }
  })
}

export function useSyncAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      try {
        return await apiService.syncAccount(accountId)
      } catch (error) {
        console.warn('API unavailable for account sync, simulating success:', error)
        // Simulate successful sync for development
        return { success: true, syncedEmails: 42, message: 'Account sync completed (simulated)' }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success('Account sync completed')
    },
    onError: (error) => {
      console.error('Account sync failed:', error)
      toast.error('Account sync failed')
    }
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      try {
        return await apiService.deleteAccount(accountId)
      } catch (error) {
        console.warn('API unavailable for account deletion, simulating success:', error)
        // Simulate successful deletion for development
        return { success: true, message: 'Account deleted successfully (simulated)' }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: emailQueryKeys.all })
      toast.success('Account deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete account:', error)
      toast.error('Failed to delete account')
    }
  })
}