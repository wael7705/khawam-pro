import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './HeroSlider.css'

interface HeroSlide {
  id: number
  image_url: string
  is_logo: boolean
  is_active: boolean
  display_order: number
}

interface HeroSliderProps {
  slides: HeroSlide[]
  autoPlay?: boolean
  autoPlayInterval?: number
}

export default function HeroSlider({ slides, autoPlay = true, autoPlayInterval = 5000 }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // تصفية السلايدات النشطة فقط وترتيبها
  const activeSlides = slides
    .filter(slide => slide.is_active)
    .sort((a, b) => {
      // اللوغو دائماً أولاً
      if (a.is_logo && !b.is_logo) return -1
      if (!a.is_logo && b.is_logo) return 1
      // ثم حسب display_order
      return a.display_order - b.display_order
    })

  useEffect(() => {
    if (activeSlides.length === 0) return

    if (autoPlay && activeSlides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeSlides.length)
      }, autoPlayInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeSlides.length, autoPlay, autoPlayInterval])

  const goToSlide = (index: number) => {
    if (index === currentIndex) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 500)
  }

  const goToPrevious = () => {
    if (activeSlides.length <= 1) return
    const newIndex = currentIndex === 0 ? activeSlides.length - 1 : currentIndex - 1
    goToSlide(newIndex)
    // إعادة تشغيل auto-play
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (autoPlay) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeSlides.length)
      }, autoPlayInterval)
    }
  }

  const goToNext = () => {
    if (activeSlides.length <= 1) return
    const newIndex = (currentIndex + 1) % activeSlides.length
    goToSlide(newIndex)
    // إعادة تشغيل auto-play
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (autoPlay) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeSlides.length)
      }, autoPlayInterval)
    }
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
          transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
        }}
      >
        {activeSlides.map((slide) => (
          <div key={slide.id} className="hero-slide">
            <img 
              src={slide.image_url} 
              alt={slide.is_logo ? "خوام للطباعة والتصميم" : "سلايدة"}
              loading={slide.is_logo ? "eager" : "lazy"}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        ))}
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

