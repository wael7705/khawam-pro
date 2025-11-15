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
  const [cropDragType, setCropDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [cropPreset, setCropPreset] = useState<'free' | 'passport'>('free')
  const [croppedImageForPassport, setCroppedImageForPassport] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalFileRef = useRef<File | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const cropOverlayRef = useRef<HTMLDivElement>(null)

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname))
    }
  }, [navigate, location])

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('الرجاء رفع ملف صورة صالح')
      return
    }
    
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processImageFile(file)
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

  // تهيئة إطار القص عند اختيار الأداة
  useEffect(() => {
    if (selectedTool === 'crop' && imageRect) {
      const img = imageContainerRef.current?.querySelector('img')
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        if (cropPreset === 'passport') {
          // حساب نسبة الصورة الشخصية: 3.5 سم عرض × 4.8 سم ارتفاع
          // النسبة: 3.5 / 4.8 = 0.729
          const passport_ratio = 3.5 / 4.8  // 0.729
          const img_ratio = img.naturalWidth / img.naturalHeight
          
          let passport_width: number
          let passport_height: number
          
          // حساب حجم الإطار بناءً على الصورة الفعلية
          // نريد أن يكون الإطار بحجم مناسب للصورة (حوالي 60-80% من الصورة)
          // لكن مع الحفاظ على نسبة 3.5:4.8
          if (img_ratio > passport_ratio) {
            // الصورة أوسع من المطلوب - نحدد الارتفاع أولاً
            passport_height = Math.min(img.naturalHeight * 0.7, img.naturalHeight)
            passport_width = Math.round(passport_height * passport_ratio)
            // التأكد من أن العرض لا يتجاوز حدود الصورة
            if (passport_width > img.naturalWidth) {
              passport_width = img.naturalWidth
              passport_height = Math.round(passport_width / passport_ratio)
            }
          } else {
            // الصورة أطول من المطلوب - نحدد العرض أولاً
            passport_width = Math.min(img.naturalWidth * 0.7, img.naturalWidth)
            passport_height = Math.round(passport_width / passport_ratio)
            // التأكد من أن الارتفاع لا يتجاوز حدود الصورة
            if (passport_height > img.naturalHeight) {
              passport_height = img.naturalHeight
              passport_width = Math.round(passport_height * passport_ratio)
            }
          }
          
          // التأكد من الحد الأدنى للحجم (100 بكسل على الأقل)
          if (passport_width < 100) {
            passport_width = Math.min(100, img.naturalWidth)
            passport_height = Math.round(passport_width / passport_ratio)
          }
          if (passport_height < 100) {
            passport_height = Math.min(100, img.naturalHeight)
            passport_width = Math.round(passport_height * passport_ratio)
          }
          
          // وضع الإطار في المنتصف
          const x = Math.max(0, (img.naturalWidth - passport_width) / 2)
          const y = Math.max(0, (img.naturalHeight - passport_height) / 2)
          
          setCropArea({
            x: Math.floor(x),
            y: Math.floor(y),
            width: Math.floor(passport_width),
            height: Math.floor(passport_height)
          })
        } else {
          // إنشاء إطار يغطي الصورة بالكامل
          setCropArea({
            x: 0,
            y: 0,
            width: img.naturalWidth,
            height: img.naturalHeight
          })
        }
      }
    } else if (selectedTool !== 'crop') {
      // إعادة تعيين عند الخروج من أداة القص
      setCropArea(null)
      setIsCropping(false)
      setCropDragType(null)
      setCropPreset('free')
    }
  }, [selectedTool, imageRect, cropPreset])

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
    // استخدام الصورة المقطوعة إذا كانت موجودة، وإلا استخدام الصورة المعالجة أو الأصلية
    let fileToUse = originalFileRef.current
    
    // أولوية: الصورة المقطوعة للصور الشخصية > الصورة المعالجة > الصورة الأصلية
    if (croppedImageForPassport) {
      // تحويل base64 إلى File
      try {
        const response = await fetch(croppedImageForPassport)
        const blob = await response.blob()
        fileToUse = new File([blob], 'cropped-image.png', { type: 'image/png' })
      } catch (error) {
        console.error('Error converting cropped image:', error)
        // استخدام الصورة المعالجة كبديل
        if (processedImage) {
          try {
            const response = await fetch(processedImage)
            const blob = await response.blob()
            fileToUse = new File([blob], 'processed-image.png', { type: 'image/png' })
          } catch (error) {
            console.error('Error converting processed image:', error)
            // استخدام الصورة الأصلية كبديل
          }
        }
      }
    } else if (processedImage) {
      // استخدام الصورة المعالجة إذا كانت موجودة
      try {
        const response = await fetch(processedImage)
        const blob = await response.blob()
        fileToUse = new File([blob], 'processed-image.png', { type: 'image/png' })
      } catch (error) {
        console.error('Error converting processed image:', error)
        // استخدام الصورة الأصلية كبديل
      }
    }
    
    if (!fileToUse) return
    
    setLoading(true)
    try {
      const response = await studioAPI.createPassportPhotos(fileToUse)
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
    if (!originalFileRef.current || !cropArea) return
    
    setLoading(true)
    try {
      const cropParams = {
        x: Math.round(cropArea.x),
        y: Math.round(cropArea.y),
        width: Math.round(cropArea.width),
        height: Math.round(cropArea.height)
      }
      
      // استخدام الصورة المعالجة إذا كانت موجودة، وإلا الصورة الأصلية
      const fileToUse = processedImage 
        ? await fetch(processedImage).then(r => r.blob()).then(blob => new File([blob], 'image.png', { type: 'image/png' }))
        : originalFileRef.current
      
      const response = await studioAPI.cropRotate(fileToUse, rotation, cropParams)
      if (response.success && response.image) {
        setProcessedImage(response.image)
        setActiveImage(response.image)
        // تحديث uploadedImage أيضاً لاستخدام الصورة المقطوعة في المعالجة التالية
        setUploadedImage(response.image)
        
        // إذا كان preset الصور الشخصية، حفظ الصورة المقطوعة
        if (cropPreset === 'passport') {
          setCroppedImageForPassport(response.image)
        }
        
        setCropArea(null)
        setCropPreset('free')
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

  // تحديد نوع السحب بناءً على موضع الماوس
  const getCropDragType = (clientX: number, clientY: number): 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null => {
    if (!cropArea || !imageRect) return null
    
    const img = imageContainerRef.current?.querySelector('img')
    if (!img) return null
    
    const scaleX = imageRect.width / img.naturalWidth
    const scaleY = imageRect.height / img.naturalHeight
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const cropLeft = containerRect.left + imageRect.left + (cropArea.x * scaleX)
    const cropTop = containerRect.top + imageRect.top + (cropArea.y * scaleY)
    const cropRight = cropLeft + (cropArea.width * scaleX)
    const cropBottom = cropTop + (cropArea.height * scaleY)
    
    // إذا كان preset الصور الشخصية، فقط التحريك مسموح
    if (cropPreset === 'passport') {
      // داخل الإطار = تحريك
      if (clientX >= cropLeft && clientX <= cropRight && clientY >= cropTop && clientY <= cropBottom) return 'move'
      return null
    }
    
    const handleSize = 10
    const margin = 5
    
    // الزوايا
    if (Math.abs(clientX - cropLeft) < handleSize && Math.abs(clientY - cropTop) < handleSize) return 'nw'
    if (Math.abs(clientX - cropRight) < handleSize && Math.abs(clientY - cropTop) < handleSize) return 'ne'
    if (Math.abs(clientX - cropLeft) < handleSize && Math.abs(clientY - cropBottom) < handleSize) return 'sw'
    if (Math.abs(clientX - cropRight) < handleSize && Math.abs(clientY - cropBottom) < handleSize) return 'se'
    
    // الجوانب
    if (clientX >= cropLeft - margin && clientX <= cropRight + margin && Math.abs(clientY - cropTop) < handleSize) return 'n'
    if (clientX >= cropLeft - margin && clientX <= cropRight + margin && Math.abs(clientY - cropBottom) < handleSize) return 's'
    if (clientY >= cropTop - margin && clientY <= cropBottom + margin && Math.abs(clientX - cropLeft) < handleSize) return 'w'
    if (clientY >= cropTop - margin && clientY <= cropBottom + margin && Math.abs(clientX - cropRight) < handleSize) return 'e'
    
    // داخل الإطار = تحريك
    if (clientX >= cropLeft && clientX <= cropRight && clientY >= cropTop && clientY <= cropBottom) return 'move'
    
    return null
  }

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (selectedTool !== 'crop' || !imageRect || !cropArea) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const dragType = getCropDragType(e.clientX, e.clientY)
    if (dragType) {
      setCropDragType(dragType)
      setIsCropping(true)
      const coords = getImageCoordinates(e.clientX, e.clientY)
      if (coords) {
        setCropStartPos(coords)
      }
    }
  }

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (selectedTool !== 'crop') return
    
    if (!isCropping) {
      // تحديث cursor عند الحركة بدون سحب
      if (cropArea && imageContainerRef.current) {
        const type = getCropDragType(e.clientX, e.clientY)
        if (type === 'move') {
          imageContainerRef.current.style.cursor = 'move'
        } else if (type) {
          imageContainerRef.current.style.cursor = type === 'nw' ? 'nw-resize' : 
                                                   type === 'ne' ? 'ne-resize' :
                                                   type === 'sw' ? 'sw-resize' :
                                                   type === 'se' ? 'se-resize' :
                                                   type === 'n' ? 'n-resize' :
                                                   type === 's' ? 's-resize' :
                                                   type === 'w' ? 'w-resize' :
                                                   type === 'e' ? 'e-resize' : 'resize'
        } else {
          imageContainerRef.current.style.cursor = 'default'
        }
      }
      return
    }
    
    if (!cropStartPos || !imageRect || !cropArea || !cropDragType) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const coords = getImageCoordinates(e.clientX, e.clientY)
    if (!coords) return
    
    const img = imageContainerRef.current?.querySelector('img')
    if (!img) return
    
    let newCropArea = { ...cropArea }
    
    // إذا كان preset الصور الشخصية، منع تغيير الحجم (الإطار ثابت)
    if (cropPreset === 'passport' && cropDragType !== 'move') {
      // في preset الصور الشخصية، فقط التحريك مسموح
      // إذا حاول المستخدم تغيير الحجم، نتحول إلى تحريك
      const deltaX = coords.x - cropStartPos.x
      const deltaY = coords.y - cropStartPos.y
      
      newCropArea.x = Math.max(0, Math.min(img.naturalWidth - newCropArea.width, cropArea.x + deltaX))
      newCropArea.y = Math.max(0, Math.min(img.naturalHeight - newCropArea.height, cropArea.y + deltaY))
      
      // الحفاظ على الأبعاد الثابتة
      newCropArea.width = cropArea.width
      newCropArea.height = cropArea.height
    } else if (cropDragType === 'move') {
      // تحريك الإطار
      const deltaX = coords.x - cropStartPos.x
      const deltaY = coords.y - cropStartPos.y
      
      newCropArea.x = Math.max(0, Math.min(img.naturalWidth - newCropArea.width, cropArea.x + deltaX))
      newCropArea.y = Math.max(0, Math.min(img.naturalHeight - newCropArea.height, cropArea.y + deltaY))
    } else {
      // تغيير الحجم (فقط في الوضع الحر)
      const deltaX = coords.x - cropStartPos.x
      const deltaY = coords.y - cropStartPos.y
      
      if (cropDragType.includes('n')) {
        newCropArea.y = Math.max(0, cropArea.y + deltaY)
        newCropArea.height = cropArea.height - deltaY
      }
      if (cropDragType.includes('s')) {
        newCropArea.height = Math.min(img.naturalHeight - newCropArea.y, cropArea.height + deltaY)
      }
      if (cropDragType.includes('w')) {
        newCropArea.x = Math.max(0, cropArea.x + deltaX)
        newCropArea.width = cropArea.width - deltaX
      }
      if (cropDragType.includes('e')) {
        newCropArea.width = Math.min(img.naturalWidth - newCropArea.x, cropArea.width + deltaX)
      }
      
      // التأكد من الحد الأدنى للحجم
      if (newCropArea.width < 10) {
        if (cropDragType.includes('w')) {
          newCropArea.x = cropArea.x + cropArea.width - 10
        }
        newCropArea.width = 10
      }
      if (newCropArea.height < 10) {
        if (cropDragType.includes('n')) {
          newCropArea.y = cropArea.y + cropArea.height - 10
        }
        newCropArea.height = 10
      }
    }
    
    setCropArea(newCropArea)
    setCropStartPos(coords)
  }

  const handleCropMouseUp = () => {
    setIsCropping(false)
    setCropDragType(null)
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

  const handleDownload = async (format: 'image' | 'pdf' = 'image') => {
    if (!processedImage && !uploadedImage) return
    
    setLoading(true)
    
    try {
      if (format === 'image') {
        // إذا كانت الصورة من backend (processedImage)، فهي بالفعل 300 DPI
        // نحمّلها مباشرة بدون canvas للحفاظ على DPI metadata
        if (processedImage) {
          // تحويل base64 إلى blob وتحويله مباشرة
          const response = await fetch(processedImage)
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `processed-image-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          setLoading(false)
        } else if (uploadedImage) {
          // الصورة من المستخدم - إرسال للـ backend لإضافة DPI = 300
          const response = await fetch(uploadedImage)
          const blob = await response.blob()
          const file = new File([blob], 'image.png', { type: 'image/png' })
          
          const formData = new FormData()
          formData.append('file', file)
          
          const apiResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'}/studio/add-dpi`, {
            method: 'POST',
            body: formData
          })
          
          if (apiResponse.ok) {
            const result = await apiResponse.json()
            if (result.success && result.image) {
              // تحميل الصورة مع DPI = 300
              const downloadResponse = await fetch(result.image)
              const downloadBlob = await downloadResponse.blob()
              const downloadUrl = URL.createObjectURL(downloadBlob)
              const link = document.createElement('a')
              link.href = downloadUrl
              link.download = `processed-image-${Date.now()}.png`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(downloadUrl)
              setLoading(false)
            } else {
              throw new Error('Failed to add DPI')
            }
          } else {
            throw new Error('API request failed')
          }
        }
      } else if (format === 'pdf') {
        // للـ PDF، نحتاج canvas
        const imageSrc = processedImage || uploadedImage || ''
        const img = new Image()
        
        img.onload = async () => {
          try {
            const width = img.naturalWidth > 0 ? img.naturalWidth : img.width
            const height = img.naturalHeight > 0 ? img.naturalHeight : img.height
            
            const canvas = downloadCanvasRef.current || document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              setLoading(false)
              return
            }
            
            ctx.drawImage(img, 0, 0, width, height)
            
            const { jsPDF } = await import('jspdf')
            
            // تحويل البكسل إلى مليمتر (1 بوصة = 25.4 ملم، 300 DPI)
            const mmWidth = (width / 300) * 25.4
            const mmHeight = (height / 300) * 25.4
            
            const pdf = new jsPDF({
              orientation: width > height ? 'landscape' : 'portrait',
              unit: 'mm',
              format: [mmWidth, mmHeight]
            })
            
            const imgData = canvas.toDataURL('image/png', 1.0)
            pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight, undefined, 'FAST')
            pdf.save(`processed-image-${Date.now()}.pdf`)
            setLoading(false)
          } catch (error) {
            console.error('Error creating PDF:', error)
            alert('خطأ في إنشاء PDF. سيتم التحميل كصورة بدلاً من ذلك.')
            setLoading(false)
            handleDownload('image')
          }
        }
        
        img.onerror = () => {
          alert('خطأ في تحميل الصورة')
          setLoading(false)
        }
        
        img.src = imageSrc
      }
    } catch (error) {
      console.error('Error downloading:', error)
      alert('حدث خطأ أثناء التحميل')
      setLoading(false)
    }
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
              <div 
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload size={48} />
                <p>{isDragging ? 'أفلت الصورة هنا' : 'انقر أو اسحب لرفع صورة'}</p>
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
                  onMouseLeave={selectedTool === 'crop' ? () => {
                    handleCropMouseUp()
                    if (imageContainerRef.current) {
                      imageContainerRef.current.style.cursor = 'default'
                    }
                  } : undefined}
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
                      <>
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
                        {/* Handles للتحكم - إخفاؤها في preset الصور الشخصية */}
                        {cropPreset !== 'passport' && (
                          <>
                            <div className="crop-handle crop-handle-nw" style={{ left: `${left}px`, top: `${top}px` }} />
                            <div className="crop-handle crop-handle-ne" style={{ left: `${left + width}px`, top: `${top}px` }} />
                            <div className="crop-handle crop-handle-sw" style={{ left: `${left}px`, top: `${top + height}px` }} />
                            <div className="crop-handle crop-handle-se" style={{ left: `${left + width}px`, top: `${top + height}px` }} />
                            <div className="crop-handle crop-handle-n" style={{ left: `${left + width/2}px`, top: `${top}px` }} />
                            <div className="crop-handle crop-handle-s" style={{ left: `${left + width/2}px`, top: `${top + height}px` }} />
                            <div className="crop-handle crop-handle-w" style={{ left: `${left}px`, top: `${top + height/2}px` }} />
                            <div className="crop-handle crop-handle-e" style={{ left: `${left + width}px`, top: `${top + height/2}px` }} />
                          </>
                        )}
                      </>
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
                  <div className="download-buttons">
                    <button 
                      className="btn-icon primary" 
                      onClick={() => handleDownload('image')}
                      disabled={!uploadedImage}
                      title="تحميل كصورة PNG"
                    >
                      <Download /> تحميل PNG
                    </button>
                    <button 
                      className="btn-icon primary" 
                      onClick={() => handleDownload('pdf')}
                      disabled={!uploadedImage}
                      title="تحميل كملف PDF"
                    >
                      <Download /> تحميل PDF
                    </button>
                  </div>
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
                    <div className="crop-presets mb-4">
                      <label className="block mb-2 font-semibold">نوع القص:</label>
                      <div className="flex gap-2">
                        <button
                          className={`btn ${cropPreset === 'free' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setCropPreset('free')}
                        >
                          حر
                        </button>
                        <button
                          className={`btn ${cropPreset === 'passport' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setCropPreset('passport')}
                        >
                          صور شخصية (3.5×4.8 سم)
                        </button>
                      </div>
                      {cropPreset === 'passport' && (
                        <p className="text-xs text-gray-500 mt-2">
                          سيتم إنشاء إطار بالضبط 3.5 سم × 4.8 سم. حرك الإطار ليناسب الصورة.
                        </p>
                      )}
                    </div>
                    <label>التدوير: {rotation}°</label>
                    <input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} />
                    <p className="text-sm text-gray-600 mt-2 mb-2">
                      {cropPreset === 'passport' 
                        ? 'حرك الإطار ليناسب الصورة (الإطار ثابت الحجم)' 
                        : 'اسحب على الصورة لتحديد منطقة القص'}
                    </p>
                    {cropArea && (
                      <div className="crop-info">
                        <p>المنطقة المحددة: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} بكسل</p>
                        {cropPreset === 'passport' && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ 3.5 سم × 4.8 سم (للصور الشخصية)
                          </p>
                        )}
                      </div>
                    )}
                    <button className="btn btn-primary w-full mt-4" onClick={handleApplyCropRotate} disabled={loading || !cropArea}>
                      {loading ? 'جاري المعالجة...' : cropPreset === 'passport' ? 'قص للصور الشخصية' : 'تطبيق القص والتدوير'}
                    </button>
                    {cropArea && (
                      <button className="btn btn-secondary w-full mt-2" onClick={() => {
                        setCropArea(null)
                        setCropPreset('free')
                      }}>
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
      <canvas ref={downloadCanvasRef} className="hidden" />
    </div>
  )
}