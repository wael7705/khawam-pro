import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { portfolioAPI } from '../lib/api'
import './WorkDetail.css'

interface Work {
  id: number
  title_ar: string
  title: string
  description_ar?: string
  image_url: string
  images?: string[]
  category_ar?: string
  is_featured: boolean
}

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [work, setWork] = useState<Work | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (id) {
      loadWork(parseInt(id))
    }
  }, [id])

  const loadWork = async (workId: number) => {
    try {
      const response = await portfolioAPI.getById(workId)
      if (response.data && !response.data.error) {
        setWork(response.data)
      } else {
        console.error('Work not found')
        navigate('/portfolio')
      }
    } catch (error) {
      console.error('Error loading work:', error)
      navigate('/portfolio')
    } finally {
      setLoading(false)
    }
  }

  // استخدام الصورة الرئيسية فقط (image_url) لتجنب التضارب
  const allImages = work?.image_url ? [work.image_url] : []

  if (loading) {
    return (
      <div className="work-detail-page">
        <div className="container">
          <div className="loading">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="work-detail-page">
        <div className="container">
          <div className="error-message">
            <h2>العمل غير موجود</h2>
            <Link to="/portfolio" className="btn btn-primary">العودة للأعمال</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="work-detail-page">
      <div className="container">
        <div className="work-detail-header">
          <button className="back-button" onClick={() => navigate('/portfolio')}>
            <ArrowRight size={20} />
            العودة للأعمال
          </button>
        </div>

        <div className="work-detail-content">
          <div className="work-images-section">
            <div className="main-image-container">
              {allImages.length > 0 && (
                <img 
                  src={
                    allImages[selectedImageIndex]?.startsWith('data:')
                      ? allImages[selectedImageIndex]
                      : allImages[selectedImageIndex]?.startsWith('http')
                      ? allImages[selectedImageIndex]
                      : `https://khawam-pro-production.up.railway.app${allImages[selectedImageIndex]?.startsWith('/') ? allImages[selectedImageIndex] : '/' + allImages[selectedImageIndex]}`
                  }
                  alt={work.title_ar}
                  className="main-image"
                />
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="thumbnail-images">
                {allImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className={`thumbnail-item ${selectedImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img 
                      src={
                        img.startsWith('data:')
                          ? img
                          : img.startsWith('http')
                          ? img
                          : `https://khawam-pro-production.up.railway.app${img.startsWith('/') ? img : '/' + img}`
                      }
                      alt={`${work.title_ar} - ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="work-info-section">
            {work.category_ar && (
              <span className="work-category-badge">{work.category_ar}</span>
            )}
            <h1 className="work-title">{work.title_ar || work.title}</h1>
            {work.description_ar && (
              <p className="work-description">{work.description_ar}</p>
            )}
            
            <div className="work-meta">
              {work.is_featured && (
                <span className="featured-badge">⭐ عمل مميز</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

