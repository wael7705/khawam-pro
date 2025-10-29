import { useState } from 'react'
import { adminAPI } from '../lib/api'

interface Work {
  id?: number
  title_ar: string
  title_en?: string
  description_ar?: string
  image_url?: string
  category_ar?: string
  category_en?: string
  is_visible: boolean
  is_featured: boolean
}

interface WorkFormProps {
  work?: Work | null
  onCancel: () => void
  onSuccess: () => void
}

export default function WorkForm({ work, onCancel, onSuccess }: WorkFormProps) {
  const [formData, setFormData] = useState({
    title_ar: work?.title_ar || '',
    title_en: work?.title_en || '',
    description_ar: work?.description_ar || '',
    category_ar: work?.category_ar || '',
    category_en: work?.category_en || '',
    is_visible: work?.is_visible ?? true,
    is_featured: work?.is_featured ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let imageUrl = work?.image_url
      
      // رفع الصورة إذا كانت موجودة
      if (image) {
        try {
          const uploadResponse = await adminAPI.upload(image)
          imageUrl = uploadResponse.url || uploadResponse.image_url
          console.log('✅ تم رفع الصورة:', imageUrl)
        } catch (uploadError: any) {
          console.error('خطأ في رفع الصورة:', uploadError)
          alert('فشل رفع الصورة. سيتم حفظ العمل بدون صورة.')
        }
      }
      
      // إعداد البيانات للإرسال
      const submitData = {
        title_ar: formData.title_ar.trim(),
        title_en: formData.title_en.trim() || formData.title_ar.trim(),
        description_ar: formData.description_ar.trim(),
        image_url: imageUrl || null,
        category_ar: formData.category_ar.trim(),
        category_en: formData.category_en.trim() || formData.category_ar.trim(),
        is_visible: formData.is_visible,
        is_featured: formData.is_featured,
        display_order: 0
      }
      
      if (work?.id) {
        // تحديث عمل موجود
        await adminAPI.works.update(work.id, submitData)
      } else {
        // إضافة عمل جديد
        await adminAPI.works.create(submitData)
      }
      
      onSuccess()
    } catch (error: any) {
      console.error('Error saving work:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'حدث خطأ في حفظ العمل'
      alert(`خطأ: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="work-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>عنوان العمل (عربي) *</label>
        <input 
          type="text" 
          value={formData.title_ar}
          onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>عنوان العمل (إنجليزي)</label>
        <input 
          type="text" 
          value={formData.title_en}
          onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>الوصف</label>
        <textarea 
          rows={4}
          value={formData.description_ar}
          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label>الفئة (عربي)</label>
        <input 
          type="text" 
          value={formData.category_ar}
          onChange={(e) => setFormData({ ...formData, category_ar: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>الصورة</label>
        <div className="upload-area">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            id="work-image"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          <label htmlFor="work-image" className="upload-label">
            {image ? image.name : 'انقر للرفع أو اسحب الملف هنا'}
          </label>
          {image && (
            <div className="image-preview">
              <img src={URL.createObjectURL(image)} alt="Preview" />
            </div>
          )}
        </div>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input 
            type="checkbox" 
            checked={formData.is_visible}
            onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
          />
          <span>العمل ظاهر</span>
        </label>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input 
            type="checkbox" 
            checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
          />
          <span>عمل مميز</span>
        </label>
      </div>

      <div className="modal-actions">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
          disabled={loading}
        >
          إلغاء
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'جاري الحفظ...' : (work ? 'تحديث' : 'إضافة')}
        </button>
      </div>
    </form>
  )
}

