import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import './ColorPicker.css'

interface ColorPickerProps {
  selectedColors: string[]
  onColorsChange: (colors: string[]) => void
  maxColors?: number
}

export default function ColorPicker({ 
  selectedColors, 
  onColorsChange, 
  maxColors = 6 
}: ColorPickerProps) {
  const [currentColor, setCurrentColor] = useState('#FF0000')
  const [hue, setHue] = useState(0) // 0-360
  const [saturation, setSaturation] = useState(100) // 0-100
  const [lightness, setLightness] = useState(50) // 0-100
  const [isPickerActive, setIsPickerActive] = useState(false)
  const saturationRef = useRef<HTMLDivElement>(null)

  // Preset colors grid (3 rows of 12 colors each + 1 row of 6 light colors)
  const presetColors = [
    // Row 1: Bright colors
    ['#FF1493', '#FF00FF', '#9400D3', '#0000FF', '#00BFFF', '#00FFFF', 
     '#00FF7F', '#ADFF2F', '#9ACD32', '#FFFF00', '#FFA500', '#FF0000'],
    // Row 2: Darker colors
    ['#FF4500', '#8B008B', '#191970', '#008B8B', '#006400', '#556B2F',
     '#800000', '#C0C0C0', '#808080', '#696969', '#000000', '#FFB6C1'],
    // Row 3: Light pastel colors
    ['#FFF8DC', '#FFE4E1', '#FFFACD', '#F0FFF0', '#E6E6FA', '#F5F5DC']
  ]

  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100
    l /= 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x
    }

    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)

    return [r, g, b]
  }

  // Convert RGB to HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('').toUpperCase()
  }

  // Convert HEX to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 0, 0]
  }

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
  }

  // Update current color when HSL changes
  useEffect(() => {
    const [r, g, b] = hslToRgb(hue, saturation, lightness)
    setCurrentColor(rgbToHex(r, g, b))
  }, [hue, saturation, lightness])

  // Handle hue slider
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHue(parseInt(e.target.value))
  }

  // Handle saturation/lightness picker
  const handleSaturationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!saturationRef.current) return
    const rect = saturationRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100))
    setSaturation(s)
    setLightness(l)
    setIsPickerActive(true)
  }

  // Handle hex input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      setCurrentColor(hex)
      const [r, g, b] = hexToRgb(hex)
      const [h, s, l] = rgbToHsl(r, g, b)
      setHue(h)
      setSaturation(s)
      setLightness(l)
    }
  }

  // Handle RGB input
  const handleRgbChange = (index: number, value: string) => {
    const [r, g, b] = hexToRgb(currentColor)
    const rgb = [r, g, b]
    rgb[index] = parseInt(value) || 0
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2])
    setCurrentColor(hex)
    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2])
    setHue(h)
    setSaturation(s)
    setLightness(l)
  }

  // Add color
  const handleAddColor = () => {
    if (selectedColors.length < maxColors && !selectedColors.includes(currentColor)) {
      onColorsChange([...selectedColors, currentColor])
    }
  }

  // Remove color
  const handleRemoveColor = (color: string) => {
    onColorsChange(selectedColors.filter(c => c !== color))
  }

  // Select preset color
  const handlePresetColorClick = (color: string) => {
    setCurrentColor(color)
    const [r, g, b] = hexToRgb(color)
    const [h, s, l] = rgbToHsl(r, g, b)
    setHue(h)
    setSaturation(s)
    setLightness(l)
  }

  const [r, g, b] = hexToRgb(currentColor)
  const currentHueColor = `hsl(${hue}, 100%, 50%)`

  return (
    <div className="color-picker-advanced">
      {/* Selected Colors Section */}
      <div className="selected-colors-section">
        <h4 className="selected-colors-title">
          عدد الألوان المختارة: {selectedColors.length} / {maxColors}
        </h4>
        <div className="selected-colors-list">
          {selectedColors.map((color) => (
            <div key={color} className="selected-color-item">
              <div 
                className="selected-color-preview" 
                style={{ backgroundColor: color }}
              />
              <span className="selected-color-code">#{color.slice(1)}</span>
              <button
                className="remove-color-btn"
                onClick={() => handleRemoveColor(color)}
                title="إزالة اللون"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preset Colors Section */}
      <div className="preset-colors-section">
        <h4 className="preset-colors-title">ألوان جاهزة</h4>
        <div className="preset-colors-grid">
          {presetColors.map((row, rowIndex) => (
            <div key={rowIndex} className="preset-colors-row">
              {row.map((color) => (
                <button
                  key={color}
                  className={`preset-color-swatch ${currentColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePresetColorClick(color)}
                  title={color}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Color Picker */}
      <div className="advanced-picker-section">
        <div className="color-picker-controls">
          {/* Hue Slider */}
          <div className="hue-slider-container">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="hue-slider"
              style={{
                background: `linear-gradient(to bottom, 
                  hsl(0, 100%, 50%), 
                  hsl(60, 100%, 50%), 
                  hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), 
                  hsl(240, 100%, 50%), 
                  hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%))`
              }}
            />
          </div>

          {/* Saturation/Lightness Picker */}
          <div 
            ref={saturationRef}
            className="saturation-lightness-picker"
            style={{ backgroundColor: currentHueColor }}
            onClick={handleSaturationClick}
          >
            <div
              className="picker-handle"
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                backgroundColor: currentColor
              }}
            />
          </div>
        </div>

        {/* Color Value Inputs */}
        <div className="color-value-inputs">
          <div className="color-input-group">
            <label>:HEX</label>
            <div className="hex-input-wrapper">
              <input
                type="text"
                value={currentColor}
                onChange={handleHexChange}
                className="hex-input"
                maxLength={7}
              />
              <div 
                className="color-preview-box" 
                style={{ backgroundColor: currentColor }}
              />
            </div>
          </div>

          <div className="color-input-group">
            <label>:RGB</label>
            <div className="rgb-inputs">
              <input
                type="text"
                value={r}
                onChange={(e) => handleRgbChange(0, e.target.value)}
                className="rgb-input"
                maxLength={3}
              />
              <input
                type="text"
                value={g}
                onChange={(e) => handleRgbChange(1, e.target.value)}
                className="rgb-input"
                maxLength={3}
              />
              <input
                type="text"
                value={b}
                onChange={(e) => handleRgbChange(2, e.target.value)}
                className="rgb-input"
                maxLength={3}
              />
            </div>
          </div>
        </div>

        {/* Add Color Button */}
        <button
          className="add-color-btn"
          onClick={handleAddColor}
          disabled={selectedColors.length >= maxColors || selectedColors.includes(currentColor)}
        >
          إضافة اللون
        </button>
      </div>
    </div>
  )
}

