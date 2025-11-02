import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, CheckCircle } from 'lucide-react'
import { adminAPI } from '../lib/api'
import { showSuccess, showError } from '../utils/toast'
import './RateOrderPage.css'

export default function RateOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (id) {
      loadOrderInfo()
    }
  }, [id])

  const loadOrderInfo = async () => {
    try {
      const response = await adminAPI.orders.getById(parseInt(id!))
      if (response.data.success && response.data.order) {
        setOrderNumber(response.data.order.order_number || '')
        // Check if already rated
        if (response.data.order.rating) {
          setRating(response.data.order.rating)
          setComment(response.data.order.rating_comment || '')
          setIsSubmitted(true)
        }
      }
    } catch (error) {
      console.error('Error loading order:', error)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      showError('يرجى اختيار عدد النجوم للتقييم')
      return
    }

    if (!id) return

    try {
      setIsSubmitting(true)
      await adminAPI.orders.updateRating(parseInt(id), rating, comment)
      setIsSubmitted(true)
      showSuccess('شكراً لك! تم حفظ تقييمك بنجاح')
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      showError(error.response?.data?.detail || 'حدث خطأ في حفظ التقييم')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rate-order-page">
      <div className="rate-order-container">
        {isSubmitted ? (
          <div className="success-message">
            <CheckCircle size={64} className="success-icon" />
            <h1>شكراً لك!</h1>
            <p>تم حفظ تقييمك بنجاح</p>
            <p className="sub-message">سيتم إعادة توجيهك إلى الصفحة الرئيسية...</p>
          </div>
        ) : (
          <>
            <div className="rate-header">
              <h1>تقييم الخدمة</h1>
              {orderNumber && (
                <p className="order-number">طلب رقم: {orderNumber}</p>
              )}
              <p className="rate-subtitle">نرجو منك تقييم خدمتنا لتساعدنا على التحسين</p>
            </div>

            <div className="rating-section">
              <label className="rating-label">كم نجمة تعطي لخدمتنا؟</label>
              <div className="stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-button ${rating >= star ? 'active' : ''} ${hoveredRating >= star ? 'hovered' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isSubmitting}
                  >
                    <Star 
                      size={48} 
                      fill={rating >= star || hoveredRating >= star ? '#FFD700' : 'none'}
                      stroke={rating >= star || hoveredRating >= star ? '#FFD700' : '#ccc'}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="rating-text">
                  {rating === 1 && 'سيء جداً'}
                  {rating === 2 && 'سيء'}
                  {rating === 3 && 'مقبول'}
                  {rating === 4 && 'جيد'}
                  {rating === 5 && 'ممتاز!'}
                </p>
              )}
            </div>

            <div className="comment-section">
              <label htmlFor="comment" className="comment-label">
                تعليق (اختياري)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="شاركنا برأيك أو اقتراحاتك..."
                rows={5}
                className="comment-textarea"
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="submit-rating-btn"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'إرسال التقييم'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

