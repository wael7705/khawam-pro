import { useState, useEffect } from 'react'
import { X, ShoppingCart, Package, Truck, MapPin, FileText, CheckCircle, WhatsApp } from 'lucide-react'
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
  const [step, setStep] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [deliveryType, setDeliveryType] = useState<'self' | 'delivery'>('self')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [totalPrice, setTotalPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setStep(1)
      setQuantity(1)
      setNotes('')
      setWhatsappNumber('')
      setDeliveryType('self')
      setDeliveryAddress('')
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

  const handleConfirmLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeliveryLatitude(position.coords.latitude)
          setDeliveryLongitude(position.coords.longitude)
          setAddressConfirmed(true)
          showSuccess('تم تأكيد الموقع بنجاح')
        },
        (error) => {
          showError('فشل الحصول على الموقع. يرجى إدخال العنوان يدوياً')
        }
      )
    } else {
      showError('المتصفح لا يدعم تحديد الموقع')
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
        delivery_address: deliveryType === 'delivery' ? deliveryAddress : null,
        delivery_latitude: deliveryType === 'delivery' ? deliveryLatitude : null,
        delivery_longitude: deliveryType === 'delivery' ? deliveryLongitude : null,
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
                      <WhatsApp size={16} /> فتح واتساب
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
                  onClick={() => setDeliveryType('self')}
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
                  onClick={() => setDeliveryType('delivery')}
                >
                  <Truck size={24} />
                  <div>
                    <h4>توصيل للمنزل</h4>
                    <p>نوصل الطلب إلى عنوانك</p>
                  </div>
                  {deliveryType === 'delivery' && <CheckCircle size={20} />}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Delivery Address */}
          {step === 4 && (
            <div>
              {deliveryType === 'delivery' ? (
                <>
                  <h3>عنوان التوصيل</h3>
                  <div className="form-group">
                    <label>
                      العنوان <span className="required">*</span>
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="form-input"
                      rows={3}
                      placeholder="أدخل عنوان التوصيل الكامل..."
                      required
                    />
                  </div>

                  <div className="location-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={handleConfirmLocation}
                      disabled={addressConfirmed}
                    >
                      <MapPin size={18} />
                      {addressConfirmed ? 'تم تأكيد الموقع' : 'تأكيد الموقع'}
                    </button>
                  </div>

                  {addressConfirmed && (
                    <div className="location-confirmed">
                      <CheckCircle size={20} />
                      <span>تم تأكيد موقعك بنجاح</span>
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

