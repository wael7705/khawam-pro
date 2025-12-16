import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, Sparkles } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import { isAdmin, isEmployee } from '../../lib/auth'
import '../Home.css'
import './HomeStatsSection.css'

interface DashboardStats {
  total_services: number
  active_orders: number
  total_orders?: number
  total_revenue: number
  this_month_revenue: number
  revenue_trend: number
  orders_trend: number
}

interface TopService {
  name: string
  orders: number
  revenue: number
  avg_order_value: number
  growth_rate: number
}

interface SalesData {
  label: string
  value: number
}

export default function HomeStatsSection() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    total_services: 0,
    active_orders: 0,
    total_orders: 0,
    total_revenue: 0,
    this_month_revenue: 0,
    revenue_trend: 0,
    orders_trend: 0
  })
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // فقط المديرين والموظفين يمكنهم رؤية الإحصائيات
    if (isAdmin() || isEmployee()) {
      loadStats()
    } else {
      setLoading(false)
    }
  }, [salesPeriod])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [statsRes, servicesRes, salesRes] = await Promise.all([
        adminAPI.dashboard.getStats(),
        adminAPI.dashboard.getTopServices(),
        adminAPI.dashboard.getSalesOverview(salesPeriod)
      ])

      if (statsRes.data.success) {
        const statsData = statsRes.data.stats
        setStats({
          ...statsData,
          total_services: statsData.total_services || statsData.total_products || 0,
          total_orders: statsData.total_orders || 0,
        })
      }

      if (servicesRes.data.success) {
        const services = servicesRes.data.services || []
        setTopServices(services.map((svc: any) => ({
          name: svc.name,
          orders: svc.orders || 0,
          revenue: svc.revenue || 0,
          avg_order_value: svc.orders > 0 ? (svc.revenue / svc.orders) : 0,
          growth_rate: svc.growth_rate || 0
        })))
      }

      if (salesRes.data.success) {
        setSalesData(salesRes.data.sales || [])
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // إخفاء المكون إذا لم يكن المستخدم مديراً أو موظفاً
  if (!isAdmin() && !isEmployee()) {
    return null
  }

  if (loading) {
    return (
      <section className="home-stats-section">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>جاري تحميل البيانات...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="home-stats-section">
      <div className="container">
        {/* Stats Cards */}
        <div className="home-stats-grid">
          <div className="home-stat-card home-stat-card-primary">
            <div className="home-stat-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>
              <DollarSign size={28} />
            </div>
            <div className="home-stat-info">
              <p className="home-stat-label">الأرباح الشهرية</p>
              <div className="home-stat-value-group">
                <h3>{stats.this_month_revenue.toLocaleString()} ل.س</h3>
                {stats.revenue_trend !== 0 && (
                  <span className={`home-stat-trend ${stats.revenue_trend > 0 ? 'positive' : 'negative'}`}>
                    {stats.revenue_trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(stats.revenue_trend).toFixed(1)}% من الشهر الماضي
                  </span>
                )}
              </div>
            </div>
          </div>

          <div 
            className="home-stat-card home-stat-card-success"
            onClick={() => navigate('/dashboard/orders')}
            style={{ cursor: 'pointer' }}
            title="انقر للانتقال إلى قسم الطلبات"
          >
            <div className="home-stat-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>
              <ShoppingCart size={28} />
            </div>
            <div className="home-stat-info">
              <p className="home-stat-label">إجمالي الطلبات</p>
              <div className="home-stat-value-group">
                <h3>{stats.total_orders || stats.active_orders}</h3>
                {stats.orders_trend !== 0 && (
                  <span className={`home-stat-trend ${stats.orders_trend > 0 ? 'positive' : 'negative'}`}>
                    {stats.orders_trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(stats.orders_trend).toFixed(1)}% من الشهر الماضي
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="home-stat-card home-stat-card-warning">
            <div className="home-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
              <Package size={28} />
            </div>
            <div className="home-stat-info">
              <p className="home-stat-label">طلبات اليوم</p>
              <div className="home-stat-value-group">
                <h3>0</h3>
                <span className="home-stat-subtitle">+0 من الأمس</span>
              </div>
            </div>
          </div>

          <div className="home-stat-card home-stat-card-info">
            <div className="home-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
              <Sparkles size={28} />
            </div>
            <div className="home-stat-info">
              <p className="home-stat-label">معدل الأداء</p>
              <div className="home-stat-value-group">
                <h3>{stats.total_orders > 0 ? ((stats.active_orders / stats.total_orders) * 100).toFixed(1) : 0}%</h3>
                <span className="home-stat-subtitle">+0% من الأسبوع الماضي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="home-charts-grid">
          <div className="home-chart-card">
            <div className="home-chart-header">
              <h3>نظرة عامة على المبيعات</h3>
              <div className="home-period-selector">
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
              <div className="home-chart-placeholder">
                <p>الرسم البياني للمبيعات</p>
              </div>
            ) : (
              <div className="home-chart-placeholder">
                <p>لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>

          <div className="home-chart-card">
            <div className="home-chart-header">
              <h3>الخدمات الأكثر طلباً</h3>
            </div>
            {topServices.length > 0 ? (
              <div className="home-top-services-list">
                {topServices.slice(0, 3).map((service, index) => (
                  <div key={index} className="home-service-item">
                    <div className="home-service-rank">{index + 1}</div>
                    <div className="home-service-info">
                      <span className="home-service-name">{service.name}</span>
                      <span className="home-service-stats">
                        {service.orders} طلب • {service.revenue.toLocaleString()} ل.س
                      </span>
                    </div>
                  </div>
                ))}
                {topServices.length > 0 && (
                  <div className="home-top-service-badge">
                    <span>الأفضل: {topServices[0].name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="home-chart-placeholder">
                <p>لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

