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

interface OrderMapProps {
  address: string
  customerName: string
  orderNumber: string
  onClose: () => void
}

// Component to change map view when address changes
function MapViewUpdater({ address }: { address: string }) {
  const map = useMap()
  
  useEffect(() => {
    if (address) {
      // Use Nominatim (OpenStreetMap geocoding) to get coordinates
      const encodedAddress = encodeURIComponent(address)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0]
            map.setView([parseFloat(lat), parseFloat(lon)], 15)
          }
        })
        .catch(err => {
          console.error('Geocoding error:', err)
        })
    }
  }, [address, map])
  
  return null
}

export default function OrderMap({ address, customerName, orderNumber, onClose }: OrderMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (address) {
      // Geocode address using Nominatim (OpenStreetMap)
      const encodedAddress = encodeURIComponent(address)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0]
            setPosition([parseFloat(lat), parseFloat(lon)])
          } else {
            // Default to Damascus if address not found
            setPosition([33.5138, 36.2765])
          }
          setLoading(false)
        })
        .catch(err => {
          console.error('Geocoding error:', err)
          // Default to Damascus on error
          setPosition([33.5138, 36.2765])
          setLoading(false)
        })
    } else {
      // Default to Damascus if no address
      setPosition([33.5138, 36.2765])
      setLoading(false)
    }
  }, [address])

  // Custom home icon for marker
  const homeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyAxMkwyIDEzbDMgM2MwIC41LjIgMSAuNiAxLjRoMTQuOGMuNCAwIC44LS41LjgtMXYtMkgzdjJ6bTAtOGguOFY0SDN2NHptMi4yIDBoMTMuNlYzSDVWNnptLTIuMiAxNGgxOFYxMUgzdjl6IiBmaWxsPSIjRUY0NDQ0Ii8+PC9zdmc+',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  if (loading || !position) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل الخريطة...</p>
      </div>
    )
  }

  return (
    <div className="leaflet-map-container">
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
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%', borderRadius: '12px', zIndex: 1 }}
      >
        <MapViewUpdater address={address} />
        
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
        
        <Marker position={position} icon={homeIcon}>
          <Popup>
            <div className="map-popup">
              <strong>{customerName}</strong>
              <p>{orderNumber}</p>
              <p>{address}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

