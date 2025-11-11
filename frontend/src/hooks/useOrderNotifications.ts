import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { getToken, isAdmin, isEmployee } from '../lib/auth'
import { showInfo } from '../utils/toast'

export interface OrderNotification {
  id: string
  orderId: number
  orderNumber: string
  customerName: string
  customerPhone?: string
  serviceName?: string | null
  deliveryType?: string
  totalAmount?: number
  finalAmount?: number
  itemsCount?: number
  createdAt: string
  imageUrl?: string // صورة الطلب للإشعار
}

interface UseOrderNotificationsResult {
  notifications: OrderNotification[]
  dismissNotification: (id: string) => void
  onNotificationClick?: (orderId: number) => void
}

interface UseOrderNotificationsOptions {
  onNotificationClick?: (orderId: number) => void
  enableDesktopNotifications?: boolean
}

const RECONNECT_BASE_DELAY = 3000
const RECONNECT_MAX_DELAY = 30000
const AUTO_DISMISS_MS = 15000
const HEARTBEAT_INTERVAL = 30000

function buildWebSocketUrl(pathWithQuery: string): string {
  const explicitWs = import.meta.env.VITE_WS_URL?.trim()
  const normalizedPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`

  if (explicitWs) {
    const sanitized = explicitWs.endsWith('/') ? explicitWs.slice(0, -1) : explicitWs
    return `${sanitized}${normalizedPath}`
  }

  let base = (import.meta.env.VITE_API_URL?.trim() || window.location.origin || '').replace(/\/+$/, '')

  if (base.endsWith('/api')) {
    base = base.slice(0, -4)
  }

  if (base.startsWith('http://')) {
    base = `ws://${base.slice(7)}`
  } else if (base.startsWith('https://')) {
    base = `wss://${base.slice(8)}`
  } else if (!base.startsWith('ws://') && !base.startsWith('wss://')) {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    const host = base.startsWith('//') ? base.slice(2) : window.location.host
    base = `${protocol}${host}`
  }

  return `${base}${normalizedPath}`
}

// تحسين صوت الإشعار ليكون أكثر شبهاً بواتساب
function playNotificationSound(audioContextRef: MutableRefObject<AudioContext | null>) {
  try {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor()
    }

    const ctx = audioContextRef.current
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    // نغمة مزدوجة مثل واتساب (نغمة عالية ثم منخفضة)
    const time = ctx.currentTime
    
    // النغمة الأولى (عالية)
    const oscillator1 = ctx.createOscillator()
    const gainNode1 = ctx.createGain()
    oscillator1.type = 'sine'
    oscillator1.frequency.setValueAtTime(784, time) // G5
    gainNode1.gain.setValueAtTime(0, time)
    gainNode1.gain.linearRampToValueAtTime(0.3, time + 0.05)
    gainNode1.gain.linearRampToValueAtTime(0, time + 0.2)
    oscillator1.connect(gainNode1)
    gainNode1.connect(ctx.destination)
    oscillator1.start(time)
    oscillator1.stop(time + 0.2)

    // النغمة الثانية (منخفضة) بعد 0.15 ثانية
    const oscillator2 = ctx.createOscillator()
    const gainNode2 = ctx.createGain()
    oscillator2.type = 'sine'
    oscillator2.frequency.setValueAtTime(523, time + 0.15) // C5
    gainNode2.gain.setValueAtTime(0, time + 0.15)
    gainNode2.gain.linearRampToValueAtTime(0.3, time + 0.2)
    gainNode2.gain.linearRampToValueAtTime(0, time + 0.4)
    oscillator2.connect(gainNode2)
    gainNode2.connect(ctx.destination)
    oscillator2.start(time + 0.15)
    oscillator2.stop(time + 0.4)
  } catch (error) {
    console.warn('Failed to play notification sound', error)
  }
}

