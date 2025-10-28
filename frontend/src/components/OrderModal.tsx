import { useState, useRef } from 'react'
import { X } from 'lucide-react'
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
    if (length && width && height) {
      const l = parseFloat(length)
      const w = parseFloat(width)
      const h = parseFloat(height) || 0
      
      const area = l * w * 2 + l * h * 2 + w * h * 2
      price = area * 100 // مثال
    }
    
    setTotalPrice(price * quantity)
    return price * quantity
  }

  const handleNext = () => {
    if (step === 5) {
      calculatePrice()
    }
    setStep(step + 1)
  }

  const handlePrev = () => {
    setStep(step - 1)
  }

  const handleSubmit = () => {
    // هنا إرسال الطلب
    alert('تم إرسال الطلب بنجاح!')
    onClose()
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
            <button className="btn btn-primary" onClick={handleSubmit}>
              تأكيد الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

