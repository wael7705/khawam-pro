/**
 * Image optimization utilities for better performance
 */
import React from 'react'

/**
 * Lazy load image with intersection observer
 */
export const createLazyImageObserver = (callback: (entry: IntersectionObserverEntry) => void) => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry)
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.01,
    }
  )
}

/**
 * Preload critical images
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Get optimized image URL with WebP support
 */
export const getOptimizedImageUrl = (url: string, width?: number, quality: number = 80): string => {
  if (!url) return ''
  
  // If it's a data URL or external URL, return as is
  if (url.startsWith('data:') || url.startsWith('http')) {
    return url
  }
  
  // For local images, you can add optimization parameters here
  // This is a placeholder for future CDN integration
  return url
}

/**
 * Lazy load component for images
 */
export const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}> = ({ src, alt, className, style, onError, onLoad }) => {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    if (!imgRef.current) return

    const observer = createLazyImageObserver((entry) => {
      if (entry.isIntersecting) {
        setImageSrc(src)
        observer?.disconnect()
      }
    })

    if (observer) {
      observer.observe(imgRef.current)
      return () => observer.disconnect()
    } else {
      // Fallback for browsers without IntersectionObserver
      setImageSrc(src)
    }
  }, [src])

  return (
    <img
      ref={imgRef}
      src={imageSrc || undefined}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onLoad={(e) => {
        setIsLoaded(true)
        onLoad?.(e)
      }}
      onError={onError}
    />
  )
}

