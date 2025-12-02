/**
 * Attachment Preview Cache
 *
 * Caches attachment previews and thumbnails using IndexedDB
 * for offline access and faster loading.
 *
 * Features:
 * - IndexedDB storage for large files
 * - Memory cache for quick access
 * - Automatic cleanup of old entries
 * - Size limits and eviction policies
 */

// =============================================================================
// Types
// =============================================================================

export interface CachedAttachment {
  id: string
  emailId: string
  filename: string
  mimeType: string
  size: number
  thumbnailBlob?: Blob
  previewBlob?: Blob
  cachedAt: number
  lastAccessed: number
  expiresAt: number
}

export interface CacheConfig {
  maxSizeMB: number
  maxAgeDays: number
  thumbnailMaxWidth: number
  thumbnailMaxHeight: number
  previewMaxWidth: number
  previewMaxHeight: number
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSizeMB: 100, // 100MB cache limit
  maxAgeDays: 30, // Keep for 30 days
  thumbnailMaxWidth: 200,
  thumbnailMaxHeight: 200,
  previewMaxWidth: 800,
  previewMaxHeight: 600
}

// =============================================================================
// IndexedDB Setup
// =============================================================================

const DB_NAME = 'boxzero-attachment-cache'
const DB_VERSION = 1
const STORE_NAME = 'attachments'

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('emailId', 'emailId', { unique: false })
        store.createIndex('cachedAt', 'cachedAt', { unique: false })
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
      }
    }
  })

  return dbPromise
}

// =============================================================================
// Memory Cache (LRU)
// =============================================================================

class MemoryCache {
  private cache = new Map<string, { blob: Blob; lastAccessed: number }>()
  private maxSize: number

  constructor(maxSizeMB: number = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024 // Convert to bytes
  }

  get(key: string): Blob | null {
    const entry = this.cache.get(key)
    if (entry) {
      entry.lastAccessed = Date.now()
      return entry.blob
    }
    return null
  }

  set(key: string, blob: Blob): void {
    // Evict oldest if needed
    this.evictIfNeeded(blob.size)
    this.cache.set(key, { blob, lastAccessed: Date.now() })
  }

  private evictIfNeeded(newSize: number): void {
    let currentSize = this.getCurrentSize()

    while (currentSize + newSize > this.maxSize && this.cache.size > 0) {
      // Find oldest entry
      let oldestKey: string | null = null
      let oldestTime = Infinity

      this.cache.forEach((value, key) => {
        if (value.lastAccessed < oldestTime) {
          oldestTime = value.lastAccessed
          oldestKey = key
        }
      })

      if (oldestKey) {
        const entry = this.cache.get(oldestKey)
        if (entry) {
          currentSize -= entry.blob.size
        }
        this.cache.delete(oldestKey)
      }
    }
  }

  private getCurrentSize(): number {
    let size = 0
    this.cache.forEach((value) => {
      size += value.blob.size
    })
    return size
  }

  clear(): void {
    this.cache.clear()
  }
}

// =============================================================================
// Attachment Cache Service
// =============================================================================

