import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import type { AxiosError } from 'axios'
import { Download, ExternalLink, FileText, RotateCcw } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import { isAuthenticated } from '../lib/auth'
import { Link } from 'react-router-dom'
import OrderStatusTimeline from '../components/OrderStatusTimeline'
import ReorderModal from '../components/ReorderModal'
import { getServiceKind } from '../utils/serviceClassifier'
import { buildWhatsAppWebUrl } from '../utils/whatsapp'
import './Orders.css'

type OrderItem = {
  service_name?: string
  quantity?: number
  unit_price?: number
  specifications?: Record<string, any>
  design_files?: Array<{ location?: string; filename?: string }>
}

type Order = {
  id: number
  order_number?: string
  status?: string
  created_at?: string
  service_name?: string
  total_price?: number
  updated_at?: string
  customer_name?: string
  customer_phone?: string
  customer_whatsapp?: string
  shop_name?: string
  delivery_type?: string
  delivery_address?: string | null
  notes?: string | null
  items?: OrderItem[]
}

const WHATSAPP_NUMBER = '+963112134640'
const WHATSAPP_TARGET = 'whatsapp_web'
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api').replace(/\/$/, '')
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

type NormalizedFile = {
  url: string
  filename: string
  isImage: boolean
  location?: string
  sizeLabel?: string
}

type OrderAttachment = {
  id?: string
  order_item_id?: number
  order_item_service_name?: string
  filename?: string
  url?: string
  download_url?: string
  raw_path?: string
  location?: string
  mime_type?: string
  size_label?: string
  size_in_bytes?: number
}

const isDataUrl = (value: string) => /^data:/i.test(value)
const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith('blob:')
const looksLikeImage = (value: string) => /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(value)

const normalizeOrdersResponse = (payload: any): Order[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.orders)) return payload.orders as Order[]
  if (Array.isArray(payload?.results)) return payload.results as Order[]
  if (Array.isArray(payload?.data)) return payload.data as Order[]
  if (Array.isArray(payload?.orders?.data)) return payload.orders.data as Order[]
  if (Array.isArray(payload?.orders?.results)) return payload.orders.results as Order[]
  return []
}

const resolveToAbsoluteUrl = (value: string) => {
  if (!value) return ''
  if (isDataUrl(value) || isAbsoluteUrl(value)) return value

  let normalized = value
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }

  if (normalized.startsWith('/api/')) {
    return `${PUBLIC_BASE_URL}${normalized.replace(/^\/api/, '')}`
  }

  return `${PUBLIC_BASE_URL}${normalized}`
}

const extractFileName = (value?: string) => {
  if (!value) return ''
  const withoutQuery = value.split('?')[0]
  const segments = withoutQuery.split('/')
  return segments[segments.length - 1] || ''
}

const prettyFileSize = (size?: number | string) => {
  if (size === undefined || size === null) return undefined
  const numericSize = typeof size === 'string' ? Number(size) : size
  if (Number.isNaN(numericSize) || numericSize <= 0) return undefined
  if (numericSize < 1024) return `${numericSize} B`
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`
  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`
}

const normalizeAttachment = (entry: any): NormalizedFile | null => {
  if (!entry) return null

  if (typeof entry === 'string') {
    const trimmed = entry.trim()
    if (!trimmed || trimmed.startsWith(':')) return null
    const url = resolveToAbsoluteUrl(trimmed)
    if (!url) return null
    return {
      url,
      filename: extractFileName(trimmed) || 'ملف',
      isImage: looksLikeImage(trimmed),
    }
  }

  if (typeof entry === 'object') {
    const rawUrl =
      entry.url ||
      entry.file_url ||
      entry.file ||
      entry.path ||
      entry.href ||
      entry.location_url ||
      ''

    const rawUrlString = String(rawUrl).trim()
    if (!rawUrlString || rawUrlString.startsWith(':')) return null

    const url = resolveToAbsoluteUrl(rawUrlString)
    if (!url) return null

    const filename =
      entry.filename ||
      entry.original_name ||
      entry.name ||
      extractFileName(rawUrl) ||
      extractFileName(rawUrlString) ||
      'ملف'

    const mimeType = entry.mime_type || entry.mimetype || entry.content_type || ''
    const isImage = mimeType.includes('image') || looksLikeImage(url) || looksLikeImage(filename)

    return {
      url,
      filename,
      isImage,
      location: entry.location || entry.position || entry.side || undefined,
      sizeLabel: prettyFileSize(entry.size || entry.file_size),
    }
  }

  return null
}

