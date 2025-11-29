import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { X, FileText, User, MapPin, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI, workflowsAPI, servicesAPI, fileAnalysisAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import ColorPicker from './ColorPicker'
import { findServiceHandler } from '../services/serviceRegistry'
import { getUserData, isAdmin, isEmployee } from '../lib/auth'
import './OrderModal.css'

type PrintQuality = 'standard' | 'laser' | 'uv'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  serviceId?: number
}

const CLOTHING_DESIGN_LABELS: Record<string, string> = {
  logo: 'الشعار',
  front: 'الجهة الأمامية',
  back: 'الجهة الخلفية',
  shoulder_right: 'الكتف الأيمن',
  shoulder_left: 'الكتف الأيسر',
}

type SerializedDesignFile = {
  file_key: string
  filename: string
  url: string
  download_url: string
  raw_path: string
  data_url: string
  mime_type?: string
  size_in_bytes?: number
  location?: string
  source?: string
}

const getFileSignature = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const serializeFile = async (file: File): Promise<SerializedDesignFile> => {
  const dataUrl = await fileToDataUrl(file)
  const key = getFileSignature(file)
  return {
    file_key: key,
    filename: file.name,
    url: dataUrl,
    download_url: dataUrl,
    raw_path: dataUrl,
    data_url: dataUrl,
    mime_type: file.type || undefined,
    size_in_bytes: file.size,
  }
}

const isFileObject = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

