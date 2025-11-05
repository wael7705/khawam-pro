import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageSquare, X, Save, MapPin } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import SimpleMap from '../../components/SimpleMap'
import './OrderDetail.css'

interface OrderItem {
  id: number
  product_id?: number
  product_name: string
  service_name?: string
  order_type?: 'product' | 'service'
  quantity: number
  unit_price: number
  total_price: number
  specifications?: any
  design_files?: string[]
  status: string
}

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
  payment_status: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  notes?: string
  staff_notes?: string
  created_at: string
  items: OrderItem[]
  image_url?: string
  order_type?: 'product' | 'service'
  total_quantity?: number
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffNotes, setStaffNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showLocationMap, setShowLocationMap] = useState(false)

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id))
    }
  }, [id])

  const loadOrder = async (orderId: number) => {
    try {
      setLoading(true)
      const response = await adminAPI.orders.getById(orderId)
      if (response.data.success && response.data.order) {
        setOrder(response.data.order)
        setStaffNotes(response.data.order.staff_notes || '')
      } else {
        showError('الطلب غير موجود')
        navigate('/dashboard/orders')
      }
    } catch (error: any) {
      console.error('Error loading order:', error)
      showError('حدث خطأ في جلب تفاصيل الطلب')
      navigate('/dashboard/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    
    setIsUpdatingStatus(true)
    try {
      await adminAPI.orders.updateStatus(order.id, newStatus)
      setOrder({ ...order, status: newStatus })
      showSuccess(`تم تحديث حالة الطلب إلى: ${getStatusLabel(newStatus)}`)
    } catch (error: any) {
      showError('فشل تحديث حالة الطلب')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!order) return
    
    setIsSavingNotes(true)
    try {
      await adminAPI.orders.updateStaffNotes(order.id, staffNotes)
      setOrder({ ...order, staff_notes: staffNotes })
      showSuccess('تم حفظ الملاحظات بنجاح')
    } catch (error: any) {
      showError('فشل حفظ الملاحظات')
    } finally {
      setIsSavingNotes(false)
    }
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

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="loading">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="error-message">الطلب غير موجود</div>
        </div>
      </div>
    )
  }

  return (
    <div className="order-detail-page">
      <div className="container">
        <div className="order-detail-header">
          <button className="back-button" onClick={() => navigate('/dashboard/orders')}>
            <ArrowRight size={20} />
            العودة للطلبات
          </button>
          <h1>تفاصيل الطلب: {order.order_number}</h1>
        </div>

        <div className="order-detail-content">
        {/* Customer Info Card */}
        <div className="detail-card customer-card">
          <h2>معلومات العميل</h2>
          <div className="customer-info-grid">
            <div className="info-item">
              <label>اسم العميل:</label>
              <span>{order.customer_name || '-'}</span>
            </div>
            <div className="info-item">
              <label>رقم الهاتف:</label>
              <span>{order.customer_phone || '-'}</span>
            </div>
            <div className="info-item">
              <label>واتساب:</label>
              <button 
                className="whatsapp-btn"
                onClick={() => openWhatsApp(order.customer_whatsapp || order.customer_phone)}
              >
                <MessageSquare size={16} />
                {order.customer_whatsapp || order.customer_phone}
              </button>
            </div>
            {order.customer_whatsapp && order.customer_whatsapp !== order.customer_phone && (
              <div className="info-item">
                <label>واتساب إضافي:</label>
                <button 
                  className="whatsapp-btn"
                  onClick={() => openWhatsApp(order.customer_whatsapp)}
                >
                  <MessageSquare size={16} />
                  {order.customer_whatsapp}
                </button>
              </div>
            )}
            {order.shop_name && (
              <div className="info-item">
                <label>اسم المتجر:</label>
                <span>{order.shop_name}</span>
              </div>
            )}
          </div>
        </div>


        {/* Order Items */}
        <div className="detail-card items-card">
          <h2>عناصر الطلب</h2>
          {order.order_type && (
            <div className="order-type-badge-container">
              <span className={`order-type-badge ${order.order_type}`}>
                {order.order_type === 'service' ? '🛠️ طلب خدمة' : '📦 طلب منتج'}
              </span>
              {order.total_quantity && order.total_quantity > 0 && (
                <span className="total-quantity-badge">
                  الكمية الإجمالية: {order.total_quantity}
                </span>
              )}
            </div>
          )}
          <div className="items-list">
            {order.items.map((item) => (
              <div key={item.id} className="order-item-card">
                <div className="item-header">
                  <div className="item-name-section">
                    <h3>{item.service_name || item.product_name}</h3>
                    {item.order_type && (
                      <span className={`item-type-badge ${item.order_type}`}>
                        {item.order_type === 'service' ? '🛠️ خدمة' : '📦 منتج'}
                      </span>
                    )}
                  </div>
                  <span className="item-quantity">الكمية: {item.quantity}</span>
                </div>
                <div className="item-details">
                  <div className="item-price">
                    <span>السعر للوحدة: {item.unit_price.toLocaleString()} ل.س</span>
                    <span className="total">الإجمالي: {item.total_price.toLocaleString()} ل.س</span>
                  </div>
                  {item.specifications && (
                    <div className="item-specs">
                      {item.specifications.dimensions && (
                        <div className="spec-group dimensions-group">
                          <label>الأبعاد:</label>
                          <div className="dimensions-details">
                            {item.specifications.dimensions.length && (
                              <div className="dimension-item">
                                <span className="dimension-label">الطول:</span>
                                <span className="dimension-value">
                                  {item.specifications.dimensions.length} {item.specifications.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                            {item.specifications.dimensions.width && (
                              <div className="dimension-item">
                                <span className="dimension-label">العرض:</span>
                                <span className="dimension-value">
                                  {item.specifications.dimensions.width} {item.specifications.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                            {item.specifications.dimensions.height && (
                              <div className="dimension-item">
                                <span className="dimension-label">الارتفاع:</span>
                                <span className="dimension-value">
                                  {item.specifications.dimensions.height} {item.specifications.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                            {item.specifications.dimensions.unit && (
                              <div className="dimension-item">
                                <span className="dimension-label">وحدة القياس:</span>
                                <span className="dimension-value">{item.specifications.dimensions.unit}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {item.specifications.colors && item.specifications.colors.length > 0 && (
                        <div className="spec-group">
                          <label>الألوان:</label>
                          <div className="colors-list">
                            {item.specifications.colors.map((color: string, idx: number) => (
                              <span key={idx} className="color-dot" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        </div>
                      )}
                      {item.specifications.work_type && (
                        <div className="spec-group">
                          <label>نوع العمل:</label>
                          <span>{item.specifications.work_type}</span>
                        </div>
                      )}
                      {item.specifications.print_color && (
                        <div className="spec-group">
                          <label>نوع الطباعة:</label>
                          <span>{item.specifications.print_color === 'color' ? 'ملون' : 'أبيض وأسود'}</span>
                        </div>
                      )}
                      {item.specifications.print_sides && (
                        <div className="spec-group">
                          <label>الوجهين:</label>
                          <span>{item.specifications.print_sides === 'double' ? 'وجهين' : 'وجه واحد'}</span>
                        </div>
                      )}
                      {item.specifications.number_of_pages && (
                        <div className="spec-group">
                          <label>عدد الصفحات:</label>
                          <span>{item.specifications.number_of_pages}</span>
                        </div>
                      )}
                      {item.specifications.paper_size && (
                        <div className="spec-group">
                          <label>حجم الورق:</label>
                          <span>{item.specifications.paper_size}</span>
                        </div>
                      )}
                      {item.specifications.delivery_type && (
                        <div className="spec-group">
                          <label>نوع التوصيل:</label>
                          <span>{item.specifications.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                        </div>
                      )}
                      {item.specifications.notes && (
                        <div className="spec-group">
                          <label>ملاحظات:</label>
                          <span>{item.specifications.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.design_files && item.design_files.length > 0 && (
                    <div className="design-files">
                      <label>ملفات التصميم:</label>
                      <div className="files-grid">
                        {item.design_files.map((file, idx) => (
                          <img key={idx} src={file} alt={`Design ${idx + 1}`} className="design-preview" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="detail-card summary-card">
          <h2>ملخص الطلب</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <label>تاريخ الطلب:</label>
              <span>{new Date(order.created_at).toLocaleDateString('ar-SY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div className="summary-item">
              <label>نوع التوصيل:</label>
              <div className="delivery-info-wrapper">
                <span>{order.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                {order.delivery_type === 'delivery' && (order.delivery_latitude && order.delivery_longitude) && (
                  <button
                    className="show-location-btn"
                    onClick={() => setShowLocationMap(!showLocationMap)}
                  >
                    <MapPin size={16} />
                    {showLocationMap ? 'إخفاء الخريطة' : 'عرض الموقع على الخريطة'}
                  </button>
                )}
              </div>
            </div>
            {order.delivery_type === 'delivery' && (
              <>
                {order.delivery_address && (
                  <div className="summary-item">
                    <label>عنوان التوصيل:</label>
                    <span>{order.delivery_address}</span>
                  </div>
                )}
                {order.delivery_latitude && order.delivery_longitude && (
                  <>
                    <div className="summary-item">
                      <label>الإحداثيات:</label>
                      <span>{order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}</span>
                    </div>
                    <div className="summary-item">
                      <label>رابط الخريطة:</label>
                      <a 
                        href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-link"
                      >
                        <MapPin size={16} />
                        فتح في Google Maps
                      </a>
                    </div>
                    <div className="summary-item">
                      <button
                        className="show-location-btn"
                        onClick={() => setShowLocationMap(!showLocationMap)}
                      >
                        <MapPin size={16} />
                        {showLocationMap ? 'إخفاء الخريطة' : 'عرض الموقع على الخريطة'}
                      </button>
                    </div>
                    {showLocationMap && (
                      <div className="summary-item location-map-item">
                        <label>الموقع على الخريطة:</label>
                        <div className="location-map-container">
                          <SimpleMap
                            address={order.delivery_address}
                            latitude={order.delivery_latitude}
                            longitude={order.delivery_longitude}
                            defaultCenter={[order.delivery_latitude, order.delivery_longitude]}
                            defaultZoom={17}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <div className="summary-item">
              <label>حالة الدفع:</label>
              <span>{order.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span>
            </div>
            <div className="summary-item total">
              <label>الإجمالي:</label>
              <span className="amount">{order.final_amount.toLocaleString()} ل.س</span>
            </div>
          </div>
          {order.notes && (
            <div className="customer-notes">
              <label>ملاحظات العميل:</label>
              <p>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Staff Notes */}
        <div className="detail-card notes-card">
          <h2>ملاحظات الموظف</h2>
          <textarea
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="أضف ملاحظات حول هذا الطلب..."
            className="notes-textarea"
            rows={4}
          />
          <button
            className="save-notes-btn"
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
          >
            <Save size={16} />
            {isSavingNotes ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

