import {
  Calendar, Users, Clock, Building2, ArrowRight, MapPin, Siren, Heart,
  CheckCircle2, Sparkles
} from 'lucide-react'

export function PatientHomeDashboard({
  onNavigate,
  bookings = [],
  hospitalsCount = 12,
  activeToken = null,
}) {
  const activeBooking = bookings.find(b => ['waiting', 'serving', 'arrived'].includes(b.status)) || activeToken
  const tokenDisplay = activeBooking?.token_number || activeBooking?.id || (bookings.length > 0 ? 'A-025' : '—')
  const waitDisplay = activeBooking ? `~ ${activeBooking.estimated_wait_minutes ?? 20} min` : '—'
  const bookingsCount = bookings.length > 0 ? bookings.length : (activeBooking ? 1 : 0)

  return (
    <div className="dashboard-view-container">
      {/* Top 4 Stat Cards */}
      <section className="stats-cards-grid" aria-label="Quick statistics">
        {/* Card 1: My Bookings */}
        <div className="stat-card" onClick={() => onNavigate('records')}>
          <div className="stat-card-left">
            <span className="stat-label">My Bookings</span>
            <strong className="stat-value">{bookingsCount}</strong>
          </div>
          <div className="stat-icon-wrapper blue-bg">
            <Calendar size={22} className="stat-icon blue-text" />
          </div>
        </div>

        {/* Card 2: Live Queue */}
        <div className="stat-card" onClick={() => onNavigate('queue')}>
          <div className="stat-card-left">
            <span className="stat-label">Live Queue</span>
            <strong className="stat-value">{tokenDisplay}</strong>
          </div>
          <div className="stat-icon-wrapper cyan-bg">
            <Users size={22} className="stat-icon cyan-text" />
          </div>
        </div>

        {/* Card 3: Est. Wait */}
        <div className="stat-card" onClick={() => onNavigate('queue')}>
          <div className="stat-card-left">
            <span className="stat-label">Est. Wait</span>
            <strong className="stat-value">{waitDisplay}</strong>
          </div>
          <div className="stat-icon-wrapper orange-bg">
            <Clock size={22} className="stat-icon orange-text" />
          </div>
        </div>

        {/* Card 4: Nearby Hospitals */}
        <div className="stat-card" onClick={() => onNavigate('nearby')}>
          <div className="stat-card-left">
            <span className="stat-label">Nearby Hospitals</span>
            <strong className="stat-value">{hospitalsCount}</strong>
          </div>
          <div className="stat-icon-wrapper indigo-bg">
            <Building2 size={22} className="stat-icon indigo-text" />
          </div>
        </div>
      </section>

      {/* Hero Promo Banner */}
      <section className="promo-banner-card">
        <div className="promo-banner-content">
          <h2>Book OPD Card Online<br />and Skip the Queue!</h2>
          <button
            type="button"
            className="btn-book-now"
            onClick={() => onNavigate('book')}
          >
            <span>Book Now</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="promo-banner-illustration">
          <div className="doctor-badge-quote">
            <Heart size={16} className="heart-icon-badge" />
            <span>"Healthy India Happy India"</span>
          </div>
          <div className="doctor-avatar-art">
            <span className="doctor-emoji-art" role="img" aria-label="Doctor">👩‍⚕️</span>
          </div>
        </div>
      </section>

      {/* Quick Services Section */}
      <section className="quick-services-section">
        <h3 className="section-title">Quick Services</h3>

        <div className="quick-services-grid">
          {/* Service 1: Nearby Hospitals */}
          <button
            type="button"
            className="quick-service-card"
            onClick={() => onNavigate('nearby')}
          >
            <div className="service-icon-box bg-blue">
              <MapPin size={24} className="text-blue" />
            </div>
            <span className="service-title">Nearby Hospitals</span>
            <span className="service-sub">Find verified care near you</span>
          </button>

          {/* Service 2: OPD Booking */}
          <button
            type="button"
            className="quick-service-card"
            onClick={() => onNavigate('book')}
          >
            <div className="service-icon-box bg-cyan">
              <Calendar size={24} className="text-cyan" />
            </div>
            <span className="service-title">OPD Booking</span>
            <span className="service-sub">Instant token reservation</span>
          </button>

          {/* Service 3: Live Queue */}
          <button
            type="button"
            className="quick-service-card"
            onClick={() => onNavigate('queue')}
          >
            <div className="service-icon-box bg-indigo">
              <Users size={24} className="text-indigo" />
            </div>
            <span className="service-title">Live Queue</span>
            <span className="service-sub">Track wait time & turn</span>
          </button>

          {/* Service 4: Emergency Finder */}
          <button
            type="button"
            className="quick-service-card"
            onClick={() => onNavigate('emergency')}
          >
            <div className="service-icon-box bg-red">
              <Siren size={24} className="text-red" />
            </div>
            <span className="service-title">Emergency Finder</span>
            <span className="service-sub">ICU, Oxygen & General beds</span>
          </button>
        </div>
      </section>
    </div>
  )
}
