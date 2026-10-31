import { useState } from 'react'
import { User, Phone, ShieldCheck, Mail, MapPin, CheckCircle, Sparkles, AlertCircle } from 'lucide-react'

export function PatientProfile({
  patientName = 'Patient User',
  phone = '+91 98765 43210',
  email = 'patient@example.com',
  abhaVerified = false,
  abhaId = '',
  onVerifyAbha,
}) {
  const [showModal, setShowModal] = useState(false)
  const [tempAbha, setTempAbha] = useState('')
  const [error, setError] = useState('')

  const handleQuickLink = (e) => {
    e.preventDefault()
    if (!tempAbha.trim()) {
      setError('Enter a valid ABHA ID or click Generate.')
      return
    }
    onVerifyAbha?.(tempAbha.trim())
    setShowModal(false)
  }

  return (
    <div className="patient-profile-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-main-title">Patient Profile & ABHA Identity</h1>
          <p className="page-main-sub">Manage your personal contact details and national digital health credentials.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Personal Details Card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar-large">
              <span>{patientName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2>{patientName}</h2>
              <span className="profile-role-badge">Verified Patient Account</span>
            </div>
          </div>

          <div className="profile-fields-list">
            <div className="profile-field-row">
              <span className="field-lbl"><Phone size={15} /> Registered Mobile</span>
              <strong className="field-val">{phone}</strong>
            </div>
            <div className="profile-field-row">
              <span className="field-lbl"><Mail size={15} /> Email Address</span>
              <strong className="field-val">{email}</strong>
            </div>
            <div className="profile-field-row">
              <span className="field-lbl"><MapPin size={15} /> Preferred City</span>
              <strong className="field-val">Rishikesh, Uttarakhand</strong>
            </div>
          </div>
        </div>

        {/* ABHA Digital Health Status Card */}
        <div className="profile-card abha-status-card">
          <div className="abha-status-header">
            <div className={`shield-icon-circle ${abhaVerified ? 'verified-bg' : 'unverified-bg'}`}>
              <ShieldCheck size={28} className={abhaVerified ? 'text-green' : 'text-blue'} />
            </div>
            <div>
              <h3>Ayushman Bharat Health Account (ABHA)</h3>
              <p>Government of India Digital Health Mission Integration</p>
            </div>
          </div>

          {abhaVerified ? (
            <div className="abha-verified-box">
              <div className="verified-badge-row">
                <CheckCircle size={18} className="text-green" />
                <span className="text-green font-bold">ABHA ID Linked & Verified</span>
              </div>
              <div className="abha-id-display">
                <small>VERIFIED PATIENT IDENTIFIER</small>
                <strong>{abhaId || 'DEMO-ABHA-4819-2041'}</strong>
              </div>
              <p className="abha-note-text">
                Your account is authenticated for direct, priority OPD token allocation at all partner hospitals.
              </p>
            </div>
          ) : (
            <div className="abha-unverified-box">
              <div className="unverified-badge-row">
                <AlertCircle size={18} className="text-amber" />
                <span className="text-amber font-bold">ABHA Not Linked Yet</span>
              </div>
              <p className="abha-note-text">
                To prevent black marketing and ghost token booking, ABHA ID verification is mandatory when you book an OPD token. You can also link it now.
              </p>
              <button
                type="button"
                className="btn-primary-blue link-abha-btn"
                onClick={() => {
                  setTempAbha(`DEMO-ABHA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`)
                  setShowModal(true)
                }}
              >
                <Sparkles size={15} />
                <span>Link ABHA ID Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="abha-mandatory-modal">
            <div className="modal-top-strip">
              <div className="shield-icon-wrap">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3>Link Your ABHA ID</h3>
                <small>Ensures genuine token allocation</small>
              </div>
            </div>

            <form onSubmit={handleQuickLink} className="abha-modal-form">
              <div className="form-group">
                <label>ABHA ID (Format: DEMO-ABHA-XXXX-XXXX)</label>
                <input
                  type="text"
                  className="styled-input uppercase-text"
                  value={tempAbha}
                  onChange={(e) => setTempAbha(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {error && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary-white"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-blue">
                  Confirm & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
