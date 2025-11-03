import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import UserMenu from './UserMenu'
import { isAuthenticated, isAdmin, isEmployee } from '../lib/auth'
import './Navbar.css'

export default function Navbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

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
            <Link to="/products">المنتجات</Link>
            <Link to="/portfolio">أعمالنا</Link>
            <Link to="/contact">تواصل</Link>
          </div>
        </div>
        
        <div className="nav-right">
          {/* Show Studio for admin and employee */}
          {isAuthenticated() && (isAdmin() || isEmployee()) && (
            <Link to="/studio" className="btn btn-primary">استيديو</Link>
          )}
          {/* Show Dashboard only for admin */}
          {isAuthenticated() && isAdmin() && (
            <Link to="/dashboard" className="btn btn-secondary">لوحة التحكم</Link>
          )}
          <UserMenu />
          <div className="logo">خوام</div>
        </div>
      </div>
      </div>
    </nav>
  )
}

