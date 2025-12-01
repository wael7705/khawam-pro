import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Package, Layers, X } from 'lucide-react'
import { pricingAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import './PricingManagement.css'

interface PricingRule {
  id: number
  name_ar: string
  name_en?: string
  calculation_type: 'piece' | 'area' | 'page'
  base_price: number
  unit?: string
  is_active: boolean
  display_order: number
  specifications?: any
  paper_sizes?: string[]
  paper_type?: string
  print_type?: string
  quality_type?: string
}

const PAPER_SIZES = ['A1', 'A2', 'A3', 'A4', 'A5']
const PAPER_TYPES = [
  { value: 'normal', label: 'عادي' },
  { value: 'cardboard_170', label: 'كرتون 170غ' },
  { value: 'cardboard_250', label: 'كرتون 250غ' },
  { value: 'glossy', label: 'غلاسي' },
  { value: 'matte', label: 'معجن' },
  { value: 'coated', label: 'مقشش' },
]
const PRINT_TYPES = [
  { value: 'bw', label: 'أبيض وأسود' },
  { value: 'color', label: 'ملون' },
]
const QUALITY_TYPES = [
  { value: 'standard', label: 'دقة عادية' },
  { value: 'laser', label: 'دقة عالية (ليزر)' },
]

export default function PricingManagement() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [bulkPercentage, setBulkPercentage] = useState('')
  const [bulkOperation, setBulkOperation] = useState<'increase' | 'decrease'>('increase')
  const [ruleType, setRuleType] = useState<'basic' | 'advanced' | 'flex' | 'rollup'>('basic')

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    calculation_type: 'page' as 'piece' | 'area' | 'page',
    base_price: 0,
    unit: '',
    is_active: true,
    display_order: 0,
    // Advanced fields
    paper_sizes: [] as string[],
    paper_type: '',
    print_type: 'bw',
    quality_type: '',
    // Flex fields
    flex_type: 'pvc',
    // Rollup fields
    frame_price: 0,
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await pricingAPI.getAll()
      if (response.data.success) {
        const rulesData = response.data.rules || []
        // Parse specifications if they exist
        const parsedRules = rulesData.map((rule: any) => {
          if (rule.specifications) {
            try {
              const specs = typeof rule.specifications === 'string' 
                ? JSON.parse(rule.specifications) 
                : rule.specifications
              return {
                ...rule,
                paper_sizes: specs.paper_sizes || [],
                paper_type: specs.paper_type,
                print_type: specs.print_type,
                quality_type: specs.quality_type,
              }
            } catch (e) {
              return rule
            }
          }
          return rule
        })
        setRules(parsedRules)
      }
    } catch (error) {
      console.error('Error loading pricing rules:', error)
      showError('خطأ في جلب قواعد الأسعار')
    } finally {
      setLoading(false)
    }
  }

  // Filter rules based on search query
  const filteredRules = rules.filter(rule => {
    const query = searchQuery.toLowerCase()
    return (
      rule.name_ar.toLowerCase().includes(query) ||
      (rule.name_en && rule.name_en.toLowerCase().includes(query)) ||
      (rule.unit && rule.unit.toLowerCase().includes(query)) ||
      (rule.print_type && rule.print_type.toLowerCase().includes(query))
    )
  })

  const getCalculationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      piece: 'قطعة',
      area: 'متر مربع',
      page: 'صفحة',
    }
    return labels[type] || type
  }

  const getQuantityDisplay = (rule: PricingRule) => {
    const unit = rule.unit || getCalculationTypeLabel(rule.calculation_type)
    return `1 ${unit}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name_ar.trim() || formData.base_price <= 0) {
      showError('يرجى إدخال اسم المادة والسعر')
      return
    }

    try {
      setSaving(true)
      
      let data: any = {
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        calculation_type: formData.calculation_type,
        base_price: formData.base_price,
        unit: formData.unit || getCalculationTypeLabel(formData.calculation_type),
        is_active: formData.is_active,
        display_order: formData.display_order,
      }

      // Add advanced specifications if it's an advanced rule
      if (ruleType === 'advanced') {
        data.specifications = {
          paper_sizes: formData.paper_sizes,
          paper_type: formData.paper_type || undefined,
          print_type: formData.print_type,
          quality_type: formData.quality_type || undefined,
        }
      }

      if (editingRule) {
        await pricingAPI.update(editingRule.id, data)
        showSuccess('تم تحديث قاعدة السعر بنجاح')
      } else {
        await pricingAPI.create(data)
        showSuccess('تم إنشاء قاعدة السعر بنجاح')
      }

      setIsAdding(false)
      setEditingRule(null)
      resetForm()
      loadRules()
    } catch (error: any) {
      console.error('Error saving pricing rule:', error)
      showError(error.response?.data?.detail || 'خطأ في حفظ قاعدة السعر')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule)
    setRuleType(rule.paper_sizes && rule.paper_sizes.length > 0 ? 'advanced' : 'basic')
    setFormData({
      name_ar: rule.name_ar,
      name_en: rule.name_en || '',
      calculation_type: rule.calculation_type,
      base_price: rule.base_price,
      unit: rule.unit || '',
      is_active: rule.is_active,
      display_order: rule.display_order,
      paper_sizes: rule.paper_sizes || [],
      paper_type: rule.paper_type || '',
      print_type: rule.print_type || 'bw',
      quality_type: rule.quality_type || '',
      flex_type: 'pvc',
      frame_price: 0,
    })
    setIsAdding(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه قاعدة السعر؟')) return
    
    try {
      await pricingAPI.delete(id)
      showSuccess('تم حذف قاعدة السعر بنجاح')
      loadRules()
    } catch (error: any) {
      console.error('Error deleting pricing rule:', error)
      showError(error.response?.data?.detail || 'خطأ في حذف قاعدة السعر')
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkPercentage || parseFloat(bulkPercentage) <= 0) {
      showError('يرجى إدخال نسبة صحيحة')
      return
    }

    try {
      setSaving(true)
      await pricingAPI.bulkUpdatePrices({
        percentage: parseFloat(bulkPercentage),
        operation: bulkOperation,
      })
      showSuccess(`تم تحديث جميع الأسعار بنجاح (${bulkOperation === 'increase' ? 'زيادة' : 'نقصان'} ${bulkPercentage}%)`)
      setShowBulkUpdate(false)
      setBulkPercentage('')
      loadRules()
    } catch (error: any) {
      console.error('Error bulk updating prices:', error)
      showError(error.response?.data?.detail || 'خطأ في التحديث الجماعي')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setRuleType('basic')
    setFormData({
      name_ar: '',
      name_en: '',
      calculation_type: 'page',
      base_price: 0,
      unit: '',
      is_active: true,
      display_order: 0,
      paper_sizes: [],
      paper_type: '',
      print_type: 'bw',
      quality_type: '',
      flex_type: 'pvc',
      frame_price: 0,
    })
    setEditingRule(null)
  }

  const handleAddClick = () => {
    resetForm()
    setIsAdding(true)
  }

  const togglePaperSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      paper_sizes: prev.paper_sizes.includes(size)
        ? prev.paper_sizes.filter(s => s !== size)
        : [...prev.paper_sizes, size]
    }))
  }

  return (
    <div className="pricing-management">
      {/* Header */}
      <div className="pricing-header">
        <div>
          <h1>القواعد المالية</h1>
          <p>إدارة قواعد الأسعار والمواد المالية</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-add-pricing" 
            onClick={() => setShowBulkUpdate(true)}
            style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
          >
            <TrendingUp size={20} />
            تحديث جماعي
          </button>
          <button className="btn-add-pricing" onClick={handleAddClick}>
            <Plus size={20} />
            إضافة قاعدة سعر جديدة
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="search-container">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="ابحث عن مادة بالعربي أو الإنجليزي أو نوع الطباعة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Update Modal */}
      {showBulkUpdate && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdate(false)}>
          <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2>تحديث جماعي للأسعار</h2>
                <p>قم بتحديث جميع الأسعار بنسبة مئوية</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowBulkUpdate(false)}
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="pricing-form">
              <div className="form-group">
                <label>النسبة المئوية *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  placeholder="5"
                  required
                />
                <small>أدخل النسبة المئوية (مثلاً: 5 لزيادة 5%)</small>
              </div>

              <div className="form-group">
                <label>نوع العملية *</label>
                <div className="delivery-options" style={{ display: 'flex', gap: '1rem' }}>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="bulkOperation"
                      value="increase"
                      checked={bulkOperation === 'increase'}
                      onChange={() => setBulkOperation('increase')}
                    />
                    <span>زيادة</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="bulkOperation"
                      value="decrease"
                      checked={bulkOperation === 'decrease'}
                      onChange={() => setBulkOperation('decrease')}
                    />
                    <span>نقصان</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBulkUpdate(false)}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={handleBulkUpdate}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      {bulkOperation === 'increase' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      تطبيق التحديث
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>جاري تحميل القواعد المالية...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? 'لم يتم العثور على قواعد تطابق البحث' : 'لا توجد قواعد أسعار حتى الآن'}</p>
          {!searchQuery && (
            <button className="btn-add-pricing" onClick={handleAddClick}>
              <Plus size={20} />
              إضافة قاعدة سعر جديدة
            </button>
          )}
        </div>
      ) : (
        <div className="pricing-table-wrapper">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المادة</th>
                <th>نوع الوحدة</th>
                <th>القياس / النوع</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule, index) => (
                <tr key={rule.id} className={!rule.is_active ? 'inactive' : ''}>
                  <td className="row-number">{rule.id}</td>
                  <td className="material-name">
                    <strong>{rule.name_ar}</strong>
                    {rule.name_en && <span className="name-en">{rule.name_en}</span>}
                  </td>
                  <td>
                    <span className={`unit-badge unit-${rule.calculation_type}`}>
                      {getCalculationTypeLabel(rule.calculation_type)}
                    </span>
                  </td>
                  <td>
                    {rule.paper_sizes && rule.paper_sizes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {rule.paper_sizes.map(size => (
                          <span key={size} className="paper-size-badge">{size}</span>
                        ))}
                      </div>
                    )}
                    {rule.print_type && (
                      <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {rule.print_type === 'bw' ? '⚫ أبيض وأسود' : '🎨 ملون'}
                        {rule.quality_type && ` - ${rule.quality_type === 'laser' ? 'ليزر' : 'عادي'}`}
                      </div>
                    )}
                    {rule.paper_type && (
                      <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {PAPER_TYPES.find(t => t.value === rule.paper_type)?.label || rule.paper_type}
                      </div>
                    )}
                  </td>
                  <td className="quantity-cell">
                    {getQuantityDisplay(rule)}
                  </td>
                  <td className="price-cell">
                    <strong>{rule.base_price.toLocaleString()} ل.س</strong>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="action-btn edit-btn" 
                        onClick={() => handleEdit(rule)}
                        title="تعديل"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        className="action-btn delete-btn" 
                        onClick={() => handleDelete(rule.id)}
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingRule) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); resetForm() }}>
          <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <DollarSign size={24} />
              </div>
              <div>
                <h2>{editingRule ? 'تعديل قاعدة السعر' : 'إضافة قاعدة سعر جديدة'}</h2>
                <p>{editingRule ? 'قم بتعديل بيانات قاعدة السعر' : 'أضف قاعدة سعر جديدة للمواد'}</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => { setIsAdding(false); resetForm() }}
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="pricing-form" onSubmit={handleSubmit}>
              {/* Rule Type Selection */}
              <div className="form-group">
                <label>نوع القاعدة *</label>
                <div className="delivery-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="ruleType"
                      value="basic"
                      checked={ruleType === 'basic'}
                      onChange={() => setRuleType('basic')}
                    />
                    <span>قاعدة أساسية</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="ruleType"
                      value="advanced"
                      checked={ruleType === 'advanced'}
                      onChange={() => setRuleType('advanced')}
                    />
                    <span>قاعدة متقدمة (A1-A5)</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>اسم المادة (عربي) *</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    placeholder="مثال: طباعة A4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>اسم المادة (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Example: A4 Printing"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>نوع الوحدة *</label>
                  <select
                    value={formData.calculation_type}
                    onChange={(e) => {
                      const newType = e.target.value as 'piece' | 'area' | 'page'
                      setFormData({ 
                        ...formData, 
                        calculation_type: newType,
                        unit: formData.unit || getCalculationTypeLabel(newType)
                      })
                    }}
                    required
                  >
                    <option value="piece">قطعة</option>
                    <option value="area">متر مربع</option>
                    <option value="page">صفحة</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>الكمية (الوحدة) *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder={getCalculationTypeLabel(formData.calculation_type)}
                    required
                  />
                  <small>مثال: صفحة، قطعة، متر مربع</small>
                </div>
              </div>

              {/* Advanced Fields */}
              {ruleType === 'advanced' && (
                <>
                  <div className="form-group">
                    <label>القياسات المدعومة *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {PAPER_SIZES.map(size => (
                        <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.paper_sizes.includes(size)}
                            onChange={() => togglePaperSize(size)}
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                    <small>اختر القياسات المدعومة (A1, A2, A3, A4, A5)</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>نوع الطباعة *</label>
                      <select
                        value={formData.print_type}
                        onChange={(e) => setFormData({ ...formData, print_type: e.target.value })}
                        required
                      >
                        {PRINT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.print_type === 'color' && (
                      <div className="form-group">
                        <label>نوع الدقة</label>
                        <select
                          value={formData.quality_type}
                          onChange={(e) => setFormData({ ...formData, quality_type: e.target.value })}
                        >
                          <option value="">اختر نوع الدقة</option>
                          {QUALITY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>نوع الورق</label>
                    <select
                      value={formData.paper_type}
                      onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
                    >
                      <option value="">جميع الأنواع</option>
                      {PAPER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <small>اتركه فارغاً ليطبق على جميع أنواع الورق</small>
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>السعر (ليرة سورية) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ترتيب العرض</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>قاعدة السعر نشطة</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsAdding(false); resetForm() }}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      {editingRule ? 'تحديث' : 'إضافة'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
