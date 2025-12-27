/**
 * خدمة طباعة إجازة حفظ القرآن الكريم
 * منطق ومراحل خدمة طباعة إجازة حفظ القرآن الكريم المخصصة
 */
import { FileText } from 'lucide-react'
import type { ServiceHandler } from '../serviceRegistry'
import { pricingAPI } from '../../lib/api'

export const QuranCertificatePrintingService: ServiceHandler = {
  id: 'quran-certificate-printing',
  name: 'طباعة إجازة حفظ القرآن الكريم',
  
  matches: (serviceName: string, _serviceId?: number) => {
    const matches = serviceName.includes('إجازة') || 
                    serviceName.includes('قرآن') ||
                    serviceName.includes('حفظ') ||
                    serviceName.toLowerCase().includes('quran') ||
                    serviceName.toLowerCase().includes('certificate')
    if (matches) {
      console.log('✅ QuranCertificatePrintingService matched:', serviceName)
    }
    return matches
  },
  
  renderStep: (_stepNumber: number, stepType: string, stepConfig: any, serviceData: any, handlers: any) => {
    console.log('🎯 QuranCertificatePrintingService.renderStep called - StepType:', stepType, 'StepConfig:', stepConfig)
    
    const {
      uploadedFiles,
      quantity, setQuantity,
      width, setWidth,
      height, setHeight,
      cardType, setCardType,
      notes, setNotes,
      customerName, setCustomerName,
      customerWhatsApp, setCustomerWhatsApp,
      customerPhoneExtra, setCustomerPhoneExtra,
      fileInputRef
    } = serviceData
    
    const { handleImageUpload, handleFileUpload } = handlers
    const fileUploadHandler = handleFileUpload || handleImageUpload
    
    console.log('🎯 Switching on stepType:', stepType)
    
    switch (stepType) {
      case 'files':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'رفع الملف والكمية'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>رفع الملف {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.ai,.psd,.png,.jpg,.jpeg,application/pdf"
                  onChange={fileUploadHandler}
                  className="hidden"
                  multiple={false}
                />
                {uploadedFiles && uploadedFiles.length > 0 ? (
                  <div className="uploaded-files-list">
                    {uploadedFiles.map((file: File, idx: number) => (
                      <div key={idx} className="uploaded-file-item">
                        <FileText size={20} />
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>اضغط لرفع ملف التصميم</p>
                    <small>PNG, JPG, PDF, AI, PSD</small>
                  </div>
                )}
              </div>
            </div>
            {stepConfig.show_quantity && (
              <div className="form-group">
                <label>الكمية (عدد النسخ) <span className="required">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={quantity || 1}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="form-input"
                  placeholder="1"
                  required
                />
              </div>
            )}
          </div>
        )
      
      case 'dimensions':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'قياس الإجازة'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            
            <div className="form-group">
              <label>الطول (سم) <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={width || 50}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 50
                  if (setWidth) {
                    setWidth(val)
                  }
                }}
                className="form-input"
                placeholder="50"
                required
              />
            </div>
            
            <div className="form-group">
              <label>العرض (سم) <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={height || 70}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 70
                  if (setHeight) {
                    setHeight(val)
                  }
                }}
                className="form-input"
                placeholder="70"
                required
              />
            </div>
            
            <div className="form-hint" style={{ 
              marginTop: '10px', 
              padding: '12px', 
              background: '#e0f2fe', 
              borderRadius: '8px',
              border: '1px solid #0ea5e9'
            }}>
              <strong style={{ color: '#0ea5e9' }}>💡 القياس الافتراضي (الستاندار):</strong>
              <p style={{ margin: '8px 0 0 0', color: '#0369a1' }}>
                50 × 70 سم - هذا هو القياس الأكثر استخداماً لإجازات حفظ القرآن الكريم
              </p>
            </div>
          </div>
        )
      
      case 'card_type':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'نوع الكرتون'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            
            <div className="form-group">
              <label>نوع الكرتون <span className="required">*</span></label>
              <div className="delivery-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="cardType"
                    value="canson"
                    checked={cardType === 'canson'}
                    onChange={(e) => setCardType(e.target.value)}
                  />
                  <span>Canson (الافتراضي)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="cardType"
                    value="normal"
                    checked={cardType === 'normal'}
                    onChange={(e) => setCardType(e.target.value)}
                  />
                  <span>كرتون عادي</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="cardType"
                    value="glossy"
                    checked={cardType === 'glossy'}
                    onChange={(e) => setCardType(e.target.value)}
                  />
                  <span>كرتون لامع</span>
                </label>
              </div>
            </div>
          </div>
        )
      
      case 'notes':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'ملاحظات'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>ملاحظات إضافية {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
              <textarea
                value={notes || ''}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                placeholder="أضف أي ملاحظات إضافية حول طلبك..."
                rows={5}
                required={stepConfig.required}
              />
            </div>
          </div>
        )
      
      case 'customer_info':
        const { deliveryType, setDeliveryType, deliveryAddress, addressConfirmed, navigate } = serviceData
        
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'معلومات العميل'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>اسم العميل {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <input
                type="text"
                value={customerName || ''}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                placeholder="أدخل اسمك"
                required={stepConfig.required}
              />
            </div>
            <div className="form-group">
              <label>رقم واتساب {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <input
                type="tel"
                value={customerWhatsApp || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9+]/g, '')
                  setCustomerWhatsApp(value)
                }}
                className="form-input"
                placeholder="09xxxxxxxx"
                required={stepConfig.required}
              />
            </div>
            {stepConfig.fields?.includes('whatsapp_optional') && (
              <div className="form-group">
                <label>رقم تواصل إضافي <span className="optional">(اختياري)</span></label>
                <input
                  type="tel"
                  value={customerPhoneExtra || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+]/g, '')
                    setCustomerPhoneExtra(value)
                  }}
                  className="form-input"
                  placeholder="09xxxxxxxx"
                />
                <small className="form-hint">يمكن استخدام رقم آخر للتواصل عبر واتساب</small>
              </div>
            )}
            
            {/* نوع الاستلام */}
            <div className="form-group">
              <label>نوع الاستلام <span className="required">*</span></label>
              <div className="delivery-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="self"
                    checked={deliveryType === 'self'}
                    onChange={(e) => setDeliveryType && setDeliveryType(e.target.value)}
                  />
                  <span>استلام ذاتي</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="delivery"
                    checked={deliveryType === 'delivery'}
                    onChange={(e) => setDeliveryType && setDeliveryType(e.target.value)}
                  />
                  <span>توصيل</span>
                </label>
              </div>
              {deliveryType === 'delivery' && deliveryAddress && (
                <div className="delivery-address-info" style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p><strong>العنوان:</strong> {deliveryAddress.street || 'لم يتم تحديد العنوان'}</p>
                  {addressConfirmed && (
                    <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ تم حفظ الموقع</p>
                  )}
                </div>
              )}
              {deliveryType === 'delivery' && !addressConfirmed && navigate && (
                <button
                  type="button"
                  onClick={() => {
                    const currentStep = serviceData.step || 5
                    const formState = {
                      step: currentStep,
                      quantity: serviceData.quantity || 1,
                      width: serviceData.width || 50,
                      height: serviceData.height || 70,
                      cardType: serviceData.cardType || 'canson',
                      notes: serviceData.notes || '',
                      customerName: serviceData.customerName || '',
                      customerWhatsApp: serviceData.customerWhatsApp || '',
                      customerPhoneExtra: serviceData.customerPhoneExtra || '',
                      deliveryType: 'delivery',
                      serviceName: 'طباعة إجازة حفظ القرآن الكريم',
                      uploadedFiles: serviceData.uploadedFiles?.map((f: File) => ({ 
                        name: f.name, 
                        size: f.size, 
                        type: f.type 
                      })) || []
                    }
                    localStorage.setItem('orderFormState', JSON.stringify(formState))
                    localStorage.setItem('shouldReopenOrderModal', 'true')
                    localStorage.setItem('orderModalService', 'طباعة إجازة حفظ القرآن الكريم')
                    navigate('/location-picker', {
                      state: {
                        from: window.location.pathname,
                        returnTo: 'order-modal',
                        serviceName: 'طباعة إجازة حفظ القرآن الكريم'
                      }
                    })
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: '10px' }}
                >
                  اختر موقع التوصيل
                </button>
              )}
            </div>
          </div>
        )
      
      default:
        console.log('⚠️ QuranCertificatePrintingService: No handler for stepType:', stepType, 'returning null')
        return null
    }
  },
  
  prepareOrderData: (serviceData: any, baseOrderData: any) => {
    const {
      uploadedFiles,
      quantity,
      width,
      height,
      cardType,
      notes
    } = serviceData
    
    const safeQuantity = Number(quantity) || 1
    const safeTotalAmount = Number(baseOrderData.total_amount) || 0
    const unitPrice = safeQuantity > 0 ? safeTotalAmount / safeQuantity : safeTotalAmount
    
    const specifications: any = {
      width: width || 50,
      height: height || 70,
      dimensions: `${width || 50} × ${height || 70} سم`,
      card_type: cardType || 'canson',
      quantity: safeQuantity
    }
    
    if (notes) {
      specifications.notes = notes
    }
    
    return {
      ...baseOrderData,
      items: [{
        service_name: baseOrderData.service_name || 'طباعة إجازة حفظ القرآن الكريم',
        quantity: safeQuantity,
        unit_price: unitPrice,
        total_price: safeTotalAmount,
        specifications: specifications,
        design_files: uploadedFiles || []
      }]
    }
  },
  
  calculatePrice: async (serviceData: any) => {
    const {
      quantity,
      width,
      height,
      cardType,
      uploadedFiles
    } = serviceData
    
    try {
      const specifications = {
        width: width || 50,
        height: height || 70,
        dimensions: `${width || 50} × ${height || 70} سم`,
        card_type: cardType || 'canson',
        quantity: quantity || 1,
        files_count: uploadedFiles?.length || 0
      }
      
      // حساب السعر بناءً على المساحة ونوع الكرتون
      const area = (width || 50) * (height || 70) // سم²
      const basePricePerUnit = 1000 // سعر أساسي لكل وحدة
      
      // تعديل السعر حسب نوع الكرتون
      let cardTypeMultiplier = 1
      if (cardType === 'canson') {
        cardTypeMultiplier = 1.5
      } else if (cardType === 'glossy') {
        cardTypeMultiplier = 1.3
      } else if (cardType === 'normal') {
        cardTypeMultiplier = 1.0
      }
      
      // حساب السعر النهائي
      const pricePerUnit = basePricePerUnit * cardTypeMultiplier * (area / 3500) // 3500 سم² = القياس الافتراضي
      const totalPrice = pricePerUnit * (quantity || 1)
      
      return Math.round(totalPrice)
    } catch (error) {
      console.error('Error calculating price:', error)
      return 0
    }
  },
  
  getSpecifications: (serviceData: any) => {
    const {
      width,
      height,
      cardType,
      quantity,
      notes,
      uploadedFiles
    } = serviceData
    
    return {
      width: width || 50,
      height: height || 70,
      dimensions: `${width || 50} × ${height || 70} سم`,
      card_type: cardType || 'canson',
      quantity: quantity || 1,
      notes: notes || '',
      files_count: uploadedFiles?.length || 0
    }
  }
}

