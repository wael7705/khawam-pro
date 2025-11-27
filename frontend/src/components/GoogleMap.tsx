import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './GoogleMap.css'

const COORDINATES: [number, number] = [33.509361, 36.287889] // 33°30'33.7"N 36°17'16.4"E
const [LAT, LNG] = COORDINATES as [number, number]

const MARKER_ICON = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface GoogleMapProps {
  title?: string
  description?: string
}

export default function GoogleMap({ title = 'خوام للطباعة والتصميم', description }: GoogleMapProps) {
  const [isClient, setIsClient] = useState(false)
  const markerIcon = useMemo(() => MARKER_ICON, [])
  const MapContainerAny = MapContainer as unknown as ComponentType<any>
  const TileLayerAny = TileLayer as unknown as ComponentType<any>
  const MarkerAny = Marker as unknown as ComponentType<any>

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className="map-placeholder">جاري تحميل الخريطة...</div>
  }

  return (
    <div className="google-map">
      <MapContainerAny center={COORDINATES} zoom={16} scrollWheelZoom={false} className="google-map__canvas">
        <TileLayerAny
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerAny position={COORDINATES} icon={markerIcon}>
          <Popup>
            <strong>{title}</strong>
            {description && <p>{description}</p>}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${LAT},${LNG}`}
              target="_blank"
              rel="noreferrer"
            >
              فتح في خرائط جوجل
            </a>
          </Popup>
        </MarkerAny>
      </MapContainerAny>
    </div>
  )
}
