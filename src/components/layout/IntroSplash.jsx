import { useState, useEffect } from 'react'
import { Activity, Sparkles, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react'

export function IntroSplash({ onComplete }) {
  const [fadingOut, setFadingOut] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Initializing QueueFree Compass…')

  useEffect(() => {
    // Dynamic loading messages along the progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 4
        if (next < 25) {
          setStatusMessage('Initializing QueueFree Compass Engine…')
        } else if (next < 55) {
          setStatusMessage('Connecting to Live OPD Hospital Network…')
        } else if (next < 85) {
          setStatusMessage('Syncing Real-Time Doctor OPD Schedules…')
        } else {
          setStatusMessage('Ready. Skip the line, save your time.')
        }

        if (next >= 100) {
          clearInterval(interval)
          return 100
        }
        return next
      })
    }, 60)

    // Complete timer
    const timer = setTimeout(() => {
      setFadingOut(true)
      setTimeout(() => {
        onComplete()
      }, 500)
    }, 2100)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onComplete])

  const handleSkip = () => {
    setFadingOut(true)
    setTimeout(() => {
      onComplete()
    }, 250)
  }

  return (
    <div
      className={`intro-splash-overlay ${fadingOut ? 'splash-fade-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="QueueFree Entrance Animation"
    >
      <div className="intro-splash-card">
        {/* Glowing Radar & Pulse Ring Graphic */}
        <div className="intro-ecg-centerpiece">
          <div className="sonar-emitter">
            <div className="sonar-wave wave-1" />
            <div className="sonar-wave wave-2" />
            <div className="sonar-wave wave-3" />
          </div>

          <div className="intro-heart-badge">
            <HeartPulse size={42} className="heartbeat-pulse-icon" />
          </div>
        </div>

        {/* Dynamic ECG Line SVG */}
        <div className="intro-ecg-svg-track">
          <svg viewBox="0 0 400 60" className="ecg-line-svg">
            <path
              d="M 0 30 L 70 30 L 90 30 L 105 10 L 120 50 L 135 15 L 145 38 L 155 30 L 220 30 L 235 8 L 250 52 L 265 18 L 275 35 L 285 30 L 400 30"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ecg-animated-path"
            />
          </svg>
        </div>

        {/* Brand Name Reveal */}
        <div className="intro-brand-reveal">
          <h1 className="intro-brand-title">
            Queue<span className="brand-free-accent">Free</span>
          </h1>
          <div className="smart-badge-pill">
            <Sparkles size={12} />
            <span>Smart Hospital Queue Compass</span>
          </div>
        </div>

        {/* The Exact User Requested Motto */}
        <div className="intro-motto-banner">
          <p className="intro-motto-quote">
            “Skip the line, save your time.”
          </p>
        </div>

        {/* Status ticker & percentage */}
        <div className="intro-loader-section">
          <div className="intro-status-row">
            <span className="intro-status-text">{statusMessage}</span>
            <span className="intro-pct-counter">{progress}%</span>
          </div>

          <div className="intro-progress-bar-track">
            <div
              className="intro-progress-bar-fill"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Fast Action Skip */}
        <button
          type="button"
          className="btn-enter-website"
          onClick={handleSkip}
        >
          <span>Enter Website</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
