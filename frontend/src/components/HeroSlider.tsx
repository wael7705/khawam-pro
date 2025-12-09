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
  
  // إذا كان base64 data URL (يبدأ بـ data:)، استخدمه مباشرة - هذا من قاعدة البيانات
  if (trimmedUrl.startsWith('data:')) {
    return trimmedUrl
  }
  
  // إذا كان URL مطلق (يبدأ بـ http:// أو https://)، استخدمه كما هو
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }
  
  // إذا كان مسار نسبي (يبدأ بـ /)، استخدمه مباشرة
  // Vite/React Router سيتعامل مع المسارات من public folder تلقائياً
  // مثل: /hero-slides/slide-1.jpg أو /logo.jpg
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl
  }
  
  // إذا كان مسار نسبي بدون /، أضف / في البداية
  // إذا كان يبدأ بـ hero-slides، أضف / في البداية
  if (trimmedUrl.startsWith('hero-slides/')) {
    return `/${trimmedUrl}`
  }
  
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

  // تحميل الصور المهمة فقط (تحسين الأداء - تقليل التأخير)
  useEffect(() => {
    if (activeSlides.length === 0) return

    const preloadLinks: HTMLLinkElement[] = []
    
    // تحميل الصورة الحالية والصورة التالية فقط (لتحسين الأداء)
    const slidesToPreload = Math.min(2, activeSlides.length)
    
    for (let i = 0; i < slidesToPreload; i++) {
      const slideIndex = (currentIndex + i) % activeSlides.length
      const slide = activeSlides[slideIndex]
      
      try {
        const imageUrl = resolveImageUrl(slide.image_url)
        if (!imageUrl) continue
        
        // Preload link فقط للصورة الحالية
        if (i === 0) {
          const link = document.createElement('link')
          link.rel = 'preload'
          link.as = 'image'
          link.href = imageUrl
          link.setAttribute('fetchPriority', 'high')
          document.head.appendChild(link)
          preloadLinks.push(link)
        }
        
        // تحميل الصورة التالية في الخلفية (بدون preload link)
        if (i === 1) {
          const img = new Image()
          img.src = imageUrl
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`Error preloading slide ${slideIndex}:`, error)
        }
      }
    }
    
    // تنظيف preload links
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
  }, [activeSlides, currentIndex])

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

  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex || index < 0 || index >= activeSlides.length) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play بعد التمرير اليدوي
    restartAutoPlay()
  }, [currentIndex, activeSlides.length, restartAutoPlay])

  const goToPrevious = useCallback(() => {
    if (activeSlides.length <= 1) return
    const newIndex = currentIndex === 0 ? activeSlides.length - 1 : currentIndex - 1
    setIsTransitioning(true)
    setCurrentIndex(newIndex)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play
    restartAutoPlay()
  }, [currentIndex, activeSlides.length, restartAutoPlay])

  const goToNext = useCallback(() => {
    if (activeSlides.length <= 1) return
    const newIndex = (currentIndex + 1) % activeSlides.length
    setIsTransitioning(true)
    setCurrentIndex(newIndex)
    setTimeout(() => setIsTransitioning(false), 600)
    // إعادة تشغيل auto-play
    restartAutoPlay()
  }, [currentIndex, activeSlides.length, restartAutoPlay])

  // إضافة دعم لوحة المفاتيح للتنقل
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSlides.length <= 1) return
      
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext, activeSlides.length])

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
                loading={index <= 1 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : index === 1 ? 'high' : 'low'}
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
                    isBase64: originalUrl?.startsWith('data:'),
                    isExternal: originalUrl?.startsWith('http'),
                    index: index,
                    slideId: slide.id
                  })
                }
                
                // إذا كان data URL، حاول استخدامه مباشرة
                if (originalUrl && originalUrl.startsWith('data:') && originalUrl !== imageUrl) {
                  if (import.meta.env.DEV) {
                    console.log('🔄 Retrying with original data URL from database')
                  }
                  target.src = originalUrl
                  return
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
                    if (import.meta.env.DEV) {
                      console.error(`❌ Failed to load slide ${slide.id} after all retries`)
                    }
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

