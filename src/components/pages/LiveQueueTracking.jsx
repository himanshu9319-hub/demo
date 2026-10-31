import { useState, useMemo, useEffect } from 'react'
import {
  Activity, Users, Clock, Bell, MapPin, Calendar, Check, AlertCircle,
  Ticket, ArrowRight, RefreshCw, XCircle, Stethoscope, ChevronRight,
  ShieldCheck, Sparkles, CheckCircle2, UserCheck, Play, Radio
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiRequest } from '../../lib/queueApi'

export function LiveQueueTracking({
  bookings = [],
  activeToken = null,
  patientName = '',
  onCancelBooking,
  onNavigate,
  onViewLocation,
  refreshBookings,
}) {
  const activeBooking = bookings.find(b => ['waiting', 'serving', 'arrived'].includes(b.status)) || activeToken

  const tokenNumber = activeBooking?.token_number || activeBooking?.id || (bookings.length > 0 ? 'A-025' : 'A-025')
  const hospitalName = activeBooking?.hospital_name || activeBooking?.hospital || 'AIIMS Rishikesh'
  const hospitalCity = activeBooking?.hospital_city || activeBooking?.city || 'Rishikesh, Uttarakhand'
  const departmentName = activeBooking?.department_name || activeBooking?.department || 'General Medicine'
  const doctorName = activeBooking?.doctor_name || activeBooking?.doctor || 'Dr. Ananya Rao'
  const opdRoom = activeBooking?.room || 'OPD Room 102, 1st Floor'

  // Parse user's token prefix & number (e.g., "A-025" -> prefix "A-", num 25)
  const { tokenPrefix, userTokenNum } = useMemo(() => {
    const raw = String(tokenNumber).trim()
    const match = raw.match(/^([A-Za-z]+-?)?(\d+)$/)
    if (match) {
      return {
        tokenPrefix: match[1] || 'A-',
        userTokenNum: parseInt(match[2], 10),
      }
    }
    return { tokenPrefix: 'A-', userTokenNum: 25 }
  }, [tokenNumber])

  // Current token being examined by doctor (defaults to 12 seats before user)
  const [currentServingNum, setCurrentServingNum] = useState(() => Math.max(1, userTokenNum - 12))
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'before' | 'completed'
  const [cancelling, setCancelling] = useState(false)
  const [cancelMessage, setCancelMessage] = useState('')
  const [consultationSeconds, setConsultationSeconds] = useState(380) // 6m 20s

  // Consultation live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setConsultationSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Format token helper
  const formatToken = (num) => `${tokenPrefix}${String(num).padStart(3, '0')}`

  // Key derived metrics
  const currentDoctorToken = formatToken(currentServingNum)
  const isUserTurn = currentServingNum === userTokenNum
  const isUserPast = currentServingNum > userTokenNum
  const patientsAhead = Math.max(0, userTokenNum - currentServingNum)
  const previousSeatsCount = Math.max(0, patientsAhead - 1)
  const estimatedWait = patientsAhead * 2 // ~2 mins per checkup

  // Generate the full sequence of allotment seats in the doctor's queue
  const queueAllotments = useMemo(() => {
    const startNum = Math.max(1, currentServingNum - 3)
    const endNum = userTokenNum + 3
    const list = []

    const demoNames = [
      'R. Verma', 'S. Gupta', 'P. Nair', 'M. Joshi', 'A. Sharma',
      'K. Malhotra', 'V. Singh', 'T. Roy', 'N. Patel', 'D. Sen',
      'H. Trivedi', 'B. Rao', 'C. Sundaram', 'G. Saxena', 'E. Khanna'
    ]

    for (let num = startNum; num <= endNum; num++) {
      const isServing = num === currentServingNum
      const isNext = num === currentServingNum + 1 && num < userTokenNum
      const isUser = num === userTokenNum
      const isDone = num < currentServingNum
      const isAhead = num > currentServingNum && num < userTokenNum
      const isBehind = num > userTokenNum

      let status = 'waiting'
      let statusLabel = 'Waiting in Lounge'
      if (isDone) {
        status = 'completed'
        statusLabel = 'Checked & Completed'
      } else if (isServing) {
        status = 'serving'
        statusLabel = 'With Doctor (Examining Now)'
      } else if (isUser && isServing) {
        status = 'user-now'
        statusLabel = 'YOUR TURN - Inside Doctor Room'
      } else if (isUser) {
        status = 'user'
        statusLabel = 'YOUR ALLOTMENT SEAT'
      } else if (isNext) {
        status = 'next'
        statusLabel = 'Next in Line (At OPD Door)'
      } else if (isAhead) {
        status = 'ahead'
        statusLabel = 'Allotted Ahead of You'
      } else if (isBehind) {
        status = 'behind'
        statusLabel = 'Allotted Behind You'
      }

      const nameIndex = (num * 3) % demoNames.length
      const userDisplayName = patientName || activeBooking?.patient_name || 'You'
      const seatPatientName = isUser ? `${userDisplayName} (You)` : `Patient ${demoNames[nameIndex]}`
      const waitMinutes = isDone ? 0 : Math.max(0, (num - currentServingNum) * 2)

      list.push({
        num,
        token: formatToken(num),
        seatPosition: num <= currentServingNum ? `Served` : `Seat #${num - currentServingNum}`,
        patientName: seatPatientName,
        status,
        statusLabel,
        isUser,
        isServing,
        isDone,
        isAhead,
        waitMinutes,
        room: opdRoom,
        checkinTime: `09:${String(10 + (num % 45)).padStart(2, '0')} AM`,
      })
    }
    return list
  }, [currentServingNum, userTokenNum, opdRoom])

  // Filtered queue seats based on user selection
  const displayedAllotments = useMemo(() => {
    if (filterTab === 'before') {
      return queueAllotments.filter(seat => seat.isAhead || seat.isServing)
    }
    if (filterTab === 'completed') {
      return queueAllotments.filter(seat => seat.isDone)
    }
    return queueAllotments
  }, [queueAllotments, filterTab])

  // Interactive simulation: doctor finishes one patient and calls next
  const handleSimulateNextToken = () => {
    if (currentServingNum < userTokenNum + 4) {
      setCurrentServingNum(prev => prev + 1)
      setConsultationSeconds(0)
    }
  }

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
      {/* Header Row */}
      <div className="page-header-row">
        <div className="title-with-icon">
          <Activity size={24} className="text-primary-blue" />
          <div>
            <h1 className="page-main-title">Live Queue Compass</h1>
            <p className="page-main-sub">
              Real-time OPD queue board for <strong>{hospitalName}</strong>, {hospitalCity}
            </p>
          </div>
        </div>

        <div className="header-actions-group">
          <button
            type="button"
            className="btn-simulate-call-token"
            onClick={handleSimulateNextToken}
            title="Simulate doctor completing current patient and calling next"
          >
            <Play size={13} />
            <span>Simulate Call Next</span>
          </button>

          <button type="button" className="refresh-queue-btn" onClick={() => refreshBookings?.()}>
            <RefreshCw size={14} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {cancelMessage && (
        <div className="info-banner" role="status">
          <Check size={16} />
          <span>{cancelMessage}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: WHICH TOKEN PERSON DOCTOR CHECKS (Live Examination Room)
          ========================================================================= */}
      <motion.div
        className="doctor-examining-hero-card"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="doctor-examining-header">
          <div className="examining-live-badge">
            <span className="live-radar-dot" />
            <Radio size={14} />
            <span>DOCTOR CONSULTATION IN PROGRESS</span>
          </div>
          <span className="examining-room-pill">📍 {opdRoom}</span>
        </div>

        <div className="doctor-examining-body">
          <div className="doctor-avatar-box">
            <Stethoscope size={30} />
          </div>

          <div className="doctor-examining-info">
            <span className="examining-kicker">DOCTOR IS CURRENTLY CHECKING</span>
            <div className="examining-token-row">
              <strong className="examining-token-highlight">{currentDoctorToken}</strong>
              <span className="examining-patient-status">
                🩺 Patient with {doctorName}
              </span>
            </div>
            <p className="examining-doctor-sub">
              Specialist: <strong>{doctorName}</strong> · Department: <strong>{departmentName}</strong>
            </p>
          </div>

          <div className="consultation-timer-box">
            <small>EXAMINATION TIME</small>
            <strong className="timer-digits">{formatTimer(consultationSeconds)}</strong>
            <span>Avg ~ 10 min/patient</span>
          </div>
        </div>

        {/* Next token alert */}
        <div className="doctor-examining-footer">
          <span className="next-alert-text">
            📢 <strong>Next in Line to Enter:</strong> Token <strong>{formatToken(currentServingNum + 1)}</strong> (Please be ready at the door)
          </span>
        </div>
      </motion.div>

      {/* =========================================================================
          SECTION 2: WHICH NUMBER YOU HAD (Your Allotment Seat Hero)
          ========================================================================= */}
      <div className={`live-queue-hero-card ${isUserTurn ? 'turn-active-glow' : ''}`}>
        <div className="queue-hero-left">
          <div className="token-hero-badge-wrap">
            <div className="token-label-row">
              <span className="token-field-label">YOUR TOKEN NUMBER</span>
              <span className="user-token-star-pill">
                <Sparkles size={13} />
                <span>YOUR ALLOTMENT SEAT #{patientsAhead + 1}</span>
              </span>
            </div>

            <div className="token-and-status">
              <strong className="token-hero-number">{tokenNumber}</strong>
              <span className={`pill-status-inqueue ${isUserTurn ? 'is-turn-now' : ''}`}>
                <span className="green-pulse-dot" />
                {isUserTurn ? '🎉 YOUR TURN NOW!' : (isUserPast ? 'Completed' : '● Confirmed in Queue')}
              </span>
            </div>

            <p className="token-facility-sub">
              Facility: <strong>{hospitalName}</strong> · City: <strong>{hospitalCity}</strong>
            </p>
            <p className="token-doctor-sub">
              OPD: <strong>{departmentName}</strong> · Consulting: <strong>{doctorName}</strong>
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="queue-quick-metrics">
            <div className="queue-metric-col">
              <div className="metric-icon-wrap cyan-bg">
                <Users size={20} className="cyan-text" />
              </div>
              <div className="metric-text-wrap">
                <span className="metric-lbl">Allotment Seats Ahead</span>
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

        {/* Circular Turn Gauge */}
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
                strokeDashoffset={Math.max(20, 350 - (patientsAhead / 15) * 350)}
              />
            </svg>
            <div className="gauge-center-content">
              {isUserTurn ? (
                <>
                  <CheckCircle2 size={28} className="text-green" />
                  <strong className="gauge-turn-text text-green">Please Enter<br />Room 102</strong>
                </>
              ) : (
                <>
                  <Users size={24} className="gauge-center-icon" />
                  <strong className="gauge-turn-text">Your Turn<br />{patientsAhead <= 2 ? 'Very Soon!' : 'Soon...'}</strong>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification banner */}
      <div className="queue-notification-banner">
        <Bell size={18} className="notification-bell-icon" />
        <span>
          {isUserTurn
            ? `It is your turn! Please step inside ${opdRoom} to meet ${doctorName}.`
            : `You have token ${tokenNumber}. ${patientsAhead} allotment seats are ahead of you before your consultation.`}
        </span>
      </div>

      {/* =========================================================================
          SECTION 3: PREVIOUS ALLOTMENT SEATS AHEAD (Live Allotment Board)
          ========================================================================= */}
      <section className="live-allotment-board-section">
        <div className="allotment-board-header">
          <div>
            <div className="allotment-header-tag">QUEUE SEAT SEQUENCE & HISTORY</div>
            <h3 className="allotment-board-title">
              Live Allotment Seats ({queueAllotments.length} Active in OPD Session)
            </h3>
            <p className="allotment-board-sub">
              Below is the sequence of all seats allocated before your turn, showing currently checked tokens and waiting seats.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="allotment-filter-pills">
            <button
              type="button"
              className={`filter-pill ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All Seats ({queueAllotments.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterTab === 'before' ? 'active' : ''}`}
              onClick={() => setFilterTab('before')}
            >
              Seats Ahead of You ({patientsAhead})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterTab === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterTab('completed')}
            >
              Checked by Doctor ({queueAllotments.filter(s => s.isDone).length})
            </button>
          </div>
        </div>

        {/* Allotment Seats Cards List */}
        <div className="allotment-seats-list">
          {displayedAllotments.map((seat) => {
            return (
              <motion.div
                key={seat.token}
                className={`allotment-seat-card ${seat.status} ${seat.isUser ? 'is-user-seat' : ''} ${seat.isServing ? 'is-doctor-examining' : ''}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                {/* Seat Position Column */}
                <div className="seat-col-pos">
                  <span className="seat-badge">{seat.seatPosition}</span>
                  {seat.isUser && <span className="you-star-tag">⭐ YOU</span>}
                </div>

                {/* Token ID */}
                <div className="seat-col-token">
                  <strong className="seat-token-number">{seat.token}</strong>
                  <small className="seat-checkin-time">Check-in: {seat.checkinTime}</small>
                </div>

                {/* Patient / Doctor Details */}
                <div className="seat-col-details">
                  <span className="seat-patient-name">
                    {seat.patientName}
                  </span>
                  <small className="seat-consultant-sub">
                    {seat.isServing
                      ? `Examining with ${doctorName}`
                      : `Scheduled with ${doctorName} · ${departmentName}`}
                  </small>
                </div>

                {/* Live Status Badge */}
                <div className="seat-col-status">
                  {seat.isServing && (
                    <span className="pill-seat-status serving">
                      <span className="radar-dot green" />
                      🩺 With Doctor Now
                    </span>
                  )}
                  {seat.status === 'next' && (
                    <span className="pill-seat-status next">
                      🔔 Next in Line (At Door)
                    </span>
                  )}
                  {seat.isUser && !seat.isServing && (
                    <span className="pill-seat-status user-turn">
                      ⭐ Your Seat (#{patientsAhead + 1} in Line)
                    </span>
                  )}
                  {seat.status === 'ahead' && (
                    <span className="pill-seat-status ahead">
                      ⏳ Waiting in Lounge
                    </span>
                  )}
                  {seat.status === 'behind' && (
                    <span className="pill-seat-status behind">
                      ⏳ In Queue Behind You
                    </span>
                  )}
                  {seat.isDone && (
                    <span className="pill-seat-status done">
                      ✓ Checked & Completed
                    </span>
                  )}
                </div>

                {/* Estimated Call / Wait */}
                <div className="seat-col-wait">
                  <small>EST. CALL</small>
                  <strong>
                    {seat.isDone ? 'Finished' : (seat.isServing ? 'Examining Now' : `~ ${seat.waitMinutes} min`)}
                  </strong>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Bottom Actions */}
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
