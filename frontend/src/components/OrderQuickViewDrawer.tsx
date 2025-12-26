import { useEffect, useMemo, useState } from 'react'
import { X, ExternalLink, Navigation, Download, Copy, Paperclip, Eye } from 'lucide-react'
import { adminAPI } from '../lib/api'
import { showError, showSuccess } from '../utils/toast'
import SimpleMap from './SimpleMap'
import OrderStatusTimeline from './OrderStatusTimeline'
import { collectAttachmentsFromOrder, resolveToAbsoluteUrl } from '../utils/orderAttachments'
import './OrderQuickViewDrawer.css'

type DeliveryType = 'delivery' | 'self' | string

type OrderDetailLike = {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp?: string
  shop_name?: string
  status: string
  delivery_type: DeliveryType
  final_amount?: number
  total_amount?: number
  created_at?: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  cancellation_reason?: string
  rejection_reason?: string
  items?: any[]
  attachments?: any[]
}

type StatusValue =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'awaiting_pickup'
  | 'shipping'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | string

const STATUS_OPTIONS: Array<{ value: StatusValue; label: string }> = [
  { value: 'pending', label: 'في الانتظار' },
  { value: 'preparing', label: 'قيد التحضير' },
  { value: 'awaiting_pickup', label: 'في انتظار الاستلام' },
  { value: 'shipping', label: 'قيد التوصيل' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغى' },
  { value: 'rejected', label: 'مرفوض' },
]

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'في الانتظار',
    accepted: 'تم القبول',
    preparing: 'قيد التحضير',
    shipping: 'قيد التوصيل',
    awaiting_pickup: 'في انتظار الاستلام',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    rejected: 'مرفوض',
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#F59E0B',
    accepted: '#3B82F6',
    preparing: '#8B5CF6',
    shipping: '#10B981',
    awaiting_pickup: '#06B6D4',
    completed: '#10B981',
    cancelled: '#EF4444',
    rejected: '#EF4444',
  }
  return colors[status] || '#6B7280'
}

