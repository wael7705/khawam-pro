import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ordersAPI } from '../lib/api'
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
      try {
        const response = await ordersAPI.getAll()
        const data = Array.isArray(response.data) ? response.data : response.data?.orders || []
        setOrders(data)
      } catch (err) {
        setError('تعذر تحميل الطلبات. الرجاء المحاولة لاحقاً.')
        console.error('Error loading orders:', err)
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
    return (
      <div className="order-item-specs">
        <h4>التفاصيل:</h4>
        <ul>
          {Object.entries(specs).map(([key, value]) => (
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
                              {item.design_files && item.design_files.length > 0 && (
                                <div className="order-item-files">
                                  <h4>ملفات التصميم:</h4>
                                  <ul>
                                    {item.design_files.map((file, idx) => (
                                      <li key={`${file.filename}-${idx}`}>
                                        {file.location ? `${file.location}: ` : ''}
                                        {file.filename || 'ملف'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
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
                              {item.design_files && item.design_files.length > 0 && (
                                <div className="order-item-files">
                                  <h4>ملفات التصميم:</h4>
                                  <ul>
                                    {item.design_files.map((file, idx) => (
                                      <li key={`${file.filename}-${idx}`}>
                                        {file.location ? `${file.location}: ` : ''}
                                        {file.filename || 'ملف'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
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

