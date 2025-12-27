import { useEffect, useState, useRef } from 'react'
import { Search, MessageSquare, Eye, Calendar, ShoppingCart, X, AlertCircle, CheckCircle, Package, Truck, MapPin, Download, Trash2, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './OrdersManagement.css'
import { adminAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import SimpleMap from '../../components/SimpleMap'
import { useOrderNotifications } from '../../hooks/useOrderNotifications'
import { useNotificationSound } from '../../hooks/useNotificationSound'
import OrderQuickViewDrawer from '../../components/OrderQuickViewDrawer'

interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp: string
  shop_name?: string
  status: string
  delivery_type: string
  total_amount: number
  final_amount: number
  created_at: string
  image_url?: string
  cancellation_reason?: string
  rejection_reason?: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  rating?: number
  rating_comment?: string
  order_type?: 'product' | 'service'  // نوع الطلب
  total_quantity?: number  // الكمية الإجمالية
  service_name?: string  // اسم الخدمة إذا كان طلب خدمة
}

const statusTabs = [
  { id: 'pending', label: 'في الانتظار', count: 0 },
  { id: 'preparing', label: 'قيد التحضير', count: 0 },
  { id: 'awaiting_pickup', label: 'استلام ذاتي', count: 0 },
  { id: 'shipping', label: 'قيد التوصيل', count: 0 },
  { id: 'completed', label: 'مكتمل', count: 0 },
  { id: 'cancelled', label: 'ملغى', count: 0 },
  { id: 'rejected', label: 'مرفوض', count: 0 },
  { id: 'archived', label: 'الأرشيف', count: 0 },
]


export default function OrdersManagement() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [cancelModalOpen, setCancelModalOpen] = useState<number | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<number | null>(null)
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([])
  const [archiveDate, setArchiveDate] = useState<string>('') // تاريخ الأرشيف اليومي
  const [archiveYear, setArchiveYear] = useState<number>(new Date().getFullYear()) // سنة الأرشيف الشهري
  const [archiveMonth, setArchiveMonth] = useState<number>(new Date().getMonth() + 1) // شهر الأرشيف الشهري
  const [archiveMode, setArchiveMode] = useState<'daily' | 'monthly'>('daily') // نوع الأرشيف
  const [availableArchiveDates, setAvailableArchiveDates] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState<number | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteAllPendingModalOpen, setDeleteAllPendingModalOpen] = useState(false)
  const [deletingAllPending, setDeletingAllPending] = useState(false)
  const [quickViewOrderId, setQuickViewOrderId] = useState<number | null>(null)
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'delivery' | 'self'>('all')
  
  // نظام الإشعارات
  const knownOrderIdsRef = useRef<Set<number>>(new Set())
  const { notifications, isConnected, notificationPermission } = useOrderNotifications({
    onNotificationClick: (orderId) => {
      navigate(`/dashboard/orders/${orderId}`)
      loadOrders(true)
    },
    enableDesktopNotifications: true,
    enableSoundNotifications: true,
  })
  const { playSound } = useNotificationSound()

  const loadOrders = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      console.log('🔄 Loading orders...')
      const res = await adminAPI.orders.getAll()
      console.log('📦 Orders API response:', res)
      console.log('📦 Response structure:', {
        data: res.data,
        dataType: typeof res.data,
        isArray: Array.isArray(res.data),
        keys: res.data && typeof res.data === 'object' ? Object.keys(res.data) : []
      })
      
      // Handle different response structures
      let data: Order[] = []
      
      // Backend returns: {success: True, orders: [...]}
      if (res.data && res.data.orders && Array.isArray(res.data.orders)) {
        data = res.data.orders
        console.log('✅ Found orders in res.data.orders:', data.length)
      }
      // Direct array
      else if (Array.isArray(res.data)) {
        data = res.data
        console.log('✅ Found orders as direct array:', data.length)
      } 
      // Nested in data.data
      else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        data = res.data.data
        console.log('✅ Found orders in res.data.data:', data.length)
      }
      // Try direct access if data is object with array property
      else if (res.data && typeof res.data === 'object') {
        // Try common keys
        const possibleKeys = ['orders', 'items', 'data', 'results']
        for (const key of possibleKeys) {
          if (Array.isArray(res.data[key])) {
            data = res.data[key]
            console.log(`✅ Found orders in res.data.${key}:`, data.length)
            break
          }
        }
      }
      
      console.log('✅ Final parsed orders:', data.length, 'orders')
      if (data.length > 0) {
        console.log('📋 Sample order:', data[0])
      } else {
        console.warn('⚠️ No orders found in response')
      }
      
      setOrders(data)
    } catch (e: any) {
      console.error('Error loading orders:', e)
      // لا نفرغ الطلبات إذا كانت موجودة بالفعل (للطلبات التلقائية)
      // فقط نعرض رسالة خطأ إذا كان هذا هو التحميل الأولي
      if (showLoading) {
      showError('حدث خطأ في جلب الطلبات')
      setOrders([])
      } else {
        // للطلبات التلقائية، لا نعرض رسالة خطأ ولا نفرغ البيانات
        // فقط نسجل الخطأ في console
        console.warn('⚠️ Failed to refresh orders in background, keeping existing data')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  // كشف الطلبات الجديدة وإظهار الإشعارات (فقط للطلبات الجديدة، وليس المكتملة)
  useEffect(() => {
    if (orders.length === 0) return

    const currentOrderIds = new Set(orders.map((o) => o.id))
    const newOrderIds = new Set<number>()

    orders.forEach((order) => {
      // تجاهل الطلبات المكتملة أو الملغاة أو المرفوضة
      if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') {
        // إضافة إلى المعروفة بدون إشعار
        knownOrderIdsRef.current.add(order.id)
        return
      }

      if (!knownOrderIdsRef.current.has(order.id)) {
        newOrderIds.add(order.id)
      }
    })

    if (newOrderIds.size > 0) {
      const newOrders = orders.filter((o) => newOrderIds.has(o.id))

      // تحديث قائمة الطلبات المعروفة
      newOrderIds.forEach((id) => knownOrderIdsRef.current.add(id))

      // إظهار إشعار لكل طلب جديد (فقط الطلبات النشطة)
      newOrders.forEach((order) => {
        // تجاهل الطلبات المكتملة
        if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') {
          return
        }

        playSound('new_order')

        // إظهار إشعار المتصفح إذا كان مسموحاً
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification('🆕 طلب جديد', {
              body: `طلب ${order.order_number} من ${order.customer_name}`,
              icon: order.image_url || '/logo.jpg',
              badge: '/logo.jpg',
              tag: `order-${order.id}`,
              requireInteraction: false,
            })

            notification.onclick = () => {
              window.focus()
              navigate(`/dashboard/orders/${order.id}`)
              notification.close()
            }
          } catch (error) {
            console.warn('⚠️ فشل إظهار إشعار المتصفح:', error)
          }
        }

        // إظهار toast notification
        showSuccess(`طلب جديد: ${order.order_number}`)
      })
    }
  }, [orders, navigate, playSound, showSuccess])

  useEffect(() => {
    let initialLoadTimeout: ReturnType<typeof setTimeout> | null = null
    
    const loadInitialOrders = async () => {
      await loadOrders(true) // Show loading only on initial load
      await loadArchivedOrders()
      
      // حفظ IDs جميع الطلبات الحالية فور التحميل الأول (قبل أي إشعارات)
      // هذا يمنع إظهار إشعارات للطلبات الموجودة عند فتح الصفحة
      initialLoadTimeout = setTimeout(() => {
        orders.forEach((order) => {
          knownOrderIdsRef.current.add(order.id)
        })
      }, 500) // وقت قصير بعد التحميل
    }
    
    loadInitialOrders()

    // Refresh every 30 seconds in background - فقط إذا كانت الصفحة مرئية
    let interval: NodeJS.Timeout | null = null
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // إذا كانت الصفحة مخفية، أوقف التحديث التلقائي
        if (interval) {
          clearInterval(interval)
          interval = null
        }
      } else {
        // إذا كانت الصفحة مرئية، استأنف التحديث التلقائي
        if (!interval) {
          interval = setInterval(() => loadOrders(false), 30000)
        }
      }
    }
    
    // بدء التحديث التلقائي فقط إذا كانت الصفحة مرئية
    if (!document.hidden) {
      interval = setInterval(() => loadOrders(false), 30000)
    }
    
    // الاستماع لتغييرات رؤية الصفحة
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      if (initialLoadTimeout) {
        clearTimeout(initialLoadTimeout)
      }
      if (interval) {
        clearInterval(interval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadArchivedOrders = async () => {
    try {
      if (archiveMode === 'daily') {
        // جلب الأرشيف اليومي
        const response = await adminAPI.orders.archive.getDaily(archiveDate || undefined)
        if (response.data.success) {
          setArchivedOrders(response.data.orders || [])
        }
      } else {
        // جلب الأرشيف الشهري
        const response = await adminAPI.orders.archive.getMonthly(archiveYear, archiveMonth)
        if (response.data.success) {
          setArchivedOrders(response.data.orders || [])
        }
      }
    } catch (error) {
      console.error('Error loading archived orders:', error)
        setArchivedOrders([])
      }
    }

  const loadAvailableArchiveDates = async () => {
    try {
      const response = await adminAPI.orders.archive.getDates()
      if (response.data.success) {
        setAvailableArchiveDates(response.data.dates || [])
      }
    } catch (error) {
      console.error('Error loading archive dates:', error)
    }
  }

  // تحميل الأرشيف عند تغيير التبويب أو التاريخ
  useEffect(() => {
    if (activeTab === 'archived') {
      loadAvailableArchiveDates()
      loadArchivedOrders()
    }
  }, [activeTab, archiveDate, archiveYear, archiveMonth, archiveMode])

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'في الانتظار',
      accepted: 'تم القبول',
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
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      accepted: '#3B82F6',
      preparing: '#8B5CF6',
      shipping: '#10B981',
      awaiting_pickup: '#06B6D4',
      completed: '#10B981',
      cancelled: '#EF4444',
      rejected: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get orders count by status (ignore search query for count)
  const getOrdersCountByStatus = (status: string) => {
    if (status === 'archived') {
      return archivedOrders.length
    }
    return orders.filter(order => order.status === status).length
  }

  // Get display orders (archived or active)
  const getDisplayOrders = () => {
    if (activeTab === 'archived') {
      return archivedOrders
    }
    return orders
  }

  // Filter orders by active tab, search, and delivery type
  const filteredOrders = getDisplayOrders().filter(order => {
    const matchesSearch = searchQuery === '' || 
      (order.order_number && String(order.order_number).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer_name && String(order.customer_name).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer_phone && String(order.customer_phone).includes(searchQuery))
    
    if (activeTab === 'archived') {
      return matchesSearch
    }
    
    const matchesTab = order.status === activeTab
    
    // Additional validation: shipping tab should only show delivery orders, not self-pickup
    if (activeTab === 'shipping' && order.delivery_type !== 'delivery') {
      return false
    }
    
    // Additional validation: awaiting_pickup tab should only show self-pickup orders
    if (activeTab === 'awaiting_pickup' && order.delivery_type !== 'self') {
      return false
    }
    
    // Delivery type filter
    if (deliveryFilter !== 'all') {
      if (deliveryFilter === 'delivery' && order.delivery_type !== 'delivery') {
        return false
      }
      if (deliveryFilter === 'self' && order.delivery_type !== 'self') {
        return false
      }
    }
    
    return matchesSearch && matchesTab
  })
  
  // Debug logging for shipping tab
  useEffect(() => {
    if (activeTab === 'shipping') {
      console.log('=== Shipping Tab Debug ===')
      console.log('Total orders:', orders.length)
      console.log('Filtered orders:', filteredOrders.length)
      console.log('Orders with shipping status:', orders.filter(o => o.status === 'shipping').length)
      console.log('Orders with delivery_type=delivery:', orders.filter(o => o.delivery_type === 'delivery').length)
      console.log('Orders with shipping status AND delivery_type=delivery:', 
        orders.filter(o => o.status === 'shipping' && o.delivery_type === 'delivery').length)
      
      filteredOrders.forEach(order => {
        console.log(`Order ${order.order_number}:`, {
          status: order.status,
          delivery_type: order.delivery_type,
          has_address: !!order.delivery_address,
          has_lat: !!order.delivery_latitude,
          has_lng: !!order.delivery_longitude,
          lat: order.delivery_latitude,
          lng: order.delivery_longitude,
          address: order.delivery_address
        })
      })
      console.log('========================')
    }
  }, [activeTab, orders, filteredOrders])
  
  const handleAcceptOrder = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'preparing')
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      // Update in background without showing loading
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'preparing' }
            : order
        )
      )
      
      showSuccess(`تم قبول الطلب ونقله إلى قيد التحضير - ${orderNumber}`)
    } catch (e) {
      console.error('Error accepting order:', e)
      showError('حدث خطأ في قبول الطلب')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleFinishPreparing = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      const order = orders.find(o => o.id === orderId)
      if (!order) return
      
      // Validation: Check delivery type and ensure correct status
      if (order.delivery_type === 'self') {
        // Self pickup orders can only go to awaiting_pickup
        const newStatus = 'awaiting_pickup'
        
        // Update in background first
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        )
        
        await adminAPI.orders.updateStatus(orderId, newStatus)
        showSuccess(`تم الانتهاء من التحضير ونقل الطلب إلى استلام ذاتي - ${order.order_number}`)
      } else if (order.delivery_type === 'delivery') {
        // Delivery orders can only go to shipping, and must have address
        if (!order.delivery_address) {
          showError('يجب إدخال عنوان التوصيل للطلبات التي تتطلب التوصيل')
          return
        }
        
        const newStatus = 'shipping'
        
        // Update in background first
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        )
        
        await adminAPI.orders.updateStatus(orderId, newStatus)
        showSuccess(`تم الانتهاء من التحضير ونقل الطلب إلى قيد التوصيل - ${order.order_number}`)
      } else {
        showError('نوع التوصيل غير معروف')
        return
      }
    } catch (e) {
      console.error('Error finishing preparation:', e)
      showError('حدث خطأ في إنهاء التحضير')
      // Revert on error
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === orderId ? { ...o, status: order.status } : o
          )
        )
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleCompleteOrder = async (orderId: number) => {
    try {
      setUpdatingOrderId(orderId)
      const order = orders.find(o => o.id === orderId)
      
      // Update in background first
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed' }
            : order
        )
      )
      
      // Then update in backend
      await adminAPI.orders.updateStatus(orderId, 'completed')
      
      const orderNumber = order?.order_number || `#${orderId}`
      showSuccess(`تم استلام الطلب بنجاح - ${orderNumber}`)
    } catch (e) {
      console.error('Error completing order:', e)
      showError('حدث خطأ في استلام الطلب')
      // Revert on error
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === orderId ? { ...o, status: order.status } : o
          )
        )
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!cancelReason.trim()) {
      showError('يرجى إدخال سبب الإلغاء')
      return
    }
    
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'cancelled', cancelReason)
      
      // Update order status locally
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        )
      )
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      showSuccess(`تم إلغاء الطلب بنجاح - ${orderNumber}`)
      setCancelModalOpen(null)
      setCancelReason('')
    } catch (e) {
      console.error('Error cancelling order:', e)
      showError('حدث خطأ في إلغاء الطلب')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleRejectOrder = async (orderId: number) => {
    if (!rejectReason.trim()) {
      showError('يرجى إدخال سبب الرفض')
      return
    }
    
    try {
      setUpdatingOrderId(orderId)
      await adminAPI.orders.updateStatus(orderId, 'rejected', undefined, rejectReason)
      
      // Update order status locally
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'rejected' }
            : order
        )
      )
      
      const order = orders.find(o => o.id === orderId)
      const orderNumber = order?.order_number || `#${orderId}`
      
      showSuccess(`تم رفض الطلب بنجاح - ${orderNumber}`)
      setRejectModalOpen(null)
      setRejectReason('')
    } catch (e) {
      console.error('Error rejecting order:', e)
      showError('حدث خطأ في رفض الطلب')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleDeleteOrder = async (orderId: number, reason?: string) => {
    try {
      setUpdatingOrderId(orderId)
      if (reason && reason.trim()) {
        try {
          await adminAPI.orders.updateStatus(orderId, 'cancelled', reason.trim())
        } catch (statusError) {
          console.warn('Failed to record delete reason before deletion:', statusError)
        }
      }

      await adminAPI.orders.delete(orderId)
      
      // Remove from orders list
      setOrders(prev => prev.filter(o => o.id !== orderId))
      
      // Also remove from archived if exists
      setArchivedOrders(prev => {
        const updated = prev.filter(o => o.id !== orderId)
        localStorage.setItem('archivedOrders', JSON.stringify(updated))
        return updated
      })
      
      showSuccess('تم حذف الطلب بنجاح')
      if (activeTab !== 'archived') {
      loadOrders(false)
      }
    } catch (e: any) {
      console.error('Error deleting order:', e)
      showError(e.response?.data?.detail || 'حدث خطأ في حذف الطلب')
    } finally {
      setUpdatingOrderId(null)
      setDeleteModalOpen(null)
      setDeleteReason('')
    }
  }

  const handleDeleteAllPending = async () => {
    try {
      setDeletingAllPending(true)
      const response = await adminAPI.orders.deleteByStatus('pending')
      
      // Remove all pending orders from local state
      setOrders(prevOrders => prevOrders.filter(order => order.status !== 'pending'))
      
      const deletedCount = response.data?.deleted_orders_count || 0
      showSuccess(`تم حذف ${deletedCount} طلب في الانتظار بنجاح`)
      setDeleteAllPendingModalOpen(false)
      
      // Reload orders to refresh counts
      await loadOrders(true)
    } catch (e: any) {
      console.error('Error deleting all pending orders:', e)
      const errorMessage = e?.response?.data?.detail || e?.message || 'حدث خطأ في حذف الطلبات'
      showError(errorMessage)
    } finally {
      setDeletingAllPending(false)
    }
  }

  const handleExportArchive = async () => {
    if (archivedOrders.length === 0) {
      showError('الأرشيف فارغ')
      return
    }

    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx')
      
      // Prepare data for Excel
      const headers = ['رقم الطلب', 'اسم العميل', 'رقم الهاتف', 'واتساب', 'اسم المتجر', 'الحالة', 'نوع التوصيل', 'عنوان التوصيل', 'المبلغ الإجمالي', 'المبلغ النهائي', 'حالة الدفع', 'تاريخ الطلب', 'التقييم', 'تعليق التقييم', 'ملاحظات']
      const rows = archivedOrders.map(order => [
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
        'pending', // payment_status
        order.created_at || '',
        order.rating ? `${order.rating} ⭐` : '',
        order.rating_comment || '',
        order.notes || ''
      ])

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // رقم الطلب
        { wch: 20 }, // اسم العميل
        { wch: 15 }, // رقم الهاتف
        { wch: 15 }, // واتساب
        { wch: 20 }, // اسم المتجر
        { wch: 12 }, // الحالة
        { wch: 12 }, // نوع التوصيل
        { wch: 30 }, // عنوان التوصيل
        { wch: 15 }, // المبلغ الإجمالي
        { wch: 15 }, // المبلغ النهائي
        { wch: 12 }, // حالة الدفع
        { wch: 20 }, // تاريخ الطلب
        { wch: 10 }, // التقييم
        { wch: 40 }, // تعليق التقييم
        { wch: 40 }  // ملاحظات
      ]

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'أرشيف الطلبات')

      // Generate file and download
      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `أرشيف_الطلبات_${date}.xlsx`)

      showSuccess('تم تصدير الأرشيف بنجاح')
    } catch (error: any) {
      console.error('Error exporting archive:', error)
      if (error.message?.includes('xlsx') || error.code === 'MODULE_NOT_FOUND') {
        showError('مكتبة Excel غير مثبتة. يرجى تثبيتها: npm install xlsx')
      } else {
        showError('حدث خطأ في تصدير الأرشيف')
      }
    }
  }

  return (
    <div className="orders-management">
      {/* مؤشر الاتصال بالإشعارات */}
      <div className="notification-status" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: isConnected ? '#10B981' : '#EF4444',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer'
      }}
      onClick={() => {
        console.log('WebSocket Status:', {
          isConnected,
          notifications: notifications.length,
          permission: notificationPermission
        })
      }}
      title={isConnected ? 'الإشعارات نشطة' : 'الإشعارات غير متصلة - جاري إعادة الاتصال...'}
      >
        <Bell size={16} />
        <span>{isConnected ? 'الإشعارات نشطة' : 'غير متصل'}</span>
      </div>
      <div className="orders-sticky-toolbar">
        <div className="section-header">
          <div>
            <h1>إدارة الطلبات</h1>
            <p>عرض وإدارة جميع الطلبات ({filteredOrders.length})</p>
          </div>
          {activeTab === 'archived' && archivedOrders.length > 0 && (
            <button
              className="export-archive-btn"
              onClick={handleExportArchive}
            >
              <Download size={18} />
              تصدير الأرشيف
            </button>
          )}
        </div>

        <div className="orders-filters">
          <div className="search-box">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن طلب (رقم الطلب، اسم العميل، رقم الهاتف)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Delivery Type Filter */}
          {activeTab !== 'archived' && (
            <div className="delivery-filter-box">
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as 'all' | 'delivery' | 'self')}
                className="delivery-filter-select"
              >
                <option value="all">كل الأنواع</option>
                <option value="delivery">🚚 توصيل</option>
                <option value="self">🏪 استلام ذاتي</option>
              </select>
            </div>
          )}
        
        {/* فلاتر الأرشيف */}
        {activeTab === 'archived' && (
          <div className="archive-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 500 }}>نوع الأرشيف:</label>
              <select 
                value={archiveMode} 
                onChange={(e) => setArchiveMode(e.target.value as 'daily' | 'monthly')}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
              >
                <option value="daily">يومي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
            
            {archiveMode === 'daily' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>التاريخ:</label>
                <input
                  type="date"
                  value={archiveDate}
                  onChange={(e) => setArchiveDate(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
                {availableArchiveDates.length > 0 && (
                  <select
                    value={archiveDate}
                    onChange={(e) => setArchiveDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                  >
                    <option value="">اختر تاريخاً</option>
                    {availableArchiveDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>السنة:</label>
                <input
                  type="number"
                  value={archiveYear}
                  onChange={(e) => setArchiveYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min="2020"
                  max={new Date().getFullYear()}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100px' }}
                />
                <label style={{ fontSize: '14px', fontWeight: 500 }}>الشهر:</label>
                <select
                  value={archiveMonth}
                  onChange={(e) => setArchiveMonth(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleDateString('ar-SA', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Status Tabs */}
        <div className="status-tabs" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {statusTabs.map(tab => {
          const count = getOrdersCountByStatus(tab.id)
          return (
            <button
              key={tab.id}
              className={`status-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{count}</span>
        </button>
          )
        })}
        {activeTab === 'pending' && getOrdersCountByStatus('pending') > 0 && (
          <button
            onClick={() => setDeleteAllPendingModalOpen(true)}
            style={{
              marginLeft: 'auto',
              padding: '12px 24px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: deletingAllPending ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s',
              opacity: deletingAllPending ? 0.6 : 1
            }}
            disabled={deletingAllPending}
            onMouseOver={(e) => {
              if (!deletingAllPending) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Trash2 size={18} />
            {deletingAllPending ? 'جاري الحذف...' : `حذف جميع الطلبات في الانتظار (${getOrdersCountByStatus('pending')})`}
          </button>
        )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading">جاري التحميل...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={64} />
          <h3>لا توجد طلبات</h3>
          <p>{searchQuery ? 'لا توجد طلبات تطابق البحث' : `لا توجد طلبات بحالة "${statusTabs.find(t => t.id === activeTab)?.label}"`}</p>
        </div>
      ) : (
        <>
          {/* Map Section - Always visible when shipping tab is active */}
          {activeTab === 'shipping' && (
            <div className="shipping-map-container">
              <h3 className="map-section-title">خريطة مواقع التوصيل</h3>
              <div className="shipping-map-wrapper">
                {selectedOrderForMap ? (
                  // Show single order map
                  (() => {
                    const order = filteredOrders.find(o => o.id === selectedOrderForMap)
                    if (!order || !order.delivery_address) return null
                    
                    return (
                      <div className="single-order-map">
                        <div className="map-order-info">
                          <strong>{order.order_number}</strong> - {order.customer_name}
                          <span className="map-close-btn" onClick={() => setSelectedOrderForMap(null)}>
                            <X size={16} />
                  </span>
                        </div>
                        <SimpleMap
                          address={order.delivery_address}
                          latitude={order.delivery_latitude}
                          longitude={order.delivery_longitude}
                        />
                        <div className="map-actions">
                          <a
                            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(order.delivery_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link-btn"
                          >
                            <MapPin size={18} />
                            فتح في OpenStreetMap
                          </a>
      </div>
                      </div>
                    )
                  })()
                ) : (
                  // Show overview map with all shipping orders
                  <div className="all-orders-map">
                    <SimpleMap
                      defaultCenter={[33.5138, 36.2765]}
                      defaultZoom={12}
                      markers={filteredOrders
                        .filter(o => o.delivery_latitude && o.delivery_longitude)
                        .map(o => ({
                          lat: o.delivery_latitude!,
                          lng: o.delivery_longitude!,
                          title: `${o.order_number} - ${o.customer_name}`,
                          description: o.delivery_address || ''
                        }))
                      }
                    />
                    <div className="map-hint">
                      <MapPin size={16} />
                      <span>
                        {filteredOrders.length > 0 
                          ? 'اضغط على أيقونة الخريطة في بطاقة الطلب لعرض موقعه المحدد'
                          : 'لا توجد طلبات قيد التوصيل لعرضها على الخريطة'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="orders-list">
            {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className={`order-card-horizontal ${updatingOrderId === order.id ? 'updating' : ''}`}
              onClick={(e) => {
                // Prevent opening drawer when clicking on buttons/links
                const target = e.target as HTMLElement
                if (target.closest('button') || target.closest('a')) {
                  return
                }
                setQuickViewOrderId(order.id)
              }}
              style={{ cursor: 'pointer' }}
            >
              {order.image_url && (
                <div className="order-image-container">
                  <img 
                    src={
                      order.image_url.startsWith('data:') 
                        ? order.image_url 
                        : order.image_url.startsWith('http')
                        ? order.image_url
                        : `https://khawam-pro-production.up.railway.app${order.image_url.startsWith('/') ? order.image_url : '/' + order.image_url}`
                    }
                    alt={order.order_number}
                    className="order-card-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}

              <div className="order-card-content">
                <div className="order-card-header">
                  <div className="order-number-header">
                    <div className="order-number">#{order.order_number}</div>
                    {order.order_type && (
                      <span className={`order-type-badge ${order.order_type}`}>
                        {order.order_type === 'service' ? '🛠️ خدمة' : '📦 منتج'}
                      </span>
                    )}
                    {order.total_quantity && order.total_quantity > 0 && (
                      <span className="order-quantity-badge">
                        الكمية: {order.total_quantity}
                      </span>
                    )}
                  </div>
                  <div className="order-status-controls">
                    {/* Status Display - No dropdown */}
                    <div 
                      className={`status-badge ${updatingOrderId === order.id ? 'updating' : ''}`}
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      <span>{getStatusLabel(order.status)}</span>
                    </div>
                    
                    {/* Action Buttons based on status */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          className="action-btn icon-btn accept-btn"
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="قبول الطلب"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          className="action-btn icon-btn reject-btn"
                          onClick={() => setRejectModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="رفض الطلب"
                        >
                          <AlertCircle size={18} />
                        </button>
                      </>
                    )}
                    
                    {order.status === 'preparing' && (
                      <>
                        <button
                          className="action-btn icon-btn finish-prep-btn"
                          onClick={() => handleFinishPreparing(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="انتهاء التحضير"
                        >
                          <Package size={18} />
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {order.status === 'awaiting_pickup' && (
                      <>
                        <button
                          className="action-btn icon-btn complete-btn"
                          onClick={() => handleCompleteOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="تم الاستلام"
                        >
                          <Truck size={18} />
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {order.status === 'shipping' && (
                      <>
                        <button
                          className="action-btn icon-btn map-btn"
                          onClick={() => setSelectedOrderForMap(order.id === selectedOrderForMap ? null : order.id)}
                          disabled={updatingOrderId === order.id}
                          title="عرض على الخريطة"
                          style={{ backgroundColor: order.id === selectedOrderForMap ? '#8b5cf6' : undefined }}
                        >
                          <MapPin size={18} />
                        </button>
                        <button
                          className="action-btn icon-btn complete-btn"
                          onClick={() => handleCompleteOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="تم الاستلام"
                        >
                          <Truck size={18} />
                        </button>
                        <button
                          className="action-btn cancel-btn-small"
                          onClick={() => setCancelModalOpen(order.id)}
                          disabled={updatingOrderId === order.id}
                          title="إلغاء الطلب"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    
                    {/* Cancel button for other statuses */}
                    {order.status !== 'pending' && order.status !== 'preparing' && 
                     order.status !== 'shipping' && order.status !== 'awaiting_pickup' && 
                     order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        className="action-btn cancel-btn-small"
                        onClick={() => setCancelModalOpen(order.id)}
                        disabled={updatingOrderId === order.id}
                        title="إلغاء الطلب"
                      >
                        <X size={16} />
                      </button>
                    )}

                    {/* Delete button for orders with delivery type but missing address data */}
                    {order.delivery_type === 'delivery' && !order.delivery_address && !order.delivery_latitude && (
                      <button
                        className="action-btn icon-btn delete-btn"
                        onClick={() => {
                          setDeleteReason('')
                          setDeleteModalOpen(order.id)
                        }}
                        disabled={updatingOrderId === order.id}
                        title="حذف الطلب المعطل"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {/* Delete button in archive */}
                    {activeTab === 'archived' && (
                      <button
                        className="action-btn icon-btn delete-btn"
                        onClick={() => {
                          setDeleteReason('')
                          setDeleteModalOpen(order.id)
                        }}
                        disabled={updatingOrderId === order.id}
                        title="حذف من الأرشيف"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {/* General delete with reason for non-pending statuses */}
                    {order.status !== 'pending' && activeTab !== 'archived' && !(!order.delivery_address && order.delivery_type === 'delivery' && !order.delivery_latitude) && (
                      <button
                        className="action-btn icon-btn delete-btn"
                        onClick={() => {
                          setDeleteReason('')
                          setDeleteModalOpen(order.id)
                        }}
                        disabled={updatingOrderId === order.id}
                        title="حذف الطلب مع توثيق السبب"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="customer-info">
                    <div className="customer-name">
                      <span className="label">العميل:</span>
                      <span className="value">{order.customer_name || '-'}</span>
                    </div>
                    
                    {order.shop_name && (
                      <div className="shop-name">
                        <span className="label">المتجر:</span>
                        <span className="value">{order.shop_name}</span>
        </div>
                    )}

                    <div className="customer-contact">
                      <span className="label">الهاتف:</span>
                      <span className="value">{order.customer_phone || '-'}</span>
                      {(order.customer_whatsapp || order.customer_phone) && (
                        <button
                          className="whatsapp-link-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            openWhatsApp(order.customer_whatsapp || order.customer_phone)
                          }}
                          title="فتح واتساب"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                    </div>
                    {order.customer_whatsapp && order.customer_whatsapp !== order.customer_phone && (
                      <div className="customer-whatsapp-extra">
                        <span className="label">واتساب إضافي:</span>
                        <span className="value">{order.customer_whatsapp}</span>
                        <button
                          className="whatsapp-link-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            openWhatsApp(order.customer_whatsapp)
                          }}
                          title="فتح واتساب الإضافي"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    )}
      </div>

                  <div className="order-meta">
                    <div className="meta-item">
                      <Calendar size={16} />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="meta-item delivery-type">
                      <span className="delivery-badge">
                        {order.delivery_type === 'delivery' ? '🚚 توصيل' : '🏪 استلام ذاتي'}
                  </span>
                    </div>
                  </div>

                  {/* Show cancellation or rejection reason */}
                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <div className="reason-display cancellation-reason">
                      <strong>سبب الإلغاء:</strong>
                      <span>{order.cancellation_reason}</span>
                    </div>
                  )}
                  
                  {order.status === 'rejected' && order.rejection_reason && (
                    <div className="reason-display rejection-reason">
                      <strong>سبب الرفض:</strong>
                      <span>{order.rejection_reason}</span>
                    </div>
                  )}

                  {/* Rating Display */}
                  {order.rating && (
                    <div className="rating-display">
                      <strong>تقييم العميل:</strong>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span 
                            key={star} 
                            className={star <= order.rating! ? 'star-filled' : 'star-empty'}
                          >
                            ⭐
                          </span>
                        ))}
                        <span className="rating-value">({order.rating}/5)</span>
                      </div>
                      {order.rating_comment && (
                        <div className="rating-comment">
                          <strong>التعليق:</strong>
                          <p>{order.rating_comment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">الإجمالي:</span>
                    <span className="total-amount">{order.final_amount.toLocaleString()} ل.س</span>
                  </div>
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <Eye size={16} />
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Quick View Drawer */}
      <OrderQuickViewDrawer
        orderId={quickViewOrderId}
        onClose={() => setQuickViewOrderId(null)}
        onStatusUpdate={() => {
          loadOrders(false)
          setQuickViewOrderId(null)
        }}
      />

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="modal-overlay" onClick={() => { setCancelModalOpen(null); setCancelReason('') }}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <X size={24} />
              <h3>إلغاء الطلب</h3>
              <button className="modal-close" onClick={() => { setCancelModalOpen(null); setCancelReason('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>يرجى إدخال سبب إلغاء الطلب:</p>
              <textarea
                className="cancel-reason-input"
                placeholder="مثال: طلب العميل إلغاء الطلب..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => { setCancelModalOpen(null); setCancelReason('') }}
              >
                إلغاء
              </button>
              <button
                className="cancel-btn-primary"
                onClick={() => handleCancelOrder(cancelModalOpen)}
                disabled={updatingOrderId === cancelModalOpen}
              >
                {updatingOrderId === cancelModalOpen ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay" onClick={() => { setRejectModalOpen(null); setRejectReason('') }}>
          <div className="cancel-modal reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={24} />
              <h3>رفض الطلب</h3>
              <button className="modal-close" onClick={() => { setRejectModalOpen(null); setRejectReason('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>يرجى إدخال سبب رفض الطلب:</p>
              <textarea
                className="cancel-reason-input"
                placeholder="مثال: الطلب غير متوافق مع المتطلبات..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => { setRejectModalOpen(null); setRejectReason('') }}
              >
                إلغاء
              </button>
              <button
                className="reject-btn-primary"
                onClick={() => handleRejectOrder(rejectModalOpen)}
                disabled={updatingOrderId === rejectModalOpen}
              >
                {updatingOrderId === rejectModalOpen ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => { setDeleteModalOpen(null); setDeleteReason('') }}>
          <div className="cancel-modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Trash2 size={24} />
              <h3>حذف الطلب</h3>
              <button className="modal-close" onClick={() => { setDeleteModalOpen(null); setDeleteReason('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>يرجى إدخال سبب حذف الطلب (سيتم حفظه قبل الحذف):</p>
              <textarea
                className="cancel-reason-input"
                placeholder="مثال: تم إنشاء طلب جديد بدلاً منه..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => { setDeleteModalOpen(null); setDeleteReason('') }}
              >
                إلغاء
              </button>
              <button
                className="delete-btn-primary"
                onClick={() => {
                  if (!deleteReason.trim()) {
                    showError('يرجى إدخال سبب الحذف')
                    return
                  }
                  handleDeleteOrder(deleteModalOpen, deleteReason.trim())
                }}
                disabled={updatingOrderId === deleteModalOpen}
              >
                {updatingOrderId === deleteModalOpen ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Pending Modal */}
      {deleteAllPendingModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteAllPendingModalOpen(false)}>
          <div className="cancel-modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Trash2 size={24} />
              <h3>حذف جميع الطلبات في الانتظار</h3>
              <button className="modal-close" onClick={() => setDeleteAllPendingModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#EF4444', marginBottom: '12px' }}>
                تحذير: هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p>
                هل أنت متأكد من حذف جميع الطلبات في حالة "في الانتظار"؟ 
                ({getOrdersCountByStatus('pending')} طلب)
              </p>
              <p style={{ marginTop: '12px', color: '#6B7280', fontSize: '14px' }}>
                سيتم حذف جميع الطلبات وعناصرها بشكل نهائي من قاعدة البيانات.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn-secondary"
                onClick={() => setDeleteAllPendingModalOpen(false)}
                disabled={deletingAllPending}
              >
                إلغاء
              </button>
              <button
                className="delete-btn-primary"
                onClick={handleDeleteAllPending}
                disabled={deletingAllPending}
                style={{ background: '#EF4444' }}
              >
                {deletingAllPending ? 'جاري الحذف...' : 'نعم، احذف جميع الطلبات'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
