import { useState, useRef, useEffect } from 'react'
import { User, LogIn, LogOut, Settings, ChevronDown } from 'lucide-react'
import './UserMenu.css'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        {isLoggedIn ? (
          <>
            <div className="user-avatar">
              <div className="avatar-initials">خ</div>
            </div>
            <ChevronDown size={16} />
          </>
        ) : (
          <LogIn size={24} />
        )}
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          {isLoggedIn ? (
            <>
              <div className="user-info">
                <div className="user-avatar-large">
                  <div className="avatar-initials">خ</div>
                </div>
                <div className="user-details">
                  <div className="user-name">خوام للطباعة</div>
                  <div className="user-email">khawam@info.com</div>
                </div>
              </div>
              <div className="menu-divider"></div>
              <a href="#" className="menu-item">
                <Settings size={18} />
                <span>الإعدادات</span>
              </a>
              <div className="menu-divider"></div>
              <button className="menu-item logout" onClick={() => setIsLoggedIn(false)}>
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <>
              <div className="login-section">
                <button className="menu-item primary" onClick={() => setIsLoggedIn(true)}>
                  <LogIn size={18} />
                  <span>تسجيل الدخول</span>
                </button>
                <p className="login-hint">سجل دخولك للوصول إلى جميع الميزات</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
