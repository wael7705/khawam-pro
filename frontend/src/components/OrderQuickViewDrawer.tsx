import { useState, useEffect } from 'react'
import { X, Download, ExternalLink, MapPin, Navigation, Copy, CheckCircle, AlertCircle, Clock, MessageSquare, FileText } from 'lucide-react'
import { adminAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import SimpleMap from './SimpleMap'
import { collectOrderAttachments, type NormalizedAttachment } from '../utils/orderAttachments'
import { getStatusOptionsForOrder, getAllowedNextStatuses } from '../utils/orderStatus'
import './OrderQuickViewDrawer.css'

interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp: string
  shop_name?: string
  status: string
  delivery_type: string
  total_amount: number
  final_amount: number
  created_at: string
  image_url?: string
  cancellation_reason?: string
  rejection_reason?: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  rating?: number
  rating_comment?: string
  order_type?: 'product' | 'service'
  total_quantity?: number
  service_name?: string
  items?: any[]
  status_history?: Array<{
    status: string
    created_at: string
    reason?: string
  }>
}

interface OrderQuickViewDrawerProps {
  orderId: number | null
  onClose: () => void
  onStatusUpdate?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'في الانتظار',
  accepted: 'تم القبول',
  preparing: 'قيد التحضير',
  shipping: 'قيد التوصيل',
  awaiting_pickup: 'في انتظار الاستلام',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  rejected: 'مرفوض',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  preparing: '#8B5CF6',
  shipping: '#10B981',
  awaiting_pickup: '#06B6D4',
  completed: '#10B981',
  cancelled: '#EF4444',
  rejected: '#EF4444',
}

