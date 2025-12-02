/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for data persistence that can switch
 * between localStorage, IndexedDB, and backend API.
 *
 * Hybrid approach:
 * - Phase 1: localStorage for quick development
 * - Phase 2: IndexedDB for larger datasets (sender models, behavior events)
 * - Phase 3: Backend API for server-side persistence
 */

// =============================================================================
// Storage Adapter Interface
// =============================================================================

export interface StorageAdapter {
  /** Get a value by key */
  get<T>(key: string): Promise<T | null>

  /** Set a value by key */
  set<T>(key: string, value: T): Promise<void>

  /** Delete a value by key */
  delete(key: string): Promise<void>

  /** Check if key exists */
  has(key: string): Promise<boolean>

  /** Get all keys with a given prefix */
  keys(prefix?: string): Promise<string[]>

  /** Get all values with keys matching prefix */
  getAll<T>(prefix: string): Promise<T[]>

  /** Clear all data (use with caution) */
  clear(): Promise<void>
}

// =============================================================================
// LocalStorage Adapter
// =============================================================================

const STORAGE_PREFIX = 'boxzero_'

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key)
      if (!item) return null
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`[Storage] Error getting key ${key}:`, error)
      return null
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    } catch (error) {
      console.error(`[Storage] Error setting key ${key}:`, error)
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] Quota exceeded, attempting cleanup...')
        await cleanupOldData()
        // Retry once
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
      }
    }
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(STORAGE_PREFIX + key)
  },

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(STORAGE_PREFIX + key) !== null
  },

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = []
    const fullPrefix = STORAGE_PREFIX + (prefix || '')

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(fullPrefix)) {
        keys.push(key.replace(STORAGE_PREFIX, ''))
      }
    }

    return keys
  },

  async getAll<T>(prefix: string): Promise<T[]> {
    const keys = await this.keys(prefix)
    const values: T[] = []

    for (const key of keys) {
      const value = await (this as StorageAdapter).get<T>(key)
      if (value !== null) {
        values.push(value)
      }
    }

    return values
  },

  async clear(): Promise<void> {
    const keys = await this.keys()
    for (const key of keys) {
      localStorage.removeItem(STORAGE_PREFIX + key)
    }
  }
}

// =============================================================================
// IndexedDB Adapter (for larger datasets)
// =============================================================================

const DB_NAME = 'boxzero_db'
const DB_VERSION = 1
const STORE_NAME = 'data'

let dbInstance: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export const indexedDBAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result ?? null)
      })
    } catch (error) {
      console.error(`[IndexedDB] Error getting key ${key}:`, error)
      // Fallback to localStorage
      return localStorageAdapter.get<T>(key)
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(value, key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error(`[IndexedDB] Error setting key ${key}:`, error)
      // Fallback to localStorage
      return localStorageAdapter.set<T>(key, value)
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(key)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error(`[IndexedDB] Error deleting key ${key}:`, error)
    }
  },

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  },

  async keys(prefix?: string): Promise<string[]> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAllKeys()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const allKeys = request.result as string[]
          if (prefix) {
            resolve(allKeys.filter(k => k.startsWith(prefix)))
          } else {
            resolve(allKeys)
          }
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Error getting keys:', error)
      return []
    }
  },

  async getAll<T>(prefix: string): Promise<T[]> {
    const keys = await this.keys(prefix)
    const values: T[] = []

    for (const key of keys) {
      const value = await (this as StorageAdapter).get<T>(key)
      if (value !== null) {
        values.push(value)
      }
    }

    return values
  },

  async clear(): Promise<void> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.clear()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('[IndexedDB] Error clearing store:', error)
    }
  }
}

// =============================================================================
// Storage Manager (combines adapters by data type)
// =============================================================================

export type DataCategory =
  | 'activity'     // Activity events (localStorage, recent only)
  | 'behavior'     // Sender models, behavior events (IndexedDB)
  | 'predictions'  // AI predictions cache (IndexedDB)
  | 'streak'       // Streak/gamification data (localStorage)
  | 'settings'     // User settings (localStorage)

