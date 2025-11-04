import { useState, useEffect } from 'react'
import { TrendingUp, Activity, ShoppingCart, DollarSign } from 'lucide-react'
import { adminAPI } from '../lib/api'
import './DashboardStats.css'

interface StatsData {
  performance_rate: number
  performance_change: number
  today_orders: number
  today_orders_change: number
  total_orders: number
  total_orders_change: number
  monthly_profits: number
  monthly_profits_change: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData>({
    performance_rate: 0,
    performance_change: 0,
    today_orders: 0,
    today_orders_change: 0,
    total_orders: 0,
    total_orders_change: 0,
    monthly_profits: 0,
    monthly_profits_change: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await adminAPI.dashboard.getPerformanceStats()
      if (response.data.success) {
        setStats(response.data.stats)
      }
    } catch (error) {
      console.error('Error loading performance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-stats-loading">جاري التحميل...</div>
  }

  return (
    <div className="dashboard-stats">
      {/* Performance Rate Widget */}
      <div className="stat-widget performance-rate">
        <div className="widget-header">
          <div className="widget-icon performance">
            <TrendingUp size={20} />
          </div>
          <h3>معدل الأداء</h3>
        </div>
        <div className="widget-value performance">{stats.performance_rate}%</div>
        <div className="widget-change positive">
          +{stats.performance_change}% من الأسبوع الماضي
        </div>
      </div>

      {/* Today's Orders Widget */}
      <div className="stat-widget today-orders">
        <div className="widget-header">
          <div className="widget-icon orders">
            <Activity size={20} />
          </div>
          <h3>طلبات اليوم</h3>
        </div>
        <div className="widget-value orders">{stats.today_orders}</div>
        <div className="widget-change positive">
          +{stats.today_orders_change} من الأمس
        </div>
      </div>

      {/* Total Orders Widget */}
      <div className="stat-widget total-orders highlighted">
        <div className="widget-header">
          <div className="widget-icon total">
            <ShoppingCart size={20} />
          </div>
          <h3>إجمالي الطلبات</h3>
        </div>
        <div className="widget-value total">{stats.total_orders}</div>
        <div className={`widget-change ${stats.total_orders_change >= 0 ? 'positive' : 'negative'}`}>
          {stats.total_orders_change >= 0 ? '+' : ''}{stats.total_orders_change}% من الشهر الماضي
        </div>
      </div>

      {/* Monthly Profits Widget */}
      <div className="stat-widget monthly-profits">
        <div className="widget-header">
          <div className="widget-icon profits">
            <DollarSign size={20} />
          </div>
          <h3>الأرباح الشهرية</h3>
        </div>
        <div className="widget-value profits">{stats.monthly_profits.toLocaleString()} ل.س</div>
        <div className="widget-change positive">
          +{stats.monthly_profits_change}% من الشهر الماضي
        </div>
      </div>
    </div>
  )
}

