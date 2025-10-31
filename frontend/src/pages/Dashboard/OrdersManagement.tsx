import { useEffect, useState } from 'react'
import { Search, Filter, MoreVertical } from 'lucide-react'
import './OrdersManagement.css'
import { adminAPI } from '../../lib/api'

export default function OrdersManagement() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.orders.getAll()
      const data = Array.isArray(res.data) ? res.data : []
      setOrders(data)
    } catch (e) {
      console.error('Error loading orders:', e)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    // Refresh every 30 seconds
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="orders-management">
      <div className="section-header">
        <div>
          <h1>إدارة الطلبات</h1>
          <p>عرض وإدارة جميع الطلبات</p>
        </div>
        <button className="btn btn-primary">
          طلب جديد
        </button>
      </div>

      <div className="orders-filters">
        <div className="search-box">
          <Search size={20} />
          <input type="text" placeholder="ابحث عن طلب..." />
        </div>
        <button className="btn-filter">
          <Filter size={20} />
          فلترة
        </button>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>رقم الطلب</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>جاري التحميل...</td></tr>
            ) : orders.map((order: any) => (
              <tr key={order.id}>
                <td>
                  {order.image_url ? (
                    <img
                      className="order-image-thumb"
                      src={order.image_url}
                      alt={order.order_number || 'order image'}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="order-image-placeholder">لا توجد صورة</div>
                  )}
                </td>
                <td>{order.order_number}</td>
                <td>{(order.final_amount ?? order.total_amount ?? 0).toLocaleString()} ل.س</td>
                <td>
                  <span className={`status-badge ${order.status}`}>{order.status}</span>
                </td>
                <td>{order.created_at ? new Date(order.created_at).toLocaleString('ar-SY') : '-'}</td>
                <td>
                  <button className="icon-btn">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

