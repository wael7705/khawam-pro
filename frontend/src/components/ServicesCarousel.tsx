import { useEffect, useMemo, useState } from 'react'
import './ServicesCarousel.css'

interface ServiceSlide {
  id: string
  title: string
  subtitle: string
  description: string
  highlights: string[]
  mediaType: 'image' | 'gradient'
  mediaUrl?: string
}

const SLIDE_INTERVAL = 5000

export default function ServicesCarousel() {
  const slides = useMemo<ServiceSlide[]>(
    () => [
      {
        id: 'digital-printing',
        title: 'الطباعة الرقمية',
        subtitle: 'سرعة، دقة، وأسعار مرنة',
        description:
          'حلول الطباعة الرقمية لدينا مصممة لتلائم احتياجات مشاريعك اليومية مع جودة ألوان عالية ووقت تنفيذ قياسي.',
        highlights: [
          'تنفيذ خلال 24 ساعة لمعظم الطلبات',
          'خيارات ورق وأحجام متعددة',
          'مراجعة رقمية قبل الطباعة النهائية'
        ],
        mediaType: 'gradient'
      },
      {
        id: 'branding',
        title: 'الهويات البصرية والعلامات التجارية',
        subtitle: 'صمم حضورك المميز',
        description:
          'من الفكرة الأولى إلى التطبيق الكامل، فريقنا يساعدك على إطلاق هوية قوية وجذابة تواكب أهداف شركتك.',
        highlights: [
          'تصميم شعارات ومواد دعائية متكاملة',
          'إرشادات استخدام الهوية البصرية',
          'متابعة حتى استلام النسخة النهائية'
        ],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'large-format',
        title: 'طباعة القياسات الكبيرة',
        subtitle: 'بانرات، فليكس، ولوحات خارجية',
        description:
          'نوفر تجهيزات متكاملة لجميع أنواع الإعلانات الخارجية مع مقاومة للعوامل الجوية ودقة عالية في التفاصيل.',
        highlights: [
          'مواد مقاومة للأشعة والرطوبة',
          'تركيب احترافي في الموقع',
          'خدمة تصميم مخصصة لكل مشروع'
        ],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1627384113978-4c431356d06a?auto=format&fit=crop&w=900&q=80'
      }
    ],
    []
  )

  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, SLIDE_INTERVAL)

    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <section className="services-carousel" aria-label="خدمات خوام">
      {slides.map((slide, index) => (
        <article
          key={slide.id}
          className={`services-carousel__slide ${index === activeSlide ? 'is-active' : ''}`}
          aria-hidden={index !== activeSlide}
        >
          <div className="services-carousel__info">
            <span className="services-carousel__badge">خدمة مميزة</span>
            <h3>{slide.title}</h3>
            <h4>{slide.subtitle}</h4>
            <p>{slide.description}</p>
            <ul>
              {slide.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="services-carousel__media">
            {slide.mediaType === 'image' && slide.mediaUrl ? (
              <img src={slide.mediaUrl} alt={slide.title} loading="lazy" />
            ) : (
              <div className="services-carousel__gradient" aria-hidden="true" />
            )}
          </div>
        </article>
      ))}

      <div className="services-carousel__indicators" role="tablist">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`services-carousel__indicator ${index === activeSlide ? 'is-active' : ''}`}
            onClick={() => setActiveSlide(index)}
            aria-label={`عرض ${slide.title}`}
            aria-selected={index === activeSlide}
          />
        ))}
      </div>
    </section>
  )
}

