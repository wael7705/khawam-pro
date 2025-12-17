import { useState, useEffect } from 'react'
import { Users, Eye, TrendingUp } from 'lucide-react'
import { analyticsAPI } from '../lib/api'
import './VisitorStatsWidget.css'

export default function VisitorStatsWidget() {
  const [stats, setStats] = useState({
    total_visitors: 0,
    total_page_views: 0,
    unique_pages: 0,
    average_time_on_site: 0
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await analyticsAPI.getStats(period)
      if (response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Error loading visitor stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="visitor-stats-widget">
        <div className="visitor-stats-loading">جاري تحميل إحصائيات الزوار...</div>
      </div>
    )
  }

  return (
    <div className="visitor-stats-widget">
      <div className="visitor-stats-header">
        <h2>إحصائيات الزوار</h2>
        <div className="visitor-period-selector">
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

      <div className="visitor-stats-grid">
        <div className="visitor-stat-card">
          <div className="visitor-stat-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>
            <Users size={24} />
          </div>
          <div className="visitor-stat-info">
            <p className="visitor-stat-label">عدد الزوار</p>
            <h3>{stats.total_visitors}</h3>
          </div>
        </div>

        <div className="visitor-stat-card">
          <div className="visitor-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <Eye size={24} />
          </div>
          <div className="visitor-stat-info">
            <p className="visitor-stat-label">عدد المشاهدات</p>
            <h3>{stats.total_page_views}</h3>
          </div>
        </div>

        <div className="visitor-stat-card">
          <div className="visitor-stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
            <TrendingUp size={24} />
          </div>
          <div className="visitor-stat-info">
            <p className="visitor-stat-label">متوسط الوقت</p>
            <h3>{Math.round(stats.average_time_on_site)} ثانية</h3>
          </div>
        </div>
      </div>
    </div>
  )
}

