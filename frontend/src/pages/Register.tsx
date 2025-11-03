import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import { isAuthenticated } from '../lib/auth'
import { UserPlus, Mail, Phone, Lock, User } from 'lucide-react'
import './Register.css'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    user_type: 'عميل' // Default to customer
  })
  const [loading, setLoading] = useState(false)

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/')
    }
  }, [navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name || !formData.password) {
      showError('الاسم وكلمة المرور مطلوبان')
      return
    }

    if (!formData.email && !formData.phone) {
      showError('يجب إدخال البريد الإلكتروني أو رقم الهاتف')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      showError('كلمات المرور غير متطابقة')
      return
    }

    if (formData.password.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.register(formData)
      showSuccess('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول')
      navigate('/login')
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'فشل إنشاء الحساب'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <div className="register-logo">
            <UserPlus size={48} />
          </div>
          <h1>إنشاء حساب جديد</h1>
          <p>سجل حسابك للوصول إلى جميع الميزات</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">
              <User size={18} />
              <span>الاسم الكامل *</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أدخل اسمك الكامل"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              <span>البريد الإلكتروني</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              <Phone size={18} />
              <span>رقم الهاتف</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0966320114 أو +963955773227"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              <span>كلمة المرور *</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="6 أحرف على الأقل"
              minLength={6}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={18} />
              <span>تأكيد كلمة المرور *</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="أعد إدخال كلمة المرور"
              minLength={6}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </button>

          <div className="register-footer">
            <p>لديك حساب بالفعل؟ <a href="/login">تسجيل الدخول</a></p>
          </div>
        </form>
      </div>
    </div>
  )
}

