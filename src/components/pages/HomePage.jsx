import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, HeartPulse, Hospital, LocateFixed, MapPin, Search, ShieldCheck, SkipForward, Stethoscope, Ticket, Pause, Play } from 'lucide-react'
import { Reveal } from '../Reveal'
export function HomePage({ labels, token, activeQueue, ahead, estimated, goTo, apiMode = false, apiBookings = [] }) {
  const sharedBooking = apiBookings.find(item => ['waiting', 'serving', 'arrived'].includes(item.status))
  const visibleToken = apiMode ? sharedBooking : token
  const visibleAhead = apiMode ? Math.max(0, (sharedBooking?.queue_position || 1) - 1) : ahead
  const visibleWait = apiMode ? sharedBooking?.estimated_wait_minutes || 0 : estimated
  const visibleServing = apiMode ? sharedBooking?.status === 'serving' : activeQueue.some(item => item.status === 'serving')
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" /> HEALTHCARE, ON YOUR TIME</div>
          <h1>{labels.hero}</h1><p className="hero-copy">{labels.heroCopy}</p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => goTo('book')}>{labels.bookCta} <ArrowRight size={17} /></button>
            <button className="secondary-btn" onClick={() => goTo('queue')}>{labels.queueCta} <Activity size={17} /></button>
          </div>
          <div className="live-count"><span className="live-dot" /> Demo experience · No real hospital activity</div>
        </div>
        <div className="queue-preview">
          <div className="preview-top"><span className="preview-label">DEMO QUEUE · {visibleToken?.department_name || visibleToken?.department || 'choose an OPD'}</span><span className="live-badge"><span className="live-dot" /> {visibleServing ? 'SERVING' : apiMode ? 'SHARED' : 'DEMO'}</span></div>
          <div className="doctor-row"><div className="doctor-avatar"><Stethoscope size={24} /></div><div><strong>{visibleToken?.doctor_name || visibleToken?.doctor || 'OPD queue'}</strong><span>{visibleToken?.department_name || visibleToken?.department || 'General Medicine'} · {visibleToken?.hospital_name || visibleToken?.hospital || 'Select a hospital'}</span></div></div>
          <div className="preview-divider" />
          <div className="queue-stats"><div><span>Your token</span><strong>{visibleToken?.token_number || visibleToken?.id || '—'}</strong></div><div><span>People ahead</span><strong>{visibleAhead} <small>patients</small></strong></div><div><span>Est. wait</span><strong>~{visibleWait} <small>min</small></strong></div></div>
          <div className="progress-track"><span /></div><div className="preview-foot"><span><Clock3 size={14} /> Shared demo queue</span><button onClick={() => goTo('queue')}>View queue status <ArrowRight size={14} /></button></div>
        </div>
      </section>
      <Reveal as="section" className="trust-row">
        <div><span className="trust-icon"><ShieldCheck size={19} /></span><span><strong>Demo identity</strong><small>Not official ABHA authentication</small></span></div>
        <div><span className="trust-icon"><Clock3 size={19} /></span><span><strong>Queue tracking</strong><small>Updates from the demo API</small></span></div>
        <div><span className="trust-icon"><HeartPulse size={19} /></span><span><strong>Browse nearby</strong><small>Explore mapped hospital listings</small></span></div>
      </Reveal>
      <section className="how-section scroll-reveal is-visible">
        <div className="section-kicker">SIMPLE BY DESIGN</div><h2>More care. Less waiting.</h2>
        <p className="section-sub">A calmer way to visit the doctor, from booking to check-in.</p>
        <div className="feature-grid">
          <Reveal as="article" className="feature-card"><span className="feature-icon"><Ticket size={20} /></span><h3>Book a demo token</h3><p>Choose an available appointment from the QueueFree demo directory.</p></Reveal>
          <Reveal as="article" className="feature-card"><span className="feature-icon"><Clock3 size={20} /></span><h3>Follow your queue</h3><p>View queue position and estimated wait from the shared demo API.</p></Reveal>
          <Reveal as="article" className="feature-card"><span className="feature-icon"><Bell size={20} /></span><h3>Notification-ready</h3><p>WhatsApp consent is collected in demo sign-in; message delivery is not configured.</p></Reveal>
        </div>
      </section>
    </>
  )
}
