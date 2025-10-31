import { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, Palette, Briefcase, Edit, Eye, EyeOff } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('home')

  // Check if we're on order detail page
  const isOrderDetail = location.pathname.includes('/dashboard/orders/')

  const tabs = [
    { id: 'home', name: 'الرئيسية', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'orders', name: 'الطلبات', icon: ShoppingCart, path: '/dashboard/orders' },
    { id: 'products', name: 'المنتجات', icon: Package, path: '/dashboard/products' },
    { id: 'services', name: 'الخدمات', icon: Palette, path: '/dashboard/services' },
    { id: 'works', name: 'الأعمال', icon: Briefcase, path: '/dashboard/works' },
  ]

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id)
    navigate(tab.path)
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>خوام</h2>
            <p>نظام الإدارة</p>
          </div>
          
          <nav className="sidebar-nav">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                >
                  <Icon size={20} />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="language-btn">
              <span>EN</span>
              <Edit size={16} />
            </button>
          </div>
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
