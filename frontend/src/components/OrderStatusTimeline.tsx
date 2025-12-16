import { useEffect, useState } from 'react'
import { CheckCircle, Clock, XCircle, Package, Truck, MapPin } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import './OrderStatusTimeline.css'

interface StatusHistoryItem {
  id: number
  status: string
  changed_by: number | null
  notes: string | null
  created_at: string
}

interface OrderStatusTimelineProps {
  orderId: number
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'قيد المراجعة', icon: <Clock size={20} />, color: '#f59e0b' },
  accepted: { label: 'مقبول', icon: <CheckCircle size={20} />, color: '#3b82f6' },
  preparing: { label: 'قيد التحضير', icon: <Package size={20} />, color: '#8b5cf6' },
  shipping: { label: 'قيد التوصيل', icon: <Truck size={20} />, color: '#06b6d4' },
  awaiting_pickup: { label: 'جاهز للاستلام', icon: <MapPin size={20} />, color: '#10b981' },
  completed: { label: 'مكتمل', icon: <CheckCircle size={20} />, color: '#10b981' },
  cancelled: { label: 'ملغى', icon: <XCircle size={20} />, color: '#ef4444' },
  rejected: { label: 'مرفوض', icon: <XCircle size={20} />, color: '#ef4444' },
}

export default function OrderStatusTimeline({ orderId }: OrderStatusTimelineProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await ordersAPI.getStatusHistory(orderId)
        setHistory(response.data.status_history || [])
      } catch (error) {
        console.error('Error loading status history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [orderId])

  if (loading) {
    return <div className="status-timeline-loading">جاري تحميل تاريخ الحالة...</div>
  }

  if (history.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="order-status-timeline">
      <h4>خط زمني حالة الطلب</h4>
      <div className="timeline-container">
        {history.map((item, index) => {
          const config = statusConfig[item.status] || {
            label: item.status,
            icon: <Clock size={20} />,
            color: '#6b7280',
          }
          const isLast = index === history.length - 1

          return (
            <div key={item.id} className="timeline-item">
              <div className="timeline-marker" style={{ borderColor: config.color }}>
                <div className="timeline-icon" style={{ backgroundColor: config.color }}>
                  {config.icon}
                </div>
              </div>
              {!isLast && <div className="timeline-line" style={{ backgroundColor: config.color }} />}
              <div className="timeline-content">
                <div className="timeline-status" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="timeline-date">{formatDate(item.created_at)}</div>
                {item.notes && (
                  <div className="timeline-notes">
                    <strong>ملاحظات:</strong> {item.notes}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

