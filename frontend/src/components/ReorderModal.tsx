import { useState, useEffect } from 'react'
import { X, MapPin, MessageSquare, Phone, Check } from 'lucide-react'
import { ordersAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import './ReorderModal.css'

interface ReorderModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: number
  onReorderSuccess?: () => void
}

interface ReorderData {
  order_id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp: string
  shop_name?: string
  delivery_type: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  notes?: string
  items: Array<{
    product_id?: number
    service_name: string
    quantity: number
    unit_price: number
    total_price: number
    specifications: any
    design_files: any[]
  }>
}

export default function ReorderModal({ isOpen, onClose, orderId, onReorderSuccess }: ReorderModalProps) {
  const [loading, setLoading] = useState(false)
  const [reorderData, setReorderData] = useState<ReorderData | null>(null)
  const [modifications, setModifications] = useState({
    addNotes: false,
    changeAddress: false,
    addPhone: false,
  })
  const [formData, setFormData] = useState({
    notes: '',
    delivery_address: '',
    delivery_latitude: null as number | null,
    delivery_longitude: null as number | null,
    additional_phone: '',
  })

  useEffect(() => {
    if (isOpen && orderId) {
      loadReorderData()
    }
  }, [isOpen, orderId])

  const loadReorderData = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getReorderData(orderId)
      setReorderData(response.data)
      // Initialize form data with existing order data
      if (response.data) {
        setFormData({
          notes: response.data.notes || '',
          delivery_address: response.data.delivery_address || '',
          delivery_latitude: response.data.delivery_latitude || null,
          delivery_longitude: response.data.delivery_longitude || null,
          additional_phone: '',
        })
      }
    } catch (error) {
      console.error('Error loading reorder data:', error)
      showError('تعذر تحميل بيانات الطلب')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!reorderData) return

    try {
      setLoading(true)

      // Prepare order data
      const orderData = {
        customer_name: reorderData.customer_name,
        customer_phone: reorderData.customer_phone,
        customer_whatsapp: modifications.addPhone && formData.additional_phone
          ? formData.additional_phone
          : reorderData.customer_whatsapp,
        shop_name: reorderData.shop_name,
        items: reorderData.items.map((item) => ({
          product_id: item.product_id,
          service_name: item.service_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          specifications: item.specifications,
          design_files: item.design_files,
        })),
        total_amount: reorderData.items.reduce((sum, item) => sum + item.total_price, 0),
        final_amount: reorderData.items.reduce((sum, item) => sum + item.total_price, 0),
        delivery_type: modifications.changeAddress ? 'delivery' : reorderData.delivery_type,
        delivery_address: modifications.changeAddress ? formData.delivery_address : reorderData.delivery_address,
        delivery_latitude: modifications.changeAddress ? formData.delivery_latitude : reorderData.delivery_latitude,
        delivery_longitude: modifications.changeAddress ? formData.delivery_longitude : reorderData.delivery_longitude,
        notes: modifications.addNotes ? formData.notes : reorderData.notes,
        previous_order_id: orderId,
      }

      await ordersAPI.create(orderData)
      showSuccess('تم إنشاء الطلب بنجاح!')
      onClose()
      if (onReorderSuccess) {
        onReorderSuccess()
      }
    } catch (error) {
      console.error('Error creating reorder:', error)
      showError('تعذر إنشاء الطلب. الرجاء المحاولة لاحقاً.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="reorder-modal-overlay" onClick={onClose}>
      <div className="reorder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reorder-modal-header">
          <h2>إعادة الطلب #{reorderData?.order_number || orderId}</h2>
          <button className="reorder-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="reorder-modal-content">
          {loading && !reorderData ? (
            <div className="reorder-modal-loading">جاري تحميل بيانات الطلب...</div>
          ) : reorderData ? (
            <>
              <div className="reorder-summary">
                <h3>ملخص الطلب السابق</h3>
                <div className="reorder-summary-item">
                  <strong>الخدمة:</strong> {reorderData.items[0]?.service_name || 'غير محدد'}
                </div>
                <div className="reorder-summary-item">
                  <strong>الكمية:</strong> {reorderData.items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div className="reorder-summary-item">
                  <strong>المبلغ:</strong> {reorderData.items.reduce((sum, item) => sum + item.total_price, 0)} ل.س
                </div>
              </div>

              <div className="reorder-options">
                <h3>خيارات التعديل</h3>

                <label className="reorder-option">
                  <input
                    type="checkbox"
                    checked={modifications.addNotes}
                    onChange={(e) => setModifications({ ...modifications, addNotes: e.target.checked })}
                  />
                  <MessageSquare size={20} />
                  <span>إضافة ملاحظات أو تعديلات</span>
                </label>

                {modifications.addNotes && (
                  <div className="reorder-option-content">
                    <textarea
                      placeholder="أدخل ملاحظاتك أو التعديلات المطلوبة..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                )}

                <label className="reorder-option">
                  <input
                    type="checkbox"
                    checked={modifications.changeAddress}
                    onChange={(e) => setModifications({ ...modifications, changeAddress: e.target.checked })}
                  />
                  <MapPin size={20} />
                  <span>تغيير العنوان</span>
                </label>

                {modifications.changeAddress && (
                  <div className="reorder-option-content">
                    <input
                      type="text"
                      placeholder="العنوان الجديد"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    />
                    <button
                      className="btn-location-picker"
                      onClick={() => {
                        // Navigate to location picker
                        window.location.href = '/location-picker?return=reorder'
                      }}
                    >
                      اختر موقع على الخريطة
                    </button>
                  </div>
                )}

                <label className="reorder-option">
                  <input
                    type="checkbox"
                    checked={modifications.addPhone}
                    onChange={(e) => setModifications({ ...modifications, addPhone: e.target.checked })}
                  />
                  <Phone size={20} />
                  <span>إضافة رقم إضافي</span>
                </label>

                {modifications.addPhone && (
                  <div className="reorder-option-content">
                    <input
                      type="tel"
                      placeholder="رقم الهاتف الإضافي"
                      value={formData.additional_phone}
                      onChange={(e) => setFormData({ ...formData, additional_phone: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="reorder-modal-actions">
                <button className="btn-secondary" onClick={onClose} disabled={loading}>
                  إلغاء
                </button>
                <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'جاري الإنشاء...' : 'إعادة الطلب'}
                </button>
              </div>
            </>
          ) : (
            <div className="reorder-modal-error">تعذر تحميل بيانات الطلب</div>
          )}
        </div>
      </div>
    </div>
  )
}

