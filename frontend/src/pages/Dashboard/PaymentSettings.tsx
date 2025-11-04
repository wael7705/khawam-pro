import { useState, useEffect } from 'react'
import { CreditCard, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import './PaymentSettings.css'

interface PaymentSettings {
  id?: number
  payment_method: string
  account_name: string
  account_number: string
  phone_number: string | null
  api_key?: string | null
  api_secret?: string | null
  is_active: boolean
  updated_at?: string
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<PaymentSettings>({
    payment_method: 'sham_cash',
    account_name: '',
    account_number: '',
    phone_number: '',
    is_active: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.payments.getSettings()
      if (response.data.success && response.data.settings) {
        setSettings(response.data.settings)
        setFormData({
          payment_method: response.data.settings.payment_method || 'sham_cash',
          account_name: response.data.settings.account_name || '',
          account_number: response.data.settings.account_number || '',
          phone_number: response.data.settings.phone_number || '',
          api_key: response.data.settings.api_key || '',
          api_secret: response.data.settings.api_secret || '',
          is_active: response.data.settings.is_active !== undefined ? response.data.settings.is_active : true
        })
      }
    } catch (error: any) {
      console.error('Error loading payment settings:', error)
      if (error.response?.status !== 404) {
        showError('حدث خطأ في تحميل إعدادات الدفع')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.account_name.trim() || !formData.account_number.trim()) {
      showError('يرجى إدخال اسم الحساب ورقم الحساب')
      return
    }

    try {
      setSaving(true)
      let response
      
      if (settings?.id) {
        // تحديث الإعدادات الموجودة
        response = await adminAPI.payments.updateSettings(settings.id, formData)
      } else {
        // إنشاء إعدادات جديدة
        response = await adminAPI.payments.createSettings(formData)
      }
      
      if (response.data.success) {
        showSuccess('تم حفظ إعدادات الدفع بنجاح')
        await loadSettings()
      }
    } catch (error: any) {
      console.error('Error saving payment settings:', error)
      showError(error.response?.data?.detail || 'حدث خطأ في حفظ إعدادات الدفع')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (loading) {
    return (
      <div className="payment-settings">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>جاري تحميل الإعدادات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-settings">
      <div className="payment-settings-header">
        <div className="header-icon">
          <CreditCard size={24} />
        </div>
        <div>
          <h1>إعدادات الدفع الإلكتروني</h1>
          <p>إدارة بيانات حساب شام كاش لاستقبال المدفوعات</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-settings-form">
        <div className="form-section">
          <h2>معلومات الحساب</h2>
          
          <div className="form-group">
            <label htmlFor="account_name">
              اسم الحساب <span className="required">*</span>
            </label>
            <input
              type="text"
              id="account_name"
              name="account_name"
              value={formData.account_name}
              onChange={handleInputChange}
              placeholder="أدخل اسم الحساب"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="account_number">
              رقم الحساب <span className="required">*</span>
            </label>
            <input
              type="text"
              id="account_number"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              placeholder="أدخل رقم الحساب"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">
              رقم الهاتف المرتبط
            </label>
            <input
              type="text"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number || ''}
              onChange={handleInputChange}
              placeholder="+963..."
            />
          </div>
        </div>

        <div className="form-section">
          <h2>إعدادات API (اختياري)</h2>
          
          <div className="form-group">
            <label htmlFor="api_key">مفتاح API</label>
            <input
              type="password"
              id="api_key"
              name="api_key"
              value={formData.api_key || ''}
              onChange={handleInputChange}
              placeholder="أدخل مفتاح API"
            />
            <small>سيتم تشفير هذا المفتاح عند الحفظ</small>
          </div>

          <div className="form-group">
            <label htmlFor="api_secret">سر API</label>
            <input
              type="password"
              id="api_secret"
              name="api_secret"
              value={formData.api_secret || ''}
              onChange={handleInputChange}
              placeholder="أدخل سر API"
            />
            <small>سيتم تشفير هذا السر عند الحفظ</small>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group checkbox-group">
            <label htmlFor="is_active" className="checkbox-label">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <span>تفعيل طريقة الدفع</span>
            </label>
            <small>عند تفعيل هذه الخيار، سيتمكن العملاء من رؤية معلومات الدفع</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="spinner" size={18} />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={18} />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </form>

      {settings && (
        <div className="settings-info">
          <div className="info-card">
            <CheckCircle2 size={20} className="success-icon" />
            <div>
              <p className="info-label">آخر تحديث</p>
              <p className="info-value">
                {settings.updated_at ? new Date(settings.updated_at).toLocaleDateString('ar-SY') : 'غير محدد'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

