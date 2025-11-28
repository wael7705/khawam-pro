import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart as ShoppingCartIcon, Palette, Briefcase, Edit, ChevronLeft, ChevronRight, Users, Sparkles, Home as HomeIcon, DollarSign, CreditCard } from 'lucide-react'
const DashboardHome = lazy(() => import('./Dashboard/DashboardHome'))
import OrdersManagement from './Dashboard/OrdersManagement'
import OrderDetail from './Dashboard/OrderDetail'

import ServicesManagement from './Dashboard/ServicesManagement'
import WorksManagement from './Dashboard/WorksManagement'
import CustomersManagement from './Dashboard/CustomersManagement'
import PricingManagement from './Dashboard/PricingManagement'
import PricingWizard from './Dashboard/PricingWizard'
import PaymentSettings from './Dashboard/PaymentSettings'
import Studio from './Studio'
import ProfileSettings from './ProfileSettings'
import { isEmployee, isAdmin, getUserData, isAuthenticated } from '../lib/auth'
import { useOrderNotifications } from '../hooks/useOrderNotifications'
import OrderNotificationBanner from '../components/OrderNotificationBanner'
import './Dashboard.css'

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [userType, setUserType] = useState<string | null>(null)
  const { notifications, dismissNotification } = useOrderNotifications({
    onNotificationClick: (orderId) => navigate(`/dashboard/orders/${orderId}`),
    enableDesktopNotifications: true
  })

  useEffect(() => {
    // Check authentication - لا نحذف Token تلقائياً، نترك المستخدم مسجل دخول
    const token = isAuthenticated()
    if (!token) {
      // فقط إذا لم يكن هناك Token، نرسل إلى صفحة تسجيل الدخول
      navigate('/login?redirect=' + encodeURIComponent(location.pathname))
      return
    }

    const user = getUserData()
    if (user) {
      const role = user.user_type.name_ar
      setUserType(role)

      // Only admins and employees may stay in dashboard
      if (role !== 'مدير' && role !== 'موظف') {
        // إذا كان المستخدم ليس مديراً أو موظفاً، أرسله إلى الصفحة الرئيسية
        // لكن لا نحذف Token - قد يكون مسجل دخول كعميل
        navigate('/')
      }
    } else {
      // إذا لم تكن هناك بيانات مستخدم، لا نحذف Token تلقائياً
      // قد يكون Token صالحاً لكن البيانات غير موجودة - حاول الحصول عليها من API
      // لكن الآن فقط أرسل إلى الصفحة الرئيسية
      console.warn('⚠️ No user data found, but token exists. User may need to login again.')
      // لا نحذف Token - قد يكون المستخدم مسجل دخول
    }
  }, [navigate, location])

  // Define tabs based on user type
  const allTabs = [
    { id: 'home', name: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard', adminOnly: true },
    { id: 'orders', name: 'الطلبات', icon: ShoppingCartIcon, path: '/dashboard/orders', adminOnly: false },
    { id: 'customers', name: 'العملاء', icon: Users, path: '/dashboard/customers', adminOnly: true },
    { id: 'services', name: 'الخدمات', icon: Palette, path: '/dashboard/services', adminOnly: true },
    { id: 'works', name: 'الأعمال', icon: Briefcase, path: '/dashboard/works', adminOnly: true },
    { id: 'pricing', name: 'إدارة مالية', icon: DollarSign, path: '/dashboard/pricing', adminOnly: true },
    { id: 'payments', name: 'إعدادات الدفع', icon: CreditCard, path: '/dashboard/payments', adminOnly: true },
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
    // Customers should not see dashboard tabs
    return false
  })

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/dashboard/') {
      // الموظف يبدأ من الطلبات، المدير من الرئيسية
      return isEmployee() ? 'orders' : 'home'
    }
    if (path.startsWith('/dashboard/orders')) return 'orders'
    if (path.startsWith('/dashboard/customers')) return 'customers'

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
        <OrderNotificationBanner
          notifications={notifications}
          onDismiss={dismissNotification}
          onViewOrder={(orderId) => navigate(`/dashboard/orders/${orderId}`)}
        />
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
            {isEmployee() && (
              <button
                className="nav-item quick-orders-btn"
                onClick={() => navigate('/dashboard/orders')}
                title={sidebarCollapsed ? 'الذهاب للطلبات' : ''}
              >
                <ShoppingCartIcon size={20} />
                {!sidebarCollapsed && <span>الذهاب مباشرة للطلبات</span>}
              </button>
            )}
          </nav>

          {!sidebarCollapsed && (
            <div className="sidebar-footer">
              {/* Show "Go to Website" button for all users */}
                <Link to="/" className="go-to-website-btn">
                  <HomeIcon size={18} />
                <span>العودة إلى الصفحة الرئيسية</span>
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
              <Link to="/" className="go-to-website-btn-collapsed" title="العودة إلى الصفحة الرئيسية">
                <HomeIcon size={20} />
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <Routes>
            {isAdmin() && (
              <Route 
                path="/" 
                element={
                  <Suspense fallback={<div className="loading" style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل لوحة التحكم...</div>}>
                    <DashboardHome />
                  </Suspense>
                } 
              />
            )}
            {isEmployee() && <Route path="/" element={<OrdersManagement />} />}
            {isEmployee() && <Route path="/orders" element={<OrdersManagement />} />}
            {isEmployee() && <Route path="/orders/:id" element={<OrderDetail />} />}
            {isAdmin() && <Route path="/orders" element={<OrdersManagement />} />}
            {isAdmin() && <Route path="/orders/:id" element={<OrderDetail />} />}
            {isAdmin() && <Route path="/customers" element={<CustomersManagement />} />}

            {isAdmin() && <Route path="/services" element={<ServicesManagement />} />}
            {isAdmin() && <Route path="/works" element={<WorksManagement />} />}
            {isAdmin() && <Route path="/pricing" element={<PricingManagement />} />}
            {isAdmin() && <Route path="/pricing/wizard" element={<PricingWizard />} />}
            {isAdmin() && <Route path="/payments" element={<PaymentSettings />} />}
            {isEmployee() && <Route path="/studio" element={<Studio />} />}
            {isAdmin() && <Route path="/studio" element={<Studio />} />}
            {isAdmin() && <Route path="/profile" element={<ProfileSettings />} />}
            {isEmployee() && <Route path="/profile" element={<ProfileSettings />} />}
            <Route path="*" element={<Navigate to={isAdmin() ? "/dashboard" : isEmployee() ? "/dashboard/orders" : "/"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