class AttachmentCacheService {
  private config: CacheConfig
  private memoryCache: MemoryCache
  private pendingOperations = new Map<string, Promise<Blob | null>>()

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memoryCache = new MemoryCache(this.config.maxSizeMB / 2)
  }

  /**
   * Get cached thumbnail for an attachment
   */
  async getThumbnail(attachmentId: string): Promise<Blob | null> {
    const key = `thumb_${attachmentId}`

    // Check memory cache first
    const memoryHit = this.memoryCache.get(key)
    if (memoryHit) return memoryHit

    // Check IndexedDB
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(attachmentId)

        request.onsuccess = () => {
          const cached = request.result as CachedAttachment | undefined
          if (cached?.thumbnailBlob && !this.isExpired(cached)) {
            // Update last accessed
            this.updateLastAccessed(attachmentId)
            // Store in memory cache
            this.memoryCache.set(key, cached.thumbnailBlob)
            resolve(cached.thumbnailBlob)
          } else {
            resolve(null)
          }
        }

        request.onerror = () => {
          resolve(null)
        }
      })
    } catch {
      return null
    }
  }

  /**
   * Get cached preview for an attachment
   */
  async getPreview(attachmentId: string): Promise<Blob | null> {
    const key = `preview_${attachmentId}`

    // Check memory cache first
    const memoryHit = this.memoryCache.get(key)
    if (memoryHit) return memoryHit

    // Check IndexedDB
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(attachmentId)

        request.onsuccess = () => {
          const cached = request.result as CachedAttachment | undefined
          if (cached?.previewBlob && !this.isExpired(cached)) {
            this.updateLastAccessed(attachmentId)
            this.memoryCache.set(key, cached.previewBlob)
            resolve(cached.previewBlob)
          } else {
            resolve(null)
          }
        }

        request.onerror = () => {
          resolve(null)
        }
      })
    } catch {
      return null
    }
  }

  /**
   * Cache an attachment with its thumbnail and preview
   */
  async cacheAttachment(
    attachment: {
      id: string
      emailId: string
      filename: string
      mimeType: string
      size: number
    },
    thumbnailBlob?: Blob,
    previewBlob?: Blob
  ): Promise<void> {
    const now = Date.now()
    const expiresAt = now + this.config.maxAgeDays * 24 * 60 * 60 * 1000

    const cached: CachedAttachment = {
      ...attachment,
      thumbnailBlob,
      previewBlob,
      cachedAt: now,
      lastAccessed: now,
      expiresAt
    }

    try {
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(cached)

        request.onsuccess = () => {
          // Also store in memory cache
          if (thumbnailBlob) {
            this.memoryCache.set(`thumb_${attachment.id}`, thumbnailBlob)
          }
          if (previewBlob) {
            this.memoryCache.set(`preview_${attachment.id}`, previewBlob)
          }
          resolve()
        }

        request.onerror = () => {
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[AttachmentCache] Failed to cache:', error)
    }
  }

  /**
   * Generate and cache a thumbnail from an image file
   */
  async generateThumbnail(
    attachmentId: string,
    imageBlob: Blob,
    emailId: string,
    filename: string
  ): Promise<Blob | null> {
    // Check if already generating
    const pendingKey = `thumb_${attachmentId}`
    if (this.pendingOperations.has(pendingKey)) {
      return this.pendingOperations.get(pendingKey)!
    }

    const operation = this.createThumbnail(imageBlob).then(async (thumbnailBlob) => {
      if (thumbnailBlob) {
        await this.cacheAttachment(
          {
            id: attachmentId,
            emailId,
            filename,
            mimeType: imageBlob.type,
            size: imageBlob.size
          },
          thumbnailBlob
        )
      }
      this.pendingOperations.delete(pendingKey)
      return thumbnailBlob
    })

    this.pendingOperations.set(pendingKey, operation)
    return operation
  }

  /**
   * Create a thumbnail from an image blob
   */
  private async createThumbnail(imageBlob: Blob): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(imageBlob)

      img.onload = () => {
        URL.revokeObjectURL(url)

        // Calculate dimensions
        let width = img.width
        let height = img.height
        const maxWidth = this.config.thumbnailMaxWidth
        const maxHeight = this.config.thumbnailMaxHeight

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Create canvas and draw
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            resolve(blob)
          },
          'image/jpeg',
          0.8
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  }

  /**
   * Update last accessed timestamp
   */
  private async updateLastAccessed(attachmentId: string): Promise<void> {
    try {
      const db = await openDatabase()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(attachmentId)

      request.onsuccess = () => {
        const cached = request.result as CachedAttachment | undefined
        if (cached) {
          cached.lastAccessed = Date.now()
          store.put(cached)
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if a cached entry is expired
   */
  private isExpired(cached: CachedAttachment): boolean {
    return Date.now() > cached.expiresAt
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<{ removed: number; freedBytes: number }> {
    let removed = 0
    let freedBytes = 0

    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.openCursor()

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const cached = cursor.value as CachedAttachment
            if (this.isExpired(cached)) {
              freedBytes += cached.size
              if (cached.thumbnailBlob) freedBytes += cached.thumbnailBlob.size
              if (cached.previewBlob) freedBytes += cached.previewBlob.size
              cursor.delete()
              removed++
            }
            cursor.continue()
          } else {
            resolve({ removed, freedBytes })
          }
        }

        request.onerror = () => {
          resolve({ removed, freedBytes })
        }
      })
    } catch {
      return { removed, freedBytes }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalItems: number
    totalSizeMB: number
    oldestEntry: Date | null
    newestEntry: Date | null
  }> {
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.openCursor()

        let totalItems = 0
        let totalSize = 0
        let oldest: number | null = null
        let newest: number | null = null

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const cached = cursor.value as CachedAttachment
            totalItems++
            totalSize += cached.size
            if (cached.thumbnailBlob) totalSize += cached.thumbnailBlob.size
            if (cached.previewBlob) totalSize += cached.previewBlob.size

            if (oldest === null || cached.cachedAt < oldest) {
              oldest = cached.cachedAt
            }
            if (newest === null || cached.cachedAt > newest) {
              newest = cached.cachedAt
            }
            cursor.continue()
          } else {
            resolve({
              totalItems,
              totalSizeMB: totalSize / (1024 * 1024),
              oldestEntry: oldest ? new Date(oldest) : null,
              newestEntry: newest ? new Date(newest) : null
            })
          }
        }

        request.onerror = () => {
          resolve({
            totalItems: 0,
            totalSizeMB: 0,
            oldestEntry: null,
            newestEntry: null
          })
        }
      })
    } catch {
      return {
        totalItems: 0,
        totalSizeMB: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }
  }

  /**
   * Clear all cached attachments
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear()

    try {
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Ignore
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const attachmentCache = new AttachmentCacheService()

// =============================================================================
// React Hook
// =============================================================================

import { useState, useEffect } from 'react'

export function useCachedAttachment(attachmentId: string | null) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!attachmentId) {
      setThumbnail(null)
      setPreview(null)
      return
    }

    let isMounted = true
    setIsLoading(true)

    async function loadCached() {
      const [thumbBlob, previewBlob] = await Promise.all([
        attachmentCache.getThumbnail(attachmentId!),
        attachmentCache.getPreview(attachmentId!)
      ])

      if (!isMounted) return

      if (thumbBlob) {
        setThumbnail(URL.createObjectURL(thumbBlob))
      }
      if (previewBlob) {
        setPreview(URL.createObjectURL(previewBlob))
      }
      setIsLoading(false)
    }

    loadCached()

    return () => {
      isMounted = false
      // Cleanup object URLs
      if (thumbnail) URL.revokeObjectURL(thumbnail)
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [attachmentId])

  return { thumbnail, preview, isLoading }
}

export default attachmentCache
