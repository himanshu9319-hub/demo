import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, HeartPulse, Hospital, LocateFixed, MapPin, Search, ShieldCheck, SkipForward, Stethoscope, Ticket, Pause, Play } from 'lucide-react'
import { hospitalKey } from '../../lib/appData'

export function StaffPage({ labels, staffTarget, staffHospitalKey, setStaffHospital, staffOptions, staffDept, setStaffDept, departments, staffQueue, setAvgMinutes, avgMinutes, staffKey, delayMinutes, setDelayMinutes, paused, setPaused, updateQueue }) {
  return (
    <section className="content-section">
      <div className="page-heading"><div><div className="section-kicker">STAFF CONSOLE · DEMO</div><h1>{labels.staffTitle}</h1><p>Staff actions update this hospital and department queue on this device.</p></div></div>
      <div className="staff-console">
        <label className="form-field">Hospital<select value={staffHospitalKey} onChange={event => setStaffHospital(event.target.value)}>{staffOptions.map(hospital => <option key={hospitalKey(hospital)} value={hospitalKey(hospital)}>{hospital.name} · {hospital.city}</option>)}</select></label>
        <label className="form-field staff-department">Department<select value={staffDept} onChange={event => setStaffDept(event.target.value)}>{departments.map(value => <option key={value}>{value}</option>)}</select></label>
        {staffTarget ? <>
          <div className="staff-metrics"><div><small>WAITING</small><strong>{staffQueue.filter(item => item.status === 'waiting').length}</strong></div><div><small>NOW SERVING</small><strong>{staffQueue.find(item => item.status === 'serving')?.id || '—'}</strong></div><div><small>COMPLETED</small><strong>{staffQueue.filter(item => item.status === 'completed').length}</strong></div></div>
          <label className="form-field average-field">Average consultation time (minutes)<input type="number" min="3" max="90" value={avgMinutes[staffKey] || 8} onChange={event => setAvgMinutes(current => ({ ...current, [staffKey]: Number(event.target.value) }))} /></label>
          <label className="form-field average-field">Doctor delay (minutes)<input type="number" min="0" max="240" value={delayMinutes[staffKey] || 0} onChange={event => setDelayMinutes(current => ({ ...current, [staffKey]: Number(event.target.value) }))} /></label>
          <div className="staff-actions">
            <button className="primary-btn" disabled={paused[staffKey]} onClick={() => updateQueue(staffKey, 'next')}><SkipForward size={16} /> Call next</button>
            <button className="secondary-staff" onClick={() => updateQueue(staffKey, 'complete')}><Check size={16} /> Complete</button>
            <button className="secondary-staff" onClick={() => updateQueue(staffKey, 'skip')}><ArrowDownRight size={16} /> Skip</button>
            <button className="secondary-staff" onClick={() => setPaused(current => ({ ...current, [staffKey]: !current[staffKey] }))}>{paused[staffKey] ? <Play size={16} /> : <Pause size={16} />} {paused[staffKey] ? 'Resume queue' : 'Pause queue'}</button>
          </div>
          {paused[staffKey] && <p className="pause-notice">Queue paused. New patients can still book; wait estimates include a 10 minute delay.</p>}
          <div className="staff-queue-list"><h2>Today’s OPD queue <span>{staffQueue.length} tokens</span></h2>
            {staffQueue.length ? staffQueue.map((item, index) => <div className="staff-queue-row" key={item.id}><span className="queue-position">{String(index + 1).padStart(2, '0')}</span><strong>{item.id}</strong><span>{item.department} · {item.doctor}</span><em className={'status-' + item.status}>{item.status}</em></div>) : <p className="empty-queue-copy">No demo tokens yet. Book a token for this hospital to see it here.</p>}
          </div>
        </> : <p>Hospitals will appear here after you search for a city in Nearby.</p>}
      </div>
    </section>
  )
}
