// Service Worker for Khawam Pro
// Updated cache version to force cache refresh
const CACHE_NAME = 'khawam-pro-v4'
const DYNAMIC_CACHE_PREFIX = 'khawam-pro-dynamic-'

// URLs that should be cached (static assets only)
const urlsToCache = [
  '/',
  '/logo.jpg',
]

// Check if URL should be cached
function shouldCache(url) {
  const urlLower = url.toLowerCase()
  // Don't cache dynamic assets with hash in filename
  if (urlLower.includes('/assets/') && (urlLower.endsWith('.js') || urlLower.endsWith('.css'))) {
    return false
  }
  // Don't cache API requests - let them pass through without interception
  if (urlLower.includes('/api/')) {
    return false
  }
  return true
}

// Check if request should be intercepted by Service Worker at all
function shouldIntercept(url) {
  const urlLower = url.toLowerCase()
  
  // NEVER intercept dynamic assets (JS, CSS with hash in filename)
  if (urlLower.includes('/assets/')) {
    // Check if it's a dynamic asset (has hash in filename)
    const assetsMatch = urlLower.match(/\/assets\/[^\/]+\.(js|css)/)
    if (assetsMatch) {
      // Check if filename contains hash (typically 8+ characters before extension)
      const filename = assetsMatch[0]
      // If filename has a hash pattern (like index-XXXXXXXX.js), don't intercept
      const hashPattern = /-[a-zA-Z0-9]{8,}\.(js|css)$/
      if (hashPattern.test(filename)) {
        return false // Don't intercept dynamic assets
      }
    }
  }
  
  // NEVER intercept API requests
  if (urlLower.includes('/api/') || urlLower.includes('railway.app/api/')) {
    return false
  }
  
  // Never intercept external domains (except same origin)
  try {
    const urlObj = new URL(url)
    // Allow same origin only
    if (urlObj.origin !== self.location.origin) {
      // Exception: allow static assets from CDN if needed, but not dynamic JS/CSS
      return false
    }
  } catch (e) {
    // Invalid URL, skip
  }
  
  return true
}

// Install event
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Installing v4...')
  // Force activation of new service worker immediately
  self.skipWaiting()
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache opened', CACHE_NAME)
        // Only cache static assets
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })))
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error)
      })
  )
})

// Activate event - delete ALL old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating v4...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches (including v1, v2, v3 and any dynamic caches)
          if (cacheName !== CACHE_NAME && (cacheName.startsWith('khawam-pro-') || cacheName.startsWith(DYNAMIC_CACHE_PREFIX))) {
            console.log('🗑️ Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - DO NOT intercept dynamic assets or API requests
self.addEventListener('fetch', (event) => {
  const urlString = event.request.url
  
  // CRITICAL: Check if we should intercept this request at all
  if (!shouldIntercept(urlString)) {
    return // Don't call event.respondWith - let the request bypass service worker completely
  }
  
  // For static assets only, use cache-first strategy
  if (shouldCache(urlString)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Try network first for non-cached or navigation requests
          const fetchPromise = fetch(event.request, { cache: 'reload' })
            .then((networkResponse) => {
              // Only cache successful static responses
              if (networkResponse && networkResponse.status === 200 && shouldCache(urlString)) {
                const responseToCache = networkResponse.clone()
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache)
                })
              }
              return networkResponse
            })
            .catch((error) => {
              console.warn('⚠️ Service Worker: Fetch failed for static asset', urlString, error)
              // Return cached version if network fails
              if (cachedResponse) {
                return cachedResponse
              }
              
              // For navigation requests, return index.html
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html')
              }
              
              // Fallback: try to fetch directly
              return fetch(event.request).catch(() => {
                return new Response('Resource not available', {
                  status: 503,
                  statusText: 'Service Unavailable'
                })
              })
            })
          
          // Return cached version immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise
        })
        .catch((error) => {
          console.error('❌ Service Worker: Error', error)
          // Fallback: try to fetch directly
          return fetch(event.request).catch(() => {
            return new Response('Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
        })
    )
  } else {
    // For non-cacheable assets, just let them pass through (shouldn't reach here due to shouldIntercept check)
    return
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json()
      const options = {
        body: data.body || 'طلب جديد',
        icon: data.icon || '/logo.jpg',
        badge: '/logo.jpg',
        vibrate: [100, 50, 100],
        data: data.data || {},
        tag: data.tag || 'new-order',
        requireInteraction: false,
      }

      event.waitUntil(
        self.registration.showNotification(data.title || '🆕 طلب جديد', options)
      )
    } catch (error) {
      console.error('❌ Service Worker: Push notification error', error)
    }
  }
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard/orders')
    )
  }
})

// Background sync for orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-orders') {
    console.log('🔄 Service Worker: Background sync for orders')
    event.waitUntil(syncOrders())
  }
})

async function syncOrders() {
  try {
    // يمكن إضافة منطق مزامنة الطلبات هنا
    console.log('✅ Service Worker: Orders synced')
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error)
  }
}