// طلب إذن الإشعارات وإظهار إشعار سطح المكتب
async function showDesktopNotification(
  notification: OrderNotification,
  onNotificationClick?: (orderId: number) => void
): Promise<void> {
  // التحقق من دعم الإشعارات
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications')
    return
  }

  // طلب الإذن إذا لم يكن موجوداً
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return
    }
  }

  if (Notification.permission !== 'granted') {
    return
  }

  // إنشاء نص الإشعار
  const title = '🔔 طلب جديد'
  const body = `طلب ${notification.orderNumber} من ${notification.customerName}`
  
  // الحصول على صورة الطلب أو استخدام أيقونة افتراضية
  const icon = notification.imageUrl || '/favicon.ico'
  const badge = '/favicon.ico'

  // إنشاء الإشعار
  const desktopNotification = new Notification(title, {
    body,
    icon,
    badge,
    tag: `order-${notification.orderId}`, // لمنع تكرار الإشعارات
    requireInteraction: false, // يختفي تلقائياً
    silent: false, // إظهار الصوت
    timestamp: new Date(notification.createdAt).getTime(),
    data: {
      orderId: notification.orderId,
      orderNumber: notification.orderNumber,
      url: `/dashboard/orders/${notification.orderId}`
    }
  })

  // عند النقر على الإشعار، افتح الصفحة
  desktopNotification.onclick = () => {
    window.focus()
    if (onNotificationClick) {
      onNotificationClick(notification.orderId)
    } else {
      // التنقل الافتراضي
      window.location.href = `/dashboard/orders/${notification.orderId}`
    }
    desktopNotification.close()
  }

  // إغلاق الإشعار تلقائياً بعد 8 ثوانٍ
  setTimeout(() => {
    desktopNotification.close()
  }, 8000)
}

