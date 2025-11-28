import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Ensure React is available globally for libraries that expect it (like recharts)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.React = React
}

// تنظيف الكاش القديم وإلغاء تسجيل Service Worker القديم
async function cleanupOldServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      // إلغاء تسجيل جميع Service Workers القديمة
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        console.log('🗑️ Unregistering old service worker:', registration.scope)
        await registration.unregister()
      }
      
      // حذف جميع الكاشات القديمة
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          if (cacheName.startsWith('khawam-pro-')) {
            console.log('🗑️ Deleting old cache:', cacheName)
            await caches.delete(cacheName)
          }
        }
      }
      
      console.log('✅ Old service workers and caches cleaned up')
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error)
    }
  }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // تنظيف القديم أولاً
    await cleanupOldServiceWorkers()
    
    // انتظر قليلاً ثم سجل الجديد
    setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope)
          
          // التحقق من التحديثات
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker available, reloading...')
                  window.location.reload()
                }
              })
            }
          })
          
          // التحقق من التحديثات كل 60 ثانية
          setInterval(() => {
            registration.update()
          }, 60000)
        })
        .catch((error) => {
          console.warn('⚠️ Service Worker registration failed:', error)
        })
    }, 500)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
