import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HeroSlider from '../components/HeroSlider'
import ServicesShowcaseSection from './components/ServicesShowcaseSection'
import FeaturedWorksSection from './components/FeaturedWorksSection'
import { heroSlidesAPI } from '../lib/api'
import './Home.css'

interface HeroSlide {
  id: number
  image_url: string
  is_logo: boolean
  is_active: boolean
  display_order: number
}

export default function Home() {
  // Fallback slide - يظهر فوراً قبل تحميل السلايدات
  const fallbackSlide: HeroSlide = {
    id: 0,
    image_url: '/logo.jpg',
    is_logo: true,
    is_active: true,
    display_order: 0
  }

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([fallbackSlide])

  useEffect(() => {
    loadHeroSlides()
  }, [])

  const loadHeroSlides = async (retryCount = 0) => {
    const maxRetries = 3
    try {
      // جلب السلايدات مباشرة من API بدون cache - من قاعدة البيانات
      const response = await heroSlidesAPI.getAll(true) // فقط السلايدات النشطة
      
      // التحقق من بنية الاستجابة
      if (!response || !response.data) {
        throw new Error('استجابة غير صحيحة من API')
      }
      
      if (response.data.success && response.data.slides && Array.isArray(response.data.slides) && response.data.slides.length > 0) {
        // التأكد من أن الصور موجودة من قاعدة البيانات
        const validSlides = response.data.slides.filter((slide: HeroSlide) => 
          slide && 
          slide.image_url && 
          typeof slide.image_url === 'string' &&
          slide.image_url.trim() && 
          slide.is_active === true
        )
        
        if (validSlides.length > 0) {
          if (import.meta.env.DEV) {
            console.log(`✅ تم جلب ${validSlides.length} سلايدة من قاعدة البيانات`)
            validSlides.forEach((slide: HeroSlide) => {
              const isBase64 = slide.image_url.startsWith('data:')
              const isExternal = slide.image_url.startsWith('http')
              console.log(`  - السلايدة ${slide.id}: ${isBase64 ? 'Base64 من قاعدة البيانات' : isExternal ? 'رابط خارجي' : 'مسار محلي'}`)
            })
          }
          setHeroSlides(validSlides)
        } else {
          if (import.meta.env.DEV) {
            console.warn('⚠️ لم توجد سلايدات صحيحة في قاعدة البيانات')
          }
          setHeroSlides([fallbackSlide])
        }
      } else {
        // إذا لم توجد سلايدات في قاعدة البيانات، استخدم fallback
        if (import.meta.env.DEV) {
          console.warn('⚠️ لا توجد سلايدات في قاعدة البيانات')
        }
        setHeroSlides([fallbackSlide])
      }
    } catch (error: any) {
      // معالجة أفضل للأخطاء مع retry logic
      if (import.meta.env.DEV) {
        console.error('❌ خطأ في جلب السلايدات من قاعدة البيانات:', error)
        if (error.response) {
          console.error('  - Status:', error.response.status)
          console.error('  - Data:', error.response.data)
        } else if (error.request) {
          console.error('  - Request:', error.request)
        } else {
          console.error('  - Message:', error.message)
        }
      }
      
      // Retry logic للأخطاء الشبكية
      if (retryCount < maxRetries && (
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_CONNECTION_RESET' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout')
      )) {
        if (import.meta.env.DEV) {
          console.log(`🔄 إعادة المحاولة ${retryCount + 1}/${maxRetries}...`)
        }
        // انتظر قبل إعادة المحاولة (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return loadHeroSlides(retryCount + 1)
      }
      
      // Fallback: استخدام اللوغو كسلايدة افتراضية
      setHeroSlides([fallbackSlide])
    }
  }

  return (
    <div className="home-page">
      {/* Hero Slider Section - يظهر فوراً مع fallback slide */}
      <HeroSlider slides={heroSlides} />

      {/* Services Promo */}
      <section className="section services-promo">
        <div className="container">
          <div className="services-promo__content">
            <div className="services-promo__text">
              <span className="services-promo__badge">حلول متكاملة للطباعة والدعاية</span>
              <h2>نعمل معك من الفكرة وحتى استلام الطلب</h2>
              <p>
                باقة خدماتنا تجمع بين التصميم الإبداعي، الطباعة الاحترافية، والمتابعة الدقيقة للتسليم.
                اختر الخدمة المناسبة وسيقوم فريقنا بمتابعة طلبك حتى الاستلام، فنحن لا نضع الأسعار هنا حرصاً على تقديم
                أفضل سعر مدروس يلائم متطلباتك.
              </p>
              <div className="services-promo__actions">
                <Link to="/contact" className="btn btn-secondary">احجز استشارة مجانية</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase Section */}
      <ServicesShowcaseSection />

      {/* Featured Works Section */}
      <FeaturedWorksSection />
    </div>
  )
}
