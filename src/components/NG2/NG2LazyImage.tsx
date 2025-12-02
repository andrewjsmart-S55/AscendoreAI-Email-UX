'use client'

/**
 * NG2 Lazy Image Component
 *
 * Optimized image loading with:
 * - Intersection Observer for lazy loading
 * - Placeholder blur effect
 * - Progressive loading
 * - Error handling with fallback
 * - Caching support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PhotoIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

// =============================================================================
// Types
// =============================================================================

interface NG2LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholderClassName?: string
  width?: number
  height?: number
  priority?: boolean // Load immediately without lazy loading
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
}

// =============================================================================
// Image Cache
// =============================================================================

const imageCache = new Map<string, {
  loaded: boolean
  error: boolean
  blob?: Blob
  objectUrl?: string
}>()

// Preload an image
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      const cached = imageCache.get(src)!
      if (cached.loaded) {
        resolve()
        return
      }
      if (cached.error) {
        reject(new Error('Image failed to load'))
        return
      }
    }

    const img = new Image()
    img.onload = () => {
      imageCache.set(src, { loaded: true, error: false })
      resolve()
    }
    img.onerror = () => {
      imageCache.set(src, { loaded: false, error: true })
      reject(new Error('Image failed to load'))
    }
    img.src = src
  })
}

// Preload multiple images
export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(src => preloadImage(src).catch(() => {})))
}

// Clear image cache
export function clearImageCache(): void {
  imageCache.forEach((value) => {
    if (value.objectUrl) {
      URL.revokeObjectURL(value.objectUrl)
    }
  })
  imageCache.clear()
}

// =============================================================================
// Component
// =============================================================================

export function NG2LazyImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  width,
  height,
  priority = false,
  onLoad,
  onError,
  fallback
}: NG2LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if already cached
  useEffect(() => {
    const cached = imageCache.get(src)
    if (cached?.loaded) {
      setIsLoaded(true)
    } else if (cached?.error) {
      setHasError(true)
    }
  }, [src])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [priority, isLoaded])

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    imageCache.set(src, { loaded: true, error: false })
    onLoad?.()
  }, [src, onLoad])

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true)
    imageCache.set(src, { loaded: false, error: true })
    onError?.()
  }, [src, onError])

  // Render error state
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-700 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gray-700 animate-pulse ${placeholderClassName}`}
        >
          <PhotoIcon className="w-8 h-8 text-gray-500" />
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  )
}

// =============================================================================
// Attachment Preview Component
// =============================================================================

interface AttachmentPreviewProps {
  attachment: {
    id: string
    filename: string
    mimeType: string
    size: number
    url?: string
    thumbnailUrl?: string
  }
  onClick?: () => void
  className?: string
}

export function AttachmentPreview({
  attachment,
  onClick,
  className = ''
}: AttachmentPreviewProps) {
  const isImage = attachment.mimeType?.startsWith('image/')
  const isPdf = attachment.mimeType === 'application/pdf'
  const isVideo = attachment.mimeType?.startsWith('video/')

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file icon based on type
  const getFileIcon = () => {
    if (isImage) return '🖼️'
    if (isPdf) return '📄'
    if (isVideo) return '🎬'
    if (attachment.mimeType?.includes('spreadsheet') || attachment.filename?.endsWith('.xlsx')) return '📊'
    if (attachment.mimeType?.includes('document') || attachment.filename?.endsWith('.docx')) return '📝'
    if (attachment.mimeType?.includes('presentation') || attachment.filename?.endsWith('.pptx')) return '📽️'
    if (attachment.mimeType?.includes('zip') || attachment.mimeType?.includes('compressed')) return '📦'
    return '📎'
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors ${className}`}
    >
      {/* Thumbnail or Icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-600 rounded">
        {isImage && attachment.thumbnailUrl ? (
          <NG2LazyImage
            src={attachment.thumbnailUrl}
            alt={attachment.filename}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <span className="text-xl">{getFileIcon()}</span>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm text-white truncate">{attachment.filename}</p>
        <p className="text-xs text-gray-400">{formatSize(attachment.size)}</p>
      </div>
    </button>
  )
}

// =============================================================================
// Image Gallery Component
// =============================================================================

interface ImageGalleryProps {
  images: Array<{
    id: string
    src: string
    alt?: string
    thumbnailSrc?: string
  }>
  className?: string
}

export function ImageGallery({ images, className = '' }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Preload next/prev images when one is selected
  useEffect(() => {
    if (selectedIndex !== null) {
      const toPreload: string[] = []
      if (selectedIndex > 0) {
        toPreload.push(images[selectedIndex - 1].src)
      }
      if (selectedIndex < images.length - 1) {
        toPreload.push(images[selectedIndex + 1].src)
      }
      preloadImages(toPreload)
    }
  }, [selectedIndex, images])

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-purple-500 transition-all"
          >
            <NG2LazyImage
              src={image.thumbnailSrc || image.src}
              alt={image.alt || `Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedIndex(null)}
          >
            <span className="text-2xl">&times;</span>
          </button>

          {/* Navigation */}
          {selectedIndex > 0 && (
            <button
              className="absolute left-4 text-white hover:text-gray-300 text-4xl"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(selectedIndex - 1)
              }}
            >
              ‹
            </button>
          )}
          {selectedIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white hover:text-gray-300 text-4xl"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(selectedIndex + 1)
              }}
            >
              ›
            </button>
          )}

          {/* Main Image */}
          <NG2LazyImage
            src={images[selectedIndex].src}
            alt={images[selectedIndex].alt || ''}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            priority
          />
        </div>
      )}
    </>
  )
}

export default NG2LazyImage