const collectDesignFiles = (item: OrderItem): NormalizedFile[] => {
  const candidates: any[] = []

  if (Array.isArray(item.design_files) && item.design_files.length > 0) {
    candidates.push(...item.design_files)
  }

  const specFiles = (item.specifications as any)?.design_files
  if (Array.isArray(specFiles) && specFiles.length > 0) {
    candidates.push(...specFiles)
  }

  const unique: NormalizedFile[] = []
  const seen = new Set<string>()

  candidates.forEach((entry) => {
    const normalized = normalizeAttachment(entry)
    if (normalized && normalized.url && !seen.has(normalized.url)) {
      seen.add(normalized.url)
      unique.push(normalized)
    } else if (!normalized) {
      console.warn('Skipping unsupported attachment from order item:', entry)
    }
  })

  return unique
}

const mapAttachmentToNormalized = (attachment: OrderAttachment): NormalizedFile | null => {
  if (!attachment) return null
  const raw = attachment.url || attachment.download_url || attachment.raw_path
  if (!raw) return null
  const absoluteUrl = resolveToAbsoluteUrl(raw)
  if (!absoluteUrl) return null
  const filename = attachment.filename || extractFileName(raw) || 'ملف'
  const isImage = looksLikeImage(absoluteUrl) || looksLikeImage(filename)
  const sizeLabel =
    attachment.size_label ||
    (attachment.size_in_bytes !== undefined ? prettyFileSize(attachment.size_in_bytes) : undefined)

  return {
    url: absoluteUrl,
    filename,
    isImage,
    location: attachment.location,
    sizeLabel,
  }
}
const SPEC_LABELS: Record<string, string> = {
  clothing_source: 'مصدر الملابس',
  clothing_product: 'نوع المنتج',
  clothing_color: 'لون المنتج',
  quantity: 'الكمية',
  design_positions: 'مواقع الطباعة',
  notes: 'ملاحظات إضافية',
  work_type: 'نوع العمل',
  paper_size: 'قياس الورق',
  total_pages: 'عدد الصفحات',
  print_color: 'نوع الطباعة',
  print_quality: 'جودة الطباعة',
  print_sides: 'عدد الأوجه',
  selected_colors: 'الألوان المختارة',
  auto_colors: 'ألوان مقترحة',
  colors: 'الألوان',
  dimensions: 'الأبعاد',
  width: 'العرض',
  height: 'الارتفاع',
  length: 'الطول',
  unit: 'الوحدة',
  location: 'الموضع',
  filename: 'اسم الملف',
}

