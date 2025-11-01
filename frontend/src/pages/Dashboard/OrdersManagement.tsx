import { useEffect, useState } from 'react'
import { Search, MessageSquare, Eye, Calendar, ShoppingCart, ChevronDown, X, AlertCircle } from 'lucide-react'
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

const statusTabs = [
  { id: 'pending', label: 'في الانتظار', count: 0 },
  { id: 'preparing', label: 'قيد التحضير', count: 0 },
  { id: 'shipping', label: 'قيد التوصيل', count: 0 },
  { id: 'completed', label: 'مكتمل', count: 0 },
  { id: 'cancelled', label: 'ملغى', count: 0 },
]

const statusOptions = [
  { value: 'pending', label: 'في الانتظار' },
  { value: 'accepted', label: 'تم القبول' },
  { value: 'preparing', label: 'قيد التحضير' },
  { value: 'shipping', label: 'قيد التوصيل' },
  { value: 'awaiting_pickup', label: 'في انتظار الاستلام' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغى' },
  { value: 'rejected', label: 'مرفوض' },
]

export default function OrdersManagement() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')

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

  // Get orders count by status
  const getOrdersCountByStatus = (status: string) => {
    return orders.filter(order => {
      const matchesSearch = searchQuery === '' || 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone.includes(searchQuery)
      return matchesSearch && order.status === status
    }).length
  }

  // Filter orders by active tab and search
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery)
    
    const matchesTab = order.status === activeTab
    
    return matchesSearch && matchesTab
  })

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await adminAPI.orders.updateStatus(orderId, newStatus)
      showSuccess('تم تحديث حالة الطلب بنجاح')
      setDropdownOpen(null)
      await loadOrders()
    } catch (e) {
      console.error('Error updating status:', e)
      showError('حدث خطأ في تحديث حالة الطلب')
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!cancelReason.trim()) {
      showError('يرجى إدخال سبب الإلغاء')
      return
    }
    
    try {
      await adminAPI.orders.updateStatus(orderId, 'cancelled', cancelReason)
      showSuccess('تم إلغاء الطلب بنجاح')
      setCancelModalOpen(null)
      setCancelReason('')
      await loadOrders()
    } catch (e) {
      console.error('Error cancelling order:', e)
      showError('حدث خطأ في إلغاء الطلب')
    }
  }

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
      </div>

      {/* Status Tabs */}
      <div className="status-tabs">
        {statusTabs.map(tab => {
          const count = getOrdersCountByStatus(tab.id)
          return (
            <button
              key={tab.id}
              className={`status-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading">جاري التحميل...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={64} />
          <h3>لا توجد طلبات</h3>
          <p>{searchQuery ? 'لا توجد طلبات تطابق البحث' : `لا توجد طلبات بحالة "${statusTabs.find(t => t.id === activeTab)?.label}"`}</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card-horizontal">
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
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}

              <div className="order-card-content">
                <div className="order-card-header">
                  <div className="order-number">#{order.order_number}</div>
                  <div className="order-status-controls">
                    <div className="status-dropdown-container">
                      <button
                        className="status-dropdown-btn"
                        onClick={() => setDropdownOpen(dropdownOpen === order.id ? null : order.id)}
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        <span>{getStatusLabel(order.status)}</span>
                        <ChevronDown size={16} />
                      </button>
                      {dropdownOpen === order.id && (
                        <div className="status-dropdown">
                          {statusOptions.map(option => (
                            <button
                              key={option.value}
                              className={`status-option ${order.status === option.value ? 'active' : ''}`}
                              onClick={() => handleStatusChange(order.id, option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {order.status !== 'cancelled' && (
                      <button
                        className="cancel-order-btn"
                        onClick={() => setCancelModalOpen(order.id)}
                        title="إلغاء الطلب"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

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
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">الإجمالي:</span>
                    <span className="total-amount">{order.final_amount.toLocaleString()} ل.س</span>
                  </div>
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <Eye size={16} />
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="modal-overlay" onClick={() => { setCancelModalOpen(null); setCancelReason('') }}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={24} />
              <h3>إلغاء الطلب</h3>
              <button className="modal-close" onClick={() => { setCancelModalOpen(null); setCancelReason('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>يرجى إدخال سبب إلغاء الطلب:</p>
              <textarea
                className="cancel-reason-input"
                placeholder="مثال: طلب العميل إلغاء الطلب..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => { setCancelModalOpen(null); setCancelReason('') }}
              >
                إلغاء
              </button>
              <button
                className="cancel-btn-primary"
                onClick={() => handleCancelOrder(cancelModalOpen)}
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
