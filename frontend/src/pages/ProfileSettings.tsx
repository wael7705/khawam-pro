import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { getUserData, isAuthenticated } from '../lib/auth'
import { showSuccess, showError } from '../utils/toast'
import { Settings, User, Mail, Phone, Lock, Save, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ProfileSettings.css'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    const userData = getUserData()
    if (userData) {
      setUser(userData)
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      showError('الاسم مطلوب')
      return
    }

    setLoading(true)
    try {
      const updateData: any = {
        name: formData.name
      }
      
      if (formData.email) updateData.email = formData.email
      if (formData.phone) updateData.phone = formData.phone

      await authAPI.updateProfile(updateData)
      showSuccess('تم تحديث معلومات الحساب بنجاح')
      
      // Refresh user data
      const response = await authAPI.getMe()
      localStorage.setItem('user_data', JSON.stringify(response.data))
      setUser(response.data)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'فشل تحديث الحساب'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.currentPassword) {
      showError('كلمة المرور الحالية مطلوبة')
      return
    }

    if (!formData.newPassword) {
      showError('كلمة المرور الجديدة مطلوبة')
      return
    }

    if (formData.newPassword.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showError('كلمات المرور غير متطابقة')
      return
    }

    setLoading(true)
    try {
      await authAPI.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      })
      showSuccess('تم تغيير كلمة المرور بنجاح')
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'فشل تغيير كلمة المرور'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="profile-loading">جاري التحميل...</div>
  }

  return (
    <div className="profile-settings-page">
      <div className="profile-container">
        <div className="profile-header">
          <Link to="/dashboard" className="back-button">
            <ArrowLeft size={20} />
            <span>العودة</span>
          </Link>
          <div className="header-content">
            <div className="profile-logo">
              <Settings size={32} />
            </div>
            <h1>إعدادات الحساب</h1>
            <p className="user-type-badge">
              {user.user_type?.name_ar || 'عميل'}
            </p>
          </div>
        </div>

        <div className="profile-content">
          {/* Profile Information Section */}
          <section className="settings-section">
            <h2>المعلومات الشخصية</h2>
            <form onSubmit={handleUpdateProfile} className="settings-form">
              <div className="form-group">
                <label htmlFor="name">
                  <User size={18} />
                  <span>الاسم الكامل</span>
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
                  placeholder="0966320114"
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="save-button"
                disabled={loading}
              >
                <Save size={18} />
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </form>
          </section>

          {/* Change Password Section */}
          <section className="settings-section">
            <h2>تغيير كلمة المرور</h2>
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">
                  <Lock size={18} />
                  <span>كلمة المرور الحالية</span>
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">
                  <Lock size={18} />
                  <span>كلمة المرور الجديدة</span>
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
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
                  <span>تأكيد كلمة المرور</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  minLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="save-button"
                disabled={loading}
              >
                <Lock size={18} />
                {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

