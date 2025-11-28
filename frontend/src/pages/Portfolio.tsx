import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { portfolioAPI } from '../lib/api'
import { fetchWithCache } from '../utils/dataCache'
import './Portfolio.css'

interface Work {
  id: number
  title_ar: string
  title: string
  description_ar?: string
  image_url: string
  category_ar?: string
  is_featured: boolean
}

export default function Portfolio() {
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorks()
  }, [])

  const loadWorks = async () => {
    try {
      const works = await fetchWithCache<Work[]>(
        'portfolio:all',
        async () => {
      const response = await portfolioAPI.getAll()
          return response.data
        },
        15 * 60 * 1000 // Cache for 15 minutes
      )
      setWorks(works)
    } catch (error) {
      console.error('Error loading works:', error)
      // Try to get from cache even on error
      try {
        const cached = await fetchWithCache<Work[]>('portfolio:all', async () => [])
        if (cached && cached.length > 0) {
          setWorks(cached)
        } else {
          throw new Error('No cache available')
        }
      } catch {
      // Fallback data
      setWorks([
        {
          id: 1,
          title_ar: 'بوستر احترافي',
          title: 'Professional Poster',
          description_ar: 'تصميم بوستر احترافي لحدث',
          image_url: '/placeholder-work.jpg',
          category_ar: 'البوسترات',
          is_featured: true,
        },
      ])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portfolio-page section">
      <div className="container">
        <h1 className="page-title">أعمالنا</h1>
        <p className="page-subtitle">منتجاتنا وأعمالنا المتميزة</p>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="portfolio-grid">
            {works.map((work) => (
              <div 
                key={work.id} 
                className="work-card"
                onClick={() => navigate(`/work/${work.id}`)}
              >
                <div className="work-image">
                  {work.image_url ? (
                    <img 
                      src={
                        // دعم base64 data URLs (تُخزن في قاعدة البيانات مباشرة)
                        work.image_url.startsWith('data:')
                          ? work.image_url
                          // دعم الروابط الخارجية
                          : work.image_url.startsWith('http')
                          ? work.image_url
                          // دعم المسارات النسبية (legacy support)
                          : `https://khawam-pro-production.up.railway.app${work.image_url.startsWith('/') ? work.image_url : '/' + work.image_url}`
                      }
                      alt={work.title_ar}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`placeholder-work-image ${work.image_url ? 'hidden' : ''}`}></div>
                </div>
                <div className="work-content">
                  {work.category_ar && <span className="work-category">{work.category_ar}</span>}
                  <h3>{work.title_ar || work.title}</h3>
                  {work.description_ar && <p>{work.description_ar}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
