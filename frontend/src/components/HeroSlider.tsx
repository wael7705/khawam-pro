import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './HeroSlider.css'

interface HeroSlide {
  id: number
  image_url: string
  is_logo: boolean
  is_active: boolean
  display_order: number
}

// دالة لحل المسار النسبي إلى URL مطلق
const resolveImageUrl = (url: string): string => {
  if (!url || !url.trim()) return ''
  
  const trimmedUrl = url.trim()
  
  // إذا كان URL مطلق (يبدأ بـ http:// أو https://)، استخدمه كما هو
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }
  
  // إذا كان مسار نسبي (يبدأ بـ /)، أضف base URL
  if (trimmedUrl.startsWith('/')) {
    // محاولة استخدام window.location.origin أولاً (يعمل في الإنتاج)
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}${trimmedUrl}`
    }
    
    // Fallback: استخدام VITE_API_URL
    const apiUrl = import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'
    // إزالة /api من نهاية URL إذا كان موجوداً
    const baseUrl = apiUrl.replace(/\/api$/, '')
    return `${baseUrl}${trimmedUrl}`
  }
  
  // إذا كان مسار نسبي بدون /، أضف / في البداية
  return `/${trimmedUrl}`
}

interface HeroSliderProps {
  slides: HeroSlide[]
  autoPlay?: boolean
  autoPlayInterval?: number
}

export default function HeroSlider({ slides, autoPlay = true, autoPlayInterval = 10000 }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // تصفية السلايدات النشطة فقط وترتيبها
  const activeSlides = slides
    .filter(slide => slide.is_active && !failedImages.has(slide.id))
    .sort((a, b) => {
      // اللوغو دائماً أولاً
      if (a.is_logo && !b.is_logo) return -1
      if (!a.is_logo && b.is_logo) return 1
      // ثم حسب display_order
      return a.display_order - b.display_order
    })

  // دالة لإعادة تشغيل auto-play
  const restartAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (autoPlay && activeSlides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % activeSlides.length
          setIsTransitioning(true)
          setTimeout(() => setIsTransitioning(false), 600)
          return nextIndex
        })
      }, autoPlayInterval)
    }
  }, [autoPlay, activeSlides.length, autoPlayInterval])

  // تحديث currentIndex عند تغيير activeSlides
  useEffect(() => {
    if (activeSlides.length === 0) return
    
    // التأكد من أن currentIndex صحيح
    if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0)
    }
    // إعادة تشغيل auto-play عند تغيير السلايدات
    restartAutoPlay()
  }, [activeSlides.length, currentIndex, restartAutoPlay])

  // تحميل جميع الصور مسبقاً (preload) لضمان جاهزيتها
  useEffect(() => {
    if (activeSlides.length === 0) return

    // إضافة preload links إلى head
    const preloadLinks: HTMLLinkElement[] = []
    const imageObjects: HTMLImageElement[] = []
    
    activeSlides.forEach((slide, index) => {
      try {
        const imageUrl = resolveImageUrl(slide.image_url)
        if (!imageUrl) return
        
        // إنشاء preload link للصورتين الأوليين فقط (لتحسين الأداء)
        if (index < 2) {
          const link = document.createElement('link')
          link.rel = 'preload'
          link.as = 'image'
          link.href = imageUrl
          if (index === 0) {
            link.setAttribute('fetchPriority', 'high')
          }
          document.head.appendChild(link)
          preloadLinks.push(link)
        }
        
        // إنشاء Image object لتحميل الصورة في الخلفية
        const img = new Image()
        img.src = imageUrl
        imageObjects.push(img)
        
        img.onload = () => {
          // لا نطبع console.log في الإنتاج لتقليل الضوضاء
          if (import.meta.env.DEV) {
            console.log(`✅ Preloaded slide ${index + 1}/${activeSlides.length}`)
          }
        }
        
        img.onerror = () => {
          // فقط في وضع التطوير
          if (import.meta.env.DEV) {
            console.warn(`⚠️ Failed to preload slide ${index + 1}/${activeSlides.length}`)
          }
        }
      } catch (error) {
        // تجاهل الأخطاء في preload - الصورة ستُحمل عند الحاجة
        if (import.meta.env.DEV) {
          console.warn('Error preloading slide:', error)
        }
      }
    })
    
    // تنظيف preload links عند إلغاء التحميل
    return () => {
      preloadLinks.forEach(link => {
        try {
          if (link.parentNode) {
            link.parentNode.removeChild(link)
          }
        } catch (error) {
          // تجاهل أخطاء التنظيف
        }
      })
    }
  }, [activeSlides])

  // إعداد auto-play عند تحميل المكون أو تغيير الإعدادات
  useEffect(() => {
    if (activeSlides.length === 0) return

    restartAutoPlay()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [restartAutoPlay])

  const goToSlide = (index: number) => {
    if (index === currentIndex || index < 0 || index >= activeSlides.length) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play بعد التمرير اليدوي
    restartAutoPlay()
  }

  const goToPrevious = () => {
    if (activeSlides.length <= 1) return
    const newIndex = currentIndex === 0 ? activeSlides.length - 1 : currentIndex - 1
    setIsTransitioning(true)
    setCurrentIndex(newIndex)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play
    restartAutoPlay()
  }

  const goToNext = () => {
    if (activeSlides.length <= 1) return
    const newIndex = (currentIndex + 1) % activeSlides.length
    setIsTransitioning(true)
    setCurrentIndex(newIndex)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play
    restartAutoPlay()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      goToNext()
    } else if (distance < -minSwipeDistance) {
      goToPrevious()
    }
    
    // إعادة تعيين قيم اللمس
    touchStartX.current = 0
    touchEndX.current = 0
  }

  if (activeSlides.length === 0) {
    return (
      <section className="hero-slider">
        <div className="hero-slide">
          <img src="/logo.jpg" alt="خوام للطباعة والتصميم" />
        </div>
      </section>
    )
  }

  return (
    <section 
      className="hero-slider"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="hero-slides-container"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {activeSlides.map((slide, index) => {
          const imageUrl = resolveImageUrl(slide.image_url)
          return (
            <div 
              key={slide.id} 
              className={`hero-slide ${slide.is_logo ? 'logo-slide' : ''}`}
            >
              <img 
                src={imageUrl}
                alt={slide.is_logo ? "خوام للطباعة والتصميم" : "سلايدة"}
                loading="eager"
                fetchPriority={index === 0 ? 'high' : index === 1 ? 'high' : 'auto'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const originalUrl = slide.image_url
                
                // فقط في وضع التطوير
                if (import.meta.env.DEV) {
                  console.warn('⚠️ Failed to load hero slide image:', {
                    resolved: imageUrl,
                    original: originalUrl,
                    index: index,
                    slideId: slide.id
                  })
                }
                
                // محاولة استخدام URL الأصلي مباشرة إذا كان مختلفاً
                if (originalUrl && originalUrl !== imageUrl && (originalUrl.startsWith('http') || originalUrl.startsWith('/'))) {
                  if (import.meta.env.DEV) {
                    console.log('🔄 Retrying with original URL')
                  }
                  target.src = resolveImageUrl(originalUrl)
                  return
                }
                
                // إضافة السلايد إلى قائمة الفاشلة فقط بعد فشل جميع المحاولات
                setTimeout(() => {
                  if (target.complete && target.naturalWidth === 0) {
                    setFailedImages(prev => new Set(prev).add(slide.id))
                  }
                }, 1000)
                
                target.onerror = null // منع الحلقة اللانهائية
              }}
              onLoad={() => {
                // لا نطبع console.log في الإنتاج لتقليل الضوضاء
                if (import.meta.env.DEV) {
                  console.log('✅ Hero slide image loaded:', index)
                }
              }}
              />
            </div>
          )
        })}
      </div>

      {/* Navigation Arrows */}
      {activeSlides.length > 1 && (
        <>
          <button 
            className="hero-slider-nav hero-slider-nav-prev"
            onClick={goToPrevious}
            aria-label="السلايدة السابقة"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            className="hero-slider-nav hero-slider-nav-next"
            onClick={goToNext}
            aria-label="السلايدة التالية"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {activeSlides.length > 1 && (
        <div className="hero-slider-dots">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              className={`hero-slider-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`انتقل إلى السلايدة ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

