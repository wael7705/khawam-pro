import { useState, useEffect } from 'react'
import { Plus, Edit, Eye, EyeOff, Trash2, Upload, Star } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import './WorksManagement.css'

interface Work {
  id: number
  title: string
  title_ar: string
  description_ar: string
  image_url: string
  category_ar: string
  is_visible: boolean
  is_featured: boolean
}

export default function WorksManagement() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorks()
  }, [])

  const loadWorks = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.works.getAll()
      setWorks(response.data)
    } catch (error) {
      console.error('Error loading works:', error)
    } finally {
      setLoading(false)
    }
  }

  const [isAdding, setIsAdding] = useState(false)
  const [editingWork, setEditingWork] = useState<Work | null>(null)

  const toggleVisibility = (id: number) => {
    setWorks(works.map(w => 
      w.id === id ? { ...w, is_visible: !w.is_visible } : w
    ))
  }

  const toggleFeatured = (id: number) => {
    setWorks(works.map(w => 
      w.id === id ? { ...w, is_featured: !w.is_featured } : w
    ))
  }

  const deleteWork = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا العمل؟')) {
      setWorks(works.filter(w => w.id !== id))
    }
  }

  return (
    <div className="works-management">
      <div className="section-header">
        <div>
          <h1>إدارة الأعمال</h1>
          <p>عرض وإدارة جميع الأعمال</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={20} />
          إضافة عمل
        </button>
      </div>

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="works-grid">
          {works.map(work => (
          <div key={work.id} className="work-card">
            <div className="work-image">
              {work.image_url ? (
                <img src={work.image_url} alt={work.title} />
              ) : (
                <div className="placeholder-image">بدون صورة</div>
              )}
              <div className="work-badges">
                {work.is_featured && (
                  <span className="badge-featured">
                    <Star size={12} />
                    مميز
                  </span>
                )}
                <span className={`badge-status ${work.is_visible ? 'visible' : 'hidden'}`}>
                  {work.is_visible ? 'ظاهر' : 'مخفي'}
                </span>
              </div>
            </div>
            <div className="work-info">
              <span className="work-category">{work.category_ar}</span>
              <h3>{work.title_ar}</h3>
              <p>{work.description_ar}</p>
            </div>
            <div className="work-actions">
              <button className="icon-btn" onClick={() => setEditingWork(work)}>
                <Edit size={18} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => toggleFeatured(work.id)}
                title={work.is_featured ? 'إلغاء التميز' : 'جعل مميز'}
              >
                <Star size={18} className={work.is_featured ? 'filled' : ''} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => toggleVisibility(work.id)}
                title={work.is_visible ? 'إخفاء' : 'إظهار'}
              >
                {work.is_visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className="icon-btn delete" onClick={() => deleteWork(work.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingWork) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingWork(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingWork ? 'تعديل عمل' : 'إضافة عمل جديد'}</h2>
            
            <form className="work-form">
              <div className="form-group">
                <label>عنوان العمل (عربي)</label>
                <input type="text" defaultValue={editingWork?.title_ar} />
              </div>

              <div className="form-group">
                <label>عنوان العمل (إنجليزي)</label>
                <input type="text" defaultValue={editingWork?.title} />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <textarea 
                  rows={3} 
                  defaultValue={editingWork?.description_ar}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>الفئة</label>
                <input type="text" defaultValue={editingWork?.category_ar} />
              </div>

              <div className="form-group">
                <label>الصورة</label>
                <div className="upload-area">
                  <Upload size={24} />
                  <span>انقر للرفع أو اسحب الملف هنا</span>
                  <input type="file" accept="image/*" className="hidden" />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" defaultChecked={editingWork?.is_visible} />
                  <span>العمل ظاهر</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" defaultChecked={editingWork?.is_featured} />
                  <span>عمل مميز</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingWork(null) }}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWork ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

