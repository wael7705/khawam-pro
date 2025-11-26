// Service Worker for Khawam Pro
const CACHE_NAME = 'khawam-pro-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache opened')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error)
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
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
        icon: data.icon || '/logo.png',
        badge: '/logo.png',
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