export function useOrderNotifications(options: UseOrderNotificationsOptions = {}): UseOrderNotificationsResult {
  const { onNotificationClick, enableDesktopNotifications = true } = options
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const manualCloseRef = useRef(false)
  const dismissTimersRef = useRef<Record<string, number>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const originalTitleRef = useRef<string | null>(null)
  
  // طلب إذن الإشعارات عند تحميل المكون
  useEffect(() => {
    if (enableDesktopNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Desktop notifications permission granted')
        } else {
          console.warn('⚠️ Desktop notifications permission denied')
        }
      }).catch(error => {
        console.warn('⚠️ Failed to request notification permission:', error)
      })
    }
  }, [enableDesktopNotifications])

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    const timer = dismissTimersRef.current[id]
    if (timer) {
      window.clearTimeout(timer)
      delete dismissTimersRef.current[id]
    }
  }

  useEffect(() => {
    // التحقق من وجود token أولاً - هذا الأهم
    const token = getToken()
    console.log('🔍 WebSocket hook - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      isAdmin: isAdmin(),
      isEmployee: isEmployee(),
    })
    
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      console.warn('⚠️ WebSocket: Skipping - no token available')
      return
    }

    // التحقق من أن المستخدم مدير أو موظف
    if (!(isAdmin() || isEmployee())) {
      console.log('ℹ️ WebSocket: Skipping - user is not admin or employee')
      return
    }
    
    console.log('✅ WebSocket: All checks passed, connecting...')

    manualCloseRef.current = false

    const restoreTitle = () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
        originalTitleRef.current = null
      }
    }

    const visibilityListener = () => {
      if (!document.hidden) {
        restoreTitle()
      }
    }

    document.addEventListener('visibilitychange', visibilityListener)

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current)
      }

      heartbeatIntervalRef.current = window.setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
          } catch (error) {
            console.warn('Failed to send heartbeat ping', error)
          }
        }
      }, HEARTBEAT_INTERVAL)
    }

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }

    const handleMessage = (rawMessage: MessageEvent) => {
      try {
        const payload = JSON.parse(rawMessage.data)
        if (payload?.event !== 'order_created' || !payload?.data) {
          return
        }

        const data = payload.data as Partial<OrderNotification>
        if (!data.orderNumber) {
          return
        }

        const orderNumber = (data as any).orderNumber ?? (data as any).order_number
        if (!orderNumber) {
          return
        }

        const totalAmountRaw = (data as any).totalAmount ?? (data as any).total_amount
        const finalAmountRaw = (data as any).finalAmount ?? (data as any).final_amount
        const itemsCountRaw = (data as any).itemsCount ?? (data as any).items_count

        const imageUrl = (data as any).image_url ?? (data as any).imageUrl ?? null
        const notification: OrderNotification = {
          id: orderNumber,
          orderId: (data as any).orderId ?? (data as any).order_id ?? 0,
          orderNumber,
          customerName: (data as any).customerName ?? (data as any).customer_name ?? 'عميل غير معروف',
          customerPhone: (data as any).customerPhone ?? (data as any).customer_phone,
          serviceName: (data as any).serviceName ?? (data as any).service_name ?? null,
          deliveryType: (data as any).deliveryType ?? (data as any).delivery_type,
          totalAmount: typeof totalAmountRaw === 'number' ? totalAmountRaw : totalAmountRaw ? Number(totalAmountRaw) : undefined,
          finalAmount: typeof finalAmountRaw === 'number' ? finalAmountRaw : finalAmountRaw ? Number(finalAmountRaw) : undefined,
          itemsCount: typeof itemsCountRaw === 'number' ? itemsCountRaw : itemsCountRaw ? Number(itemsCountRaw) : undefined,
          createdAt: (data as any).createdAt ?? (data as any).created_at ?? new Date().toISOString(),
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`) : undefined,
        }

        setNotifications((prev) => {
          if (prev.some((item) => item.id === notification.id)) {
            return prev
          }
          const next = [notification, ...prev]
          return next.slice(0, 5) // حد أقصى 5 إشعارات معروضة
        })

        // عرض Toast notification
        showInfo(`طلب جديد (${notification.orderNumber}) من ${notification.customerName}`)
        
        // تشغيل الصوت
        playNotificationSound(audioContextRef)

        // إظهار إشعار سطح المكتب (مثل واتساب ويب)
        if (enableDesktopNotifications) {
          showDesktopNotification(notification, onNotificationClick).catch(error => {
            console.warn('Failed to show desktop notification:', error)
          })
        }

        // تحديث عنوان الصفحة إذا كانت مخفية
        if (document.hidden) {
          if (originalTitleRef.current === null) {
            originalTitleRef.current = document.title
          }
          document.title = `🔔 طلب جديد - ${notification.orderNumber}`
        }

        const timerId = window.setTimeout(() => {
          dismissNotification(notification.id)
        }, AUTO_DISMISS_MS)
        dismissTimersRef.current[notification.id] = timerId
      } catch (error) {
        console.warn('Failed to parse order notification', error)
      }
    }

    const connect = () => {
      try {
        // التأكد من وجود token قبل محاولة الاتصال - تحقق مضاعف
        const currentToken = getToken()
        if (!currentToken || currentToken === 'null' || currentToken === 'undefined' || currentToken.trim() === '') {
          console.warn('WebSocket: Connection skipped - no valid token available')
          // إيقاف أي محاولات إعادة اتصال
          reconnectAttemptsRef.current = 999
          return
        }
        
        // تحقق إضافي: التأكد من أن token ليس null أو undefined كقيمة
        if (currentToken === null || currentToken === undefined) {
          console.warn('WebSocket: Connection skipped - token is null/undefined')
          reconnectAttemptsRef.current = 999
          return
        }
        
        const wsUrl = buildWebSocketUrl(`/ws/orders?token=${encodeURIComponent(currentToken)}`)
        
        // تحقق نهائي: التأكد من أن URL لا يحتوي على token=null
        if (wsUrl.includes('token=null') || wsUrl.includes('token=undefined')) {
          console.error('WebSocket: URL contains null token, aborting connection')
          reconnectAttemptsRef.current = 999
          return
        }
        
        console.log('WebSocket: Attempting to connect with valid token')
        const socket = new WebSocket(wsUrl)
        wsRef.current = socket

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0
          startHeartbeat()
        }

        socket.onmessage = handleMessage

        socket.onclose = () => {
          stopHeartbeat()
          wsRef.current = null
          if (manualCloseRef.current) {
            return
          }

          // التحقق من token قبل إعادة المحاولة
          const currentToken = getToken()
          if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
            console.warn('WebSocket: Reconnection skipped - no valid token')
            return
          }

          const attempt = reconnectAttemptsRef.current
          const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** attempt, RECONNECT_MAX_DELAY)
          reconnectAttemptsRef.current = attempt + 1

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, delay)
        }

        socket.onerror = () => {
          socket.close()
        }
      } catch (error) {
        console.warn('Failed to open WebSocket connection', error)
      }
    }

    connect()

    return () => {
      manualCloseRef.current = true
      stopHeartbeat()

      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          // ignore
        }
        wsRef.current = null
      }

      Object.values(dismissTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId)
      })
      dismissTimersRef.current = {}

      document.removeEventListener('visibilitychange', visibilityListener)
      restoreTitle()
    }
  }, [onNotificationClick, enableDesktopNotifications])

  return {
    notifications,
    dismissNotification,
    onNotificationClick,
  }
}

