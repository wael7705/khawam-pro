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
        <div className="placeholder-product-image"></div>
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
