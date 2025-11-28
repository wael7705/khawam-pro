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
async function cleanupOldCaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      console.log('🧹 Cleaning up old caches...', cacheNames)
      
      // حذف جميع الكاشات القديمة
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('khawam-pro-') && cacheName !== 'khawam-pro-v2') {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        })
      )
      console.log('✅ Cache cleanup completed')
    } catch (error) {
      console.warn('⚠️ Cache cleanup failed:', error)
    }
  }
}

// تسجيل Service Worker مع تنظيف الكاش
if ('serviceWorker' in navigator) {
  // تنظيف الكاش القديم أولاً
  cleanupOldCaches()
  
  // إلغاء تسجيل جميع Service Workers القديمة
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('🗑️ Unregistering old service worker:', registration.scope)
      registration.unregister()
    })
    
    // بعد إلغاء التسجيل، انتظر قليلاً ثم سجل الجديد
    setTimeout(() => {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope)
            
            // التحقق من التحديثات وإجبار تحديث فوري
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('🔄 New service worker available, reloading...')
                    // تحديث الصفحة تلقائياً عند وجود تحديث جديد
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
      })
    }, 1000)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)