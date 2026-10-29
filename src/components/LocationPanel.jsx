import { lazy, Suspense, useState } from 'react'
import { ArrowLeft, Car, Check, Clock3, MapPin, Navigation, Phone, Share2, X } from 'lucide-react'

const MapCanvas = lazy(() => import('./maps/MapCanvas'))

const modes = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'bike', label: 'Bike', icon: Navigation },
  { id: 'walk', label: 'Walk', icon: MapPin },
  { id: 'transit', label: 'Transit', icon: Clock3 },
]

function coordinates(hospital) {
  const lat = Number(hospital?.lat ?? hospital?.latitude)
  const lng = Number(hospital?.lng ?? hospital?.lon ?? hospital?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export function LocationPanel({ hospital, origin, onClose, onSelect, liveQueueLength = 0 }) {
  const [mode, setMode] = useState('car')
  const [routeRequested, setRouteRequested] = useState(false)
  const [route, setRoute] = useState(null)
  const [mapError, setMapError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [routeKey, setRouteKey] = useState(0)
  if (!hospital) return null

  const point = coordinates(hospital)
  const address = hospital.address || [hospital.area, hospital.city, hospital.state, hospital.pincode || hospital.postcode].filter(Boolean).join(', ')
  const mapUrl = point
    ? 'https://www.google.com/maps/search/?api=1&query=' + point.lat + ',' + point.lng
    : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([hospital.name, address].filter(Boolean).join(', '))
  const directionsUrl = point
    ? 'https://www.google.com/maps/dir/?api=1&destination=' + point.lat + ',' + point.lng + '&travelmode=driving'
    : mapUrl
  const shareUrl = 'https://wa.me/?text=' + encodeURIComponent(hospital.name + (address ? ' — ' + address : '') + ' ' + mapUrl)
  const originPoint = origin ? { lat: Number(origin.lat), lng: Number(origin.lng ?? origin.lon) } : null
  const phone = hospital.phone || hospital.telephone
  const openingHours = hospital.openingHours || hospital.hours || hospital.opening_hours

  return (
    <div className="location-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="location-panel" role="dialog" aria-modal="true" aria-labelledby="location-title">
        <header className="location-panel-header">
          <button className="location-back" onClick={onClose} aria-label="Back to hospital list"><ArrowLeft size={18} /></button>
          <div><span className="section-kicker">HOSPITAL LOCATION</span><h2 id="location-title">{hospital.name}</h2></div>
          <button className="modal-close" onClick={onClose} aria-label="Close location"><X size={18} /></button>
        </header>
        <div className="location-panel-content">
          <div className="location-map-wrap">
            {point ? (
              <Suspense fallback={<div className="map-loading"><span className="loader-dot" /> Loading map…</div>}>
                <MapCanvas hospitals={[hospital]} origin={originPoint} activeHospitalId={hospital.id || hospital.name} routeRequested={routeRequested} travelMode={mode} onRouteResult={setRoute} onMapError={setMapError} retryKey={retryKey} routeKey={routeKey} />
              </Suspense>
            ) : <div className="map-unavailable"><MapPin size={24} /><strong>Location unavailable for this hospital</strong><span>{address || 'The hospital listing does not include a map coordinate.'}</span></div>}
            {mapError && <div className="map-error"><span>{mapError}</span><button onClick={() => { setMapError(''); setRetryKey(key => key + 1); if (routeRequested) setRouteKey(key => key + 1) }}>Retry</button></div>}
          </div>
          <div className="location-info">
            <div className="location-facts">
              <p><MapPin size={16} /><span><strong>Address</strong>{address || 'Address unavailable'}</span></p>
              {phone && <p><Phone size={16} /><span><strong>Phone</strong><a href={'tel:' + phone}>{phone}</a></span></p>}
              {openingHours && <p><Clock3 size={16} /><span><strong>Opening hours</strong>{openingHours}</span></p>}
              {hospital.rating && <p><span className="location-fact-icon">★</span><span><strong>Rating</strong>{hospital.rating}</span></p>}
              <p><Check size={16} /><span><strong>Live queue</strong>{liveQueueLength} patients waiting</span></p>
              {hospital.distance && <p><Navigation size={16} /><span><strong>Distance</strong>{hospital.distance}</span></p>}
              {hospital.emergency24x7 && <p><span className="location-fact-icon">+</span><span><strong>Emergency</strong>24/7 service listed</span></p>}
            </div>
            <div className="directions-controls">
              <div className="directions-title"><div><strong>Directions</strong><small>{route ? route.distance + ' · ' + route.duration : 'From your selected city or current location'}</small></div><button className="primary-btn route-button" onClick={() => { setRoute(null); setMapError(''); setRouteRequested(true); setRouteKey(key => key + 1) }} disabled={!point || !originPoint}>Get directions <Navigation size={15} /></button></div>
              <div className="travel-modes" aria-label="Travel mode">{modes.map(({ id, label, icon: ModeIcon }) => <button key={id} className={mode === id ? 'selected' : ''} onClick={() => { setMode(id); setRoute(null); if (routeRequested) setRouteRequested(true) }}><ModeIcon size={15} />{label}</button>)}</div>
              {!originPoint && <small className="route-note">Choose a city or share your location to calculate a route.</small>}
              {mode === 'transit' && (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAPS_PROVIDER === 'osm') && <small className="route-note">Transit uses an approximate fallback estimate; public routing does not provide transit turn-by-turn data.</small>}
              {route?.steps?.length > 0 && <ol className="route-steps">{route.steps.slice(0, 8).map((step, index) => <li key={index}>{step}</li>)}</ol>}
            </div>
            <div className="location-actions">
              <a className="secondary-staff" href={directionsUrl} target="_blank" rel="noreferrer">Open in Google Maps <Navigation size={15} /></a>
              <a className="secondary-staff" href={shareUrl} target="_blank" rel="noreferrer"><Share2 size={15} /> Share on WhatsApp</a>
              {onSelect && <button className="primary-btn select-hospital" onClick={() => onSelect(hospital)}>Select this hospital <Check size={16} /></button>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

