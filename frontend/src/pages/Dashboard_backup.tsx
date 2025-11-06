import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart as ShoppingCartIcon, Package, Palette, Briefcase, Edit, ChevronLeft, ChevronRight, Users, Sparkles, Home as HomeIcon, DollarSign, CreditCard } from 'lucide-react'
import DashboardHome from './Dashboard/DashboardHome'
import OrdersManagement from './Dashboard/OrdersManagement'
import OrderDetail from './Dashboard/OrderDetail'
import ProductsManagement from './Dashboard/ProductsManagement'
import ServicesManagement from './Dashboard/ServicesManagement'
import WorksManagement from './Dashboard/WorksManagement'
import CustomersManagement from './Dashboard/CustomersManagement'
import PricingManagement from './Dashboard/PricingManagement'
import PricingWizard from './Dashboard/PricingWizard'
import PaymentSettings from './Dashboard/PaymentSettings'
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
    { id: 'home', name: 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©', icon: LayoutDashboard, path: '/dashboard', adminOnly: true },
    { id: 'orders', name: 'Ø§Ù„Ø·Ù„Ø¨Ø§Øª', icon: ShoppingCartIcon, path: '/dashboard/orders', adminOnly: false },
    { id: 'customers', name: 'Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡', icon: Users, path: '/dashboard/customers', adminOnly: true },
    { id: 'products', name: 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', icon: Package, path: '/dashboard/products', adminOnly: true },
    { id: 'services', name: 'Ø§Ù„Ø®Ø¯Ù…Ø§Øª', icon: Palette, path: '/dashboard/services', adminOnly: true },
    { id: 'works', name: 'Ø§Ù„Ø£Ø¹Ù…Ø§Ù„', icon: Briefcase, path: '/dashboard/works', adminOnly: true },
    { id: 'pricing', name: 'Ø¥Ø¯Ø§Ø±Ø© Ù…Ø§Ù„ÙŠØ©', icon: DollarSign, path: '/dashboard/pricing', adminOnly: true },
    { id: 'payments', name: 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¯ÙØ¹', icon: CreditCard, path: '/dashboard/payments', adminOnly: true },
    { id: 'studio', name: 'Ø§Ù„Ø§Ø³ØªØ¯ÙŠÙˆ', icon: Sparkles, path: '/dashboard/studio', adminOnly: false },
  ]

  // Filter tabs based on user type
  const tabs = allTabs.filter(tab => {
    if (isEmployee()) {
      // Employee sees: home (Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©), orders (Ø§Ù„Ø·Ù„Ø¨Ø§Øª), and studio (Ø§Ù„Ø§Ø³ØªØ¯ÙŠÙˆ)
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
    if (path === '/dashboard' || path === '/dashboard/') {
      // Ø§Ù„Ù…ÙˆØ¸Ù ÙŠØ¨Ø¯Ø£ Ù…Ù† Ø§Ù„Ø·Ù„Ø¨Ø§ØªØŒ Ø§Ù„Ù…Ø¯ÙŠØ± Ù…Ù† Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
      return isEmployee() ? 'orders' : 'home'
    }
    if (path.startsWith('/dashboard/orders')) return 'orders'
    if (path.startsWith('/dashboard/customers')) return 'customers'
    if (path.startsWith('/dashboard/products')) return 'products'
    if (path.startsWith('/dashboard/services')) return 'services'
    if (path.startsWith('/dashboard/works')) return 'works'
    if (path.startsWith('/dashboard/pricing')) return 'pricing'
    if (path.startsWith('/dashboard/payments')) return 'payments'
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
                <h2>Ø®ÙˆØ§Ù…</h2>
                <p>Ù†Ø¸Ø§Ù… Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</p>
              </>
            )}
          </div>
          
          <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'ØªÙˆØ³ÙŠØ¹ Ø§Ù„Ø´Ø±ÙŠØ· Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠ' : 'Ø·ÙŠ Ø§Ù„Ø´Ø±ÙŠØ· Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠ'}>
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
              {/* Show "Go to Website" button for all users */}
                <Link to="/" className="go-to-website-btn">
                  <HomeIcon size={18} />
                <span>Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©</span>
                </Link>
              {isAdmin() && (
                <button className="language-btn">
                  <span>EN</span>
                  <Edit size={16} />
                </button>
              )}
            </div>
          )}
          
          {/* Collapsed sidebar: show home button for all users */}
          {sidebarCollapsed && (
            <div className="sidebar-collapsed-footer">
              <Link to="/" className="go-to-website-btn-collapsed" title="Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©">
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
            {isAdmin() && <Route path="/pricing" element={<PricingManagement />} />}
            {isAdmin() && <Route path="/pricing/wizard" element={<PricingWizard />} />}
            {isAdmin() && <Route path="/payments" element={<PaymentSettings />} />}
            <Route path="/studio" element={<Studio />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="*" element={<Navigate to={isEmployee() ? "/dashboard/orders" : "/dashboard"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

