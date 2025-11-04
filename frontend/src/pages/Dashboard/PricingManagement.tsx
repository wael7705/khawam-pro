import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calculator, ToggleLeft, ToggleRight, Search, Settings } from 'lucide-react'
import { pricingAPI } from '../../lib/api'
import { Link } from 'react-router-dom'
import './PricingManagement.css'

interface PricingRule {
  id: number
  name_ar: string
  name_en?: string
  description_ar?: string
  description_en?: string
  calculation_type: 'piece' | 'area' | 'page'
  base_price: number
  price_multipliers?: {
    color?: { bw?: number; color?: number }
    sides?: { single?: number; double?: number }
    [key: string]: any
  }
  specifications?: {
    paper_size?: string
    paper_type?: string
    color?: boolean
    [key: string]: any
  }
  unit?: string
  is_active: boolean
  display_order: number
}

export default function PricingManagement() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadRules()
  }, [])

  // Filter rules based on search query
  const filteredRules = rules.filter(rule => {
    const query = searchQuery.toLowerCase()
    return (
      rule.name_ar.toLowerCase().includes(query) ||
      (rule.name_en && rule.name_en.toLowerCase().includes(query)) ||
      (rule.description_ar && rule.description_ar.toLowerCase().includes(query))
    )
  })

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await pricingAPI.getAll()
      if (response.data.success) {
        setRules(response.data.rules || [])
      }
    } catch (error) {
      console.error('Error loading pricing rules:', error)
      alert('خطأ في جلب قواعد الأسعار')
    } finally {
      setLoading(false)
    }
  }

  const [isAdding, setIsAdding] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    calculation_type: 'piece' as 'piece' | 'area' | 'page',
    base_price: 0,
    unit: '',
    is_active: true,
    display_order: 0,
    // Multipliers
    color_bw: 1.0,
    color_color: 1.5,
    sides_single: 1.0,
    sides_double: 1.3,
    // Specifications
    paper_size: 'A4',
    paper_type: 'normal',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const price_multipliers: any = {}
      
      // إضافة معاملات اللون إذا كانت مختلفة عن القيم الافتراضية
      if (formData.color_bw !== 1.0 || formData.color_color !== 1.5) {
        price_multipliers.color = {
          bw: formData.color_bw,
          color: formData.color_color,
        }
      }
      
      // إضافة معاملات الوجهين إذا كانت مختلفة عن القيم الافتراضية
      if (formData.sides_single !== 1.0 || formData.sides_double !== 1.3) {
        price_multipliers.sides = {
          single: formData.sides_single,
          double: formData.sides_double,
        }
      }

      const specifications: any = {}
      if (formData.paper_size) specifications.paper_size = formData.paper_size
      if (formData.paper_type) specifications.paper_type = formData.paper_type

      const data = {
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        description_ar: formData.description_ar || undefined,
        description_en: formData.description_en || undefined,
        calculation_type: formData.calculation_type,
        base_price: formData.base_price,
        price_multipliers: Object.keys(price_multipliers).length > 0 ? price_multipliers : undefined,
        specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
        unit: formData.unit || undefined,
        is_active: formData.is_active,
        display_order: formData.display_order,
      }

      if (editingRule) {
        await pricingAPI.update(editingRule.id, data)
        alert('تم تحديث قاعدة السعر بنجاح')
      } else {
        await pricingAPI.create(data)
        alert('تم إنشاء قاعدة السعر بنجاح')
      }

      setIsAdding(false)
      setEditingRule(null)
      loadRules()
      resetForm()
    } catch (error: any) {
      console.error('Error saving pricing rule:', error)
      alert(error.response?.data?.detail || 'خطأ في حفظ قاعدة السعر')
    }
  }

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule)
    setFormData({
      name_ar: rule.name_ar,
      name_en: rule.name_en || '',
      description_ar: rule.description_ar || '',
      description_en: rule.description_en || '',
      calculation_type: rule.calculation_type,
      base_price: rule.base_price,
      unit: rule.unit || '',
      is_active: rule.is_active,
      display_order: rule.display_order,
      color_bw: rule.price_multipliers?.color?.bw || 1.0,
      color_color: rule.price_multipliers?.color?.color || 1.5,
      sides_single: rule.price_multipliers?.sides?.single || 1.0,
      sides_double: rule.price_multipliers?.sides?.double || 1.3,
      paper_size: rule.specifications?.paper_size || 'A4',
      paper_type: rule.specifications?.paper_type || 'normal',
    })
    setIsAdding(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه قاعدة السعر؟')) return
    
    try {
      await pricingAPI.delete(id)
      alert('تم حذف قاعدة السعر بنجاح')
      loadRules()
    } catch (error: any) {
      console.error('Error deleting pricing rule:', error)
      alert(error.response?.data?.detail || 'خطأ في حذف قاعدة السعر')
    }
  }

  const toggleActive = async (rule: PricingRule) => {
    try {
      await pricingAPI.update(rule.id, { is_active: !rule.is_active })
      loadRules()
    } catch (error: any) {
      console.error('Error toggling rule:', error)
      alert('خطأ في تحديث حالة قاعدة السعر')
    }
  }

  const resetForm = () => {
    setFormData({
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      calculation_type: 'piece',
      base_price: 0,
      unit: '',
      is_active: true,
      display_order: 0,
      color_bw: 1.0,
      color_color: 1.5,
      sides_single: 1.0,
      sides_double: 1.3,
      paper_size: 'A4',
      paper_type: 'normal',
    })
  }

  const getCalculationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      piece: 'بالقطعة',
      area: 'بالمتر المربع',
      page: 'بالصفحة',
    }
    return labels[type] || type
  }

  return (
    <div className="pricing-management">
      <div className="section-header">
        <div>
          <h1>إدارة الأسعار</h1>
          <p>إدارة قواعد الأسعار والخدمات المالية</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/dashboard/pricing/wizard" className="btn btn-secondary">
            <Settings size={20} />
            إضافة أسعار (خطوة بخطوة)
          </Link>
          <button className="btn btn-primary" onClick={() => { resetForm(); setIsAdding(true); setEditingRule(null) }}>
            <Plus size={20} />
            إضافة قاعدة سعر
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <>
          {/* Search Box */}
          <div className="search-box-container">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="ابحث عن قاعدة سعر بالعربي أو الإنجليزي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="empty-state">
              <p>لا توجد قواعد أسعار حتى الآن</p>
              <button className="btn btn-primary" onClick={() => { resetForm(); setIsAdding(true) }}>
                <Plus size={20} />
                إضافة قاعدة سعر جديدة
              </button>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="empty-state">
              <p>لم يتم العثور على قواعد أسعار تطابق البحث</p>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                مسح البحث
              </button>
            </div>
          ) : (
            <div className="pricing-table-container">
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th>اسم قاعدة السعر</th>
                    <th>الوحدة</th>
                    <th>السعر الأساسي</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map(rule => (
                    <tr key={rule.id} className={!rule.is_active ? 'inactive' : ''}>
                      <td>
                        <div className="rule-name-cell">
                          <strong>{rule.name_ar}</strong>
                          {rule.name_en && <span className="rule-english">{rule.name_en}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="unit-value">{rule.unit || '-'}</span>
                      </td>
                      <td>
                        <strong className="price-value">{rule.base_price.toLocaleString()} ل.س</strong>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="icon-btn edit" onClick={() => handleEdit(rule)} title="تعديل">
                            <Edit size={18} />
                          </button>
                          <button className="icon-btn delete" onClick={() => handleDelete(rule.id)} title="حذف">
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
        </>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingRule) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingRule(null); resetForm() }}>
          <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRule ? 'تعديل قاعدة السعر' : 'إضافة قاعدة سعر جديدة'}</h2>
            
            <form className="pricing-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>اسم قاعدة السعر (عربي) *</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>اسم قاعدة السعر (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>نوع الحساب *</label>
                  <select
                    value={formData.calculation_type}
                    onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                    required
                  >
                    <option value="piece">بالقطعة</option>
                    <option value="area">بالمتر المربع</option>
                    <option value="page">بالصفحة</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>السعر الأساسي *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>الوحدة</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="قطعة، متر مربع، صفحة..."
                  />
                </div>

                <div className="form-group">
                  <label>ترتيب العرض</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>الوصف (عربي)</label>
                <textarea
                  rows={3}
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div className="form-section">
                <h3>معاملات السعر (اختياري)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>معامل الأبيض والأسود</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.color_bw}
                      onChange={(e) => setFormData({ ...formData, color_bw: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>معامل الملون</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.color_color}
                      onChange={(e) => setFormData({ ...formData, color_color: parseFloat(e.target.value) || 1.5 })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>معامل الوجه الواحد</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sides_single}
                      onChange={(e) => setFormData({ ...formData, sides_single: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>معامل الوجهين</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sides_double}
                      onChange={(e) => setFormData({ ...formData, sides_double: parseFloat(e.target.value) || 1.3 })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>المواصفات (اختياري)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>حجم الورق</label>
                    <input
                      type="text"
                      value={formData.paper_size}
                      onChange={(e) => setFormData({ ...formData, paper_size: e.target.value })}
                      placeholder="A4, A3..."
                    />
                  </div>

                  <div className="form-group">
                    <label>نوع الورق</label>
                    <input
                      type="text"
                      value={formData.paper_type}
                      onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
                      placeholder="عادي، ورق مصقول..."
                    />
                  </div>
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
                  onClick={() => { setIsAdding(false); setEditingRule(null); resetForm() }}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRule ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

