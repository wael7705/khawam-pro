import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import type { AxiosError } from 'axios'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import { isAuthenticated } from '../lib/auth'
import { Link } from 'react-router-dom'
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
const WHATSAPP_BASE = 'https://wa.me/963112134640'
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api').replace(/\/$/, '')
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

type NormalizedFile = {
  url: string
  filename: string
  isImage: boolean
  location?: string
  sizeLabel?: string
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

  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated()) {
        setError('يجب تسجيل الدخول للاطلاع على طلباتك.')
        setLoading(false)
        return
      }
      try {
        const response = await ordersAPI.getAll()
        const normalized = normalizeOrdersResponse(response.data)
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

  const groupedOrders = useMemo(() => {
    const active = orders.filter((order) => !order.status || !isCompletedStatus(order.status))
    const finished = orders.filter((order) => order.status && isCompletedStatus(order.status))
    return { active, finished }
  }, [orders])

  const buildWhatsAppLink = (order: Order) => {
    const orderId = order.order_number || order.id
    const phone = order.customer_whatsapp || order.customer_phone || WHATSAPP_NUMBER
    const message = `مرحباً، أود متابعة حالة طلبي رقم ${orderId}.`
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
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

  const renderSpecifications = (specs?: Record<string, any>) => {
    if (!specs || Object.keys(specs).length === 0) return null
    const excludedKeys = new Set(['design_files', 'files', 'attachments', 'uploaded_files'])
    return (
      <div className="order-item-specs">
        <h4>التفاصيل:</h4>
        <ul>
          {Object.entries(specs)
            .filter(([key]) => !excludedKeys.has(key))
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

  const formatDate = (date?: string) => {
    if (!date) return 'غير متوفر'
    return new Date(date).toLocaleDateString('ar-SY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const renderFilesSection = useCallback((files: NormalizedFile[]) => {
    if (!files || files.length === 0) return null
    return (
      <div className="order-item-files">
        <h4>الملفات والمرفقات:</h4>
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
                  <a
                    className="order-file-action"
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} />
                    عرض
                  </a>
                  <a
                    className="order-file-action"
                    href={file.url}
                    download={file.filename || true}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    تحميل
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }, [])

  return (
    <div className="orders-page">
      <div className="container">
        <header className="orders-header">
          <div>
            <h1>طلباتي</h1>
            <p>تابع حالة طلباتك الحالية والسابقة بسهولة، وتواصل معنا مباشرة على واتساب لأي استفسار.</p>
          </div>
          <a className="whatsapp-cta" href={`${WHATSAPP_BASE}?text=${encodeURIComponent('مرحباً، لدي استفسار حول طلباتي.')}`} target="_blank" rel="noreferrer">
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
                {groupedOrders.active.length === 0 && <p className="orders-empty">لا توجد طلبات قيد التنفيذ حالياً.</p>}
                {groupedOrders.active.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="order-card__header">
                      <span className="order-card__id">طلب #{order.order_number || order.id}</span>
                      <span className="order-card__status in-progress">{formatStatus(order.status)}</span>
                    </div>
                    <div className="order-card__body">
                      <div className="order-card__details">
                        <div>
                          <strong>الخدمة:</strong>
                          <span>{order.service_name || 'غير محدد'}</span>
                        </div>
                        <div>
                          <strong>تاريخ الطلب:</strong>
                          <span>{formatDate(order.created_at)}</span>
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
                            <span>{order.delivery_address || 'غير محدد بعد'}</span>
                          </div>
                        )}
                        {order.notes && (
                          <div>
                            <strong>ملاحظات العميل:</strong>
                            <span>{order.notes}</span>
                          </div>
                        )}
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="order-card__items">
                          <h4>تفاصيل العناصر</h4>
                          {order.items.map((item, index) => (
                            <div key={index} className="order-card__item">
                              <div className="order-card__item-header">
                                <strong>{item.service_name || order.service_name || 'عنصر'}</strong>
                                <span>الكمية: {item.quantity || 1}</span>
                              </div>
                              {renderSpecifications(item.specifications)}
                              {renderFilesSection(collectDesignFiles(item))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="order-card__footer">
                      <a className="order-card__action" href={buildWhatsAppLink(order)} target="_blank" rel="noreferrer">
                        متابعة عبر واتساب
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>طلبات منجزة</h2>
              <div className="orders-grid">
                {groupedOrders.finished.length === 0 && <p className="orders-empty">لا توجد طلبات منجزة بعد.</p>}
                {groupedOrders.finished.map((order) => (
                  <article key={order.id} className="order-card done">
                    <div className="order-card__header">
                      <span className="order-card__id">طلب #{order.order_number || order.id}</span>
                      <span className="order-card__status completed">{formatStatus(order.status)}</span>
                    </div>
                    <div className="order-card__body">
                      <div className="order-card__details">
                        <div>
                          <strong>الخدمة:</strong>
                          <span>{order.service_name || 'غير محدد'}</span>
                        </div>
                        <div>
                          <strong>تاريخ الإنجاز:</strong>
                          <span>{formatDate(order.updated_at || order.created_at)}</span>
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
                          <div>
                            <strong>ملاحظات العميل:</strong>
                            <span>{order.notes}</span>
                          </div>
                        )}
                        {order.total_price && (
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
                                <strong>{item.service_name || order.service_name || 'عنصر'}</strong>
                                <span>الكمية: {item.quantity || 1}</span>
                              </div>
                              {renderSpecifications(item.specifications)}
                              {renderFilesSection(collectDesignFiles(item))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="order-card__footer">
                      <a className="order-card__action secondary" href={buildWhatsAppLink(order)} target="_blank" rel="noreferrer">
                        اطلب نسخة عن الفاتورة
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

