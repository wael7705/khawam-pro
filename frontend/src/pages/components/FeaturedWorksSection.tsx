import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { portfolioAPI } from '../../lib/api'
import { fetchWithCache } from '../../utils/dataCache'
import '../Home.css'

interface Work {
  id: number
  title_ar: string
  title?: string
  description_ar?: string
  image_url: string
  category_ar?: string
  is_featured: boolean
}

export default function FeaturedWorksSection() {
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorks()
  }, [])

  const loadWorks = async () => {
    try {
      const allWorks = await fetchWithCache<Work[]>(
        'portfolio:all',
        async () => {
          const response = await portfolioAPI.getAll()
          return response.data
        },
        15 * 60 * 1000 // Cache for 15 minutes
      )
      
      // تصفية الأعمال المميزة فقط
      const featured = allWorks.filter(work => work.is_featured).slice(0, 6)
      setWorks(featured)
    } catch (error) {
      console.error('Error loading featured works:', error)
      setWorks([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="featured-works-section">
        <div className="container">
          <div className="loading">جاري التحميل...</div>
        </div>
      </section>
    )
  }

  if (works.length === 0) {
    return null // لا تظهر القسم إذا لم تكن هناك أعمال مميزة
  }

  const scrollLeft = () => {
    const carousel = document.querySelector('.works-carousel') as HTMLElement
    if (carousel) {
      carousel.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const carousel = document.querySelector('.works-carousel') as HTMLElement
    if (carousel) {
      carousel.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  return (
    <section className="featured-works-section">
      <div className="container">
        <h2 className="page-title">أعمالنا المميزة</h2>
        <p className="page-subtitle">منتجاتنا وأعمالنا المتميزة</p>
        
        <div className="works-carousel-wrapper">
          <button 
            className="scroll-btn scroll-btn-left" 
            onClick={scrollLeft}
            aria-label="السابق"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <div className="works-carousel-container">
            <div className="works-carousel">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="work-card-mini"
                  onClick={() => navigate(`/work/${work.id}`)}
                >
                  <div className="work-image-mini">
                    <img
                      src={work.image_url}
                      alt={work.title_ar}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const placeholder = target.nextElementSibling as HTMLElement
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                    />
                    <div className={`placeholder-mini ${work.image_url ? 'hidden' : ''}`}></div>
                  </div>
                  <div className="work-info-mini">
                    {work.category_ar && (
                      <span className="work-category-mini">{work.category_ar}</span>
                    )}
                    <h4>{work.title_ar}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            className="scroll-btn scroll-btn-right" 
            onClick={scrollRight}
            aria-label="التالي"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

