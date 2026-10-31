import { useState } from 'react'
import {
  Activity, ArrowRight, Building, Calendar, HeartPulse, Phone, Mail, ShieldCheck,
  Stethoscope, Users, Building2, Check, AlertCircle, Sparkles, User, Menu, X
} from 'lucide-react'
import { motion } from 'framer-motion'
import { deriveNameFromEmail } from '../../lib/appData'
import { CardSpotlight } from '../ui/AceternityCards'

export function LandingPage({
  onLoginSuccess,
  onExploreHospitals,
  onOpenDoctorPortal,
  onOpenReceptionPortal,
}) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [nameCustomized, setNameCustomized] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

    // Generate a simulated 6-digit OTP
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

  const handleQuickDemoLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await onLoginSuccess({
        phone: '+919876543210',
        email: 'priya.sharma@example.com',
        name: 'Priya Sharma'
      })
    } catch (err) {
      setError(err.message || 'Quick login failed.')
    } finally {
      setLoading(false)
    }
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
            <a href="#hospitals" onClick={(e) => { e.preventDefault(); onExploreHospitals() }}>Hospitals</a>
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#help">Help</a>
          </div>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="staff-portal-btn doctor-link"
              onClick={onOpenDoctorPortal}
              title="Access Doctor OPD Console"
            >
              <Stethoscope size={15} />
              <span>Doctor Portal</span>
            </button>
            <button
              type="button"
              className="staff-portal-btn reception-link"
              onClick={onOpenReceptionPortal}
              title="Access Hospital Reception Desk"
            >
              <Building2 size={15} />
              <span>Reception Desk</span>
            </button>

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
              <a href="#hospitals" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onExploreHospitals() }}>Explore Hospitals</a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)}>OPD Services</a>
            </div>
            <div className="mobile-drawer-portals">
              <button
                type="button"
                className="mobile-portal-btn doctor"
                onClick={() => { setMobileMenuOpen(false); onOpenDoctorPortal() }}
              >
                <Stethoscope size={16} />
                <span>Doctor OPD Console</span>
              </button>
              <button
                type="button"
                className="mobile-portal-btn reception"
                onClick={() => { setMobileMenuOpen(false); onOpenReceptionPortal() }}
              >
                <Building2 size={16} />
                <span>Reception Desk</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Hero Section */}
      <main className="landing-hero-section">
        <div className="landing-hero-grid">
          {/* Left Column: Hero Copy with Exact Motto */}
          <div className="landing-hero-left">
            {/* Exactly requested Motto Pill */}
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

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary-blue"
                onClick={() => document.getElementById('phone-login-input')?.focus()}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-secondary-white"
                onClick={onExploreHospitals}
              >
                <Building size={16} />
                <span>Explore Hospitals</span>
              </button>
            </div>

            {/* Feature Pills */}
            <div className="hero-feature-pills">
              <div className="feature-pill">
                <Calendar size={15} className="pill-icon" />
                <span>Online OPD Booking</span>
              </div>
              <div className="feature-pill">
                <Users size={15} className="pill-icon" />
                <span>Live Queue Tracking</span>
              </div>
              <div className="feature-pill">
                <HeartPulse size={15} className="pill-icon" />
                <span>Emergency Bed Finder</span>
              </div>
              <div className="feature-pill">
                <Building2 size={15} className="pill-icon" />
                <span>Multiple Hospitals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Login Card with Aceternity Spotlight */}
          <div className="landing-hero-right">
            <CardSpotlight
              className="hero-login-card login-card-animated"
              spotlightColor="rgba(37, 99, 235, 0.12)"
            >
              <div className="login-card-header">
                <h2>Welcome to <span>QueueFree</span></h2>
                <p>Login with your mobile & email to manage OPD appointments.</p>
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

                  {/* Email Field (Requested by User) */}
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

                  {/* Full Name Field (Auto-updates with email, fully editable) */}
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
                    onClick={handleQuickDemoLogin}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Check size={16} className="demo-check-icon" />
                    <span>Quick Demo Patient Login (Priya Sharma)</span>
                  </motion.button>

                  <div className="anti-scam-notice">
                    <ShieldCheck size={15} />
                    <span>
                      <strong>Identity Assurance:</strong> ABHA ID verification is requested when booking an OPD appointment to ensure fair, verified token allocation.
                    </span>
                  </div>

                  <div className="login-card-footer">
                    <span>New to QueueFree? <a href="#create" onClick={(e) => { e.preventDefault(); handleQuickDemoLogin() }}>Create an account</a></span>
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
                    {loading ? 'Verifying…' : 'Verify & Enter Dashboard'}
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
            </CardSpotlight>
          </div>
        </div>
      </main>
    </div>
  )
}
