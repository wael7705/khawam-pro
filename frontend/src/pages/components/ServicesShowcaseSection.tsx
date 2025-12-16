import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import React from 'react'
import '../Home.css'

export default function ServicesShowcaseSection() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState('/khawam_services.png')

  // Pre-check if image exists on mount - جرب عدة مسارات
  useEffect(() => {
    // في Vite، ملفات public تُنسخ إلى root dist
    // المسار الصحيح هو /khawam_services.png (من root)
    const tryImagePaths = [
      '/khawam_services.png',  // المسار الأساسي من public folder
    ]

    let currentPathIndex = 0
    let attempts = 0
    const maxAttempts = 3

    const tryNextPath = () => {
      if (currentPathIndex >= tryImagePaths.length || attempts >= maxAttempts) {
        console.error('❌ Services image not found after all attempts')
        // لا نضع error هنا - دع img tag يحاول
        return
      }

      attempts++
      const img = new Image()
      const path = tryImagePaths[currentPathIndex]
      
      img.onload = () => {
        console.log(`✅ Services image found at: ${path}`)
        setImageSrc(path)
        setImageError(false)
      }
      
      img.onerror = () => {
        console.warn(`⚠️ Image not found at: ${path} (attempt ${attempts}/${maxAttempts})`)
        // إعادة المحاولة بعد قليل
        if (attempts < maxAttempts) {
          setTimeout(() => {
            tryNextPath()
          }, 1000 * attempts)
        } else {
          currentPathIndex++
          attempts = 0
          if (currentPathIndex < tryImagePaths.length) {
            tryNextPath()
          }
        }
      }
      
      img.src = path
    }

    // بدء المحاولة بعد قليل للتأكد من أن الصفحة تحمّلت
    setTimeout(() => {
      tryNextPath()
    }, 500)
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
                src={imageSrc}
                alt="خدمات الطباعة الحديثة والمتقنة"
                className="services-showcase-image"
                loading="eager"
                crossOrigin="anonymous"
                style={{ 
                  display: imageLoaded ? 'block' : 'none',
                  width: '100%',
                  maxWidth: '500px',
                  height: 'auto',
                  minHeight: '200px',
                  objectFit: 'contain',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out',
                  visibility: imageLoaded ? 'visible' : 'hidden',
                }}
                onLoad={() => {
                  console.log('✅ Services image loaded successfully from:', imageSrc)
                  setImageLoaded(true)
                  setImageError(false)
                }}
                onError={(e) => {
                  console.error('❌ Services image failed to load from:', imageSrc, e)
                  console.error('   Full error:', e)
                  console.error('   Image target:', e.target)
                  console.error('   Current location:', window.location.href)
                  
                  // بعد عدة محاولات، أظهر placeholder
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
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span>خدماتنا</span>
              </div>
            )}
            
            {!imageLoaded && !imageError && (
              <div 
                className="services-showcase-image-loading"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  maxWidth: '500px',
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '20px',
                  zIndex: 1,
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