export default function OrderQuickViewDrawer({ orderId, onClose, onStatusUpdate }: OrderQuickViewDrawerProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<NormalizedAttachment[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [statusReason, setStatusReason] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    } else {
      setOrder(null)
      setAttachments([])
    }
  }, [orderId])

  useEffect(() => {
    // Reset reason when switching status/order to avoid carrying text across updates
    setStatusReason('')
  }, [selectedStatus, orderId])

  const loadOrder = async () => {
    if (!orderId) return
    try {
      setLoading(true)
      const response = await adminAPI.orders.getById(orderId)
      if (response.data.success && response.data.order) {
        const orderData = response.data.order
        setOrder(orderData)
        setSelectedStatus(orderData.status)
        
        // Collect attachments
        const collectedAttachments = collectOrderAttachments(orderData)
        setAttachments(collectedAttachments)
      }
    } catch (error) {
      console.error('Error loading order:', error)
      showError('حدث خطأ في جلب بيانات الطلب')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!orderId || !selectedStatus || !order) return
    
    // التحقق من أن الانتقال مسموح
    const allowedStatuses = getAllowedNextStatuses(order.status as any, order.delivery_type || '')
    const isCurrentStatus = selectedStatus === order.status
    const isAllowed = isCurrentStatus || allowedStatuses.includes(selectedStatus as any)
    
    if (!isAllowed) {
      showError(`لا يمكن الانتقال من "${STATUS_LABELS[order.status] || order.status}" إلى "${STATUS_LABELS[selectedStatus] || selectedStatus}". الحالات المسموحة: ${allowedStatuses.map(s => STATUS_LABELS[s] || s).join(', ')}`)
      return
    }
    
    // For cancelled/rejected, require reason
    if ((selectedStatus === 'cancelled' || selectedStatus === 'rejected') && !statusReason.trim()) {
      showError('يرجى إدخال السبب')
      return
    }

    try {
      setIsUpdating(true)
      await adminAPI.orders.updateStatus(
        orderId,
        selectedStatus,
        selectedStatus === 'cancelled' ? statusReason : undefined,
        selectedStatus === 'rejected' ? statusReason : undefined
      )
      
      showSuccess('تم تحديث حالة الطلب بنجاح')
      if (onStatusUpdate) onStatusUpdate()
      loadOrder() // Reload to get updated order
    } catch (error: any) {
      console.error('Error updating status:', error)
      showError(error.response?.data?.detail || 'حدث خطأ في تحديث حالة الطلب')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDownloadAttachment = async (attachment: NormalizedAttachment) => {
    try {
      const token = localStorage.getItem('auth_token')
      const url = attachment.url
      
      // If it's a data URL, create a blob download
      if (url.startsWith('data:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = attachment.filename || 'ملف'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
        showSuccess('تم التحميل بنجاح')
        return
      }

      // For regular URLs, try to download with token
      const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || '')}`
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Error downloading attachment:', error)
      showError('حدث خطأ في تحميل الملف')
    }
  }

  const handleCopyCoordinates = () => {
    if (order?.delivery_latitude && order?.delivery_longitude) {
      const coords = `${order.delivery_latitude},${order.delivery_longitude}`
      navigator.clipboard.writeText(coords)
      showSuccess('تم نسخ الإحداثيات')
    }
  }

  const handleCopyLocationLink = () => {
    if (order?.delivery_latitude && order?.delivery_longitude) {
      const link = `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`
      navigator.clipboard.writeText(link)
      showSuccess('تم نسخ رابط الموقع')
    }
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!orderId) return null

  return (
    <div className={`order-quick-view-drawer ${orderId ? 'open' : ''}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-content">
        <div className="drawer-header">
          <h2>تفاصيل الطلب #{order?.order_number || orderId}</h2>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div className="drawer-loading">جاري التحميل...</div>
          ) : order ? (
            <>
              {/* Order Info */}
              <div className="drawer-section">
                <h3>معلومات الطلب</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">العميل:</span>
                    <span className="value">{order.customer_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">الهاتف:</span>
                    <span className="value">
                      {order.customer_phone}
                      {(order.customer_whatsapp || order.customer_phone) && (
                        <button
                          className="whatsapp-btn"
                          onClick={() => openWhatsApp(order.customer_whatsapp || order.customer_phone)}
                          title="واتساب"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                    </span>
                  </div>
                  {order.shop_name && (
                    <div className="info-item">
                      <span className="label">المتجر:</span>
                      <span className="value">{order.shop_name}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="label">المبلغ:</span>
                    <span className="value">{order.final_amount.toLocaleString()} ل.س</span>
                  </div>
                  <div className="info-item">
                    <span className="label">التاريخ:</span>
                    <span className="value">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Status Change */}
              <div className="drawer-section">
                <h3>تغيير الحالة</h3>
                <div className="status-change-controls">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="status-select"
                  >
                    {(order ? getStatusOptionsForOrder(order) : (Object.keys(STATUS_LABELS) as string[])).map((key) => (
                      <option key={key} value={key}>
                        {STATUS_LABELS[key] || key}
                      </option>
                    ))}
                  </select>
                  {(selectedStatus === 'cancelled' || selectedStatus === 'rejected') && (
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder={selectedStatus === 'cancelled' ? 'سبب الإلغاء...' : 'سبب الرفض...'}
                      className="status-reason-input"
                      rows={3}
                    />
                  )}
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating || selectedStatus === order.status}
                    className="status-update-btn"
                  >
                    {isUpdating ? 'جاري التحديث...' : 'حفظ التغيير'}
                  </button>
                </div>
              </div>

              {/* Status Timeline */}
              {order.status_history && order.status_history.length > 0 && (
                <div className="drawer-section">
                  <h3>سجل الحالات</h3>
                  <div className="status-timeline">
                    {order.status_history.map((entry, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-marker" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#6B7280' }} />
                        <div className="timeline-content">
                          <div className="timeline-status">{STATUS_LABELS[entry.status] || entry.status}</div>
                          <div className="timeline-date">{formatDate(entry.created_at)}</div>
                          {entry.reason && <div className="timeline-reason">{entry.reason}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="drawer-section">
                  <h3>المرفقات ({attachments.length})</h3>
                  <div className="attachments-grid">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="attachment-card">
                        {attachment.isImage ? (
                          <div className="attachment-image">
                            <img src={attachment.url} alt={attachment.filename} />
                          </div>
                        ) : (
                          <div className="attachment-file-icon">
                            <FileText size={32} />
                          </div>
                        )}
                        <div className="attachment-info">
                          <div className="attachment-filename">{attachment.filename}</div>
                          {attachment.sizeLabel && (
                            <div className="attachment-size">{attachment.sizeLabel}</div>
                          )}
                        </div>
                        <div className="attachment-actions">
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="attachment-btn"
                            title="تحميل"
                          >
                            <Download size={16} />
                          </button>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attachment-btn"
                            title="فتح"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Location */}
              {order.delivery_type === 'delivery' && (order.delivery_address || (order.delivery_latitude && order.delivery_longitude)) && (
                <div className="drawer-section">
                  <h3>موقع التوصيل</h3>
                  {order.delivery_address && (
                    <div className="delivery-address">
                      <MapPin size={16} />
                      <span>{order.delivery_address}</span>
                    </div>
                  )}
                  {order.delivery_latitude && order.delivery_longitude && (
                    <>
                      <div className="delivery-map">
                        <SimpleMap
                          latitude={order.delivery_latitude}
                          longitude={order.delivery_longitude}
                          address={order.delivery_address}
                          height={300}
                        />
                      </div>
                      <div className="delivery-actions">
                        <a
                          href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="location-btn"
                        >
                          <MapPin size={16} />
                          Google Maps
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="location-btn"
                        >
                          <Navigation size={16} />
                          GPS Directions
                        </a>
                        <button
                          onClick={handleCopyCoordinates}
                          className="location-btn"
                          title="نسخ الإحداثيات"
                        >
                          <Copy size={16} />
                          نسخ الإحداثيات
                        </button>
                        <button
                          onClick={handleCopyLocationLink}
                          className="location-btn"
                          title="نسخ الرابط"
                        >
                          <Copy size={16} />
                          نسخ الرابط
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="drawer-error">حدث خطأ في تحميل الطلب</div>
          )}
        </div>
      </div>
    </div>
  )
}

