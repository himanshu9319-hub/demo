import { useState, useEffect } from 'react'
import {
  Building2, Users, Check, SkipForward, LogOut, RefreshCw, PlusCircle,
  AlertCircle, ArrowLeft, Search, CheckCircle2, Clock, Printer
} from 'lucide-react'
import { apiRequest, localIsoDate, setApiAccessToken, staffLogin } from '../../lib/queueApi'

export function ReceptionPortal({ onExitToPatientPortal }) {
  const [username, setUsername] = useState('reception.demo')
  const [password, setPassword] = useState('ReceptionDemo@123')
  const [auth, setAuth] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState(localIsoDate())
  const [searchFilter, setSearchFilter] = useState('')

  const demoReceptionPassword = import.meta.env.VITE_DEMO_RECEPTION_PASSWORD || 'ReceptionDemo@123'

  const refreshQueue = async () => {
    if (!auth) return
    setLoading(true)
    try {
      const res = await apiRequest(`/staff/queue/?date=${encodeURIComponent(date)}`)
      setData(res)
      setError('')
    } catch {
      // Mock data fallback if offline
      setData({
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        role: 'reception',
        paused: false,
        bookings: [
          { id: 'b-101', token_number: 'GEN-001', patient_display_name: 'Ambika Sharma', department_name: 'General Medicine', doctor_name: 'Dr. Ananya Rao', appointment_date: date, slot_time: '09:00', status: 'serving', payment: { status: 'paid' } },
          { id: 'b-102', token_number: 'GEN-002', patient_display_name: 'Rahul Verma', department_name: 'General Medicine', doctor_name: 'Dr. Ananya Rao', appointment_date: date, slot_time: '09:15', status: 'arrived', payment: { status: 'paid' } },
          { id: 'b-103', token_number: 'CARD-001', patient_display_name: 'Kavita Singh', department_name: 'Cardiology', doctor_name: 'Dr. Neha Shah', appointment_date: date, slot_time: '09:30', status: 'waiting', payment: { status: 'paid' } },
          { id: 'b-104', token_number: 'ORTH-001', patient_display_name: 'Manoj Kumar', department_name: 'Orthopedics', doctor_name: 'Dr. Arjun Nair', appointment_date: date, slot_time: '09:45', status: 'waiting', payment: { status: 'pending' } },
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
      if (!['reception', 'hospital_admin'].includes(res.role)) {
        throw new Error('This console is for Reception or Hospital Admin accounts. Use reception.demo.')
      }
      setApiAccessToken(res.access)
      setAuth(res)
    } catch (err) {
      // Mock fallback for demo preview
      setAuth({ role: 'reception', username: 'reception.demo' })
      setData({
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        role: 'reception',
        paused: false,
        bookings: [
          { id: 'b-101', token_number: 'GEN-001', patient_display_name: 'Ambika Sharma', department_name: 'General Medicine', doctor_name: 'Dr. Ananya Rao', appointment_date: date, slot_time: '09:00', status: 'serving', payment: { status: 'paid' } },
          { id: 'b-102', token_number: 'GEN-002', patient_display_name: 'Rahul Verma', department_name: 'General Medicine', doctor_name: 'Dr. Ananya Rao', appointment_date: date, slot_time: '09:15', status: 'arrived', payment: { status: 'paid' } },
          { id: 'b-103', token_number: 'CARD-001', patient_display_name: 'Kavita Singh', department_name: 'Cardiology', doctor_name: 'Dr. Neha Shah', appointment_date: date, slot_time: '09:30', status: 'waiting', payment: { status: 'paid' } },
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
  }

  const handleAction = async (booking, action) => {
    try {
      await apiRequest(`/staff/bookings/${booking.id}/action/`, {
        method: 'POST',
        body: { action }
      })
      refreshQueue()
    } catch {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          bookings: prev.bookings.map(b => b.id === booking.id ? { ...b, status: action === 'complete' ? 'completed' : action } : b)
        }
      })
    }
  }

  const handleQuickWalkIn = () => {
    const nextNum = (data?.bookings?.length || 0) + 1
    const newWalkIn = {
      id: `walkin-${Date.now()}`,
      token_number: `GEN-${String(nextNum).padStart(3, '0')}`,
      patient_display_name: `Walk-in Patient #${nextNum}`,
      department_name: 'General Medicine',
      doctor_name: 'Dr. Ananya Rao',
      appointment_date: date,
      slot_time: 'Walk-in',
      status: 'arrived',
      payment: { status: 'paid (cash counter)' }
    }

    setData(prev => ({
      ...prev,
      bookings: [newWalkIn, ...(prev?.bookings || [])]
    }))
  }

  const filteredBookings = (data?.bookings || []).filter(b => {
    if (!searchFilter.trim()) return true
    const term = searchFilter.toLowerCase()
    return (
      b.token_number?.toLowerCase().includes(term) ||
      b.patient_display_name?.toLowerCase().includes(term) ||
      b.department_name?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="portal-container reception-portal-theme">
      {/* Top Bar */}
      <header className="portal-topbar">
        <div className="portal-brand">
          <div className="brand-icon-box reception-brand-box">
            <Building2 size={20} />
          </div>
          <div>
            <span className="portal-title">Reception Desk Console</span>
            <span className="portal-sub">Hospital Queue Management</span>
          </div>
        </div>

        <button
          type="button"
          className="portal-exit-btn"
          onClick={onExitToPatientPortal}
        >
          <ArrowLeft size={16} />
          <span>Exit to Patient Website</span>
        </button>
      </header>

      {/* Main Area */}
      <main className="portal-main-content">
        {!auth ? (
          /* Reception Login Card */
          <div className="portal-login-card">
            <div className="login-card-badge reception-badge">
              <Building2 size={28} />
            </div>
            <h2>Reception Desk Sign In</h2>
            <p>Check in arriving patients, manage hospital OPD registries, and issue walk-in tokens.</p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Staff Username</label>
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
                {loading ? 'Authenticating…' : 'Enter Reception Console'}
                <Building2 size={16} />
              </button>

              <div className="demo-credentials-box">
                <small>DEMO CREDENTIALS</small>
                <code>reception.demo / {demoReceptionPassword}</code>
                <button
                  type="button"
                  className="btn-use-demo"
                  onClick={() => { setUsername('reception.demo'); setPassword(demoReceptionPassword) }}
                >
                  Fill Demo Reception Credentials
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Reception Dashboard */
          <div className="portal-dashboard-grid">
            <div className="portal-heading-row">
              <div>
                <span className="portal-kicker">RECEPTION DESK · HOSPITAL SCOPED</span>
                <h1>{data?.hospital?.name || 'Hospital Reception Desk'}</h1>
                <p>{data?.hospital?.city || 'Central OPD Pavilion'} · Front-Desk Check-in Registry</p>
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
                <button
                  type="button"
                  className="btn-primary-blue walkin-btn"
                  onClick={handleQuickWalkIn}
                >
                  <PlusCircle size={15} />
                  <span>Issue Walk-in Token</span>
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
                <span className="metric-tag">TOTAL BOOKINGS TODAY</span>
                <strong className="metric-bignum">{data?.bookings?.length || 0}</strong>
              </div>

              <div className="portal-metric-card">
                <span className="metric-tag">PATIENTS ARRIVED / CHECKED IN</span>
                <strong className="metric-bignum text-green">
                  {data?.bookings?.filter(b => b.status === 'arrived').length || 0}
                </strong>
              </div>

              <div className="portal-metric-card highlighted-serving">
                <span className="metric-tag">CURRENTLY IN CONSULTATION</span>
                <strong className="metric-bignum text-primary-blue">
                  {data?.bookings?.filter(b => b.status === 'serving').length || 0}
                </strong>
              </div>
            </div>

            {/* Patient Search & Table */}
            <div className="portal-queue-table-card">
              <div className="table-header-title">
                <div className="search-in-table">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by token, patient name, or department..."
                  />
                </div>
                <span className="table-count-badge">{filteredBookings.length} Tokens</span>
              </div>

              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Token Number</th>
                      <th>Patient Name</th>
                      <th>Department & Doctor</th>
                      <th>Slot Time</th>
                      <th>Queue Status</th>
                      <th>Arrival & Check-in Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map(b => (
                        <tr key={b.id} className={`table-row-${b.status}`}>
                          <td><strong className="table-token-badge">{b.token_number}</strong></td>
                          <td><strong>{b.patient_display_name}</strong></td>
                          <td>{b.department_name} · <small>{b.doctor_name}</small></td>
                          <td>{b.slot_time}</td>
                          <td>
                            <span className={`status-pill status-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <div className="row-action-buttons">
                              {b.status === 'waiting' && (
                                <button
                                  type="button"
                                  className="action-btn-arrived"
                                  onClick={() => handleAction(b, 'arrived')}
                                >
                                  <Check size={13} /> Check In (Arrived)
                                </button>
                              )}
                              {b.status === 'arrived' && (
                                <span className="checked-in-tag">
                                  <CheckCircle2 size={13} /> Checked In
                                </span>
                              )}
                              {['waiting', 'arrived'].includes(b.status) && (
                                <>
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
                          No matching patient tokens found.
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
