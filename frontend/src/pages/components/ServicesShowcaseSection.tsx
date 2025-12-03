import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import '../Home.css'

// قائمة المسارات البديلة للصورة
const getImagePaths = () => {
  const baseUrl = window.location.origin
  return [
    '/khawam_services.png',
    `${baseUrl}/khawam_services.png`,
    '/assets/khawam_services.png',
    `${baseUrl}/assets/khawam_services.png`,
  ]
}

export default function ServicesShowcaseSection() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState('/khawam_services.png')
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // محاولة تحميل الصورة من عدة مسارات
    const tryLoadImage = () => {
      const paths = getImagePaths()
      let currentIndex = 0

      const tryNext = () => {
        if (currentIndex >= paths.length) {
          console.warn('⚠️ All image paths failed, showing placeholder')
          setImageError(true)
          setImageLoaded(false)
          return
        }

        const img = new Image()
        const currentPath = paths[currentIndex]
        
        img.onload = () => {
          console.log('✅ Image loaded successfully:', currentPath)
          setImageSrc(currentPath)
          setImageLoaded(true)
          setImageError(false)
          if (imgRef.current) {
            imgRef.current.src = currentPath
          }
        }

        img.onerror = () => {
          console.warn(`⚠️ Failed to load image from: ${currentPath}, trying next...`)
          currentIndex++
          tryNext()
        }

        img.src = currentPath
      }

      tryNext()
    }

    tryLoadImage()
  }, [])

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
                src={imageSrc}
                alt="خدمات الطباعة الحديثة والمتقنة"
                className="services-showcase-image"
                loading="eager"
                style={{ 
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out',
                  visibility: imageLoaded ? 'visible' : 'hidden',
                }}
                onLoad={(e) => {
                  console.log('✅ Image onLoad event fired for:', imageSrc)
                  setImageLoaded(true)
                  setImageError(false)
                  const target = e.target as HTMLImageElement
                  target.style.opacity = '1'
                  target.style.display = 'block'
                }}
                onError={(e) => {
                  console.warn('⚠️ Image onError event fired for:', imageSrc)
                  const target = e.target as HTMLImageElement
                  const paths = getImagePaths()
                  const currentIndex = paths.indexOf(imageSrc)
                  
                  if (currentIndex < paths.length - 1) {
                    // جرب المسار التالي
                    const nextPath = paths[currentIndex + 1]
                    console.log('🔄 Trying next path:', nextPath)
                    setImageSrc(nextPath)
                    target.src = nextPath
                  } else {
                    // جميع المسارات فشلت
                    console.error('❌ All image paths failed')
                    setImageError(true)
                    setImageLoaded(false)
                  }
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

