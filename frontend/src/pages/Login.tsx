import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import { LogIn, Mail, Phone, Lock } from 'lucide-react'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      showError('الرجاء إدخال اسم المستخدم وكلمة المرور')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.login(username, password)
      const loginData = response.data
      
      // Store token and user data
      localStorage.setItem('auth_token', loginData.access_token)
      localStorage.setItem('user_data', JSON.stringify(loginData.user))
      
      showSuccess(`مرحباً ${loginData.user.name}!`)
      
      // Redirect based on user type
      const userType = loginData.user.user_type.name_ar
      if (userType === 'موظف') {
        // Employee goes directly to orders
        navigate('/dashboard/orders')
      } else if (userType === 'مدير') {
        // Admin goes to dashboard home
        navigate('/dashboard')
      } else {
        // Customer goes to home
        navigate('/')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'فشل تسجيل الدخول'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={48} />
          </div>
          <h1>تسجيل الدخول</h1>
          <p>سجل دخولك للوصول إلى لوحة التحكم</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              <Mail size={18} />
              <span>رقم الهاتف أو البريد الإلكتروني</span>
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل رقم الهاتف أو البريد الإلكتروني"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              <span>كلمة المرور</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="login-footer">
          <p>خوام للطباعة © 2024</p>
        </div>
      </div>
    </div>
  )
}

