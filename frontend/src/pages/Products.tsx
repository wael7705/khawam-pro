import { useState, useEffect } from 'react'
import { productsAPI } from '../lib/api'
import ProductCard from '../components/ProductCard'
import './Products.css'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([
        { id: 1, name_ar: 'بوستر A4', name: 'A4 Poster', price: 2000 },
        { id: 2, name_ar: 'فليكس خارجي', name: 'Outdoor Flex', price: 3000 },
        { id: 3, name_ar: 'بانر احتفالي', name: 'Event Banner', price: 5000 },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="products-page section">
      <div className="container">
        <h1 className="page-title">المنتجات</h1>
        <p className="page-subtitle">جميع منتجاتنا وخدماتنا</p>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="grid">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