const categoryAdapters: Record<DataCategory, StorageAdapter> = {
  activity: localStorageAdapter,
  behavior: typeof indexedDB !== 'undefined' ? indexedDBAdapter : localStorageAdapter,
  predictions: typeof indexedDB !== 'undefined' ? indexedDBAdapter : localStorageAdapter,
  streak: localStorageAdapter,
  settings: localStorageAdapter
}

export class StorageManager {
  private adapters = categoryAdapters

  /**
   * Get the appropriate adapter for a data category
   */
  getAdapter(category: DataCategory): StorageAdapter {
    return this.adapters[category]
  }

  /**
   * Get a value from the appropriate store
   */
  async get<T>(category: DataCategory, key: string): Promise<T | null> {
    return this.adapters[category].get<T>(`${category}:${key}`)
  }

  /**
   * Set a value in the appropriate store
   */
  async set<T>(category: DataCategory, key: string, value: T): Promise<void> {
    return this.adapters[category].set<T>(`${category}:${key}`, value)
  }

  /**
   * Delete a value from the appropriate store
   */
  async delete(category: DataCategory, key: string): Promise<void> {
    return this.adapters[category].delete(`${category}:${key}`)
  }

  /**
   * Get all values for a category
   */
  async getAll<T>(category: DataCategory): Promise<T[]> {
    return this.adapters[category].getAll<T>(`${category}:`)
  }

  /**
   * Clear all data for a category
   */
  async clearCategory(category: DataCategory): Promise<void> {
    const adapter = this.adapters[category]
    const keys = await adapter.keys(`${category}:`)
    for (const key of keys) {
      await adapter.delete(key)
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    localStorage: { used: number; available: number }
    indexedDB: { used: number }
  }> {
    // localStorage usage
    let localStorageUsed = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key)
        localStorageUsed += (key.length + (value?.length || 0)) * 2 // UTF-16 = 2 bytes per char
      }
    }

    // IndexedDB usage (estimate)
    let indexedDBUsed = 0
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      try {
        const estimate = await navigator.storage.estimate()
        indexedDBUsed = estimate.usage || 0
      } catch {
        // Storage API not available
      }
    }

    return {
      localStorage: {
        used: localStorageUsed,
        available: 5 * 1024 * 1024 // 5MB typical limit
      },
      indexedDB: {
        used: indexedDBUsed
      }
    }
  }
}

// Singleton instance
export const storage = new StorageManager()

// =============================================================================
// Cleanup Utilities
// =============================================================================

/**
 * Remove old data to free up storage space
 */
async function cleanupOldData(): Promise<void> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  // Cleanup old activity events
  const activityKeys = await localStorageAdapter.keys('activity:')
  for (const key of activityKeys) {
    const event = await localStorageAdapter.get<{ timestamp: string }>(key)
    if (event && new Date(event.timestamp).getTime() < thirtyDaysAgo) {
      await localStorageAdapter.delete(key)
    }
  }

  // Cleanup old predictions
  const predictionKeys = await indexedDBAdapter.keys('predictions:')
  for (const key of predictionKeys) {
    const prediction = await indexedDBAdapter.get<{ timestamp: string }>(key)
    if (prediction && new Date(prediction.timestamp).getTime() < thirtyDaysAgo) {
      await indexedDBAdapter.delete(key)
    }
  }

  console.log('[Storage] Cleanup completed')
}

/**
 * Export all user data (for backup/export feature)
 */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}

  // Export from localStorage
  const localKeys = await localStorageAdapter.keys()
  for (const key of localKeys) {
    data[key] = await localStorageAdapter.get(key)
  }

  // Export from IndexedDB
  const idbKeys = await indexedDBAdapter.keys()
  for (const key of idbKeys) {
    data[key] = await indexedDBAdapter.get(key)
  }

  return data
}

/**
 * Import user data (for restore feature)
 */
export async function importData(data: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    // Determine which adapter to use based on key prefix
    if (key.startsWith('behavior:') || key.startsWith('predictions:')) {
      await indexedDBAdapter.set(key, value)
    } else {
      await localStorageAdapter.set(key, value)
    }
  }
}
