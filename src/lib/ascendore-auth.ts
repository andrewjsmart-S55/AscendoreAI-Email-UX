import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ascendore-email-api.azurewebsites.net'

export interface AscendoreUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: string
}

export interface EmailAccount {
  id: string
  email: string
  provider: 'gmail' | 'outlook'
  displayName: string
  isActive: boolean
  syncEnabled: boolean
}

export interface AuthResponse {
  success: boolean
  message?: string
  data?: {
    token: string
    user: AscendoreUser
  }
  error?: string
}

export interface RegisterResponse extends AuthResponse {}
export interface LoginResponse extends AuthResponse {}

class AscendoreAuthService {
  private client: AxiosInstance
  private token: string | null = null
  private user: AscendoreUser | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    // Restore token from localStorage if available
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('ascendore_token')
      const storedUser = localStorage.getItem('ascendore_user')
      if (storedToken && storedUser) {
        // Validate stored token (JWT format)
        if (storedToken.split('.').length === 3) {
          this.token = storedToken
          try {
            this.user = JSON.parse(storedUser)
          } catch {
            this.clearAuthState()
          }
        } else {
          this.clearAuthState()
        }
      }
    }
  }

  async register(email: string, password: string, displayName?: string): Promise<RegisterResponse> {
    try {
      const response = await this.client.post('/api/auth/register', {
        email,
        password,
        displayName: displayName || email.split('@')[0],
      })

      if (response.data.success && response.data.data) {
        this.token = response.data.data.token
        this.user = response.data.data.user

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('ascendore_token', this.token)
          localStorage.setItem('ascendore_user', JSON.stringify(this.user))
        }

        return response.data
      }

      return {
        success: false,
        message: response.data.message || 'Registration failed',
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed'
      return { success: false, message, error: message }
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.client.post('/api/auth/login', {
        email,
        password,
      })

      if (response.data.success && response.data.data) {
        this.token = response.data.data.token
        this.user = response.data.data.user

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('ascendore_token', this.token)
          localStorage.setItem('ascendore_user', JSON.stringify(this.user))
        }

        return response.data
      }

      return {
        success: false,
        message: response.data.message || 'Login failed',
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      return { success: false, message, error: message }
    }
  }

  async logout(): Promise<void> {
    this.clearAuthState()
  }

  async getCurrentUser(): Promise<AscendoreUser | null> {
    if (!this.token) return null

    try {
      const response = await this.client.get('/api/auth/me')
      if (response.data.success && response.data.data) {
        this.user = response.data.data
        if (typeof window !== 'undefined') {
          localStorage.setItem('ascendore_user', JSON.stringify(this.user))
        }
        return this.user
      }
      return null
    } catch {
      return null
    }
  }

  getUser(): AscendoreUser | null {
    return this.user
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user
  }

  private clearAuthState(): void {
    this.token = null
    this.user = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ascendore_token')
      localStorage.removeItem('ascendore_user')
    }
  }

  // OAuth methods - initiate Gmail/Outlook connection
  async getGoogleAuthUrl(): Promise<string | null> {
    if (!this.token) return null

    try {
      const response = await this.client.get('/api/auth/google')
      if (response.data.success && response.data.data?.auth_url) {
        return response.data.data.auth_url
      }
      return null
    } catch {
      return null
    }
  }

  async getMicrosoftAuthUrl(): Promise<string | null> {
    if (!this.token) return null

    try {
      const response = await this.client.get('/api/auth/microsoft')
      if (response.data.success && response.data.data?.auth_url) {
        return response.data.data.auth_url
      }
      return null
    } catch {
      return null
    }
  }

  // Get connected email accounts
  async getEmailAccounts(): Promise<EmailAccount[]> {
    if (!this.token) return []

    try {
      const response = await this.client.get('/api/accounts')
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data
      }
      return []
    } catch {
      return []
    }
  }

  // HTTP client for other API calls
  getClient(): AxiosInstance {
    return this.client
  }
}

export const ascendoreAuth = new AscendoreAuthService()
export default ascendoreAuth
