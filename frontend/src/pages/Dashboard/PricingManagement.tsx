import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, DollarSign, Loader2 } from 'lucide-react'
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
}

export default function PricingManagement() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    calculation_type: 'piece' as 'piece' | 'area' | 'page',
    base_price: 0,
    unit: '',
    is_active: true,
    display_order: 0,
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await pricingAPI.getAll()
      if (response.data.success) {
        setRules(response.data.rules || [])
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
      (rule.unit && rule.unit.toLowerCase().includes(query))
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
      const data = {
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        calculation_type: formData.calculation_type,
        base_price: formData.base_price,
        unit: formData.unit || getCalculationTypeLabel(formData.calculation_type),
        is_active: formData.is_active,
        display_order: formData.display_order,
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
    setFormData({
      name_ar: rule.name_ar,
      name_en: rule.name_en || '',
      calculation_type: rule.calculation_type,
      base_price: rule.base_price,
      unit: rule.unit || '',
      is_active: rule.is_active,
      display_order: rule.display_order,
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

  const resetForm = () => {
    setFormData({
      name_ar: '',
      name_en: '',
      calculation_type: 'piece',
      base_price: 0,
      unit: '',
      is_active: true,
      display_order: 0,
    })
    setEditingRule(null)
  }

  const handleAddClick = () => {
    resetForm()
    setIsAdding(true)
  }

  return (
    <div className="pricing-management">
      {/* Header */}
      <div className="pricing-header">
        <div>
          <h1>القواعد المالية</h1>
          <p>إدارة قواعد الأسعار والمواد المالية</p>
        </div>
        <button className="btn-add-pricing" onClick={handleAddClick}>
          <Plus size={20} />
          إضافة قاعدة سعر جديدة
        </button>
      </div>

      {/* Search Box */}
      <div className="search-container">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="ابحث عن مادة بالعربي أو الإنجليزي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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
                    <span className="unit-badge unit-{rule.calculation_type}">
                      {getCalculationTypeLabel(rule.calculation_type)}
                    </span>
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
                ✕
              </button>
            </div>
            
            <form className="pricing-form" onSubmit={handleSubmit}>
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
