import { useEffect, useRef, useState } from 'react'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const USE_GOOGLE_MAPS = Boolean(GOOGLE_KEY) && import.meta.env.VITE_MAPS_PROVIDER !== 'osm'

function hospitalPoint(hospital) {
  const lat = Number(hospital?.lat ?? hospital?.latitude)
  const lng = Number(hospital?.lng ?? hospital?.lon ?? hospital?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (window.__leafletLoader) return window.__leafletLoader

  window.__leafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.dataset.leafletCss = 'true'
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const clusterCss = document.createElement('link')
      clusterCss.rel = 'stylesheet'
      clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'
      document.head.appendChild(clusterCss)
      const clusterDefaults = document.createElement('link')
      clusterDefaults.rel = 'stylesheet'
      clusterDefaults.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
      document.head.appendChild(clusterDefaults)
      const clusterScript = document.createElement('script')
      clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
      clusterScript.onload = () => resolve(window.L)
      clusterScript.onerror = () => resolve(window.L)
      document.head.appendChild(clusterScript)
      window.setTimeout(() => resolve(window.L), 2500)
    }
    script.onerror = () => reject(new Error('The OpenStreetMap library could not load. Check your connection and retry.'))
    document.head.appendChild(script)
  })
  return window.__leafletLoader
}

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (window.__googleMapsLoader) return window.__googleMapsLoader

  window.__googleMapsLoader = new Promise((resolve, reject) => {
    const callbackName = '__queueFreeGoogleMapsReady'
    window[callbackName] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GOOGLE_KEY) + '&callback=' + callbackName
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Google Maps could not load. Check the API key and billing settings.'))
    document.head.appendChild(script)
  })
  return window.__googleMapsLoader
}

async function getDirections(origin, destination, mode) {
  if (USE_GOOGLE_MAPS && window.google?.maps) {
    const travelMode = { car: 'DRIVING', bike: 'BICYCLING', walk: 'WALKING', transit: 'TRANSIT' }[mode]
    return new Promise((resolve, reject) => {
      new window.google.maps.DirectionsService().route({
        origin, destination,
        travelMode: window.google.maps.TravelMode[travelMode],
      }, (result, status) => {
        if (status !== 'OK' || !result?.routes?.[0]?.legs?.[0]) return reject(new Error('A route is not available for this travel mode.'))
        const leg = result.routes[0].legs[0]
        resolve({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          steps: (leg.steps || []).map(step => step.instructions.replace(/<[^>]*>/g, '')),
          googleResult: result,
        })
      })
    })
  }

  // OSRM provides car, bicycle and walking profiles. Transit has no public
  // OSRM profile, so use the car route as an explicitly labelled estimate.
  const profile = { car: 'driving', bike: 'cycling', walk: 'foot', transit: 'driving' }[mode]
  const url = 'https://router.project-osrm.org/route/v1/' + profile + '/'
    + origin.lng + ',' + origin.lat + ';' + destination.lng + ',' + destination.lat
    + '?overview=full&steps=true&geometries=geojson'
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not calculate a route. Please retry.')
  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('No route was found from your location.')
  let seconds = route.duration
  if (mode === 'transit') seconds = Math.round(seconds * 1.35)
  return {
    distance: (route.distance / 1000).toFixed(1) + ' km',
    duration: Math.max(1, Math.round(seconds / 60)) + ' min' + (mode === 'transit' ? ' (estimate)' : ''),
    steps: route.legs?.[0]?.steps?.map(step => step.name
      ? step.maneuver.type.replaceAll('_', ' ') + ' onto ' + step.name
      : step.maneuver.type.replaceAll('_', ' ')) || [],
    geometry: route.geometry,
  }
}

