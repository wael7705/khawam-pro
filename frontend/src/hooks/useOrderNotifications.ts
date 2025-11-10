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
}

interface UseOrderNotificationsResult {
  notifications: OrderNotification[]
  dismissNotification: (id: string) => void
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

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35)

    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.65)
  } catch (error) {
    console.warn('Failed to play notification sound', error)
  }
}

export function useOrderNotifications(): UseOrderNotificationsResult {
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const manualCloseRef = useRef(false)
  const dismissTimersRef = useRef<Record<string, number>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const originalTitleRef = useRef<string | null>(null)

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
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      console.log('WebSocket: Skipping - no token available')
      return
    }

    // التحقق من أن المستخدم مدير أو موظف
    if (!(isAdmin() || isEmployee())) {
      console.log('WebSocket: Skipping - user is not admin or employee')
      return
    }

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
        }

        setNotifications((prev) => {
          if (prev.some((item) => item.id === notification.id)) {
            return prev
          }
          const next = [notification, ...prev]
          return next.slice(0, 5) // حد أقصى 5 إشعارات معروضة
        })

        showInfo(`طلب جديد (${notification.orderNumber}) من ${notification.customerName}`)
        playNotificationSound(audioContextRef)

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
  }, [])

  return {
    notifications,
    dismissNotification,
  }
}

