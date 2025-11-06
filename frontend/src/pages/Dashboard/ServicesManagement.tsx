import { useState, useEffect } from 'react'
import { Plus, Edit, Eye, EyeOff, Trash2, Upload } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import './ServicesManagement.css'

interface Service {
  id: number
  name_ar: string
  name_en: string
  description_ar: string
  icon: string
  base_price: number
  is_visible: boolean
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.services.getAll()
      setServices(response.data)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const [isAdding, setIsAdding] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const toggleVisibility = (id: number) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, is_visible: !s.is_visible } : s
    ))
  }

  const deleteService = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟ سيتم حذفها نهائياً من قاعدة البيانات.')) {
      try {
        await adminAPI.services.delete(id)
        // إعادة تحميل الخدمات من السيرفر
        await loadServices()
        alert('تم حذف الخدمة بنجاح')
      } catch (error: any) {
        console.error('Error deleting service:', error)
        alert('فشل حذف الخدمة: ' + (error.response?.data?.detail || error.message || 'خطأ غير معروف'))
      }
    }
  }

  return (
    <div className="services-management">
      <div className="section-header">
        <div>
          <h1>إدارة الخدمات</h1>
          <p>عرض وإدارة جميع الخدمات</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={20} />
            إضافة خدمة
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={async () => {
              if (confirm('هل أنت متأكد من حذف جميع الخدمات المكررة؟ سيتم الاحتفاظ بالخدمة الأصلية أو التي لديها مراحل صحيحة.')) {
                try {
                  const response = await adminAPI.services.cleanupDuplicates()
                  alert(response.data.message || 'تم حذف الخدمات المكررة بنجاح')
                  await loadServices()
                } catch (error: any) {
                  alert('فشل حذف الخدمات المكررة: ' + (error.response?.data?.detail || error.message))
                }
              }
            }}
          >
            حذف الخدمات المكررة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="services-grid">
          {services.map(service => (
          <div key={service.id} className="service-card">
            <div className="service-header">
              <div className="service-icon">{service.icon}</div>
              <div className="service-badge">
                <span className={`badge-status ${service.is_visible ? 'visible' : 'hidden'}`}>
                  {service.is_visible ? 'ظاهر' : 'مخفي'}
                </span>
              </div>
            </div>
            <div className="service-info">
              <h3>{service.name_ar}</h3>
              <p className="service-english">{service.name_en}</p>
              <p className="service-description">{service.description_ar}</p>
              <p className="service-price">{service.base_price.toLocaleString()} ل.س</p>
            </div>
            <div className="service-actions">
              <button className="icon-btn" onClick={() => setEditingService(service)}>
                <Edit size={18} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => toggleVisibility(service.id)}
                title={service.is_visible ? 'إخفاء' : 'إظهار'}
              >
                {service.is_visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className="icon-btn delete" onClick={() => deleteService(service.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingService) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingService(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingService ? 'تعديل خدمة' : 'إضافة خدمة جديدة'}</h2>
            
            <form className="service-form">
              <div className="form-group">
                <label>اسم الخدمة (عربي)</label>
                <input type="text" defaultValue={editingService?.name_ar} />
              </div>

              <div className="form-group">
                <label>اسم الخدمة (إنجليزي)</label>
                <input type="text" defaultValue={editingService?.name_en} />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <textarea 
                  rows={3} 
                  defaultValue={editingService?.description_ar}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>الأيقونة (emoji)</label>
                <input type="text" defaultValue={editingService?.icon} />
              </div>

              <div className="form-group">
                <label>السعر الأساسي</label>
                <input type="number" defaultValue={editingService?.base_price} />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" defaultChecked={editingService?.is_visible} />
                  <span>الخدمة ظاهرة</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingService(null) }}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingService ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

