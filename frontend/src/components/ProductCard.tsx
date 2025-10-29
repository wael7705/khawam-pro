import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import './ProductCard.css'

interface Product {
  id: number
  name?: string
  name_ar: string
  price: number
  image?: string
  image_url?: string
}

interface ProductCardProps {
  product: Product
  index: number
}

export default function ProductCard({ product, index }: ProductCardProps) {
  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <div className="product-image">
        {product.image_url ? (
          <img 
            src={product.image_url.startsWith('http') ? product.image_url : `https://khawam-pro-production.up.railway.app${product.image_url}`}
            alt={product.name_ar}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`placeholder-product-image ${product.image_url ? 'hidden' : ''}`}></div>
      </div>
      <div className="product-info">
        <h3>{product.name_ar}</h3>
        <p className="price">{product.price} ل.س</p>
        <button className="btn btn-primary">
          <ShoppingBag /> اطلب الآن
        </button>
      </div>
    </motion.div>
  )
}
