import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Phone, ShoppingCart, DollarSign, MessageSquare, Eye, Calendar, TrendingUp } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import './CustomersManagement.css'

interface Customer {
  phone: string
  name: string
  total_orders: number
  total_spent: number
  last_order_date?: string
  orders: OrderSummary[]
}

interface OrderSummary {
  id: number
  order_number: string
  shop_name?: string
  status: string
  final_amount: number
  created_at: string
  items: Array<{
    product_name: string
    quantity: number
  }>
}

interface CustomerDetail {
  phone: string
  name: string
  whatsapp?: string
  total_orders: number
  total_spent: number
  orders: OrderSummary[]
  staff_notes?: string
}

export default function CustomersManagement() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [staffNotes, setStaffNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredCustomers(
        customers.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query)
        )
      )
    }
  }, [searchQuery, customers])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.customers.getAll()
      if (response.data.success) {
        setCustomers(response.data.customers || [])
        setFilteredCustomers(response.data.customers || [])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewCustomer = async (phone: string) => {
    try {
      const response = await adminAPI.customers.getByPhone(phone)
      if (response.data.success) {
        setSelectedCustomer(response.data.customer)
        setStaffNotes(response.data.customer.staff_notes || '')
      }
    } catch (error) {
      console.error('Error loading customer details:', error)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return
    try {
      setIsSavingNotes(true)
      await adminAPI.customers.updateNotes(selectedCustomer.phone, staffNotes)
      if (selectedCustomer) {
        setSelectedCustomer({ ...selectedCustomer, staff_notes: staffNotes })
      }
      alert('تم حفظ الملاحظات بنجاح')
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('حدث خطأ في حفظ الملاحظات')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const openWhatsApp = (phone: string) => {
    const whatsappNumber = phone.replace(/[^0-9+]/g, '')
    window.open(`https://wa.me/${whatsappNumber}`, '_blank')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لا يوجد'
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'معلق',
      accepted: 'مقبول',
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

  if (selectedCustomer) {
    return (
      <div className="customers-management">
        <div className="customers-header">
          <button className="back-btn" onClick={() => setSelectedCustomer(null)}>
            ← العودة للقائمة
          </button>
          <h1>تفاصيل العميل</h1>
        </div>

        <div className="customer-detail-container">
          {/* Customer Info */}
          <div className="customer-info-card">
            <div className="customer-avatar">
              <User size={40} />
            </div>
            <div className="customer-details">
              <h2>{selectedCustomer.name}</h2>
              <div className="customer-contact">
                <div className="contact-item">
                  <Phone size={18} />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.whatsapp && (
                  <div className="contact-item">
                    <MessageSquare size={18} />
                    <span>{selectedCustomer.whatsapp}</span>
                    <button 
                      className="whatsapp-btn"
                      onClick={() => openWhatsApp(selectedCustomer.whatsapp || selectedCustomer.phone)}
                    >
                      فتح الواتساب
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="customer-stats">
              <div className="stat-item">
                <ShoppingCart size={20} />
                <div>
                  <span className="stat-label">عدد الطلبات</span>
                  <span className="stat-value">{selectedCustomer.total_orders}</span>
                </div>
              </div>
              <div className="stat-item">
                <DollarSign size={20} />
                <div>
                  <span className="stat-label">إجمالي المشتريات</span>
                  <span className="stat-value">{selectedCustomer.total_spent.toLocaleString()} ل.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Notes */}
          <div className="notes-card">
            <h3>ملاحظات الموظفين</h3>
            <textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="أضف ملاحظات عن العميل..."
              rows={4}
            />
            <button 
              className="save-notes-btn"
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
            >
              {isSavingNotes ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
            </button>
          </div>

          {/* Orders History */}
          <div className="orders-history-card">
            <h3>تاريخ الطلبات ({selectedCustomer.orders.length})</h3>
            <div className="orders-list">
              {selectedCustomer.orders.map((order) => (
                <div key={order.id} className="order-history-item">
                  <div className="order-header">
                    <div>
                      <span className="order-number">#{order.order_number}</span>
                      {order.shop_name && (
                        <span className="order-service">{order.shop_name}</span>
                      )}
                    </div>
                    <div className="order-meta">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="order-items-preview">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="item-tag">
                        {item.product_name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                  <div className="order-footer">
                    <span className="order-amount">{order.final_amount.toLocaleString()} ل.س</span>
                    <button 
                      className="view-order-btn"
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    >
                      <Eye size={16} />
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              ))}
              {selectedCustomer.orders.length === 0 && (
                <div className="empty-state">
                  <p>لا توجد طلبات سابقة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="customers-management">
      <div className="customers-header">
        <h1>إدارة العملاء</h1>
        <div className="header-stats">
          <div className="stat-badge">
            <User size={20} />
            <span>إجمالي العملاء: {customers.length}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="loading-state">
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <div className="customers-grid">
          {filteredCustomers.map((customer) => (
            <div key={customer.phone} className="customer-card">
              <div className="customer-card-header">
                <div className="customer-avatar-small">
                  <User size={24} />
                </div>
                <div className="customer-name-info">
                  <h3>{customer.name}</h3>
                  <p className="customer-phone">{customer.phone}</p>
                </div>
              </div>
              <div className="customer-card-stats">
                <div className="card-stat">
                  <ShoppingCart size={16} />
                  <span>{customer.total_orders} طلب</span>
                </div>
                <div className="card-stat">
                  <DollarSign size={16} />
                  <span>{customer.total_spent.toLocaleString()} ل.س</span>
                </div>
              </div>
              {customer.last_order_date && (
                <div className="customer-last-order">
                  <Calendar size={14} />
                  <span>آخر طلب: {formatDate(customer.last_order_date)}</span>
                </div>
              )}
              <div className="customer-card-actions">
                <button 
                  className="view-btn"
                  onClick={() => handleViewCustomer(customer.phone)}
                >
                  <Eye size={16} />
                  عرض التفاصيل
                </button>
                <button 
                  className="whatsapp-btn-small"
                  onClick={() => openWhatsApp(customer.phone)}
                  title="فتح الواتساب"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <p>لا يوجد عملاء</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

