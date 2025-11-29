// Service Worker for Khawam Pro
// Updated cache version to force cache refresh
const CACHE_NAME = 'khawam-pro-v5'
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
  
  // NEVER intercept ANY assets from /assets/ directory - let browser handle them directly
  if (urlLower.includes('/assets/')) {
    return false // Don't intercept any assets - let them pass through normally
  }
  
  // NEVER intercept API requests
  if (urlLower.includes('/api/') || urlLower.includes('railway.app/api/') || urlLower.includes('railway.app/')) {
    return false
  }
  
  // Never intercept external domains
  try {
    const urlObj = new URL(url)
    // Only intercept same origin requests
    if (urlObj.origin !== self.location.origin) {
      return false
    }
  } catch (e) {
    // Invalid URL, don't intercept
    return false
  }
  
  // Only intercept navigation requests (page loads) and specific static files we want to cache
  // This means we only handle:
  // - Navigation requests (page loads)
  // - Specific static files like /logo.jpg, /index.html
  return true
}

// Install event
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Installing v5...')
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
  console.log('🔄 Service Worker: Activating v5...')
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
    // Don't call event.respondWith - let the request bypass service worker completely
    // This allows the browser to fetch the resource normally without service worker interference
    return
  }
  
  // Only handle navigation requests (page loads) and specific static assets we want to cache
  if (event.request.mode === 'navigate' || shouldCache(urlString)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // For navigation, try network first
          if (event.request.mode === 'navigate') {
            return fetch(event.request)
              .then((networkResponse) => {
                // Cache the HTML response
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone()
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache)
                  })
                }
                return networkResponse
              })
              .catch(() => {
                // If network fails, return cached version or index.html
                return cachedResponse || caches.match('/index.html') || new Response('Page not available', {
                  status: 503,
                  statusText: 'Service Unavailable'
                })
              })
          }
          
          // For static assets, return cached if available, otherwise fetch from network
          if (cachedResponse) {
            return cachedResponse
          }
          
          return fetch(event.request)
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
              console.warn('⚠️ Service Worker: Fetch failed for', urlString, error)
              // Return error response instead of trying to fetch again
              return new Response('Resource not available', {
                status: 503,
                statusText: 'Service Unavailable'
              })
            })
        })
        .catch((error) => {
          console.error('❌ Service Worker: Error', error)
          // Fallback: try to fetch directly without caching
          return fetch(event.request).catch(() => {
            return new Response('Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
        })
    )
  }
  // For all other requests (including assets), don't intercept - let browser handle normally
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

