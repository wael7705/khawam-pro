import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { portfolioAPI } from '../lib/api'
import './Home.css'

interface Work {
  id: number
  title_ar?: string
  title?: string
  image_url?: string
  category_ar?: string
}

export default function Home() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        {/* @ts-ignore */}
        <motion.div 
          // @ts-ignore
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>KHAWAM PRINTING</h1>
          <p>خدمات الطباعة والتصميم الاحترافية</p>
        </motion.div>
        
        <motion.div 
          // @ts-ignore
          className="hero-image"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img 
            src="/logo.jpg" 
            alt="خوام - Khawam Printing" 
            className="hero-logo"
            loading="eager"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
          <div className="placeholder-image" style={{ display: 'none' }}>
            <span>خوام</span>
          </div>
        </motion.div>
      </section>

      {/* Services Promo */}
      <section className="section services-promo">
        <div className="container">
          <div className="services-promo__content">
            <div className="services-promo__text">
              <span className="services-promo__badge">حلول متكاملة للطباعة والدعاية</span>
              <h2>نعمل معك من الفكرة وحتى استلام الطلب</h2>
              <p>
                باقة خدمات خوام تجمع بين التصميم الإبداعي، الطباعة الاحترافية، والمتابعة الدقيقة للتسليم.
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

function ServicesShowcaseSection() {
  // استخدام الاسم الإنجليزي للصورة لتجنب مشاكل encoding
  const imageSrc = '/khawam_services.png';

  return (
    <section className="section services-showcase-section">
      <div className="container">
        <div className="services-showcase-content">
          <motion.div 
            // @ts-ignore
            className="services-showcase-image-wrapper"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <img 
              src={imageSrc}
              alt="خدمات الطباعة الحديثة والمتقنة - معرض عمليات الطباعة والتصميم"
              className="services-showcase-image"
              loading="eager"
              decoding="async"
              onError={(e) => {
                console.error('خطأ في تحميل الصورة:', imageSrc);
                const target = e.target as HTMLImageElement;
                console.error('المسار الكامل:', window.location.origin + imageSrc);
                target.style.display = 'none';
              }}
              onLoad={() => {
                console.log('تم تحميل الصورة بنجاح:', imageSrc);
              }}
            />
          </motion.div>
          
          <motion.div 
            // @ts-ignore
            className="services-showcase-text"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
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
    </section>
  )
}

function FeaturedWorksSection() {
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeaturedWorks()
  }, [])

  const loadFeaturedWorks = async () => {
    try {
      const { fetchWithCache } = await import('../utils/dataCache')
      const data = await fetchWithCache<Work[]>(
        'portfolio:featured',
        async () => {
      const response = await portfolioAPI.getFeatured()
          return Array.isArray(response.data) ? response.data : []
        },
        15 * 60 * 1000 // Cache for 15 minutes
      )
      setWorks(Array.isArray(data) ? data : [])
    } catch (error: any) {
      // Silently fail - don't show error for featured works
      console.error('Error loading featured works:', error)
      setWorks([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section featured-works-section">
      <div className="container">
        <h2 className="section-title">أبرز أعمالنا</h2>
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="works-carousel-wrapper">
            <button 
              className="scroll-btn scroll-btn-left"
              onClick={() => {
                const container = document.querySelector('.works-carousel') as HTMLElement;
                if (container) container.scrollBy({ left: -450, behavior: 'smooth' });
              }}
              aria-label="تمرير لليسار"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="works-carousel-container">
              <div className="works-carousel">
                {works && works.length > 0 ? (
                  works.map((work) => (
                    <div 
                      key={work.id} 
                      className="work-card-mini"
                      onClick={() => navigate(`/work/${work.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="work-image-mini">
                        {work.image_url ? (
                          <img 
                            src={
                              work.image_url.startsWith('data:') || work.image_url.startsWith('http')
                                ? work.image_url
                                : `https://khawam-pro-production.up.railway.app${work.image_url.startsWith('/') ? work.image_url : '/' + work.image_url}`
                            }
                            alt={work.title_ar || work.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`placeholder-mini ${work.image_url ? 'hidden' : ''}`}></div>
                      </div>
                      <div className="work-info-mini">
                        <span className="work-category-mini">{work.category_ar || 'عام'}</span>
                        <h4>{work.title_ar || work.title}</h4>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="loading">لا توجد أعمال للعرض حالياً</div>
                )}
              </div>
            </div>
            
            <button 
              className="scroll-btn scroll-btn-right"
              onClick={() => {
                const container = document.querySelector('.works-carousel') as HTMLElement;
                if (container) container.scrollBy({ left: 450, behavior: 'smooth' });
              }}
              aria-label="تمرير لليمين"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
