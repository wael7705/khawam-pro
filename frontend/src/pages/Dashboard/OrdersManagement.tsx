import { useState } from 'react'
import { Search, Filter, MoreVertical } from 'lucide-react'
import './OrdersManagement.css'

export default function OrdersManagement() {
  const [orders, setOrders] = useState([
    {
      id: 1,
      orderNumber: 'ORD-2025-001',
      customerName: 'أحمد محمد',
      whatsapp: '+963912345678',
      serviceName: 'طباعة البوسترات',
      quantity: 10,
      total: 140000,
      status: 'pending',
      date: '2025-10-27',
      time: '11:02 ص'
    },
    {
      id: 2,
      orderNumber: 'ORD-2025-002',
      customerName: 'سارة علي',
      whatsapp: '+963987654321',
      serviceName: 'تصميم جرافيكي',
      quantity: 5,
      total: 70000,
      status: 'in_progress',
      date: '2025-10-26',
      time: '08:08 م'
    },
    {
      id: 3,
      orderNumber: 'ORD-2025-003',
      customerName: 'خالد حسن',
      whatsapp: '+963955555555',
      serviceName: 'طباعة الفليكس',
      quantity: 20,
      total: 200000,
      status: 'delivered',
      date: '2025-10-25',
      time: '03:15 م'
    },
  ])

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
              <th>رقم الطلب</th>
              <th>العميل</th>
              <th>رقم الواتساب</th>
              <th>الخدمة</th>
              <th>الكمية</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.customerName}</td>
                <td>{order.whatsapp}</td>
                <td>{order.serviceName}</td>
                <td>{order.quantity}</td>
                <td>{order.total.toLocaleString()} ل.س</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status === 'pending' && 'معلق'}
                    {order.status === 'in_progress' && 'قيد التنفيذ'}
                    {order.status === 'delivered' && 'تم التوصيل'}
                  </span>
                </td>
                <td>{order.date}</td>
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

