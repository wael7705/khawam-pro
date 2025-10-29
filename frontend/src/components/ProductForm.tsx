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
      if (product?.id) {
        // تحديث منتج موجود
        await adminAPI.products.update(product.id, formData)
      } else {
        // إضافة منتج جديد
        await adminAPI.products.create(formData)
      }
      
      if (image && image) {
        // يمكن إضافة رفع الصورة لاحقاً
        console.log('Image upload to be implemented')
      }
      
      onSuccess()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('حدث خطأ في حفظ المنتج')
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
          type="number" 
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          required
        />
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
        <div className="upload-area">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            id="product-image"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          <label htmlFor="product-image" className="upload-label">
            {image ? image.name : 'انقر للرفع أو اسحب الملف هنا'}
          </label>
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

