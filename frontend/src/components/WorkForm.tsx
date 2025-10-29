import { useState } from 'react'
import { adminAPI } from '../lib/api'

interface Work {
  id?: number
  title_ar: string
  title_en?: string
  title?: string
  description_ar?: string
  image_url?: string
  images?: string[]  # الصور الثانوية
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
  const [mainImage, setMainImage] = useState<File | null>(null)  // الصورة الأساسية
  const [additionalImages, setAdditionalImages] = useState<File[]>([])  // الصور الثانوية
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<string[]>(work?.images || [])  // الصور الثانوية الموجودة

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let imageUrl = work?.image_url
      let additionalImageUrls: string[] = [...existingAdditionalImages]
      
      // رفع الصورة الأساسية إذا كانت موجودة
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
      
      // رفع الصور الثانوية الجديدة
      if (additionalImages.length > 0) {
        const uploadPromises = additionalImages.map(async (img) => {
          try {
            const uploadResponse = await adminAPI.upload(img)
            return uploadResponse.url || uploadResponse.image_url
          } catch (error) {
            console.error('خطأ في رفع صورة ثانوية:', error)
            return null
          }
        })
        
        const uploadedUrls = await Promise.all(uploadPromises)
        const newUrls = uploadedUrls.filter(url => url !== null) as string[]
        additionalImageUrls = [...additionalImageUrls, ...newUrls]
        console.log('✅ تم رفع الصور الثانوية:', newUrls)
      }
      
      // إعداد البيانات للإرسال
      const submitData = {
        title_ar: formData.title_ar.trim(),
        title: formData.title_en.trim() || formData.title_ar.trim(),
        description_ar: formData.description_ar.trim(),
        image_url: imageUrl || null,
        images: additionalImageUrls.length > 0 ? additionalImageUrls : null,
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
            accept="image/*" 
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
                src={mainImage ? URL.createObjectURL(mainImage) : (work?.image_url?.startsWith('http') ? work.image_url : work?.image_url ? `https://khawam-pro-production.up.railway.app${work.image_url}` : '')} 
                alt="Preview" 
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>الصور الثانوية (يمكن إضافة عدة صور)</label>
        <div className="upload-area">
          <input 
            type="file" 
            accept="image/*" 
            multiple
            className="hidden" 
            id="work-additional-images"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setAdditionalImages([...additionalImages, ...files])
            }}
          />
          <label htmlFor="work-additional-images" className="upload-label">
            إضافة صور ثانوية
          </label>
        </div>
        {(additionalImages.length > 0 || existingAdditionalImages.length > 0) && (
          <div className="additional-images-preview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '15px' }}>
            {existingAdditionalImages.map((imgUrl, idx) => (
              <div key={`existing-${idx}`} style={{ position: 'relative' }}>
                <img 
                  src={imgUrl.startsWith('http') ? imgUrl : `https://khawam-pro-production.up.railway.app${imgUrl}`}
                  alt={`Existing ${idx + 1}`}
                  style={{ width: '100%', height: '100px', objectFit: 'contain', borderRadius: '8px', background: '#f0f0f0', padding: '5px' }}
                />
                <button
                  type="button"
                  onClick={() => setExistingAdditionalImages(existingAdditionalImages.filter((_, i) => i !== idx))}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '18px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            ))}
            {additionalImages.map((img, idx) => (
              <div key={`new-${idx}`} style={{ position: 'relative' }}>
                <img 
                  src={URL.createObjectURL(img)} 
                  alt={`Additional ${idx + 1}`}
                  style={{ width: '100%', height: '100px', objectFit: 'contain', borderRadius: '8px', background: '#f0f0f0', padding: '5px' }}
                />
                <button
                  type="button"
                  onClick={() => setAdditionalImages(additionalImages.filter((_, i) => i !== idx))}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '18px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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

