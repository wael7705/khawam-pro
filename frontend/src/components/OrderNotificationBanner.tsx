import { CalendarClock, MapPin, Phone, ShoppingBag, X } from 'lucide-react'
import { OrderNotification } from '../hooks/useOrderNotifications'
import './OrderNotificationBanner.css'

interface OrderNotificationBannerProps {
  notifications: OrderNotification[]
  onDismiss: (id: string) => void
  onViewOrder?: (orderId: number) => void
}

function timeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (60 * 1000))

  if (diffMinutes <= 0) return 'الآن'
  if (diffMinutes < 60) return `${diffMinutes} دقيقة مضت`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ساعة مضت`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} يوم مضى`
}

function deliveryLabel(type?: string) {
  if (type === 'delivery') return 'توصيل'
  if (type === 'self') return 'استلام ذاتي'
  return 'نوع التسليم غير محدد'
}

export default function OrderNotificationBanner({
  notifications,
  onDismiss,
  onViewOrder,
}: OrderNotificationBannerProps) {
  if (!notifications.length) {
    return null
  }

  return (
    <div className="order-notification-container">
      {notifications.map((notification) => {
        const showOrderButton = Boolean(onViewOrder && notification.orderId)
        const itemsLabel = notification.itemsCount ? `${notification.itemsCount} عنصر` : ''
        const amountLabel = notification.finalAmount ? `${notification.finalAmount.toLocaleString()} ل.س` : ''
        const separator = notification.itemsCount && notification.finalAmount ? ' • ' : ''

        return (
          <div key={notification.id} className="order-notification-card">
            <button
              type="button"
              className="order-notification-close"
              onClick={() => onDismiss(notification.id)}
              title="إخفاء الإشعار"
            >
              <X size={18} />
            </button>

            <div className="order-notification-header">
              <ShoppingBag size={20} />
              <div>
                <p className="order-notification-title">طلب جديد</p>
                <p className="order-notification-number">{notification.orderNumber}</p>
              </div>
            </div>

            <div className="order-notification-body">
              <div className="order-notification-row">
                <Phone size={18} />
                <div>
                  <p className="label">العميل</p>
                  <p className="value">
                    {notification.customerName}
                    {notification.customerPhone ? ` - ${notification.customerPhone}` : ''}
                  </p>
                </div>
              </div>

              {notification.serviceName ? (
                <div className="order-notification-row">
                  <MapPin size={18} />
                  <div>
                    <p className="label">الخدمة</p>
                    <p className="value">{notification.serviceName}</p>
                  </div>
                </div>
              ) : null}

              <div className="order-notification-row">
                <CalendarClock size={18} />
                <div>
                  <p className="label">{deliveryLabel(notification.deliveryType)}</p>
                  <p className="value">
                    {itemsLabel}
                    {separator}
                    {amountLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="order-notification-footer">
              <span>{timeAgo(notification.createdAt)}</span>
              {showOrderButton ? (
                <button
                  type="button"
                  className="order-notification-action"
                  onClick={() => onViewOrder?.(notification.orderId)}
                >
                  فتح الطلب
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

