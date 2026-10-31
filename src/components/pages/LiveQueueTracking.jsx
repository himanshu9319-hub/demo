import { useState } from 'react'
import {
  Activity, Users, Clock, Bell, MapPin, Calendar, Check, AlertCircle,
  Ticket, ArrowRight, RefreshCw, XCircle
} from 'lucide-react'
import { apiRequest } from '../../lib/queueApi'

export function LiveQueueTracking({
  bookings = [],
  activeToken = null,
  onCancelBooking,
  onNavigate,
  onViewLocation,
  refreshBookings,
}) {
  const activeBooking = bookings.find(b => ['waiting', 'serving', 'arrived'].includes(b.status)) || activeToken

  const tokenNumber = activeBooking?.token_number || activeBooking?.id || (bookings.length > 0 ? 'A-025' : 'A-025')
  const patientsAhead = activeBooking?.queue_position ? Math.max(0, activeBooking.queue_position - 1) : 12
  const estimatedWait = activeBooking?.estimated_wait_minutes ?? 20
  const hospitalName = activeBooking?.hospital_name || activeBooking?.hospital || 'AIIMS Rishikesh'
  const hospitalCity = activeBooking?.hospital_city || activeBooking?.city || 'Rishikesh'
  const departmentName = activeBooking?.department_name || activeBooking?.department || 'General Medicine'
  const doctorName = activeBooking?.doctor_name || activeBooking?.doctor || 'Dr. Ananya Rao'

  const [cancelling, setCancelling] = useState(false)
  const [cancelMessage, setCancelMessage] = useState('')

  const handleCancel = async () => {
    if (!activeBooking?.id) return
    if (!window.confirm('Are you sure you want to cancel this OPD appointment? Hospital refund policy will be applied.')) return
    setCancelling(true)
    try {
      if (onCancelBooking) {
        await onCancelBooking(activeBooking)
      } else {
        await apiRequest(`/bookings/${activeBooking.id}/cancel/`, {
          method: 'POST',
          body: { reason: 'patient_request' }
        })
        refreshBookings?.()
      }
      setCancelMessage('Appointment cancelled. Eligible refund processed.')
    } catch (err) {
      setCancelMessage(err.message || 'Could not cancel booking.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="live-queue-tracking-container">
      <div className="page-header-row">
        <div className="title-with-icon">
          <Activity size={24} className="text-primary-blue" />
          <h1 className="page-main-title">Live Queue Tracking</h1>
        </div>
        <button type="button" className="refresh-queue-btn" onClick={() => refreshBookings?.()}>
          <RefreshCw size={14} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {cancelMessage && (
        <div className="info-banner" role="status">
          <Check size={16} />
          <span>{cancelMessage}</span>
        </div>
      )}

      {/* Main Large Queue Card (Panel 5 of Mockup) */}
      <div className="live-queue-hero-card">
        <div className="queue-hero-left">
          {/* Token Header */}
          <div className="token-hero-badge-wrap">
            <span className="token-field-label">Your Token Number</span>
            <div className="token-and-status">
              <strong className="token-hero-number">{tokenNumber}</strong>
              <span className="pill-status-inqueue">
                <span className="green-pulse-dot" />
                In Queue
              </span>
            </div>
            <p className="token-facility-sub">
              <strong>{hospitalName}</strong>, <span>{hospitalCity}</span> · {departmentName} · {doctorName}
            </p>
          </div>

          {/* Stats Metrics Row */}
          <div className="queue-quick-metrics">
            <div className="queue-metric-col">
              <div className="metric-icon-wrap cyan-bg">
                <Users size={20} className="cyan-text" />
              </div>
              <div className="metric-text-wrap">
                <span className="metric-lbl">Patients Ahead</span>
                <strong className="metric-num">{patientsAhead}</strong>
              </div>
            </div>

            <div className="metric-divider-v" />

            <div className="queue-metric-col">
              <div className="metric-icon-wrap orange-bg">
                <Clock size={20} className="orange-text" />
              </div>
              <div className="metric-text-wrap">
                <span className="metric-lbl">Estimated Wait</span>
                <strong className="metric-num">~ {estimatedWait} min</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="queue-hero-right">
          <div className="circular-gauge-container">
            <svg className="circular-gauge-svg" viewBox="0 0 140 140">
              <circle
                className="gauge-bg-circle"
                cx="70"
                cy="70"
                r="56"
                strokeWidth="12"
              />
              <circle
                className="gauge-fill-circle"
                cx="70"
                cy="70"
                r="56"
                strokeWidth="12"
                strokeDasharray="351.8"
                strokeDashoffset="110"
              />
            </svg>
            <div className="gauge-center-content">
              <Users size={24} className="gauge-center-icon" />
              <strong className="gauge-turn-text">Your Turn<br />Soon...</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Blue Alert Notification Banner */}
      <div className="queue-notification-banner">
        <Bell size={18} className="notification-bell-icon" />
        <span>You will be notified when your turn is near.</span>
      </div>

      {/* Action Buttons */}
      <div className="queue-bottom-actions">
        <button
          type="button"
          className="btn-secondary-white"
          onClick={() => onViewLocation?.({ name: hospitalName })}
        >
          <MapPin size={16} />
          <span>View Hospital Location & Directions</span>
        </button>

        <button
          type="button"
          className="btn-cancel-token"
          onClick={handleCancel}
          disabled={cancelling}
        >
          <XCircle size={16} />
          <span>{cancelling ? 'Cancelling…' : 'Cancel Appointment'}</span>
        </button>
      </div>
    </div>
  )
}
