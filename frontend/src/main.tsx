import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

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

// معالجة أخطاء تحميل الـ scripts
window.addEventListener('error', (event) => {
  if (event.target && (event.target as HTMLElement).tagName === 'SCRIPT') {
    const script = event.target as HTMLScriptElement
    console.error('❌ Script loading error:', script.src)
    
    // إعادة محاولة تحميل الـ script
    if (script.src && !script.dataset.retried) {
      script.dataset.retried = 'true'
      const newScript = document.createElement('script')
      newScript.src = script.src
      newScript.type = 'module'
      newScript.async = true
      
      newScript.onload = () => {
        console.log('✅ Script reloaded successfully:', script.src)
      }
      
      newScript.onerror = () => {
        console.error('❌ Script reload failed:', script.src)
      }
      
      document.head.appendChild(newScript)
    }
  }
}, true)

// معالجة أخطاء الـ chunks
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
    const message = String(event.reason.message)
    if (message.includes('Failed to fetch') || message.includes('ERR_CONNECTION_RESET')) {
      console.warn('⚠️ Chunk loading error detected, will retry...')
      // إعادة تحميل الصفحة بعد تأخير قصير
      setTimeout(() => {
        if (document.readyState === 'complete') {
          window.location.reload()
        }
      }, 2000)
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
