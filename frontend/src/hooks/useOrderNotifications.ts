import { useEffect, useState, useCallback, useRef } from 'react'
import { isAuthenticated } from '../lib/auth'

interface OrderNotification {
  event: string
  data: {
    order_id: number
    order_number: string
    customer_name: string
    customer_phone: string
    total_amount: number
    final_amount: number
    delivery_type: string
    service_name?: string
    items_count: number
    created_at: string
    image_url?: string
  }
}

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

  const [notifications, setNotifications] = useState<OrderNotification[]>([])
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
          icon: '/logo.png',
          badge: '/logo.png',
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
      setNotifications((prev) => [notification, ...prev])

      // تشغيل صوت التنبيه
      playNotificationSound()

      // إظهار إشعار المتصفح
      showBrowserNotification(notification)

      console.log(`✅ New order notification: ${notification.data.order_number}`)
    },
    [playNotificationSound, showBrowserNotification]
  )

  // الاتصال بـ WebSocket
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token')
    if (!token || !isAuthenticated()) {
      console.log('⚠️ No auth token, skipping WebSocket connection')
      return
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/api/ws/orders?token=${encodeURIComponent(token)}`

      console.log('🔌 Connecting to WebSocket...')
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', data)

          if (data.event === 'order_created' && data.data) {
            handleNewOrder(data as OrderNotification)
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('⚠️ WebSocket disconnected')
        setIsConnected(false)

        // إعادة الاتصال بعد 3 ثوان
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconnecting WebSocket...')
          connectWebSocket()
        }, 3000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error)
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

  const dismissNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return {
    notifications,
    isConnected,
    dismissNotification,
    notificationPermission,
  }
}
