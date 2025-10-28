import { useState, useRef, useEffect } from 'react'
import { Upload, Download, X, RotateCw, ZoomIn, ZoomOut, Filter, Sparkles, Type, Palette } from 'lucide-react'
import { studioAPI } from '../lib/api'
import './Studio.css'

export default function Studio() {
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

  const handleRemoveBackground = async () => {
    if (!fileInputRef.current?.files?.[0]) return
    
    setLoading(true)
    try {
      const file = fileInputRef.current.files[0]
      const response = await studioAPI.removeBackground(file)
      if (response.success && response.image) {
        setProcessedImage(response.image)
      }
    } catch (error) {
      console.error('Error removing background:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
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
                <div className="image-display">
                  {(processedImage || uploadedImage) && (
                    <img 
                      src={processedImage || uploadedImage} 
                      alt="Preview" 
                      className="preview-image"
                      style={{
                        transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                      }}
                    />
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
                  </div>
                )}

                {selectedTool === 'resize' && (
                  <div className="resize-options">
                    <label>التكبير: {zoom}%</label>
                    <input type="range" min="25" max="400" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} />
                  </div>
                )}

                {selectedTool === 'crop' && (
                  <div className="rotation-options">
                    <label>التدوير: {rotation}°</label>
                    <input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} />
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