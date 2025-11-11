import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin, ArrowLeft, ArrowRight, Image, XCircle, CheckCircle, Search, Loader2 } from 'lucide-react'
import SimpleMap from '../components/SimpleMap'
import './LocationPickerPage.css'

interface DeliveryAddress {
  latitude?: number
  longitude?: number
  street: string
  neighborhood: string
  building: string
  floor?: string
  entranceImageUrl?: string
  houseImageUrl?: string
  notes?: string
}

interface LocationPickerPageProps {
  onLocationSelected?: (address: DeliveryAddress) => void
  redirectTo?: string
}

const LocationPickerPage: React.FC<LocationPickerPageProps> = ({ 
  onLocationSelected,
  redirectTo = '/services'
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [street, setStreet] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [entranceImage, setEntranceImage] = useState<File | null>(null)
  const [houseImage, setHouseImage] = useState<File | null>(null)
  const [entranceImageUrl, setEntranceImageUrl] = useState<string | undefined>()
  const [houseImageUrl, setHouseImageUrl] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mapHeight, setMapHeight] = useState(400)
  const entranceInputRef = useRef<HTMLInputElement>(null)
  const houseInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // حساب ارتفاع الخريطة ديناميكياً
  useEffect(() => {
    const calculateMapHeight = () => {
      const windowHeight = window.innerHeight
      const headerHeight = 80
      const formHeight = 350
      const padding = 40
      
      const availableHeight = windowHeight - headerHeight - formHeight - padding
      const minHeight = 400
      const maxHeight = 700
      
      const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight))
      setMapHeight(calculatedHeight)
    }
    calculateMapHeight()
    window.addEventListener('resize', calculateMapHeight)
    return () => window.removeEventListener('resize', calculateMapHeight)
  }, [])

  // تحديد الموقع تلقائياً
  const handleLocateMe = () => {
    setError(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
        },
        (err) => {
          setError('تعذر تحديد الموقع. يرجى التأكد من تفعيل خدمات الموقع.')
          console.error(err)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      setError('متصفحك لا يدعم تحديد الموقع الجغرافي.')
    }
  }

  // اختيار موقع من الخريطة (سيتم إضافته لاحقاً مع SimpleMap)
  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }

  // البحث عن موقع باستخدام Nominatim API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      // البحث في سوريا أولاً، ثم البحث العام
      const query = encodeURIComponent(searchQuery.trim())
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=sy&accept-language=ar`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KhawamPro/1.0'
        }
      })

      if (!response.ok) {
        throw new Error('فشل البحث')
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        setSearchResults(data)
        setShowSearchResults(true)
      } else {
        // إذا لم نجد نتائج في سوريا، نجرب البحث العام
        const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&accept-language=ar`
        const globalResponse = await fetch(globalUrl, {
          headers: {
            'User-Agent': 'KhawamPro/1.0'
          }
        })
        
        if (globalResponse.ok) {
          const globalData = await globalResponse.json()
          if (globalData && globalData.length > 0) {
            setSearchResults(globalData)
            setShowSearchResults(true)
          } else {
            setSearchResults([])
            setShowSearchResults(false)
            setError('لم يتم العثور على نتائج للبحث')
          }
        } else {
          setSearchResults([])
          setShowSearchResults(false)
          setError('فشل البحث. يرجى المحاولة مرة أخرى')
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى')
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  // اختيار نتيجة من نتائج البحث
  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    
    setLatitude(lat)
    setLongitude(lon)
    setSearchQuery(result.display_name)
    setSearchResults([])
    setShowSearchResults(false)
    setError(null)
  }

  // البحث عند تغيير النص (debounce) - معالجة محسّنة
  // تم تعطيل البحث التلقائي - سيتم البحث فقط عند النقر على زر البحث
  // يمكن تفعيله لاحقاً إذا لزم الأمر
  // useEffect(() => {
  //   if (!searchQuery.trim()) {
  //     setSearchResults([])
  //     setShowSearchResults(false)
  //     return
  //   }

  //   if (searchQuery.trim().length < 3) {
  //     setSearchResults([])
  //     setShowSearchResults(false)
  //     return
  //   }

  //   const timeoutId = setTimeout(async () => {
  //     if (searchQuery.trim().length >= 3) {
  //       try {
  //         await handleSearch()
  //       } catch (err) {
  //         console.error('Search error in useEffect:', err)
  //       }
  //     }
  //   }, 500)

  //   return () => clearTimeout(timeoutId)
  // }, [searchQuery])

  // رفع الصور
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<File | null>>,
    setImageUrl: React.Dispatch<React.SetStateAction<string | undefined>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      setImageUrl(URL.createObjectURL(file))
    }
  }

  const handleImageRemove = (
    setImage: React.Dispatch<React.SetStateAction<File | null>>,
    setImageUrl: React.Dispatch<React.SetStateAction<string | undefined>>
  ) => {
    setImage(null)
    setImageUrl(undefined)
  }

  // حفظ العنوان
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // التحقق من وجود الإحداثيات (مطلوبة)
    if (!latitude || !longitude) {
      setError('الرجاء تحديد موقعك على الخريطة أو استخدام زر "تحديد موقعي تلقائياً"')
      setIsLoading(false)
      return
    }

    try {
      const address: DeliveryAddress = {
        latitude,
        longitude,
        street,
        address: street || `${neighborhood} ${building}`.trim() || 'تم تحديد الموقع',
        neighborhood,
        building,
        floor: floor || undefined,
        entranceImageUrl: entranceImageUrl || undefined,
        houseImageUrl: houseImageUrl || undefined,
        notes: notes || undefined,
      }

      // حفظ في localStorage
      localStorage.setItem('deliveryAddress', JSON.stringify(address))
      localStorage.setItem('orderType', 'delivery')

      // استدعاء callback إذا كان موجود
      if (onLocationSelected) {
        onLocationSelected(address)
      }

      // العودة للصفحة السابقة أو المسار المحدد
      // إذا كان returnTo = 'order-modal'، نعيد إلى الصفحة ونخزن flag لفتح Modal
      if (location.state?.returnTo === 'order-modal' && location.state?.from) {
        localStorage.setItem('shouldReopenOrderModal', 'true')
        localStorage.setItem('orderModalService', location.state.serviceName || '')
        navigate(location.state.from)
              } else if (location.state?.from) {
        navigate(location.state.from)
      } else {
        navigate(redirectTo)
      }
    } catch (error) {
      console.error('خطأ في حفظ العنوان:', error)
      setError('حدث خطأ أثناء حفظ العنوان. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="location-picker-page">
      {/* Header */}
      <header className="location-picker-header">
        <div className="location-picker-header-content">
          <div className="location-picker-header-left">
            <button
              onClick={() => navigate(-1)}
              className="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>العودة</span>
            </button>
          </div>
          <div className="location-picker-header-right">
            <div className="location-icon-wrapper">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h1 className="page-title">
              تحديد موقع التوصيل
            </h1>
          </div>
        </div>
      </header>

      {/* الخريطة */}
      <div className="map-section-wrapper">
        <div className="map-card">
          <div className="map-header">
            <div className="map-header-left">
              <MapPin className="map-icon" />
              <h3 className="map-header-title">
                اختر موقعك على الخريطة
              </h3>
            </div>
            <button
              onClick={handleLocateMe}
              className="locate-me-btn"
            >
              <MapPin className="w-4 h-4" />
              تحديد موقعي تلقائياً
            </button>
          </div>
          
          {/* Search Box */}
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true)
                    }
                  }}
                  placeholder="ابحث عن موقع (مثال: دمشق، البرامكة، شارع...)"
                  className="form-input search-input"
                  disabled={isLoading}
                />
                {isSearching && (
                  <Loader2 className="search-spinner" />
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary search-button"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'جاري البحث...' : 'بحث'}
              </button>
            </form>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <div className="search-result-name">
                      {result.display_name}
                    </div>
                    <div className="search-result-coords">
                      {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Location Info */}
          {latitude && longitude && (
            <div className="location-info">
              <CheckCircle className="location-check-icon" />
              <span>
                الموقع المحدد: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </div>
          )}
          
          {/* Map Container */}
          <div className="map-container-wrapper" style={{ height: `${mapHeight}px` }}>
            <SimpleMap
              latitude={latitude}
              longitude={longitude}
              defaultCenter={latitude && longitude ? [latitude, longitude] : [33.5138, 36.2765]}
              defaultZoom={latitude && longitude ? 17 : 12}
              onLocationSelect={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
                setError(null)
              }}
            />
            {/* Hint */}
            <div className="map-hint">
              💡 انقر على الخريطة لتحديد الموقع
            </div>
          </div>
        </div>
      </div>

      {/* نموذج العنوان */}
      <div className="form-section-wrapper">
        <div className="form-card">
          <h3 className="form-title">
            تفاصيل العنوان
          </h3>
          <p className="form-subtitle">
            أدخل تفاصيل عنوانك لتسهيل عملية التوصيل
          </p>
          
          {error && (
            <div className="error-alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* GPS Location */}
            <div className="gps-section">
              <label className="gps-label">
                <span className="required">*</span>
                الموقع الجغرافي (GPS)
              </label>
              <div className="gps-actions">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="locate-me-btn"
                  disabled={isLoading}
                >
                  <MapPin className="w-4 h-4" />
                  تحديد موقعي تلقائياً
                </button>
                {(latitude && longitude) && (
                  <div className="gps-status">
                    <CheckCircle className="w-4 h-4" />
                    تم التحديد: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </div>
                )}
              </div>
              <p className="gps-hint">
                سيساعد تحديد الموقع في وصول طلبك بشكل أسرع وأدق
              </p>
            </div>

            {/* Manual Address Input */}
            <div className="form-grid">
              <div className="form-field">
                <label className="form-field-label">
                  اسم الشارع <span className="optional">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="form-input"
                  placeholder="أدخل اسم الشارع"
                  disabled={isLoading}
                />
              </div>
              <div className="form-field">
                <label className="form-field-label">
                  اسم الحي <span className="optional">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="form-input"
                  placeholder="أدخل اسم الحي"
                  disabled={isLoading}
                />
              </div>
              <div className="form-field">
                <label className="form-field-label">
                  رقم البناء <span className="optional">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="form-input"
                  placeholder="أدخل رقم البناء"
                  disabled={isLoading}
                />
              </div>
              <div className="form-field">
                <label className="form-field-label">
                  رقم الطابق <span className="optional">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="form-input"
                  placeholder="أدخل رقم الطابق"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Image Uploads */}
            <div className="image-upload-section">
              <div className="image-upload-grid">
                {/* Entrance Image */}
                <div className="image-upload-field">
                  <label className="form-field-label">
                    صورة المدخل <span className="optional">(اختياري)</span>
                  </label>
                  <input
                    ref={entranceInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, setEntranceImage, setEntranceImageUrl)}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => entranceInputRef.current?.click()}
                    className="image-upload-button"
                    disabled={isLoading}
                  >
                    <Image className="image-upload-icon" />
                    <span className="image-upload-button-text">اختر صورة المدخل</span>
                  </button>
                  {entranceImageUrl && (
                    <div className="image-preview-wrapper">
                      <img
                        src={entranceImageUrl}
                        alt="صورة المدخل"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(setEntranceImage, setEntranceImageUrl)}
                        className="remove-image-btn"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* House Image */}
                <div className="image-upload-field">
                  <label className="form-field-label">
                    صورة المنزل <span className="optional">(اختياري)</span>
                  </label>
                  <input
                    ref={houseInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, setHouseImage, setHouseImageUrl)}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => houseInputRef.current?.click()}
                    className="image-upload-button"
                    disabled={isLoading}
                  >
                    <Image className="image-upload-icon" />
                    <span className="image-upload-button-text">اختر صورة المنزل</span>
                  </button>
                  {houseImageUrl && (
                    <div className="image-preview-wrapper">
                      <img
                        src={houseImageUrl}
                        alt="صورة المنزل"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(setHouseImage, setHouseImageUrl)}
                        className="remove-image-btn"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="form-field">
              <label className="form-field-label">
                ملاحظات إضافية <span className="optional">(اختياري)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="form-textarea"
                placeholder="أي ملاحظات إضافية قد تساعد في الوصول إليك..."
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cancel-btn"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading || !latitude || !longitude}
                className="submit-btn"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد الموقع</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LocationPickerPage

