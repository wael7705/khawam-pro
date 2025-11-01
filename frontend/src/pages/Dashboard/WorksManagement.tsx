import { useState, useEffect } from 'react'
import { Plus, Edit, Eye, EyeOff, Trash2, Upload, Star } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import WorkForm from '../../components/WorkForm'
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
                <img 
                  loading="lazy"
                  decoding="async"
                  src={
                    // دعم base64 data URLs
                    work.image_url.startsWith('data:')
                      ? work.image_url
                      // دعم الروابط الخارجية
                      : work.image_url.startsWith('http')
                      ? work.image_url
                      // دعم المسارات النسبية
                      : `https://khawam-pro-production.up.railway.app${work.image_url.startsWith('/') ? work.image_url : '/' + work.image_url}`
                  }
                  alt={work.title_ar}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              {!work.image_url && (
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
            
            <WorkForm 
              work={editingWork}
              onCancel={() => { setIsAdding(false); setEditingWork(null) }}
              onSuccess={() => { setIsAdding(false); setEditingWork(null); loadWorks() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

