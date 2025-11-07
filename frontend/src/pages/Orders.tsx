import { useEffect, useMemo, useState } from 'react'
import { ordersAPI } from '../lib/api'
import { Link } from 'react-router-dom'
import './Orders.css'

type Order = {
  id: number
  order_number?: string
  status?: string
  created_at?: string
  service_name?: string
  total_price?: number
  updated_at?: string
}

const WHATSAPP_NUMBER = '+963112134640'
const WHATSAPP_BASE = 'https://wa.me/963112134640'

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
    const message = `مرحباً، أود متابعة حالة طلبي رقم ${orderId}.`
    return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`
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
                      <p><strong>الخدمة:</strong> {order.service_name || 'غير محدد'}</p>
                      <p><strong>تاريخ الطلب:</strong> {formatDate(order.created_at)}</p>
                      {order.total_price && <p><strong>قيمة تقديرية:</strong> {order.total_price} ل.س</p>}
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
                      <p><strong>الخدمة:</strong> {order.service_name || 'غير محدد'}</p>
                      <p><strong>تاريخ الإنجاز:</strong> {formatDate(order.updated_at || order.created_at)}</p>
                      {order.total_price && <p><strong>قيمة الفاتورة:</strong> {order.total_price} ل.س</p>}
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