export default function MapCanvas({ hospitals = [], origin, activeHospitalId, onSelectHospital, routeRequested, travelMode, onRouteResult, onMapError, retryKey = 0, routeKey = 0 }) {
  const mapElement = useRef(null)
  const mapInstance = useRef(null)
  const markerLayer = useRef(null)
  const routeLayer = useRef(null)
  const directionsRenderer = useRef(null)
  const googleMarkers = useRef([])
  const [provider, setProvider] = useState('')
  const activeHospital = hospitals.find(h => String(h.id || h.name) === String(activeHospitalId)) || hospitals[0]
  const destination = hospitalPoint(activeHospital)

  useEffect(() => {
    let cancelled = false
    let map
    const center = destination || origin || { lat: 20.5937, lng: 78.9629 }

    async function initialize() {
      try {
        if (!mapElement.current) return
        if (USE_GOOGLE_MAPS) {
          const google = await loadGoogleMaps()
          if (cancelled) return
          map = new google.Map(mapElement.current, { center, zoom: hospitals.length > 1 ? 11 : 15, mapTypeControl: false, streetViewControl: false, fullscreenControl: true })
          directionsRenderer.current = new google.DirectionsRenderer({ map, suppressMarkers: false })
          setProvider('google')
          mapInstance.current = map
          return
        }

        const L = await loadLeaflet()
        if (cancelled) return
        const validPoints = hospitals.map(hospital => ({ hospital, point: hospitalPoint(hospital) })).filter(item => item.point)
        map = L.map(mapElement.current, { scrollWheelZoom: false }).setView([center.lat, center.lng], hospitals.length > 1 ? 11 : 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)
        markerLayer.current = L.markerClusterGroup ? L.markerClusterGroup({ chunkedLoading: true }).addTo(map) : L.layerGroup().addTo(map)
        routeLayer.current = L.layerGroup().addTo(map)
        validPoints.forEach(({ hospital, point }) => {
          const marker = L.marker([point.lat, point.lng]).bindPopup('<strong>' + hospital.name.replace(/[<>]/g, '') + '</strong>')
          marker.on('click', () => onSelectHospital?.(hospital))
          marker.addTo(markerLayer.current)
        })
        if (validPoints.length > 1) map.fitBounds(L.latLngBounds(validPoints.map(({ point }) => [point.lat, point.lng])).pad(0.12))
        setProvider('osm')
        mapInstance.current = map
      } catch (error) {
        onMapError?.(error.message || 'The map could not load.')
      }
    }
    initialize()
    return () => {
      cancelled = true
      if (map && !USE_GOOGLE_MAPS) map.remove()
      mapInstance.current = null
    }
  }, [retryKey])

  useEffect(() => {
    if (!provider || !mapInstance.current) return
    if (provider === 'google') {
      const google = window.google.maps
      googleMarkers.current.forEach(marker => marker.setMap(null))
      googleMarkers.current = hospitals.map(hospital => {
        const point = hospitalPoint(hospital)
        if (!point) return null
        const isActive = String(hospital.id || hospital.name) === String(activeHospitalId)
        const marker = new google.Marker({ map: mapInstance.current, position: point, title: hospital.name, label: String(hospital.name).slice(0, 1), animation: isActive ? google.Animation.BOUNCE : null })
        marker.addListener('click', () => onSelectHospital?.(hospital))
        return marker
      }).filter(Boolean)
      if (origin?.lat != null && origin?.lng != null) {
        googleMarkers.current.push(new google.Marker({ map: mapInstance.current, position: origin, title: 'Your selected location', icon: { path: google.SymbolPath.CIRCLE, scale: 7, fillColor: '#2472e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } }))
      }
      return
    }
    const L = window.L
    markerLayer.current?.clearLayers()
    const validPoints = hospitals.map(hospital => ({ hospital, point: hospitalPoint(hospital) })).filter(item => item.point)
    validPoints.forEach(({ hospital, point }) => {
      const marker = L.marker([point.lat, point.lng]).bindPopup('<strong>' + hospital.name.replace(/[<>]/g, '') + '</strong>')
      marker.on('click', () => onSelectHospital?.(hospital))
      marker.addTo(markerLayer.current)
      if (String(hospital.id || hospital.name) === String(activeHospitalId)) marker.openPopup()
    })
    if (origin?.lat != null && origin?.lng != null) {
      L.circleMarker([origin.lat, origin.lng], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#2472e8', fillOpacity: 1 }).bindPopup('Your selected location').addTo(markerLayer.current)
    }
    if (validPoints.length > 1) mapInstance.current.fitBounds(L.latLngBounds(validPoints.map(({ point }) => [point.lat, point.lng])).pad(0.12))
    else if (destination) mapInstance.current.setView([destination.lat, destination.lng], 15)
  }, [provider, hospitals, activeHospitalId, onSelectHospital, origin?.lat, origin?.lng, retryKey])

  useEffect(() => {
    if (!routeRequested || !provider || !origin || !destination) return
    let cancelled = false
    getDirections(origin, destination, travelMode).then(result => {
      if (cancelled) return
      if (provider === 'google' && result.googleResult) directionsRenderer.current?.setDirections(result.googleResult)
      if (provider === 'osm' && result.geometry) {
        const L = window.L
        routeLayer.current?.clearLayers()
        L.geoJSON(result.geometry, { style: { color: '#0b9f91', weight: 5, opacity: 0.9 } }).addTo(routeLayer.current)
        mapInstance.current.fitBounds(routeLayer.current.getBounds().pad(0.15))
      }
      onRouteResult?.(result)
    }).catch(error => { if (!cancelled) onMapError?.(error.message) })
    return () => { cancelled = true }
  }, [routeRequested, provider, origin?.lat, origin?.lng, destination?.lat, destination?.lng, travelMode, routeKey, retryKey])

  return <div className="map-canvas" ref={mapElement} role="application" aria-label="Hospital location map" />
}
