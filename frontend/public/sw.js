// Service Worker for Khawam Pro
// Updated cache version to force cache refresh
const CACHE_NAME = 'khawam-pro-v2'
const DYNAMIC_CACHE_PREFIX = 'khawam-pro-dynamic-'

// URLs that should be cached (static assets only)
const urlsToCache = [
  '/',
  '/logo.jpg',
]

// File extensions that should NOT be cached (dynamic assets)
const NO_CACHE_EXTENSIONS = ['.js', '.css', '.json']

// Check if URL should be cached
function shouldCache(url) {
  const urlLower = url.toLowerCase()
  // Don't cache dynamic assets with hash in filename
  if (urlLower.includes('/assets/') && (urlLower.endsWith('.js') || urlLower.endsWith('.css'))) {
    return false
  }
  // Don't cache API requests
  if (urlLower.includes('/api/')) {
    return false
  }
  return true
}

// Install event
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Installing...')
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
  console.log('🔄 Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches (including v1 and any dynamic caches)
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

// Fetch event - Network first strategy for dynamic assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Always fetch from network first for dynamic assets (JS, CSS with hash)
  if (!shouldCache(event.request.url)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch((error) => {
          console.warn('⚠️ Service Worker: Network fetch failed for', event.request.url, error)
          // Return a basic error response for dynamic assets
          return new Response('Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
    )
    return
  }
  
  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Try network first for non-cached or navigation requests
        const fetchPromise = fetch(event.request, { cache: 'reload' })
          .then((networkResponse) => {
            // Only cache successful static responses
            if (networkResponse && networkResponse.status === 200 && shouldCache(event.request.url)) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache)
              })
            }
            return networkResponse
          })
          .catch((error) => {
            console.warn('⚠️ Service Worker: Fetch failed for', event.request.url, error)
            // Return cached version if network fails
            if (cachedResponse) {
              return cachedResponse
            }
            
            // For navigation requests, return index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html')
            }
            
            return new Response('Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
        
        // Return cached version immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise
      })
      .catch((error) => {
        console.error('❌ Service Worker: Error', error)
        return fetch(event.request).catch(() => {
          return new Response('Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
      })
  )
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

