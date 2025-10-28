import { useState, useEffect } from 'react'
import { portfolioAPI } from '../lib/api'
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
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorks()
  }, [])

  const loadWorks = async () => {
    try {
      const response = await portfolioAPI.getAll()
      setWorks(response.data)
    } catch (error) {
      console.error('Error loading works:', error)
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
              <div key={work.id} className="work-card">
                <div className="work-image">
                  <div className="placeholder-work-image"></div>
                </div>
                <div className="work-content">
                  <span className="work-category">{work.category_ar}</span>
                  <h3>{work.title_ar}</h3>
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
