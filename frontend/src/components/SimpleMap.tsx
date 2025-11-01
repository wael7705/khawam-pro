import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface SimpleMapProps {
  address?: string
  latitude?: number
  longitude?: number
  defaultCenter?: [number, number]
  defaultZoom?: number
  markers?: Array<{
    lat: number
    lng: number
    title: string
    description?: string
  }>
}

// Component to update map view when props change
function MapViewUpdater({ 
  center, 
  zoom 
}: { 
  center: [number, number]
  zoom: number 
}) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  
  return null
}

export default function SimpleMap({ 
  address, 
  latitude, 
  longitude,
  defaultCenter = [33.5138, 36.2765], // Damascus default
  defaultZoom = 12,
  markers = []
}: SimpleMapProps) {
  const [position, setPosition] = useState<[number, number]>(defaultCenter)
  const [zoom, setZoom] = useState(defaultZoom)
  const [loading, setLoading] = useState(false)
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street')

  useEffect(() => {
    // If we have coordinates, use them directly
    if (latitude && longitude) {
      setPosition([latitude, longitude])
      setZoom(17)
      setLoading(false)
      return
    }

    // If we have an address, geocode it
    if (address) {
      setLoading(true)
      const encodedAddress = encodeURIComponent(address)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`, {
        headers: {
          'User-Agent': 'KhawamPro/1.0'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0]
            setPosition([parseFloat(lat), parseFloat(lon)])
            setZoom(15)
          }
          setLoading(false)
        })
        .catch(err => {
          console.error('Geocoding error:', err)
          setLoading(false)
        })
    }
  }, [address, latitude, longitude])

  // Custom home icon for markers
  const homeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDhoMnYxMGMwIDEuMS45IDIgMiAyaDEyYzEuMSAwIDItLjkgMi0yVjhoMkwxMiAyeiIgZmlsbD0iI0VGNDQ0NCIvPjwvc3ZnPg==',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  if (loading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل الخريطة...</p>
      </div>
    )
  }

  // Determine which markers to show
  const markersToShow = markers.length > 0 
    ? markers 
    : (position && latitude && longitude 
        ? [{ lat: latitude, lng: longitude, title: address || 'الموقع', description: '' }]
        : [])

  return (
    <div className="simple-map-container">
      <div className="map-controls">
        <button
          className={`map-type-btn ${mapType === 'street' ? 'active' : ''}`}
          onClick={() => setMapType('street')}
        >
          خريطة
        </button>
        <button
          className={`map-type-btn ${mapType === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapType('satellite')}
        >
          قمر صناعي
        </button>
      </div>
      
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%', borderRadius: '12px', zIndex: 1 }}
      >
        <MapViewUpdater center={position} zoom={zoom} />
        
        {/* Switch between street and satellite view */}
        {mapType === 'street' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        
        {/* Display markers */}
        {markersToShow.map((marker, index) => (
          <Marker 
            key={index} 
            position={[marker.lat, marker.lng]} 
            icon={homeIcon}
          >
            <Popup>
              <div className="map-popup">
                <strong>{marker.title}</strong>
                {marker.description && <p>{marker.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
