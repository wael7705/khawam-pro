import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import ProductOrderModal from './ProductOrderModal'
import './ProductCard.css'

interface Product {
  id: number
  name?: string
  name_ar: string
  price: number
  base_price?: number
  image?: string
  image_url?: string
}

interface ProductCardProps {
  product: Product
  index: number
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  return (
    <>
      <motion.div
        className="product-card"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
        onClick={(e) => {
          // Prevent card click from triggering modal
          e.stopPropagation()
        }}
      >
        <div className="product-image">
          {product.image_url && product.image_url.trim() ? (
            <img 
              src={
                // دعم base64 data URLs (تُخزن في قاعدة البيانات مباشرة)
                product.image_url.startsWith('data:') 
                  ? product.image_url
                  // دعم الروابط الخارجية
                  : product.image_url.startsWith('http') 
                  ? product.image_url 
                  // دعم المسارات النسبية (legacy support)
                  : product.image_url.startsWith('/')
                  ? `https://khawam-pro-production.up.railway.app${product.image_url}`
                  : `https://khawam-pro-production.up.railway.app/${product.image_url}`
              }
              alt={product.name_ar}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                  placeholder.classList.remove('hidden');
                }
              }}
              onLoad={() => {
                const placeholder = document.querySelector(`.product-card:nth-child(${index + 1}) .placeholder-product-image`) as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'none';
                }
              }}
            />
          ) : null}
          <div className={`placeholder-product-image ${product.image_url && product.image_url.trim() ? 'hidden' : ''}`}></div>
        </div>
        <div className="product-info">
          <h3>{product.name_ar}</h3>
          <p className="price">{product.base_price || product.price} ل.س</p>
          <button 
            className="btn btn-primary" 
            onClick={(e) => {
              e.stopPropagation()
              setIsOrderModalOpen(true)
            }}
          >
            <ShoppingBag /> اطلب الآن
          </button>
        </div>
      </motion.div>

      <ProductOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        product={product}
      />
    </>
  )
}
