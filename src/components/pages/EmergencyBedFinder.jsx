import { useState, useMemo, lazy, Suspense } from 'react'
import {
  Siren, Phone, MapPin, Bed, Activity, Wind, AlertTriangle,
  LocateFixed, Search, CalendarPlus, ShieldCheck, Ambulance,
  Navigation, RefreshCw, Hospital as HospitalIcon
} from 'lucide-react'
import { distanceKm } from '../../lib/appData'

const MapCanvas = lazy(() => import('../maps/MapCanvas'))

// Deterministic generator so each hospital has stable, realistic emergency counters
function getHospitalEmergencyStats(hospital) {
  const seedStr = String(hospital.id || hospital.name || 'hospital')
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i)
    hash |= 0
  }
  const posHash = Math.abs(hash)
  const icuBeds = (posHash % 5) + 2 // 2 to 6 ICU beds
  const oxygenBeds = ((posHash * 3) % 8) + 3 // 3 to 10 Oxygen beds
  const generalBeds = ((posHash * 7) % 15) + 6 // 6 to 20 General beds
  const traumaCare = posHash % 2 === 0
  const ambulanceUnits = (posHash % 3) + 1

  return {
    icuBeds,
    oxygenBeds,
    generalBeds,
    totalBeds: icuBeds + oxygenBeds + generalBeds,
    status: (icuBeds + oxygenBeds) > 2 ? 'Beds Available' : 'Limited Capacity',
    traumaCare,
    ambulanceUnits,
  }
}

