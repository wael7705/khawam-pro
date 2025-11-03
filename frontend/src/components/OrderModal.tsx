import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, pricingAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import ColorPicker from './ColorPicker'
import './OrderModal.css'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
}

export default function OrderModal({ isOpen, onClose, serviceName }: OrderModalProps) {
  const navigate = useNavigate()
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
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [totalPrice, setTotalPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasRestoredState = useRef(false)
  
  // Pricing system states
  const [pricingRule, setPricingRule] = useState<any>(null)
  const [calculationType, setCalculationType] = useState<'piece' | 'area' | 'page'>('piece')
  const [printColor, setPrintColor] = useState<'bw' | 'color'>('bw')
  const [printSides, setPrintSides] = useState<'single' | 'double'>('single')
  const [numberOfPages, setNumberOfPages] = useState<number>(1)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load saved form state and delivery address from localStorage when modal opens
  // Use useLayoutEffect to restore state synchronously before render
  useLayoutEffect(() => {
    if (isOpen && !hasRestoredState.current) {
      // Check if we should restore state (only when returning from location picker)
      const shouldReopen = localStorage.getItem('shouldReopenOrderModal')
      const savedServiceName = localStorage.getItem('orderModalService')
      
      // Only restore if flag is set and service name matches
      const shouldRestore = shouldReopen === 'true' && savedServiceName === serviceName
      
      if (shouldRestore) {
        // Restore form state if exists and we're returning from location picker
        const savedFormState = localStorage.getItem('orderFormState')
        if (savedFormState) {
          try {
            const formState = JSON.parse(savedFormState)
            // Only restore if it's for the same service
            if (formState.serviceName === serviceName) {
              console.log('🔵 Restoring form state:', formState)
              
              // Restore step FIRST (this is critical!)
              if (formState.step) {
                setStep(formState.step)
              }
              
              // Restore all form fields
              if (formState.quantity !== undefined) setQuantity(formState.quantity)
              if (formState.length !== undefined) setLength(formState.length)
              if (formState.width !== undefined) setWidth(formState.width)
              if (formState.height !== undefined) setHeight(formState.height)
              if (formState.unit !== undefined) setUnit(formState.unit)
              if (formState.selectedColors !== undefined) setSelectedColors(formState.selectedColors)
              if (formState.workType !== undefined) setWorkType(formState.workType)
              if (formState.notes !== undefined) setNotes(formState.notes)
              if (formState.customerName !== undefined) setCustomerName(formState.customerName)
              if (formState.customerWhatsApp !== undefined) setCustomerWhatsApp(formState.customerWhatsApp)
              if (formState.shopName !== undefined) setShopName(formState.shopName)
              if (formState.totalPrice !== undefined) setTotalPrice(formState.totalPrice)
              
              // Restore delivery type
              if (formState.deliveryType === 'delivery') {
                setDeliveryType('delivery')
              }
              
              hasRestoredState.current = true
              console.log('✅ Form state restored successfully, step:', formState.step)
            }
          } catch (error) {
            console.error('❌ Error loading form state:', error)
          }
        }

        // Load saved delivery address
        const savedAddress = localStorage.getItem('deliveryAddress')
        if (savedAddress) {
          try {
            const address = JSON.parse(savedAddress)
            setDeliveryAddress(address)
            setAddressConfirmed(true)
            // Only update shopName if it's not already set from formState
            const formStateStr = localStorage.getItem('orderFormState')
            if (formStateStr) {
              const formState = JSON.parse(formStateStr)
              if (!formState.shopName && (address.street || address.neighborhood)) {
                setShopName([address.street, address.neighborhood, address.building].filter(Boolean).join(', '))
              }
            } else if (address.street || address.neighborhood) {
              setShopName([address.street, address.neighborhood, address.building].filter(Boolean).join(', '))
            }
            console.log('✅ Delivery address restored')
          } catch (error) {
            console.error('❌ Error loading delivery address:', error)
          }
        }
        
        // Clear the reopen flags after restoring state
        setTimeout(() => {
          localStorage.removeItem('shouldReopenOrderModal')
          localStorage.removeItem('orderModalService')
          console.log('🧹 Cleared reopen flags')
        }, 1000)
      }
    }
    
    // Reset restoration flag when modal closes
    if (!isOpen) {
      hasRestoredState.current = false
    }
  }, [isOpen, serviceName])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
    }
  }

  // Handle delivery type change - navigate to location picker if delivery
  const handleDeliveryTypeChange = (type: string) => {
    setDeliveryType(type)
    // Clear address confirmation when switching to self-pickup
    if (type === 'self') {
      setAddressConfirmed(false)
    } else if (type === 'delivery') {
      // Save current form state including current step
      localStorage.setItem('orderFormState', JSON.stringify({
        step,
        quantity,
        length,
        width,
        height,
        unit,
        selectedColors,
        workType,
        notes,
        customerName,
        customerWhatsApp,
        shopName,
        deliveryType: 'delivery',
        serviceName,
        totalPrice
      }))
      // Navigate to location picker
      navigate('/location-picker', { 
        state: { 
          from: window.location.pathname,
          returnTo: 'order-modal',
          serviceName: serviceName
        } 
      })
      onClose()
    } else {
      // Reset restoration flag if delivery type changed to self
      hasRestoredState.current = false
    }
  }

  const calculatePrice = async () => {
    try {
      setIsCalculatingPrice(true)
      
      // تحديد نوع الحساب بناءً على اسم الخدمة والأبعاد
      let calcType: 'piece' | 'area' | 'page' = 'piece'
      let qty = Number(quantity) || 1
      
      // إذا كان اسم الخدمة يحتوي على "طباعة" أو "محاضرات"، استخدم حساب الصفحات
      if (serviceName.includes('طباعة') || serviceName.includes('محاضرات') || serviceName.includes('صفح')) {
        calcType = 'page'
        qty = numberOfPages || qty
      } else if (length && width) {
        // حساب المساحة بالمتر المربع
        const l = parseFloat(String(length)) || 0
        const w = parseFloat(String(width)) || 0
        const h = parseFloat(String(height)) || 0
        
        if (h > 0 && l > 0 && w > 0) {
          // جسم ثلاثي الأبعاد - حساب المساحة الإجمالية
          const area = ((l * w * 2) + (l * h * 2) + (w * h * 2)) / 10000 // تحويل من سم² إلى م²
          calcType = 'area'
          qty = area
        } else if (l > 0 && w > 0) {
          // بوستر ثنائي الأبعاد
          const area = (l * w) / 10000 // تحويل من سم² إلى م²
          calcType = 'area'
          qty = area
        }
      }
      
      setCalculationType(calcType)
      
      // بناء المواصفات
      const specifications: any = {
        color: printColor,
        sides: printSides,
      }
      
      if (length && width) {
        specifications.length = length
        specifications.width = width
        if (height) specifications.height = height
        specifications.unit = unit
      }
      
      if (calcType === 'page') {
        specifications.paper_size = 'A4' // افتراضي
      }
      
      // حساب السعر باستخدام API
      try {
        const response = await pricingAPI.calculatePrice({
          calculation_type: calcType,
          quantity: qty,
          specifications: specifications,
        })
        
        if (response.data.success) {
          const calculatedPrice = response.data.total_price || 0
          setTotalPrice(calculatedPrice)
          setPricingRule(response.data)
          return calculatedPrice
        }
      } catch (apiError) {
        console.warn('Error calculating price from API, using fallback:', apiError)
      }
      
      // Fallback: حساب يدوي إذا فشل API
      let fallbackPrice = 0
      if (calcType === 'page') {
        fallbackPrice = qty * 50 // 50 ل.س لكل صفحة
        if (printColor === 'color') fallbackPrice *= 1.5
        if (printSides === 'double') fallbackPrice *= 1.3
      } else if (calcType === 'area') {
        fallbackPrice = qty * 5000 // 5000 ل.س لكل متر مربع
      } else {
        fallbackPrice = qty * 2000 // 2000 ل.س لكل قطعة
      }
      
      setTotalPrice(fallbackPrice)
      return fallbackPrice
      
    } catch (error) {
      console.error('Error calculating price:', error)
      const fallbackTotal = 2000 * (Number(quantity) || 1)
      setTotalPrice(fallbackTotal)
      return fallbackTotal
    } finally {
      setIsCalculatingPrice(false)
    }
  }

  // تحديث السعر عند تغيير الأبعاد أو الكمية أو الخيارات
  useEffect(() => {
    if (step >= 2) {
      calculatePrice().catch(err => console.error('Error calculating price:', err))
    }
  }, [length, width, height, quantity, step, printColor, printSides, numberOfPages, serviceName])

  const handleNext = async () => {
    if (step === 5) {
      await calculatePrice()
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

              // Prepare order data - التأكد من عدم وجود NaN
        const safeQuantity = Number(quantity) || 1
        let safeTotalPrice = Number(totalPrice)
        if (!safeTotalPrice || safeTotalPrice === 0) {
          safeTotalPrice = await calculatePrice() || 2000
        }
      const unitPrice = safeTotalPrice / safeQuantity
      
      // التأكد من أن unitPrice ليس NaN
      if (isNaN(unitPrice) || unitPrice <= 0) {
        showError('خطأ في حساب السعر. يرجى التحقق من الأبعاد والكمية')
        setIsSubmitting(false)
        return
      }
      const orderData = {
        customer_name: customerName,
        customer_phone: customerWhatsApp,
        customer_whatsapp: customerWhatsApp,
        shop_name: shopName || null,
        service_name: serviceName,
        items: [
          {
            service_name: serviceName,
            quantity: safeQuantity,
            unit_price: unitPrice,
            total_price: safeTotalPrice,
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
        total_amount: safeTotalPrice,
        final_amount: safeTotalPrice,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' 
          ? (deliveryAddress?.street || shopName || null)
          : null,
        delivery_latitude: deliveryType === 'delivery' && deliveryAddress?.latitude 
          ? deliveryAddress.latitude 
          : null,
        delivery_longitude: deliveryType === 'delivery' && deliveryAddress?.longitude 
          ? deliveryAddress.longitude 
          : null,
        notes: notes || workType || null
      }

      const response = await ordersAPI.create(orderData)
      
      if (response.data.success) {
        showSuccess(`تم إرسال الطلب بنجاح! رقم الطلب: ${response.data.order.order_number}`)
        // Clear saved form state and delivery address
        localStorage.removeItem('orderFormState')
        localStorage.removeItem('deliveryAddress')
        localStorage.removeItem('shouldReopenOrderModal')
        localStorage.removeItem('orderModalService')
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
        setDeliveryAddress(null)
        setAddressConfirmed(false)
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
              <label>رفع الصورة <span className="optional">(اختياري)</span></label>
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
              <label>الطول <span className="optional">(اختياري)</span></label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>العرض <span className="optional">(اختياري)</span></label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>الارتفاع <span className="optional">(اختياري)</span></label>
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

              {/* خيارات الطباعة - للخدمات التي تتطلب طباعة */}
              {(serviceName.includes('طباعة') || serviceName.includes('محاضرات') || serviceName.includes('صفح')) && (
                <>
                  <div className="form-group">
                    <label>عدد الصفحات <span className="required">*</span></label>
                    <input
                      type="number"
                      min="1"
                      value={numberOfPages}
                      onChange={(e) => {
                        const pages = parseInt(e.target.value) || 1
                        setNumberOfPages(pages)
                        setQuantity(pages) // تحديث الكمية أيضاً
                      }}
                      className="form-input"
                      placeholder="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>نوع الطباعة</label>
                    <div className="delivery-options">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printColor"
                          value="bw"
                          checked={printColor === 'bw'}
                          onChange={(e) => setPrintColor(e.target.value as 'bw' | 'color')}
                        />
                        <span>أبيض وأسود</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printColor"
                          value="color"
                          checked={printColor === 'color'}
                          onChange={(e) => setPrintColor(e.target.value as 'bw' | 'color')}
                        />
                        <span>ملون</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>الطباعة</label>
                    <div className="delivery-options">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printSides"
                          value="single"
                          checked={printSides === 'single'}
                          onChange={(e) => setPrintSides(e.target.value as 'single' | 'double')}
                        />
                        <span>وجه واحد</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printSides"
                          value="double"
                          checked={printSides === 'double'}
                          onChange={(e) => setPrintSides(e.target.value as 'single' | 'double')}
                        />
                        <span>وجهين</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        {/* Step 3: الألوان */}
        {step === 3 && (
          <div className="modal-body">
            <h3>المرحلة 3: اختيار الألوان</h3>
            
            <ColorPicker
              selectedColors={selectedColors}
              onColorsChange={setSelectedColors}
              maxColors={6}
            />
          </div>
        )}

        {/* Step 4: نوع العمل */}
        {step === 4 && (
          <div className="modal-body">
            <h3>المرحلة 4: نوع العمل</h3>
            
            <div className="form-group">
              <label>نوع العمل / الغرض <span className="optional">(اختياري)</span></label>
              <textarea
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="اذكر سبب حاجتك لهذه الخدمة..."
              />
            </div>

            <div className="form-group">
              <label>ملاحظات إضافية <span className="optional">(اختياري)</span></label>
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
              <label>رقم واتساب <span className="required">*</span></label>
              <input
                type="tel"
                value={customerWhatsApp}
                onChange={(e) => {
                  // Only allow numbers and + sign
                  const value = e.target.value.replace(/[^0-9+]/g, '')
                  setCustomerWhatsApp(value)
                }}
                className="form-input"
                placeholder="963xxxxxxxxx"
                required
              />
            </div>

            <div className="form-group">
              <label>اسم المتجر <span className="optional">(اختياري)</span></label>
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
                    onChange={(e) => handleDeliveryTypeChange(e.target.value)}
                  />
                  <span>استلام ذاتي</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="delivery"
                    checked={deliveryType === 'delivery'}
                    onChange={(e) => handleDeliveryTypeChange(e.target.value)}
                  />
                  <span>توصيل</span>
                </label>
              </div>
              {deliveryType === 'delivery' && deliveryAddress && (
                <div className="delivery-address-info" style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  background: addressConfirmed ? '#f0fdf4' : '#f0f9ff', 
                  borderRadius: '8px',
                  border: `1px solid ${addressConfirmed ? '#86efac' : '#bae6fd'}`
                }}>
                  {addressConfirmed && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                      ✓ تم تأكيد العنوان بنجاح
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '14px', color: addressConfirmed ? '#15803d' : '#0369a1' }}>
                    <strong>العنوان المحفوظ:</strong> {
                      [deliveryAddress.street, deliveryAddress.neighborhood, deliveryAddress.building]
                        .filter(Boolean)
                        .join(', ') || 'تم تحديد الموقع'
                    }
                  </p>
                  {deliveryAddress.latitude && deliveryAddress.longitude && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: addressConfirmed ? '#15803d' : '#0284c7' }}>
                      الإحداثيات: {deliveryAddress.latitude.toFixed(4)}, {deliveryAddress.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Invoice */}
            <div className="invoice-preview">
              <h4>الفاتورة</h4>
              <div className="invoice-details">
                <div className="invoice-row">
                  <span>السعر لكل وحدة:</span>
                  <span>{(() => {
                    const safeQty = Number(quantity) || 1
                    const safeTotal = Number(totalPrice) || 0
                    const unit = safeTotal / safeQty
                    return isNaN(unit) || unit <= 0 ? '0' : unit.toFixed(2)
                  })()} ل.س</span>
                </div>
                <div className="invoice-row">
                  <span>الكمية:</span>
                  <span>{quantity || 1}</span>
                </div>
                <div className="invoice-row total">
                  <span>الإجمالي:</span>
                  <span>{(() => {
                    const safeTotal = Number(totalPrice) || 0
                    return isNaN(safeTotal) || safeTotal < 0 ? '0' : safeTotal.toFixed(2)
                  })()} ل.س</span>
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

