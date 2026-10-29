import { useState } from 'react'
import { ArrowRight, Hospital, MapPin } from 'lucide-react'

export function HospitalCard({ hospital, onBook, onViewLocation, onFocus, active = false }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article onClick={() => onFocus?.(hospital)} className={active ? "hospital-card is-active" : "hospital-card"} id={"hospital-" + (hospital.id || hospital.name)}>
      <div className="hospital-icon"><Hospital size={21} /></div>
      <div className="hospital-info">
        <div className="hospital-title-row"><h3>{hospital.name}</h3>{hospital.rating && <span className="rating">★ {hospital.rating}</span>}</div>
        <p className="muted"><MapPin size={14} /> {hospital.area}, {hospital.city} <span className="dot-sep">·</span> {hospital.distance}</p>
        <div className="hospital-tags"><span className="tag">{hospital.specialty}</span>{hospital.wait && <span className="wait-pill">{hospital.wait}</span>}</div>
        {expanded && <div className="hospital-details">
          <p><strong>Address</strong> {hospital.address || hospital.area || hospital.city}</p>
          {hospital.phone && <p><strong>Phone</strong> {hospital.phone}</p>}
          {hospital.website && <p><strong>Website</strong> {hospital.website}</p>}
          {hospital.hours && <p><strong>Hours</strong> {hospital.hours}</p>}
          <small>OpenStreetMap listing · Details may be incomplete</small>
        </div>}
      </div>
      <div className="hospital-actions">
        <button className="direction-link" onClick={() => onViewLocation?.(hospital)}>View location</button><button className="direction-link" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide details' : 'View details'}</button>
        <button className="small-book" onClick={() => onBook(hospital)}>Book token <ArrowRight size={14} /></button>
      </div>
    </article>
  )
}
