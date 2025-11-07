import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { portfolioAPI } from '../lib/api'
import './Home.css'

export default function Home() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>KHAWAM PRINTING</h1>
          <p>خدمات الطباعة والتصميم الاحترافية</p>
          <Link to="/services" className="btn btn-primary">تصفح الخدمات</Link>
        </motion.div>
        
        <motion.div 
          className="hero-image"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="placeholder-image">
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

      {/* Services Section */}
      <section className="section services-section">
        <div className="container">
          <h2 className="section-title">خدماتنا</h2>
          <div className="services-grid">
            {['طباعة البوسترات', 'طباعة الفليكس', 'البانرات الإعلانية', 'الكروت الشخصية', 'الملصقات', 'التصميم الجرافيكي'].map((service, i) => (
              <motion.div 
                key={service}
                className="service-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="service-icon">📄</div>
                <h3>{service}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Works Section */}
      <FeaturedWorksSection />
    </div>
  )
}

function FeaturedWorksSection() {
  const navigate = useNavigate()
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeaturedWorks()
  }, [])

  const loadFeaturedWorks = async () => {
    try {
      const response = await portfolioAPI.getFeatured()
      const data = response.data
      if (Array.isArray(data)) {
        setWorks(data)
      } else {
        setWorks([])
      }
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
