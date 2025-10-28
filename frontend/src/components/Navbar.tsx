import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import UserMenu from './UserMenu'
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
          <Link to="/studio" className="btn btn-primary">استيديو</Link>
          <Link to="/dashboard" className="btn btn-secondary">لوحة التحكم</Link>
          <UserMenu />
          <div className="logo">خوام</div>
        </div>
      </div>
      </div>
    </nav>
  )
}

