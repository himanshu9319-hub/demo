import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, HeartPulse, Hospital, LocateFixed, MapPin, Search, ShieldCheck, SkipForward, Stethoscope, Ticket, Pause, Play } from 'lucide-react'
import { PatientBookingsPage } from './PatientBookingsPage'
export function QueuePage({ labels, token, activeQueue, ahead, estimated, goTo, queues, setQueues, setToken, setToast, hospitalForToken, onViewLocation, queueLengthForHospital, apiMode, apiAuthenticated, apiBookings, apiError, refreshPatientBookings }) {
  if (apiMode) return <PatientBookingsPage authenticated={apiAuthenticated} bookings={apiBookings} apiError={apiError} refreshBookings={refreshPatientBookings} goTo={goTo} setToast={setToast} />
  return (
    <section className="content-section">
      <div className="page-heading"><div><div className="section-kicker">DEMO QUEUE STATUS</div><h1>{labels.queueTitle}</h1><p>Track your demo token position and estimated wait time.</p></div><span className="live-badge queue-live"><span className="live-dot" /> DEMO UPDATES</span></div>
      {token ? <div className="token-card">
        <div className="token-top"><span className="token-confirmed"><Check size={15} /> TOKEN CONFIRMED</span><span className="token-date"><CalendarDays size={14} /> {token.date}</span></div>
        <div className="token-number">{token.id}</div>
        <p className="token-hospital"><Hospital size={16} /> {token.hospital} <span>·</span> {token.department} <span>·</span> {token.doctor} <span>·</span> {token.date} at {token.slot}</p>
        <p className="token-state">Status: <strong>{token.status}</strong></p>
        {hospitalForToken && <div className="queue-location-summary"><span><MapPin size={15} /> {hospitalForToken.address || hospitalForToken.area || hospitalForToken.city}</span><button className="direction-link" onClick={() => onViewLocation(hospitalForToken)}>View hospital location · {queueLengthForHospital} waiting</button></div>}
        {token.status === 'waiting' && <button className="cancel-token" onClick={() => {
          if (window.confirm('Cancel this demo token?')) {
            setQueues(current => ({ ...current, [token.qkey]: (current[token.qkey] || []).map(item => item.id === token.id ? { ...item, status: 'cancelled' } : item) }))
            setToken(null); setToast('Token cancelled')
          }
        }}>Cancel booking</button>}
        <div className="token-progress"><div className="token-progress-head"><span>Queue progress</span><strong>{ahead} patients ahead</strong></div><div className="progress-track"><span style={{ width: Math.max(8, 100 - ahead * 20) + '%' }} /></div><div className="token-wait"><Clock3 size={15} /> Estimated wait <strong>{estimated} minutes</strong></div></div>
        <button className="primary-btn" onClick={() => setToast('WhatsApp reminders are not configured in this demo. Check your queue status here.')}><Bell size={16} /> Notification availability</button>
      </div> : <div className="empty-queue"><div className="empty-icon"><Ticket size={25} /></div><h2>No active token yet</h2><p>Book an OPD token and your live queue status will show up here.</p><button className="primary-btn" onClick={() => goTo('book')}>Book your token <ArrowRight size={16} /></button></div>}
      <div className="queue-doctor-card">
        <div className="doctor-row"><div className="doctor-avatar"><Stethoscope size={22} /></div><div><strong>{token?.doctor || 'OPD queue'}</strong><span>{token?.department || 'General Medicine'} · {token?.hospital || 'Select a hospital'}</span></div><span className="live-badge"><span className="live-dot" /> SERVING</span></div>
        <div className="doctor-live"><div><small>NOW SERVING</small><strong>{activeQueue.find(item => item.status === 'serving')?.id || '—'}</strong></div><ArrowDownRight size={17} /><div><small>YOUR TURN</small><strong>{token?.id || '—'}</strong></div><div className="wait-number"><strong>~{estimated} min</strong><small>estimated wait</small></div></div>
      </div>
    </section>
  )
}
