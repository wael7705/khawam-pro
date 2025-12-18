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
    // إزالة أي query parameters موجودة (مثل _retry) قبل إرجاع المسار
    const cleanUrl = trimmedUrl.split('?')[0]
    return cleanUrl
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
  loading?: boolean
}

export default function HeroSlider({ slides, autoPlay = true, autoPlayInterval = 10000, loading = false }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // تصفية السلايدات النشطة فقط (الحفاظ على الترتيب كما هو من قاعدة البيانات)
  const activeSlides = slides
    .filter(slide => {
      const isActive = slide.is_active !== false // default true
      const notFailed = !failedImages.has(slide.id)
      return isActive && notFailed
    })
    // فقط نضع اللوغو أولاً، والباقي بالترتيب الأصلي
    .sort((a, b) => {
      // اللوغو دائماً أولاً
      if (a.is_logo && !b.is_logo) return -1
      if (!a.is_logo && b.is_logo) return 1
      // الباقي بالترتيب الأصلي (لا نغير الترتيب)
      return 0
    })
  
  // تسجيل معلومات السلايدات النشطة
  if (import.meta.env.DEV && slides.length > 0) {
    console.log(`📸 السلايدات: ${slides.length} إجمالي، ${activeSlides.length} نشطة`)
    if (activeSlides.length === 0 && slides.length > 0) {
      console.warn('⚠️ جميع السلايدات غير نشطة أو فشلت في التحميل')
      slides.forEach(slide => {
        console.log(`  - ID: ${slide.id}, is_active: ${slide.is_active}, failed: ${failedImages.has(slide.id)}`)
      })
    }
  }

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
    
    if (import.meta.env.DEV) {
      console.log(`🔄 تحديث currentIndex:`, {
        activeSlidesLength: activeSlides.length,
        currentIndex: currentIndex,
        needsReset: currentIndex >= activeSlides.length,
      })
    }
    
    // التأكد من أن currentIndex صحيح
    if (currentIndex >= activeSlides.length) {
      console.log(`⚠️ currentIndex (${currentIndex}) >= activeSlides.length (${activeSlides.length}) - إعادة تعيين إلى 0`)
      setCurrentIndex(0)
    }
    // إعادة تشغيل auto-play عند تغيير السلايدات
    restartAutoPlay()
  }, [activeSlides.length, currentIndex, restartAutoPlay])

  // تحميل الصور المهمة فقط (تحسين الأداء - تقليل التأخير)
  useEffect(() => {
    if (activeSlides.length === 0) return

    // تحميل الصورة الحالية والصورة التالية فقط (لتحسين الأداء)
    // لا نستخدم preload links لتجنب التحذيرات - نستخدم Image objects فقط
    const slidesToPreload = Math.min(2, activeSlides.length)
    
    for (let i = 0; i < slidesToPreload; i++) {
      const slideIndex = (currentIndex + i) % activeSlides.length
      const slide = activeSlides[slideIndex]
      
      try {
        const imageUrl = resolveImageUrl(slide.image_url)
        if (!imageUrl) continue
        
        // تحميل الصورة في الخلفية باستخدام Image object
        // هذا أفضل من preload links لأنه لا يسبب تحذيرات
        const img = new Image()
        img.src = imageUrl
        img.loading = 'eager' // تحميل فوري للصورة الحالية
        if (i === 0) {
          img.fetchPriority = 'high' // أولوية عالية للصورة الحالية
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`Error preloading slide ${slideIndex}:`, error)
        }
      }
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

  // إذا لم توجد سلايدات نشطة، اعرض fallback فقط بعد انتهاء التحميل
  if (activeSlides.length === 0 && !loading) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ لا توجد سلايدات نشطة - عرض fallback')
    }
    return (
      <section className="hero-slider">
        <div className="hero-slide">
          <img 
            src="/hero-slides/slide-1.jpg" 
            alt="خوام للطباعة والتصميم"
            onError={(e) => {
              console.error('❌ فشل تحميل slide-1.jpg المحلي')
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
            onLoad={() => {
              console.log('✅ تم تحميل slide-1.jpg المحلي بنجاح')
            }}
          />
        </div>
      </section>
    )
  }
  
  // إذا كان التحميل جارياً، اعرض loading
  if (loading && activeSlides.length === 0) {
    return (
      <section className="hero-slider">
        <div className="hero-slide">
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(220, 38, 38, 0.2)',
              borderTop: '4px solid #dc2626',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
          </div>
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
          
          // تسجيل معلومات السلايدة فقط في وضع التطوير وعند التغيير
          if (import.meta.env.DEV && (index === currentIndex || index === currentIndex - 1 || index === currentIndex + 1)) {
            console.log(`🖼️ رندر السلايدة ${index + 1}/${activeSlides.length}:`, {
              id: slide.id,
              index: index,
              currentIndex: currentIndex,
              isVisible: index === currentIndex,
              is_logo: slide.is_logo,
            })
          }
          
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
                  opacity: 1,
                  visibility: 'visible',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const originalUrl = slide.image_url
                let retryCount = (target as any).__retryCount || 0
                const maxRetries = 3
                
                // فقط في وضع التطوير
                console.error(`❌ Failed to load hero slide image (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
                  slideId: slide.id,
                  slideIndex: index,
                  resolvedUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
                  originalUrl: originalUrl?.substring(0, 100) + (originalUrl?.length > 100 ? '...' : ''),
                  isBase64: originalUrl?.startsWith('data:'),
                  isExternal: originalUrl?.startsWith('http'),
                  isLocal: originalUrl?.startsWith('/'),
                  imageUrlLength: imageUrl.length,
                  originalUrlLength: originalUrl?.length
                })
                
                // إعادة المحاولة
                if (retryCount < maxRetries) {
                  (target as any).__retryCount = retryCount + 1
                  
                  // محاولة 1: إذا كان data URL، استخدمه مباشرة
                  if (retryCount === 0 && originalUrl && originalUrl.startsWith('data:') && originalUrl !== imageUrl) {
                    if (import.meta.env.DEV) {
                      console.log('🔄 Retry 1: Using original data URL')
                    }
                    target.src = originalUrl
                    return
                  }
                  
                  // محاولة 2: إذا كان مسار محلي، أضف timestamp
                  if (retryCount === 1 && originalUrl && originalUrl.startsWith('/')) {
                    const retryUrl = `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}_retry=${Date.now()}`
                    if (import.meta.env.DEV) {
                      console.log('🔄 Retry 2: Adding timestamp to local path')
                    }
                    target.src = retryUrl
                    return
                  }
                  
                  // محاولة 3: استخدام URL الأصلي مباشرة
                  if (retryCount === 2) {
                    const retryUrl = resolveImageUrl(originalUrl)
                    if (import.meta.env.DEV) {
                      console.log('🔄 Retry 3: Using resolved URL')
                    }
                    target.src = retryUrl
                    return
                  }
                }
                
                // إضافة السلايد إلى قائمة الفاشلة فقط بعد فشل جميع المحاولات
                setTimeout(() => {
                  if (target.complete && target.naturalWidth === 0) {
                    if (import.meta.env.DEV) {
                      console.error(`❌ Failed to load slide ${slide.id} after all retries`)
                    }
                    setFailedImages(prev => new Set(prev).add(slide.id))
                  }
                }, 2000)
                
                // منع الحلقة اللانهائية بعد المحاولات
                if (retryCount >= maxRetries) {
                  target.onerror = null
                }
              }}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement
                if (import.meta.env.DEV) {
                  console.log(`✅ Hero slide image loaded:`, {
                    slideId: slide.id,
                    slideIndex: index,
                    currentIndex: currentIndex,
                    isVisible: index === currentIndex,
                    naturalWidth: target.naturalWidth,
                    naturalHeight: target.naturalHeight,
                  })
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

