import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ServicesShowcaseSection from './components/ServicesShowcaseSection'
import FeaturedWorksSection from './components/FeaturedWorksSection'
import './Home.css'

export default function Home() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <motion.div 
          // @ts-ignore
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>خوام للطباعة والتصميم</h1>
          <p>نقدم لكم أفضل خدمات الطباعة والتصميم بجودة عالية وأسعار مناسبة</p>
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
            alt="خوام للطباعة والتصميم"
            className="hero-logo"
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
