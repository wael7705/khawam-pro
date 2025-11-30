import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import UserMenu from './UserMenu'
import { isAuthenticated, isAdmin, isEmployee, getUserData } from '../lib/auth'
import './Navbar.css'

export default function Navbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [showStudio, setShowStudio] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    // تحديث حالة الأزرار عند تغيير بيانات المستخدم
    if (isAuthenticated()) {
      const user = getUserData()
      if (user) {
        const userType = user.user_type?.name_ar
        setShowStudio(userType === 'مدير' || userType === 'موظف')
        setShowDashboard(userType === 'مدير')
      }
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <nav className="navbar">
      <div className="container">
      <div className="navbar-content">
        <div className="nav-left">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          
          <div className="nav-links">
            <Link to="/">الرئيسية</Link>
            <Link to="/services">الخدمات</Link>
            <Link to="/orders">طلباتي</Link>
            <Link to="/portfolio">أعمالنا</Link>
            <Link to="/contact">تواصل</Link>
          </div>
        </div>
        
        <div className="nav-right">
          {/* Show Studio for admin and employee */}
          {isAuthenticated() && showStudio && (
              <Link to="/studio" className="btn btn-primary">استيديو</Link>
          )}
          {/* Show Dashboard only for admin */}
          {isAuthenticated() && showDashboard && (
              <Link to="/dashboard" className="btn btn-secondary">لوحة التحكم</Link>
          )}
          <UserMenu />
        </div>
      </div>
      </div>
    </nav>
  )
}