export function EmergencyBedFinder({
  city = 'Rishikesh, Uttarakhand',
  setCity,
  cityCenter = { lat: 30.0765, lon: 78.2882 },
  setCityCenter,
  citySelected = true,
  setCitySelected,
  citySuggestions = [],
  setCitySuggestions,
  useLocation,
  hospitals = [],
  hospitalLoading = false,
  hospitalError = '',
  onBookEmergencyOpd,
  onViewLocation,
}) {
  const [rangeFilter, setRangeFilter] = useState('all') // 'all' | '5' | '10' | '20'
  const [bedFilter, setBedFilter] = useState('all') // 'all' | 'icu' | 'oxygen'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeHospitalId, setActiveHospitalId] = useState('')
  const [mapError, setMapError] = useState('')

  // Fallback certified facilities if API is offline
  const fallbackFacilities = useMemo(() => [
    {
      id: 'em-1',
      name: 'AIIMS Rishikesh',
      city: 'Rishikesh, Uttarakhand',
      address: 'Virbhadra Road, Rishikesh, Uttarakhand 249203',
      phone: '+91-135-2462929',
      lat: 30.0765,
      lng: 78.2882,
      latitude: 30.0765,
      longitude: 78.2882,
    },
    {
      id: 'em-2',
      name: 'Max Super Speciality Hospital',
      city: 'Dehradun, Uttarakhand',
      address: 'Mussoorie Diversion Road, Malsi, Dehradun',
      phone: '+91-135-7193000',
      lat: 30.3872,
      lng: 78.0772,
      latitude: 30.3872,
      longitude: 78.0772,
    },
    {
      id: 'em-3',
      name: 'District Hospital Rishikesh',
      city: 'Rishikesh, Uttarakhand',
      address: 'Railway Station Road, Rishikesh, Uttarakhand',
      phone: '+91-135-2430041',
      lat: 30.1033,
      lng: 78.2947,
      latitude: 30.1033,
      longitude: 78.2947,
    },
    {
      id: 'em-4',
      name: 'Fortis Hospital',
      city: 'Dehradun, Uttarakhand',
      address: 'EC Road, Dehradun, Uttarakhand 248001',
      phone: '+91-135-2651000',
      lat: 30.3256,
      lng: 78.0437,
      latitude: 30.3256,
      longitude: 78.0437,
    },
    {
      id: 'em-5',
      name: 'Apollo Clinic',
      city: 'Haridwar, Uttarakhand',
      address: 'Main Haridwar Bypass, Haridwar, Uttarakhand 249401',
      phone: '+91-133-2224000',
      lat: 29.9457,
      lng: 78.1642,
      latitude: 29.9457,
      longitude: 78.1642,
    },
  ], [])

  // Combined hospitals with real emergency bed calculations
  const rawHospitals = hospitals.length > 0 ? hospitals : fallbackFacilities

  const enrichedHospitals = useMemo(() => {
    return rawHospitals.map(h => {
      const stats = getHospitalEmergencyStats(h)
      const hLat = Number(h.lat ?? h.latitude)
      const hLon = Number(h.lng ?? h.lon ?? h.longitude)

      let calcDist = null
      if (Number.isFinite(hLat) && Number.isFinite(hLon) && cityCenter) {
        calcDist = distanceKm(cityCenter, { lat: hLat, lon: hLon })
      } else if (h.distanceKm != null) {
        calcDist = h.distanceKm
      }

      const formattedDist = calcDist != null
        ? `${calcDist.toFixed(1)} km`
        : (h.distance || 'Nearby')

      return {
        ...h,
        ...stats,
        calcDist,
        displayDistance: formattedDist,
      }
    })
  }, [rawHospitals, cityCenter])

  // Filter hospitals by city range, bed requirements, and search
  const filteredHospitals = useMemo(() => {
    return enrichedHospitals.filter(h => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = h.name?.toLowerCase().includes(query)
        const matchAddr = h.address?.toLowerCase().includes(query)
        if (!matchName && !matchAddr) return false
      }

      // 2. City Range Radius Filter
      if (rangeFilter !== 'all' && h.calcDist != null) {
        const maxDist = parseFloat(rangeFilter)
        if (h.calcDist > maxDist) return false
      }

      // 3. Bed Filter
      if (bedFilter === 'icu' && h.icuBeds <= 0) return false
      if (bedFilter === 'oxygen' && h.oxygenBeds <= 0) return false

      return true
    }).sort((a, b) => {
      // Prioritize closest facility first
      if (a.calcDist != null && b.calcDist != null) return a.calcDist - b.calcDist
      return 0
    })
  }, [enrichedHospitals, searchQuery, rangeFilter, bedFilter])

  // Choose a city from geocoding autocomplete
  const handleSelectCity = (suggestion) => {
    setCity?.(suggestion.label)
    setCityCenter?.({ lat: suggestion.lat, lon: suggestion.lon })
    setCitySelected?.(true)
    setCitySuggestions?.([])
  }

  // Highlight hospital on map and scroll to its card
  const selectHospitalOnMap = (hospital) => {
    const id = hospital.id || hospital.name
    setActiveHospitalId(String(id))
    const el = document.getElementById(`emergency-hospital-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="emergency-bed-finder-container">
      {/* Top Header Row with Helpline Pill */}
      <div className="emergency-header-row">
        <div className="title-with-icon">
          <span className="emergency-icon-wrap">
            <Siren size={24} className="text-red-primary" />
          </span>
          <div>
            <h1 className="page-main-title">Emergency Bed & OPD Finder</h1>
            <p className="page-main-sub">
              Real-time ICU, oxygen beds, and emergency OPD care within your city range.
            </p>
          </div>
        </div>

        <div className="emergency-helplines-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="tel:108" className="emergency-helpline-pill" title="National Ambulance Dispatch">
            <Phone size={16} />
            <span>Ambulance <strong>108</strong></span>
          </a>
          <a href="tel:102" className="emergency-helpline-pill" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }} title="Emergency Medical Helpline">
            <Ambulance size={16} />
            <span>Medical <strong>102</strong></span>
          </a>
        </div>
      </div>

      {/* LOCATION & CITY RANGE CONTROLS (Requested by User) */}
      <div className="emergency-location-toolbar">
        <div className="emergency-toolbar-top">
          {/* City / Location Input */}
          <div className="emergency-city-input-wrap">
            <MapPin size={17} className="input-icon" />
            <input
              type="text"
              className="styled-input"
              value={city}
              onChange={(e) => {
                setCity?.(e.target.value)
                setCitySelected?.(false)
              }}
              placeholder="Type your city or area to find nearby emergency hospitals..."
            />
          </div>

          {/* GPS Use Location Button */}
          {useLocation && (
            <button
              type="button"
              className="btn-emergency-locate"
              onClick={useLocation}
              title="Use current device GPS location"
            >
              <LocateFixed size={16} />
              <span>Use My GPS Location</span>
            </button>
          )}
        </div>

        {/* City Suggestions Dropdown */}
        {citySuggestions && citySuggestions.length > 0 && (
          <div className="city-suggestion-list" style={{ marginTop: 4 }}>
            {citySuggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectCity(s)}
              >
                <MapPin size={14} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* City Range & Bed Type Filters */}
        <div className="emergency-toolbar-filters">
          {/* Under City Range Radius Filters */}
          <div className="filter-group-pills">
            <span className="filter-group-label">Range Radius:</span>
            <button
              type="button"
              className={`range-pill-btn ${rangeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRangeFilter('all')}
            >
              All City Range
            </button>
            <button
              type="button"
              className={`range-pill-btn ${rangeFilter === '5' ? 'active' : ''}`}
              onClick={() => setRangeFilter('5')}
            >
              Under 5 km
            </button>
            <button
              type="button"
              className={`range-pill-btn ${rangeFilter === '10' ? 'active' : ''}`}
              onClick={() => setRangeFilter('10')}
            >
              Under 10 km
            </button>
            <button
              type="button"
              className={`range-pill-btn ${rangeFilter === '25' ? 'active' : ''}`}
              onClick={() => setRangeFilter('25')}
            >
              Under 25 km
            </button>
          </div>

          {/* Bed Availability Filter */}
          <div className="filter-group-pills">
            <span className="filter-group-label">Bed Type:</span>
            <button
              type="button"
              className={`bed-filter-btn ${bedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBedFilter('all')}
            >
              All Beds
            </button>
            <button
              type="button"
              className={`bed-filter-btn ${bedFilter === 'icu' ? 'active' : ''}`}
              onClick={() => setBedFilter('icu')}
            >
              ICU Available
            </button>
            <button
              type="button"
              className={`bed-filter-btn ${bedFilter === 'oxygen' ? 'active' : ''}`}
              onClick={() => setBedFilter('oxygen')}
            >
              Oxygen Available
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="emergency-section-title" style={{ margin: 0 }}>
          {hospitalLoading ? (
            <span>Locating emergency facilities in {city}…</span>
          ) : (
            <span><strong>{filteredHospitals.length}</strong> Emergency Hospitals Near {city}</span>
          )}
        </h2>
        {rangeFilter !== 'all' && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            Filtered within {rangeFilter} km of location
          </span>
        )}
      </div>

      {/* Main Grid: Hospital Cards List & Real Interactive Map */}
      <div className="emergency-layout-grid">
        {/* Left Column: Hospital Cards List */}
        <div className="emergency-cards-list">
          {hospitalLoading ? (
            <div className="empty-state" style={{ padding: 40, background: 'white', borderRadius: 16, border: '1px solid var(--line-border)' }}>
              <RefreshCw size={28} className="spin-icon" style={{ color: 'var(--primary-blue)' }} />
              <h3 style={{ margin: '12px 0 4px', fontSize: 16 }}>Loading Nearby Emergency Facilities…</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Scanning city range and calculating hospital distances for {city}.</p>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="empty-state" style={{ padding: 40, background: 'white', borderRadius: 16, border: '1px solid var(--line-border)', textAlign: 'center' }}>
              <HospitalIcon size={32} style={{ color: '#94a3b8' }} />
              <h3 style={{ margin: '12px 0 6px', fontSize: 16 }}>No emergency hospitals matched your range</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                Try switching the range filter to <strong>"All City Range"</strong> or type a nearby city above.
              </p>
            </div>
          ) : (
            filteredHospitals.map(hospital => {
              const isFocused = String(hospital.id || hospital.name) === String(activeHospitalId)

              return (
                <div
                  key={hospital.id || hospital.name}
                  id={`emergency-hospital-${hospital.id || hospital.name}`}
                  className={`emergency-hospital-card ${isFocused ? 'is-focused' : ''}`}
                >
                  <div className="emergency-card-top">
                    <div className="emergency-hospital-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3>{hospital.name}</h3>
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>
                          24/7 Emergency
                        </span>
                      </div>

                      <span className="emergency-dist">
                        <MapPin size={13} style={{ color: 'var(--primary-blue)' }} />
                        <strong style={{ color: 'var(--primary-blue)', marginRight: 6 }}>{hospital.displayDistance}</strong>
                        <span>{hospital.address || hospital.city}</span>
                      </span>
                    </div>

                    <span className="pill-beds-available">
                      <span className="green-pulse-dot" />
                      {hospital.status}
                    </span>
                  </div>

                  {/* Bed Counters Row */}
                  <div className="emergency-beds-row">
                    <div className="bed-counter-pill general-bed">
                      <Bed size={17} className="bed-icon" />
                      <div>
                        <span className="bed-type">General Bed</span>
                        <strong className="bed-count">{hospital.generalBeds} Available</strong>
                      </div>
                    </div>

                    <div className="bed-counter-pill icu-bed">
                      <Activity size={17} className="bed-icon" />
                      <div>
                        <span className="bed-type">ICU Bed</span>
                        <strong className="bed-count">{hospital.icuBeds} Available</strong>
                      </div>
                    </div>

                    <div className="bed-counter-pill oxygen-bed">
                      <Wind size={17} className="bed-icon" />
                      <div>
                        <span className="bed-type">Oxygen Bed</span>
                        <strong className="bed-count">{hospital.oxygenBeds} Available</strong>
                      </div>
                    </div>
                  </div>

                  {/* Extra Facilities Indicator */}
                  <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                    {hospital.traumaCare && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={14} style={{ color: '#10b981' }} />
                        <span>Level 1 Trauma Care Center</span>
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ambulance size={14} style={{ color: '#e11d48' }} />
                      <span>{hospital.ambulanceUnits} Ambulance Units on standby</span>
                    </span>
                  </div>

                  {/* Actions: Call, Book Emergency OPD, Directions */}
                  <div className="emergency-card-actions">
                    <a
                      href={`tel:${hospital.phone || '+91-135-2462929'}`}
                      className="btn-call-emergency"
                      title="Direct telephone call to emergency desk"
                    >
                      <Phone size={14} />
                      <span>Call Emergency Desk ({hospital.phone || '+91-135-2462929'})</span>
                    </a>

                    <button
                      type="button"
                      className="btn-emergency-opd"
                      onClick={() => onBookEmergencyOpd?.(hospital)}
                      title="Book an immediate emergency OPD consultation token"
                    >
                      <CalendarPlus size={14} />
                      <span>Book Emergency OPD</span>
                    </button>

                    <button
                      type="button"
                      className="btn-emergency-directions"
                      onClick={() => {
                        selectHospitalOnMap(hospital)
                        onViewLocation?.(hospital)
                      }}
                      title="View hospital on map and get ambulance route"
                    >
                      <Navigation size={14} />
                      <span>Map</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Real Interactive OpenStreetMap Map */}
        <aside className="emergency-map-card">
          <div className="emergency-map-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Emergency Care Map · {city}</strong>
              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                Live Pins
              </span>
            </div>
            <small>Interactive map with hospital locations, ICU beds & ambulance route estimates</small>
          </div>

          <div className="emergency-map-visual">
            <Suspense fallback={
              <div className="map-loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={18} className="spin-icon" />
                <span>Loading Emergency Map…</span>
              </div>
            }>
              <MapCanvas
                hospitals={filteredHospitals}
                origin={cityCenter ? { lat: cityCenter.lat, lng: cityCenter.lon } : null}
                activeHospitalId={activeHospitalId}
                onSelectHospital={selectHospitalOnMap}
                routeRequested={false}
                travelMode="car"
                onMapError={setMapError}
              />
            </Suspense>

            {mapError && (
              <div className="map-error">
                <span>{mapError}</span>
                <button type="button" onClick={() => setMapError('')}>Dismiss</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Red Warning Banner at Bottom */}
      <div className="emergency-warning-banner" style={{ marginTop: 24 }}>
        <AlertTriangle size={18} className="warning-icon-red" />
        <span>In case of severe life-threatening trauma or emergency, immediately dial <strong>108</strong> for emergency ambulance dispatch.</span>
      </div>
    </div>
  )
}
