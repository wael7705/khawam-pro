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
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHeroSlides()
  }, [])

  const loadHeroSlides = async () => {
    try {
      const response = await heroSlidesAPI.getAll(true) // فقط السلايدات النشطة
      if (response.data.success) {
        setHeroSlides(response.data.slides || [])
      }
    } catch (error) {
      console.error('Error loading hero slides:', error)
      // Fallback: استخدام اللوغو كسلايدة افتراضية
      setHeroSlides([{
        id: 0,
        image_url: '/logo.jpg',
        is_logo: true,
        is_active: true,
        display_order: 0
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page">
      {/* Hero Slider Section */}
      {!loading && <HeroSlider slides={heroSlides} />}

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
