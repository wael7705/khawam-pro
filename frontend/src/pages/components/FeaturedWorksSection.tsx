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

  return (
    <section className="featured-works-section">
      <div className="container">
        <h2 className="page-title">أعمالنا المميزة</h2>
        <p className="page-subtitle">منتجاتنا وأعمالنا المتميزة</p>
        
        <div className="works-grid">
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
    </section>
  )
}

