/**
 * خدمة طباعة المحاضرات
 * منطق ومراحل خدمة طباعة المحاضرات المخصصة
 */
import { FileText } from 'lucide-react'
import type { ServiceHandler } from '../serviceRegistry'
import { pricingAPI } from '../../lib/api'

export const LecturePrintingService: ServiceHandler = {
  id: 'lecture-printing',
  name: 'طباعة محاضرات',
  
  matches: (serviceName: string, _serviceId?: number) => {
    return serviceName.includes('محاضرات') || 
           serviceName.toLowerCase().includes('lecture')
  },
  
  renderStep: (_stepNumber: number, stepType: string, stepConfig: any, serviceData: any, handlers: any) => {
    const {
      uploadedFiles,
      quantity, setQuantity,
      totalPages,
      isAnalyzingPages,
      paperSize, setPaperSize,
      printColor, setPrintColor,
      printQuality, setPrintQuality,
      printSides, setPrintSides,
      notes, setNotes,
      customerName, setCustomerName,
      customerWhatsApp, setCustomerWhatsApp,
      customerPhoneExtra, setCustomerPhoneExtra,
      fileInputRef
    } = serviceData
    
    const { handleImageUpload, handleFileUpload } = handlers
    const fileUploadHandler = handleFileUpload || handleImageUpload
    
    switch (stepType) {
      case 'files':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'رفع الملفات'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>رفع الملفات {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,.doc,.docx"
                  onChange={fileUploadHandler}
                  className="hidden"
                  multiple={stepConfig.multiple || false}
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
                    {stepConfig.analyze_pages && (
                      <div className="pages-analysis">
                        {isAnalyzingPages ? (
                          <p>جاري تحليل عدد الصفحات...</p>
                        ) : totalPages > 0 ? (
                          <p className="pages-count">
                            <strong>عدد الصفحات المكتشفة: {totalPages}</strong>
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>اضغط لرفع {stepConfig.multiple ? 'ملفات PDF أو Word' : 'ملف PDF أو Word'}</p>
                    <small>PDF, DOC, DOCX</small>
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
                {totalPages > 0 && (
                  <small className="form-hint">
                    إجمالي الصفحات: {totalPages} × {quantity} نسخة = {totalPages * quantity} صفحة
                  </small>
                )}
              </div>
            )}
          </div>
        )
      
      case 'print_options':
        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'إعدادات الطباعة'}</h3>
            {stepConfig.step_description_ar && (
              <p className="step-description">{stepConfig.step_description_ar}</p>
            )}
            
            {/* قياس الورق */}
            {stepConfig.paper_sizes && stepConfig.paper_sizes.length > 0 ? (
              <div className="form-group">
                <label>قياس الورق <span className="required">*</span></label>
                <div className="delivery-options">
                  {stepConfig.paper_sizes.map((size: string) => (
                    <label key={size} className="radio-option">
                      <input
                        type="radio"
                        name="paperSize"
                        value={size}
                        checked={paperSize === size}
                        onChange={(e) => setPaperSize(e.target.value)}
                      />
                      <span>{size === 'B5' || size === 'booklet' ? 'B5 (Booklet)' : size}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* نوع الطباعة */}
            <div className="form-group">
              <label>نوع الطباعة <span className="required">*</span></label>
              <div className="delivery-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="printColor"
                    value="bw"
                    checked={printColor === 'bw'}
                    onChange={(e) => {
                      setPrintColor(e.target.value as 'bw' | 'color')
                      setPrintQuality('standard')
                    }}
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
            
            {/* خيارات الجودة للملون فقط */}
            {printColor === 'color' && stepConfig.quality_options?.color && (
              <div className="form-group">
                <label>جودة الطباعة <span className="required">*</span></label>
                <div className="delivery-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="printQuality"
                      value="standard"
                      checked={printQuality === 'standard'}
                      onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'laser')}
                    />
                    <span>طباعة عادية</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="printQuality"
                      value="laser"
                      checked={printQuality === 'laser'}
                      onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'laser')}
                    />
                    <span>دقة عالية (ليزرية)</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* عدد الوجوه */}
            <div className="form-group">
              <label>عدد الوجوه <span className="required">*</span></label>
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
              {printSides === 'double' && (
                <small className="form-hint" style={{ color: '#667eea', marginTop: '8px', display: 'block' }}>
                  ملاحظة: طباعة وجهين = السعر الأساسي × 2
                </small>
              )}
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
                    // حفظ الحالة والعودة بعد اختيار العنوان
                    localStorage.setItem('shouldReopenOrderModal', 'true')
                    localStorage.setItem('orderModalService', 'طباعة محاضرات')
                    navigate('/location-picker')
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
        return null
    }
  },
  
  prepareOrderData: (serviceData: any, baseOrderData: any) => {
    const {
      uploadedFiles,
      quantity,
      totalPages,
      paperSize,
      printColor,
      printQuality,
      printSides,
      notes
    } = serviceData
    
    const specifications: any = {
      paper_size: paperSize,
      print_color: printColor,
      print_quality: printQuality,
      print_sides: printSides,
      number_of_pages: totalPages,
      total_pages: totalPages * quantity,
      files_count: uploadedFiles?.length || 0
    }
    
    if (notes) {
      specifications.notes = notes
    }
    
    return {
      ...baseOrderData,
      items: [{
        service_name: baseOrderData.service_name,
        quantity: quantity,
        unit_price: baseOrderData.total_amount / quantity,
        total_price: baseOrderData.total_amount,
        specifications: specifications,
        design_files: uploadedFiles || []
      }]
    }
  },
  
  calculatePrice: async (serviceData: any) => {
    const {
      totalPages,
      quantity,
      paperSize,
      printColor,
      printQuality,
      printSides,
      uploadedFiles
    } = serviceData
    
    try {
      const pagesPerCopy = totalPages > 0 ? totalPages : 1
      const totalPagesForCalc = pagesPerCopy * quantity
      
      const specifications = {
        color: printColor,
        sides: printSides,
        paper_size: paperSize,
        print_quality: printQuality,
        number_of_pages: totalPages,
        total_pages: totalPagesForCalc,
        files_count: uploadedFiles?.length || 0
      }
      
      const response = await pricingAPI.calculatePrice({
        calculation_type: 'page',
        quantity: totalPagesForCalc,
        specifications
      })
      
      if (response.data.success && response.data.total_price !== undefined) {
        return response.data.total_price || 0
      }
      return 0
    } catch (error) {
      console.error('Error calculating price:', error)
      return 0
    }
  },
  
  getSpecifications: (serviceData: any) => {
    const {
      paperSize,
      printColor,
      printQuality,
      printSides,
      totalPages,
      quantity,
      uploadedFiles
    } = serviceData
    
    return {
      paper_size: paperSize,
      print_color: printColor,
      print_quality: printQuality,
      print_sides: printSides,
      number_of_pages: totalPages,
      total_pages: totalPages * quantity,
      files_count: uploadedFiles?.length || 0
    }
  }
}
