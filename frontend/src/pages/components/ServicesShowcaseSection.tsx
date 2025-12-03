import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import '../Home.css'

// استخدام المسار المباشر للصورة من public
const KHAWAM_SERVICES_IMAGE = '/khawam_services.png'

export default function ServicesShowcaseSection() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  return (
    <section className="section services-showcase-section">
      <div className="container">
        <div className="services-showcase-content">
          <motion.div 
            className="services-showcase-image-wrapper"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: imageLoaded ? 1 : 0.3,
              scale: imageLoaded ? 1 : 0.9
            }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              minHeight: '200px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {!imageError ? (
              <img 
                ref={imgRef}
                src={KHAWAM_SERVICES_IMAGE}
                alt="خدمات الطباعة الحديثة والمتقنة"
                className="services-showcase-image"
                loading="eager"
                style={{ 
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  opacity: imageLoaded ? 1 : 0.3,
                  transition: 'opacity 0.5s ease-in-out',
                  visibility: 'visible',
                }}
                onLoad={(e) => {
                  console.log('✅ Image onLoad event fired for:', KHAWAM_SERVICES_IMAGE)
                  setImageLoaded(true)
                  setImageError(false)
                  const target = e.target as HTMLImageElement
                  target.style.opacity = '1'
                  target.style.display = 'block'
                  target.style.visibility = 'visible'
                }}
                onError={(e) => {
                  console.error('❌ Image onError event fired for:', KHAWAM_SERVICES_IMAGE)
                  const target = e.target as HTMLImageElement
                  
                  // محاولة استخدام مسار بديل
                  const baseUrl = window.location.origin
                  const altPath = `${baseUrl}${KHAWAM_SERVICES_IMAGE}`
                  
                  if (!target.dataset.retried && target.src !== altPath) {
                    console.log('🔄 Trying alternative path:', altPath)
                    target.dataset.retried = 'true'
                    target.src = altPath
                    return
                  }
                  
                  // إذا فشل المسار البديل أيضاً
                  console.error('❌ All image paths failed')
                  setImageError(true)
                  setImageLoaded(false)
                }}
              />
            ) : (
              <div 
                className="services-showcase-image-placeholder"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  minHeight: '200px',
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(239, 68, 68, 0.1))',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '1.2rem',
                }}
              >
                <span>خدماتنا</span>
              </div>
            )}
            
            {!imageLoaded && !imageError && (
              <div 
                style={{
                  position: 'absolute',
                  width: '100%',
                  maxWidth: '500px',
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '20px',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #dc2626',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}></div>
              </div>
            )}
          </motion.div>
          
          <motion.div 
            className="services-showcase-text"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="services-showcase-title">خدماتنا</h2>
            <p className="services-showcase-description">
              نقدم لكم أفضل الخدمات التي تبرز فيها الجودة والاتقان والحداثة لنضع بين أيديكم جودة فريدة في عالم الطباعة مع تقديم اسعار مناسبةم
            </p>
            <Link to="/services" className="explore-services-btn">
              <span className="btn-text">استكشف خدماتنا</span>
              <span className="btn-shimmer"></span>
            </Link>
          </motion.div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}

