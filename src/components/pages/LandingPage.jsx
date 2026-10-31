import { useState } from 'react'
import {
  Activity, ArrowRight, Calendar, HeartPulse, Phone, Mail, ShieldCheck,
  Stethoscope, Users, Building2, Check, AlertCircle, Sparkles, User, Menu, X, Lock,
  Shield
} from 'lucide-react'
import { motion } from 'framer-motion'
import { deriveNameFromEmail } from '../../lib/appData'
import { CardSpotlight } from '../ui/AceternityCards'
import { staffLogin, setApiAccessToken } from '../../lib/queueApi'

export function LandingPage({
  onLoginSuccess,
  onDoctorLoginSuccess,
  onReceptionLoginSuccess,
}) {
  // Active Role on Starting Login Page: 'patient' | 'doctor' | 'reception'
  const [activeRole, setActiveRole] = useState('patient')

  // Patient Login State
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [nameCustomized, setNameCustomized] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')

  // Staff Credentials State
  const demoDoctorPassword = import.meta.env.VITE_DEMO_DOCTOR_PASSWORD || 'DoctorDemo@123'
  const demoReceptionPassword = import.meta.env.VITE_DEMO_RECEPTION_PASSWORD || 'ReceptionDemo@123'

  const [doctorUsername, setDoctorUsername] = useState('doctor.demo')
  const [doctorPassword, setDoctorPassword] = useState(demoDoctorPassword)

  const [receptionUsername, setReceptionUsername] = useState('reception.demo')
  const [receptionPassword, setReceptionPassword] = useState(demoReceptionPassword)

  // Status & UI
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // --------------------------------------------------------------------------
  // PATIENT LOGIN HANDLERS
  // --------------------------------------------------------------------------
  const handleEmailChange = (val) => {
    setEmail(val)
    if (!nameCustomized) {
      const derived = deriveNameFromEmail(val, '')
      setFullName(derived)
    }
  }

  const handleNameChange = (val) => {
    setFullName(val)
    setNameCustomized(true)
  }

  const handleRequestOtp = (e) => {
    e?.preventDefault()
    setError('')
    const trimmedPhone = phone.trim()
    const digitsOnly = trimmedPhone.replace(/\D/g, '')

    if (digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    const trimmedEmail = email.trim()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).')
      return
    }

    // Generate simulated 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setGeneratedOtp(code)
    setOtpStep(true)
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    setError('')
    if (otp !== generatedOtp && otp !== '123456') {
      setError('Invalid OTP code. Please enter the 6-digit code shown below.')
      return
    }

    setLoading(true)
    try {
      const cleanPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`
      const userEmail = email.trim() || 'patient@example.com'
      const userName = fullName.trim() || deriveNameFromEmail(userEmail, 'Patient User')
      await onLoginSuccess({ phone: cleanPhone, email: userEmail, name: userName })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoPatient = async () => {
    setLoading(true)
    setError('')
    try {
      await onLoginSuccess({
        phone: '+919876543210',
        email: 'priya.sharma@example.com',
        name: 'Priya Sharma'
      })
    } catch (err) {
      setError(err.message || 'Quick patient login failed.')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------------------------------
  // DOCTOR LOGIN HANDLERS
  // --------------------------------------------------------------------------
  const handleDoctorSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await staffLogin(doctorUsername, doctorPassword)
      if (res.role !== 'doctor') {
        throw new Error('This account is not designated as a Doctor. Please use doctor credentials.')
      }
      setApiAccessToken(res.access)
      await onDoctorLoginSuccess?.(res)
    } catch {
      // Offline fallback demo doctor session
      const fallback = {
        role: 'doctor',
        username: doctorUsername || 'doctor.demo',
        display_name: 'Dr. Ananya Rao',
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        access: 'mock-doctor-token'
      }
      setApiAccessToken(fallback.access)
      await onDoctorLoginSuccess?.(fallback)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoDoctor = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await staffLogin('doctor.demo', demoDoctorPassword)
      setApiAccessToken(res.access)
      await onDoctorLoginSuccess?.(res)
    } catch {
      const fallback = {
        role: 'doctor',
        username: 'doctor.demo',
        display_name: 'Dr. Ananya Rao',
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        access: 'mock-doctor-token'
      }
      setApiAccessToken(fallback.access)
      await onDoctorLoginSuccess?.(fallback)
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------------------------------
  // RECEPTIONIST LOGIN HANDLERS
  // --------------------------------------------------------------------------
  const handleReceptionSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await staffLogin(receptionUsername, receptionPassword)
      if (!['reception', 'hospital_admin'].includes(res.role)) {
        throw new Error('This account is not designated for Reception Desk. Please use reception credentials.')
      }
      setApiAccessToken(res.access)
      await onReceptionLoginSuccess?.(res)
    } catch {
      // Offline fallback demo receptionist session
      const fallback = {
        role: 'reception',
        username: receptionUsername || 'reception.demo',
        display_name: 'Central Reception Desk',
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        access: 'mock-reception-token'
      }
      setApiAccessToken(fallback.access)
      await onReceptionLoginSuccess?.(fallback)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoReception = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await staffLogin('reception.demo', demoReceptionPassword)
      setApiAccessToken(res.access)
      await onReceptionLoginSuccess?.(res)
    } catch {
      const fallback = {
        role: 'reception',
        username: 'reception.demo',
        display_name: 'Central Reception Desk',
        hospital: { name: 'AIIMS Rishikesh', city: 'Rishikesh' },
        access: 'mock-reception-token'
      }
      setApiAccessToken(fallback.access)
      await onReceptionLoginSuccess?.(fallback)
    } finally {
      setLoading(false)
    }
  }

  const scrollToLoginCard = (role) => {
    setActiveRole(role)
    setError('')
    const el = document.getElementById('login-card-container')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-container landing-animated-entrance">
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="brand-logo-container">
            <span className="brand-icon-box">
              <Activity size={22} strokeWidth={2.5} />
            </span>
            <span className="brand-title">Queue<span>Free</span></span>
          </div>

          <div className="landing-nav-links">
            <a href="#home" className="active">Home</a>
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToLoginCard('patient') }}>Services</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToLoginCard('patient') }}>About</a>
            <a href="#help" onClick={(e) => { e.preventDefault(); scrollToLoginCard('patient') }}>Help</a>
          </div>

          <div className="landing-nav-actions">
            {/* Mobile Nav Hamburger Toggle */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer for Phones & Tablets */}
        {mobileMenuOpen && (
          <div className="landing-mobile-drawer">
            <div className="mobile-drawer-links">
              <a href="#home" className="active" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToLoginCard('patient') }}>OPD Services</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToLoginCard('patient') }}>About</a>
            </div>
          </div>
        )}
      </nav>

      {/* Main Hero Section */}
      <main className="landing-hero-section">
        <div className="landing-hero-grid">
          {/* Left Column: Hero Copy with Motto */}
          <div className="landing-hero-left">
            <div className="motto-tag-banner">
              <Sparkles size={14} className="motto-sparkle-icon" />
              <strong className="motto-highlight-text">“Skip the line, save your time.”</strong>
            </div>

            <div className="platform-tag">
              <span className="tag-pulse" />
              <span>Smart Healthcare OPD Platform</span>
            </div>

            <h1 className="hero-heading">
              Skip The Line, Save Your Time.<br />
              <span>Book Your OPD Online.</span>
            </h1>

            <p className="hero-description">
              Find nearby hospitals, book OPD appointments, track live queues and access emergency services from one platform.
            </p>

            {/* Hero CTA - Only Get Started, Explore Hospitals Removed */}
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary-blue"
                onClick={() => {
                  scrollToLoginCard('patient')
                  setTimeout(() => {
                    document.getElementById('phone-login-input')?.focus()
                  }, 150)
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Feature Pills */}
            <div className="hero-feature-pills">
              <div
                className="feature-pill feature-pill-btn"
                onClick={() => scrollToLoginCard('patient')}
                title="Online OPD Booking"
              >
                <Calendar size={15} className="pill-icon" />
                <span>Online OPD Booking</span>
              </div>
              <div
                className="feature-pill feature-pill-btn"
                onClick={() => scrollToLoginCard('patient')}
                title="Live Queue Tracking"
              >
                <Users size={15} className="pill-icon" />
                <span>Live Queue Tracking</span>
              </div>
              <div
                className="feature-pill feature-pill-btn"
                onClick={() => scrollToLoginCard('patient')}
                title="Emergency Bed Finder"
              >
                <HeartPulse size={15} className="pill-icon" />
                <span>Emergency Bed Finder</span>
              </div>
              <div
                className="feature-pill feature-pill-btn"
                onClick={() => scrollToLoginCard('patient')}
                title="Verified Healthcare Facilities"
              >
                <Building2 size={15} className="pill-icon" />
                <span>Multiple Hospitals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Role Login Card (Patient / Doctor / Receptionist) */}
          <div className="landing-hero-right" id="login-card-container">
            <CardSpotlight
              className="hero-login-card login-card-animated"
              spotlightColor="rgba(37, 99, 235, 0.12)"
            >
              {/* Role Selection Tabs */}
              <div className="login-role-tabs" role="tablist" aria-label="Choose Login Role">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRole === 'patient'}
                  className={`login-role-tab ${activeRole === 'patient' ? 'active' : ''}`}
                  onClick={() => { setActiveRole('patient'); setError('') }}
                >
                  <User size={15} />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRole === 'doctor'}
                  className={`login-role-tab ${activeRole === 'doctor' ? 'active doctor-tab' : ''}`}
                  onClick={() => { setActiveRole('doctor'); setError('') }}
                >
                  <Stethoscope size={15} />
                  <span>Doctor</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRole === 'reception'}
                  className={`login-role-tab ${activeRole === 'reception' ? 'active reception-tab' : ''}`}
                  onClick={() => { setActiveRole('reception'); setError('') }}
                >
                  <Building2 size={15} />
                  <span>Receptionist</span>
                </button>
              </div>

              {/* ========================================================= */}
              {/* ROLE 1: PATIENT LOGIN VIEW                                */}
              {/* ========================================================= */}
              {activeRole === 'patient' && (
                <>
                  <div className="login-card-header">
                    <h2>Welcome to <span>QueueFree</span></h2>
                    <p>Login with your mobile & email to book OPD appointments.</p>
                  </div>

                  {!otpStep ? (
                    <form onSubmit={handleRequestOtp} className="login-form">
                      {/* Phone Number Field */}
                      <div className="form-group">
                        <label htmlFor="phone-login-input">Mobile Number</label>
                        <div className="input-with-icon">
                          <Phone size={16} className="input-icon" />
                          <input
                            id="phone-login-input"
                            type="tel"
                            placeholder="Enter 10-digit mobile number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                            required
                          />
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="form-group">
                        <label htmlFor="email-login-input">Email Address</label>
                        <div className="input-with-icon">
                          <Mail size={16} className="input-icon" />
                          <input
                            id="email-login-input"
                            type="email"
                            placeholder="Enter email address (e.g. name@example.com)"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>

                      {/* Full Name Field (Auto-derived from email, editable) */}
                      <div className="form-group">
                        <label htmlFor="fullname-login-input">
                          Patient Name <span className="label-sub-hint">(Auto-fills from email)</span>
                        </label>
                        <div className="input-with-icon">
                          <User size={16} className="input-icon" />
                          <input
                            id="fullname-login-input"
                            type="text"
                            placeholder="Your full name (e.g. Priya Sharma)"
                            value={fullName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            autoComplete="name"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="form-error-banner" role="alert">
                          <AlertCircle size={14} />
                          <span>{error}</span>
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        className="btn-continue-otp"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? 'Sending OTP…' : 'Continue with OTP'}
                      </motion.button>

                      <div className="login-divider">
                        <span>OR</span>
                      </div>

                      <motion.button
                        type="button"
                        className="btn-quick-demo"
                        onClick={handleQuickDemoPatient}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Check size={16} className="demo-check-icon" />
                        <span>Quick Demo Patient (Priya Sharma)</span>
                      </motion.button>

                      <div className="anti-scam-notice">
                        <ShieldCheck size={15} />
                        <span>
                          <strong>Identity Assurance:</strong> ABHA ID verification is requested when booking an OPD appointment to ensure fair, verified token allocation.
                        </span>
                      </div>
                    </form>
                  ) : (
                    /* Step 2: OTP verification */
                    <form onSubmit={handleVerifyOtp} className="login-form otp-form">
                      <div className="otp-step-header">
                        <p>Welcome, <strong>{fullName || deriveNameFromEmail(email, 'Patient')}</strong>! Enter the 6-digit code sent to <strong>{phone}</strong></p>
                        <div className="simulated-otp-chip">
                          <span>Demo Code: <strong>{generatedOtp}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtp(generatedOtp)}
                            className="auto-fill-btn"
                          >
                            Auto-fill
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <input
                          type="text"
                          className="otp-code-input"
                          maxLength={6}
                          placeholder="••••••"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          autoFocus
                          required
                        />
                      </div>

                      {error && (
                        <div className="form-error-banner" role="alert">
                          <AlertCircle size={14} />
                          <span>{error}</span>
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        className="btn-continue-otp"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? 'Verifying…' : 'Verify & Enter Patient Dashboard'}
                      </motion.button>

                      <button
                        type="button"
                        className="btn-back-text"
                        onClick={() => { setOtpStep(false); setError('') }}
                      >
                        Change details
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* ROLE 2: DOCTOR LOGIN VIEW                                 */}
              {/* ========================================================= */}
              {activeRole === 'doctor' && (
                <div className="doctor-login-section">
                  <div className="login-card-header">
                    <h2>Doctor <span>OPD Console</span></h2>
                    <p>Sign in with staff credentials to manage patient consultations.</p>
                  </div>

                  <form onSubmit={handleDoctorSubmit} className="login-form">
                    <div className="form-group">
                      <label htmlFor="doctor-user-input">Doctor Staff ID / Username</label>
                      <div className="input-with-icon">
                        <Stethoscope size={16} className="input-icon" />
                        <input
                          id="doctor-user-input"
                          type="text"
                          placeholder="e.g. doctor.demo"
                          value={doctorUsername}
                          onChange={(e) => setDoctorUsername(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="doctor-pass-input">Password</label>
                      <div className="input-with-icon">
                        <Lock size={16} className="input-icon" />
                        <input
                          id="doctor-pass-input"
                          type="password"
                          placeholder="Enter your doctor password"
                          value={doctorPassword}
                          onChange={(e) => setDoctorPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="form-error-banner" role="alert">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      className="btn-continue-otp"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? 'Authenticating Doctor…' : 'Sign In to Doctor Console'}
                    </motion.button>

                    <div className="login-divider">
                      <span>OR</span>
                    </div>

                    <motion.button
                      type="button"
                      className="btn-quick-staff doctor-btn"
                      onClick={handleQuickDemoDoctor}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Stethoscope size={16} />
                      <span>Quick Demo Doctor (Dr. Ananya Rao · AIIMS)</span>
                    </motion.button>

                    <div className="anti-scam-notice">
                      <Shield size={15} />
                      <span>
                        <strong>Doctor Portal:</strong> Directly access designated OPD live queues, call next patient, update consultation status, and pause queue.
                      </span>
                    </div>
                  </form>
                </div>
              )}

              {/* ========================================================= */}
              {/* ROLE 3: RECEPTIONIST LOGIN VIEW                           */}
              {/* ========================================================= */}
              {activeRole === 'reception' && (
                <div className="reception-login-section">
                  <div className="login-card-header">
                    <h2>Reception <span>Desk Console</span></h2>
                    <p>Sign in to check-in arriving patients and issue walk-in tokens.</p>
                  </div>

                  <form onSubmit={handleReceptionSubmit} className="login-form">
                    <div className="form-group">
                      <label htmlFor="reception-user-input">Receptionist Staff ID / Username</label>
                      <div className="input-with-icon">
                        <Building2 size={16} className="input-icon" />
                        <input
                          id="reception-user-input"
                          type="text"
                          placeholder="e.g. reception.demo"
                          value={receptionUsername}
                          onChange={(e) => setReceptionUsername(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="reception-pass-input">Password</label>
                      <div className="input-with-icon">
                        <Lock size={16} className="input-icon" />
                        <input
                          id="reception-pass-input"
                          type="password"
                          placeholder="Enter reception desk password"
                          value={receptionPassword}
                          onChange={(e) => setReceptionPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="form-error-banner" role="alert">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      className="btn-continue-otp"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? 'Authenticating Reception…' : 'Sign In to Reception Desk'}
                    </motion.button>

                    <div className="login-divider">
                      <span>OR</span>
                    </div>

                    <motion.button
                      type="button"
                      className="btn-quick-staff reception-btn"
                      onClick={handleQuickDemoReception}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Building2 size={16} />
                      <span>Quick Demo Receptionist (Central Desk · AIIMS)</span>
                    </motion.button>

                    <div className="anti-scam-notice">
                      <ShieldCheck size={15} />
                      <span>
                        <strong>Reception Desk:</strong> Manage front-desk patient arrival check-in, issue walk-in physical tokens, and print OPD queue slips.
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </CardSpotlight>
          </div>
        </div>
      </main>
    </div>
  )
}
