import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react'
import './DashboardHome.css'

interface DashboardStats {
  lowStock: number
  totalProducts: number
  activeOrders: number
  totalRevenue: number
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    lowStock: 3,
    totalProducts: 66,
    activeOrders: 67,
    totalRevenue: 1310000
  })

  const [recentOrders, setRecentOrders] = useState([
    {
      id: 1,
      customer: 'عميل استلام ذاتي',
      amount: 0,
      status: 'pending',
      time: '11:02 ص'
    },
    {
      id: 2,
      customer: 'عميل توصيل',
      amount: 140000,
      status: 'delivered',
      time: '08:08 م'
    },
  ])

  const [topProducts, setTopProducts] = useState([
    { id: 1, name: 'Pizza Margarita', sold: 2, price: 140000 },
    { id: 2, name: 'بيتزا باربكيو', sold: 1, price: 70000 },
    { id: 3, name: 'Pizza', sold: 1, price: 70000 },
  ])

  return (
    <div className="dashboard-home">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>مرحباً بك في لوحة التحكم</h1>
          <p>الاثنين، ٢٧ تشرين الأول ٢٠٢٥</p>
        </div>
        <button className="language-btn btn-small">
          EN
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">مواد منخفضة</p>
            <div className="stat-value-group">
              <h3>{stats.lowStock}</h3>
              <span className="stat-trend negative">
                <TrendingDown size={14} />
                3.1% مقارنة بالشهر الماضي
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F9731620', color: '#F97316' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">إجمالي المنتجات</p>
            <div className="stat-value-group">
              <h3>{stats.totalProducts}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">الطلبات النشطة</p>
            <div className="stat-value-group">
              <h3>{stats.activeOrders}</h3>
              <span className="stat-trend positive">
                <TrendingUp size={14} />
                8.2% مقارنة بالشهر الماضي
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F9731620', color: '#F97316' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">إجمالي المبيعات</p>
            <div className="stat-value-group">
              <h3>{stats.totalRevenue.toLocaleString()} ل.س</h3>
              <span className="stat-trend positive">
                <TrendingUp size={14} />
                12.5% مقارنة بالشهر الماضي
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>أفضل الفئات مبيعاً</h3>
          <div className="chart-placeholder">
            <div className="donut-chart"></div>
          </div>
        </div>

        <div className="chart-card">
          <h3>نظرة عامة على المبيعات</h3>
          <div className="chart-placeholder">
            <div className="bar-chart"></div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-grid">
        <div className="activity-card">
          <h3>آخر المعاملات</h3>
          <div className="activity-list">
            {recentOrders.map(order => (
              <div key={order.id} className="activity-item">
                <div className="activity-icon">
                  <div className="activity-avatar">ع</div>
                </div>
                <div className="activity-info">
                  <p>{order.customer}</p>
                  <span>{order.time}</span>
                </div>
                <div className="activity-amount">
                  <span>{order.amount.toLocaleString()} ل.س</span>
                  <span className={`status-badge ${order.status}`}>
                    {order.status === 'pending' ? 'معلق' : 'تم التوصيل'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="activity-card">
          <h3>المنتجات الأكثر مبيعاً</h3>
          <div className="activity-list">
            {topProducts.map((product, index) => (
              <div key={product.id} className="activity-item">
                <div className="activity-icon">
                  <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                </div>
                <div className="activity-info">
                  <p>{product.name}</p>
                  <span>{product.sold} قطعة مباعة</span>
                </div>
                <div className="activity-amount">
                  <span>{product.price.toLocaleString()} ل.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

