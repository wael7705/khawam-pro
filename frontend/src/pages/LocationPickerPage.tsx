import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin, ArrowLeft, ArrowRight, Image, XCircle } from 'lucide-react'
import SimpleMap from '../components/SimpleMap'

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
      if (location.state?.from) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-red-100 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-tajawal">العودة</span>
            </button>
            <div className="flex items-center space-x-4 rtl-space-x-reverse">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-cairo font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                تحديد موقع التوصيل
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* الخريطة */}
          <div className="mb-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-cairo font-semibold text-blue-800">
                      اختر موقعك على الخريطة
                    </h3>
                  </div>
                  <button
                    onClick={handleLocateMe}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-tajawal font-semibold text-sm shadow-md flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    تحديد موقعي تلقائياً
                  </button>
                </div>
                {latitude && longitude && (
                  <p className="text-sm text-blue-700 mt-2">
                    ✓ الموقع المحدد: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <div style={{ height: `${mapHeight}px` }}>
                <SimpleMap
                  latitude={latitude}
                  longitude={longitude}
                  defaultCenter={latitude && longitude ? [latitude, longitude] : [33.5138, 36.2765]}
                  defaultZoom={latitude && longitude ? 17 : 12}
                />
              </div>
            </div>
          </div>

          {/* نموذج العنوان */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-xl font-cairo font-semibold text-gray-800 mb-6">
              تفاصيل العنوان
            </h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GPS Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموقع الجغرافي (GPS) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <MapPin className="w-4 h-4" />
                    تحديد موقعي تلقائياً
                  </button>
                  {(latitude && longitude) && (
                    <span className="text-sm text-green-600">
                      ✓ تم التحديد: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  سيساعد تحديد الموقع في وصول طلبك بشكل أسرع وأدق.
                </p>
              </div>

              {/* Manual Address Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الشارع <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    placeholder="أدخل اسم الشارع"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الحي <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    placeholder="أدخل اسم الحي"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم البناء <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    placeholder="أدخل رقم البناء"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الطابق <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                    placeholder="أدخل رقم الطابق"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entrance Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    صورة المدخل (اختياري)
                  </label>
                  <div className="space-y-3">
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
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors"
                      disabled={isLoading}
                    >
                      <Image className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">اختر صورة المدخل</span>
                    </button>
                    {entranceImageUrl && (
                      <div className="relative">
                        <img
                          src={entranceImageUrl}
                          alt="صورة المدخل"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageRemove(setEntranceImage, setEntranceImageUrl)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* House Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    صورة المنزل (اختياري)
                  </label>
                  <div className="space-y-3">
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
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors"
                      disabled={isLoading}
                    >
                      <Image className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">اختر صورة المنزل</span>
                    </button>
                    {houseImageUrl && (
                      <div className="relative">
                        <img
                          src={houseImageUrl}
                          alt="صورة المنزل"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageRemove(setHouseImage, setHouseImageUrl)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  placeholder="أي ملاحظات إضافية قد تساعد في الوصول إليك..."
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !latitude || !longitude}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  )
}

export default LocationPickerPage

