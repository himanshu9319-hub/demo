import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react'
import { ApiBookingPanel } from '../ApiBookingPanel'

export function BookingPage({ labels, goTo, city, booking, apiAuthenticated, setToast, onApiBookingConfirmed }) {
  return (
    <section className="content-section">
      <button className="back-link" onClick={() => goTo('home')}><ArrowLeft size={16} /> Back to home</button>
      <div className="page-heading"><div><div className="section-kicker">YOUR VISIT, MADE SIMPLE</div><h1>{labels.bookingTitle}</h1><p>Choose an API-backed demo facility and check fresh availability.</p></div></div>
      {booking && <div className="selected-listing-card"><MapPin size={17} /><span><small>LOCATION PICKED FROM BROWSE NEARBY</small><strong>{booking.name}</strong><span>{booking.area}, {booking.city}</span></span><button className="text-button" onClick={() => goTo('nearby')}>Change location <ArrowRight size={14} /></button></div>}
      <ApiBookingPanel authenticated={apiAuthenticated} selectedListing={null} goTo={goTo} onConfirmed={onApiBookingConfirmed} setToast={setToast} />
      <p className="booking-location-footnote">The Photon/Map browse experience remains separate from the demo booking directory. A nearby listing is not represented as a QueueFree partner unless it appears in the facility directory above.</p>
      <span className="sr-only">Current city: {city}</span>
    </section>
  )
}
