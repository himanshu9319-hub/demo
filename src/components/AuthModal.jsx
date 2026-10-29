import { useEffect, useRef } from 'react'
import { ArrowRight, Check, ShieldCheck, Sparkles, X } from 'lucide-react'

export function AuthModal({
  open,
  onClose,
  authStep,
  setAuthStep,
  demoAbha,
  abhaInput,
  setAbhaInput,
  phoneNumber,
  setPhoneNumber,
  whatsappConsent,
  setWhatsappConsent,
  otp,
  setOtp,
  otpCode,
  otpAttempts,
  verified,
  loading,
  error,
  setError,
  beginAbha,
  requestDemoOtp,
  verifyDemoOtp,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    dialogRef.current?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), summary, [href]')
      if (!focusable?.length) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && authStep === 1) document.getElementById('demo-code')?.focus()
  }, [authStep, open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" tabIndex={-1}>
        <button className="modal-close" aria-label="Close sign-in" onClick={onClose}><X size={18} /></button>
        <div className="auth-icon"><ShieldCheck size={24} /></div>
        <div className="section-kicker">QUEUEFREE DEMO SIGN-IN</div>
        <h2 id="auth-title">Verify your demo identity</h2>
        <p id="auth-description">This simulated ABHA-style check is for demonstration only. It is not official ABHA authentication and does not connect to ABDM. Never enter a real ABHA ID.</p>
        {authStep === 0 ? (
          <form onSubmit={requestDemoOtp}>
            <label className="form-field" htmlFor="patient-phone">Phone number</label>
            <input
              id="patient-phone"
              className="auth-text-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={event => setPhoneNumber(event.target.value.replace(/[^\d+]/g, ''))}
              placeholder="+91 9876543210"
              pattern="\+[1-9][0-9]{7,14}"
              title="Include your country code, for example +91 followed by your number."
              required
              aria-describedby="phone-help"
            />
            <small id="phone-help" className="field-help">Include country code. Your number is saved to your QueueFree demo profile only after sign-in.</small>
            <label className="consent-option">
              <input type="checkbox" checked={whatsappConsent} onChange={event => setWhatsappConsent(event.target.checked)} required />
              <span>I agree to receive token and queue updates on WhatsApp.</span>
            </label>
            <p className="field-help consent-disclaimer">Demo only: WhatsApp messages are not sent because no messaging service is configured. Your number and consent are saved to the demo patient profile.</p>
            <div className="demo-warning"><strong>Demo only</strong><span>Generate a fake ABHA-style ID and verify it with a simulated one-time code. No real identity check takes place.</span></div>
            <button className="secondary-staff auth-generate" type="button" onClick={() => { setError(''); beginAbha() }}><Sparkles size={15} /> Generate fake demo ID</button>
            <label className="form-field" htmlFor="demo-abha">Fake demo ID</label>
            <input id="demo-abha" className="auth-text-input abha-input" autoComplete="off" value={abhaInput} onChange={event => setAbhaInput(event.target.value.toUpperCase())} placeholder="Generate an ID to begin" required />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-btn auth-action" type="submit" disabled={!demoAbha || !whatsappConsent || loading}>Continue to demo code <ArrowRight size={16} /></button>
          </form>
        ) : !verified ? (
          <form onSubmit={verifyDemoOtp}>
            <div className="demo-id"><small>FAKE DEMO ID</small><strong>{demoAbha}</strong></div>
            <p className="otp-hint">The local demo code is not sent by SMS or WhatsApp and does not verify a real ABHA account.</p>
            <details className="demo-code-disclosure">
              <summary>Show simulated code (demo only)</summary>
              <strong>{otpCode}</strong>
            </details>
            <label className="form-field" htmlFor="demo-code">Simulated one-time code</label>
            <input id="demo-code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => { setError(''); setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)) }} placeholder="Enter 6 digits" required />
            <p className="attempt-note" aria-live="polite">{Math.max(0, 3 - otpAttempts)} attempts remaining · Expires in 5 minutes</p>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-btn auth-action" type="submit" disabled={otpAttempts >= 3 || loading}>{loading ? 'Verifying demo…' : 'Verify demo identity'} <Check size={16} /></button>
            <button className="text-button auth-back" type="button" onClick={() => { setError(''); setAuthStep(0) }}>Back to sign-in details</button>
          </form>
        ) : (
          <div className="verified-card" role="status"><span><Check size={18} /></span><strong>Demo sign-in complete</strong><small>Your simulated identity and phone consent were saved to your demo profile. No WhatsApp message was sent.</small><button className="secondary-staff" onClick={onClose}>Continue</button></div>
        )}
      </section>
    </div>
  )
}
