import { useState } from 'react'
import { adminAPI } from '../lib/api'

interface Product {
  id?: number
  name_ar: string
  name: string
  price: number
  image_url?: string
  is_visible: boolean
  is_featured: boolean
  category_id?: number
}

interface ProductFormProps {
  product?: Product | null
  onCancel: () => void
  onSuccess: () => void
}

export default function ProductForm({ product, onCancel, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name_ar: product?.name_ar || '',
    name: product?.name || '',
    price: product?.price || 0,
    is_visible: product?.is_visible ?? true,
    is_featured: product?.is_featured ?? false,
    category_id: 1
  })
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let imageUrl = product?.image_url
      
      // رفع الصورة إذا كانت موجودة
      if (image) {
        try {
          const uploadResponse = await adminAPI.upload(image)
          imageUrl = uploadResponse.url || uploadResponse.image_url
          console.log('✅ تم رفع الصورة:', imageUrl)
        } catch (uploadError: any) {
          console.error('خطأ في رفع الصورة:', uploadError)
          alert('فشل رفع الصورة. سيتم حفظ المنتج بدون صورة.')
        }
      }
      
      // إعداد البيانات للإرسال
      const submitData = {
        name_ar: formData.name_ar.trim(),
        name: formData.name.trim() || formData.name_ar.trim(),
        price: parseFloat(formData.price.toString()),
        category_id: formData.category_id || 1,
        image_url: imageUrl || null,
        is_visible: formData.is_visible,
        is_featured: formData.is_featured,
        display_order: 0
      }
      
      if (product?.id) {
        // تحديث منتج موجود
        await adminAPI.products.update(product.id, submitData)
      } else {
        // إضافة منتج جديد
        await adminAPI.products.create(submitData)
      }
      
      onSuccess()
    } catch (error: any) {
      console.error('Error saving product:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'حدث خطأ في حفظ المنتج'
      alert(`خطأ: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>اسم المنتج (عربي) *</label>
        <input 
          type="text" 
          value={formData.name_ar}
          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>اسم المنتج (إنجليزي)</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>السعر (ل.س) *</label>
        <input 
          type="text" 
          inputMode="numeric"
          pattern="[0-9]*"
          value={formData.price > 0 ? formData.price : ''}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            setFormData({ ...formData, price: value ? parseFloat(value) : 0 });
          }}
          placeholder="أدخل السعر بالليرة السورية"
          required
        />
        <small style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
          السعر بالليرة السورية (ل.س)
        </small>
      </div>

      <div className="form-group">
        <label>وصف المنتج (عربي)</label>
        <textarea 
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label>الصورة</label>
        {product?.image_url && !image && (
          <div className="current-image">
            <img 
              src={
                product.image_url.startsWith('data:')
                  ? product.image_url
                  : product.image_url.startsWith('http')
                  ? product.image_url
                  : `https://khawam-pro-production.up.railway.app${product.image_url.startsWith('/') ? product.image_url : '/' + product.image_url}`
              }
              alt="Current product image"
            />
            <p>الصورة الحالية</p>
          </div>
        )}
        <div className="upload-area">
          <input 
            type="file" 
            accept=".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript" 
            className="hidden" 
            id="product-image"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          <label htmlFor="product-image" className="upload-label">
            {image ? image.name : 'انقر للرفع أو اسحب الملف هنا'}
          </label>
          {image && (
            <div className="image-preview">
              <img src={URL.createObjectURL(image)} alt="Preview" />
              <button 
                type="button" 
                onClick={() => setImage(null)}
                className="remove-image-btn"
              >
                إزالة
              </button>
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
          <span>المنتج ظاهر</span>
        </label>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input 
            type="checkbox" 
            checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
          />
          <span>منتج مميز</span>
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
          {loading ? 'جاري الحفظ...' : (product ? 'تحديث' : 'إضافة')}
        </button>
      </div>
    </form>
  )
}

