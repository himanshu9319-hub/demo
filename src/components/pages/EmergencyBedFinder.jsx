import { Siren, Phone, MapPin, Bed, Activity, Wind, AlertTriangle, ExternalLink } from 'lucide-react'

export function EmergencyBedFinder({ onViewLocation }) {
  const emergencyHospitals = [
    {
      id: 'em-1',
      name: 'AIIMS Rishikesh',
      distance: '2.1 km',
      address: 'Virbhadra Road, Rishikesh, Uttarakhand 249203',
      phone: '+91-135-2462929',
      generalBeds: 12,
      icuBeds: 4,
      oxygenBeds: 6,
      status: 'Beds Available',
      lat: 30.0765,
      lng: 78.2882,
    },
    {
      id: 'em-2',
      name: 'Max Super Speciality Hospital',
      distance: '3.5 km',
      address: 'Mussoorie Diversion Road, Malsi, Dehradun',
      phone: '+91-135-7193000',
      generalBeds: 8,
      icuBeds: 2,
      oxygenBeds: 5,
      status: 'Beds Available',
      lat: 30.3872,
      lng: 78.0772,
    },
    {
      id: 'em-3',
      name: 'District Hospital Rishikesh',
      distance: '4.2 km',
      address: 'Railway Station Road, Rishikesh',
      phone: '+91-135-2430041',
      generalBeds: 15,
      icuBeds: 1,
      oxygenBeds: 4,
      status: 'Beds Available',
      lat: 30.1033,
      lng: 78.2947,
    },
  ]

  return (
    <div className="emergency-bed-finder-container">
      {/* Top Header Row with Helpline Pill */}
      <div className="emergency-header-row">
        <div className="title-with-icon">
          <span className="emergency-icon-wrap">
            <Siren size={24} className="text-red-primary" />
          </span>
          <div>
            <h1 className="page-main-title">Emergency Bed Finder</h1>
            <p className="page-main-sub">Real-time emergency, ICU, and oxygen bed availability near you.</p>
          </div>
        </div>

        <a href="tel:108" className="emergency-helpline-pill">
          <Phone size={16} />
          <span>Emergency Helpline <strong>108</strong></span>
        </a>
      </div>

      <h2 className="emergency-section-title">Nearby Emergency Hospitals</h2>

      {/* Grid: Hospital Cards & Mini Map Preview */}
      <div className="emergency-layout-grid">
        {/* Hospital Cards List */}
        <div className="emergency-cards-list">
          {emergencyHospitals.map(hospital => (
            <div key={hospital.id} className="emergency-hospital-card">
              <div className="emergency-card-top">
                <div className="emergency-hospital-info">
                  <h3>{hospital.name}</h3>
                  <span className="emergency-dist">
                    <MapPin size={13} />
                    {hospital.address}
                  </span>
                </div>
                <span className="pill-beds-available">
                  <span className="green-pulse-dot" />
                  {hospital.status}
                </span>
              </div>

              {/* Bed Counters Row (Panel 6 of Mockup!) */}
              <div className="emergency-beds-row">
                <div className="bed-counter-pill general-bed">
                  <Bed size={16} className="bed-icon" />
                  <div>
                    <span className="bed-type">General Bed</span>
                    <strong className="bed-count">{hospital.generalBeds} Available</strong>
                  </div>
                </div>

                <div className="bed-counter-pill icu-bed">
                  <Activity size={16} className="bed-icon" />
                  <div>
                    <span className="bed-type">ICU Bed</span>
                    <strong className="bed-count">{hospital.icuBeds} Available</strong>
                  </div>
                </div>

                <div className="bed-counter-pill oxygen-bed">
                  <Wind size={16} className="bed-icon" />
                  <div>
                    <span className="bed-type">Oxygen Bed</span>
                    <strong className="bed-count">{hospital.oxygenBeds} Available</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="emergency-card-actions">
                <a href={`tel:${hospital.phone}`} className="btn-call-emergency">
                  <Phone size={14} />
                  <span>Call Emergency Desk ({hospital.phone})</span>
                </a>

                <button
                  type="button"
                  className="btn-emergency-directions"
                  onClick={() => onViewLocation?.(hospital)}
                >
                  <MapPin size={14} />
                  <span>Directions</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Mini Map Card */}
        <aside className="emergency-map-card">
          <div className="emergency-map-header">
            <strong>Emergency Care Map</strong>
            <small>Live ambulance route estimates</small>
          </div>

          <div className="emergency-map-visual">
            <div className="simulated-map-overlay">
              <div className="map-hospital-pin pin-1">
                <div className="pin-tooltip">
                  <strong>AIIMS Rishikesh</strong>
                  <small>4 ICU · 6 Oxygen</small>
                </div>
                <span className="pin-pulse-ring" />
                <span className="pin-dot red-pin" />
              </div>

              <div className="map-hospital-pin pin-2">
                <span className="pin-dot red-pin" />
              </div>

              <div className="user-location-pulse">
                <span className="user-dot-blue" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Red Warning Banner at Bottom (Panel 6 of Mockup!) */}
      <div className="emergency-warning-banner">
        <AlertTriangle size={18} className="warning-icon-red" />
        <span>In case of critical life-threatening emergency, immediately call <strong>108</strong> for ambulance dispatch.</span>
      </div>
    </div>
  )
}
