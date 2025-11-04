import { useState, useEffect } from 'react'
import { ChevronRight, Check, X } from 'lucide-react'
import { pricingHierarchicalAPI } from '../../lib/api'
import { Link } from 'react-router-dom'
import './PricingWizard.css'

interface Category {
  id: number
  name_ar: string
  name_en?: string
  icon?: string
}

const PAPER_SIZES = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5']
const PAPER_TYPES = ['عادي', 'مصقول', 'كوشيه', 'ورق خاص']
const PRINT_TYPES = [
  { value: 'bw', label: 'أبيض وأسود' },
  { value: 'color', label: 'ملون' }
]
const QUALITY_TYPES = [
  { value: 'standard', label: 'دقة عادية' },
  { value: 'laser', label: 'دقة عالية (ليزرية)' }
]

export default function PricingWizard() {
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form data
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedPaperSize, setSelectedPaperSize] = useState<string>('')
  const [selectedPaperType, setSelectedPaperType] = useState<string>('')
  const [selectedPrintType, setSelectedPrintType] = useState<string>('')
  const [selectedQualityType, setSelectedQualityType] = useState<string>('')
  const [pricePerPage, setPricePerPage] = useState<number>(0)
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])

  useEffect(() => {
    loadCategories()
    loadSavedConfigs()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await pricingHierarchicalAPI.getCategories()
      if (response.data.success) {
        setCategories(response.data.categories)
        // إذا لم تكن هناك فئات، أنشئ فئة افتراضية
        if (response.data.categories.length === 0) {
          await createDefaultCategory()
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      alert('خطأ في تحميل الفئات')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultCategory = async () => {
    try {
      const response = await pricingHierarchicalAPI.createCategory({
        name_ar: 'الطباعة على ورق',
        name_en: 'Paper Printing',
        icon: '📄',
        is_active: true
      })
      if (response.data.success) {
        await loadCategories()
      }
    } catch (error) {
      console.error('Error creating default category:', error)
    }
  }

  const loadSavedConfigs = async () => {
    try {
      const response = await pricingHierarchicalAPI.getConfigs()
      if (response.data.success) {
        setSavedConfigs(response.data.configs)
      }
    } catch (error) {
      console.error('Error loading configs:', error)
    }
  }

  const handleNext = () => {
    if (step === 1 && !selectedCategory) {
      alert('يرجى اختيار الفئة')
      return
    }
    if (step === 2 && !selectedPaperSize) {
      alert('يرجى اختيار القياس')
      return
    }
    if (step === 3 && !selectedPrintType) {
      alert('يرجى اختيار نوع الطباعة')
      return
    }
    if (step === 4 && selectedPrintType === 'color' && !selectedQualityType) {
      alert('يرجى اختيار نوع الدقة')
      return
    }
    if (step === 5 && pricePerPage <= 0) {
      alert('يرجى إدخال سعر صحيح')
      return
    }
    
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSave = async () => {
    try {
      const response = await pricingHierarchicalAPI.createConfig({
        category_id: selectedCategory,
        paper_size: selectedPaperSize,
        paper_type: selectedPaperType || null,
        print_type: selectedPrintType,
        quality_type: selectedPrintType === 'color' ? selectedQualityType : null,
        price_per_page: pricePerPage,
        unit: 'صفحة'
      })
      
      if (response.data.success) {
        alert('تم حفظ السعر بنجاح!')
        // إعادة تعيين النموذج
        setStep(1)
        setSelectedCategory(null)
        setSelectedPaperSize('')
        setSelectedPaperType('')
        setSelectedPrintType('')
        setSelectedQualityType('')
        setPricePerPage(0)
        loadSavedConfigs()
      }
    } catch (error: any) {
      console.error('Error saving config:', error)
      alert(error.response?.data?.detail || 'خطأ في حفظ السعر')
    }
  }

  const handleDelete = async (configId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السعر؟')) return
    
    try {
      const response = await pricingHierarchicalAPI.deleteConfig(configId)
      if (response.data.success) {
        alert('تم الحذف بنجاح')
        loadSavedConfigs()
      }
    } catch (error: any) {
      console.error('Error deleting config:', error)
      alert(error.response?.data?.detail || 'خطأ في الحذف')
    }
  }

  const getCurrentCategoryName = () => {
    const cat = categories.find(c => c.id === selectedCategory)
    return cat ? cat.name_ar : ''
  }

  if (loading) {
    return <div className="pricing-wizard-loading">جاري التحميل...</div>
  }

  return (
    <div className="pricing-wizard">
      <div className="wizard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>إضافة أسعار جديدة</h1>
          <Link to="/dashboard/pricing" className="btn btn-secondary">
            العودة إلى قائمة الأسعار
          </Link>
        </div>
        <p>اتبع الخطوات أدناه لإضافة سعر جديد</p>
      </div>

      {/* Progress Steps */}
      <div className="wizard-progress">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className={`progress-step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
            <div className="step-number">{step > s ? <Check size={16} /> : s}</div>
            <div className="step-label">
              {s === 1 && 'الفئة'}
              {s === 2 && 'القياس'}
              {s === 3 && 'نوع الورق'}
              {s === 4 && 'نوع الطباعة'}
              {s === 5 && 'الدقة'}
              {s === 6 && 'السعر'}
            </div>
          </div>
        ))}
      </div>

      {/* Wizard Content */}
      <div className="wizard-content">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="wizard-step">
            <h2>اختر الفئة</h2>
            <div className="options-grid">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`option-card ${selectedCategory === cat.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className="option-icon">{cat.icon || '📄'}</div>
                  <div className="option-name">{cat.name_ar}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Paper Size */}
        {step === 2 && (
          <div className="wizard-step">
            <h2>اختر القياس</h2>
            <p className="step-info">الفئة المختارة: <strong>{getCurrentCategoryName()}</strong></p>
            <div className="options-grid">
              {PAPER_SIZES.map(size => (
                <button
                  key={size}
                  className={`option-button ${selectedPaperSize === size ? 'selected' : ''}`}
                  onClick={() => setSelectedPaperSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Paper Type */}
        {step === 3 && (
          <div className="wizard-step">
            <h2>اختر نوع الورق (اختياري)</h2>
            <p className="step-info">يمكنك تخطي هذه الخطوة إذا كان السعر ينطبق على جميع أنواع الورق</p>
            <div className="options-grid">
              <button
                className={`option-button ${selectedPaperType === '' ? 'selected' : ''}`}
                onClick={() => setSelectedPaperType('')}
              >
                جميع الأنواع
              </button>
              {PAPER_TYPES.map(type => (
                <button
                  key={type}
                  className={`option-button ${selectedPaperType === type ? 'selected' : ''}`}
                  onClick={() => setSelectedPaperType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Print Type */}
        {step === 4 && (
          <div className="wizard-step">
            <h2>اختر نوع الطباعة</h2>
            <div className="options-grid">
              {PRINT_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`option-button large ${selectedPrintType === type.value ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPrintType(type.value)
                    if (type.value === 'bw') {
                      setSelectedQualityType('')
                    }
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Quality Type (only for color) */}
        {step === 5 && selectedPrintType === 'color' && (
          <div className="wizard-step">
            <h2>اختر نوع الدقة</h2>
            <p className="step-info">نوع الطباعة: <strong>ملون</strong></p>
            <div className="options-grid">
              {QUALITY_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`option-button large ${selectedQualityType === type.value ? 'selected' : ''}`}
                  onClick={() => setSelectedQualityType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5/6: Price */}
        {((step === 5 && selectedPrintType === 'bw') || (step === 6 && selectedPrintType === 'color')) && (
          <div className="wizard-step">
            <h2>أدخل السعر</h2>
            <div className="price-input-container">
              <label>السعر لكل صفحة (ل.س)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerPage}
                onChange={(e) => setPricePerPage(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="price-input"
              />
            </div>
            <div className="summary-box">
              <h3>ملخص الإعدادات:</h3>
              <div className="summary-item">
                <span>الفئة:</span>
                <strong>{getCurrentCategoryName()}</strong>
              </div>
              <div className="summary-item">
                <span>القياس:</span>
                <strong>{selectedPaperSize}</strong>
              </div>
              {selectedPaperType && (
                <div className="summary-item">
                  <span>نوع الورق:</span>
                  <strong>{selectedPaperType}</strong>
                </div>
              )}
              <div className="summary-item">
                <span>نوع الطباعة:</span>
                <strong>{PRINT_TYPES.find(t => t.value === selectedPrintType)?.label}</strong>
              </div>
              {selectedPrintType === 'color' && selectedQualityType && (
                <div className="summary-item">
                  <span>الدقة:</span>
                  <strong>{QUALITY_TYPES.find(t => t.value === selectedQualityType)?.label}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="wizard-actions">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              السابق
            </button>
          )}
          {step < 5 || (step === 5 && selectedPrintType === 'color') ? (
            <button className="btn btn-primary" onClick={handleNext}>
              التالي
              <ChevronRight size={18} />
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSave}>
              حفظ السعر
              <Check size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Saved Configs List */}
      <div className="saved-configs">
        <h2>الأسعار المحفوظة</h2>
        {savedConfigs.length === 0 ? (
          <p className="no-configs">لا توجد أسعار محفوظة بعد</p>
        ) : (
          <div className="configs-table">
            <table>
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>القياس</th>
                  <th>نوع الورق</th>
                  <th>نوع الطباعة</th>
                  <th>الدقة</th>
                  <th>السعر</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {savedConfigs.map(config => {
                  const cat = categories.find(c => c.id === config.category_id)
                  return (
                    <tr key={config.id}>
                      <td>{cat?.name_ar || '-'}</td>
                      <td>{config.paper_size}</td>
                      <td>{config.paper_type || 'جميع الأنواع'}</td>
                      <td>{config.print_type === 'bw' ? 'أبيض وأسود' : 'ملون'}</td>
                      <td>{config.quality_type === 'laser' ? 'ليزرية' : config.quality_type === 'standard' ? 'عادية' : '-'}</td>
                      <td><strong>{config.price_per_page.toLocaleString()} ل.س</strong></td>
                      <td>
                        <button className="btn-delete" onClick={() => handleDelete(config.id)}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

