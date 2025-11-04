import { useState, useEffect } from 'react'
import { productsAPI } from '../lib/api'
import ProductCard from '../components/ProductCard'
import ProductOrderModal from '../components/ProductOrderModal'
import './Products.css'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isProductOrderModalOpen, setIsProductOrderModalOpen] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  // Check if we should reopen product order modal after returning from location picker
  useEffect(() => {
    const shouldReopen = localStorage.getItem('shouldReopenProductOrderModal')
    const savedFormState = localStorage.getItem('productOrderFormState')
    
    if (shouldReopen === 'true' && savedFormState && products.length > 0 && !isProductOrderModalOpen) {
      try {
        const formState = JSON.parse(savedFormState)
        // Find the product by ID
        const product = products.find((p: any) => p.id === formState.productId)
        if (product) {
          setSelectedProduct(product)
          setIsProductOrderModalOpen(true)
          // DON'T clear the flag here - let ProductOrderModal handle it after restoring state
        }
      } catch (error) {
        console.error('Error loading product order form state:', error)
      }
    }
  }, [products, isProductOrderModalOpen])

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

  return (
    <div className="products-page section">
      <div className="container">
        <h1 className="page-title">المنتجات</h1>
        <p className="page-subtitle">جميع منتجاتنا وخدماتنا</p>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onOrderClick={() => {
                  setSelectedProduct(product)
                  setIsProductOrderModalOpen(true)
                }}
              />
            ))}
          </div>
        )}
      
      {selectedProduct && (
        <ProductOrderModal
          isOpen={isProductOrderModalOpen}
          onClose={() => {
            setIsProductOrderModalOpen(false)
            setSelectedProduct(null)
          }}
          product={selectedProduct}
        />
      )}
      </div>
    </div>
  )
}
