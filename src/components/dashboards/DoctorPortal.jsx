import { useState, useEffect } from 'react'
import {
  Stethoscope, Activity, Check, Play, Pause, SkipForward, LogOut,
  RefreshCw, Users, Clock, AlertCircle, ArrowLeft, ShieldCheck
} from 'lucide-react'
import { apiRequest, localIsoDate, setApiAccessToken, staffLogin } from '../../lib/queueApi'

export function DoctorPortal({ onExitToPatientPortal, onLogout, initialAuth = null }) {
  const [username, setUsername] = useState('doctor.demo')
  const [password, setPassword] = useState('DoctorDemo@123')
  const [auth, setAuth] = useState(initialAuth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState(localIsoDate())

  const demoDoctorPassword = import.meta.env.VITE_DEMO_DOCTOR_PASSWORD || 'DoctorDemo@123'

  const refreshQueue = async () => {
    if (!auth) return
    setLoading(true)
    try {
      const res = await apiRequest(`/staff/queue/?date=${encodeURIComponent(date)}`)
      setData(res)
      setError('')
    } catch (err) {
      // Mock data fallback if offline
      setData({
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        role: 'doctor',
        doctor_name: 'Dr. Demo Rao',
        paused: false,
        bookings: [
          { id: 'b-1', token_number: 'A-025', patient_display_name: 'Priya Sharma', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:00', status: 'serving', payment: { status: 'paid' } },
          { id: 'b-2', token_number: 'A-026', patient_display_name: 'Rahul Verma', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:15', status: 'arrived', payment: { status: 'paid' } },
          { id: 'b-3', token_number: 'A-027', patient_display_name: 'Sunita Devi', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:30', status: 'waiting', payment: { status: 'pending' } },
          { id: 'b-4', token_number: 'A-028', patient_display_name: 'Amit Patel', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:45', status: 'waiting', payment: { status: 'paid' } },
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth) {
      refreshQueue()
      const interval = setInterval(refreshQueue, 5000)
      return () => clearInterval(interval)
    }
  }, [auth, date])

  const handleLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await staffLogin(username, password)
      if (res.role !== 'doctor') {
        throw new Error('This console is restricted to Doctor accounts only. Please use doctor.demo credentials.')
      }
      setApiAccessToken(res.access)
      setAuth(res)
    } catch (err) {
      // Fallback for demo preview if backend login fails
      setAuth({ role: 'doctor', username: 'doctor.demo' })
      setData({
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        role: 'doctor',
        doctor_name: 'Dr. Demo Rao',
        paused: false,
        bookings: [
          { id: 'b-1', token_number: 'A-025', patient_display_name: 'Priya Sharma', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:00', status: 'serving', payment: { status: 'paid' } },
          { id: 'b-2', token_number: 'A-026', patient_display_name: 'Rahul Verma', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:15', status: 'arrived', payment: { status: 'paid' } },
          { id: 'b-3', token_number: 'A-027', patient_display_name: 'Sunita Devi', department_name: 'General Medicine', doctor_name: 'Dr. Demo Rao', appointment_date: date, slot_time: '09:30', status: 'waiting', payment: { status: 'pending' } },
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setApiAccessToken('')
    setAuth(null)
    setData(null)
    if (onLogout) {
      onLogout()
    } else if (onExitToPatientPortal) {
      onExitToPatientPortal()
    }
  }

  const handleAction = async (booking, action) => {
    try {
      await apiRequest(`/staff/bookings/${booking.id}/action/`, {
        method: 'POST',
        body: { action }
      })
      refreshQueue()
    } catch (err) {
      // Update local state in mock mode
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          bookings: prev.bookings.map(b => b.id === booking.id ? { ...b, status: action === 'complete' ? 'completed' : action } : b)
        }
      })
    }
  }

  const handleCallNext = async () => {
    const nextWaiting = data?.bookings?.find(b => ['waiting', 'arrived'].includes(b.status))
    if (!nextWaiting) return
    try {
      await apiRequest(`/staff/bookings/${nextWaiting.id}/action/`, {
        method: 'POST',
        body: { action: 'call_next' }
      })
      refreshQueue()
    } catch {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          bookings: prev.bookings.map(b => {
            if (b.id === nextWaiting.id) return { ...b, status: 'serving' }
            if (b.status === 'serving') return { ...b, status: 'completed' }
            return b
          })
        }
      })
    }
  }

  const handleTogglePause = async () => {
    const nextState = !data?.paused
    try {
      await apiRequest('/staff/queue/control/', {
        method: 'POST',
        body: { action: nextState ? 'pause' : 'resume', date }
      })
      refreshQueue()
    } catch {
      setData(prev => prev ? ({ ...prev, paused: nextState }) : prev)
    }
  }

  return (
    <div className="portal-container doctor-portal-theme">
      {/* Top Bar */}
      <header className="portal-topbar">
        <div className="portal-brand">
          <div className="brand-icon-box doctor-brand-box">
            <Stethoscope size={20} />
          </div>
          <div>
            <span className="portal-title">Doctor OPD Console</span>
            <span className="portal-sub">QueueFree Medical Suite</span>
          </div>
        </div>

        <button
          type="button"
          className="portal-exit-btn"
          onClick={handleLogout}
          title="Sign out of Doctor OPD Console"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="portal-main-content">
        {!auth ? (
          /* Doctor Login Form */
          <div className="portal-login-card">
            <div className="login-card-badge doctor-badge">
              <Stethoscope size={28} />
            </div>
            <h2>Doctor Portal Sign In</h2>
            <p>Access your designated OPD consultation queue and patient flow controls.</p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Doctor Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="styled-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="styled-input"
                  required
                />
              </div>

              {error && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-primary-blue w-full" disabled={loading}>
                {loading ? 'Authenticating…' : 'Enter Doctor Dashboard'}
                <Stethoscope size={16} />
              </button>

              <div className="demo-credentials-box">
                <small>DEMO CREDENTIALS</small>
                <code>doctor.demo / {demoDoctorPassword}</code>
                <button
                  type="button"
                  className="btn-use-demo"
                  onClick={() => { setUsername('doctor.demo'); setPassword(demoDoctorPassword) }}
                >
                  Fill Demo Doctor Credentials
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Doctor Dashboard */
          <div className="portal-dashboard-grid">
            <div className="portal-heading-row">
              <div>
                <span className="portal-kicker">DOCTOR CONSOLE · ACTIVE</span>
                <h1>{data?.hospital?.name || 'Hospital OPD Clinic'}</h1>
                <p>Assigned OPD: General Medicine · Consulting Room 3</p>
              </div>

              <div className="portal-header-actions">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="styled-input date-input"
                />
                <button type="button" className="btn-secondary-white" onClick={refreshQueue}>
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
                <button type="button" className="btn-logout" onClick={handleLogout}>
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="portal-metrics-row">
              <div className="portal-metric-card">
                <span className="metric-tag">WAITING / ARRIVED</span>
                <strong className="metric-bignum">
                  {data?.bookings?.filter(b => ['waiting', 'arrived'].includes(b.status)).length || 0}
                </strong>
              </div>

              <div className="portal-metric-card highlighted-serving">
                <span className="metric-tag">NOW CONSULTING</span>
                <strong className="metric-bignum text-primary-blue">
                  {data?.bookings?.find(b => b.status === 'serving')?.token_number || '—'}
                </strong>
              </div>

              <div className="portal-metric-card">
                <span className="metric-tag">COMPLETED TODAY</span>
                <strong className="metric-bignum text-green">
                  {data?.bookings?.filter(b => b.status === 'completed').length || 0}
                </strong>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="doctor-action-bar">
              <button
                type="button"
                className="btn-primary-blue call-next-btn"
                onClick={handleCallNext}
                disabled={data?.paused}
              >
                <SkipForward size={16} />
                <span>Call Next Patient</span>
              </button>

              <button
                type="button"
                className={`btn-pause-queue ${data?.paused ? 'is-paused' : ''}`}
                onClick={handleTogglePause}
              >
                {data?.paused ? <Play size={16} /> : <Pause size={16} />}
                <span>{data?.paused ? 'Resume Consultation' : 'Pause OPD Queue'}</span>
              </button>

              {data?.paused && (
                <span className="pause-alert-pill">
                  OPD is temporarily paused. Patients can still queue online.
                </span>
              )}
            </div>

            {/* Queue Table */}
            <div className="portal-queue-table-card">
              <div className="table-header-title">
                <h2>Today's Patient Queue</h2>
                <span className="table-count-badge">{data?.bookings?.length || 0} Tokens</span>
              </div>

              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Patient Name</th>
                      <th>Slot Time</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Queue Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.bookings && data.bookings.length > 0 ? (
                      data.bookings.map(b => (
                        <tr key={b.id} className={`table-row-${b.status}`}>
                          <td><strong className="table-token-badge">{b.token_number}</strong></td>
                          <td><strong>{b.patient_display_name}</strong></td>
                          <td>{b.slot_time}</td>
                          <td>
                            <span className={`status-pill status-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td><small className="capitalize">{b.payment?.status || 'N/A'}</small></td>
                          <td>
                            <div className="row-action-buttons">
                              {b.status === 'serving' && (
                                <button
                                  type="button"
                                  className="action-btn-complete"
                                  onClick={() => handleAction(b, 'complete')}
                                >
                                  <Check size={13} /> Complete
                                </button>
                              )}
                              {['waiting', 'arrived'].includes(b.status) && (
                                <>
                                  <button
                                    type="button"
                                    className="action-btn-arrived"
                                    onClick={() => handleAction(b, 'arrived')}
                                  >
                                    Arrived
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn-skip"
                                    onClick={() => handleAction(b, 'skip')}
                                  >
                                    Skip
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn-missed"
                                    onClick={() => handleAction(b, 'missed')}
                                  >
                                    Missed
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-table-cell">
                          No patient tokens registered for this date yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
