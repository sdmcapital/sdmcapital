import { useEffect, useRef, useState } from 'react'

interface PropertyMapProps {
  address?: string
  lat?: number
  lng?: number
  comuna?: string
  region?: string
  pais?: string
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

declare global {
  interface Window {
    google: typeof google
    initMap: () => void
  }
}

export default function PropertyMap({ address, lat, lng, comuna, region, pais }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    if (!MAPS_KEY) { setError(true); return }
    if (window.google?.maps) { setLoaded(true); return }

    const existing = document.getElementById('google-maps-script')
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => setError(true)
    document.head.appendChild(script)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!loaded || !mapRef.current) return

    const defaultCenter = { lat: lat || -33.4489, lng: lng || -70.6693 }

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: lat ? 15 : 12,
      center: defaultCenter,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstance.current = map

    // Add draggable marker
    const marker = new window.google.maps.Marker({
      map,
      position: defaultCenter,
      draggable: false,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3DAA6E',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    })
    markerRef.current = marker

    // If no coords, geocode the address
    if (!lat && !lng) {
      // El país sale de la propiedad: «Chile» fijo mandaba «La Colmena, Paraguarí» al Maule.
      const searchAddress = address || `${comuna}, ${region}, ${pais || 'Chile'}`
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: searchAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const pos = results[0].geometry.location
          map.setCenter(pos)
          map.setZoom(address ? 15 : 12)
          marker.setPosition(pos)
        }
      })
    }

    // Add circle for approximate area
    new window.google.maps.Circle({
      map,
      center: defaultCenter,
      radius: 300,
      fillColor: '#3DAA6E',
      fillOpacity: 0.08,
      strokeColor: '#3DAA6E',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    })
  }, [loaded, lat, lng, address, comuna, region, pais])

  if (error) return null

  return (
    <div>
      <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
        Ubicación aproximada
      </div>
      <div ref={mapRef} style={{ width: '100%', height: 320, borderRadius: 2, overflow: 'hidden', background: '#f0f4f7' }} />
      <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
        La ubicación mostrada es referencial. Consulta al agente para la dirección exacta.
      </p>
    </div>
  )
}
