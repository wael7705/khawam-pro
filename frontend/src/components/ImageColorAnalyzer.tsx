import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import './ImageColorAnalyzer.css'

interface ImageColorAnalyzerProps {
  files: File[]
  onColorsExtracted: (colors: string[]) => void
}

export default function ImageColorAnalyzer({ files, onColorsExtracted }: ImageColorAnalyzerProps) {
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // استخراج الألوان من الصور
  useEffect(() => {
    const extractColors = async () => {
      if (files.length === 0) {
        setExtractedColors([])
        return
      }

      setIsAnalyzing(true)
      const allColors: string[] = []

      for (const file of files) {
        // فقط معالجة ملفات الصور
        if (!file.type.startsWith('image/')) continue

        try {
          const imageUrl = URL.createObjectURL(file)
          const img = new Image()
          
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = imageUrl
          })

          const canvas = canvasRef.current
          if (!canvas) continue

          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          // تقليل حجم الصورة للتحليل السريع
          const maxSize = 200
          const scale = Math.min(maxSize / img.width, maxSize / img.height)
          canvas.width = img.width * scale
          canvas.height = img.height * scale

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // استخراج بيانات البكسل
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const pixels = imageData.data

          // تجميع الألوان حسب التكرار
          const colorMap = new Map<string, number>()

          // أخذ عينة من البكسل (كل 10 بكسل لتسريع العملية)
          for (let i = 0; i < pixels.length; i += 40) {
            const r = pixels[i]
            const g = pixels[i + 1]
            const b = pixels[i + 2]
            const a = pixels[i + 3]

            // تجاهل البكسل الشفاف
            if (a < 128) continue

            // تحويل RGB إلى HEX
            const hex = `#${[r, g, b].map(x => {
              const hex = x.toString(16)
              return hex.length === 1 ? '0' + hex : hex
            }).join('').toUpperCase()}`

            // تجميع الألوان المتشابهة (في نطاق ±10 لكل قناة)
            const roundedR = Math.round(r / 10) * 10
            const roundedG = Math.round(g / 10) * 10
            const roundedB = Math.round(b / 10) * 10
            const roundedHex = `#${[roundedR, roundedG, roundedB].map(x => {
              const hex = Math.min(255, Math.max(0, x)).toString(16)
              return hex.length === 1 ? '0' + hex : hex
            }).join('').toUpperCase()}`

            colorMap.set(roundedHex, (colorMap.get(roundedHex) || 0) + 1)
          }

          // ترتيب الألوان حسب التكرار واختيار الأكثر شيوعاً
          const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([color]) => color)

          allColors.push(...sortedColors)

          URL.revokeObjectURL(imageUrl)
        } catch (error) {
          console.error('Error extracting colors from image:', error)
        }
      }

      // إزالة الألوان المكررة واختيار الأكثر شيوعاً
      const uniqueColors = Array.from(new Set(allColors)).slice(0, 6)
      setExtractedColors(uniqueColors)
      
      if (uniqueColors.length > 0) {
        onColorsExtracted(uniqueColors)
      }

      setIsAnalyzing(false)
    }

    extractColors()
  }, [files, onColorsExtracted])

  if (files.length === 0 || !files.some(f => f.type.startsWith('image/'))) {
    return null
  }

  return (
    <div className="image-color-analyzer">
      <div className="analyzer-header">
        <Sparkles size={18} />
        <h4>تحليل ألوان الصورة الذكية</h4>
        {isAnalyzing && <span className="analyzing-badge">جاري التحليل...</span>}
      </div>
      
      {extractedColors.length > 0 && (
        <div className="extracted-colors">
          <p className="extracted-colors-label">الألوان الغالبة في الصورة:</p>
          <div className="extracted-colors-grid">
            {extractedColors.map((color, index) => (
              <div
                key={index}
                className="extracted-color-item"
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => {
                  // إضافة اللون إلى الألوان المختارة
                  onColorsExtracted([color])
                }}
              >
                <span className="color-code">{color}</span>
              </div>
            ))}
          </div>
          <p className="extracted-colors-hint">
            اضغط على أي لون لإضافته تلقائياً
          </p>
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

