import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, HeartPulse, Hospital, LocateFixed, MapPin, Search, ShieldCheck, SkipForward, Stethoscope, Ticket, Pause, Play, Star } from 'lucide-react'
import { hospitalKey } from '../../lib/appData'

export function StaffPage({ labels, staffTarget, staffHospitalKey, setStaffHospital, staffOptions, staffDept, setStaffDept, staffDoctor, setStaffDoctor, doctorDirectory, departments, staffQueue, setAvgMinutes, avgMinutes, staffKey, delayMinutes, setDelayMinutes, paused, setPaused, updateQueue }) {
  const departmentDoctors = doctorDirectory.filter(doctor => doctor.department === staffDept)
  const selectedDoctor = departmentDoctors.find(doctor => doctor.name === staffDoctor) || departmentDoctors[0]
  const changeDepartment = event => {
    const nextDepartment = event.target.value
    setStaffDept(nextDepartment)
    setStaffDoctor(doctorDirectory.find(doctor => doctor.department === nextDepartment)?.name || '')
  }

  return (
    <section className="content-section">
      <div className="page-heading"><div><div className="section-kicker">STAFF CONSOLE · DEMO</div><h1>{labels.staffTitle}</h1><p>Review generated doctor profiles and manage this device’s local OPD queue.</p></div></div>
      <div className="staff-console">
        <label className="form-field">Hospital<select value={staffHospitalKey} onChange={event => setStaffHospital(event.target.value)}>{staffOptions.map(hospital => <option key={hospitalKey(hospital)} value={hospitalKey(hospital)}>{hospital.name} · {hospital.city}</option>)}</select></label>
        <div className="staff-filter-grid">
          <label className="form-field staff-department">Department<select value={staffDept} onChange={changeDepartment}>{departments.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field">Doctor<select value={selectedDoctor?.name || ''} onChange={event => setStaffDoctor(event.target.value)}>{departmentDoctors.map(doctor => <option key={doctor.id} value={doctor.name}>{doctor.name}</option>)}</select></label>
        </div>
        {staffTarget ? <>
          {selectedDoctor && <section className="staff-doctor-card" aria-label="Selected simulated doctor profile">
            <div className="staff-doctor-heading">
              <span className="staff-doctor-avatar"><Stethoscope size={22} /></span>
              <span className="staff-doctor-name"><small>SELECTED DOCTOR · {selectedDoctor.department.toUpperCase()}</small><strong>{selectedDoctor.name}</strong><span>{selectedDoctor.experienceYears} years’ experience</span></span>
              <span className="staff-demo-tag">SIMULATED PROFILE</span>
            </div>
            <div className="staff-doctor-stats">
              <div><Star size={15} /><strong>{selectedDoctor.rating}</strong><small>Demo rating</small></div>
              <div><strong>{selectedDoctor.patientsToday}</strong><small>Patients today</small></div>
              <div><strong>{selectedDoctor.availableSlots}</strong><small>Open slots</small></div>
              <div><strong>{selectedDoctor.averageMinutes} min</strong><small>Avg. consultation</small></div>
            </div>
            <p>Fictional demo values, generated once and saved on this device. They are not real doctor availability or patient records.</p>
          </section>}
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
            {staffQueue.length ? staffQueue.map((item, index) => <div className="staff-queue-row" key={item.id}><span className="queue-position">{String(index + 1).padStart(2, '0')}</span><strong>{item.id}</strong><span>{item.department} · {item.doctor}</span><em className={'status-' + item.status}>{item.status}</em></div>) : <p className="empty-queue-copy">No local demo tokens yet. Patient bookings use the shared API and appear in the signed-in patient or staff portal, not this device-only queue.</p>}
          </div>
        </> : <p>Hospitals will appear here after you search for a city in Nearby.</p>}
      </div>
    </section>
  )
}
