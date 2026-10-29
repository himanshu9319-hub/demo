import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, HeartPulse, Hospital, LocateFixed, MapPin, Search, ShieldCheck, SkipForward, Stethoscope, Ticket, Pause, Play } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { HospitalCard } from '../HospitalCard'

const MapCanvas = lazy(() => import('../maps/MapCanvas'))

export function NearbyPage({ labels, city, citySelected, useLocation, search, setSearch, citySuggestions, setCity, setCityCenter, setCitySelected, setCitySuggestions, setLiveHospitals, setHospitalError, hospitals, hospitalLoading, hospitalError, bookHospital, onViewLocation, cityCenter }) {
  const [activeHospitalId, setActiveHospitalId] = useState('')
  const [mapError, setMapError] = useState('')
  const [mapRetry, setMapRetry] = useState(0)
  const [recentCities, setRecentCities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('queuefree-recent-cities') || '[]') } catch { return [] }
  })
  const chooseCity = suggestion => {
    setCity(suggestion.label)
    setCityCenter({ lat: suggestion.lat, lon: suggestion.lon })
    setCitySelected(true)
    setCitySuggestions([])
    setLiveHospitals([])
    setHospitalError('')
    const nextRecent = [suggestion, ...recentCities.filter(cityResult => cityResult.id !== suggestion.id)].slice(0, 5)
    setRecentCities(nextRecent)
    try { localStorage.setItem('queuefree-recent-cities', JSON.stringify(nextRecent)) } catch { /* Keep this session's recent choices available. */ }
  }
  const selectMapHospital = hospital => {
    setActiveHospitalId(hospital.id || hospital.name)
    document.getElementById('hospital-' + (hospital.id || hospital.name))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="content-section">
      <div className="page-heading">
        <div><div className="section-kicker">CARE AROUND YOU</div><h1>{labels.nearbyTitle}</h1><p>Type any city and search nearby hospitals, or use your location.</p></div>
        <button className="location-button" onClick={useLocation}><LocateFixed size={17} /> {labels.location}</button>
      </div>
      <div className="search-panel">
        <label className="search-field"><Search size={19} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search hospitals, areas or specialties" /><kbd>⌘ K</kbd></label>
        <label className="city-picker city-entry"><MapPin size={17} /><span><small>YOUR CITY — TYPE ANY CITY</small><input value={city} onChange={event => { setCity(event.target.value); setCitySelected(false); setLiveHospitals([]); setHospitalError('') }} placeholder="Enter a city" autoComplete="off" /></span></label>
      </div>
      <div className="city-suggestion-list">{citySuggestions.map(suggestion => (
        <button key={suggestion.id} onClick={() => chooseCity(suggestion)}><MapPin size={14} />{suggestion.label}</button>
      ))}</div>
      {!citySelected && !citySuggestions.length && recentCities.length > 0 && <div className="recent-city-searches"><small>RECENT CITIES</small>{recentCities.map(suggestion => <button key={suggestion.id} onClick={() => chooseCity(suggestion)}><MapPin size={12} />{suggestion.label}</button>)}</div>}
      <div className="results-head"><span><strong>{hospitals.length}</strong> hospitals near {city}</span><span className="open-now">OpenStreetMap results</span></div>
      <div className="nearby-map-layout">
        <div className="hospital-list">
          {hospitalLoading ? <div className="empty-state"><Hospital size={28} /><p>Finding hospitals near {city}…</p></div>
            : hospitals.length ? hospitals.map((hospital, index) => <HospitalCard key={hospital.id || hospital.name + index} hospital={hospital} onBook={bookHospital} onViewLocation={onViewLocation} onFocus={selectMapHospital} active={activeHospitalId === (hospital.id || hospital.name)} />)
              : <div className="empty-state"><Hospital size={28} /><h3>{hospitalError ? 'No listings found' : 'Search a city to find hospitals'}</h3><p>{hospitalError || 'Choose one of the full city suggestions above to load mapped hospital details here.'}</p></div>}
        </div>
        <aside className="nearby-map-card"><div className="nearby-map-title"><strong>Hospitals on map</strong><small>Choose a pin to highlight the hospital</small></div><Suspense fallback={<div className="map-loading">Loading map…</div>}><MapCanvas hospitals={hospitals} origin={cityCenter ? { lat: cityCenter.lat, lng: cityCenter.lon } : null} activeHospitalId={activeHospitalId} onSelectHospital={selectMapHospital} routeRequested={false} travelMode="car" onMapError={setMapError} retryKey={mapRetry} /></Suspense>{mapError && <div className="map-error"><span>{mapError}</span><button onClick={() => { setMapError(''); setMapRetry(value => value + 1) }}>Retry map</button></div>}</aside>
      </div>
      <div className="source-card"><MapPin size={15} /><span><strong>Hospital details shown here</strong><small>OpenStreetMap contributors · Listings may be incomplete or out of date.</small></span></div>
    </section>
  )
}
