import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, LogIn, LogOut, Settings, ChevronDown, UserPlus } from 'lucide-react'
import { isAuthenticated, getUserData, authAPI as authAPIFromAuth } from '../lib/auth'
import { authAPI } from '../lib/api'
import './UserMenu.css'

export default function UserMenu() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    const userData = getUserData()
    setUser(userData)
    
    // إذا كان name_ar null، حاول تحديث البيانات من API
    if (userData && isAuthenticated() && (!userData.user_type?.name_ar || userData.user_type?.name_ar === null)) {
      // تحديث البيانات من API
      const token = localStorage.getItem('auth_token')
      if (token) {
        authAPI.getMe()
          .then(response => {
            const updatedUser = response.data
            localStorage.setItem('user_data', JSON.stringify(updatedUser))
            setUser(updatedUser)
            // إعادة تحميل الصفحة لتحديث Navbar
            window.location.reload()
          })
          .catch(err => {
            console.error('Error updating user data:', err)
          })
      }
    }
  }, [])

  const isLoggedIn = isAuthenticated()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      setUser(null)
      setIsOpen(false)
      navigate('/')
      window.location.reload() // Refresh to update UI
    } catch (error) {
      // Even if API fails, clear local storage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      setUser(null)
      setIsOpen(false)
      navigate('/')
      window.location.reload()
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'خ'
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate dropdown position for fixed positioning on small screens
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const isSmallScreen = window.innerWidth < 1024
      
      if (isSmallScreen) {
        // Fixed positioning - calculate position relative to viewport
        setDropdownPosition({
          top: buttonRect.bottom + 10,
          right: window.innerWidth - buttonRect.right
        })
      }
    }
  }, [isOpen])

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        ref={buttonRef}
        className="user-menu-btn" 
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        aria-label={isLoggedIn ? 'قائمة المستخدم' : 'تسجيل الدخول'}
        aria-expanded={isOpen}
      >
        {isLoggedIn && user ? (
          <>
            <div className="user-avatar">
              <div className="avatar-initials">{getInitials(user.name)}</div>
            </div>
            <ChevronDown size={16} />
          </>
        ) : (
          <LogIn size={24} />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="user-menu-overlay" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            ref={dropdownRef}
            className="user-menu-dropdown"
            style={window.innerWidth < 1024 ? {
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
              left: 'auto'
            } : {}}
          >
          {isLoggedIn && user ? (
            <>
              <div className="user-info">
                <div className="user-avatar-large">
                  <div className="avatar-initials">{getInitials(user.name)}</div>
                </div>
                <div className="user-details">
                  <div className="user-name">{user.name}</div>
                  <div className="user-email">{user.email || user.phone || 'مستخدم'}</div>
                  <div className="user-type">{user.user_type?.name_ar || 'عميل'}</div>
                </div>
              </div>
              <div className="menu-divider"></div>
              {(user.user_type?.name_ar === 'مدير' || user.user_type?.name_ar === 'موظف') && (
                <>
                  <Link to="/dashboard/profile" className="menu-item" onClick={() => setIsOpen(false)}>
                    <Settings size={18} />
                    <span>إعدادات الحساب</span>
                  </Link>
                  <div className="menu-divider"></div>
                </>
              )}
              <button className="menu-item logout" onClick={handleLogout}>
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <>
              <div className="login-section">
                <Link to="/login" className="menu-item primary" onClick={() => setIsOpen(false)}>
                  <LogIn size={18} />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link to="/register" className="menu-item secondary" onClick={() => setIsOpen(false)}>
                  <UserPlus size={18} />
                  <span>إنشاء حساب جديد</span>
                </Link>
                <p className="login-hint">سجل دخولك أو أنشئ حساباً جديداً</p>
              </div>
            </>
          )}
          </div>
        </>
      )}
    </div>
  )
}
