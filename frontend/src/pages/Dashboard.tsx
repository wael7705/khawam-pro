import { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart as ShoppingCartIcon, Package, Palette, Briefcase, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardHome from './Dashboard/DashboardHome'
import OrdersManagement from './Dashboard/OrdersManagement'
import OrderDetail from './Dashboard/OrderDetail'
import ProductsManagement from './Dashboard/ProductsManagement'
import ServicesManagement from './Dashboard/ServicesManagement'
import WorksManagement from './Dashboard/WorksManagement'
import './Dashboard.css'

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const tabs = [
    { id: 'home', name: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'orders', name: 'الطلبات', icon: ShoppingCartIcon, path: '/dashboard/orders' },
    { id: 'products', name: 'المنتجات', icon: Package, path: '/dashboard/products' },
    { id: 'services', name: 'الخدمات', icon: Palette, path: '/dashboard/services' },
    { id: 'works', name: 'الأعمال', icon: Briefcase, path: '/dashboard/works' },
  ]

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/dashboard/') return 'home'
    if (path.startsWith('/dashboard/orders')) return 'orders'
    if (path.startsWith('/dashboard/products')) return 'products'
    if (path.startsWith('/dashboard/services')) return 'services'
    if (path.startsWith('/dashboard/works')) return 'works'
    return 'home'
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
              <button className="language-btn">
                <span>EN</span>
                <Edit size={16} />
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/orders" element={<OrdersManagement />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/products" element={<ProductsManagement />} />
            <Route path="/services" element={<ServicesManagement />} />
            <Route path="/works" element={<WorksManagement />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
