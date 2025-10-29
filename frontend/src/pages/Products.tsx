import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { productsAPI } from '../lib/api'
import ProductCard from '../components/ProductCard'
import './Products.css'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
        { id: 1, name_ar: 'بوستر A4', name: 'A4 Poster', price: 2000, image_url: '' },
        { id: 2, name_ar: 'فليكس خارجي', name: 'Outdoor Flex', price: 3000, image_url: '' },
        { id: 3, name_ar: 'بانر احتفالي', name: 'Event Banner', price: 5000, image_url: '' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -400,
        behavior: 'smooth'
      })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 400,
        behavior: 'smooth'
      })
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
          <div className="products-horizontal-wrapper">
            <button 
              className="scroll-btn scroll-btn-left"
              onClick={scrollLeft}
              aria-label="تمرير لليسار"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="products-horizontal-container">
              <div className="products-horizontal" ref={scrollContainerRef}>
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </div>
            
            <button 
              className="scroll-btn scroll-btn-right"
              onClick={scrollRight}
              aria-label="تمرير لليمين"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
