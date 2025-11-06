import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, pricingAPI, workflowsAPI, servicesAPI, fileAnalysisAPI } from '../lib/api'
import api from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import ColorPicker from './ColorPicker'
import ImageColorAnalyzer from './ImageColorAnalyzer'
import { findServiceHandler } from '../services/serviceRegistry'
import { getUserData } from '../lib/auth'
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
  const [paperSize, setPaperSize] = useState<string>('A4')
  const [printQuality, setPrintQuality] = useState<'standard' | 'laser'>('standard')
  const [paperType, setPaperType] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Service Handler - منطق الخدمة المحددة
  const serviceHandler = findServiceHandler(serviceName, serviceId)
  
  // Debug: للتأكد من أن ServiceHandler يتم العثور عليه
  useEffect(() => {
    if (isOpen && serviceName) {
      console.log('🔍 OrderModal - Service Name:', serviceName, 'Service ID:', serviceId)
      console.log('🔍 OrderModal - Found Service Handler:', serviceHandler ? serviceHandler.name : 'NULL')
      if (serviceHandler) {
        console.log('✅ Using custom service handler:', serviceHandler.id)
      } else {
        console.log('⚠️ No custom service handler found, using default rendering')
      }
    }
  }, [isOpen, serviceName, serviceId, serviceHandler])

  // إذا كان force_color = true، نضبط printColor تلقائياً على 'color'
  useEffect(() => {
    if (workflowSteps.length > 0) {
      const printOptionsStep = workflowSteps.find((s: any) => s.step_type === 'print_options')
      if (printOptionsStep?.step_config?.force_color && printColor !== 'color') {
        setPrintColor('color')
      }
    }
  }, [workflowSteps, printColor])

  // Helper function to render step content based on step_type
  const renderStepContent = (currentStep: number) => {
    console.log('📋 renderStepContent called - Step:', currentStep, 'WorkflowSteps:', workflowSteps.length)
    
    if (workflowSteps.length === 0) {
      console.log('⚠️ No workflow steps, using default')
      // Fallback to default steps
      return renderDefaultStep(currentStep)
    }

    const workflowStep = workflowSteps.find(s => s.step_number === currentStep)
    if (!workflowStep) {
      console.log('⚠️ No workflow step found for step:', currentStep)
      return null
    }

    const stepConfig = workflowStep.step_config || {}
    const stepType = workflowStep.step_type
    
    console.log('📋 Found workflow step:', stepType, 'Config:', stepConfig)
    console.log('📋 ServiceHandler exists:', !!serviceHandler, 'Has renderStep:', !!(serviceHandler && serviceHandler.renderStep))

    // إذا كانت هناك خدمة مسجلة، استخدم منطقها الخاص
    if (serviceHandler && serviceHandler.renderStep) {
      console.log('✅ ServiceHandler and renderStep exist, proceeding...')
      const serviceData = {
        uploadedFiles,
        setUploadedFiles,
        quantity,
        setQuantity,
        totalPages,
        setTotalPages,
        isAnalyzingPages,
        setIsAnalyzingPages,
        paperSize,
        setPaperSize,
        printColor,
        setPrintColor,
        printQuality,
        setPrintQuality,
        printSides,
        setPrintSides,
        notes,
        setNotes,
        customerName,
        setCustomerName,
        customerWhatsApp,
        setCustomerWhatsApp,
        customerPhoneExtra,
        setCustomerPhoneExtra,
        shopName,
        setShopName,
        deliveryType,
        setDeliveryType: handleDeliveryTypeChange,
        deliveryAddress,
        setDeliveryAddress,
        addressConfirmed,
        setAddressConfirmed,
        fileInputRef,
        navigate
      }
      
      const handlers = {
        handleImageUpload,
        handleFileUpload: handleImageUpload  // استخدام handleImageUpload الذي يدعم PDF و Word
      }
      
      console.log('🎨 Calling serviceHandler.renderStep for:', serviceHandler.name, 'Step:', currentStep, 'Type:', stepType)
      
      const rendered = serviceHandler.renderStep(
        currentStep,
        stepType,
        { ...stepConfig, step_name_ar: workflowStep.step_name_ar, step_description_ar: workflowStep.step_description_ar },
        serviceData,
        handlers
      )
      
      console.log('🎨 ServiceHandler returned:', rendered !== null && rendered !== undefined ? 'JSX Element' : 'NULL/UNDEFINED')
      
      // إذا كانت الخدمة تعيد JSX element، استخدمه مباشرة
      if (rendered !== null && rendered !== undefined) {
        console.log('✅ Using custom service handler rendering')
        return rendered
      } else {
        console.log('⚠️ Service handler returned null/undefined, falling back to default rendering')
      }
    }

    // المنطق الافتراضي (للخدمات غير المسجلة)
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
                  accept={stepConfig.accept || ".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript"}
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
                    <p>اضغط لرفع {stepConfig.multiple ? 'الملفات' : 'الملف'}</p>
                    <small>
                      {stepConfig.accept?.includes('.ai') || stepConfig.accept?.includes('postscript') 
                        ? 'AI, PDF, PSD, PNG, JPG' 
                        : stepConfig.accept?.includes('.doc') 
                        ? 'PDF, Word' 
                        : 'PDF'}
                    </small>
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
                <label>
                  {stepConfig.field_labels?.length || stepConfig.field_labels?.length === 'الارتفاع' ? 'الارتفاع' : 'الطول'} 
                  {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}
                </label>
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
                <label>
                  {stepConfig.field_labels?.width || 'العرض'} 
                  {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}
                </label>
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
            {fields.includes('height') && !stepConfig.hide_height && (
              <div className="form-group">
                <label>
                  {stepConfig.field_labels?.height || 'الارتفاع'} 
                  {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}
                </label>
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
              <label>وحدة القياس {stepConfig.required ? <span className="required">*</span> : ''}</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="form-input" required={stepConfig.required}>
                <option value="cm">سم (cm)</option>
                <option value="mm">ملم (mm)</option>
                <option value="in">إنش (in)</option>
                <option value="m">متر (m)</option>
              </select>
            </div>
            {/* إخفاء عدد الصفحات ونوع الطباعة إذا كان hide_pages أو hide_print_type = true */}
            {!stepConfig.hide_pages && (
              <div className="form-group">
                <label>عدد الصفحات {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
                <input
                  type="number"
                  min="1"
                  value={numberOfPages}
                  onChange={(e) => setNumberOfPages(parseInt(e.target.value) || 1)}
                  className="form-input"
                  required={stepConfig.required}
                />
              </div>
            )}
            {!stepConfig.hide_print_type && (
              <div className="form-group">
                <label>نوع الطباعة</label>
                <select 
                  value={printColor} 
                  onChange={(e) => setPrintColor(e.target.value as 'bw' | 'color')} 
                  className="form-input"
                >
                  <option value="bw">أبيض</option>
                  <option value="color">ملون</option>
                </select>
              </div>
            )}
          </div>
        )

      case 'colors':
        return (
          <div className="modal-body">
            <h3>
              {workflowStep.step_name_ar}
              {!stepConfig.required && (
                <span className="optional" style={{ marginRight: '10px', fontSize: '0.9rem', fontWeight: 'normal' }}>
                  (اختياري)
                </span>
              )}
            </h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            {stepConfig.enable_image_color_analysis && uploadedFiles.length > 0 && (
              <ImageColorAnalyzer 
                files={uploadedFiles}
                onColorsExtracted={(colors) => {
                  // إضافة الألوان المستخرجة إلى الألوان المختارة
                  const newColors = [...selectedColors]
                  colors.forEach((color: string) => {
                    if (!newColors.includes(color) && newColors.length < (stepConfig.maxColors || 6)) {
                      newColors.push(color)
                    }
                  })
                  setSelectedColors(newColors)
                }}
              />
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
                      <span>{size === 'B5' || size === 'booklet' ? 'B5 (Booklet)' : size}</span>
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
            
            {/* نوع الطباعة - إذا كان force_color = true، لا نعرض خيار أبيض/ملون */}
            {!stepConfig.force_color && (
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
            )}
            
            {/* خيارات الجودة - للملون فقط أو إذا كان force_color = true */}
            {(printColor === 'color' || stepConfig.force_color) && stepConfig.quality_options && (
              <div className="form-group">
                <label>نوع الطباعة <span className="required">*</span></label>
                <div className="delivery-options">
                  {stepConfig.quality_options.standard && (
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="printQuality"
                        value="standard"
                        checked={printQuality === 'standard'}
                        onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'uv' | 'laser')}
                      />
                      <span>{stepConfig.quality_options.standard}</span>
                    </label>
                  )}
                  {stepConfig.quality_options.uv && (
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="printQuality"
                        value="uv"
                        checked={printQuality === 'uv'}
                        onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'uv' | 'laser')}
                      />
                      <span>{stepConfig.quality_options.uv}</span>
                    </label>
                  )}
                  {stepConfig.quality_options.laser && (
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="printQuality"
                        value="laser"
                        checked={printQuality === 'laser'}
                        onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'uv' | 'laser')}
                      />
                      <span>{stepConfig.quality_options.laser}</span>
                    </label>
                  )}
                  {stepConfig.quality_options.color && typeof stepConfig.quality_options.color === 'object' && (
                    <>
                      {stepConfig.quality_options.color.standard && (
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="printQuality"
                            value="standard"
                            checked={printQuality === 'standard'}
                            onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'uv' | 'laser')}
                          />
                          <span>{stepConfig.quality_options.color.standard}</span>
                        </label>
                      )}
                      {stepConfig.quality_options.color.laser && (
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="printQuality"
                            value="laser"
                            checked={printQuality === 'laser'}
                            onChange={(e) => setPrintQuality(e.target.value as 'standard' | 'uv' | 'laser')}
                          />
                          <span>{stepConfig.quality_options.color.laser}</span>
                        </label>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* نوع الورق - إذا كان show_paper_type = true */}
            {stepConfig.show_paper_type && stepConfig.paper_types && stepConfig.paper_types.length > 0 && (
              <div className="form-group">
                <label>نوع الورق <span className="required">*</span></label>
                <select 
                  value={paperType} 
                  onChange={(e) => setPaperType(e.target.value)} 
                  className="form-input"
                  required={stepConfig.required}
                >
                  <option value="">اختر نوع الورق</option>
                  {stepConfig.paper_types.map((type: any) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
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
            
            {/* إخفاء الأبعاد إذا كان hide_dimensions = true */}
            {!stepConfig.hide_dimensions && (
              <>
                <div className="form-group">
                  <label>الطول {stepConfig.required ? <span className="required">*</span> : ''}</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="form-input"
                      placeholder="0"
                      required={stepConfig.required}
                      style={{ flex: 1 }}
                    />
                    <select 
                      value={unit} 
                      onChange={(e) => setUnit(e.target.value)} 
                      className="form-input"
                      style={{ width: '80px' }}
                    >
                      <option value="cm">سم (cm)</option>
                      <option value="m">متر (m)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>العرض {stepConfig.required ? <span className="required">*</span> : ''}</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="form-input"
                      placeholder="0"
                      required={stepConfig.required}
                      style={{ flex: 1 }}
                    />
                    <select 
                      value={unit} 
                      onChange={(e) => setUnit(e.target.value)} 
                      className="form-input"
                      style={{ width: '80px' }}
                    >
                      <option value="cm">سم (cm)</option>
                      <option value="m">متر (m)</option>
                    </select>
                  </div>
                </div>
              </>
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
                <small className="form-hint">يمكن استخدام رقم آخر للتواصل عبر واتساب</small>
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
            
            {/* نوع الاستلام */}
            <div className="form-group">
              <label>نوع الاستلام <span className="required">*</span></label>
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
                    <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ تم حفظ الموقع</p>
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
                      customerPhoneExtra,
                      shopName,
                      deliveryType,
                      printColor,
                      printSides,
                      printQuality,
                      paperSize,
                      numberOfPages,
                      totalPages,
                      uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
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
              {/* عرض الأبعاد إذا كانت موجودة */}
              {(width || length || height) && (
                <div className="invoice-item">
                  <span>الأبعاد:</span>
                  <span>
                    {width && `${width} ${unit}`}
                    {width && (length || height) && ' × '}
                    {(length || height) && `${length || height} ${unit}`}
                  </span>
                </div>
              )}
              {/* عرض نوع الورق فقط إذا كان موجوداً (ليس A4 افتراضي) */}
              {paperSize && paperSize !== 'A4' && (
                <div className="invoice-item">
                  <span>نوع الورق:</span>
                  <span>{paperSize}</span>
                </div>
              )}
              {/* عرض نوع الورق المخصص (paperType) إذا كان موجوداً */}
              {paperType && (
                <div className="invoice-item">
                  <span>نوع الورق:</span>
                  <span>{paperType}</span>
                </div>
              )}
              <div className="invoice-item">
                <span>نوع الطباعة:</span>
                <span>{printColor === 'bw' ? 'أبيض وأسود' : 'ملون'}</span>
              </div>
              {printColor === 'color' && (
                <div className="invoice-item">
                  <span>جودة الطباعة:</span>
                  <span>
                    {printQuality === 'uv' ? 'دقة عالية (UV)' : 
                     printQuality === 'laser' ? 'دقة عالية (ليزرية)' : 
                     'طباعة عادية'}
                  </span>
                </div>
              )}
              {selectedColors.length > 0 && (
                <div className="invoice-item">
                  <span>الألوان المختارة:</span>
                  <span>{selectedColors.length} لون</span>
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
            <div style={{ marginTop: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px', color: '#1565c0' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                💬 سيتم التواصل معك عبر واتساب للوقت المستغرق لتنتهي الخدمة
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                يرجى حفظ رقم الطلب الذي سيظهر بعد تأكيد الطلب
              </p>
            </div>
          </div>
        )

      case 'notes':
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="form-group">
              <label>ملاحظات إضافية {stepConfig.required ? <span className="required">*</span> : <span className="optional">(اختياري)</span>}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                placeholder="أضف أي ملاحظات إضافية حول طلبك..."
                rows={5}
                required={stepConfig.required}
              />
            </div>
            {/* لا نعرض نوع العمل إذا كان hide_work_type = true */}
            {!stepConfig.hide_work_type && (
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
            )}
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
                  accept=".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript"
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
      console.log('🔄 loadWorkflow called - isOpen:', isOpen, 'serviceId:', serviceId, 'serviceName:', serviceName)
      
      // التحقق إذا كانت هذه خدمة "طباعة محاضرات" أو "طباعة فليكس"
      const isLecturePrinting = serviceName.includes('محاضرات') || serviceName.toLowerCase().includes('lecture')
      const isFlexPrinting = serviceName.includes('فليكس') || serviceName.toLowerCase().includes('flex')
      
      if (isOpen && serviceId) {
        try {
          setLoadingWorkflow(true)
          console.log('📡 Fetching workflow for serviceId:', serviceId)
          const response = await workflowsAPI.getServiceWorkflow(serviceId)
          console.log('📡 Workflow API response:', response.data)
          
          if (response.data.success && response.data.workflows && response.data.workflows.length > 0) {
            const sortedWorkflows = response.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
            console.log('✅ Loaded workflows:', sortedWorkflows.length, sortedWorkflows)
            setWorkflowSteps(sortedWorkflows)
            // Reset to first step
            setStep(1)
          } else {
            console.log('⚠️ No workflows found in response')
            
            // إذا كانت خدمة "طباعة محاضرات" أو "طباعة فليكس" ولم تكن المراحل موجودة، قم بإنشائها
            if (isLecturePrinting) {
              console.log('🔧 Setting up lecture printing service workflows...')
              try {
                const setupResponse = await workflowsAPI.setupLecturePrinting()
                console.log('🔧 Setup response:', setupResponse.data)
                
                if (setupResponse.data.success) {
                  // إعادة تحميل المراحل بعد الإعداد
                  const reloadResponse = await workflowsAPI.getServiceWorkflow(serviceId)
                  if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                    const sortedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                    console.log('✅ Loaded workflows after setup:', sortedWorkflows.length, sortedWorkflows)
                    setWorkflowSteps(sortedWorkflows)
                    setStep(1)
                    showSuccess('تم إعداد مراحل الخدمة بنجاح')
                  }
                }
              } catch (setupError) {
                console.error('❌ Error setting up workflows:', setupError)
                showError('فشل إعداد مراحل الخدمة')
              }
            } else if (isFlexPrinting) {
              console.log('🔧 Setting up flex printing service workflows...')
              try {
                const setupResponse = await api.post('/workflows/setup-flex-printing')
                console.log('🔧 Setup response:', setupResponse.data)
                
                if (setupResponse.data.success) {
                  // إعادة تحميل المراحل بعد الإعداد
                  const reloadResponse = await workflowsAPI.getServiceWorkflow(serviceId)
                  if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                    const sortedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                    console.log('✅ Loaded workflows after setup:', sortedWorkflows.length, sortedWorkflows)
                    setWorkflowSteps(sortedWorkflows)
                    setStep(1)
                    showSuccess('تم إعداد مراحل الخدمة بنجاح')
                  }
                }
              } catch (setupError) {
                console.error('❌ Error setting up workflows:', setupError)
                showError('فشل إعداد مراحل الخدمة')
              }
            } else {
              // Fallback to default steps if no workflow defined
              setWorkflowSteps([])
            }
          }
        } catch (error) {
          console.error('❌ Error loading workflow:', error)
          // Fallback to default steps
          setWorkflowSteps([])
        } finally {
          setLoadingWorkflow(false)
        }
      } else if (isOpen && !serviceId) {
        console.log('📡 No serviceId, trying to find service by name:', serviceName)
        // Try to get serviceId from serviceName
        try {
          const services = await servicesAPI.getAll()
          console.log('📡 All services:', services.data)
          const service = services.data.find((s: any) => s.name_ar === serviceName)
          console.log('📡 Found service:', service)
          
          if (service) {
            const response = await workflowsAPI.getServiceWorkflow(service.id)
            console.log('📡 Workflow API response (by name):', response.data)
            
            if (response.data.success && response.data.workflows && response.data.workflows.length > 0) {
              const sortedWorkflows = response.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
              console.log('✅ Loaded workflows (by name):', sortedWorkflows.length, sortedWorkflows)
              setWorkflowSteps(sortedWorkflows)
              setStep(1)
            } else {
              console.log('⚠️ No workflows found (by name)')
              
              // إذا كانت خدمة "طباعة محاضرات" أو "طباعة فليكس" ولم تكن المراحل موجودة، قم بإنشائها
              if (isLecturePrinting) {
                console.log('🔧 Setting up lecture printing service workflows...')
                try {
                  const setupResponse = await workflowsAPI.setupLecturePrinting()
                  console.log('🔧 Setup response:', setupResponse.data)
                  
                  if (setupResponse.data.success) {
                    // إعادة تحميل المراحل بعد الإعداد
                    const reloadResponse = await workflowsAPI.getServiceWorkflow(service.id)
                    if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                      const sortedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                      console.log('✅ Loaded workflows after setup:', sortedWorkflows.length, sortedWorkflows)
                      setWorkflowSteps(sortedWorkflows)
                      setStep(1)
                      showSuccess('تم إعداد مراحل الخدمة بنجاح')
                    }
                  }
                } catch (setupError) {
                  console.error('❌ Error setting up workflows:', setupError)
                  showError('فشل إعداد مراحل الخدمة')
                }
              } else {
                setWorkflowSteps([])
              }
            }
          } else {
            console.log('⚠️ Service not found by name')
            setWorkflowSteps([])
          }
        } catch (error) {
          console.error('❌ Error loading service or workflow:', error)
          setWorkflowSteps([])
        }
      }
    }
    loadWorkflow()
  }, [isOpen, serviceId, serviceName])

  // استيراد بيانات المستخدم عند فتح مرحلة معلومات العميل
  useEffect(() => {
    if (isOpen && workflowSteps.length > 0) {
      const customerInfoStep = workflowSteps.find((s: any) => s.step_type === 'customer_info')
      if (customerInfoStep && step === customerInfoStep.step_number) {
        const stepConfig = customerInfoStep.step_config || {}
        if (stepConfig.fields?.includes('load_from_account')) {
          const userData = getUserData()
          if (userData) {
            if (userData.name && !customerName) {
              setCustomerName(userData.name)
            }
            if (userData.phone && !customerWhatsApp) {
              setCustomerWhatsApp(userData.phone)
            }
          }
        }
      }
    }
  }, [step, workflowSteps, isOpen])

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
      // استخدام API لتحليل الملفات
      try {
        const response = await fileAnalysisAPI.analyzeFiles(files)
        if (response.data.success) {
          total = response.data.total_pages || 0
          console.log('File analysis result:', response.data)
        }
      } catch (apiError) {
        console.warn('API analysis failed, using fallback:', apiError)
        // Fallback: تحليل بسيط محلي
        for (const file of files) {
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
              const text = await file.text()
              const pageMatches = text.match(/\/Type[\s\/]*Page[^s]/g)
              if (pageMatches) {
                total += pageMatches.length
              } else {
                total += Math.max(1, Math.ceil(file.size / 75000))
              }
            } catch (e) {
              total += Math.max(1, Math.ceil(file.size / 75000))
            }
          } else if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
            // تقدير لملفات Word: كل ~50 سطر = صفحة
            total += Math.max(1, Math.ceil(file.size / 50000))
          }
        }
      }
      
      setTotalPages(total)
      setNumberOfPages(total)
      // لا نقوم بتغيير quantity تلقائياً - يبقى كما اختاره المستخدم
    } catch (error) {
      console.error('Error analyzing files:', error)
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
      
      // إذا كانت هناك خدمة مسجلة، استخدم منطقها الخاص
      if (serviceHandler) {
        const serviceData = {
          uploadedFiles,
          quantity,
          totalPages,
          paperSize,
          printColor,
          printQuality,
          printSides,
          notes
        }
        
        const calculatedPrice = await serviceHandler.calculatePrice(serviceData)
        setTotalPrice(calculatedPrice)
        
        if (calculatedPrice === 0) {
          showError('لم يتم العثور على قاعدة سعر مناسبة. يرجى التحقق من القواعد المالية.')
        }
        
        return calculatedPrice
      }
      
      // المنطق الافتراضي (للخدمات غير المسجلة)
      // تحديد نوع الحساب بناءً على اسم الخدمة والأبعاد
      let calcType: 'piece' | 'area' | 'page' = 'piece'
      let qty = Number(quantity) || 1
      
      // إذا كان اسم الخدمة يحتوي على "طباعة" أو "محاضرات"، استخدم حساب الصفحات
      if (serviceName.includes('طباعة') || serviceName.includes('محاضرات') || serviceName.includes('صفح')) {
        calcType = 'page'
        // حساب إجمالي الصفحات: عدد الصفحات × عدد النسخ
        const pagesPerCopy = totalPages > 0 ? totalPages : numberOfPages
        qty = pagesPerCopy * quantity
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
        specifications.paper_size = paperSize || 'A4'
        specifications.print_quality = printQuality || 'standard'
        specifications.number_of_pages = totalPages > 0 ? totalPages : numberOfPages
        specifications.total_pages = qty
        specifications.files_count = uploadedFiles.length
      }
      
      // حساب السعر باستخدام API - يجب أن يأتي من القواعد المالية فقط
      try {
        const response = await pricingAPI.calculatePrice({
          calculation_type: calcType,
          quantity: qty,
          specifications: specifications,
        })
        
        if (response.data.success && response.data.total_price !== undefined) {
          const calculatedPrice = response.data.total_price || 0
          setTotalPrice(calculatedPrice)
          setPricingRule(response.data)
          
          // إذا كان السعر 0، يعني لم يتم العثور على قاعدة سعر
          if (calculatedPrice === 0) {
            console.warn('No pricing rule matched - price is 0')
            showError('لم يتم العثور على قاعدة سعر مناسبة. يرجى التحقق من القواعد المالية.')
          }
          
          return calculatedPrice
        } else {
          // إذا لم تنجح العملية، السعر = 0
          console.warn('Price calculation failed:', response.data)
          setTotalPrice(0)
          setPricingRule(null)
          showError(response.data?.message || 'لم يتم العثور على قاعدة سعر مناسبة')
          return 0
        }
      } catch (apiError: any) {
        console.error('Error calculating price from API:', apiError)
        // في حالة الخطأ، السعر = 0
        setTotalPrice(0)
        setPricingRule(null)
        
        // عرض رسالة خطأ للمستخدم
        const errorMessage = apiError.response?.data?.message || apiError.message || 'خطأ في حساب السعر'
        showError(errorMessage)
        return 0
      }
      
    } catch (error) {
      console.error('Error calculating price:', error)
      // لا نستخدم حساب يدوي - السعر يجب أن يأتي من القواعد المالية فقط
      setTotalPrice(0)
      setPricingRule(null)
      showError('خطأ في حساب السعر. يرجى التحقق من القواعد المالية.')
      return 0
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
    
    // Validation checks before try block
      const safeQuantity = Number(quantity) || 1
      let safeTotalPrice = Number(totalPrice)
      
      // إذا كان السعر 0 أو غير محسوب، نحسبه من القواعد المالية
      if (!safeTotalPrice || safeTotalPrice === 0) {
      try {
        safeTotalPrice = await calculatePrice() || 0
      } catch (calcError) {
        console.error('Error calculating price:', calcError)
        safeTotalPrice = 0
      }
      }
      
      // التحقق من أن السعر صحيح من القواعد المالية
      if (!safeTotalPrice || safeTotalPrice === 0) {
        showError('لا يمكن إنشاء الطلب: السعر = 0. يرجى إضافة قاعدة سعر مناسبة في القواعد المالية.')
        setIsSubmitting(false)
        return
      }
      
      const unitPrice = safeTotalPrice / safeQuantity
      
      // التأكد من أن unitPrice ليس NaN
      if (isNaN(unitPrice) || unitPrice <= 0) {
        showError('خطأ في حساب السعر. يرجى التحقق من القواعد المالية والكمية.')
        setIsSubmitting(false)
        return
    }
    
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
      // تحضير البيانات الأساسية
      const baseOrderData = {
        customer_name: customerName,
        customer_phone: customerWhatsApp,
        customer_whatsapp: customerPhoneExtra || customerWhatsApp,
        shop_name: shopName || null,
        service_name: serviceName,
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
      
      // إذا كانت هناك خدمة مسجلة، استخدم منطقها الخاص لتحضير البيانات
      let orderData: any
      if (serviceHandler) {
        const serviceData = {
          uploadedFiles,
          quantity: safeQuantity,
          totalPages,
          paperSize,
          printColor,
          printQuality,
          printSides,
          notes,
          length,
          width,
          height,
          unit,
          selectedColors,
          workType
        }
        
        orderData = serviceHandler.prepareOrderData(serviceData, baseOrderData)
        // التأكد من أن items موجودة
        if (!orderData.items) {
          orderData.items = [{
            service_name: serviceName,
            quantity: safeQuantity,
            unit_price: unitPrice,
            total_price: safeTotalPrice,
            specifications: serviceHandler.getSpecifications(serviceData),
            design_files: uploadedFiles || []
          }]
        }
      } else {
        // المنطق الافتراضي
        orderData = {
          ...baseOrderData,
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