const openInNewTab = (url?: string) => {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

const buildGoogleMapsLink = (order: OrderDetailLike) => {
  if (order.delivery_latitude && order.delivery_longitude) {
    return `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`
  }
  const query = encodeURIComponent(order.delivery_address || '')
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

const buildGoogleMapsDirectionsLink = (order: OrderDetailLike) => {
  if (order.delivery_latitude && order.delivery_longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}&travelmode=driving`
  }
  const query = encodeURIComponent(order.delivery_address || '')
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('تم النسخ')
  } catch {
    showError('فشل النسخ')
  }
}

async function downloadWithAuth(url: string, filename: string) {
  try {
    const resolved = resolveToAbsoluteUrl(url)
    // Data URLs: open directly
    if (/^data:/i.test(resolved)) {
      openInNewTab(resolved)
      return
    }

    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(resolved, { headers })
    if (!res.ok) {
      // fallback: open
      openInNewTab(resolved)
      return
    }
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename || 'file'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    openInNewTab(url)
  }
}

export default function OrderQuickViewDrawer(props: {
  open: boolean
  orderId: number | null
  onClose: () => void
  onNavigateToFull: (orderId: number) => void
  onOrderPatched: (orderId: number, patch: Partial<OrderDetailLike>) => void
}) {
  const { open, orderId, onClose, onNavigateToFull, onOrderPatched } = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderDetailLike | null>(null)
  const [statusDraft, setStatusDraft] = useState<StatusValue>('pending')
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    if (!open || !orderId) return
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await adminAPI.orders.getById(orderId)
        const payload = (res as any)?.data?.order || (res as any)?.data || null
        if (!payload) throw new Error('Missing order payload')
        if (cancelled) return
        setOrder(payload)
        setStatusDraft(payload.status || 'pending')
        setCancelReason(payload.cancellation_reason || '')
        setRejectReason(payload.rejection_reason || '')
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || 'فشل تحميل تفاصيل الطلب')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, orderId])

  const attachments = useMemo(() => {
    if (!order) return []
    return collectAttachmentsFromOrder(order)
  }, [order])

  const canShowDelivery = Boolean(
    order?.delivery_type === 'delivery' &&
      (order?.delivery_address || (order?.delivery_latitude && order?.delivery_longitude))
  )

  const applyStatus = async () => {
    if (!order) return
    const next = String(statusDraft)

    if (next === order.status) return
    if (next === 'cancelled' && !cancelReason.trim()) {
      showError('يرجى إدخال سبب الإلغاء')
      return
    }
    if (next === 'rejected' && !rejectReason.trim()) {
      showError('يرجى إدخال سبب الرفض')
      return
    }

    // guard: shipping needs delivery details
    if (next === 'shipping' && order.delivery_type === 'delivery') {
      const hasAddressOrCoords = Boolean(order.delivery_address || (order.delivery_latitude && order.delivery_longitude))
      if (!hasAddressOrCoords) {
        showError('طلبات التوصيل تحتاج عنوانًا أو إحداثيات قبل نقلها إلى قيد التوصيل')
        return
      }
    }

    try {
      setSavingStatus(true)
      await adminAPI.orders.updateStatus(
        order.id,
        next,
        next === 'cancelled' ? cancelReason.trim() : undefined,
        next === 'rejected' ? rejectReason.trim() : undefined
      )

      const patch: Partial<OrderDetailLike> = {
        status: next,
        cancellation_reason: next === 'cancelled' ? cancelReason.trim() : order.cancellation_reason,
        rejection_reason: next === 'rejected' ? rejectReason.trim() : order.rejection_reason,
      }
      setOrder({ ...order, ...patch })
      onOrderPatched(order.id, patch)
      showSuccess('تم تحديث الحالة')
    } catch {
      showError('فشل تحديث حالة الطلب')
    } finally {
      setSavingStatus(false)
    }
  }

  if (!open) return null

  return (
    <div className="oqv-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="oqv-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="oqv-header">
          <div className="oqv-title">
            <div className="oqv-order-number">طلب #{order?.order_number || orderId}</div>
            {order && (
              <div className="oqv-status-chip" style={{ backgroundColor: getStatusColor(order.status) }}>
                {getStatusLabel(order.status)}
              </div>
            )}
          </div>

          <div className="oqv-header-actions">
            {orderId && (
              <button className="oqv-header-btn" onClick={() => onNavigateToFull(orderId)} title="فتح التفاصيل الكاملة">
                <Eye size={16} />
                التفاصيل
              </button>
            )}
            <button className="oqv-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="oqv-loading">جاري تحميل التفاصيل...</div>
        ) : error ? (
          <div className="oqv-error">{error}</div>
        ) : !order ? (
          <div className="oqv-empty">لم يتم العثور على الطلب</div>
        ) : (
          <div className="oqv-content">
            <div className="oqv-card">
              <div className="oqv-card-title">ملخص</div>
              <div className="oqv-kv">
                <div>
                  <div className="oqv-k">العميل</div>
                  <div className="oqv-v">{order.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="oqv-k">الهاتف</div>
                  <div className="oqv-v">{order.customer_phone || '-'}</div>
                </div>
                <div>
                  <div className="oqv-k">نوع التوصيل</div>
                  <div className="oqv-v">{order.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</div>
                </div>
                <div>
                  <div className="oqv-k">الإجمالي</div>
                  <div className="oqv-v">{typeof order.final_amount === 'number' ? `${order.final_amount.toLocaleString()} ل.س` : '-'}</div>
                </div>
              </div>
            </div>

            <div className="oqv-card">
              <div className="oqv-card-title">تغيير الحالة</div>
              <div className="oqv-status-row">
                <select
                  className="oqv-select"
                  value={String(statusDraft)}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  disabled={savingStatus}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button className="oqv-primary" onClick={applyStatus} disabled={savingStatus}>
                  {savingStatus ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>

              {String(statusDraft) === 'cancelled' && (
                <textarea
                  className="oqv-textarea"
                  placeholder="سبب الإلغاء"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
              )}
              {String(statusDraft) === 'rejected' && (
                <textarea
                  className="oqv-textarea"
                  placeholder="سبب الرفض"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            {canShowDelivery && (
              <div className="oqv-card">
                <div className="oqv-card-title">التوصيل والموقع</div>
                <div className="oqv-delivery-meta">
                  {order.delivery_address && (
                    <div className="oqv-delivery-line">
                      <span className="oqv-k">العنوان:</span> <span className="oqv-v">{order.delivery_address}</span>
                    </div>
                  )}
                  {order.delivery_latitude && order.delivery_longitude && (
                    <div className="oqv-delivery-line">
                      <span className="oqv-k">الإحداثيات:</span>{' '}
                      <span className="oqv-v">
                        {order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="oqv-actions">
                  <button className="oqv-action" onClick={() => openInNewTab(buildGoogleMapsDirectionsLink(order))} title="اتجاهات GPS">
                    <Navigation size={16} />
                    GPS
                  </button>
                  <button className="oqv-action" onClick={() => openInNewTab(buildGoogleMapsLink(order))} title="فتح Google Maps">
                    <ExternalLink size={16} />
                    Google Maps
                  </button>
                  {order.delivery_latitude && order.delivery_longitude && (
                    <>
                      <button
                        className="oqv-action"
                        onClick={() => copyText(`${order.delivery_latitude},${order.delivery_longitude}`)}
                        title="نسخ الإحداثيات"
                      >
                        <Copy size={16} />
                        نسخ
                      </button>
                      <button
                        className="oqv-action"
                        onClick={() => copyText(buildGoogleMapsLink(order))}
                        title="نسخ رابط Google Maps"
                      >
                        <Copy size={16} />
                        رابط
                      </button>
                    </>
                  )}
                </div>

                <div className="oqv-map">
                  <SimpleMap
                    address={order.delivery_address}
                    latitude={order.delivery_latitude}
                    longitude={order.delivery_longitude}
                    height={280}
                  />
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="oqv-card">
                <div className="oqv-card-title">
                  <span>المرفقات</span>
                  <span className="oqv-muted">({attachments.length})</span>
                </div>
                <div className="oqv-attachments">
                  {attachments.map((file, idx) => (
                    <div className="oqv-attachment" key={`${file.url}-${file.filename}-${idx}`}>
                      <div className="oqv-attachment-icon">
                        {file.isImage ? (
                          <img
                            className="oqv-attachment-thumb"
                            src={file.url}
                            alt={file.filename}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <Paperclip size={16} />
                        )}
                      </div>
                      <div className="oqv-attachment-body">
                        <div className="oqv-attachment-name" title={file.filename}>{file.filename}</div>
                        <div className="oqv-attachment-sub">
                          {file.originLabel ? <span>{file.originLabel}</span> : null}
                          {file.sizeLabel ? <span>{file.sizeLabel}</span> : null}
                        </div>
                      </div>
                      <div className="oqv-attachment-actions">
                        <button className="oqv-icon-btn" onClick={() => openInNewTab(file.url)} title="فتح/معاينة">
                          <ExternalLink size={16} />
                        </button>
                        <button
                          className="oqv-icon-btn"
                          onClick={() => downloadWithAuth(file.url, file.filename)}
                          title="تنزيل"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="oqv-card">
              <div className="oqv-card-title">الخط الزمني</div>
              <OrderStatusTimeline orderId={order.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


