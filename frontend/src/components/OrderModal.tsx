import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, pricingAPI, workflowsAPI, servicesAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import ColorPicker from './ColorPicker'
import './OrderModal.css'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  serviceId?: number
}

export default function OrderModal({ isOpen, onClose, serviceName, serviceId }: OrderModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [loadingWorkflow, setLoadingWorkflow] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isAnalyzingPages, setIsAnalyzingPages] = useState(false)
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [unit, setUnit] = useState('cm')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerWhatsApp, setCustomerWhatsApp] = useState('')
  const [customerPhoneExtra, setCustomerPhoneExtra] = useState('')
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

  // Helper function to render step content based on step_type
  const renderStepContent = (currentStep: number) => {
    if (workflowSteps.length === 0) {
      // Fallback to default steps
      return renderDefaultStep(currentStep)
    }

    const workflowStep = workflowSteps.find(s => s.step_number === currentStep)
    if (!workflowStep) return null

    const stepConfig = workflowStep.step_config || {}
    const stepType = workflowStep.step_type

    switch (stepType) {
      case 'quantity':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>الكمية {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="form-input"
                required={stepConfig.required}
              />
            </div>
          </div>
        )

      case 'files':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>رفع الملفات {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={stepConfig.accept || "application/pdf,.pdf"}
                  onChange={handleImageUpload}
                  className="hidden"
                  multiple={stepConfig.multiple || false}
                />
                {uploadedFiles.length > 0 ? (
                  <div className="uploaded-files-list">
                    {uploadedFiles.map((file, idx) => (
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
                    <p>اضغط لرفع {stepConfig.multiple ? 'ملفات PDF' : 'ملف PDF'}</p>
                    <small>PDF فقط</small>
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
                  value={quantity}
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

      case 'dimensions':
        const fields = stepConfig.fields || ['length', 'width', 'height']
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            {fields.includes('length') && (
              <div className="form-group">
                <label>الطول {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  required={stepConfig.required}
                />
              </div>
            )}
            {fields.includes('width') && (
              <div className="form-group">
                <label>العرض {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  required={stepConfig.required}
                />
              </div>
            )}
            {fields.includes('height') && (
              <div className="form-group">
                <label>الارتفاع {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  required={stepConfig.required}
                />
              </div>
            )}
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
        )

      case 'colors':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <ColorPicker
              selectedColors={selectedColors}
              onColorsChange={setSelectedColors}
              maxColors={stepConfig.maxColors || 6}
            />
          </div>
        )

      case 'pages':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>عدد الصفحات {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <input
                type="number"
                min="1"
                value={numberOfPages}
                onChange={(e) => {
                  const pages = parseInt(e.target.value) || 1
                  setNumberOfPages(pages)
                  setQuantity(pages)
                }}
                className="form-input"
                placeholder="1"
                required={stepConfig.required}
              />
            </div>
            {(serviceName.includes('طباعة') || serviceName.includes('محاضرات') || serviceName.includes('صفح')) && (
              <>
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
        )

      case 'print_options':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
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
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : stepConfig.paper_size ? (
              <div className="form-group">
                <label>قياس الورق</label>
                <select 
                  value={paperSize} 
                  onChange={(e) => setPaperSize(e.target.value)} 
                  className="form-input"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
                <small className="form-hint">القياس الافتراضي: {stepConfig.paper_size || 'A4'}</small>
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
                      setPrintQuality('standard') // Reset quality when switching to BW
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
          </div>
        )

      case 'print_sides':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
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
            </div>
          </div>
        )

      case 'customer_info':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>اسم العميل {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <input
                type="text"
                value={customerName}
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
                value={customerWhatsApp}
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
                  value={customerPhoneExtra}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+]/g, '')
                    setCustomerPhoneExtra(value)
                  }}
                  className="form-input"
                  placeholder="09xxxxxxxx"
                />
                <small className="form-hint">يمكن استخدام رقم آخر للتواصل</small>
              </div>
            )}
            <div className="form-group">
              <label>اسم المتجر {stepConfig.required ? '' : <span className="optional">(اختياري)</span>}</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="form-input"
                placeholder="اسم المتجر أو المؤسسة"
              />
            </div>
          </div>
        )

      case 'delivery':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
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
                <div className="delivery-address-info" style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p><strong>العنوان:</strong> {deliveryAddress.street || 'لم يتم تحديد العنوان'}</p>
                  {addressConfirmed && (
                    <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ تم تأكيد العنوان</p>
                  )}
                </div>
              )}
              {deliveryType === 'delivery' && !addressConfirmed && (
                <button
                  type="button"
                  onClick={() => {
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
                      deliveryType,
                      printColor,
                      printSides,
                      numberOfPages
                    }))
                    localStorage.setItem('shouldReopenOrderModal', 'true')
                    localStorage.setItem('orderModalService', serviceName)
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

      case 'invoice':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="invoice-summary">
              <div className="invoice-item">
                <span>الخدمة:</span>
                <span>{serviceName}</span>
              </div>
              {totalPages > 0 && (
                <div className="invoice-item">
                  <span>عدد الصفحات:</span>
                  <span>{totalPages}</span>
                </div>
              )}
              {paperSize && (
                <div className="invoice-item">
                  <span>قياس الورق:</span>
                  <span>{paperSize}</span>
                </div>
              )}
              <div className="invoice-item">
                <span>نوع الطباعة:</span>
                <span>{printColor === 'bw' ? 'أبيض وأسود' : 'ملون'}</span>
              </div>
              {printColor === 'color' && (
                <div className="invoice-item">
                  <span>جودة الطباعة:</span>
                  <span>{printQuality === 'laser' ? 'دقة عالية (ليزرية)' : 'طباعة عادية'}</span>
                </div>
              )}
              <div className="invoice-item">
                <span>الكمية (عدد النسخ):</span>
                <span>{quantity}</span>
              </div>
              {customerName && (
                <div className="invoice-item">
                  <span>اسم العميل:</span>
                  <span>{customerName}</span>
                </div>
              )}
              {customerWhatsApp && (
                <div className="invoice-item">
                  <span>رقم التواصل:</span>
                  <span>{customerWhatsApp}</span>
                </div>
              )}
              {customerPhoneExtra && (
                <div className="invoice-item">
                  <span>رقم إضافي:</span>
                  <span>{customerPhoneExtra}</span>
                </div>
              )}
              <div className="invoice-item">
                <span>طريقة الاستلام:</span>
                <span>{deliveryType === 'self' ? 'استلام ذاتي' : 'توصيل'}</span>
              </div>
              {deliveryType === 'delivery' && deliveryAddress && (
                <div className="invoice-item">
                  <span>عنوان التوصيل:</span>
                  <span>{deliveryAddress.street || 'تم تحديد الموقع'}</span>
                </div>
              )}
              <div className="invoice-divider"></div>
              <div className="invoice-item total">
                <span>المجموع الكلي:</span>
                <span>{totalPrice > 0 ? totalPrice.toLocaleString() : 'يتم الحساب...'} ل.س</span>
              </div>
            </div>
          </div>
        )

      default:
        return renderDefaultStep(currentStep)
    }
  }

  const renderDefaultStep = (currentStep: number) => {
    // Default step rendering (fallback)
    switch (currentStep) {
      case 1:
        return (
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
        )
      case 2:
        return (
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
                      setQuantity(pages)
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
        )
      case 3:
        return (
          <div className="modal-body">
            <h3>المرحلة 3: اختيار الألوان</h3>
            <ColorPicker
              selectedColors={selectedColors}
              onColorsChange={setSelectedColors}
              maxColors={6}
            />
          </div>
        )
      case 4:
        return (
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
        )
      case 5:
        return (
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
                <div className="delivery-address-info" style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p><strong>العنوان:</strong> {deliveryAddress.street || 'لم يتم تحديد العنوان'}</p>
                  {addressConfirmed && (
                    <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ تم تأكيد العنوان</p>
                  )}
                </div>
              )}
              {deliveryType === 'delivery' && !addressConfirmed && (
                <button
                  type="button"
                  onClick={() => {
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
                      deliveryType,
                      printColor,
                      printSides,
                      numberOfPages
                    }))
                    localStorage.setItem('shouldReopenOrderModal', 'true')
                    localStorage.setItem('orderModalService', serviceName)
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
  }

  // Load workflow steps when modal opens and serviceId is available
  useEffect(() => {
    const loadWorkflow = async () => {
      if (isOpen && serviceId) {
        try {
          setLoadingWorkflow(true)
          const response = await workflowsAPI.getServiceWorkflow(serviceId)
          if (response.data.success && response.data.workflows.length > 0) {
            setWorkflowSteps(response.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number))
            // Reset to first step
            setStep(1)
          } else {
            // Fallback to default steps if no workflow defined
            setWorkflowSteps([])
          }
        } catch (error) {
          console.error('Error loading workflow:', error)
          // Fallback to default steps
          setWorkflowSteps([])
        } finally {
          setLoadingWorkflow(false)
        }
      } else if (isOpen && !serviceId) {
        // Try to get serviceId from serviceName
        try {
          const services = await servicesAPI.getAll()
          const service = services.data.find((s: any) => s.name_ar === serviceName)
          if (service) {
            const response = await workflowsAPI.getServiceWorkflow(service.id)
            if (response.data.success && response.data.workflows.length > 0) {
              setWorkflowSteps(response.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number))
              setStep(1)
            } else {
              setWorkflowSteps([])
            }
          } else {
            setWorkflowSteps([])
          }
        } catch (error) {
          console.error('Error loading service or workflow:', error)
          setWorkflowSteps([])
        }
      }
    }
    loadWorkflow()
  }, [isOpen, serviceId, serviceName])

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
              if (formState.customerPhoneExtra !== undefined) setCustomerPhoneExtra(formState.customerPhoneExtra)
              if (formState.shopName !== undefined) setShopName(formState.shopName)
              if (formState.totalPrice !== undefined) setTotalPrice(formState.totalPrice)
              if (formState.printColor !== undefined) setPrintColor(formState.printColor)
              if (formState.printQuality !== undefined) setPrintQuality(formState.printQuality)
              if (formState.printSides !== undefined) setPrintSides(formState.printSides)
              if (formState.numberOfPages !== undefined) setNumberOfPages(formState.numberOfPages)
              if (formState.paperSize !== undefined) setPaperSize(formState.paperSize)
              if (formState.totalPages !== undefined) setTotalPages(formState.totalPages)
              
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
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setImage(fileArray[0]) // Keep first file for image preview
    
    // Check if multiple files are allowed and if PDFs
    const workflowStep = workflowSteps.find(s => s.step_type === 'files')
    const stepConfig = workflowStep?.step_config || {}
    
    if (stepConfig.multiple && stepConfig.analyze_pages) {
      // Handle multiple PDF files
      setUploadedFiles(fileArray)
      analyzePDFPages(fileArray)
    } else {
      // Single file
      setUploadedFiles([fileArray[0]])
      if (fileArray[0].type === 'application/pdf') {
        analyzePDFPages([fileArray[0]])
      }
    }
  }

  const analyzePDFPages = async (files: File[]) => {
    setIsAnalyzingPages(true)
    let total = 0
    
    try {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          // Simple PDF page count estimation
          const text = await file.text()
          // Count occurrences of /Type /Page (basic heuristic)
          const pageMatches = text.match(/\/Type[\s\/]*Page[^s]/g)
          if (pageMatches) {
            total += pageMatches.length
          } else {
            // Fallback: estimate based on file size (rough approximation)
            // Average PDF page is ~50-100KB
            total += Math.max(1, Math.ceil(file.size / 75000))
          }
        }
      }
      
      setTotalPages(total)
      setNumberOfPages(total)
      setQuantity(total)
    } catch (error) {
      console.error('Error analyzing PDF:', error)
      // Fallback: set quantity to 1
      setTotalPages(1)
      setNumberOfPages(1)
      setQuantity(1)
    } finally {
      setIsAnalyzingPages(false)
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
        customer_whatsapp: customerPhoneExtra || customerWhatsApp,
        shop_name: shopName || null,
        service_name: serviceName,
        items: [
          {
            service_name: serviceName,
            quantity: safeQuantity,
            unit_price: unitPrice,
            total_price: safeTotalPrice,
            specifications: {
              dimensions: length || width || height ? { length, width, height, unit } : undefined,
              colors: selectedColors.length > 0 ? selectedColors : undefined,
              work_type: workType || undefined,
              notes: notes || undefined,
              print_color: printColor,
              print_quality: printQuality,
              print_sides: printSides,
              number_of_pages: totalPages || numberOfPages,
              paper_size: paperSize || 'A4',
              total_pages: totalPages,
              files_count: uploadedFiles.length,
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
        setCustomerPhoneExtra('')
        setShopName('')
        setUploadedFiles([])
        setTotalPages(0)
        setPrintQuality('standard')
        setPaperSize('A4')
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
          {(workflowSteps.length > 0 ? workflowSteps : [1, 2, 3, 4, 5]).map((s, index) => {
            const stepNum = workflowSteps.length > 0 ? s.step_number : s
            const stepName = workflowSteps.length > 0 ? s.step_name_ar : `مرحلة ${s}`
            return (
              <div
                key={stepNum}
                className={`progress-step ${stepNum <= step ? 'active' : ''}`}
                onClick={() => step > stepNum && setStep(stepNum)}
                title={stepName}
              >
                {workflowSteps.length > 0 ? stepNum : s}
              </div>
            )
          })}
        </div>

        {/* Loading workflow */}
        {loadingWorkflow && (
          <div className="modal-body">
            <div className="loading">جاري تحميل مراحل الطلب...</div>
          </div>
        )}

        {/* Render dynamic steps */}
        {!loadingWorkflow && renderStepContent(step)}

        {/* Navigation */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handlePrev}>
              السابق
            </button>
          )}
          {(() => {
            const maxStep = workflowSteps.length > 0 ? workflowSteps.length : 5
            return step < maxStep ? (
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
            )
          })()}
        </div>
      </div>
    </div>
  )
}

