import { useEffect, useState } from 'react'
import { Calendar, Download, TrendingUp, Package, DollarSign, RefreshCw, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../lib/api'
import { showError } from '../../utils/toast'
import './Archive.css'

interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp: string
  shop_name?: string
  status: string
  delivery_type: string
  delivery_address?: string
  total_amount: number
  final_amount: number
  created_at: string
  archived_at?: string
  payment_status?: string
}

export default function Archive() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [archiveMode, setArchiveMode] = useState<'daily' | 'monthly'>('daily')
  const [archiveYear, setArchiveYear] = useState<number>(new Date().getFullYear())
  const [archiveMonth, setArchiveMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAvailableDates()
    loadArchive()
    
    // تحديث تلقائي كل 5 ثواني
    const interval = setInterval(() => {
      loadArchive(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedDate, archiveMode, archiveYear, archiveMonth])

  const loadAvailableDates = async () => {
    try {
      const response = await adminAPI.orders.archive.getDates()
      if (response.data.success) {
        setAvailableDates(response.data.dates || [])
      }
    } catch (error) {
      console.error('Error loading archive dates:', error)
    }
  }

  const loadArchive = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      
      let response
      if (archiveMode === 'daily') {
        response = await adminAPI.orders.archive.getDaily(selectedDate || undefined)
      } else {
        response = await adminAPI.orders.archive.getMonthly(archiveYear, archiveMonth)
      }
      
      if (response.data.success) {
        setOrders(response.data.orders || [])
      }
    } catch (error) {
      console.error('Error loading archive:', error)
      if (!silent) {
        showError('خطأ في جلب الأرشيف')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadAvailableDates()
    loadArchive()
  }

  const handleExport = async () => {
    if (orders.length === 0) {
      showError('لا توجد طلبات للتصدير')
      return
    }

    try {
      const XLSX = await import('xlsx')
      
      const headers = [
        'رقم الطلب', 'اسم العميل', 'رقم الهاتف', 'واتساب', 'اسم المتجر',
        'الحالة', 'نوع التوصيل', 'عنوان التوصيل', 'المبلغ الإجمالي',
        'المبلغ النهائي', 'حالة الدفع', 'تاريخ الطلب', 'تاريخ الأرشفة'
      ]
      
      const rows = orders.map(order => [
        order.order_number || '',
        order.customer_name || '',
        order.customer_phone || '',
        order.customer_whatsapp || '',
        order.shop_name || '',
        order.status || '',
        order.delivery_type || '',
        order.delivery_address || '',
        order.total_amount?.toString() || '0',
        order.final_amount?.toString() || '0',
        order.payment_status || 'pending',
        order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SA') : '',
        order.archived_at ? new Date(order.archived_at).toLocaleDateString('ar-SA') : ''
      ])
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'الأرشيف')
      
      const fileName = archiveMode === 'daily' 
        ? `أرشيف_${selectedDate}.xlsx`
        : `أرشيف_${archiveYear}_${archiveMonth}.xlsx`
      
      XLSX.writeFile(workbook, fileName)
    } catch (error: any) {
      console.error('Error exporting archive:', error)
      if (error.message?.includes('xlsx') || error.code === 'MODULE_NOT_FOUND') {
        showError('مكتبة Excel غير مثبتة. يرجى تثبيتها: npm install xlsx')
      } else {
        showError('حدث خطأ في تصدير الأرشيف')
      }
    }
  }

  // حساب الإحصائيات
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.final_amount || 0), 0),
    totalAmount: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
    avgOrderValue: orders.length > 0 
      ? orders.reduce((sum, order) => sum + (order.final_amount || 0), 0) / orders.length 
      : 0
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div>
          <h1>الأرشيف</h1>
          <p>عرض وإدارة الطلبات المؤرشفة</p>
        </div>
        <div className="archive-actions">
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="تحديث"
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            تحديث
          </button>
          {orders.length > 0 && (
            <button
              className="btn-export"
              onClick={handleExport}
              title="تصدير إلى Excel"
            >
              <Download size={18} />
              تصدير
            </button>
          )}
        </div>
      </div>

      {/* فلاتر الأرشيف */}
      <div className="archive-filters">
        <div className="filter-group">
          <label>نوع الأرشيف:</label>
          <select 
            value={archiveMode} 
            onChange={(e) => setArchiveMode(e.target.value as 'daily' | 'monthly')}
            className="filter-select"
          >
            <option value="daily">يومي</option>
            <option value="monthly">شهري</option>
          </select>
        </div>
        
        {archiveMode === 'daily' ? (
          <div className="filter-group">
            <label>التاريخ:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-input"
            />
            {availableDates.length > 0 && (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="filter-select"
              >
                <option value="">اختر تاريخاً</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <>
            <div className="filter-group">
              <label>السنة:</label>
              <input
                type="number"
                value={archiveYear}
                onChange={(e) => setArchiveYear(parseInt(e.target.value) || new Date().getFullYear())}
                min="2020"
                max={new Date().getFullYear()}
                className="filter-input"
                style={{ width: '100px' }}
              />
            </div>
            <div className="filter-group">
              <label>الشهر:</label>
              <select
                value={archiveMonth}
                onChange={(e) => setArchiveMonth(parseInt(e.target.value))}
                className="filter-select"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1, 1).toLocaleDateString('ar-SA', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="archive-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">إجمالي الطلبات</div>
            <div className="stat-value">{stats.totalOrders}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">إجمالي المبيعات</div>
            <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">متوسط قيمة الطلب</div>
            <div className="stat-value">{formatCurrency(stats.avgOrderValue)}</div>
          </div>
        </div>
      </div>

      {/* قائمة الطلبات */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>جاري تحميل الأرشيف...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>لا توجد طلبات في الأرشيف للفترة المحددة</p>
        </div>
      ) : (
        <div className="archive-orders">
          <div className="orders-table">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>نوع التوصيل</th>
                  <th>المبلغ النهائي</th>
                  <th>حالة الدفع</th>
                  <th>تاريخ الطلب</th>
                  <th>تاريخ الأرشفة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number}</strong>
                    </td>
                    <td>
                      {order.customer_name}
                      {order.shop_name && (
                        <div className="shop-name">{order.shop_name}</div>
                      )}
                    </td>
                    <td>{order.customer_phone}</td>
                    <td>
                      <span className={`delivery-badge ${order.delivery_type}`}>
                        {order.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}
                      </span>
                    </td>
                    <td>
                      <strong className="amount">{formatCurrency(order.final_amount || 0)}</strong>
                    </td>
                    <td>
                      <span className={`payment-status ${order.payment_status || 'pending'}`}>
                        {order.payment_status === 'paid' ? 'مدفوع' : 
                         order.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                      </span>
                    </td>
                    <td>{order.created_at ? formatDate(order.created_at) : '-'}</td>
                    <td>{order.archived_at ? formatDate(order.archived_at) : '-'}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                        title="عرض التفاصيل"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

