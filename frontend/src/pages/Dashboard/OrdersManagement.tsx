import { useEffect, useState } from 'react'
import { Search, MessageSquare, Eye, Calendar, ShoppingCart, X, AlertCircle, CheckCircle, Package, Truck, MapPin } from 'lucide-react'
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
  cancellation_reason?: string
  rejection_reason?: string
  delivery_address?: string
}

const statusTabs = [
  { id: 'pending', label: 'في الانتظار', count: 0 },
  { id: 'preparing', label: 'قيد التحضير', count: 0 },
  { id: 'awaiting_pickup', label: 'استلام ذاتي', count: 0 },
  { id: 'shipping', label: 'قيد التوصيل', count: 0 },
  { id: 'completed', label: 'مكتمل', count: 0 },
  { id: 'cancelled', label: 'ملغى', count: 0 },
  { id: 'rejected', label: 'مرفوض', count: 0 },
]


export default function OrdersManagement() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [cancelModalOpen, setCancelModalOpen] = useState<number | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [mapOpen, setMapOpen] = useState<number | null>(null)

  const loadOrders = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const res = await adminAPI.orders.getAll()
      console.log('Orders API response:', res)
      console.log('Response structure:', {
        data: res.data,
        dataType: typeof res.data,
        isArray: Array.isArray(res.data),
        keys: res.data && typeof res.data === 'object' ? Object.keys(res.data) : []
      })
      
      // Handle different response structures
      let data = []
      
      // Direct array
      if (Array.isArray(res.data)) {
        data = res.data
        console.log('Found orders as direct array:', data.length)
      } 
      // Nested in data.data
      else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        data = res.data.data
        console.log('Found orders in res.data.data:', data.length)
      } 
      // Nested in data.orders
      else if (res.data && res.data.orders && Array.isArray(res.data.orders)) {
        data = res.data.orders
        console.log('Found orders in res.data.orders:', data.length)
      }
      // Try direct access if data is object with array property
      else if (res.data && typeof res.data === 'object') {
        // Try common keys
        const possibleKeys = ['orders', 'items', 'data', 'results']
        for (const key of possibleKeys) {
          if (Array.isArray(res.data[key])) {
            data = res.data[key]
            console.log(`Found orders in res.data.${key}:`, data.length)
            break
          }
        }
      }
      
      console.log('Final parsed orders:', data.length, 'orders')
      if (data.length > 0) {
        console.log('Sample order:', data[0])
      }
      
      setOrders(data)
    } catch (e) {
      console.error('Error loading orders:', e)
      showError('حدث خطأ في جلب الطلبات')
      setOrders([])
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadOrders(true) // Show loading only on initial load
    // Refresh every 30 seconds in background
    const interval = setInterval(() => loadOrders(false), 30000)
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

  const handleAcceptOrder = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'preparing')
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      // Update in background without showing loading
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'preparing' }
            : order
        )
      )
      
      showSuccess(`تم قبول الطلب ونقله إلى قيد التحضير - ${orderNumber}`)
    } catch (e) {
      console.error('Error accepting order:', e)
      showError('حدث خطأ في قبول الطلب')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleFinishPreparing = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      const order = orders.find(o => o.id === orderId)
      if (!order) return
      
      // Move to awaiting_pickup if self delivery, shipping if delivery
      const newStatus = order.delivery_type === 'self' ? 'awaiting_pickup' : 'shipping'
      
      // Update in background first for smooth UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      )
      
      // Then update in backend
      await adminAPI.orders.updateStatus(orderId, newStatus)
      
      const orderNumber = order?.order_number || `#${orderId}`
      const statusLabel = newStatus === 'awaiting_pickup' ? 'استلام ذاتي' : 'قيد التوصيل'
      
      showSuccess(`تم الانتهاء من التحضير ونقل الطلب إلى ${statusLabel} - ${orderNumber}`)
    } catch (e) {
      console.error('Error finishing preparation:', e)
      showError('حدث خطأ في إنهاء التحضير')
      // Revert on error
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === orderId ? { ...o, status: order.status } : o
          )
        )
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleCompleteOrder = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      const order = orders.find(o => o.id === orderId)
      
      // Update in background first
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed' }
            : order
        )
      )
      
      // Then update in backend
      await adminAPI.orders.updateStatus(orderId, 'completed')
      
      const orderNumber = order?.order_number || `#${orderId}`
      showSuccess(`تم استلام الطلب بنجاح - ${orderNumber}`)
    } catch (e) {
      console.error('Error completing order:', e)
      showError('حدث خطأ في استلام الطلب')
      // Revert on error
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === orderId ? { ...o, status: order.status } : o
          )
        )
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!cancelReason.trim()) {
      showError('يرجى إدخال سبب الإلغاء')
      return
    }
    
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'cancelled', cancelReason)
      
      // Update order status locally
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        )
      )
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      showSuccess(`تم إلغاء الطلب بنجاح - ${orderNumber}`)
      setCancelModalOpen(null)
      setCancelReason('')
    } catch (e) {
      console.error('Error cancelling order:', e)
      showError('حدث خطأ في إلغاء الطلب')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleRejectOrder = async (orderId: number) => {
    if (!rejectReason.trim()) {
      showError('يرجى إدخال سبب الرفض')
      return
    }
    
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'rejected', undefined, rejectReason)
      
      // Update order status locally
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'rejected' }
            : order
        )
      )
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      showSuccess(`تم رفض الطلب بنجاح - ${orderNumber}`)
      setRejectModalOpen(null)
      setRejectReason('')
    } catch (e) {
      console.error('Error rejecting order:', e)
      showError('حدث خطأ في رفض الطلب')
    } finally {
      setUpdatingOrderId(null)
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
            <div key={order.id} className={`order-card-horizontal ${updatingOrderId === order.id ? 'updating' : ''}`}>
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
                    {/* Status Display - No dropdown */}
                    <div 
                      className={`status-badge ${updatingOrderId === order.id ? 'updating' : ''}`}
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      <span>{getStatusLabel(order.status)}</span>
                    </div>
                    
                    {/* Action Buttons based on status */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          className="action-btn accept-btn"
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="قبول الطلب"
                        >
                          <CheckCircle size={18} />
                          <span>قبول الطلب</span>
                        </button>
                        <button
                          className="action-btn reject-btn"
                          onClick={() => setRejectModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="رفض الطلب"
                        >
                          <AlertCircle size={18} />
                          <span>رفض</span>
                        </button>
                      </>
                    )}
                    
                    {order.status === 'preparing' && (
                      <>
                        <button
                          className="action-btn finish-prep-btn"
                          onClick={() => handleFinishPreparing(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="انتهاء التحضير"
                        >
                          <Package size={18} />
                          <span>انتهاء التحضير</span>
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {order.status === 'awaiting_pickup' && (
                      <>
                        <button
                          className="action-btn complete-btn"
                          onClick={() => handleCompleteOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="تم الاستلام"
                        >
                          <Truck size={18} />
                          <span>تم الاستلام</span>
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {order.status === 'shipping' && (
                      <>
                        <button
                          className="action-btn map-btn"
                          onClick={() => setMapOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="عرض على الخريطة"
                        >
                          <MapPin size={18} />
                          <span>عرض الخريطة</span>
                        </button>
                        <button
                          className="action-btn complete-btn"
                          onClick={() => handleCompleteOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="تم الاستلام"
                        >
                          <Truck size={18} />
                          <span>تم الاستلام</span>
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {/* Cancel button for other statuses */}
                    {order.status !== 'pending' && order.status !== 'preparing' && 
                     order.status !== 'shipping' && order.status !== 'awaiting_pickup' && 
                     order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        className="action-btn cancel-btn-small"
                        onClick={() => setCancelModalOpen(order.id)}
                        disabled={updatingOrderId === order.id}
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

                  {/* Show cancellation or rejection reason */}
                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <div className="reason-display cancellation-reason">
                      <strong>سبب الإلغاء:</strong>
                      <span>{order.cancellation_reason}</span>
                    </div>
                  )}
                  
                  {order.status === 'rejected' && order.rejection_reason && (
                    <div className="reason-display rejection-reason">
                      <strong>سبب الرفض:</strong>
                      <span>{order.rejection_reason}</span>
                    </div>
                  )}
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
              <X size={24} />
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
                disabled={updatingOrderId === cancelModalOpen}
              >
                {updatingOrderId === cancelModalOpen ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay" onClick={() => { setRejectModalOpen(null); setRejectReason('') }}>
          <div className="cancel-modal reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={24} />
              <h3>رفض الطلب</h3>
              <button className="modal-close" onClick={() => { setRejectModalOpen(null); setRejectReason('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>يرجى إدخال سبب رفض الطلب:</p>
              <textarea
                className="cancel-reason-input"
                placeholder="مثال: الطلب غير متوافق مع المتطلبات..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => { setRejectModalOpen(null); setRejectReason('') }}
              >
                إلغاء
              </button>
              <button
                className="reject-btn-primary"
                onClick={() => handleRejectOrder(rejectModalOpen)}
                disabled={updatingOrderId === rejectModalOpen}
              >
                {updatingOrderId === rejectModalOpen ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
