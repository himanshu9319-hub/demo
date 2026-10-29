import { useEffect, useState } from 'react'
import { Activity, Check, LogOut, Pause, Play, RefreshCw, SkipForward, Stethoscope } from 'lucide-react'
import { apiRequest, localIsoDate, setApiAccessToken, staffLogin } from '../../lib/queueApi'

const pollMs = Math.max(2000, Number(import.meta.env.VITE_API_POLL_MS || 5000))

export function HospitalDashboard({ role: requiredRole }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState(localIsoDate())

  const refresh = async () => {
    if (!auth) return
    setLoading(true)
    try {
      setData(await apiRequest(`/staff/queue/?date=${encodeURIComponent(date)}`))
      setError('')
    } catch (reason) {
      setError(reason.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auth) return
    refresh()
    const interval = window.setInterval(refresh, pollMs)
    return () => window.clearInterval(interval)
  }, [auth, date])

  const login = async event => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await staffLogin(username, password)
      if (requiredRole === 'doctor' && result.role !== 'doctor') throw new Error('Use the doctor demo account for this dashboard.')
      if (requiredRole === 'reception' && !['reception', 'hospital_admin'].includes(result.role)) throw new Error('This route is for reception or hospital-admin accounts.')
      setApiAccessToken(result.access)
      setAuth(result)
      setPassword('')
    } catch (reason) {
      setError(reason.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setApiAccessToken('')
    setAuth(null)
    setData(null)
  }

  const act = async (booking, action) => {
    setError('')
    try {
      await apiRequest(`/staff/bookings/${booking.id}/action/`, { method: 'POST', body: { action } })
      await refresh()
    } catch (reason) {
      setError(reason.message)
    }
  }

  const callNext = () => {
    const next = data?.bookings.find(booking => ['waiting', 'arrived'].includes(booking.status))
    if (next) act(next, 'call_next')
  }

  const controlQueue = async action => {
    setError('')
    try {
      await apiRequest('/staff/queue/control/', { method: 'POST', body: { action, date } })
      await refresh()
    } catch (reason) {
      setError(reason.message)
    }
  }

  const doctorDashboard = requiredRole === 'doctor'
  const roleTitle = auth?.role === 'hospital_admin' ? 'Hospital admin dashboard' : doctorDashboard ? 'Doctor dashboard' : 'Reception dashboard'
  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar"><a className="brand" href="/"><span className="brand-mark"><Activity size={19} /></span><span>Queue<span>Free</span></span></a><span className="dashboard-demo-badge">SHARED API · DEMO MODE</span><a className="text-button" href="/">Patient website</a></header>
      <section className="dashboard-content">
        {!auth ? <div className="dashboard-login"><div className="section-kicker">{doctorDashboard ? 'DOCTOR CONSOLE' : 'RECEPTION CONSOLE'}</div><h1>{doctorDashboard ? 'Doctor dashboard' : 'Reception dashboard'}</h1><p>Sign in with a seeded demo staff account. Results are restricted to its assigned hospital.</p><form onSubmit={login}><label className="form-field">Username<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label><label className="form-field">Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label><button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <Stethoscope size={16} /></button></form>{error && <div className="api-error" role="alert">{error}</div>}<small>Demo credentials are in the project README. No production credentials are included.</small></div> : <>
          <div className="dashboard-heading"><div><div className="section-kicker">{roleTitle.toUpperCase()} · DEMO</div><h1>{data?.hospital.name || 'Hospital queue'}</h1><p>{data?.hospital.city} · {doctorDashboard ? 'Doctor-scoped queue' : 'Hospital-scoped staff view'}</p></div><button className="secondary-staff" onClick={logout}><LogOut size={15} /> Sign out</button></div>
          {error && <div className="api-error" role="alert">{error}</div>}
          <div className="dashboard-controls"><label className="form-field">Queue date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><button className="text-button" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Refresh</button><span className="polling-note"><span className="live-dot" /> Polling every {pollMs / 1000}s</span></div>
          <div className="dashboard-metrics"><article><small>WAITING / ARRIVED</small><strong>{data?.bookings.filter(item => ['waiting', 'arrived'].includes(item.status)).length || 0}</strong></article><article><small>NOW SERVING</small><strong>{data?.bookings.find(item => item.status === 'serving')?.token_number || '—'}</strong></article><article><small>COMPLETED</small><strong>{data?.bookings.filter(item => item.status === 'completed').length || 0}</strong></article></div>
          <div className="dashboard-actions"><button className="primary-btn" disabled={!data?.bookings.some(item => ['waiting', 'arrived'].includes(item.status)) || data?.paused} onClick={callNext}><SkipForward size={15} /> Call next</button><button className="secondary-staff" onClick={() => controlQueue(data?.paused ? 'resume' : 'pause')}>{data?.paused ? <Play size={15} /> : <Pause size={15} />}{data?.paused ? 'Resume queue' : 'Pause queue'}</button></div>
          <div className="dashboard-queue" aria-busy={loading}><div className="dashboard-queue-heading"><h2>{doctorDashboard ? 'My patients' : 'Today’s bookings'}</h2><span>{data?.bookings.length || 0} tokens · {data?.paused ? 'paused' : 'active'}</span></div>
            {loading && !data ? <div className="empty-dashboard" role="status"><span className="loading-indicator" /> Loading today’s queue…</div> : data?.bookings.length ? data.bookings.map(booking => <article className="dashboard-booking-row" key={booking.id}><div className="dashboard-token">{booking.token_number}</div><div className="dashboard-booking-main"><strong>{booking.patient_display_name}</strong><span>{booking.department_name} · {booking.doctor_name} · {booking.appointment_date} {booking.slot_time}</span><small>Payment: {booking.payment.status}{booking.payment.simulated ? ' · simulated' : ''}</small></div><span className={'status-pill status-' + booking.status}>{booking.status.replace('_', ' ')}</span><div className="dashboard-row-actions">{booking.status === 'serving' && <button className="secondary-staff" onClick={() => act(booking, 'complete')}><Check size={14} /> Complete</button>}{['waiting', 'arrived'].includes(booking.status) && <><button className="secondary-staff" onClick={() => act(booking, 'arrived')}>Arrived</button><button className="secondary-staff" onClick={() => act(booking, 'missed')}>Missed</button><button className="secondary-staff" onClick={() => act(booking, 'skip')}>Skip</button></>}</div></article>) : data ? <div className="empty-dashboard"><Stethoscope size={24} /><strong>No bookings for this date</strong><span>When a patient books through QueueFree, the token will appear here automatically.</span></div> : null}
          </div>
        </>}
      </section>
    </main>
  )
}
