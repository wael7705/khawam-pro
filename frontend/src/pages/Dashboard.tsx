import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart as ShoppingCartIcon, Package, Palette, Briefcase, Edit, ChevronLeft, ChevronRight, Users, Sparkles, Home as HomeIcon } from 'lucide-react'
import DashboardHome from './Dashboard/DashboardHome'
import OrdersManagement from './Dashboard/OrdersManagement'
import OrderDetail from './Dashboard/OrderDetail'
import ProductsManagement from './Dashboard/ProductsManagement'
import ServicesManagement from './Dashboard/ServicesManagement'
import WorksManagement from './Dashboard/WorksManagement'
import CustomersManagement from './Dashboard/CustomersManagement'
import Studio from './Studio'
import ProfileSettings from './ProfileSettings'
import { isEmployee, isAdmin, getUserData, isAuthenticated } from '../lib/auth'
import './Dashboard.css'

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname))
      return
    }

    const user = getUserData()
    if (user) {
      setUserType(user.user_type.name_ar)
    }
  }, [navigate, location])

  // Define tabs based on user type
  const allTabs = [
    { id: 'home', name: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard', adminOnly: true },
    { id: 'orders', name: 'الطلبات', icon: ShoppingCartIcon, path: '/dashboard/orders', adminOnly: false },
    { id: 'customers', name: 'العملاء', icon: Users, path: '/dashboard/customers', adminOnly: true },
    { id: 'products', name: 'المنتجات', icon: Package, path: '/dashboard/products', adminOnly: true },
    { id: 'services', name: 'الخدمات', icon: Palette, path: '/dashboard/services', adminOnly: true },
    { id: 'works', name: 'الأعمال', icon: Briefcase, path: '/dashboard/works', adminOnly: true },
    { id: 'studio', name: 'الاستديو', icon: Sparkles, path: '/dashboard/studio', adminOnly: false },
  ]

  // Filter tabs based on user type
  const tabs = allTabs.filter(tab => {
    if (isEmployee()) {
      // Employee sees: home (الرئيسية), orders (الطلبات), and studio (الاستديو)
      return tab.id === 'home' || tab.id === 'orders' || tab.id === 'studio'
    }
    if (isAdmin()) {
      // Admin sees all tabs (including dashboard home and studio)
      return true
    }
    // Default: show all tabs
    return true
  })

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/dashboard/') return isEmployee() ? 'orders' : 'home'
    if (path.startsWith('/dashboard/orders')) return 'orders'
    if (path.startsWith('/dashboard/customers')) return 'customers'
    if (path.startsWith('/dashboard/products')) return 'products'
    if (path.startsWith('/dashboard/services')) return 'services'
    if (path.startsWith('/dashboard/works')) return 'works'
    if (path.startsWith('/dashboard/studio')) return 'studio'
    return isEmployee() ? 'orders' : 'home'
  }

  const activeTab = getActiveTab()

  const handleTabClick = (tab: typeof tabs[0]) => {
    navigate(tab.path)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            {!sidebarCollapsed && (
              <>
                <h2>خوام</h2>
                <p>نظام الإدارة</p>
              </>
            )}
          </div>
          
          <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}>
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          
          <nav className="sidebar-nav">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                  title={sidebarCollapsed ? tab.name : ''}
                >
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{tab.name}</span>}
                </button>
              )
            })}
          </nav>

          {!sidebarCollapsed && (
            <div className="sidebar-footer">
              {/* Show "Go to Website" button for employees */}
              {isEmployee() && (
                <Link to="/" className="go-to-website-btn">
                  <HomeIcon size={18} />
                  <span>الانتقال إلى الموقع</span>
                </Link>
              )}
              {isAdmin() && (
                <button className="language-btn">
                  <span>EN</span>
                  <Edit size={16} />
                </button>
              )}
            </div>
          )}
          
          {/* Collapsed sidebar: show home button for employees */}
          {sidebarCollapsed && isEmployee() && (
            <div className="sidebar-collapsed-footer">
              <Link to="/" className="go-to-website-btn-collapsed" title="الانتقال إلى الموقع">
                <HomeIcon size={20} />
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <Routes>
            {!isEmployee() && <Route path="/" element={<DashboardHome />} />}
            <Route path="/orders" element={<OrdersManagement />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            {isAdmin() && <Route path="/customers" element={<CustomersManagement />} />}
            {isAdmin() && <Route path="/products" element={<ProductsManagement />} />}
            {isAdmin() && <Route path="/services" element={<ServicesManagement />} />}
            {isAdmin() && <Route path="/works" element={<WorksManagement />} />}
            <Route path="/studio" element={<Studio />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="*" element={<Navigate to={isEmployee() ? "/dashboard/orders" : "/dashboard"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
