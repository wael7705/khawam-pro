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
  // Fallback slides - سلايدات افتراضية محلية تظهر دائماً
  const defaultSlides: HeroSlide[] = [
    {
      id: -1, // ID سالب للتمييز عن السلايدات من قاعدة البيانات
      image_url: '/logo.jpg',
      is_logo: true,
      is_active: true,
      display_order: 0
    },
    // سلايد fallback عند فشل تحميل السلايدات من قاعدة البيانات
    {
      id: -2,
      image_url: '/hero-slides/slide-1.jpg',
      is_logo: false,
      is_active: true,
      display_order: 1
    }
  ]

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(defaultSlides)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHeroSlides()
  }, [])

  const loadHeroSlides = async (retryCount = 0) => {
    const maxRetries = 3
    try {
      setLoading(true)
      
      // جلب السلايدات مباشرة من API بدون cache - من قاعدة البيانات
      const response = await heroSlidesAPI.getAll(true) // فقط السلايدات النشطة
      
      // التحقق من بنية الاستجابة
      if (!response || !response.data) {
        throw new Error('استجابة غير صحيحة من API')
      }
      
      // دمج السلايدات من قاعدة البيانات مع السلايدات المحلية
      let allSlides: HeroSlide[] = [...defaultSlides]
      
      // معالجة أفضل للاستجابة - دعم أشكال مختلفة
      let slidesFromDB: HeroSlide[] = []
      
      if (response.data.success && response.data.slides && Array.isArray(response.data.slides)) {
        slidesFromDB = response.data.slides
      } else if (Array.isArray(response.data)) {
        slidesFromDB = response.data
      }
      
      if (slidesFromDB.length > 0) {
        // التأكد من أن الصور موجودة من قاعدة البيانات
        const validSlides = slidesFromDB.filter((slide: any) => {
          if (!slide || !slide.image_url) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ السلايدة ${slide?.id} لا تحتوي على image_url`)
            }
            return false
          }
          const imageUrl = typeof slide.image_url === 'string' ? slide.image_url.trim() : ''
          if (!imageUrl) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ السلايدة ${slide.id} image_url فارغ`)
            }
            return false
          }
          
          // التحقق من أن الصورة نشطة
          const isActive = slide.is_active !== false // default true
          if (!isActive && import.meta.env.DEV) {
            console.warn(`⚠️ السلايدة ${slide.id} غير نشطة (is_active: ${slide.is_active})`)
          }
          
          return isActive
        })
        
        if (validSlides.length > 0) {
          if (import.meta.env.DEV) {
            console.log(`✅ تم جلب ${validSlides.length} سلايدة من قاعدة البيانات`)
            console.log('📊 معلومات السلايدات:')
            validSlides.forEach((slide: any) => {
              const isBase64 = slide.image_url.startsWith('data:')
              const isExternal = slide.image_url.startsWith('http')
              const urlType = isBase64 ? 'Base64' : isExternal ? 'رابط خارجي' : 'مسار محلي'
              console.log(`  - السلايدة ${slide.id}:`)
              console.log(`    - display_order: ${slide.display_order || 0}`)
              console.log(`    - is_logo: ${slide.is_logo || false}`)
              console.log(`    - is_active: ${slide.is_active !== false}`)
              console.log(`    - نوع الصورة: ${urlType}`)
            })
          }
          
          // دمج السلايدات: السلايدات المحلية أولاً، ثم من قاعدة البيانات
          // نستخدم الترتيب كما هو من قاعدة البيانات (display_order) بدون تغيير
          // ملاحظة: نستخدم فقط اللوغو من defaultSlides، والباقي من قاعدة البيانات
          const logoSlides = defaultSlides.filter(s => s.is_logo)
          
          // الحفاظ على الترتيب من قاعدة البيانات كما هو
          // فقط نضع اللوغو أولاً، ثم السلايدات الأخرى بالترتيب الذي جاءت به من قاعدة البيانات
          allSlides = [...logoSlides, ...validSlides]
          
          if (import.meta.env.DEV) {
            console.log(`✅ إجمالي السلايدات بعد الدمج: ${allSlides.length}`)
            console.log('📋 ترتيب السلايدات النهائي (كما هو من قاعدة البيانات):')
            allSlides.forEach((slide, index) => {
              console.log(`  ${index + 1}. ID: ${slide.id}, display_order: ${slide.display_order}, is_logo: ${slide.is_logo}, is_active: ${slide.is_active}`)
            })
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('⚠️ لم توجد سلايدات صحيحة في قاعدة البيانات - استخدام السلايدات المحلية فقط')
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('⚠️ لا توجد سلايدات في قاعدة البيانات - استخدام السلايدات المحلية فقط')
        }
      }
      
      setHeroSlides(allSlides)
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
      
      // Fallback: استخدام السلايدات المحلية فقط (اللوغو + slide-1.jpg)
      if (import.meta.env.DEV) {
        console.log('🔄 استخدام السلايدات المحلية كـ fallback')
        console.log(`  - السلايدات المحلية: ${defaultSlides.length}`)
        defaultSlides.forEach(slide => {
          console.log(`    - ${slide.image_url} (is_logo: ${slide.is_logo}, display_order: ${slide.display_order})`)
        })
      }
      setHeroSlides(defaultSlides)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page">
      {/* Hero Slider Section - يظهر فوراً مع السلايدات المحلية */}
      <HeroSlider slides={heroSlides} loading={loading} />

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
