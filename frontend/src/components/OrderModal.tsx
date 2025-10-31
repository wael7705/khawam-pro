import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import './OrderModal.css'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
}

export default function OrderModal({ isOpen, onClose, serviceName }: OrderModalProps) {
  const [step, setStep] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState<File | null>(null)
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [unit, setUnit] = useState('cm')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerWhatsApp, setCustomerWhatsApp] = useState('')
  const [shopName, setShopName] = useState('')
  const [deliveryType, setDeliveryType] = useState('self')
  const [totalPrice, setTotalPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
    }
  }

  const colorPalette = [
    '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEAA7', '#DDA15E', '#BC4749', '#6A994E', '#A7C957'
  ]

  const calculatePrice = () => {
    let price = 0
    // احسب السعر حسب الأبعاد
    if (length && width) {
      const l = parseFloat(length) || 0
      const w = parseFloat(width) || 0
      const h = parseFloat(height) || 0
      
      // حساب المساحة (للبوستر: الطول × العرض، للأشياء ثلاثية: السطح)
      if (h > 0) {
        // جسم ثلاثي الأبعاد
        const area = (l * w * 2) + (l * h * 2) + (w * h * 2)
        price = area * 100 // 100 ل.س لكل وحدة مساحة
      } else {
        // بوستر ثنائي الأبعاد
        const area = l * w
        price = area * 50 // 50 ل.س لكل سم²
      }
    } else {
      // سعر افتراضي إذا لم تكن هناك أبعاد
      price = 2000
    }
    
    const total = price * quantity
    setTotalPrice(total)
    return total
  }

  // تحديث السعر عند تغيير الأبعاد أو الكمية
  useEffect(() => {
    if (step >= 2) {
      calculatePrice()
    }
  }, [length, width, height, quantity, step])

  const handleNext = () => {
    if (step === 5) {
      calculatePrice()
    }
    setStep(step + 1)
  }

  const handlePrev = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    // Validation
    if (!customerName.trim()) {
      showError('يرجى إدخال اسم العميل')
      return
    }
    if (!customerWhatsApp.trim()) {
      showError('يرجى إدخال رقم واتساب')
      return
    }

    setIsSubmitting(true)
    try {
      // Upload image if exists
      let imageUrl = null
      if (image) {
        try {
          const formData = new FormData()
          formData.append('file', image)
          // For now, we'll skip image upload and add it to design_files later
          // const uploadResponse = await adminAPI.upload(image)
          // imageUrl = uploadResponse.url
        } catch (uploadError) {
          console.warn('Image upload failed, continuing without image:', uploadError)
        }
      }

      // Prepare order data
      const unitPrice = totalPrice / quantity || 0
      const orderData = {
        customer_name: customerName,
        customer_phone: customerWhatsApp,
        customer_whatsapp: customerWhatsApp,
        shop_name: shopName || null,
        service_name: serviceName,
        items: [
          {
            service_name: serviceName,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            specifications: {
              work_type: workType,
              notes: notes
            },
            dimensions: {
              length: length || null,
              width: width || null,
              height: height || null,
              unit: unit
            },
            colors: selectedColors,
            design_files: imageUrl ? [imageUrl] : []
          }
        ],
        total_amount: totalPrice,
        final_amount: totalPrice,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' ? shopName : null,
        notes: notes || workType || null
      }

      const response = await ordersAPI.create(orderData)
      
      if (response.data.success) {
        showSuccess(`تم إرسال الطلب بنجاح! رقم الطلب: ${response.data.order.order_number}`)
        // Reset form
        setStep(1)
        setQuantity(1)
        setImage(null)
        setLength('')
        setWidth('')
        setHeight('')
        setSelectedColors([])
        setWorkType('')
        setNotes('')
        setCustomerName('')
        setCustomerWhatsApp('')
        setShopName('')
        setDeliveryType('self')
        setTotalPrice(0)
        onClose()
      } else {
        showError('فشل إرسال الطلب. يرجى المحاولة مرة أخرى')
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'حدث خطأ في إرسال الطلب'
      showError(`خطأ: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>طلب خدمة: {serviceName}</h2>
          <button onClick={onClose} className="close-btn">
            <X />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`progress-step ${s <= step ? 'active' : ''}`}
              onClick={() => step > s && setStep(s)}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step 1: الكمية والصورة */}
        {step === 1 && (
          <div className="modal-body">
            <h3>المرحلة 1: الكمية والصورة</h3>
            
            <div className="form-group">
              <label>الكمية</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>رفع الصورة</label>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {image ? (
                  <div className="uploaded-file">
                    <img src={URL.createObjectURL(image)} alt="Preview" />
                    <p>{image.name}</p>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>اضغط لرفع الصورة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: الأبعاد */}
        {step === 2 && (
          <div className="modal-body">
            <h3>المرحلة 2: الأبعاد</h3>
            
            <div className="form-group">
              <label>الطول</label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>العرض</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>الارتفاع</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>وحدة القياس</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="form-input">
                <option value="cm">سم (cm)</option>
                <option value="mm">ملم (mm)</option>
                <option value="in">إنش (in)</option>
                <option value="m">متر (m)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: الألوان */}
        {step === 3 && (
          <div className="modal-body">
            <h3>المرحلة 3: اختيار الألوان</h3>
            
            <div className="color-picker">
              <div className="color-palette">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${selectedColors.includes(color) ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (selectedColors.includes(color)) {
                        setSelectedColors(selectedColors.filter((c) => c !== color))
                      } else if (selectedColors.length < 6) {
                        setSelectedColors([...selectedColors, color])
                      }
                    }}
                  />
                ))}
              </div>
              <p className="color-hint">اختر حتى 6 ألوان</p>
            </div>

            {selectedColors.length > 0 && (
              <div className="selected-colors">
                <h4>الألوان المختارة:</h4>
                <div className="selected-colors-list">
                  {selectedColors.map((color) => (
                    <div key={color} className="selected-color" style={{ backgroundColor: color }}>
                      {color}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: نوع العمل */}
        {step === 4 && (
          <div className="modal-body">
            <h3>المرحلة 4: نوع العمل</h3>
            
            <div className="form-group">
              <label>نوع العمل / الغرض</label>
              <textarea
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="اذكر سبب حاجتك لهذه الخدمة..."
              />
            </div>

            <div className="form-group">
              <label>ملاحظات إضافية</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </div>
        )}

        {/* Step 5: معلومات العميل */}
        {step === 5 && (
          <div className="modal-body">
            <h3>المرحلة 5: معلومات الطلب</h3>
            
            <div className="form-group">
              <label>اسم العميل</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>رقم واتساب</label>
              <input
                type="tel"
                value={customerWhatsApp}
                onChange={(e) => setCustomerWhatsApp(e.target.value)}
                className="form-input"
                placeholder="963xxxxxxxxx"
                required
              />
            </div>

            <div className="form-group">
              <label>اسم المتجر</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>نوع التوصيل</label>
              <div className="delivery-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="self"
                    checked={deliveryType === 'self'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <span>استلام ذاتي</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="delivery"
                    checked={deliveryType === 'delivery'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <span>توصيل</span>
                </label>
              </div>
            </div>

            {/* Invoice */}
            <div className="invoice-preview">
              <h4>الفاتورة</h4>
              <div className="invoice-details">
                <div className="invoice-row">
                  <span>السعر لكل وحدة:</span>
                  <span>{calculatePrice() / quantity} ل.س</span>
                </div>
                <div className="invoice-row">
                  <span>الكمية:</span>
                  <span>{quantity}</span>
                </div>
                <div className="invoice-row total">
                  <span>الإجمالي:</span>
                  <span>{totalPrice} ل.س</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handlePrev}>
              السابق
            </button>
          )}
          {step < 5 ? (
            <button className="btn btn-primary" onClick={handleNext}>
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

