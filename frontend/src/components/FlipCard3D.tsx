import { useState, useEffect } from 'react'
import { RotateCw, Check } from 'lucide-react'
import './FlipCard3D.css'

interface Product {
  id: string | number
  name: string
  image_url?: string
  colors: string[]
  sizes: string[]
}

interface FlipCard3DProps {
  product: Product
  isSelected: boolean
  selectedColor?: string
  selectedSize?: string
  onSelect: (productId: string | number, color: string | undefined, size: string | undefined) => void
}

export default function FlipCard3D({
  product,
  isSelected,
  selectedColor,
  selectedSize,
  onSelect
}: FlipCard3DProps) {
  const hasColors = product.colors.length > 0
  const hasSizes = product.sizes.length > 0

  const [isFlipped, setIsFlipped] = useState(false)
  const [tempColor, setTempColor] = useState<string | undefined>(
    hasColors ? (selectedColor || product.colors[0]) : undefined
  )
  const [tempSize, setTempSize] = useState<string | undefined>(
    hasSizes ? (selectedSize || product.sizes[0]) : undefined
  )

  // مزامنة tempColor مع selectedColor عند تغييره
  useEffect(() => {
    if (selectedColor !== undefined) {
      setTempColor((prev) => prev !== selectedColor ? selectedColor : prev)
    }
  }, [selectedColor])

  // مزامنة tempSize مع selectedSize عند تغييره
  useEffect(() => {
    if (selectedSize !== undefined) {
      setTempSize((prev) => prev !== selectedSize ? selectedSize : prev)
    }
  }, [selectedSize])

  // إعادة تعيين الحالة عند تغيير المنتج
  useEffect(() => {
    const newHasColors = product.colors.length > 0
    const newHasSizes = product.sizes.length > 0
    setTempColor(newHasColors ? (selectedColor || product.colors[0]) : undefined)
    setTempSize(newHasSizes ? (selectedSize || product.sizes[0]) : undefined)
  }, [product.id, product.colors, product.sizes, selectedColor, selectedSize])

  const handleCardClick = () => {
    if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isFlipped) {
        handleCardClick()
      }
    }
  }

  const handleSelect = () => {
    const color = hasColors ? tempColor : undefined
    const size = hasSizes ? tempSize : undefined
    if ((!hasColors || tempColor) && (!hasSizes || tempSize)) {
      onSelect(product.id, color, size)
      setIsFlipped(false)
    }
  }

  const handleBack = () => {
    setIsFlipped(false)
  }

  const isSelectDisabled = (hasColors && !tempColor) || (hasSizes && !tempSize)

  return (
    <div 
      className="flip-card-3d-container" 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={`flip-card-3d-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* الوجه الأمامي */}
        <div className="flip-card-3d-front">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="flip-card-front-image"
            />
          ) : (
            <div className="flip-card-front-image flip-card-placeholder">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flip-card-front-title">{product.name}</div>
          <div className="flip-card-flip-icon">
            <RotateCw size={16} />
          </div>
          {isSelected && (
            <div className="flip-card-selected-badge">
              <Check size={16} />
            </div>
          )}
        </div>

        {/* الوجه الخلفي */}
        <div className="flip-card-3d-back">
          <h3 className="flip-card-back-title">اختر اللون والمقاس</h3>
          
          <div className="flip-card-options-section">
            {hasColors ? (
              <div className="flip-card-colors-section">
                <label className="flip-card-option-label">الألوان:</label>
                <div className="flip-card-colors-list">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={`flip-card-color-option ${tempColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTempColor(color)
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flip-card-colors-section">
                <p className="flip-card-empty-message">لا توجد ألوان متاحة</p>
              </div>
            )}

            {hasSizes ? (
              <div className="flip-card-sizes-section">
                <label className="flip-card-option-label">المقاسات:</label>
                <div className="flip-card-sizes-list">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`flip-card-size-option ${tempSize === size ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTempSize(size)
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flip-card-sizes-section">
                <p className="flip-card-empty-message">لا توجد مقاسات متاحة</p>
              </div>
            )}
          </div>

          <div className="flip-card-back-actions">
            <button
              className="flip-card-select-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleSelect()
              }}
              disabled={isSelectDisabled}
            >
              اختيار
            </button>
            <button
              className="flip-card-back-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleBack()
              }}
            >
              رجوع
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