const isCompletedStatus = (status: string) => {
  const normalized = status.toLowerCase()
  return ['completed', 'done', 'finished', 'مكتمل', 'منتهي'].some((key) => normalized.includes(key))
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attachmentsMap, setAttachmentsMap] = useState<Record<number, OrderAttachment[]>>({})
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [reorderModalOpen, setReorderModalOpen] = useState<number | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated()) {
        setError('يجب تسجيل الدخول للاطلاع على طلباتك.')
        setLoading(false)
        return
      }
      try {
        // التأكد من تمرير my_orders=true بشكل صريح لعرض طلبات العميل فقط
        const response = await ordersAPI.getAll(true)
        console.log('📦 Orders API Response:', response)
        const normalized = normalizeOrdersResponse(response.data)
        console.log('✅ Normalized orders:', normalized.length, 'orders')
        setOrders(normalized)
        if (!normalized.length) {
          console.warn('Orders API returned no data. Raw payload:', response.data)
        }
      } catch (err) {
        let message = 'تعذر تحميل الطلبات. الرجاء المحاولة لاحقاً.'
        if ((err as AxiosError)?.response) {
          const axiosErr = err as AxiosError<any>
          const status = axiosErr.response?.status
          const detail =
            (axiosErr.response?.data && (axiosErr.response.data.detail || axiosErr.response.data.message)) ||
            axiosErr.message
          console.error('Error loading orders:', {
            status,
            detail,
            data: axiosErr.response?.data,
            url: axiosErr.config?.url,
          })
          if (status === 401) {
            message = 'يجب تسجيل الدخول للاطلاع على طلباتك.'
          } else if (status === 500) {
            message = 'حدث خطأ داخلي في الخادم أثناء تحميل الطلبات. نحاول إصلاحه، الرجاء المحاولة لاحقاً.'
          } else if (detail) {
            message = `تعذر تحميل الطلبات: ${detail}`
          }
        } else {
          console.error('Error loading orders:', err)
        }
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  useEffect(() => {
    if (!orders.length) {
      setAttachmentsMap({})
      return
    }

    let cancelled = false
    const loadAttachments = async () => {
      setAttachmentsLoading(true)
      try {
        const results = await Promise.all(
          orders.map(async (order) => {
            try {
              const response = await ordersAPI.getAttachments(order.id)
              const attachments = Array.isArray(response.data?.attachments) ? response.data.attachments : []
              return [order.id, attachments as OrderAttachment[]] as const
            } catch (err) {
              console.error(`Error loading attachments for order ${order.id}:`, err)
              return [order.id, [] as OrderAttachment[]] as const
            }
          })
        )

        if (!cancelled) {
          const nextMap: Record<number, OrderAttachment[]> = {}
          results.forEach(([orderId, attachments]) => {
            nextMap[orderId] = attachments
          })
          setAttachmentsMap(nextMap)
        }
      } finally {
        if (!cancelled) {
          setAttachmentsLoading(false)
        }
      }
    }

    loadAttachments()

    return () => {
      cancelled = true
    }
  }, [orders])

  const groupedOrders = useMemo(() => {
    const active = orders.filter((order) => !order.status || !isCompletedStatus(order.status))
    const finished = orders.filter((order) => order.status && isCompletedStatus(order.status))
    return { active, finished }
  }, [orders])

  const buildWhatsAppLink = (order: Order) => {
    const orderId = order.order_number || order.id
    const phone = order.customer_whatsapp || order.customer_phone || WHATSAPP_NUMBER
    const message = `مرحباً، أود متابعة حالة طلبي رقم ${orderId}.`
    return buildWhatsAppWebUrl(phone, message)
  }

  const formatStatus = (status?: string) => {
    if (!status) return 'قيد المراجعة'
    switch (status.toLowerCase()) {
      case 'pending':
        return 'قيد المراجعة'
      case 'processing':
        return 'جار التنفيذ'
      case 'completed':
      case 'done':
        return 'منجز'
      default:
        return status
    }
  }

  const translateSpecKey = (key: string) => {
    if (SPEC_LABELS[key]) return SPEC_LABELS[key]
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const renderSpecValue = (value: any): ReactNode => {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) {
      if (value.length === 0) return '—'
      if (typeof value[0] === 'object' && value[0] !== null) {
        return (
          <ul className="order-item-nested">
            {value.map((entry, index) => (
              <li key={index}>
                {Object.entries(entry).map(([subKey, subValue]) => (
                  <div key={subKey}>
                    <strong>{translateSpecKey(subKey)}:</strong>{' '}
                    <span>{renderSpecValue(subValue)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )
      }
      return value.join(', ')
    }
    if (typeof value === 'object') {
      return (
        <ul className="order-item-nested">
          {Object.entries(value).map(([subKey, subValue]) => (
            <li key={subKey}>
              <strong>{translateSpecKey(subKey)}:</strong>{' '}
              <span>{renderSpecValue(subValue)}</span>
            </li>
          ))}
        </ul>
      )
    }
    if (typeof value === 'boolean') {
      return value ? 'نعم' : 'لا'
    }
    return String(value)
  }

  // Helper to filter specifications based on service workflow
  const getFilteredSpecs = (specs?: Record<string, any>, serviceName?: string) => {
    if (!specs || Object.keys(specs).length === 0) return {}
    
    const excludedKeys = new Set([
      'design_files',
      'files',
      'attachments',
      'uploaded_files',
      'clothing_source_value',
      'clothing_product_code',
      'clothing_color_code',
    ])
    
    // Always allow these core fields
    const alwaysAllowed = new Set(['dimensions', 'notes', 'quantity'])
    
    const kind = getServiceKind(serviceName)
    const filtered: Record<string, any> = {}
    
    Object.entries(specs).forEach(([key, value]) => {
      // Skip excluded keys
      if (excludedKeys.has(key)) return
      
      // Always allow core fields
      if (alwaysAllowed.has(key)) {
        filtered[key] = value
        return
      }
      
      // Service-specific filtering
      if (kind === 'vinyl') {
        // Vinyl: only show vinyl-specific fields
        if (['vinyl_type', 'vinyl_color', 'print_type_choice', 'dimensions'].includes(key)) {
          filtered[key] = value
        }
      } else if (kind === 'flex_printing') {
        // Flex: only show flex-specific fields
        if (['flex_type', 'print_type_choice', 'dimensions'].includes(key)) {
          filtered[key] = value
        }
      } else if (kind === 'banner_rollup') {
        // Banners: only show banner-specific fields
        if (['rollup_source', 'print_type_choice', 'dimensions'].includes(key)) {
          filtered[key] = value
        }
      } else if (kind === 'clothing') {
        // Clothing: only show clothing-specific fields
        if (['clothing_source', 'clothing_product', 'clothing_color', 'clothing_size', 'work_type'].includes(key)) {
          filtered[key] = value
        }
      } else {
        // For other services, allow common fields
        if (!['flex_type', 'vinyl_type', 'vinyl_color', 'rollup_source'].includes(key)) {
          filtered[key] = value
        }
      }
    })
    
    return filtered
  }

  const renderSpecifications = (specs?: Record<string, any>, serviceName?: string) => {
    const filteredSpecs = getFilteredSpecs(specs, serviceName)
    if (!filteredSpecs || Object.keys(filteredSpecs).length === 0) return null
    
    return (
      <div className="order-item-specs">
        <h4>التفاصيل:</h4>
        <ul>
          {Object.entries(filteredSpecs)
            .map(([key, value]) => (
              <li key={key}>
                <div className="spec-label">{translateSpecKey(key)}:</div>
                <div className="spec-value">{renderSpecValue(value)}</div>
              </li>
            ))}
        </ul>
      </div>
    )
  }

  const getOrderAttachments = useCallback(
    (order: Order): NormalizedFile[] => {
      const fromEndpoint = attachmentsMap[order.id] || []
      const normalizedFromEndpoint = fromEndpoint
        .map(mapAttachmentToNormalized)
        .filter((file): file is NormalizedFile => Boolean(file))

      if (normalizedFromEndpoint.length > 0) {
        return normalizedFromEndpoint
      }

      const fallback: NormalizedFile[] = []
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          fallback.push(...collectDesignFiles(item))
        })
      }
      return fallback
    },
    [attachmentsMap]
  )

  const formatDate = (date?: string) => {
    if (!date) return 'غير متوفر'
    return new Date(date).toLocaleDateString('ar-SY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const renderFilesSection = useCallback((files: NormalizedFile[], options?: { hideTitle?: boolean; title?: string }) => {
    if (!files || files.length === 0) return null
    const title = options?.title ?? 'الملفات والمرفقات:'
    return (
      <div className="order-item-files">
        {!options?.hideTitle && <h4>{title}</h4>}
        <div className="order-files-grid">
          {files.map((file, index) => (
            <div key={`${file.url}-${index}`} className="order-file-card">
              <div className={`order-file-preview ${file.isImage ? 'image' : 'document'}`}>
                {file.isImage ? (
                  <img src={file.url} alt={file.filename} loading="lazy" />
                ) : (
                  <FileText size={26} />
                )}
              </div>
              <div className="order-file-meta">
                {file.location && <span className="order-file-location">{file.location}</span>}
                <span className="order-file-name">{file.filename}</span>
                {file.sizeLabel && <span className="order-file-size">{file.sizeLabel}</span>}
                <div className="order-file-actions">
                  <button
                    className="order-file-action"
                    type="button"
                    onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink size={16} />
                    عرض
                  </button>
                  <button
                    className="order-file-action"
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = file.url
                      link.download = file.filename || 'attachment'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                  >
                    <Download size={16} />
                    تحميل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }, [])

  const renderOrderCard = (order: Order, variant: 'active' | 'done' = 'active') => {
    const attachments = getOrderAttachments(order)
    const hasAttachments = attachments.length > 0
    const serviceDisplayName =
      order.service_name ||
      order.items?.[0]?.service_name ||
      order.items?.[0]?.product_name ||
      'غير محدد'
    const statusClass = variant === 'done' ? 'completed' : 'in-progress'
    const dateLabel = variant === 'done' ? 'تاريخ الإنجاز:' : 'تاريخ الطلب:'
    const dateValue = variant === 'done' ? formatDate(order.updated_at || order.created_at) : formatDate(order.created_at)

    return (
      <article key={order.id} className={`order-card ${variant === 'done' ? 'done' : ''}`}>
        <div className="order-card__content">
          <div className="order-card__main">
            <div className="order-card__header">
              <span className="order-card__id">طلب #{order.order_number || order.id}</span>
              <span className={`order-card__status ${statusClass}`}>{formatStatus(order.status)}</span>
            </div>

            <div className="order-card__details">
              <div>
                <strong>الخدمة:</strong>
                <span>{serviceDisplayName}</span>
              </div>
              <div>
                <strong>{dateLabel}</strong>
                <span>{dateValue}</span>
              </div>
              <div>
                <strong>اسم العميل:</strong>
                <span>{order.customer_name || 'غير متوفر'}</span>
              </div>
              {order.shop_name && (
                <div>
                  <strong>اسم المتجر:</strong>
                  <span>{order.shop_name}</span>
                </div>
              )}
              <div>
                <strong>واتساب:</strong>
                <span>{order.customer_whatsapp || order.customer_phone || 'غير متوفر'}</span>
              </div>
              {order.delivery_type && (
                <div>
                  <strong>طريقة التسليم:</strong>
                  <span>{order.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                </div>
              )}
              {order.delivery_type === 'delivery' && (
                <div>
                  <strong>عنوان التسليم:</strong>
                  <span>{order.delivery_address || 'غير محدد'}</span>
                </div>
              )}
              {order.notes && (
                <div className="order-card__notes">
                  <strong>ملاحظات العميل:</strong>
                  <span>{order.notes}</span>
                </div>
              )}
              {variant === 'done' && order.total_price && (
                <div>
                  <strong>قيمة الفاتورة:</strong>
                  <span>{order.total_price} ل.س</span>
                </div>
              )}
            </div>

            {order.items && order.items.length > 0 && (
              <div className="order-card__items">
                <h4>تفاصيل العناصر</h4>
                {order.items.map((item, index) => (
                  <div key={index} className="order-card__item">
                    <div className="order-card__item-header">
                      <strong>{item.service_name || item.product_name || `عنصر ${index + 1}`}</strong>
                      <span>الكمية: {item.quantity || 1}</span>
                    </div>
                    {renderSpecifications(item.specifications, item.service_name)}
                  </div>
                ))}
              </div>
            )}

            <div className="order-card__footer">
              <a
                className={`order-card__action ${variant === 'done' ? 'secondary' : ''}`}
                href={buildWhatsAppLink(order)}
                target={WHATSAPP_TARGET}
                rel="noreferrer"
              >
                {variant === 'done' ? 'اطلب نسخة عن الفاتورة' : 'متابعة عبر واتساب'}
              </a>
              {variant === 'done' && (
                <button
                  className="order-card__action reorder-btn"
                  onClick={() => setReorderModalOpen(order.id)}
                >
                  <RotateCcw size={16} />
                  إعادة الطلب
                </button>
              )}
            </div>
            
            {variant === 'active' && (
              <div className="order-card__timeline">
                <OrderStatusTimeline orderId={order.id} />
              </div>
            )}
          </div>

          <div className="order-card__attachments-panel">
            <div className="attachments-panel-header">
              <h4>مرفقات العميل</h4>
              {attachmentsLoading && <span className="attachments-loading">جاري التحميل...</span>}
            </div>

            {hasAttachments ? (
              <div className="attachments-panel-content">{renderFilesSection(attachments, { hideTitle: true })}</div>
            ) : (
              <p className="attachments-empty">
                {attachmentsLoading ? 'جاري تحميل المرفقات...' : 'لا توجد ملفات مرفوعة لهذا الطلب.'}
              </p>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="orders-page">
      <div className="container">
        <header className="orders-header">
          <div>
            <h1>طلباتي</h1>
            <p>تابع حالة طلباتك الحالية والسابقة بسهولة، وتواصل معنا مباشرة على واتساب لأي استفسار.</p>
          </div>
          <a
            className="whatsapp-cta"
            href={buildWhatsAppWebUrl(WHATSAPP_NUMBER, 'مرحباً، لدي استفسار حول طلباتي.')}
            target={WHATSAPP_TARGET}
            rel="noreferrer"
          >
            تواصل معنا عبر واتساب
            <span>{WHATSAPP_NUMBER}</span>
          </a>
        </header>

        {loading ? (
          <div className="orders-empty">جاري تحميل الطلبات...</div>
        ) : error ? (
          <div className="orders-empty error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <h2>لا توجد طلبات مسجلة حتى الآن</h2>
            <p>ابدأ بطلب خدمة جديدة وسيظهر سجل طلباتك هنا.</p>
            <Link className="btn btn-primary" to="/services">
              تصفح الخدمات
            </Link>
          </div>
        ) : (
          <div className="orders-sections">
            <section>
              <h2>طلبات قيد التنفيذ</h2>
              <div className="orders-grid">
                {groupedOrders.active.length === 0 ? (
                  <p className="orders-grid__empty">لا توجد طلبات قيد التنفيذ حالياً.</p>
                ) : (
                  groupedOrders.active.map((order) => renderOrderCard(order, 'active'))
                )}
              </div>
            </section>

            <section>
              <h2>طلبات منجزة</h2>
              <div className="orders-grid">
                {groupedOrders.finished.length === 0 ? (
                  <p className="orders-grid__empty">لا توجد طلبات منجزة بعد.</p>
                ) : (
                  groupedOrders.finished.map((order) => renderOrderCard(order, 'done'))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
      
      {reorderModalOpen && (
        <ReorderModal
          isOpen={true}
          onClose={() => setReorderModalOpen(null)}
          orderId={reorderModalOpen}
          onReorderSuccess={() => {
            setReorderModalOpen(null)
            // Reload orders
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

