import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, ExternalLink, Hospital, RefreshCw, ShieldCheck } from 'lucide-react'
import { apiRequest, createBooking, getResults, localIsoDate } from '../lib/queueApi'

function integrationText(hospital) {
  if (hospital.integration_type === 'A') return 'Type A · Hospital API · demo adapter'
  if (hospital.integration_type === 'B') return 'Type B · Hospital website · external booking'
  return 'Type C · QueueFree-managed demo queue'
}

export function ApiBookingPanel({ authenticated, selectedListing, goTo, onConfirmed, setToast }) {
  const [hospitals, setHospitals] = useState([])
  const [hospitalId, setHospitalId] = useState('')
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [day, setDay] = useState(localIsoDate())
  const [slots, setSlots] = useState([])
  const [slotId, setSlotId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hospital = useMemo(() => hospitals.find(item => String(item.id) === hospitalId), [hospitals, hospitalId])
  const department = useMemo(() => departments.find(item => String(item.id) === departmentId), [departments, departmentId])
  const doctor = useMemo(() => doctors.find(item => String(item.id) === doctorId), [doctors, doctorId])

  useEffect(() => {
    let active = true
    getResults('/hospitals/').then(data => {
      if (!active) return
      setHospitals(data)
      setHospitalId(current => current || (data[0] ? String(data[0].id) : ''))
    }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!hospitalId) return
    let active = true
    setDepartments([])
    setDepartmentId('')
    setDoctors([])
    setDoctorId('')
    setSlots([])
    setError('')
    getResults(`/hospitals/${hospitalId}/departments/`).then(data => {
      if (!active) return
      setDepartments(data)
      setDepartmentId(data[0] ? String(data[0].id) : '')
    }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [hospitalId])

  useEffect(() => {
    if (!departmentId) return
    let active = true
    setDoctors([])
    setDoctorId('')
    setSlots([])
    getResults(`/doctors/?department_id=${encodeURIComponent(departmentId)}`).then(data => {
      if (!active) return
      setDoctors(data)
      setDoctorId(data[0] ? String(data[0].id) : '')
    }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [departmentId])

  const refreshSlots = async () => {
    if (!doctorId || !day) return
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/availability/?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(day)}`)
      setSlots(result.slots || [])
      setSlotId(current => result.slots.some(slot => String(slot.id) === current && slot.available)
        ? current
        : String(result.slots.find(slot => slot.available)?.id || ''))
    } catch (reason) {
      setSlots([])
      setError(reason.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshSlots() }, [doctorId, day])

  const submit = async event => {
    event.preventDefault()
    if (!authenticated) {
      setToast('Complete the simulated ABHA sign-in before booking through the shared queue.')
      return
    }
    if (!hospital || hospital.integration_type === 'B' || !slotId) return
    setSubmitting(true)
    setError('')
    try {
      await refreshSlots()
      const latest = await apiRequest(`/availability/?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(day)}`)
      const available = latest.slots.find(item => String(item.id) === slotId)?.available
      if (!available) {
        setError('That time was just taken. Availability has been refreshed; please choose another slot.')
        return
      }
      const booking = await createBooking({
        hospital_id: hospital.id,
        department_id: departmentId,
        doctor_id: doctorId,
        date: day,
        slot_id: slotId,
        idempotency_key: crypto.randomUUID(),
      })
      onConfirmed(booking)
    } catch (reason) {
      setError(reason.message)
      if (reason.status === 409) refreshSlots()
    } finally {
      setSubmitting(false)
    }
  }

  const continueToHospital = () => {
    if (hospital?.official_booking_url) window.open(hospital.official_booking_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="shared-booking-panel">
      <div className="booking-step"><span className="step-number">01</span><div><h2>Shared QueueFree booking</h2><p>Tokens and availability are managed by the shared API.</p></div><button className="text-button" type="button" onClick={() => goTo('nearby')}>Browse nearby <ArrowRight size={14} /></button></div>
      {selectedListing && <div className="selected-listing-note"><Hospital size={16} /><span>Nearby listing selected: <strong>{selectedListing.name}</strong>. Browse Nearby and its location details remain available separately; bookings are offered only for the facilities below.</span></div>}
      <form onSubmit={submit}>
        <label className="form-field">Demo facility<select value={hospitalId} onChange={event => setHospitalId(event.target.value)}>{hospitals.map(item => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label>
        {hospital && <div className={'integration-notice integration-' + hospital.integration_type.toLowerCase()}><BadgeCheck size={17} /><span><strong>{integrationText(hospital)}</strong><small>{hospital.booking_behavior}{hospital.integration_type === 'A' ? '. No real hospital API is connected.' : ''}</small></span></div>}
        {hospital?.integration_type === 'B' ? (
          <div className="external-booking-notice"><p>This facility handles bookings on its {hospital.is_demo ? 'demo website placeholder' : 'official website'}. QueueFree has not reserved a slot or issued a token.</p><button className="secondary-staff" type="button" onClick={continueToHospital} disabled={!hospital.official_booking_url}>{hospital.is_demo ? 'Open demo URL placeholder' : 'Continue to official booking site'} <ExternalLink size={15} /></button></div>
        ) : (
          <>
            <div className="form-grid">
              <label className="form-field">Department<select value={departmentId} onChange={event => setDepartmentId(event.target.value)}>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="form-field">Doctor<select value={doctorId} onChange={event => setDoctorId(event.target.value)}>{doctors.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
              <label className="form-field">Appointment date<input type="date" min={localIsoDate()} value={day} onChange={event => setDay(event.target.value)} required /></label>
            </div>
            {hospital?.payment_required && <div className="payment-policy"><ShieldCheck size={16} /><span><strong>Simulated payment · {hospital.currency} {hospital.consultation_fee}</strong><small>Before cancelling: over 24h = full refund; 6–24h = 75%; under 6h = 50%. Hospital-specific policy applies. No real payment is collected.</small></span></div>}
            <div className="availability-heading"><strong>Available slots</strong><button className="text-button" type="button" onClick={refreshSlots} disabled={loading}><RefreshCw size={14} /> Refresh availability</button></div>
            {loading ? <p className="availability-message">Checking live availability…</p> : slots.length ? <div className="api-slot-list">{slots.map(slot => <label key={slot.id} className={'api-slot ' + (String(slot.id) === slotId ? 'selected' : '') + (!slot.available ? ' unavailable' : '')}><input type="radio" name="api-slot" value={slot.id} checked={String(slot.id) === slotId} disabled={!slot.available} onChange={() => setSlotId(String(slot.id))} /><span>{slot.time}</span><small>{slot.available ? `${slot.remaining} remaining` : 'Full'}</small></label>)}</div> : <p className="availability-message">No slots are currently available for this date.</p>}
            {doctor && <small className="api-doctor-note">Typical consultation: {doctor.average_consultation_minutes} min{doctor.delay_minutes ? ` · Current delay: ${doctor.delay_minutes} min ${doctor.delay_reason || ''}` : ''}</small>}
            <button className="primary-btn confirm-btn" type="submit" disabled={!authenticated || !slotId || submitting || loading}>{submitting ? 'Confirming…' : authenticated ? (hospital?.payment_required ? 'Confirm and simulate payment' : 'Confirm OPD token') : 'Sign in to book a shared token'} <ArrowRight size={16} /></button>
            <p className="privacy-note"><ShieldCheck size={14} /> Only a simulated demo ABHA ID can sign in. Never enter a real ABHA ID.</p>
          </>
        )}
      </form>
      {error && <div className="api-error" role="alert">{error}</div>}
    </div>
  )
}
