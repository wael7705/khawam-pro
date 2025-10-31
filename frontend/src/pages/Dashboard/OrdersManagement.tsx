import { useEffect, useState } from 'react'
import { Search, Filter, MessageSquare, Eye, Calendar, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './OrdersManagement.css'
import { adminAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'

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
}

export default function OrdersManagement() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.orders.getAll()
      console.log('Orders API response:', res)
      
      // Handle different response structures
      let data = []
      if (Array.isArray(res.data)) {
        data = res.data
      } else if (res.data && Array.isArray(res.data.data)) {
        data = res.data.data
      } else if (res.data && Array.isArray(res.data.orders)) {
        data = res.data.orders
      } else if (res.data && res.data.orders && Array.isArray(res.data.orders)) {
        data = res.data.orders
      }
      
      console.log('Parsed orders:', data)
      setOrders(data)
    } catch (e) {
      console.error('Error loading orders:', e)
      showError('حدث خطأ في جلب الطلبات')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    // Refresh every 30 seconds
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'في الانتظار',
      accepted: 'تم القبول',
      preparing: 'قيد التحضير',
      shipping: 'قيد التوصيل',
      awaiting_pickup: 'في انتظار الاستلام',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      rejected: 'مرفوض'
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
      rejected: '#EF4444'
    }
    return colors[status] || '#6B7280'
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="orders-management">
      <div className="section-header">
        <div>
          <h1>إدارة الطلبات</h1>
          <p>عرض وإدارة جميع الطلبات ({filteredOrders.length})</p>
        </div>
      </div>

      <div className="orders-filters">
        <div className="search-box">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن طلب (رقم الطلب، اسم العميل، رقم الهاتف)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="status-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">في الانتظار</option>
          <option value="accepted">تم القبول</option>
          <option value="preparing">قيد التحضير</option>
          <option value="shipping">قيد التوصيل</option>
          <option value="awaiting_pickup">في انتظار الاستلام</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغى</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading">جاري التحميل...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={64} />
          <h3>لا توجد طلبات</h3>
          <p>{searchQuery || statusFilter !== 'all' ? 'لا توجد طلبات تطابق البحث' : 'لم يتم إنشاء أي طلبات بعد'}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-number">#{order.order_number}</div>
                <span 
                  className="order-status-badge" 
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {order.image_url && (
                <div className="order-image-container">
                  <img 
                    src={
                      order.image_url.startsWith('data:') 
                        ? order.image_url 
                        : order.image_url.startsWith('http')
                        ? order.image_url
                        : `https://khawam-pro-production.up.railway.app${order.image_url.startsWith('/') ? order.image_url : '/' + order.image_url}`
                    }
                    alt={order.order_number}
                    className="order-card-image"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}

              <div className="order-card-body">
                <div className="customer-info">
                  <div className="customer-name">
                    <span className="label">العميل:</span>
                    <span className="value">{order.customer_name || '-'}</span>
                  </div>
                  
                  {order.shop_name && (
                    <div className="shop-name">
                      <span className="label">المتجر:</span>
                      <span className="value">{order.shop_name}</span>
        </div>
                  )}

                  <div className="customer-contact">
                    <span className="label">الهاتف:</span>
                    <span className="value">{order.customer_phone || '-'}</span>
                    {(order.customer_whatsapp || order.customer_phone) && (
                      <button
                        className="whatsapp-link-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          openWhatsApp(order.customer_whatsapp || order.customer_phone)
                        }}
                        title="فتح واتساب"
                      >
                        <MessageSquare size={16} />
        </button>
                    )}
                  </div>
      </div>

                <div className="order-meta">
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="meta-item delivery-type">
                    <span className="delivery-badge">
                      {order.delivery_type === 'delivery' ? '🚚 توصيل' : '🏪 استلام ذاتي'}
                  </span>
                  </div>
                </div>

                <div className="order-total">
                  <span className="total-label">الإجمالي:</span>
                  <span className="total-amount">{order.final_amount.toLocaleString()} ل.س</span>
                </div>
              </div>

              <div className="order-card-actions">
                <button
                  className="view-details-btn"
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                >
                  <Eye size={16} />
                  عرض التفاصيل
                  </button>
      </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
