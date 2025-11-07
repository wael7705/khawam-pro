import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './GoogleMap.css'

const KHAMAM_COORDINATES = {
  lat: 33.509361,
  lng: 36.287889
}

const createMarkerIcon = () =>
  new L.Icon({
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

interface GoogleMapProps {
  title?: string
  description?: string
}

export default function GoogleMap({ title = 'موقع معرض خوام', description }: GoogleMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const markerIcon = useMemo(() => createMarkerIcon(), [])

  if (!isClient) {
    return <div className="map-placeholder">جاري تحميل الخريطة...</div>
  }

  return (
    <div className="google-map">
      <MapContainer center={KHAMAM_COORDINATES} zoom={15} scrollWheelZoom={false} className="google-map__canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={KHAMAM_COORDINATES} icon={markerIcon}>
          <Popup>
            <strong>{title}</strong>
            {description && <p>{description}</p>}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${KHAMAM_COORDINATES.lat},${KHAMAM_COORDINATES.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              فتح في خرائط جوجل
            </a>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

