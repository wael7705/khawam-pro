import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import { adminAPI } from '../../lib/api'
import { showError } from '../../utils/toast'
import './DashboardHome.css'

interface DashboardStats {
  low_stock: number
  total_products: number
  active_orders: number
  total_revenue: number
  this_month_revenue: number
  revenue_trend: number
  orders_trend: number
}

interface TopProduct {
  id: number
  name: string
  sold: number
  revenue: number
}

interface TopCategory {
  name: string
  sold: number
  revenue: number
}

interface SalesData {
  label: string
  value: number
}

interface RecentOrder {
  id: number
  order_number: string
  customer: string
  amount: number
  status: string
  time: string
  created_at: string | null
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    low_stock: 0,
    total_products: 0,
    active_orders: 0,
    total_revenue: 0,
    this_month_revenue: 0,
    revenue_trend: 0,
    orders_trend: 0
  })
  const [loading, setLoading] = useState(true)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Load all data in parallel
      const [statsRes, productsRes, categoriesRes, salesRes, ordersRes] = await Promise.all([
        adminAPI.dashboard.getStats(),
        adminAPI.dashboard.getTopProducts(),
        adminAPI.dashboard.getTopCategories(),
        adminAPI.dashboard.getSalesOverview(salesPeriod),
        adminAPI.dashboard.getRecentOrders(10)
      ])

      if (statsRes.data.success) {
        setStats(statsRes.data.stats)
      }

      if (productsRes.data.success) {
        setTopProducts(productsRes.data.products || [])
      }

      if (categoriesRes.data.success) {
        setTopCategories(categoriesRes.data.categories || [])
      }

      if (salesRes.data.success) {
        setSalesData(salesRes.data.data || [])
      }

      if (ordersRes.data.success) {
        setRecentOrders(ordersRes.data.orders || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      showError('حدث خطأ في تحميل بيانات لوحة التحكم')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (salesPeriod) {
      adminAPI.dashboard.getSalesOverview(salesPeriod).then(res => {
        if (res.data.success) {
          setSalesData(res.data.data || [])
        }
      })
    }
  }, [salesPeriod])

  const formatDate = () => {
    const now = new Date()
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول']
    return `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'الآن'
    try {
      const date = new Date(dateStr)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? 'م' : 'ص'
      const formattedHours = hours > 12 ? hours - 12 : hours
      return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch {
      return 'الآن'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'معلق',
      accepted: 'مقبول',
      preparing: 'قيد التحضير',
      shipping: 'قيد التوصيل',
      awaiting_pickup: 'في انتظار الاستلام',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      rejected: 'مرفوض'
    }
    return labels[status] || status
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b']

  // Prepare chart data
  const categoryChartData = topCategories.map(cat => ({
    name: cat.name,
    value: cat.revenue
  }))

  if (loading) {
    return (
      <div className="dashboard-home">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-home">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>مرحباً بك في لوحة التحكم</h1>
          <p>{formatDate()}</p>
        </div>
        <button 
          className="refresh-btn"
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          title="تحديث البيانات"
        >
          <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card gradient-card-1">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">مواد منخفضة</p>
            <div className="stat-value-group">
              <h3>{stats.low_stock}</h3>
              {stats.low_stock > 0 && (
                <span className="stat-trend negative">
                  <TrendingDown size={14} />
                  يحتاج إعادة طلب
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card gradient-card-2">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">إجمالي المنتجات</p>
            <div className="stat-value-group">
              <h3>{stats.total_products}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card gradient-card-3">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">الطلبات النشطة</p>
            <div className="stat-value-group">
              <h3>{stats.active_orders}</h3>
              {stats.orders_trend !== 0 && (
                <span className={`stat-trend ${stats.orders_trend > 0 ? 'positive' : 'negative'}`}>
                  {stats.orders_trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(stats.orders_trend).toFixed(1)}% مقارنة بالشهر الماضي
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card gradient-card-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">إجمالي المبيعات</p>
            <div className="stat-value-group">
              <h3>{stats.total_revenue.toLocaleString()} ل.س</h3>
              {stats.revenue_trend !== 0 && (
                <span className={`stat-trend ${stats.revenue_trend > 0 ? 'positive' : 'negative'}`}>
                  {stats.revenue_trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(stats.revenue_trend).toFixed(1)}% مقارنة بالشهر الماضي
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>أفضل الفئات مبيعاً</h3>
          </div>
          {topCategories.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} ل.س`, 'الإيرادات']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-placeholder">
              <p>لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>نظرة عامة على المبيعات</h3>
            <div className="period-selector">
              <button
                className={salesPeriod === 'week' ? 'active' : ''}
                onClick={() => setSalesPeriod('week')}
              >
                أسبوع
              </button>
              <button
                className={salesPeriod === 'month' ? 'active' : ''}
                onClick={() => setSalesPeriod('month')}
              >
                شهر
              </button>
              <button
                className={salesPeriod === 'year' ? 'active' : ''}
                onClick={() => setSalesPeriod('year')}
              >
                سنة
              </button>
            </div>
          </div>
          {salesData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}ك`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} ل.س`, 'المبيعات']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorGradient)"
                    radius={[8, 8, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                      <stop offset="100%" stopColor="#764ba2" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-placeholder">
              <p>لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-grid">
        <div className="activity-card">
          <h3>آخر المعاملات</h3>
          {recentOrders.length > 0 ? (
            <div className="activity-list">
              {recentOrders.map(order => (
                <div key={order.id} className="activity-item">
                  <div className="activity-icon">
                    <div className="activity-avatar">
                      {order.customer.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="activity-info">
                    <p>{order.customer}</p>
                    <span>{formatTime(order.created_at)}</span>
                  </div>
                  <div className="activity-amount">
                    <span>{order.amount.toLocaleString()} ل.س</span>
                    <span className={`status-badge ${order.status}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>لا توجد طلبات حديثة</p>
            </div>
          )}
        </div>

        <div className="activity-card">
          <h3>المنتجات الأكثر مبيعاً</h3>
          {topProducts.length > 0 ? (
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
                    <span>{product.revenue.toLocaleString()} ل.س</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>لا توجد منتجات مباعة بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
