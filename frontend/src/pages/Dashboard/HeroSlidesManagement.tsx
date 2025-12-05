import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Upload, ArrowUp, ArrowDown, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { heroSlidesAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import './HeroSlidesManagement.css'

interface HeroSlide {
  id: number
  image_url: string
  is_logo: boolean
  is_active: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export default function HeroSlidesManagement() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    image_url: '',
    is_logo: false,
    is_active: true,
    display_order: 0,
  })

  useEffect(() => {
    loadSlides()
  }, [])

  const loadSlides = async () => {
    try {
      setLoading(true)
      const response = await heroSlidesAPI.getAll()
      if (response.data.success) {
        const sortedSlides = (response.data.slides || []).sort((a: HeroSlide, b: HeroSlide) => {
          if (a.is_logo && !b.is_logo) return -1
          if (!a.is_logo && b.is_logo) return 1
          return a.display_order - b.display_order
        })
        setSlides(sortedSlides)
      }
    } catch (error) {
      console.error('Error loading hero slides:', error)
      showError('خطأ في جلب السلايدات')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.image_url.trim()) {
      showError('يرجى إدخال رابط الصورة')
      return
    }

    try {
      setSaving(true)
      
      if (editingSlide) {
        // عند التحديث، نرسل فقط الحقول التي تم تغييرها
        // إذا لم تتغير image_url، نرسلها كما هي للحفاظ عليها
        const updateData: any = {
          is_logo: formData.is_logo,
          is_active: formData.is_active,
          display_order: formData.display_order,
        }
        
        // إرسال image_url فقط إذا كانت موجودة (حتى لو لم تتغير)
        if (formData.image_url && formData.image_url.trim()) {
          updateData.image_url = formData.image_url.trim()
        } else if (editingSlide.image_url) {
          // إذا لم يكن هناك image_url جديد، نحتفظ بالقديم
          updateData.image_url = editingSlide.image_url
        }
        
        await heroSlidesAPI.update(editingSlide.id, updateData)
        showSuccess('تم تحديث السلايدة بنجاح')
      } else {
        await heroSlidesAPI.create(formData)
        showSuccess('تم إنشاء السلايدة بنجاح')
      }

      setIsAdding(false)
      setEditingSlide(null)
      resetForm()
      loadSlides()
    } catch (error: any) {
      console.error('Error saving hero slide:', error)
      showError(error.response?.data?.detail || 'خطأ في حفظ السلايدة')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (slide: HeroSlide) => {
    setEditingSlide(slide)
    setFormData({
      image_url: slide.image_url,
      is_logo: slide.is_logo,
      is_active: slide.is_active,
      display_order: slide.display_order,
    })
    setIsAdding(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه السلايدة؟')) return
    
    try {
      await heroSlidesAPI.delete(id)
      showSuccess('تم حذف السلايدة بنجاح')
      loadSlides()
    } catch (error: any) {
      console.error('Error deleting hero slide:', error)
      showError(error.response?.data?.detail || 'خطأ في حذف السلايدة')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    
    const newSlides = [...slides]
    const temp = newSlides[index]
    newSlides[index] = newSlides[index - 1]
    newSlides[index - 1] = temp
    
    // تحديث display_order
    const orders = newSlides.map((slide, idx) => ({
      id: slide.id,
      display_order: idx
    }))
    
    try {
      await heroSlidesAPI.reorder(orders)
      showSuccess('تم تحديث الترتيب بنجاح')
      loadSlides()
    } catch (error: any) {
      console.error('Error reordering slides:', error)
      showError('خطأ في تحديث الترتيب')
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === slides.length - 1) return
    
    const newSlides = [...slides]
    const temp = newSlides[index]
    newSlides[index] = newSlides[index + 1]
    newSlides[index + 1] = temp
    
    // تحديث display_order
    const orders = newSlides.map((slide, idx) => ({
      id: slide.id,
      display_order: idx
    }))
    
    try {
      await heroSlidesAPI.reorder(orders)
      showSuccess('تم تحديث الترتيب بنجاح')
      loadSlides()
    } catch (error: any) {
      console.error('Error reordering slides:', error)
      showError('خطأ في تحديث الترتيب')
    }
  }

  const resetForm = () => {
    setFormData({
      image_url: '',
      is_logo: false,
      is_active: true,
      display_order: slides.length,
    })
    setEditingSlide(null)
  }

  const handleAddClick = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, image_url: url })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      showError('الملف يجب أن يكون صورة')
      return
    }

    // التحقق من حجم الملف (حد أقصى 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      showError('حجم الصورة كبير جداً (الحد الأقصى 10MB)')
      return
    }

    try {
      setUploading(true)
      
      // رفع الصورة
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'}/hero-slides/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'خطأ في رفع الصورة')
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setFormData(prev => ({ ...prev, image_url: data.url }))
        showSuccess('تم رفع الصورة بنجاح')
      } else {
        throw new Error('فشل رفع الصورة')
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      showError(error.message || 'خطأ في رفع الصورة')
    } finally {
      setUploading(false)
      // إعادة تعيين input الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="hero-slides-management">
      {/* Header */}
      <div className="hero-slides-header">
        <div>
          <h1>إدارة سلايدات Hero</h1>
          <p>إدارة السلايدات المعروضة في الصفحة الرئيسية</p>
        </div>
        <button className="btn-add-slide" onClick={handleAddClick}>
          <Plus size={20} />
          إضافة سلايدة جديدة
        </button>
      </div>

      {/* Slides List */}
      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>جاري تحميل السلايدات...</p>
        </div>
      ) : slides.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد سلايدات حتى الآن</p>
          <button className="btn-add-slide" onClick={handleAddClick}>
            <Plus size={20} />
            إضافة سلايدة جديدة
          </button>
        </div>
      ) : (
        <div className="slides-grid">
          {slides.map((slide, index) => (
            <div key={slide.id} className={`slide-card ${!slide.is_active ? 'inactive' : ''} ${slide.is_logo ? 'logo-slide' : ''}`}>
              <div className="slide-image-wrapper">
                <img 
                  src={slide.image_url} 
                  alt={slide.is_logo ? "لوغو" : "سلايدة"}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.style.display = 'flex'
                  }}
                />
                <div className="slide-placeholder" style={{ display: 'none' }}>
                  <ImageIcon size={48} />
                </div>
                {slide.is_logo && (
                  <div className="logo-badge">لوغو</div>
                )}
                {!slide.is_active && (
                  <div className="inactive-badge">غير نشط</div>
                )}
              </div>
              
              <div className="slide-info">
                <div className="slide-url">{slide.image_url}</div>
                <div className="slide-meta">
                  <span>الترتيب: {slide.display_order}</span>
                </div>
              </div>

              <div className="slide-actions">
                <div className="order-buttons">
                  <button
                    className="action-btn order-btn"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="نقل لأعلى"
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    className="action-btn order-btn"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === slides.length - 1}
                    title="نقل لأسفل"
                  >
                    <ArrowDown size={18} />
                  </button>
                </div>
                <button 
                  className="action-btn edit-btn" 
                  onClick={() => handleEdit(slide)}
                  title="تعديل"
                >
                  <Edit size={18} />
                </button>
                <button 
                  className="action-btn delete-btn" 
                  onClick={() => handleDelete(slide.id)}
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingSlide) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); resetForm() }}>
          <div className="modal-content hero-slide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <ImageIcon size={24} />
              </div>
              <div>
                <h2>{editingSlide ? 'تعديل السلايدة' : 'إضافة سلايدة جديدة'}</h2>
                <p>{editingSlide ? 'قم بتعديل بيانات السلايدة' : 'أضف سلايدة جديدة للصفحة الرئيسية'}</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => { setIsAdding(false); resetForm() }}
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="hero-slide-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>رفع صورة أو إدخال رابط *</label>
                <div className="upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload-image"
                    onClick={handleUploadClick}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="spinner" size={18} />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        رفع صورة
                      </>
                    )}
                  </button>
                  <span className="upload-divider">أو</span>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="https://example.com/image.jpg أو /path/to/image.jpg"
                    className="image-url-input"
                    required
                  />
                </div>
                <small>يمكنك رفع صورة من جهازك أو إدخال رابط صورة</small>
              </div>

              <div className="form-group">
                <label>معاينة الصورة</label>
                {formData.image_url && (
                  <div className="image-preview">
                    <img 
                      src={formData.image_url} 
                      alt="معاينة"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const placeholder = target.nextElementSibling as HTMLElement
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                    />
                    <div className="preview-placeholder" style={{ display: 'none' }}>
                      <ImageIcon size={48} />
                      <span>فشل تحميل الصورة</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_logo}
                      onChange={(e) => setFormData({ ...formData, is_logo: e.target.checked })}
                      disabled={editingSlide?.is_logo} // منع تغيير is_logo للسلايدة الموجودة
                    />
                    <span>هذه السلايدة هي اللوغو (ستظهر أولاً دائماً)</span>
                  </label>
                  {editingSlide?.is_logo && (
                    <small style={{ color: '#dc2626', marginTop: '0.5rem', display: 'block' }}>
                      لا يمكن تغيير نوع السلايدة إذا كانت لوغو
                    </small>
                  )}
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>السلايدة نشطة</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>ترتيب العرض</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
                <small>الترتيب (0 = الأول، بعد اللوغو)</small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsAdding(false); resetForm() }}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      {editingSlide ? 'تحديث' : 'إضافة'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

