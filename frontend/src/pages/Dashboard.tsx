import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, Palette, Briefcase, Edit, Eye, EyeOff } from 'lucide-react'
import DashboardHome from './Dashboard/DashboardHome'
import OrdersManagement from './Dashboard/OrdersManagement'
import ProductsManagement from './Dashboard/ProductsManagement'
import ServicesManagement from './Dashboard/ServicesManagement'
import WorksManagement from './Dashboard/WorksManagement'
import './Dashboard.css'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', name: 'الرئيسية', icon: LayoutDashboard },
    { id: 'orders', name: 'الطلبات', icon: ShoppingCart },
    { id: 'products', name: 'المنتجات', icon: Package },
    { id: 'services', name: 'الخدمات', icon: Palette },
    { id: 'works', name: 'الأعمال', icon: Briefcase },
  ]

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
                  onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'home' && <DashboardHome />}
          {activeTab === 'orders' && <OrdersManagement />}
          {activeTab === 'products' && <ProductsManagement />}
          {activeTab === 'services' && <ServicesManagement />}
          {activeTab === 'works' && <WorksManagement />}
        </main>
      </div>
    </div>
  )
}
