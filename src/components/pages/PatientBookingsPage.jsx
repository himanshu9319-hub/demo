import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clock3, Hospital, RefreshCw, Ticket } from 'lucide-react'
import { apiRequest, localIsoDate } from '../../lib/queueApi'

const activeStatuses = new Set(['waiting', 'serving', 'arrived'])

export function PatientBookingsPage({ authenticated, bookings, apiError, refreshBookings, goTo, setToast }) {
  const [canceling, setCanceling] = useState('')
  const [rescheduling, setRescheduling] = useState('')
  const [date, setDate] = useState(localIsoDate())
  const [slots, setSlots] = useState([])
  const [slotId, setSlotId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!rescheduling) return
    const booking = bookings.find(item => item.id === rescheduling)
    if (!booking) return
    let active = true
    setSlots([])
    setSlotId('')
    apiRequest(`/availability/?doctor_id=${booking.doctor}&date=${date}`)
      .then(result => {
        if (!active) return
        const available = result.slots.filter(slot => slot.available)
        setSlots(available)
        setSlotId(available[0] ? String(available[0].id) : '')
      })
      .catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [rescheduling, date, bookings])

  if (!authenticated) {
    return <section className="content-section"><div className="page-heading"><div><div className="section-kicker">PATIENT DASHBOARD</div><h1>Your bookings</h1><p>Sign in with the simulated ABHA flow to load bookings shared by the QueueFree API.</p></div></div><div className="empty-queue"><div className="empty-icon"><Ticket size={25} /></div><h2>Sign in to view your shared queue</h2><p>Patient booking and queue data is loaded from the backend, not this browser’s local storage.</p><button className="primary-btn" onClick={() => document.querySelector('.signin')?.click()}>Demo sign in <ArrowRight size={16} /></button></div></section>
  }

  const cancel = async booking => {
    if (!window.confirm(`Cancel ${booking.token_number} at ${booking.hospital_name}? The hospital's refund policy will be applied.`)) return
    setCanceling(booking.id)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest(`/bookings/${booking.id}/cancel/`, { method: 'POST', body: { reason: 'patient_request' } })
      setMessage(result.refund.status === 'simulated'
        ? `Booking cancelled. Simulated refund: ${booking.payment.currency} ${result.refund.amount} (${result.refund.percentage}%).`
        : 'Booking cancelled. No refund was due under this hospital policy.')
      await refreshBookings()
    } catch (reason) {
      setError(reason.message)
    } finally {
      setCanceling('')
    }
  }

  const reschedule = async booking => {
    setError('')
    try {
      await apiRequest(`/bookings/${booking.id}/reschedule/`, {
        method: 'POST',
        body: { date, slot_id: slotId },
      })
      setMessage('Appointment rescheduled. QueueFree availability has been refreshed.')
      setRescheduling('')
      await refreshBookings()
    } catch (reason) {
      setError(reason.message)
    }
  }

  return (
    <section className="content-section">
      <div className="page-heading"><div><div className="section-kicker">PATIENT DASHBOARD</div><h1>Your bookings</h1><p>Bookings and queue changes synced from the shared QueueFree API.</p></div><button className="text-button" onClick={refreshBookings}><RefreshCw size={14} /> Refresh</button></div>
      {message && <div className="api-success" role="status">{message}</div>}
      {(error || apiError) && <div className="api-error" role="alert">{error || apiError}</div>}
      {bookings.length ? <div className="patient-booking-list">{bookings.map(booking => (
        <article className="patient-booking-card" key={booking.id}>
          <div className="patient-booking-top"><span className={'integration-notice integration-' + booking.hospital_integration_type.toLowerCase()}><Hospital size={15} />{booking.hospital_integration_type === 'A' ? 'API demo' : booking.hospital_integration_type === 'B' ? 'External website' : 'QueueFree managed'}</span><span className={'status-pill status-' + booking.status}>{booking.status.replace('_', ' ')}</span></div>
          <div className="patient-token-number">{booking.token_number}</div>
          <h2>{booking.hospital_name}</h2>
          <p>{booking.hospital_city} · {booking.department_name} · {booking.doctor_name}</p>
          <div className="booking-facts"><span><CalendarDays size={15} />{booking.appointment_date} · {booking.slot_time}</span><span><Ticket size={15} />Queue position: {booking.queue_position ?? '—'}</span><span><Clock3 size={15} />Estimated wait: {booking.estimated_wait_minutes} min</span></div>
          <div className="payment-state">Payment: <strong>{booking.payment.status}</strong>{booking.payment.simulated && <small> · simulated demo payment</small>}{Number(booking.refund_amount) > 0 && <span> · refunded {booking.payment.currency} {booking.refund_amount}</span>}</div>
          {booking.authoritative_external && <p className="external-booking-notice">The hospital adapter is simulated. This record mirrors a demo adapter response, not a real hospital reservation; the authoritative hospital does not expose live queue position or wait estimates here.</p>}
          {activeStatuses.has(booking.status) && !booking.authoritative_external && <div className="patient-booking-actions">
            <button className="secondary-staff" onClick={() => { setError(''); setDate(booking.appointment_date); setRescheduling(rescheduling === booking.id ? '' : booking.id) }}>Reschedule</button>
            <button className="cancel-token" disabled={canceling === booking.id} onClick={() => cancel(booking)}>{canceling === booking.id ? 'Cancelling…' : 'Cancel booking'}</button>
          </div>}
          {rescheduling === booking.id && <div className="reschedule-panel"><label className="form-field">New date<input type="date" min={localIsoDate()} value={date} onChange={event => setDate(event.target.value)} /></label><label className="form-field">Available time<select value={slotId} onChange={event => setSlotId(event.target.value)}>{slots.map(slot => <option key={slot.id} value={slot.id}>{slot.time}</option>)}</select></label><button className="primary-btn" disabled={!slotId} onClick={() => reschedule(booking)}>Confirm reschedule <Check size={15} /></button></div>}
        </article>
      ))}</div> : <div className="empty-queue"><div className="empty-icon"><Ticket size={25} /></div><h2>No bookings yet</h2><p>Choose an API-backed demo facility and book a token to see it here.</p><button className="primary-btn" onClick={() => goTo('book')}>Book your token <ArrowRight size={16} /></button></div>}
    </section>
  )
}
