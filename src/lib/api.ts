import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ascendoreAuth } from './ascendore-auth'
import {
  BackendEmail,
  BackendFolder,
  BackendEmailAccount,
  adaptBackendEmail,
  adaptBackendEmails,
  adaptBackendFolder,
  adaptBackendFolders,
  adaptBackendAccount,
  adaptBackendAccounts,
  groupEmailsIntoThreads
} from './adapters/email-adapter'
import { Email, EmailThread, EmailFolder, EmailAccount } from '@/types/email'

class APIService {
  private client: AxiosInstance

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://ascendore-email-api.azurewebsites.net'
    console.log('API Service initialized with base URL:', baseURL)

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        console.log('Making API request to:', config.baseURL + config.url, 'with params:', config.params)

        // Get token from ascendore auth service
        const token = ascendoreAuth.getToken()
        const user = ascendoreAuth.getUser()

        if (token && user) {
          config.headers.Authorization = `Bearer ${token}`
          console.log(`Added auth token to request for user:`, user.email)
        } else {
          console.log('No authenticated user, making request without auth token')
        }
        return config
      },
      (error) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('API Response received:', response.status, response.data)
        return response
      },
      (error) => {
        console.error('API Error Details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        })
        return Promise.reject(error)
      }
    )
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    // Allow per-request timeout override
    const requestConfig = {
      ...config,
      timeout: config.timeout || this.client.defaults.timeout
    }
    const response = await this.client.request<T>(requestConfig)
    return response.data
  }

  // Email-related API methods (updated for AscendoreAI-Email API)
  async getEmails(params?: {
    folder?: string
    account_id?: string
    limit?: number
    offset?: number
    is_read?: boolean
    is_starred?: boolean
  }): Promise<{ emails: Email[]; threads: EmailThread[] }> {
    try {
      console.log('Fetching emails from AscendoreAI-Email API...')
      const result = await this.request<{ success: boolean; data: BackendEmail[] }>({
        method: 'GET',
        url: '/api/emails',
        params
      })

      const emails = adaptBackendEmails(result.data || [])
      const threads = groupEmailsIntoThreads(emails)

      console.log(`✅ Successfully fetched ${emails.length} emails, ${threads.length} threads`)
      return { emails, threads }
    } catch (error: any) {
      console.log('❌ Failed to fetch emails:', error.response?.status, error.response?.data?.message || error.message)
      throw error
    }
  }

  // Get email by ID
  async getEmail(emailId: string): Promise<Email> {
    const result = await this.request<{ success: boolean; data: BackendEmail }>({
      method: 'GET',
      url: `/api/emails/${emailId}`
    })
    return adaptBackendEmail(result.data)
  }

  async getEmailThread(threadId: string) {
    return this.request({
      method: 'GET',
      url: `/api/emails/threads/${threadId}`,
    })
  }

  async sendEmail(emailData: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    attachments?: File[]
  }) {
    const formData = new FormData()
    formData.append('to', JSON.stringify(emailData.to))
    if (emailData.cc) formData.append('cc', JSON.stringify(emailData.cc))
    if (emailData.bcc) formData.append('bcc', JSON.stringify(emailData.bcc))
    formData.append('subject', emailData.subject)
    formData.append('body', emailData.body)

    if (emailData.attachments) {
      emailData.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })
    }

    return this.request({
      method: 'POST',
      url: '/api/emails/send',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  async markEmailAsRead(emailId: string, isRead: boolean = true) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/read`,
      data: { is_read: isRead }
    })
  }

  async markEmailAsStarred(emailId: string, isStarred: boolean) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/star`,
      data: { is_starred: isStarred },
    })
  }

  async archiveEmail(emailId: string) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/archive`,
    })
  }

  async deleteEmail(emailId: string) {
    return this.request({
      method: 'DELETE',
      url: `/api/emails/${emailId}`,
    })
  }

  // Undo-related API methods
  async unarchiveEmail(emailId: string, targetFolder: string = 'INBOX') {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/move`,
      data: { folder: targetFolder },
    })
  }

  async moveEmail(emailId: string, targetFolder: string) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/move`,
      data: { folder: targetFolder },
    })
  }

  async restoreFromTrash(emailId: string, targetFolder: string = 'INBOX') {
    return this.request({
      method: 'POST',
      url: `/api/emails/${emailId}/restore`,
      data: { folder: targetFolder },
    })
  }

  async markEmailAsUnread(emailId: string) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/unread`,
    })
  }

  async updateEmailLabels(emailId: string, labels: string[]) {
    return this.request({
      method: 'PATCH',
      url: `/api/emails/${emailId}/labels`,
      data: { labels },
    })
  }

  async unsnoozeEmail(emailId: string) {
    return this.request({
      method: 'DELETE',
      url: `/api/emails/${emailId}/snooze`,
    })
  }

  async batchRestoreEmails(emailIds: string[], targetFolder: string = 'INBOX') {
    return this.request({
      method: 'POST',
      url: '/api/emails/batch/restore',
      data: { emailIds, folder: targetFolder },
    })
  }

  // Account-related API methods (updated for AscendoreAI-Email API)
  async getAccounts(): Promise<EmailAccount[]> {
    const result = await this.request<{ success: boolean; data: BackendEmailAccount[] }>({
      method: 'GET',
      url: '/api/accounts',
    })
    return adaptBackendAccounts(result.data || [])
  }

  // Get single account
  async getAccount(accountId: string): Promise<EmailAccount> {
    const result = await this.request<{ success: boolean; data: BackendEmailAccount }>({
      method: 'GET',
      url: `/api/accounts/${accountId}`,
    })
    return adaptBackendAccount(result.data)
  }

  // Delete/disconnect email account
  async deleteLinkedAccount(accountId: string) {
    return this.request({
      method: 'DELETE',
      url: `/api/accounts/${accountId}`,
    })
  }

  // Sync emails from provider
  async syncAccountEmails(accountId: string, maxResults: number = 50) {
    console.log(`🔄 Triggering email sync for account: ${accountId}`)
    return this.request({
      method: 'POST',
      url: '/api/emails/sync',
      data: {
        account_id: accountId,
        max_results: maxResults
      },
      timeout: 120000, // 2 minutes for sync operations
    })
  }

  // Toggle sync for account
  async toggleAccountSync(accountId: string, syncEnabled: boolean) {
    return this.request({
      method: 'PATCH',
      url: `/api/accounts/${accountId}/sync`,
      data: { sync_enabled: syncEnabled }
    })
  }

  // Get folders for account
  async getAccountFolders(accountId: string): Promise<EmailFolder[]> {
    const result = await this.request<{ success: boolean; data: BackendFolder[] }>({
      method: 'GET',
      url: '/api/folders',
      params: { account_id: accountId }
    })
    return adaptBackendFolders(result.data || [])
  }

  // Get emails for a specific account
  async getAccountEmails(accountId: string, params?: {
    folder_id?: string
    limit?: number
    offset?: number
    is_read?: boolean
    is_starred?: boolean
  }): Promise<{ emails: Email[]; threads: EmailThread[] }> {
    const result = await this.request<{ success: boolean; data: BackendEmail[] }>({
      method: 'GET',
      url: '/api/emails',
      params: {
        account_id: accountId,
        ...params
      }
    })
    const emails = adaptBackendEmails(result.data || [])
    const threads = groupEmailsIntoThreads(emails)
    return { emails, threads }
  }

  async addEmailAccount(accountData: {
    provider: string
    email: string
    credentials: any
  }) {
    return this.request({
      method: 'POST',
      url: '/api/accounts',
      data: accountData,
    })
  }

  // Folder-related API methods (updated for AscendoreAI-Email API)
  async getFolders(accountId?: string): Promise<EmailFolder[]> {
    const result = await this.request<{ success: boolean; data: BackendFolder[] }>({
      method: 'GET',
      url: '/api/folders',
      params: accountId ? { account_id: accountId } : undefined
    })
    return adaptBackendFolders(result.data || [])
  }

  // AI/RAG API methods (updated for BoxZero API)
  async askQuestion(query: string, options?: {
    top_k?: number
    after?: string
    before?: string
  }) {
    return this.request({
      method: 'POST',
      url: '/api/ask',
      data: {
        query,
        ...options,
      },
    })
  }

  // OAuth callback for email provider connections
  // NOTE: OAuth endpoints not implemented in current BoxZero API (returns 404)
  async oauthCallback(provider: 'microsoft' | 'google', code: string, redirectUri: string, email?: string) {
    throw new Error('OAuth endpoints are not implemented in the current BoxZero API. All OAuth endpoints return 404.')
  }

  // Search API methods
  // NOTE: Search endpoints not implemented in current BoxZero API (returns 404)
  async searchEmails(query: string, filters?: {
    dateRange?: string
    sender?: string
    hasAttachments?: boolean
    isUnread?: boolean
    isStarred?: boolean
  }) {
    throw new Error('Search endpoints are not implemented in the current BoxZero API. All search endpoints return 404.')
  }

  // Profile API methods
  async getUserProfile() {
    return this.request({
      method: 'GET',
      url: '/api/users/me',
    })
  }

  async updateUserProfile(profileData: any) {
    return this.request({
      method: 'PUT',
      url: '/api/profile',
      data: profileData,
    })
  }

  async uploadProfileAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    return this.request({
      method: 'POST',
      url: '/api/profile/avatar',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async deleteUserProfile() {
    return this.request({
      method: 'DELETE',
      url: '/api/profile',
    })
  }

  // Account Settings API methods
  async getAccountSettings(accountId: string) {
    return this.request({
      method: 'GET',
      url: `/api/accounts/${accountId}/settings`,
    })
  }

  async updateAccountSettings(accountId: string, settings: any) {
    return this.request({
      method: 'PUT',
      url: `/api/accounts/${accountId}/settings`,
      data: settings,
    })
  }

  async getAccountCredentials(accountId: string) {
    return this.request({
      method: 'GET',
      url: `/api/accounts/${accountId}/credentials`,
    })
  }

  async updateAccountCredentials(accountId: string, credentials: any) {
    return this.request({
      method: 'PUT',
      url: `/api/accounts/${accountId}/credentials`,
      data: credentials,
    })
  }

  async testAccountConnection(accountId: string) {
    return this.request({
      method: 'POST',
      url: `/api/accounts/${accountId}/test-connection`,
    })
  }

  async syncAccount(accountId: string) {
    return this.request({
      method: 'POST',
      url: `/api/accounts/${accountId}/sync`,
    })
  }

  async deleteAccount(accountId: string) {
    return this.request({
      method: 'DELETE',
      url: `/api/accounts/${accountId}`,
    })
  }

  // Notification Settings API methods
  async getNotificationSettings() {
    return this.request({
      method: 'GET',
      url: '/api/profile/notifications',
    })
  }

  async updateNotificationSettings(settings: any) {
    return this.request({
      method: 'PUT',
      url: '/api/profile/notifications',
      data: settings,
    })
  }

  // Privacy Settings API methods
  async getPrivacySettings() {
    return this.request({
      method: 'GET',
      url: '/api/profile/privacy',
    })
  }

  async updatePrivacySettings(settings: any) {
    return this.request({
      method: 'PUT',
      url: '/api/profile/privacy',
      data: settings,
    })
  }

  // =============================================================================
  // Compatibility Aliases (for existing hooks/components)
  // =============================================================================

  // Alias for getAccounts - used by existing hooks
  async getLinkedAccounts(): Promise<EmailAccount[]> {
    return this.getAccounts()
  }

  // Alias for syncAccountEmails - used by existing hooks
  async syncAccountMessages(accountId: string, maxResults: number = 50) {
    return this.syncAccountEmails(accountId, maxResults)
  }

  // Alias for getAccountEmails with folder support
  async getAccountMessages(
    accountId: string,
    folderId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ emails: Email[]; threads: EmailThread[] }> {
    return this.getAccountEmails(accountId, {
      folder_id: folderId,
      limit,
      offset
    })
  }
}

// Create a singleton instance
export const apiService = new APIService()
export default apiService