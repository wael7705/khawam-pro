import { useState, useEffect } from 'react'
import { Plus, Edit, Eye, EyeOff, Trash2, Upload } from 'lucide-react'
import { adminAPI } from '../../lib/api'
import './ProductsManagement.css'

interface Product {
  id: number
  name: string
  name_ar: string
  price: number
  image_url: string
  is_visible: boolean
  is_featured: boolean
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.products.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const [isAdding, setIsAdding] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const toggleVisibility = (id: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, is_visible: !p.is_visible } : p
    ))
  }

  const toggleFeatured = (id: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, is_featured: !p.is_featured } : p
    ))
  }

  const deleteProduct = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  return (
    <div className="products-management">
      <div className="section-header">
        <div>
          <h1>إدارة المنتجات</h1>
          <p>عرض وإدارة جميع المنتجات</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={20} />
          إضافة منتج
        </button>
      </div>

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="placeholder-image">بدون صورة</div>
              )}
              <div className="product-badges">
                {product.is_featured && <span className="badge-featured">مميز</span>}
                <span className={`badge-status ${product.is_visible ? 'visible' : 'hidden'}`}>
                  {product.is_visible ? 'ظاهر' : 'مخفي'}
                </span>
              </div>
            </div>
            <div className="product-info">
              <h3>{product.name_ar}</h3>
              <p className="product-price">{product.price.toLocaleString()} ل.س</p>
            </div>
            <div className="product-actions">
              <button className="icon-btn" onClick={() => setEditingProduct(product)}>
                <Edit size={18} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => toggleVisibility(product.id)}
                title={product.is_visible ? 'إخفاء' : 'إظهار'}
              >
                {product.is_visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className="icon-btn delete" onClick={() => deleteProduct(product.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingProduct) && (
        <div className="modal-overlay" onClick={() => { setIsAdding(false); setEditingProduct(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
            
            <form className="product-form">
              <div className="form-group">
                <label>اسم المنتج (عربي)</label>
                <input type="text" defaultValue={editingProduct?.name_ar} />
              </div>

              <div className="form-group">
                <label>اسم المنتج (إنجليزي)</label>
                <input type="text" defaultValue={editingProduct?.name} />
              </div>

              <div className="form-group">
                <label>السعر</label>
                <input type="number" defaultValue={editingProduct?.price} />
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
                  <input type="checkbox" defaultChecked={editingProduct?.is_visible} />
                  <span>المنتج ظاهر</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" defaultChecked={editingProduct?.is_featured} />
                  <span>منتج مميز</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingProduct(null) }}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

