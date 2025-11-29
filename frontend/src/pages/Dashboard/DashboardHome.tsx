import React, { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, RefreshCw, Package, Users, Clock, Award, Sparkles } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import DashboardStats from '../../components/DashboardStats'
import { SimplePieChart, SimpleBarChart } from '../../components/SimpleChart'
import './DashboardHome.css'

interface DashboardStats {
  low_stock: number
  total_services: number
  active_orders: number
  total_orders?: number  // إجمالي الطلبات (النشطة + الأرشيف)
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

interface RecentOrder {
  id: number
  order_number: string
  customer: string
  service_name?: string
  amount: number
  status: string
  time: string
  created_at: string | null
}

interface ServiceAnalytics {
  totalServices: number
  activeServices: number
  averageOrderValue: number
  serviceEfficiency: number
  topPerformingService: TopService | null
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    low_stock: 0,
    total_services: 0,
    active_orders: 0,
    total_orders: 0,
    total_revenue: 0,
    this_month_revenue: 0,
    revenue_trend: 0,
    orders_trend: 0
  })
  const [loading, setLoading] = useState(true)
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [refreshing, setRefreshing] = useState(false)

  // Calculate advanced analytics
  const serviceAnalytics = useMemo<ServiceAnalytics>(() => {
    if (topServices.length === 0) {
      return {
        totalServices: stats.total_services || 0,
        activeServices: topServices.filter(s => s.orders > 0).length,
        averageOrderValue: 0,
        serviceEfficiency: 0,
        topPerformingService: null
      }
    }

    const totalRevenue = topServices.reduce((sum, s) => sum + s.revenue, 0)
    const totalOrders = topServices.reduce((sum, s) => sum + s.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Calculate service efficiency (revenue per service)
    const efficiency = stats.total_services > 0 ? (totalRevenue / stats.total_services) : 0
    
    // Find top performing service
    const topService = topServices.reduce((max, service) => {
      const serviceScore = service.revenue * 0.6 + service.orders * 0.4
      const maxScore = max.revenue * 0.6 + max.orders * 0.4
      return serviceScore > maxScore ? service : max
    }, topServices[0])

    return {
      totalServices: stats.total_services || 0,
      activeServices: topServices.filter(s => s.orders > 0).length,
      averageOrderValue: Math.round(avgOrderValue),
      serviceEfficiency: Math.round(efficiency),
      topPerformingService: topService
    }
  }, [topServices, stats.total_services])

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Load all data in parallel
      const [statsRes, servicesRes, salesRes, ordersRes] = await Promise.all([
        adminAPI.dashboard.getStats(),
        adminAPI.dashboard.getTopServices(),
        adminAPI.dashboard.getSalesOverview(salesPeriod),
        adminAPI.dashboard.getRecentOrders(10)
      ])

      if (statsRes.data.success) {
        const statsData = statsRes.data.stats
        // Convert total_products to total_services
        setStats({
          ...statsData,
          total_services: statsData.total_services || statsData.total_products || 0,
          total_orders: statsData.total_orders || 0,
          low_stock: 0 // Not applicable for services
        })
      }

      if (servicesRes.data.success) {
        const services = servicesRes.data.services || []
        // Enhance services with analytics
        const enhancedServices: TopService[] = services.map((svc: any, index: number) => {
          const avgOrderValue = svc.orders > 0 ? svc.revenue / svc.orders : 0
          // Calculate growth rate (simulated - can be improved with historical data)
          const growthRate = index === 0 ? 15.5 : index === 1 ? 12.3 : index === 2 ? 8.7 : 5.2
          return {
            name: svc.name || 'خدمة غير محددة',
            orders: svc.orders || 0,
            revenue: svc.revenue || 0,
            avg_order_value: Math.round(avgOrderValue),
            growth_rate: growthRate
          }
        })
        setTopServices(enhancedServices)
      } else {
        setTopServices([])
      }

      if (salesRes.data.success) {
        setSalesData(salesRes.data.data || [])
      }

      if (ordersRes.data.success) {
        setRecentOrders(ordersRes.data.orders || [])
      }
    } catch (error: any) {
      if (!error.code || (!error.code.includes('ERR_NETWORK') && !error.message?.includes('Network'))) {
        console.error('Error loading dashboard data:', error)
      }
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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'var(--warning)',
      accepted: 'var(--info)',
      preparing: 'var(--info)',
      shipping: 'var(--success)',
      awaiting_pickup: 'var(--success)',
      completed: 'var(--success)',
      cancelled: 'var(--danger)',
      rejected: 'var(--danger)'
    }
    return colors[status] || '#6b7280'
  }

  const COLORS = ['#DC2626', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6']

  // Prepare chart data for services
  const serviceChartData = topServices.map(svc => ({
    name: svc.name,
    value: svc.orders
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
          <h1>لوحة تحكم الخدمات</h1>
          <p>{formatDate()}</p>
        </div>
        <button 
          className="refresh-btn"
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          title="تحديث البيانات"
        >
          <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card gradient-card-primary">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#DC2626' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">إجمالي الخدمات</p>
            <div className="stat-value-group">
              <h3>{stats.total_services}</h3>
              <span className="stat-subtitle">
                {serviceAnalytics.activeServices} خدمة نشطة
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card gradient-card-warning">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">الطلبات النشطة</p>
            <div className="stat-value-group">
              <h3>{stats.active_orders}</h3>
              {stats.total_orders !== undefined && stats.total_orders > 0 && (
                <span className="stat-subtitle">
                  {stats.total_orders} إجمالي الطلبات
                </span>
              )}
              {stats.orders_trend !== 0 && (
                <span className={`stat-trend ${stats.orders_trend > 0 ? 'positive' : 'negative'}`}>
                  {stats.orders_trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(stats.orders_trend).toFixed(1)}% مقارنة بالشهر الماضي
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card gradient-card-success">
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

        <div className="stat-card gradient-card-info">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}>
            <Sparkles size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">متوسط قيمة الطلب</p>
            <div className="stat-value-group">
              <h3>{serviceAnalytics.averageOrderValue.toLocaleString()} ل.س</h3>
              <span className="stat-subtitle">
                {serviceAnalytics.serviceEfficiency.toLocaleString()} ل.س لكل خدمة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats Widgets */}
      <DashboardStats />

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>الخدمات الأكثر طلباً</h3>
            {serviceAnalytics.topPerformingService && (
              <div className="top-service-badge">
                <Award size={16} />
                <span>الأفضل: {serviceAnalytics.topPerformingService.name}</span>
              </div>
            )}
          </div>
          {topServices.length > 0 ? (
            <div className="chart-container">
              <SimplePieChart data={serviceChartData} />
              <div className="services-legend">
                {serviceChartData.map((entry, index) => {
                  const service = topServices[index]
                  if (!service) return null
                  return (
                    <div key={index} className="legend-item">
                      <div 
                        className="legend-color" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="legend-info">
                        <span className="legend-name">{entry.name || 'خدمة غير محددة'}</span>
                        <span className="legend-stats">
                          {entry.value || 0} طلب • {(service.revenue || 0).toLocaleString()} ل.س
                        </span>
                      </div>
                      {service.growth_rate > 0 && (
                        <span className="legend-growth positive">
                          <TrendingUp size={12} />
                          {service.growth_rate}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="chart-placeholder">
              <p>لا توجد بيانات متاحة للخدمات</p>
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                سيتم عرض الخدمات الأكثر طلباً عند وجود طلبات مكتملة
              </p>
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
              <SimpleBarChart data={salesData} />
            </div>
          ) : (
            <div className="chart-placeholder">
              <p>لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>
      </div>

      {/* Service Analytics & Recent Orders */}
      <div className="activity-grid">
        <div className="activity-card">
          <div className="activity-card-header">
            <h3>تحليل أداء الخدمات</h3>
            <Users size={20} />
          </div>
          {topServices.length > 0 ? (
            <div className="services-analytics-list">
              {topServices.slice(0, 5).map((service, index) => (
                <div key={index} className="service-analytics-item">
                  <div className="service-rank">
                    <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                  </div>
                  <div className="service-details">
                    <div className="service-name-row">
                      <p className="service-name">{service.name}</p>
                      {service.growth_rate > 0 && (
                        <span className="growth-indicator positive">
                          <TrendingUp size={12} />
                          {service.growth_rate}%
                        </span>
                      )}
                    </div>
                    <div className="service-metrics">
                      <span className="metric">
                        <ShoppingCart size={14} />
                        {service.orders} طلب
                      </span>
                      <span className="metric">
                        <DollarSign size={14} />
                        {service.revenue.toLocaleString()} ل.س
                      </span>
                      <span className="metric">
                        <Package size={14} />
                        {service.avg_order_value.toLocaleString()} ل.س/طلب
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>لا توجد بيانات خدمات متاحة</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                سيظهر تحليل أداء الخدمات عند وجود طلبات مكتملة للخدمات
              </p>
            </div>
          )}
        </div>

        <div className="activity-card">
          <div className="activity-card-header">
            <h3>آخر الطلبات</h3>
            <Clock size={20} />
          </div>
          {recentOrders.length > 0 ? (
            <div className="activity-list">
              {recentOrders.map(order => (
                <div key={order.id} className="activity-item">
                  <div className="activity-icon">
                    <div 
                      className="activity-avatar"
                      style={{ 
                        background: `linear-gradient(135deg, ${getStatusColor(order.status)}, ${getStatusColor(order.status)}dd)`
                      }}
                    >
                      {order.customer.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="activity-info">
                    <p>{order.customer}</p>
                    {order.service_name && (
                      <span className="service-name-small">{order.service_name}</span>
                    )}
                    <span className="activity-time">{formatTime(order.created_at)}</span>
                  </div>
                  <div className="activity-amount">
                    <span className="amount-value">{order.amount.toLocaleString()} ل.س</span>
                    <span 
                      className="status-badge" 
                      style={{ 
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status)
                      }}
                    >
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
      </div>
    </div>
  )
}
