import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ShoppingCart, Package, Truck, MapPin, FileText, CheckCircle, MessageCircle } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import { isAuthenticated, getUserData } from '../lib/auth'
import './ProductOrderModal.css'

interface ProductOrderModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: number
    name_ar: string
    name?: string
    price: number
    base_price?: number
    image_url?: string
  }
}

export default function ProductOrderModal({ isOpen, onClose, product }: ProductOrderModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [deliveryType, setDeliveryType] = useState<'self' | 'delivery'>('self')
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null)
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [totalPrice, setTotalPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const hasRestoredState = useRef(false)

  // Load saved form state and delivery address when modal opens
  useEffect(() => {
    if (isOpen && !hasRestoredState.current) {
      // Check if we should restore state (only when returning from location picker)
      const shouldReopen = localStorage.getItem('shouldReopenProductOrderModal')
      
      if (shouldReopen === 'true') {
        // Restore form state if exists
        const savedFormState = localStorage.getItem('productOrderFormState')
        if (savedFormState) {
          try {
            const formState = JSON.parse(savedFormState)
            if (formState.step) setStep(formState.step)
            if (formState.quantity !== undefined) setQuantity(formState.quantity)
            if (formState.notes !== undefined) setNotes(formState.notes)
            if (formState.whatsappNumber !== undefined) setWhatsappNumber(formState.whatsappNumber)
            if (formState.deliveryType !== undefined) setDeliveryType(formState.deliveryType)
            if (formState.customerName !== undefined) setCustomerName(formState.customerName)
            if (formState.customerPhone !== undefined) setCustomerPhone(formState.customerPhone)
            
            hasRestoredState.current = true
          } catch (error) {
            console.error('Error loading form state:', error)
          }
        }

        // Load saved delivery address
        const savedAddress = localStorage.getItem('deliveryAddress')
        if (savedAddress) {
          try {
            const address = JSON.parse(savedAddress)
            setDeliveryAddress(address)
            setDeliveryLatitude(address.latitude || null)
            setDeliveryLongitude(address.longitude || null)
            setAddressConfirmed(true)
            showSuccess('تم حفظ الموقع بنجاح')
            console.log('✅ Delivery address restored')
          } catch (error) {
            console.error('Error loading delivery address:', error)
          }
        }

        // Clear flags
        localStorage.removeItem('shouldReopenProductOrderModal')
      } else {
        // Reset form when modal opens normally
        setStep(1)
        setQuantity(1)
        setNotes('')
        setWhatsappNumber('')
        setDeliveryType('self')
        setDeliveryAddress(null)
        setDeliveryLatitude(null)
        setDeliveryLongitude(null)
        setAddressConfirmed(false)
        setIsSubmitting(false)
        
        // Load user data if authenticated
        if (isAuthenticated()) {
          const userData = getUserData()
          if (userData) {
            setCustomerName(userData.name || '')
            setCustomerPhone(userData.phone || userData.email || '')
          }
        }
      }
    }

    // Reset flag when modal closes
    if (!isOpen) {
      hasRestoredState.current = false
    }
  }, [isOpen])

  useEffect(() => {
    // Calculate total price
    const basePrice = product.base_price || product.price
    setTotalPrice(basePrice * quantity)
  }, [quantity, product.price, product.base_price])

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleDeliveryTypeChange = (type: 'self' | 'delivery') => {
    setDeliveryType(type)
    // Clear address confirmation when switching to self-pickup
    if (type === 'self') {
      setAddressConfirmed(false)
      setDeliveryAddress(null)
      setDeliveryLatitude(null)
      setDeliveryLongitude(null)
    } else if (type === 'delivery') {
      // Save current form state including current step
      localStorage.setItem('productOrderFormState', JSON.stringify({
        step,
        quantity,
        notes,
        whatsappNumber,
        deliveryType: 'delivery',
        customerName,
        customerPhone,
        productId: product.id,
        productName: product.name_ar || product.name
      }))
      localStorage.setItem('shouldReopenProductOrderModal', 'true')
      // Navigate to location picker
      navigate('/location-picker', { 
        state: { 
          from: 'product-order',
          productId: product.id
        }
      })
    }
  }

  const handleSubmit = async () => {
    if (!customerName || !customerPhone) {
      showError('الرجاء إدخال اسمك ورقم هاتفك')
      return
    }

    if (deliveryType === 'delivery' && !deliveryAddress) {
      showError('الرجاء إدخال عنوان التوصيل')
      return
    }

    setIsSubmitting(true)

    try {
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_whatsapp: whatsappNumber || customerPhone,
        items: [
          {
            product_id: product.id,
            product_name: product.name_ar || product.name || 'منتج',
            quantity: quantity,
            unit_price: product.base_price || product.price,
            total_price: totalPrice,
            specifications: {
              notes: notes,
              delivery_type: deliveryType,
            },
          },
        ],
        total_amount: totalPrice,
        final_amount: totalPrice,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' 
          ? (deliveryAddress?.street || deliveryAddress?.address || null)
          : null,
        delivery_latitude: deliveryType === 'delivery' ? (deliveryLatitude || deliveryAddress?.latitude || null) : null,
        delivery_longitude: deliveryType === 'delivery' ? (deliveryLongitude || deliveryAddress?.longitude || null) : null,
        notes: notes,
      }

      const response = await ordersAPI.create(orderData)

      if (response.data) {
        showSuccess('تم إنشاء الطلب بنجاح!')
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      showError(error.response?.data?.detail || 'فشل إنشاء الطلب. يرجى المحاولة مرة أخرى')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="product-order-modal-overlay" onClick={onClose}>
      <div className="product-order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>طلب {product.name_ar}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}
            >
              {s === 1 && 'المعلومات'}
              {s === 2 && 'الكمية'}
              {s === 3 && 'الاستلام'}
              {s === 4 && 'التوصيل'}
              {s === 5 && 'الفاتورة'}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="modal-body">
          {/* Step 1: Product Info & Notes */}
          {step === 1 && (
            <div>
              <h3>معلومات الطلب</h3>
              <div className="product-info-card">
                <img src={product.image_url || '/placeholder-product.png'} alt={product.name_ar} />
                <div>
                  <h4>{product.name_ar}</h4>
                  <p className="product-price">السعر: {product.base_price || product.price} ل.س</p>
                </div>
              </div>

              <div className="form-group">
                <label>
                  اسمك <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  placeholder="أدخل اسمك"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  رقم الهاتف <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="form-input"
                  placeholder="09xxxxxxxx"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  رقم واتساب إضافي <span className="optional">(اختياري)</span>
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="form-input"
                  placeholder="09xxxxxxxx"
                />
                <small className="form-hint">
                  {whatsappNumber && (
                      <a
                      href={`https://wa.me/963${whatsappNumber.replace(/^0/, '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-link"
                    >
                      <MessageCircle size={16} /> فتح واتساب
                    </a>
                  )}
                </small>
              </div>

              <div className="form-group">
                <label>
                  ملاحظات مع الطلب <span className="optional">(اختياري)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  rows={4}
                  placeholder="أضف أي ملاحظات أو تعليمات خاصة..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Quantity */}
          {step === 2 && (
            <div>
              <h3>الكمية</h3>
              <div className="quantity-selector">
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="quantity-input"
                />
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              <div className="quantity-summary">
                <p>
                  <strong>السعر للوحدة:</strong> {product.base_price || product.price} ل.س
                </p>
                <p>
                  <strong>الكمية:</strong> {quantity}
                </p>
                <p className="total-preview">
                  <strong>المجموع:</strong> {totalPrice.toLocaleString()} ل.س
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Delivery Type */}
          {step === 3 && (
            <div>
              <h3>طريقة الاستلام</h3>
              <div className="delivery-options">
                <div
                  className={`delivery-option ${deliveryType === 'self' ? 'selected' : ''}`}
                  onClick={() => handleDeliveryTypeChange('self')}
                >
                  <Package size={24} />
                  <div>
                    <h4>استلام من المتجر</h4>
                    <p>استلم طلبك من موقعنا</p>
                  </div>
                  {deliveryType === 'self' && <CheckCircle size={20} />}
                </div>
                <div
                  className={`delivery-option ${deliveryType === 'delivery' ? 'selected' : ''}`}
                  onClick={() => handleDeliveryTypeChange('delivery')}
                >
                  <Truck size={24} />
                  <div>
                    <h4>توصيل للمنزل</h4>
                    <p>نوصل الطلب إلى عنوانك</p>
                  </div>
                  {deliveryType === 'delivery' && <CheckCircle size={20} />}
                </div>
              </div>
              {deliveryType === 'delivery' && deliveryAddress && (
                <div className="delivery-address-info" style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', borderRight: '4px solid #3b82f6' }}>
                  <p><strong>العنوان:</strong> {deliveryAddress.street || deliveryAddress.address || 'تم تحديد الموقع'}</p>
                  {addressConfirmed && (
                    <p style={{ color: '#059669', fontSize: '0.9rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> تم حفظ الموقع بنجاح
                    </p>
                  )}
                </div>
              )}
              {deliveryType === 'delivery' && !addressConfirmed && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', marginBottom: '12px' }}>سيتم نقلك إلى صفحة تحديد الموقع</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Delivery Address - Show confirmation if delivery selected */}
          {step === 4 && (
            <div>
              {deliveryType === 'delivery' ? (
                <>
                  <h3>عنوان التوصيل</h3>
                  {deliveryAddress && addressConfirmed ? (
                    <div className="location-confirmed" style={{ padding: '20px', background: '#f0f9ff', borderRadius: '12px', borderRight: '4px solid #3b82f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <CheckCircle size={24} color="#059669" />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>تم حفظ الموقع بنجاح</span>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <p><strong>العنوان:</strong> {deliveryAddress.street || deliveryAddress.address || 'تم تحديد الموقع'}</p>
                        {deliveryAddress.neighborhood && (
                          <p><strong>الحي:</strong> {deliveryAddress.neighborhood}</p>
                        )}
                        {deliveryAddress.building && (
                          <p><strong>المبنى:</strong> {deliveryAddress.building}</p>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDeliveryTypeChange('delivery')}
                        style={{ marginTop: '16px' }}
                      >
                        <MapPin size={18} />
                        تغيير الموقع
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <MapPin size={48} color="#6b7280" style={{ marginBottom: '16px' }} />
                      <p style={{ color: '#6b7280', marginBottom: '20px' }}>يرجى تحديد موقع التوصيل</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleDeliveryTypeChange('delivery')}
                      >
                        <MapPin size={18} />
                        اختر موقع التوصيل
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="pickup-info">
                  <h3>استلام من المتجر</h3>
                  <p>سيتم إشعارك عند جاهزية الطلب للاستلام</p>
                  <div className="info-card">
                    <MapPin size={20} />
                    <div>
                      <strong>عنوان المتجر:</strong>
                      <p>سيرجي، شارع الرئيسي</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Invoice */}
          {step === 5 && (
            <div>
              <h3>الفاتورة</h3>
              <div className="invoice-summary">
                <div className="invoice-item">
                  <span>المنتج:</span>
                  <span>{product.name_ar}</span>
                </div>
                <div className="invoice-item">
                  <span>الكمية:</span>
                  <span>{quantity}</span>
                </div>
                <div className="invoice-item">
                  <span>سعر الوحدة:</span>
                  <span>{product.base_price || product.price} ل.س</span>
                </div>
                <div className="invoice-divider"></div>
                <div className="invoice-item total">
                  <span>المجموع الكلي:</span>
                  <span>{totalPrice.toLocaleString()} ل.س</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="invoice-note">
                    <FileText size={16} />
                    <span>سيتم إضافة رسوم التوصيل عند تأكيد الطلب</span>
                  </div>
                )}
                {notes && (
                  <div className="invoice-notes">
                    <strong>ملاحظات:</strong>
                    <p>{notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack} disabled={isSubmitting}>
              رجوع
            </button>
          )}
          {step < 5 ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={isSubmitting}>
              التالي
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

