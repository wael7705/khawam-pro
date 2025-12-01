import { useEffect, useState, useCallback, useRef } from 'react'
import { isAuthenticated } from '../lib/auth'
import type { OrderNotification, OrderNotificationDisplay } from '../types/notifications'

// Re-export types for backwards compatibility
export type { OrderNotification, OrderNotificationDisplay }

interface UseOrderNotificationsOptions {
  onNotificationClick?: (orderId: number) => void
  enableDesktopNotifications?: boolean
  enableSoundNotifications?: boolean
}

export function useOrderNotifications(options: UseOrderNotificationsOptions = {}) {
  const {
    onNotificationClick,
    enableDesktopNotifications = true,
    enableSoundNotifications = true,
  } = options

  const [notifications, setNotifications] = useState<OrderNotificationDisplay[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const knownOrderIdsRef = useRef<Set<number>>(new Set())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default' && enableDesktopNotifications) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission)
        console.log(`📢 Notification permission: ${permission}`)
      })
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [enableDesktopNotifications])

  // تشغيل صوت التنبيه
  const playNotificationSound = useCallback(() => {
    if (!enableSoundNotifications) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // تردد الصوت
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('⚠️ فشل تشغيل صوت التنبيه:', error)
    }
  }, [enableSoundNotifications])

  // إظهار إشعار المتصفح
  const showBrowserNotification = useCallback(
    (notification: OrderNotification) => {
      if (!enableDesktopNotifications || notificationPermission !== 'granted') return

      const { order_number, customer_name, total_amount, service_name } = notification.data

      try {
        const browserNotification = new Notification('🆕 طلب جديد', {
          body: `طلب ${order_number} من ${customer_name} - ${service_name || 'خدمة'}`,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: `order-${notification.data.order_id}`,
          requireInteraction: false,
          data: {
            orderId: notification.data.order_id,
          },
        })

        browserNotification.onclick = () => {
          window.focus()
          if (onNotificationClick) {
            onNotificationClick(notification.data.order_id)
          }
          browserNotification.close()
        }
      } catch (error) {
        console.warn('⚠️ فشل إظهار إشعار المتصفح:', error)
      }
    },
    [enableDesktopNotifications, notificationPermission, onNotificationClick]
  )

  // تحويل OrderNotification إلى OrderNotificationDisplay
  const convertToDisplayNotification = useCallback((notification: OrderNotification): OrderNotificationDisplay => {
    return {
      id: `order-${notification.data.order_id}-${Date.now()}`,
      orderId: notification.data.order_id,
      orderNumber: notification.data.order_number,
      customerName: notification.data.customer_name,
      customerPhone: notification.data.customer_phone,
      totalAmount: notification.data.total_amount,
      finalAmount: notification.data.final_amount,
      deliveryType: notification.data.delivery_type,
      serviceName: notification.data.service_name,
      itemsCount: notification.data.items_count,
      createdAt: notification.data.created_at,
      imageUrl: notification.data.image_url,
    }
  }, [])

  // معالجة إشعار جديد
  const handleNewOrder = useCallback(
    (notification: OrderNotification) => {
      const orderId = notification.data.order_id

      // تجنب الإشعارات المكررة
      if (knownOrderIdsRef.current.has(orderId)) {
        console.log(`⏭️ Order ${orderId} already notified, skipping`)
        return
      }

      knownOrderIdsRef.current.add(orderId)
      
      // تحويل إلى البنية المسطحة
      const displayNotification = convertToDisplayNotification(notification)
      setNotifications((prev) => [displayNotification, ...prev])

      // تشغيل صوت التنبيه
      playNotificationSound()

      // إظهار إشعار المتصفح
      showBrowserNotification(notification)

      console.log(`✅ New order notification: ${notification.data.order_number}`)
    },
    [playNotificationSound, showBrowserNotification, convertToDisplayNotification]
  )

  // الاتصال بـ WebSocket
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token')
    if (!token || !isAuthenticated()) {
      console.log('⚠️ No auth token, skipping WebSocket connection')
      return
    }

    try {
      // استخدام API URL من environment أو من window.location
      // استخدام نفس baseURL المستخدم في api.ts
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'
      
      // إزالة /api من النهاية إذا كان موجوداً (لأننا سنضيفه لاحقاً)
      const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '')
      
      // بناء WebSocket URL
      let wsUrl: string
      if (baseUrl.startsWith('https://')) {
        wsUrl = baseUrl.replace('https://', 'wss://') + '/api/ws/orders'
      } else if (baseUrl.startsWith('http://')) {
        wsUrl = baseUrl.replace('http://', 'ws://') + '/api/ws/orders'
      } else {
        // Fallback: استخدام window.location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}/api/ws/orders`
      }
      
      // إضافة token
      wsUrl += `?token=${encodeURIComponent(token)}`

      // إزالة console.log للتقليل من الضوضاء في الكونسول
      // console.log('🔌 Connecting to WebSocket...', wsUrl.replace(token, 'TOKEN_HIDDEN'))
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        // إزالة console.log للتقليل من الضوضاء
        // console.log('✅ WebSocket connected')
        setIsConnected(true)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // إزالة console.log للتقليل من الضوضاء
          // console.log('📨 WebSocket message received:', data)

          // معالجة رسائل ping/pong
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
          }

          // معالجة إشعارات الطلبات الجديدة
          if (data.event === 'order_created' && data.data) {
            handleNewOrder(data as OrderNotification)
          }
        } catch (error) {
          // فقط طباعة الأخطاء المهمة
          // console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        // لا تطبع الخطأ في الكونسول - WebSocket errors عادية عند انقطاع الاتصال
        // فقط تحديث الحالة بشكل صامت
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        // WebSocket code 1006 يعني انقطاع الاتصال (connection reset)
        // هذا طبيعي عند مشاكل الشبكة وسيعاد الاتصال تلقائياً
        // لا حاجة لطباعة تحذيرات في Console
        setIsConnected(false)

        // إعادة الاتصال فقط إذا لم يكن الإغلاق متعمداً
        if (event.code !== 1000 && event.code !== 1001) {
          // تنظيف أي timeout سابق
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          // إعادة الاتصال بعد تأخير متزايد (exponential backoff)
          // حساب عدد المحاولات من delay
          const attemptCount = Math.floor(Math.log(reconnectTimeoutRef.current ? 1 : 0) / Math.log(1.5)) || 0
          const delay = Math.min(3000 * Math.pow(1.5, attemptCount), 30000) // بين 3 ثواني و 30 ثانية
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isAuthenticated() && !wsRef.current) {
              // إعادة الاتصال فقط إذا لم يكن هناك اتصال موجود
              connectWebSocket()
            }
          }, delay)
        } else {
          // تنظيف timeout إذا كان الإغلاق طبيعياً
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
        }
      }

      wsRef.current = ws
    } catch (error) {
      // إزالة console.error للتقليل من الضوضاء - الأخطاء عادية عند مشاكل الشبكة
      // console.error('❌ Error creating WebSocket:', error)
      setIsConnected(false)
    }
  }, [handleNewOrder])

  // الاتصال عند التحميل
  useEffect(() => {
    if (isAuthenticated()) {
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectWebSocket])

  // إعادة الاتصال عند تغيير التوكن
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && e.newValue && !wsRef.current) {
        connectWebSocket()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [connectWebSocket])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return {
    notifications,
    isConnected,
    dismissNotification,
    notificationPermission,
  }
}
