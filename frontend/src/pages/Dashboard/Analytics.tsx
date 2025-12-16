import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { analyticsAPI } from '../../lib/api'
import './Analytics.css'

interface AnalyticsStats {
  period: string
  total_visitors: number
  total_page_views: number
  unique_pages: number
  average_time_on_site: number
}

interface ExitRate {
  page_path: string
  total_visits: number
  exits: number
  exit_rate: number
}

interface PageStat {
  page_path: string
  views: number
  avg_time_spent: number
  avg_scroll_depth: number
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Analytics() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [exitRates, setExitRates] = useState<ExitRate[]>([])
  const [pageStats, setPageStats] = useState<PageStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const [statsRes, exitRatesRes, pagesRes] = await Promise.all([
        analyticsAPI.getStats(period),
        analyticsAPI.getExitRates(period),
        analyticsAPI.getPages(period),
      ])

      setStats(statsRes.data)
      setExitRates(exitRatesRes.data.exit_rates || [])
      setPageStats(pagesRes.data.pages || [])
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPagePath = (path: string) => {
    if (path === '/') return 'الصفحة الرئيسية'
    if (path === '/services') return 'الخدمات'
    if (path === '/portfolio') return 'الأعمال'
    if (path === '/contact') return 'اتصل بنا'
    if (path === '/orders') return 'طلباتي'
    return path
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">جاري تحميل البيانات...</div>
      </div>
    )
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>التحليلات والإحصائيات</h1>
        <div className="period-selector">
          <button
            className={period === 'day' ? 'active' : ''}
            onClick={() => setPeriod('day')}
          >
            اليوم
          </button>
          <button
            className={period === 'week' ? 'active' : ''}
            onClick={() => setPeriod('week')}
          >
            الأسبوع
          </button>
          <button
            className={period === 'month' ? 'active' : ''}
            onClick={() => setPeriod('month')}
          >
            الشهر
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>عدد الزوار</h3>
            <p className="stat-value">{stats.total_visitors}</p>
          </div>
          <div className="stat-card">
            <h3>عدد المشاهدات</h3>
            <p className="stat-value">{stats.total_page_views}</p>
          </div>
          <div className="stat-card">
            <h3>الصفحات الفريدة</h3>
            <p className="stat-value">{stats.unique_pages}</p>
          </div>
          <div className="stat-card">
            <h3>متوسط الوقت على الموقع</h3>
            <p className="stat-value">{Math.round(stats.average_time_on_site)} ثانية</p>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <h2>نسب الخروج من الصفحات</h2>
          {exitRates.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={exitRates.map(r => ({ ...r, page: formatPagePath(r.page_path) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="exit_rate" fill="#ef4444" name="نسبة الخروج %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">لا توجد بيانات</p>
          )}
        </div>

        <div className="chart-card">
          <h2>توزيع المشاهدات</h2>
          {pageStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pageStats.map(p => ({ ...p, page: formatPagePath(p.page_path) }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ page, views }) => `${page}: ${views}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="views"
                >
                  {pageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">لا توجد بيانات</p>
          )}
        </div>
      </div>

      <div className="table-card">
        <h2>تفاصيل نسب الخروج</h2>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>الصفحة</th>
              <th>إجمالي الزيارات</th>
              <th>عدد الخروج</th>
              <th>نسبة الخروج</th>
            </tr>
          </thead>
          <tbody>
            {exitRates.length > 0 ? (
              exitRates.map((rate, index) => (
                <tr key={index}>
                  <td>{formatPagePath(rate.page_path)}</td>
                  <td>{rate.total_visits}</td>
                  <td>{rate.exits}</td>
                  <td>
                    <span className={`exit-rate ${rate.exit_rate > 50 ? 'high' : rate.exit_rate > 30 ? 'medium' : 'low'}`}>
                      {rate.exit_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="no-data">لا توجد بيانات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