export default function OrderModal({ isOpen, onClose, serviceName, serviceId }: OrderModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [loadingWorkflow, setLoadingWorkflow] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isAnalyzingPages, setIsAnalyzingPages] = useState(false)
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [widthUnit, setWidthUnit] = useState('cm')
  const [heightUnit, setHeightUnit] = useState('cm')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [autoExtractedColors, setAutoExtractedColors] = useState<string[]>([]) // الألوان المستخرجة تلقائياً من الصورة
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [clothingSource, setClothingSource] = useState<'customer' | 'store'>('customer')
  const [clothingProduct, setClothingProduct] = useState<string>('hoodie')
  const [clothingColor, setClothingColor] = useState<string>('أبيض')
  const [clothingSize, setClothingSize] = useState<string>('M')
  const [clothingDesigns, setClothingDesigns] = useState<Record<string, File | null>>({
    logo: null,
    front: null,
    back: null,
    shoulder_right: null,
    shoulder_left: null,
  })
  const [customerName, setCustomerName] = useState('')
  const [customerWhatsApp, setCustomerWhatsApp] = useState('')
  const [customerPhoneExtra, setCustomerPhoneExtra] = useState('')
  const [shopName, setShopName] = useState('')
  const [deliveryType, setDeliveryType] = useState('self')
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasRestoredState = useRef(false)
  const addressToastShown = useRef(false)
  const [successInfo, setSuccessInfo] = useState<{ orderNumber: string } | null>(null)
  const hasPrefilledCustomer = useRef(false)
  
  // Print options states (no pricing)
  const [printColor, setPrintColor] = useState<'bw' | 'color'>('bw')
  const [printSides, setPrintSides] = useState<'single' | 'double'>('single')
  const [numberOfPages, setNumberOfPages] = useState<number>(1)
  const [paperSize, setPaperSize] = useState<string>('A4')
  const [printQuality, setPrintQuality] = useState<PrintQuality>('standard')
  const [paperType, setPaperType] = useState<string>('')
  const [lamination, setLamination] = useState<boolean>(false)  // خيار التسليك
  const [flexType, setFlexType] = useState<'normal' | 'lighted'>('normal')  // نوع الفليكس (عادي/مضاء)
  const [rollupSource, setRollupSource] = useState<'ours' | 'yours'>('ours')  // Roll up من عندنا/من عندك
  const [printTypeChoice, setPrintTypeChoice] = useState<'flex' | 'pvc'>('flex')  // نوع الطباعة (فليكس/PVC)

  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Service Handler - منطق الخدمة المحددة
  const serviceHandler = findServiceHandler(serviceName, serviceId)
  const canAccessCustomerProfile = isAdmin() || isEmployee()

  const normalizedServiceName = serviceName ? serviceName.toLowerCase() : ''
  const isLecturePrinting = normalizedServiceName.includes('محاضرات') || normalizedServiceName.includes('lecture')
  const isFlexPrinting = normalizedServiceName.includes('فليكس') || normalizedServiceName.includes('flex')
  const isPosterPrinting = normalizedServiceName.includes('بوستر') || normalizedServiceName.includes('poster')
  const isBannerPrinting = normalizedServiceName.includes('بانر') || normalizedServiceName.includes('banner')

  const defaultSteps = useMemo(() => {
    if (isLecturePrinting || isFlexPrinting) {
      return [1, 2, 3, 4]
    }
    return [1, 2, 3, 4, 5]
  }, [isLecturePrinting, isFlexPrinting])

  useEffect(() => {
    const maxStep = workflowSteps.length > 0 ? workflowSteps.length : defaultSteps.length
    if (step > maxStep) {
      setStep(maxStep)
    }
  }, [step, workflowSteps, defaultSteps])

  const formatPaperType = (type: string) => {
    switch (type) {
      case 'normal':
        return 'ورق عادي'
      case 'photo':
        return 'ورق PHOTO'
      case 'tracing':
        return 'ورق كالك'
      case 'bond':
        return 'ورق بوند'
      case 'vellum':
        return 'ورق فيلوم'
      case 'perforated':
        return 'فينيل مثقب'
      default:
        return type
    }
  }

  // دالة للحصول على مفتاح الكاش الخاص بكل خدمة
  const getCacheKey = (serviceName: string) => `orderFormState_${serviceName.replace(/\s+/g, '_')}`
  
  // دالة للتحقق من صلاحية الكاش (10 دقائق)
  const isCacheValid = (cacheTimestamp: number): boolean => {
    const CACHE_DURATION = 10 * 60 * 1000 // 10 دقائق بالميلي ثانية
    const now = Date.now()
    return (now - cacheTimestamp) < CACHE_DURATION
  }

  // دالة لمسح الكاش القديم
  const clearExpiredCache = (serviceName?: string) => {
    try {
      if (serviceName) {
        // مسح كاش خدمة محددة
        const cacheKey = getCacheKey(serviceName)
        const savedState = localStorage.getItem(cacheKey)
        if (savedState) {
          const parsed = JSON.parse(savedState)
          if (parsed.timestamp && !isCacheValid(parsed.timestamp)) {
            console.log(`🧹 Clearing expired cache for service: ${serviceName}`)
            localStorage.removeItem(cacheKey)
            return true
          }
        }
      } else {
        // مسح جميع الكاشات المنتهية الصلاحية
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('orderFormState_')) {
            try {
              const savedState = localStorage.getItem(key)
              if (savedState) {
                const parsed = JSON.parse(savedState)
                if (parsed.timestamp && !isCacheValid(parsed.timestamp)) {
                  console.log(`🧹 Clearing expired cache: ${key}`)
                  localStorage.removeItem(key)
                }
              }
            } catch (e) {
              // تجاهل الأخطاء
            }
          }
        })
      }
    } catch (error) {
      console.warn('⚠️ Error checking cache validity:', error)
    }
    return false
  }

  const applyWorkflowSteps = (steps: any[], currentServiceName: string) => {
    // تصفية المراحل لخدمة الفليكس - حذف print_options و colors
    let filteredSteps = steps
    if (isFlexPrinting) {
      filteredSteps = steps.filter((step: any) => 
        step.step_type !== 'print_options' && step.step_type !== 'colors'
      )
      // إعادة ترقيم المراحل بعد الحذف
      filteredSteps = filteredSteps.map((step: any, index: number) => ({
        ...step,
        step_number: index + 1
      }))
      console.log('✅ Filtered flex printing steps - removed print_options and colors')
      console.log('📋 Original steps count:', steps.length, 'Filtered:', filteredSteps.length)
    }
    setWorkflowSteps(filteredSteps)
    let savedStep: number | null = null

    try {
      // مسح الكاش القديم أولاً
      clearExpiredCache(currentServiceName)
      
      const cacheKey = getCacheKey(currentServiceName)
      const savedState = localStorage.getItem(cacheKey)
      if (savedState) {
        const parsed = JSON.parse(savedState)
        
        // التحقق من أن الكاش صالح وأنه لنفس الخدمة
        if (parsed.serviceName === currentServiceName && 
            typeof parsed.step === 'number' &&
            parsed.timestamp && 
            isCacheValid(parsed.timestamp)) {
          savedStep = parsed.step
          console.log('✅ Valid cache found for step:', savedStep)
        } else {
          // إذا كان الكاش قديم أو لخدمة مختلفة، نمسحه
          if (parsed.serviceName !== currentServiceName) {
            console.log('🧹 Clearing cache for different service')
            localStorage.removeItem(cacheKey)
          } else if (!parsed.timestamp || !isCacheValid(parsed.timestamp)) {
            console.log('🧹 Clearing expired cache')
            localStorage.removeItem(cacheKey)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Unable to parse saved form state step:', error)
      // في حالة الخطأ، نمسح الكاش
      const cacheKey = getCacheKey(currentServiceName)
      localStorage.removeItem(cacheKey)
    }

    if (savedStep && !Number.isNaN(savedStep)) {
      const safeStep = Math.min(Math.max(savedStep, 1), steps.length || 1)
      setStep(safeStep)
    } else if (!hasRestoredState.current) {
      setStep(1)
    } else {
      setStep(prev => Math.min(prev, steps.length || prev))
    }
  }
  
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
  // وتهيئة paperSize من stepConfig
  useEffect(() => {
    if (workflowSteps.length > 0) {
      const printOptionsStep = workflowSteps.find((s: any) => s.step_type === 'print_options')
      if (printOptionsStep?.step_config) {
        const stepConfig = printOptionsStep.step_config
        // تهيئة printColor - التحقق من force_color بشكل أفضل
        const isForceColor = stepConfig.force_color === true || stepConfig.force_color === 'true' || stepConfig.force_color === 1
        if (isForceColor && printColor !== 'color') {
          console.log('✅ Setting printColor to color because force_color = true')
          setPrintColor('color')
        }
        // تهيئة paperSize من stepConfig
        if (stepConfig.paper_size && !paperSize) {
          setPaperSize(stepConfig.paper_size)
        } else if (stepConfig.paper_sizes && stepConfig.paper_sizes.length > 0 && !paperSize) {
          setPaperSize(stepConfig.paper_sizes[0])
        }
        // تهيئة printQuality إذا كان force_color = true و quality_options موجودة
        // نتحقق من أن quality_options لها خصائص وليس object فارغ
        if (isForceColor && stepConfig.quality_options && typeof stepConfig.quality_options === 'object') {
          const hasQualityOptions = Object.keys(stepConfig.quality_options).length > 0
          if (hasQualityOptions) {
            // نتحقق من أن printQuality الحالي ليس أحد الخيارات المتاحة
            const availableQualities = Object.keys(stepConfig.quality_options)
            const currentQualityValid = availableQualities.includes(printQuality)
            
            if (!currentQualityValid) {
              console.log('✅ Setting printQuality because force_color = true and quality_options exist, current quality is not valid')
              // نختار أول خيار متاح كقيمة افتراضية
              if (stepConfig.quality_options.standard) {
                setPrintQuality('standard')
              } else if (stepConfig.quality_options.laser) {
                setPrintQuality('laser')
              } else if (stepConfig.quality_options.uv) {
                setPrintQuality('uv')
              } else if (availableQualities.length > 0) {
                // إذا لم يكن أي من الخيارات المذكورة، نستخدم أول خيار متاح
                setPrintQuality(availableQualities[0] as PrintQuality)
              }
            } else {
              // إذا كانت القيمة الحالية صالحة، نتأكد من أنها معينة (للتأكد من العرض)
              console.log('✅ printQuality is already valid:', printQuality)
            }
          } else {
            console.log('⚠️ quality_options is empty object')
          }
        } else if (isForceColor) {
          console.log('⚠️ force_color is true but quality_options is missing or invalid:', stepConfig.quality_options)
        }
      }
    }
  }, [workflowSteps, printColor, paperSize])

  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(image)
    setImagePreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [image])

  useEffect(() => {
    if (!isOpen) {
      setClothingSource('customer')
      setClothingProduct('hoodie')
      setClothingColor('أبيض')
      setClothingSize('M')
      setClothingDesigns({
        logo: null,
        front: null,
        back: null,
        shoulder_right: null,
        shoulder_left: null,
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      hasPrefilledCustomer.current = false
      return
    }

    if (hasPrefilledCustomer.current) return

    const user = getUserData()
    if (user) {
      if (user.name && !customerName) {
        setCustomerName(user.name)
      }
      if (user.phone && !customerWhatsApp) {
        setCustomerWhatsApp(user.phone)
      }
    }

    hasPrefilledCustomer.current = true
  }, [isOpen, customerName, customerWhatsApp])

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
        clothingSource,
        setClothingSource,
        clothingProduct,
        setClothingProduct,
        clothingColor,
        setClothingColor,
        clothingSize,
        setClothingSize,
        clothingDesigns,
        setClothingDesigns,
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
        navigate,
        selectedColors, setSelectedColors,
        autoExtractedColors, setAutoExtractedColors,
        step // إضافة step إلى serviceData
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
                  multiple={true}
                />
                {uploadedFiles.length > 0 ? (
                  <div className="uploaded-files-list">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="uploaded-file-item">
                        <FileText size={20} />
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile(idx)
                          }}
                          title="حذف الملف"
                        >
                          <X size={16} />
                        </button>
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
                    {/* زر رفع ملف إضافي */}
                    <button
                      type="button"
                      className="add-more-files-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                      style={{
                        marginTop: '12px',
                        padding: '10px 16px',
                        background: '#f0f9ff',
                        border: '2px dashed #3b82f6',
                        borderRadius: '8px',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dbeafe'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0f9ff'
                      }}
                    >
                      <span>+</span>
                      <span>رفع ملف إضافي</span>
                    </button>
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
        // فقط العرض والارتفاع - لا نعرض الطول
        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
              <div className="form-group">
                <label>
                  {stepConfig.field_labels?.width || 'العرض'} 
                {stepConfig.required ? <span className="required">*</span> : ''}
                </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                  value={widthUnit} 
                  onChange={(e) => setWidthUnit(e.target.value)} 
                  className="form-input"
                  style={{ width: '100px' }}
                >
                  <option value="cm">سم (cm)</option>
                  <option value="mm">ملم (mm)</option>
                  <option value="in">إنش (in)</option>
                  <option value="m">متر (m)</option>
                </select>
              </div>
            </div>
              <div className="form-group">
                <label>
                  {stepConfig.field_labels?.height || 'الارتفاع'} 
                {stepConfig.required ? <span className="required">*</span> : ''}
                </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="form-input"
                  placeholder="0"
                  required={stepConfig.required}
                  style={{ flex: 1 }}
                />
                <select 
                  value={heightUnit} 
                  onChange={(e) => setHeightUnit(e.target.value)} 
                  className="form-input"
                  style={{ width: '100px' }}
                >
                <option value="cm">سم (cm)</option>
                <option value="mm">ملم (mm)</option>
                <option value="in">إنش (in)</option>
                <option value="m">متر (m)</option>
              </select>
              </div>
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
            {/* عرض الألوان المستخرجة تلقائياً من الصورة المرفوعة في المرحلة الأولى */}
            {autoExtractedColors.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 600, color: '#0369a1' }}>
                  الألوان المستخرجة من الصورة المرفوعة:
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {autoExtractedColors.map((color, index) => (
                    <div
                      key={index}
                      style={{
                        width: '50px',
                        height: '50px',
                        backgroundColor: color,
                        borderRadius: '8px',
                        border: selectedColors.includes(color) ? '3px solid #10b981' : '2px solid #e5e7eb',
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={color}
                      onClick={() => {
                        if (selectedColors.includes(color)) {
                          setSelectedColors(selectedColors.filter(c => c !== color))
                        } else {
                          if (selectedColors.length < (stepConfig.maxColors || 6)) {
                            setSelectedColors([...selectedColors, color])
                          }
                        }
                      }}
                    >
                      {selectedColors.includes(color) && (
                        <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  اضغط على أي لون لإضافته أو إزالته من الألوان المختارة
                </p>
              </div>
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
        // Debug: التحقق من stepConfig
        console.log('🔍 Print Options Step - stepConfig:', JSON.stringify(stepConfig, null, 2))
        console.log('🔍 Print Options Step - force_color:', stepConfig?.force_color, 'Type:', typeof stepConfig?.force_color)
        console.log('🔍 Print Options Step - quality_options:', stepConfig?.quality_options)
        console.log('🔍 Print Options Step - printColor:', printColor)
        console.log('🔍 Print Options Step - printQuality:', printQuality)
        
        // التحقق من شروط عرض خيارات الدقة
        // force_color قد يكون boolean true أو string "true" أو undefined
        const isForceColor = stepConfig?.force_color === true || stepConfig?.force_color === 'true' || stepConfig?.force_color === 1
        // التحقق من أن quality_options موجودة ولها خصائص (ليست object فارغ)
        const hasQualityOptions = stepConfig?.quality_options && 
                                  typeof stepConfig.quality_options === 'object' && 
                                  Object.keys(stepConfig.quality_options).length > 0
        // عرض خيارات الدقة إذا كان force_color = true أو printColor = 'color' و quality_options موجودة
        const shouldShowQualityOptions = (isForceColor || printColor === 'color') && hasQualityOptions
        
        console.log('🔍 Print Options Step - isForceColor:', isForceColor)
        console.log('🔍 Print Options Step - hasQualityOptions:', hasQualityOptions, 'Keys:', stepConfig?.quality_options ? Object.keys(stepConfig.quality_options) : [])
        console.log('🔍 Print Options Step - shouldShowQualityOptions:', shouldShowQualityOptions)
        
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
                      <span>{size === 'B5' || size === 'booklet' ? 'B5 (Booklet)' : size === 'custom' ? 'قياس آخر' : size}</span>
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
            
            {/* نوع الورق - إذا كان show_paper_type = true */}
            {stepConfig.show_paper_type && stepConfig.paper_types && stepConfig.paper_types.length > 0 && (
              <div className="form-group">
                <label>نوع الورق <span className="required">*</span></label>
                <select
                  value={paperType || ''}
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
            
            {/* خيارات الدقة - للملون فقط أو إذا كان force_color = true */}
            {/* تحسين الشرط: عرض خيارات الدقة إذا كان force_color = true أو printColor = 'color' */}
            {/* إصلاح: نعرض خيارات الدقة دائماً عندما تكون موجودة و force_color = true */}
            {(() => {
              // التحقق مرة أخرى من stepConfig مباشرة (للتأكد من الحصول على أحدث قيمة)
              const currentStepConfig = workflowSteps.find((s: any) => s.step_type === 'print_options')?.step_config
              const currentIsForceColor = currentStepConfig?.force_color === true || currentStepConfig?.force_color === 'true' || currentStepConfig?.force_color === 1
              const currentHasQualityOptions = currentStepConfig?.quality_options && 
                                              typeof currentStepConfig.quality_options === 'object' && 
                                              Object.keys(currentStepConfig.quality_options).length > 0
              const shouldShow = (currentIsForceColor || printColor === 'color') && currentHasQualityOptions
              
              console.log('🔍 Rendering quality options - currentIsForceColor:', currentIsForceColor, 'currentHasQualityOptions:', currentHasQualityOptions, 'shouldShow:', shouldShow)
              console.log('🔍 quality_options keys:', currentStepConfig?.quality_options ? Object.keys(currentStepConfig.quality_options) : [])
              
              if (!shouldShow) {
                return null
              }
              
              const qualityOpts = currentStepConfig?.quality_options || stepConfig.quality_options
              
              return (
                <div className="form-group">
                  <label>نوع الدقة <span className="required">*</span></label>
                  <div className="delivery-options">
                    {/* عرض خيار standard إذا كان موجوداً */}
                    {qualityOpts.standard && (
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printQuality"
                          value="standard"
                          checked={printQuality === 'standard'}
                          onChange={(e) => setPrintQuality(e.target.value as PrintQuality)}
                        />
                        <span>{qualityOpts.standard}</span>
                      </label>
                    )}
                    {/* عرض خيار uv إذا كان موجوداً */}
                    {qualityOpts.uv && (
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printQuality"
                          value="uv"
                          checked={printQuality === 'uv'}
                          onChange={(e) => setPrintQuality(e.target.value as PrintQuality)}
                        />
                        <span>{qualityOpts.uv}</span>
                      </label>
                    )}
                    {/* عرض خيار laser إذا كان موجوداً */}
                    {qualityOpts.laser && (
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="printQuality"
                          value="laser"
                          checked={printQuality === 'laser'}
                          onChange={(e) => setPrintQuality(e.target.value as PrintQuality)}
                        />
                        <span>{qualityOpts.laser}</span>
                      </label>
                    )}
                    {/* دعم structure متداخل (quality_options.color.standard, etc.) */}
                    {qualityOpts.color && typeof qualityOpts.color === 'object' && (
                      <>
                        {qualityOpts.color.standard && (
                          <label className="radio-option">
                            <input
                              type="radio"
                              name="printQuality"
                              value="standard"
                              checked={printQuality === 'standard'}
                              onChange={(e) => setPrintQuality(e.target.value as PrintQuality)}
                            />
                            <span>{qualityOpts.color.standard}</span>
                          </label>
                        )}
                        {qualityOpts.color.laser && (
                          <label className="radio-option">
                            <input
                              type="radio"
                              name="printQuality"
                              value="laser"
                              checked={printQuality === 'laser'}
                              onChange={(e) => setPrintQuality(e.target.value as PrintQuality)}
                            />
                            <span>{qualityOpts.color.laser}</span>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
            
            {/* نوع الفينيل - إذا كان show_vinyl_type = true */}
            {stepConfig.show_vinyl_type && stepConfig.vinyl_types && stepConfig.vinyl_types.length > 0 && (
              <div className="form-group">
                <label>نوع الفينيل <span className="required">*</span></label>
                <select 
                  value={paperType} 
                  onChange={(e) => setPaperType(e.target.value)} 
                  className="form-input"
                  required={stepConfig.required}
                >
                  <option value="">اختر نوع الفينيل</option>
                  {stepConfig.vinyl_types.map((type: any) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* ملاحظات إضافية - إذا كان show_notes_in_print_options = true */}
            {stepConfig.show_notes_in_print_options && (
              <div className="form-group">
                <label>ملاحظات إضافية <span className="optional">(اختياري)</span></label>
                <textarea
                  value={notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  placeholder="أضف أي ملاحظات إضافية حول طلبك..."
                  rows={5}
                />
              </div>
            )}
            
            {/* عدد الوجوه - إخفاء إذا كان hide_print_sides = true */}
            {(() => {
              // التحقق مرة أخرى من stepConfig مباشرة (للتأكد من الحصول على أحدث قيمة)
              const currentStepConfig = workflowSteps.find((s: any) => s.step_type === 'print_options')?.step_config
              const shouldHidePrintSides = currentStepConfig?.hide_print_sides === true || 
                                           currentStepConfig?.hide_print_sides === 'true' || 
                                           currentStepConfig?.hide_print_sides === 1 ||
                                           stepConfig?.hide_print_sides === true ||
                                           stepConfig?.hide_print_sides === 'true' ||
                                           stepConfig?.hide_print_sides === 1
              
              if (shouldHidePrintSides) {
                return null
              }
              
              // إذا كان show_print_sides = true و print_sides_options موجودة، استخدمها
              const shouldShowPrintSides = stepConfig.show_print_sides === true || stepConfig.show_print_sides === 'true' || stepConfig.show_print_sides === 1
              const printSidesOptions = stepConfig.print_sides_options
              
              return (
                <div className="form-group">
                  <label>عدد الوجوه <span className="required">*</span></label>
                  <div className="delivery-options">
                    {shouldShowPrintSides && printSidesOptions ? (
                      // استخدام print_sides_options المخصصة
                      Object.entries(printSidesOptions).map(([value, label]: [string, any]) => (
                        <label key={value} className="radio-option">
                          <input
                            type="radio"
                            name="printSides"
                            value={value}
                            checked={printSides === value}
                            onChange={(e) => setPrintSides(e.target.value as 'single' | 'double')}
                          />
                          <span>{label}</span>
                        </label>
                      ))
                    ) : (
                      // الخيارات الافتراضية
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
            
            {/* خيار التسليك - إذا كان show_lamination = true */}
            {stepConfig.show_lamination && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={lamination}
                    onChange={(e) => setLamination(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span>تسليك (Lamination)</span>
                </label>
              </div>
            )}
            
            {/* نوع الفليكس - إذا كان show_flex_type = true */}
            {stepConfig.show_flex_type && stepConfig.flex_types && (
              <div className="form-group">
                <label>نوع الفليكس <span className="required">*</span></label>
                <div className="delivery-options">
                  {Object.entries(stepConfig.flex_types).map(([value, label]: [string, any]) => (
                    <label key={value} className="radio-option">
                      <input
                        type="radio"
                        name="flexType"
                        value={value}
                        checked={flexType === value}
                        onChange={(e) => setFlexType(e.target.value as 'normal' | 'lighted')}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* نوع الطباعة (فليكس/PVC) - إذا كان show_print_type_choice = true */}
            {stepConfig.show_print_type_choice && stepConfig.print_type_options && (
              <div className="form-group">
                <label>نوع الطباعة <span className="required">*</span></label>
                <div className="delivery-options">
                  {Object.entries(stepConfig.print_type_options).map(([value, label]: [string, any]) => (
                    <label key={value} className="radio-option">
                      <input
                        type="radio"
                        name="printTypeChoice"
                        value={value}
                        checked={printTypeChoice === value}
                        onChange={(e) => setPrintTypeChoice(e.target.value as 'flex' | 'pvc')}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* Roll up source - إذا كان show_rollup_source = true */}
            {stepConfig.show_rollup_source && stepConfig.rollup_source_options && (
              <div className="form-group">
                <label>هل ال Roll up من عندنا أم من عندك؟ <span className="required">*</span></label>
                <div className="delivery-options">
                  {Object.entries(stepConfig.rollup_source_options).map(([value, label]: [string, any]) => (
                    <label key={value} className="radio-option">
                      <input
                        type="radio"
                        name="rollupSource"
                        value={value}
                        checked={rollupSource === value}
                        onChange={(e) => setRollupSource(e.target.value as 'ours' | 'yours')}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* إخفاء الأبعاد إذا كان hide_dimensions = true أو إذا كان القياس ليس "custom" */}
            {/* فقط العرض والارتفاع - لا نعرض الطول */}
            {/* إظهار الأبعاد عند اختيار custom أو إذا كان show_custom_dimensions = true */}
            {(!stepConfig.hide_dimensions && (paperSize === 'custom' || stepConfig.show_custom_dimensions) || (!stepConfig.paper_sizes && !stepConfig.paper_size)) && (
              <>
                <div className="form-group">
                  <label>العرض {stepConfig.required ? <span className="required">*</span> : ''}</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                      value={widthUnit} 
                      onChange={(e) => setWidthUnit(e.target.value)} 
                      className="form-input"
                      style={{ width: '100px' }}
                    >
                      <option value="cm">سم (cm)</option>
                      <option value="mm">ملم (mm)</option>
                      <option value="in">إنش (in)</option>
                      <option value="m">متر (m)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>الارتفاع {stepConfig.required ? <span className="required">*</span> : ''}</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="form-input"
                      placeholder="0"
                      required={stepConfig.required}
                      style={{ flex: 1 }}
                    />
                    <select 
                      value={heightUnit} 
                      onChange={(e) => setHeightUnit(e.target.value)} 
                      className="form-input"
                      style={{ width: '100px' }}
                    >
                      <option value="cm">سم (cm)</option>
                      <option value="mm">ملم (mm)</option>
                      <option value="in">إنش (in)</option>
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
              <label>
                رقم واتساب 
                {stepConfig.fields?.includes('whatsapp_optional') 
                  ? <span className="optional">(اختياري)</span>
                  : stepConfig.required ? <span className="required">*</span> : ''
                }
              </label>
              <input
                type="tel"
                value={customerWhatsApp}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9+]/g, '')
                  setCustomerWhatsApp(value)
                }}
                className="form-input"
                placeholder="09xxxxxxxx"
                required={!stepConfig.fields?.includes('whatsapp_optional') && stepConfig.required}
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
                    const cacheKey = getCacheKey(serviceName)
                    localStorage.setItem(cacheKey, JSON.stringify({
                      step: step, // حفظ المرحلة الحالية
                      quantity,
                      length,
                      width,
                      height,
                      widthUnit,
                      heightUnit,
                      selectedColors,
                      autoExtractedColors,
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
                      paperType,
                      lamination,
                      flexType,
                      printTypeChoice,
                      rollupSource,
                      serviceName,
                      timestamp: Date.now(), // إضافة timestamp للتحقق من الصلاحية
                      uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                      clothingSource,
                      clothingProduct,
                      clothingColor
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
                    const cacheKey = getCacheKey(serviceName)
                    localStorage.setItem(cacheKey, JSON.stringify({
                      step: step, // حفظ المرحلة الحالية
                      quantity,
                      length,
                      width,
                      height,
                      widthUnit,
                      heightUnit,
                      selectedColors,
                      autoExtractedColors,
                      workType,
                      notes,
                      customerName,
                      customerWhatsApp,
                      customerPhoneExtra,
                      shopName,
                      deliveryType,
                      printColor,
                      printQuality,
                      printSides,
                      paperSize,
                      numberOfPages,
                      totalPages,
                      paperType,
                      serviceName,
                      timestamp: Date.now(), // إضافة timestamp للتحقق من الصلاحية
                      uploadedFiles: uploadedFiles.map(f => ({ 
                        name: f.name, 
                        size: f.size, 
                        type: f.type 
                      })),
                      clothingSource,
                      clothingProduct,
                      clothingColor
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

      case 'invoice': {
        const totalPagesValue = totalPages || numberOfPages || 0
        const clothingDesignEntries = Object.entries(clothingDesigns || {}).filter(([, file]) => !!file) as Array<[string, File]>
        const clothingSourceLabel = clothingSource === 'store' ? 'من المتجر' : 'من العميل'
        const hasDeliveryAddress = deliveryType === 'delivery' && deliveryAddress
        const readableAddress =
          (deliveryAddress && (deliveryAddress.street || deliveryAddress.description || deliveryAddress.formattedAddress || deliveryAddress.label)) || ''
        const hasCoordinates = Boolean(deliveryAddress?.latitude && deliveryAddress?.longitude)
        const measurementItems = [
          { label: 'الطول', value: length, unit: widthUnit },
          { label: 'العرض', value: width, unit: widthUnit },
          { label: 'الارتفاع', value: height, unit: heightUnit },
        ]

        return (
          <div className="modal-body">
            <h3>{workflowStep.step_name_ar}</h3>
            {workflowStep.step_description_ar && (
              <p className="step-description">{workflowStep.step_description_ar}</p>
            )}
            <div className="invoice-summary">
              <div className="invoice-section">
                <div className="invoice-section-header">
                  <h4>معلومات العميل</h4>
                  {canAccessCustomerProfile && customerWhatsApp && (
                    <button type="button" className="customer-profile-link" onClick={handleOpenCustomerProfile}>
                      <User size={16} />
                      <span>فتح ملف العميل</span>
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              <div className="invoice-item">
                  <span>اسم العميل:</span>
                  <span>{customerName || 'غير محدد'}</span>
              </div>
                <div className="invoice-item">
                  <span>رقم واتساب:</span>
                  <span>{customerWhatsApp || 'غير محدد'}</span>
                </div>
                <div className="invoice-item">
                  <span>رقم تواصل إضافي:</span>
                  <span>{customerPhoneExtra || 'لا يوجد'}</span>
                </div>
                <div className="invoice-item">
                  <span>اسم المتجر / الشركة:</span>
                  <span>{shopName || 'لا يوجد'}</span>
                </div>
              </div>

              <div className="invoice-section">
                <h4>تفاصيل الطلب</h4>
                            <div className="invoice-item">
                  <span>الخدمة:</span>
                  <span>{serviceName}</span>
                            </div>
                            <div className="invoice-item">
                  <span>الكمية:</span>
                  <span>{quantity}</span>
                </div>
                <div className="invoice-item">
                  <span>عدد الصفحات:</span>
                  <span>{totalPagesValue > 0 ? totalPagesValue : 'غير محدد'}</span>
                </div>
              <div className="invoice-item">
                <span>نوع الطباعة:</span>
                <span>{printColor === 'bw' ? 'أبيض وأسود' : 'ملون'}</span>
              </div>
                <div className="invoice-item">
                  <span>عدد الوجوه:</span>
                  <span>{printSides === 'double' ? 'وجهان' : 'وجه واحد'}</span>
              </div>
              {printColor === 'color' && (
                <div className="invoice-item">
                  <span>جودة الطباعة:</span>
                  <span>
                      {printQuality === 'uv'
                        ? 'دقة عالية (UV)'
                        : printQuality === 'laser'
                        ? 'دقة عالية (ليزرية)'
                        : 'طباعة عادية'}
                  </span>
                </div>
              )}
                <div className="invoice-item">
                  <span>مقاس الورق:</span>
                  <span>{paperSize || 'A4'}</span>
                </div>
                {paperType && (
                  <div className="invoice-item">
                    <span>نوع الورق:</span>
                    <span>{formatPaperType(paperType)}</span>
                  </div>
                )}
                {lamination && (
                  <div className="invoice-item">
                    <span>التسليك:</span>
                    <span>نعم</span>
                  </div>
                )}
                {flexType && (
                  <div className="invoice-item">
                    <span>نوع الفليكس:</span>
                    <span>{flexType === 'lighted' ? 'مضاء' : 'عادي'}</span>
                  </div>
                )}
                {printTypeChoice && (
                  <div className="invoice-item">
                    <span>نوع الطباعة:</span>
                    <span>{printTypeChoice === 'pvc' ? 'PVC' : 'فليكس'}</span>
                  </div>
                )}
                {rollupSource && (
                  <div className="invoice-item">
                    <span>Roll up:</span>
                    <span>{rollupSource === 'ours' ? 'من عندنا' : 'من عندك'}</span>
                  </div>
                )}
                <div className="invoice-item invoice-item-column">
                  <span>الأبعاد المطلوبة:</span>
                  <div className="invoice-dimensions">
                    {measurementItems.map(({ label, value, unit }) => (
                      <span key={label} className="invoice-dimension-item">
                        {label}:{' '}
                        {value && value.trim() !== '' ? `${value} ${unit || 'cm'}` : 'غير محدد'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="invoice-item invoice-item-column">
                  <span>الألوان المختارة:</span>
                  {selectedColors.length > 0 ? (
                    <div className="invoice-color-list">
                      {selectedColors.map((color, index) => (
                        <div key={`${color}-${index}`} className="invoice-color-chip">
                          <span className="invoice-color-dot" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                </div>
                      ))}
                    </div>
                  ) : (
                    <span className="muted-text">لم يتم اختيار ألوان</span>
              )}
              </div>
                <div className="invoice-item invoice-item-column">
                  <span>الألوان المستخرجة من الملفات:</span>
                  {autoExtractedColors.length > 0 ? (
                    <div className="invoice-color-list">
                      {autoExtractedColors.map((color, index) => (
                        <div key={`${color}-${index}`} className="invoice-color-chip auto">
                          <span className="invoice-color-dot" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                </div>
                      ))}
                    </div>
                  ) : (
                    <span className="muted-text">لم يتم استخراج ألوان</span>
                  )}
                </div>
              </div>

              <div className="invoice-section">
                <h4>التسليم والاستلام</h4>
                <div className="invoice-item">
                  <span>نوع الاستلام:</span>
                  <span>{deliveryType === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                </div>
                {hasDeliveryAddress ? (
                  <div className="invoice-item invoice-item-column">
                    <span>عنوان التوصيل:</span>
                    <div className="invoice-location">
                      <span>{readableAddress || 'تم تحديد الموقع على الخريطة'}</span>
                      {hasCoordinates && (
                        <>
                          <span className="invoice-coordinates">
                            خط العرض: {deliveryAddress.latitude}, خط الطول: {deliveryAddress.longitude}
                          </span>
                          <button type="button" className="map-link" onClick={handleOpenMapLocation}>
                            <MapPin size={16} />
                            <span>عرض على الخريطة</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                <div className="invoice-item">
                    <span>تفاصيل إضافية:</span>
                    <span>{addressConfirmed ? 'تم تأكيد الاستلام الذاتي' : 'سيتم التواصل لتحديد تفاصيل الاستلام'}</span>
                </div>
              )}
              </div>

              <div className="invoice-section">
                <h4>الملفات والمرفقات</h4>
                {imagePreviewUrl ? (
                  <div className="invoice-media-preview">
                    <span className="invoice-note-title">صورة مرفوعة</span>
                    <img src={imagePreviewUrl} alt="صورة الطلب" />
                    <button type="button" className="file-action-btn" onClick={() => handlePreviewFile(image)}>
                      <ExternalLink size={14} />
                      <span>عرض الصورة</span>
                    </button>
                  </div>
                ) : null}
                {uploadedFiles.length > 0 ? (
                  <div className="invoice-file-list">
                    {uploadedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="invoice-file-item">
                        <FileText size={18} />
                        <div className="invoice-file-meta">
                          <span className="invoice-file-name">{file.name}</span>
                          <span className="invoice-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="file-action-btn" onClick={() => handlePreviewFile(file)}>
                            <ExternalLink size={14} />
                            <span>عرض</span>
                          </button>
                          <button
                            type="button"
                            className="file-action-btn"
                            onClick={() => handleRemoveFile(idx)}
                            title="حذف الملف"
                            style={{ color: '#ff4444' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !imagePreviewUrl && <p className="invoice-empty">لا توجد ملفات مرفوعة</p>
                )}
              </div>

              {(clothingSource || clothingProduct || clothingColor || clothingDesignEntries.length > 0) && (
                <div className="invoice-section">
                  <h4>تفاصيل الملابس</h4>
              <div className="invoice-item">
                    <span>مصدر القطعة:</span>
                    <span>{clothingSourceLabel}</span>
              </div>
                <div className="invoice-item">
                    <span>نوع القطعة:</span>
                    <span>{clothingProduct || 'غير محدد'}</span>
                  </div>
                  <div className="invoice-item">
                    <span>لون القطعة:</span>
                    <span>{clothingColor || 'غير محدد'}</span>
                  </div>
                  {clothingDesignEntries.length > 0 && (
                    <div className="invoice-item invoice-item-column">
                      <span>ملفات التصميم:</span>
                      <div className="invoice-file-list">
                        {clothingDesignEntries.map(([key, file]) => (
                          <div key={key} className="invoice-file-item">
                            <FileText size={18} />
                            <div className="invoice-file-meta">
                              <span className="invoice-file-name">{CLOTHING_DESIGN_LABELS[key] || key}</span>
                              <span className="invoice-file-size">{file.name}</span>
                            </div>
                            <button type="button" className="file-action-btn" onClick={() => handlePreviewFile(file)}>
                              <ExternalLink size={14} />
                              <span>عرض</span>
                            </button>
                          </div>
                        ))}
                      </div>
                </div>
              )}
                </div>
              )}

              <div className="invoice-section">
                <h4>الملاحظات والتوجيهات</h4>
                <div className="invoice-note">
                  <span className="invoice-note-title">ملاحظات العميل</span>
                  <p>{notes && notes.trim() !== '' ? notes : 'لا توجد ملاحظات مضافة'}</p>
                </div>
                <div className="invoice-note">
                  <span className="invoice-note-title">نوع العمل / الغرض</span>
                  <p>{workType && workType.trim() !== '' ? workType : 'لم يتم تحديد نوع العمل'}</p>
                </div>
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
      }

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
    const renderAdditionalDetailsStep = (heading: string) => (
      <div className="modal-body">
        <h3>{heading}</h3>
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

    const renderContactInfoStep = (heading: string) => (
      <div className="modal-body">
        <h3>{heading}</h3>
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
                const cacheKey = getCacheKey(serviceName)
                localStorage.setItem(cacheKey, JSON.stringify({
                  step: step,
                  quantity,
                  length,
                  width,
                  height,
                  widthUnit,
                  heightUnit,
                  selectedColors,
                  autoExtractedColors,
                  workType,
                  notes,
                  customerName,
                  customerWhatsApp,
                  customerPhoneExtra,
                  shopName,
                  deliveryType,
                  printColor,
                  printQuality,
                  printSides,
                  paperSize,
                  numberOfPages,
                  totalPages,
                  paperType,
                  lamination,
                  flexType,
                  printTypeChoice,
                  rollupSource,
                  serviceName,
                  timestamp: Date.now(), // إضافة timestamp للتحقق من الصلاحية
                  uploadedFiles: uploadedFiles.map(f => ({
                    name: f.name, 
                    size: f.size, 
                    type: f.type 
                  })),
                  clothingSource,
                  clothingProduct,
                  clothingColor
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
              <label>
                {isPosterPrinting || isBannerPrinting ? 'رفع التصميم' : 'العرض'}
                {!isPosterPrinting && !isBannerPrinting && <span className="optional">(اختياري)</span>}
              </label>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {image && imagePreviewUrl ? (
                  <>
                    <div className="uploaded-file">
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImage(null)
                          setUploadedFiles([])
                          setTotalPages(0)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        title="حذف الملف"
                        style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
                      >
                        <X size={18} />
                      </button>
                      <img src={imagePreviewUrl} alt="Preview" />
                      <p>{image.name}</p>
                    </div>
                    {/* زر رفع ملف إضافي */}
                    <button
                      type="button"
                      className="add-more-files-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                      style={{
                        marginTop: '12px',
                        padding: '10px 16px',
                        background: '#f0f9ff',
                        border: '2px dashed #3b82f6',
                        borderRadius: '8px',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dbeafe'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0f9ff'
                      }}
                    >
                      <span>+</span>
                      <span>رفع ملف إضافي</span>
                    </button>
                  </>
                ) : (
                  <div className="upload-placeholder">
                    <p>{isPosterPrinting || isBannerPrinting ? 'اضغط لرفع التصميم' : 'اضغط لتحديد العرض'}</p>
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
              <label>
                العرض{' '}
                {(isPosterPrinting || isBannerPrinting || isFlexPrinting) && (
                  <span className="required">*</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                  min="0"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                className="form-input"
                placeholder="0"
                required={isPosterPrinting || isBannerPrinting || isFlexPrinting}
                  style={{ flex: 1 }}
              />
                <select 
                  value={widthUnit} 
                  onChange={(e) => setWidthUnit(e.target.value)} 
                  className="form-input"
                  style={{ width: '100px' }}
                >
                  <option value="cm">سم (cm)</option>
                  <option value="mm">ملم (mm)</option>
                  <option value="in">إنش (in)</option>
                  <option value="m">متر (m)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>
                الارتفاع{' '}
                {(isPosterPrinting || isBannerPrinting || isFlexPrinting) && (
                  <span className="required">*</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                  min="0"
                  step="0.01"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="form-input"
                placeholder="0"
                  required={isPosterPrinting || isBannerPrinting || isFlexPrinting}
                  style={{ flex: 1 }}
                />
                <select 
                  value={heightUnit} 
                  onChange={(e) => setHeightUnit(e.target.value)} 
                  className="form-input"
                  style={{ width: '100px' }}
                >
                  <option value="cm">سم (cm)</option>
                  <option value="mm">ملم (mm)</option>
                  <option value="in">إنش (in)</option>
                  <option value="m">متر (m)</option>
                </select>
            </div>
            </div>
            {(isLecturePrinting ||
              (!isPosterPrinting &&
                !isBannerPrinting &&
                !isFlexPrinting &&
                (normalizedServiceName.includes('طباعة') || normalizedServiceName.includes('print')))) && (
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
        if (isFlexPrinting) {
          return renderAdditionalDetailsStep('المرحلة 3: تفاصيل إضافية')
        }
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
        if (isFlexPrinting) {
          return renderContactInfoStep('المرحلة 4: معلومات الطلب')
        }
        return renderAdditionalDetailsStep('المرحلة 4: نوع العمل')
      case 5:
        return renderContactInfoStep('المرحلة 5: معلومات الطلب')
      default:
        return null
    }
  }

  // Load workflow steps when modal opens and serviceId is available
  useEffect(() => {
    // مسح workflowSteps القديمة عند فتح خدمة جديدة
    if (isOpen) {
      // التحقق من أن هذه خدمة جديدة (ليس هناك shouldReopen flag)
      const shouldReopen = localStorage.getItem('shouldReopenOrderModal')
      if (!shouldReopen || shouldReopen !== 'true') {
        console.log('🧹 Clearing old workflowSteps - opening new service')
        setWorkflowSteps([])
        setStep(1)
        hasRestoredState.current = false
      }
    }
    
    const loadWorkflow = async () => {
      console.log('🔄 loadWorkflow called - isOpen:', isOpen, 'serviceId:', serviceId, 'serviceName:', serviceName)
      
      if (isOpen && serviceId) {
        try {
          setLoadingWorkflow(true)
          console.log('📡 Fetching workflow for serviceId:', serviceId)
          const response = await workflowsAPI.getServiceWorkflow(serviceId)
          console.log('📡 Workflow API response:', response.data)
          
          if (response.data.success && response.data.workflows && response.data.workflows.length > 0) {
            const sortedWorkflows = response.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
            console.log('✅ Loaded workflows:', sortedWorkflows.length, sortedWorkflows)
            
            // التحقق من عدد المراحل - إذا كانت خدمة فليكس ويجب أن تكون 7 مراحل
            const needsReSetup = isFlexPrinting && sortedWorkflows.length !== 7
            
            if (needsReSetup) {
              console.log('⚠️ Flex printing workflows count mismatch. Expected 7, found:', sortedWorkflows.length)
              console.log('🔧 Re-setting up flex printing service workflows...')
              try {
                const setupResponse = await workflowsAPI.setupFlexPrinting()
                console.log('🔧 Setup response:', setupResponse.data)
                
                if (setupResponse.data.success) {
                  // إعادة تحميل المراحل بعد الإعداد
                  const reloadResponse = await workflowsAPI.getServiceWorkflow(serviceId)
                  if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                    const reloadedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                    console.log('✅ Loaded workflows after re-setup:', reloadedWorkflows.length, reloadedWorkflows)
                    applyWorkflowSteps(reloadedWorkflows, serviceName)
                    showSuccess('تم تحديث مراحل الخدمة بنجاح')
                  }
                }
              } catch (setupError) {
                console.error('❌ Error re-setting up workflows:', setupError)
                // استخدم المراحل الموجودة رغم أنها قديمة
                applyWorkflowSteps(sortedWorkflows, serviceName)
              }
            } else {
              applyWorkflowSteps(sortedWorkflows, serviceName)
            }
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
                    applyWorkflowSteps(sortedWorkflows, serviceName)
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
                const setupResponse = await workflowsAPI.setupFlexPrinting()
                console.log('🔧 Setup response:', setupResponse.data)
                
                if (setupResponse.data.success) {
                  // إعادة تحميل المراحل بعد الإعداد
                  const reloadResponse = await workflowsAPI.getServiceWorkflow(serviceId)
                  if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                    const sortedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                    console.log('✅ Loaded workflows after setup:', sortedWorkflows.length, sortedWorkflows)
                    applyWorkflowSteps(sortedWorkflows, serviceName)
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
              
              // التحقق من عدد المراحل - إذا كانت خدمة فليكس ويجب أن تكون 7 مراحل
              const needsReSetup = isFlexPrinting && sortedWorkflows.length !== 7
              
              if (needsReSetup) {
                console.log('⚠️ Flex printing workflows count mismatch. Expected 7, found:', sortedWorkflows.length)
                console.log('🔧 Re-setting up flex printing service workflows...')
                try {
                  const setupResponse = await workflowsAPI.setupFlexPrinting()
                  console.log('🔧 Setup response:', setupResponse.data)
                  
                  if (setupResponse.data.success) {
                    // إعادة تحميل المراحل بعد الإعداد
                    const reloadResponse = await workflowsAPI.getServiceWorkflow(service.id)
                    if (reloadResponse.data.success && reloadResponse.data.workflows && reloadResponse.data.workflows.length > 0) {
                      const reloadedWorkflows = reloadResponse.data.workflows.sort((a: any, b: any) => a.step_number - b.step_number)
                      console.log('✅ Loaded workflows after re-setup:', reloadedWorkflows.length, reloadedWorkflows)
                      applyWorkflowSteps(reloadedWorkflows, serviceName)
                      showSuccess('تم تحديث مراحل الخدمة بنجاح')
                    }
                  }
                } catch (setupError) {
                  console.error('❌ Error re-setting up workflows:', setupError)
                  // استخدم المراحل الموجودة رغم أنها قديمة
                  applyWorkflowSteps(sortedWorkflows, serviceName)
                }
              } else {
                setWorkflowSteps(sortedWorkflows)
                setStep(1)
              }
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
      // مسح الكاش القديم أولاً
      clearExpiredCache()
      
      // Check if we should restore state (only when returning from location picker)
      const shouldReopen = localStorage.getItem('shouldReopenOrderModal')
      const savedServiceName = localStorage.getItem('orderModalService')
      
      // Only restore if flag is set and service name matches
      const shouldRestore = shouldReopen === 'true' && savedServiceName === serviceName
      
      // إذا كانت خدمة مختلفة أو لا يوجد shouldReopen flag، نمسح الكاش القديم
      if (!shouldRestore) {
        if (savedServiceName && savedServiceName !== serviceName) {
          console.log('🧹 Clearing cache for different service')
        } else if (!shouldReopen) {
          // إذا لم يكن هناك shouldReopen flag، يعني أننا نفتح خدمة جديدة
          console.log('🧹 Clearing cache - opening new service')
        }
        const cacheKey = getCacheKey(serviceName)
        localStorage.removeItem(cacheKey)
        localStorage.removeItem('shouldReopenOrderModal')
        localStorage.removeItem('orderModalService')
        // إعادة تعيين hasRestoredState عند فتح خدمة جديدة
        hasRestoredState.current = false
        // مسح الملفات المرفوعة عند فتح خدمة جديدة
        setUploadedFiles([])
        setImage(null)
        setImagePreviewUrl(null)
        setTotalPages(0)
        console.log('🧹 Cleared uploaded files - opening new service')
      }
      
      if (shouldRestore) {
        // Restore form state if exists and we're returning from location picker
        const cacheKey = getCacheKey(serviceName)
        const savedFormState = localStorage.getItem(cacheKey)
        if (savedFormState) {
          try {
            const formState = JSON.parse(savedFormState)
            // Only restore if it's for the same service and cache is still valid (less than 10 minutes)
            if (formState.serviceName === serviceName && 
                formState.timestamp && 
                isCacheValid(formState.timestamp)) {
              console.log('🔵 Restoring form state:', formState)
              
              // Restore step FIRST (this is critical!)
              if (formState.step) {
                setStep(formState.step)
              }
              
              // Restore all form fields including new fields
              if (formState.lamination !== undefined) setLamination(formState.lamination)
              if (formState.flexType) setFlexType(formState.flexType)
              if (formState.printTypeChoice) setPrintTypeChoice(formState.printTypeChoice)
              if (formState.rollupSource) setRollupSource(formState.rollupSource)
              if (formState.quantity !== undefined) setQuantity(formState.quantity)
              if (formState.length !== undefined) setLength(formState.length)
              if (formState.width !== undefined) setWidth(formState.width)
              if (formState.height !== undefined) setHeight(formState.height)
              if (formState.widthUnit !== undefined) setWidthUnit(formState.widthUnit)
              if (formState.heightUnit !== undefined) setHeightUnit(formState.heightUnit)
              // Backward compatibility: if old 'unit' exists, use it for both
              if (formState.unit !== undefined && formState.widthUnit === undefined && formState.heightUnit === undefined) {
                setWidthUnit(formState.unit)
                setHeightUnit(formState.unit)
              }
              if (formState.selectedColors !== undefined) setSelectedColors(formState.selectedColors)
              if (formState.autoExtractedColors !== undefined) setAutoExtractedColors(formState.autoExtractedColors)
              if (formState.workType !== undefined) setWorkType(formState.workType)
              if (formState.notes !== undefined) setNotes(formState.notes)
              if (formState.customerName !== undefined) setCustomerName(formState.customerName)
              if (formState.customerWhatsApp !== undefined) setCustomerWhatsApp(formState.customerWhatsApp)
              if (formState.customerPhoneExtra !== undefined) setCustomerPhoneExtra(formState.customerPhoneExtra)
              if (formState.shopName !== undefined) setShopName(formState.shopName)
              if (formState.printColor !== undefined) setPrintColor(formState.printColor)
              if (formState.printQuality !== undefined) setPrintQuality(formState.printQuality)
              if (formState.printSides !== undefined) setPrintSides(formState.printSides)
              if (formState.numberOfPages !== undefined) setNumberOfPages(formState.numberOfPages)
              if (formState.paperSize !== undefined) setPaperSize(formState.paperSize)
              if (formState.totalPages !== undefined) setTotalPages(formState.totalPages)
              if (formState.paperType !== undefined) setPaperType(formState.paperType)
              if (formState.clothingSource) setClothingSource(formState.clothingSource)
              if (formState.clothingProduct) setClothingProduct(formState.clothingProduct)
              if (formState.clothingColor) setClothingColor(formState.clothingColor)
              
              // Restore delivery type
              if (formState.deliveryType === 'delivery') {
                setDeliveryType('delivery')
              }
              
              // لا نستورد الملفات المرفوعة من الكاش - يجب رفعها من جديد لكل خدمة
              // لأن File objects لا يمكن serialize، والملفات يجب أن تكون خاصة بكل خدمة
              setUploadedFiles([])
              setImage(null)
              setTotalPages(0)
              
              hasRestoredState.current = true
              console.log('✅ Form state restored successfully, step:', formState.step)
              console.log('🧹 Cleared uploaded files - must be re-uploaded for this service')
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
            if (!addressToastShown.current) {
              showSuccess('تم تحديد العنوان بنجاح، يمكنك متابعة اختيار نوع الاستلام.')
              addressToastShown.current = true
            }
            // Only update shopName if it's not already set from formState
            const cacheKey = getCacheKey(serviceName)
            const formStateStr = localStorage.getItem(cacheKey)
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
      // مسح الملفات عند إغلاق الـ modal
      setUploadedFiles([])
      setImage(null)
      setImagePreviewUrl(null)
      setTotalPages(0)
      console.log('🧹 Cleared uploaded files - modal closed')
    }
  }, [isOpen, serviceName])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    console.log('📁 Files selected:', fileArray.length, 'files')
    console.log('📁 File names:', fileArray.map(f => f.name))
    
    setImage(fileArray[0]) // Keep first file for image preview
    
    // Check if multiple files are allowed and if PDFs
    // البحث في workflowSteps الحالية أو في step الحالي
    const currentStep = workflowSteps.find(s => s.step_number === step)
    const workflowStep = currentStep?.step_type === 'files' ? currentStep : workflowSteps.find(s => s.step_type === 'files')
    const stepConfig = workflowStep?.step_config || {}
    
    console.log('📋 Current step:', step)
    console.log('📋 Workflow step found:', !!workflowStep)
    console.log('📋 Step config:', stepConfig)
    console.log('📋 Multiple enabled:', stepConfig.multiple)
    
    // التحقق من multiple - يمكن أن يكون true أو 'true' أو 1
    // إذا لم يكن محدداً، نعتبره multiple = true افتراضياً لدعم رفع ملفات متعددة
    const isMultiple = stepConfig.multiple === false || stepConfig.multiple === 'false' || stepConfig.multiple === 0 ? false : true
    
    // دائماً نضيف الملفات بدلاً من استبدالها (حتى لو كان multiple = false، نسمح بإضافة ملفات إضافية)
    console.log('✅ Adding files to existing list (always append mode)')
      setUploadedFiles(prev => {
        console.log('📦 Previous files count:', prev.length)
        // تجنب إضافة ملفات مكررة (نفس الاسم والحجم)
        const existingSignatures = new Set(prev.map(f => `${f.name}-${f.size}-${f.lastModified}`))
        const newFiles = fileArray.filter(f => {
          const signature = `${f.name}-${f.size}-${f.lastModified}`
          const isDuplicate = existingSignatures.has(signature)
          if (isDuplicate) {
            console.log('⚠️ Duplicate file skipped:', f.name)
          }
          return !isDuplicate
        })
        console.log('📦 New files to add:', newFiles.length)
        console.log('📦 Total files after add:', prev.length + newFiles.length)
        return [...prev, ...newFiles]
      })
      
      // تحليل الصفحات إذا كان مفعّل
      if (stepConfig.analyze_pages) {
        analyzePDFPages(fileArray)
      } else {
        // تحليل PDFs فقط إذا لم يكن analyze_pages مفعّل
        const pdfFiles = fileArray.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        if (pdfFiles.length > 0) {
          analyzePDFPages(pdfFiles)
      }
    }
    
    // إذا كان enable_image_color_analysis مفعّل، استخرج الألوان من الصور المرفوعة
    if (stepConfig.enable_image_color_analysis) {
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        // استخراج الألوان من الصور
        extractColorsFromImages(imageFiles)
      }
    }
    
    // Reset file input to allow selecting the same file again
    // دائماً نمسح value حتى يمكن رفع ملفات إضافية
    if (fileInputRef.current) {
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 100)
    }
  }

  // دالة لحذف ملف من القائمة
  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, idx) => idx !== index)
    setUploadedFiles(newFiles)
    
    // إذا كان الملف المحذوف هو الصورة الرئيسية، امسحها أيضاً
    if (index === 0 && image && uploadedFiles[0] === image) {
      setImage(newFiles[0] || null)
    } else if (uploadedFiles[index] === image) {
      setImage(null)
    }
    
    // إعادة حساب عدد الصفحات إذا كان هناك تحليل
    if (newFiles.length > 0) {
      const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      if (pdfFiles.length > 0) {
        analyzePDFPages(pdfFiles)
      } else {
        setTotalPages(0)
      }
    } else {
      setTotalPages(0)
    }
  }
  
  // استخراج الألوان من الصور المرفوعة
  const extractColorsFromImages = async (files: File[]) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const allColors: string[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue

      try {
        const imageUrl = URL.createObjectURL(file)
        const img = new Image()
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageUrl
        })

        // تقليل حجم الصورة للتحليل السريع
        const maxSize = 200
        const scale = Math.min(maxSize / img.width, maxSize / img.height)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // استخراج بيانات البكسل
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data

        // تجميع الألوان حسب التكرار
        const colorMap = new Map<string, number>()

        // أخذ عينة من البكسل (كل 40 بكسل لتسريع العملية)
        for (let i = 0; i < pixels.length; i += 40) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // تجاهل البكسل الشفاف
          if (a < 128) continue

          // تجميع الألوان المتشابهة (في نطاق ±10 لكل قناة)
          const roundedR = Math.round(r / 10) * 10
          const roundedG = Math.round(g / 10) * 10
          const roundedB = Math.round(b / 10) * 10
          const roundedHex = `#${[roundedR, roundedG, roundedB].map(x => {
            const hex = Math.min(255, Math.max(0, x)).toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }).join('').toUpperCase()}`

          colorMap.set(roundedHex, (colorMap.get(roundedHex) || 0) + 1)
        }

        // ترتيب الألوان حسب التكرار واختيار الأكثر شيوعاً
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([color]) => color)

        allColors.push(...sortedColors)

        URL.revokeObjectURL(imageUrl)
      } catch (error) {
        console.error('Error extracting colors from image:', error)
      }
    }

    // إزالة الألوان المكررة واختيار الأكثر شيوعاً
    const uniqueColors = Array.from(new Set(allColors)).slice(0, 6)
    setAutoExtractedColors(uniqueColors)
    
    // إضافة الألوان المستخرجة تلقائياً إلى الألوان المختارة
    if (uniqueColors.length > 0) {
      setSelectedColors(prev => {
        const newColors = [...prev]
        uniqueColors.forEach(color => {
          if (!newColors.includes(color) && newColors.length < 6) {
            newColors.push(color)
          }
        })
        return newColors
      })
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
      addressToastShown.current = false
      // Save current form state including current step and all fields
      // IMPORTANT: Save the CURRENT step number so we return to the same step
      const cacheKey = getCacheKey(serviceName)
      localStorage.setItem(cacheKey, JSON.stringify({
        step: step, // حفظ المرحلة الحالية
        quantity,
        length,
        width,
        height,
        widthUnit,
        heightUnit,
        selectedColors,
        autoExtractedColors, // حفظ الألوان المستخرجة تلقائياً
        workType,
        notes,
        customerName,
        customerWhatsApp,
        customerPhoneExtra,
        shopName,
        deliveryType: 'delivery',
        serviceName,
        printColor,
        printQuality,
        printSides,
        paperSize,
        numberOfPages,
        totalPages,
        paperType,
        timestamp: Date.now(), // إضافة timestamp للتحقق من الصلاحية
        uploadedFiles: uploadedFiles.map(f => ({ 
          name: f.name, 
          size: f.size, 
          type: f.type 
        }))
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

  const handleOpenCustomerProfile = () => {
    if (!canAccessCustomerProfile || !customerWhatsApp) return
    const normalizedPhone = customerWhatsApp.replace(/\s+/g, '')
    onClose()
    navigate('/dashboard/customers', {
      state: {
        customerPhone: normalizedPhone,
        customerName: customerName || undefined,
      },
    })
  }

  const handlePreviewFile = (file: File | null) => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    window.open(objectUrl, '_blank', 'noopener,noreferrer')
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 60_000)
  }

  const handleOpenMapLocation = () => {
    if (!deliveryAddress?.latitude || !deliveryAddress?.longitude) return
    const url = `https://www.google.com/maps?q=${deliveryAddress.latitude},${deliveryAddress.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleNext = () => {
    const maxStep = workflowSteps.length > 0 ? workflowSteps.length : defaultSteps.length

    if ((isPosterPrinting || isBannerPrinting) && step === 1) {
      if (!image && uploadedFiles.length === 0) {
        showError('يرجى رفع التصميم قبل المتابعة')
        return
      }
    }

    // التحقق من skip_invoice - إذا كان true وstep الحالي هو customer_info، أرسل الطلب مباشرة
    if (workflowSteps.length > 0) {
      const currentStep = workflowSteps.find((s) => s.step_number === step)
      
      // التحقق من المقاسات - إذا كان step_type === 'dimensions' وكان required
      if (currentStep?.step_type === 'dimensions') {
        const stepConfig = currentStep.step_config || {}
        const isRequired = stepConfig.required !== false // افتراضي required إذا لم يُحدد
        
        if (isRequired) {
          const fields = stepConfig.fields || ['length', 'width', 'height']
          const lengthValue = parseFloat(length)
          const widthValue = parseFloat(width)
          const heightValue = parseFloat(height)
          
          // التحقق من العرض والارتفاع فقط (مطلوبان دائماً)
          if (fields.includes('width') && (!widthValue || widthValue <= 0)) {
            showError('يرجى إدخال العرض بشكل صحيح قبل المتابعة')
            return
          }
          if (fields.includes('height') && (!heightValue || heightValue <= 0)) {
            showError('يرجى إدخال الارتفاع بشكل صحيح قبل المتابعة')
            return
          }
          // التحقق من الارتفاع إذا كان مطلوباً ولم يكن مخفياً وليست خدمة كلك بوليستر
          if (fields.includes('height') && 
              !stepConfig.hide_height && 
              !serviceName.toLowerCase().includes('كلك بوليستر') && 
              !serviceName.toLowerCase().includes('polyester') &&
              (!heightValue || heightValue <= 0)) {
            showError('يرجى إدخال الارتفاع بشكل صحيح قبل المتابعة')
            return
          }
        }
      }
      if (currentStep?.step_type === 'customer_info' && currentStep?.step_config?.skip_invoice) {
        // التحقق من البيانات المطلوبة قبل الإرسال
        if (!customerName.trim()) {
          showError('يرجى إدخال اسم العميل')
          return
        }
        const isWhatsAppOptional = currentStep?.step_config?.fields?.includes('whatsapp_optional')
        if (!isWhatsAppOptional && !customerWhatsApp.trim()) {
          showError('يرجى إدخال رقم واتساب')
          return
        }
        // إذا كان نوع الاستلام هو delivery ولم يتم تحديد العنوان
        if (deliveryType === 'delivery' && !addressConfirmed) {
          showError('يرجى تحديد موقع التوصيل قبل المتابعة')
          return
        }
        // إرسال الطلب مباشرة
        handleSubmit()
        return
      }
    }

    setStep(Math.min(step + 1, maxStep))
  }

  const handlePrev = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    // منع الإرسال المتكرر
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring duplicate request')
      return
    }
    
    // Validation
    if (!customerName.trim()) {
      showError('يرجى إدخال اسم العميل')
      return
    }
    // التحقق من رقم واتساب - يكون اختياري إذا كان whatsapp_optional موجود في fields
    const customerInfoStep = workflowSteps.find((s: any) => s.step_type === 'customer_info')
    const isWhatsAppOptional = customerInfoStep?.step_config?.fields?.includes('whatsapp_optional')
    if (!isWhatsAppOptional && !customerWhatsApp.trim()) {
      showError('يرجى إدخال رقم واتساب')
      return
    }

    setIsSubmitting(true)
    
    // No price calculation - prices are stored in pricing rules for record keeping only
    const safeQuantity = Number(quantity) || 1
    const safeTotalPrice = 0 // No price calculation - for record keeping only
    const unitPrice = 0 // No price calculation - for record keeping only
    let orderData: any = null
    
    try {
      const serializedFilesByKey = new Map<string, SerializedDesignFile>()
      const serializedFilesByName = new Map<string, SerializedDesignFile>()
      const serializedByLocation = new Map<string, SerializedDesignFile>()

      const registerFile = async (file: File | null, options?: { location?: string; source?: string }) => {
        if (!file) return
        const signature = getFileSignature(file)
        let base = serializedFilesByKey.get(signature)
        if (!base) {
          base = await serializeFile(file)
          serializedFilesByKey.set(signature, base)
          serializedFilesByName.set(base.filename, base)
        }

        if (options?.location) {
          const withLocation: SerializedDesignFile = {
            ...base,
            location: options.location,
            source: options.source ?? base.source,
          }
          serializedByLocation.set(options.location, withLocation)
          serializedFilesByName.set(withLocation.filename, withLocation)
        } else if (options?.source) {
          serializedFilesByName.set(base.filename, { ...base, source: options.source })
        }
      }

      await Promise.all(uploadedFiles.map((file) => registerFile(file, { source: 'uploaded' })))
      if (image) {
        await registerFile(image, { source: 'primary' })
      }
      await Promise.all(
        Object.entries(clothingDesigns).map(([location, file]) =>
          registerFile(file, { location, source: 'clothing' })
        )
      )

      const ensureSerializedEntry = async (
        entry: any,
        index: number
      ): Promise<(SerializedDesignFile & Record<string, any>) | SerializedDesignFile | null> => {
        if (!entry) return null

        if (isFileObject(entry)) {
          const signature = getFileSignature(entry)
          let base = serializedFilesByKey.get(signature)
          // إذا لم يتم تسجيل الملف بعد، قم بتسجيله الآن
          if (!base) {
            base = await serializeFile(entry)
            serializedFilesByKey.set(signature, base)
            serializedFilesByName.set(base.filename, base)
          }
          if (base) {
            return { ...base }
          }
        }

        if (typeof entry === 'string') {
          if (entry.startsWith('data:') || entry.startsWith('http')) {
            const filename = entry.split('/').pop() || `file-${index + 1}`
            return {
              file_key: `${filename}-${index}`,
              filename,
              url: entry,
              download_url: entry,
              raw_path: entry,
              data_url: entry,
            }
          }

          const fromName = serializedFilesByName.get(entry)
          if (fromName) {
            return { ...fromName }
          }

          const inferred = entry.startsWith('/') ? entry : `/uploads/${entry}`
          const filename = entry.split('/').pop() || `file-${index + 1}`
          return {
            file_key: `${filename}-${index}`,
            filename,
            url: inferred,
            download_url: inferred,
            raw_path: inferred,
            data_url: inferred,
          }
        }

        if (typeof entry === 'object') {
          const candidate = entry as Record<string, any>
          let base: SerializedDesignFile | undefined

          if (candidate.location && serializedByLocation.has(candidate.location)) {
            base = serializedByLocation.get(candidate.location)
          } else if (candidate.filename && serializedFilesByName.has(candidate.filename)) {
            base = serializedFilesByName.get(candidate.filename)
          }

          const merged: any = { ...base, ...candidate }
          const effectiveUrl =
            merged.url ||
            merged.download_url ||
            merged.raw_path ||
            merged.location_url ||
            merged.data_url ||
            merged.file ||
            merged.path ||
            merged.href

          if (effectiveUrl) {
            // تأكد من أن URL صحيح
            const urlString = String(effectiveUrl).trim()
            if (urlString) {
              merged.url = urlString
              merged.download_url = merged.download_url || urlString
              merged.raw_path = merged.raw_path || urlString
              if (!merged.data_url && (urlString.startsWith('data:') || urlString.startsWith('http'))) {
                merged.data_url = urlString
              }
              merged.file_key =
                merged.file_key || base?.file_key || `${merged.filename || 'file'}-${index}`
              return merged
            }
          }

          // إذا لم نجد URL، لكن لدينا filename، جرب إنشاء URL
          if (merged.filename && !effectiveUrl) {
            const filename = String(merged.filename).trim()
            if (filename) {
              if (filename.includes('/')) {
                merged.url = filename
                merged.download_url = filename
                merged.raw_path = filename
              } else {
                merged.url = `/uploads/${filename}`
                merged.download_url = `/uploads/${filename}`
                merged.raw_path = `/uploads/${filename}`
              }
              merged.file_key = merged.file_key || base?.file_key || `${filename}-${index}`
              return merged
            }
          }

          if (base) {
            return { ...base }
          }
        }

        return null
      }

      // استخراج عناوين منتجات الملابس من إعدادات الـ workflow (إن وجدت)
      let clothingSourceLabel: string | undefined
      let clothingProductLabel: string | undefined
      let clothingColorLabel: string | undefined
      let clothingSizeLabel: string | undefined
      const clothingStep = workflowSteps.find((step) => step.step_type === 'clothing_source')
      const clothingOptions = clothingStep?.step_config?.options || []
      const selectedSourceOption = clothingOptions.find((option: any) => option.id === clothingSource)
      if (selectedSourceOption) {
        clothingSourceLabel = selectedSourceOption.label
        const products = selectedSourceOption.products || []
        const selectedProduct = products.find((product: any) => product.id === clothingProduct)
        if (selectedProduct) {
          clothingProductLabel = selectedProduct.name
          if (Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0) {
            const matchingColor = selectedProduct.colors.find((color: string) => color === clothingColor)
            clothingColorLabel = matchingColor || clothingColor
        }
          if (Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0) {
            const matchingSize = selectedProduct.sizes.find((size: string) => size === clothingSize)
            clothingSizeLabel = matchingSize || selectedProduct.sizes[0]
          }
      }
      }
      if (!clothingColorLabel) {
        clothingColorLabel = clothingColor
      }
      if (!clothingSizeLabel) {
        clothingSizeLabel = clothingSize
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
          ? (deliveryAddress?.street || deliveryAddress?.formattedAddress || deliveryAddress?.description || deliveryAddress?.label || shopName || null)
          : null,
        delivery_latitude: deliveryType === 'delivery' && deliveryAddress?.latitude 
          ? deliveryAddress.latitude 
          : null,
        delivery_longitude: deliveryType === 'delivery' && deliveryAddress?.longitude 
          ? deliveryAddress.longitude 
          : null,
        delivery_address_details: deliveryType === 'delivery' && deliveryAddress
          ? (deliveryAddress.description || deliveryAddress.additionalInfo || deliveryAddress.notes || deliveryAddress.floor || deliveryAddress.apartment || null)
          : null,
        notes: notes || workType || null
      }
      
      // إذا كانت هناك خدمة مسجلة، استخدم منطقها الخاص لتحضير البيانات
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
          widthUnit,
          heightUnit,
          selectedColors,
          workType,
          clothingSource,
          clothingSourceLabel,
          clothingProduct,
          clothingProductLabel,
          clothingColor,
          clothingColorLabel,
          clothingSize,
          clothingSizeLabel,
          clothingDesigns,
          paperType,
          lamination,
          flexType,
          printTypeChoice,
          rollupSource
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
                dimensions: length || width || height ? { length, width, height, widthUnit, heightUnit } : undefined,
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
                paper_type: paperType || undefined,
                lamination: lamination || undefined,
                flex_type: flexType || undefined,
                print_type_choice: printTypeChoice || undefined,
                rollup_source: rollupSource || undefined
              },
              dimensions: {
                length: length || null,
                width: width || null,
                height: height || null,
                widthUnit: widthUnit,
                heightUnit: heightUnit
              },
              colors: selectedColors,
              design_files: uploadedFiles
            }
          ],
          total_amount: safeTotalPrice,
          final_amount: safeTotalPrice,
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'delivery'
            ? (deliveryAddress?.street || deliveryAddress?.formattedAddress || deliveryAddress?.description || deliveryAddress?.label || shopName || null)
            : null,
          delivery_latitude: deliveryType === 'delivery' && deliveryAddress?.latitude
            ? deliveryAddress.latitude
            : null,
          delivery_longitude: deliveryType === 'delivery' && deliveryAddress?.longitude
            ? deliveryAddress.longitude
            : null,
          delivery_address_details: deliveryType === 'delivery' && deliveryAddress
            ? (deliveryAddress.description || deliveryAddress.additionalInfo || deliveryAddress.notes || deliveryAddress.floor || deliveryAddress.apartment || null)
            : null,
          notes: notes || workType || null
        }
      }

      if (Array.isArray(orderData?.items)) {
        // معالجة جميع الملفات بشكل async
        const processedItems = await Promise.all(
          orderData.items.map(async (item: any) => {
            // معالجة design_files
            let processedDesignFiles: any[] = []
            if (Array.isArray(item.design_files)) {
              const processed = await Promise.all(
                item.design_files.map(async (entry: any, idx: number) => {
                  try {
                    return await ensureSerializedEntry(entry, idx)
                  } catch (error) {
                    console.error(`Error serializing design_file[${idx}]:`, error)
                    return null
                  }
                })
              )
              processedDesignFiles = processed.filter(Boolean) as any[]
            }

            // معالجة specifications
            const specifications = item.specifications ? { ...item.specifications } : undefined
            const attachmentKeys = ['design_files', 'files', 'attachments', 'uploaded_files', 'documents', 'images']

            if (specifications) {
              await Promise.all(
                attachmentKeys.map(async (key) => {
                  if (Array.isArray(specifications[key])) {
                    const processed = await Promise.all(
                      specifications[key].map(async (entry: any, idx: number) => {
                        try {
                          return await ensureSerializedEntry(entry, idx)
                        } catch (error) {
                          console.error(`Error serializing ${key}[${idx}]:`, error)
                          return null
                        }
                      })
                    )
                    const filtered = processed.filter(Boolean)
                    if (filtered.length > 0) {
                      specifications[key] = filtered
                    } else {
                      delete specifications[key]
                    }
                  }
                })
              )
            }

            return {
              ...item,
              design_files: processedDesignFiles,
              specifications,
            }
          })
        )
        orderData.items = processedItems
      }

      if (orderData && typeof orderData === 'object' && 'uploadedFiles' in orderData) {
        delete orderData.uploadedFiles
      }

      console.log('📤 Sending order data:', {
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        items_count: orderData.items?.length || 0,
        total_amount: orderData.total_amount,
        final_amount: orderData.final_amount
      })
      
      const response = await ordersAPI.create(orderData)
      
      console.log('📥 Order creation response:', response.data)
      
      if (response.data.success) {
        const orderNumber = response.data?.order?.order_number || 'غير متوفر'
        const orderId = response.data?.order?.id
        console.log(`✅ Order created successfully: ${orderNumber} (ID: ${orderId})`)
        setSuccessInfo({ orderNumber })
        // Clear saved form state and delivery address
        const cacheKey = getCacheKey(serviceName)
        localStorage.removeItem(cacheKey)
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
        addressToastShown.current = false
        setClothingSource('customer')
        setClothingProduct('hoodie')
        setClothingColor('أبيض')
        setClothingDesigns({
          logo: null,
          front: null,
          back: null,
          shoulder_right: null,
          shoulder_left: null,
        })
        setClothingSize('M')
      } else {
        showError('فشل إرسال الطلب. يرجى المحاولة مرة أخرى')
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      console.error('Error response:', error.response)
      console.error('Order data sent:', orderData)
      
      // عرض تفاصيل الخطأ بشكل أفضل
      let errorMessage = 'حدث خطأ في إرسال الطلب'
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.detail) {
          if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail
          } else if (Array.isArray(error.response.data.detail)) {
            // Pydantic validation errors
            const errors = error.response.data.detail.map((e: any) => {
              const field = e.loc?.join('.') || 'field'
              const msg = e.msg || 'validation error'
              return `${field}: ${msg}`
            }).join(', ')
            errorMessage = `خطأ في التحقق من البيانات: ${errors}`
          } else {
            errorMessage = JSON.stringify(error.response.data.detail)
          }
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      showError(`خطأ: ${errorMessage}`)
    } finally {
      // التأكد من إعادة تعيين isSubmitting حتى في حالة الخطأ
      setIsSubmitting(false)
    }
  }

  const handleSuccessClose = (goToOrders = false) => {
    setSuccessInfo(null)
    onClose()
    if (goToOrders) {
      navigate('/orders')
    }
  }

  if (!isOpen && !successInfo) return null

  if (successInfo) {
    return (
      <div className="order-modal-overlay" onClick={() => handleSuccessClose()}>
        <div className="order-modal success" onClick={(e) => e.stopPropagation()}>
          <div className="success-icon">✅</div>
          <h2>تم استلام طلبك بنجاح</h2>
          <p className="success-order-number">
            رقم الطلب: <strong>{successInfo.orderNumber}</strong>
          </p>
          <p className="success-message">
            يمكنك مراجعة حالة طلبك من تبويب <strong>طلباتي</strong>. سنتواصل معك عبر واتساب لتحديد موعد التسليم
            والتكلفة لضمان أفضل سعر مدروس لك.
          </p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => handleSuccessClose(true)}>
              الانتقال إلى طلباتي
            </button>
            <button className="btn btn-secondary" onClick={() => handleSuccessClose(false)}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          {(workflowSteps.length > 0 ? workflowSteps : defaultSteps).map((s) => {
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
            const maxStep = workflowSteps.length > 0 ? workflowSteps.length : defaultSteps.length
            const currentStep = workflowSteps.length > 0 ? workflowSteps.find((s) => s.step_number === step) : null
            const shouldSkipInvoice = currentStep?.step_type === 'customer_info' && currentStep?.step_config?.skip_invoice
            
            // إذا كان skip_invoice = true، نعرض زر "تأكيد الطلب" في customer_info step
            if (shouldSkipInvoice) {
              return (
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                </button>
              )
            }
            
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

