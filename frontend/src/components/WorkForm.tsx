import { useState } from 'react'
import { adminAPI } from '../lib/api'

interface Work {
  id?: number
  title_ar: string
  title_en?: string
  title?: string
  description_ar?: string
  image_url?: string
  images?: string[]  // الصور الثانوية
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
    title_en: work?.title_en || work?.title || '',
    description_ar: work?.description_ar || '',
    category_ar: work?.category_ar || '',
    category_en: work?.category_en || '',
    is_visible: work?.is_visible ?? true,
    is_featured: work?.is_featured ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [mainImage, setMainImage] = useState<File | null>(null)  // الصورة الأساسية فقط

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let imageUrl = work?.image_url
      
      // رفع الصورة الأساسية فقط إذا كانت موجودة
      if (mainImage) {
        try {
          const uploadResponse = await adminAPI.upload(mainImage)
          imageUrl = uploadResponse.url || uploadResponse.image_url
          console.log('✅ تم رفع الصورة الأساسية:', imageUrl)
        } catch (uploadError: any) {
          console.error('خطأ في رفع الصورة الأساسية:', uploadError)
          alert('فشل رفع الصورة الأساسية. سيتم حفظ العمل بدون صورة أساسية.')
        }
      }
      
      // إعداد البيانات للإرسال (الصورة الرئيسية فقط)
      const submitData = {
        title_ar: formData.title_ar.trim(),
        title: formData.title_en.trim() || formData.title_ar.trim(),
        description_ar: formData.description_ar.trim(),
        image_url: imageUrl || null,
        images: null,  // إزالة الصور الثانوية لتجنب التضارب
        category_ar: formData.category_ar.trim(),
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
      
      // معالجة أخطاء مختلفة
      let errorMessage = 'حدث خطأ في حفظ العمل'
      
      if (error.response) {
        // خطأ من السيرفر
        const data = error.response.data
        if (data?.detail) {
          // إذا كان detail نص
          if (typeof data.detail === 'string') {
            errorMessage = data.detail
          } 
          // إذا كان detail array (validation errors)
          else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ')
          }
          // إذا كان detail object
          else if (typeof data.detail === 'object') {
            errorMessage = JSON.stringify(data.detail)
          }
        } else {
          errorMessage = `خطأ ${error.response.status}: ${error.response.statusText || 'خطأ غير معروف'}`
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
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
        <label>الصورة الأساسية *</label>
        <div className="upload-area">
          <input 
            type="file" 
            accept=".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript" 
            className="hidden" 
            id="work-main-image"
            onChange={(e) => setMainImage(e.target.files?.[0] || null)}
          />
          <label htmlFor="work-main-image" className="upload-label">
            {mainImage ? mainImage.name : (work?.image_url ? 'تغيير الصورة الأساسية' : 'انقر لرفع الصورة الأساسية')}
          </label>
          {(mainImage || work?.image_url) && (
            <div className="image-preview">
              <img 
                src={
                  mainImage 
                    ? URL.createObjectURL(mainImage)
                    : work?.image_url?.startsWith('data:')
                    ? work.image_url
                    : work?.image_url?.startsWith('http')
                    ? work.image_url
                    : work?.image_url
                    ? `https://khawam-pro-production.up.railway.app${work.image_url.startsWith('/') ? work.image_url : '/' + work.image_url}`
                    : ''
                } 
                alt="Preview" 
              />
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

