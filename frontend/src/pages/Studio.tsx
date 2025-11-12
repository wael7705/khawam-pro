import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Upload, Download, X, RotateCw, ZoomIn, ZoomOut, Filter, Sparkles, Type, Palette } from 'lucide-react'
import { studioAPI } from '../lib/api'
import { isAuthenticated } from '../lib/auth'
import './Studio.css'

export default function Studio() {
  const navigate = useNavigate()
  const location = useLocation()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [filterType, setFilterType] = useState<string | null>(null)
  // Crop state
  const [cropArea, setCropArea] = useState<{x: number, y: number, width: number, height: number} | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [cropStartPos, setCropStartPos] = useState<{x: number, y: number} | null>(null)
  const [imageRect, setImageRect] = useState<DOMRect | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalFileRef = useRef<File | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const cropOverlayRef = useRef<HTMLDivElement>(null)

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname))
    }
  }, [navigate, location])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      originalFileRef.current = file
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setUploadedImage(imageUrl)
        setActiveImage(imageUrl)
        setProcessedImage(null)
        resetFilters()
      }
      reader.readAsDataURL(file)
    }
  }

  const resetFilters = () => {
    setZoom(100)
    setRotation(0)
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setFilterType(null)
  }

  const applyFilters = () => {
    if (!activeImage) return
    
    const canvas = canvasRef.current
    const img = new Image()
    
    img.onload = () => {
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      
      canvas.width = img.width
      canvas.height = img.height
      
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom / 100, zoom / 100)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      ctx.restore()
      
      setProcessedImage(canvas.toDataURL())
    }
    
    img.src = activeImage
  }

  useEffect(() => {
    if (activeImage && selectedTool && ['filters', 'resize', 'crop'].includes(selectedTool)) {
      applyFilters()
    }
  }, [brightness, contrast, saturation, rotation, zoom, activeImage, selectedTool])

  // تشغيل الصور الشخصية فوراً عند الضغط على التبويب
  const passportProcessedRef = useRef(false)
  useEffect(() => {
    if (selectedTool === 'passport' && originalFileRef.current && !loading && !passportProcessedRef.current) {
      passportProcessedRef.current = true
      handlePassportPhotos().finally(() => {
        passportProcessedRef.current = false
      })
    } else if (selectedTool !== 'passport') {
      passportProcessedRef.current = false
    }
  }, [selectedTool])

  // تحديث موضع الصورة عند تغيير الحجم
  useEffect(() => {
    if (selectedTool === 'crop' && imageContainerRef.current) {
      const img = imageContainerRef.current.querySelector('img')
      if (img) {
        const updateRect = () => {
          const rect = img.getBoundingClientRect()
          const containerRect = imageContainerRef.current!.getBoundingClientRect()
          setImageRect({
            ...rect,
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
          } as DOMRect)
        }
        // انتظار تحميل الصورة
        if (img.complete) {
          updateRect()
        } else {
          img.onload = updateRect
        }
        updateRect()
        window.addEventListener('resize', updateRect)
        window.addEventListener('scroll', updateRect, true)
        return () => {
          window.removeEventListener('resize', updateRect)
          window.removeEventListener('scroll', updateRect, true)
        }
      }
    } else {
      setImageRect(null)
    }
  }, [selectedTool, uploadedImage, processedImage])

  const handleRemoveBackground = async () => {
    if (!originalFileRef.current) return
    
    setLoading(true)
    try {
      const response = await studioAPI.removeBackground(originalFileRef.current)
      if (response.success && response.image) {
        setProcessedImage(response.image)
        setActiveImage(response.image)
      }
    } catch (error) {
      console.error('Error removing background:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
  }

  const handlePassportPhotos = async () => {
    if (!originalFileRef.current) return
    
    setLoading(true)
    try {
      const response = await studioAPI.createPassportPhotos(originalFileRef.current)
      if (response.success && response.image) {
        setProcessedImage(response.image)
        setActiveImage(response.image)
      }
    } catch (error) {
      console.error('Error creating passport photos:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = async () => {
    if (!originalFileRef.current) return
    
    setLoading(true)
    try {
      const response = await studioAPI.applyFilter(
        originalFileRef.current,
        brightness,
        contrast,
        saturation
      )
      if (response.success && response.image) {
        setProcessedImage(response.image)
        setActiveImage(response.image)
      }
    } catch (error) {
      console.error('Error applying filters:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCropRotate = async () => {
    if (!originalFileRef.current) return
    
    setLoading(true)
    try {
      const cropParams = cropArea ? {
        x: Math.round(cropArea.x),
        y: Math.round(cropArea.y),
        width: Math.round(cropArea.width),
        height: Math.round(cropArea.height)
      } : undefined
      
      const response = await studioAPI.cropRotate(originalFileRef.current, rotation, cropParams)
      if (response.success && response.image) {
        setProcessedImage(response.image)
        setActiveImage(response.image)
        setCropArea(null)
      }
    } catch (error) {
      console.error('Error cropping/rotating:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
  }

  // Crop handlers
  const getImageCoordinates = (clientX: number, clientY: number) => {
    if (!imageRect || !imageContainerRef.current) return null
    
    const img = imageContainerRef.current.querySelector('img')
    if (!img || !img.complete) return null
    
    // حساب الإحداثيات النسبية للصورة داخل الحاوية
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const x = clientX - containerRect.left - imageRect.left
    const y = clientY - containerRect.top - imageRect.top
    
    // تحويل إلى إحداثيات الصورة الفعلية
    const scaleX = img.naturalWidth / imageRect.width
    const scaleY = img.naturalHeight / imageRect.height
    
    return {
      x: Math.max(0, Math.min(x * scaleX, img.naturalWidth)),
      y: Math.max(0, Math.min(y * scaleY, img.naturalHeight))
    }
  }

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (selectedTool !== 'crop' || !imageRect) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const coords = getImageCoordinates(e.clientX, e.clientY)
    if (coords) {
      setIsCropping(true)
      setCropStartPos(coords)
      setCropArea({ x: coords.x, y: coords.y, width: 1, height: 1 }) // بدء بـ 1 بدلاً من 0 لضمان الظهور
    }
  }

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (selectedTool !== 'crop') return
    
    if (isCropping && cropStartPos && imageRect) {
      e.preventDefault()
      e.stopPropagation()
      
      const coords = getImageCoordinates(e.clientX, e.clientY)
      if (coords) {
        const width = coords.x - cropStartPos.x
        const height = coords.y - cropStartPos.y
        
        setCropArea({
          x: width < 0 ? coords.x : cropStartPos.x,
          y: height < 0 ? coords.y : cropStartPos.y,
          width: Math.max(1, Math.abs(width)),
          height: Math.max(1, Math.abs(height))
        })
      }
    }
  }

  const handleCropMouseUp = () => {
    setIsCropping(false)
  }

  const tools = [
    { id: 'remove-bg', name: 'إزالة الخلفية', icon: X, color: '#FF6B35', desc: 'إزالة خلفية احترافية' },
    { id: 'passport', name: 'صور شخصية', icon: Upload, color: '#7048E8', desc: 'توليد صور شخصية' },
    { id: 'crop', name: 'قص وتدوير', icon: RotateCw, color: '#06FFA5', desc: 'قص وتدوير الصورة' },
    { id: 'filters', name: 'الفلاتر', icon: Filter, color: '#4ECDC4', desc: 'فلاتر احترافية' },
    { id: 'resize', name: 'تكبير وتصغير', icon: ZoomIn, color: '#45B7D1', desc: 'تحريك الحجم' },
    { id: 'enhance', name: 'تحسين الجودة', icon: Sparkles, color: '#96CEB4', desc: 'زيادة الدقة' },
    { id: 'text', name: 'إضافة نص', icon: Type, color: '#FFD23F', desc: 'نص ديناميكي' },
    { id: 'colors', name: 'السطوع والألوان', icon: Palette, color: '#BC4749', desc: 'التحكم بالألوان' },
  ]

  const handleDownload = () => {
    if (!processedImage && !uploadedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage || uploadedImage || ''
    link.download = 'processed-image.png'
    link.click()
  }

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="container">
          <h1>استيديو التصميم</h1>
          <p>أدوات احترافية لمعالجة الصور</p>
        </div>
      </div>

      <div className="container">
        <div className="studio-layout">
          {/* Sidebar */}
          <div className="sidebar">
            <h3>الأدوات</h3>
            <div className="tools-grid">
              {tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <button
                    key={tool.id}
                    className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
                    onClick={() => setSelectedTool(tool.id)}
                    style={{ '--tool-color': tool.color } as React.CSSProperties}
                    title={tool.desc}
                  >
                    <Icon size={28} />
                    <span>{tool.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="canvas-area">
            {!uploadedImage ? (
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload size={48} />
                <p>انقر لرفع صورة</p>
                <span>JPG, PNG, WEBP</span>
              </div>
            ) : (
              <div className="canvas-container">
                <div 
                  className="image-display" 
                  ref={imageContainerRef}
                  onMouseDown={selectedTool === 'crop' ? handleCropMouseDown : undefined}
                  onMouseMove={selectedTool === 'crop' ? handleCropMouseMove : undefined}
                  onMouseUp={selectedTool === 'crop' ? handleCropMouseUp : undefined}
                  onMouseLeave={selectedTool === 'crop' ? handleCropMouseUp : undefined}
                  style={{ cursor: selectedTool === 'crop' ? 'crosshair' : 'default' }}
                >
                  {(processedImage || uploadedImage) && (
                    <img 
                      src={processedImage || uploadedImage} 
                      alt="Preview" 
                      className="preview-image"
                      style={{
                        transform: selectedTool === 'crop' ? `rotate(${rotation}deg)` : selectedTool === 'resize' ? `scale(${zoom / 100})` : '',
                        filter: selectedTool === 'filters' ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` : ''
                      }}
                    />
                  )}
                  {selectedTool === 'crop' && cropArea && imageRect && cropArea.width >= 1 && cropArea.height >= 1 && (() => {
                    const img = imageContainerRef.current?.querySelector('img')
                    if (!img) return null
                    
                    // حساب المقياس بين الصورة المعروضة والصورة الفعلية
                    const scaleX = imageRect.width / img.naturalWidth
                    const scaleY = imageRect.height / img.naturalHeight
                    
                    // تحويل إحداثيات الصورة الفعلية إلى إحداثيات الشاشة
                    const left = imageRect.left + (cropArea.x * scaleX)
                    const top = imageRect.top + (cropArea.y * scaleY)
                    const width = cropArea.width * scaleX
                    const height = cropArea.height * scaleY
                    
                    return (
                      <div 
                        className="crop-overlay"
                        ref={cropOverlayRef}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                      />
                    )
                  })()}
                  {loading && (
                    <div className="loading-overlay">
                      <div className="spinner"></div>
                      <p>جاري المعالجة...</p>
                    </div>
                  )}
                </div>

                <div className="canvas-controls">
                  <button className="btn-icon" onClick={() => {
                    setUploadedImage(null)
                    setProcessedImage(null)
                    setActiveImage(null)
                    resetFilters()
                  }}>
                    <X /> إزالة الصورة
                  </button>
                  <button 
                    className="btn-icon primary" 
                    onClick={handleDownload}
                    disabled={!uploadedImage}
                  >
                    <Download /> تحميل الصورة
                  </button>
                </div>
              </div>
            )}

            {/* Tool Options */}
            {uploadedImage && selectedTool && (
              <div className="tool-panel">
                <h4>{tools.find(t => t.id === selectedTool)?.name}</h4>
                
                {selectedTool === 'remove-bg' && (
                  <button className="btn btn-primary w-full" onClick={handleRemoveBackground} disabled={loading}>
                    {loading ? 'جاري المعالجة...' : 'إزالة الخلفية'}
                  </button>
                )}

                {selectedTool === 'passport' && (
                  <div className="passport-options">
                    <p className="text-sm text-gray-600 mb-4">
                      جاري إنشاء صور شخصية... سيتم إزالة الخلفية وتحويل الصورة إلى حجم 3.5×4.8 سم
                    </p>
                    {loading && <div className="spinner-small"></div>}
                  </div>
                )}

                {selectedTool === 'filters' && (
                  <div className="filter-options">
                    <label>السطوع: {brightness}%</label>
                    <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                    
                    <label>التشبع: {contrast}%</label>
                    <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                    
                    <label>الحيوية: {saturation}%</label>
                    <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                    
                    <div className="filter-presets">
                      <button onClick={() => { setBrightness(80); setContrast(120); setSaturation(110) }}>كلاسيكي</button>
                      <button onClick={() => { setBrightness(120); setContrast(130); setSaturation(130) }}>درامي</button>
                      <button onClick={() => { setBrightness(100); setContrast(90); setSaturation(200) }}>نيون</button>
                      <button onClick={() => { setBrightness(110); setContrast(120); setSaturation(80) }}>سينمائي</button>
                    </div>
                    <button className="btn btn-primary w-full mt-4" onClick={handleApplyFilters} disabled={loading}>
                      {loading ? 'جاري المعالجة...' : 'تطبيق الفلاتر'}
                    </button>
                  </div>
                )}

                {selectedTool === 'resize' && (
                  <div className="resize-options">
                    <label>التكبير: {zoom}%</label>
                    <input type="range" min="25" max="400" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} />
                    <p className="text-sm text-gray-600 mt-2">
                      ملاحظة: التكبير يعمل على العرض فقط. استخدم أداة القص والتدوير للتطبيق الفعلي.
                    </p>
                  </div>
                )}

                {selectedTool === 'crop' && (
                  <div className="crop-options">
                    <label>التدوير: {rotation}°</label>
                    <input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} />
                    <p className="text-sm text-gray-600 mt-2 mb-2">
                      اسحب على الصورة لتحديد منطقة القص
                    </p>
                    {cropArea && (
                      <div className="crop-info">
                        <p>المنطقة المحددة: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}</p>
                      </div>
                    )}
                    <button className="btn btn-primary w-full mt-4" onClick={handleApplyCropRotate} disabled={loading || !cropArea}>
                      {loading ? 'جاري المعالجة...' : 'تطبيق القص والتدوير'}
                    </button>
                    {cropArea && (
                      <button className="btn btn-secondary w-full mt-2" onClick={() => setCropArea(null)}>
                        إلغاء القص
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}