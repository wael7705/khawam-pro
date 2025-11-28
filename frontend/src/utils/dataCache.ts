/**
 * Data caching utility for better performance on slow connections
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
}

class DataCache {
  private cache: Map<string, CacheItem<any>> = new Map()

  /**
   * Get data from cache if valid
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, duration: number = CACHE_DURATION.MEDIUM): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration,
    })
  }

  /**
   * Clear specific cache item
   */
  clear(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear()
  }

  /**
   * Check if cache item exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

export const dataCache = new DataCache()

/**
 * Fetch with cache support
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration: number = CACHE_DURATION.MEDIUM
): Promise<T> {
  // Check cache first
  const cached = dataCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  try {
    // Fetch data
    const data = await fetchFn()
    
    // Store in cache
    dataCache.set(key, data, duration)
    
    return data
  } catch (error) {
    // On error, return cached data if available (stale-while-revalidate)
    const staleCached = dataCache.get<T>(key)
    if (staleCached !== null) {
      console.warn(`Using stale cache for ${key} due to error:`, error)
      return staleCached
    }
    throw error
  }
}

/**
 * Prefetch data in background
 */
export function prefetchData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration: number = CACHE_DURATION.MEDIUM
): void {
  // Only prefetch if not already cached
  if (!dataCache.has(key)) {
    fetchFn()
      .then((data) => {
        dataCache.set(key, data, duration)
      })
      .catch((error) => {
        console.warn(`Prefetch failed for ${key}:`, error)
      })
  }
}

