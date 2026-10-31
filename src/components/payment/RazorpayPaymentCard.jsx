import { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck, Check, Clock, QrCode, Copy, CheckCircle2,
  Download, ArrowRight, RefreshCw, Building2, Sparkles, AlertCircle
} from 'lucide-react'
import { generateQrMatrix } from '../../lib/qrCode'

export function RazorpayPaymentCard({
  hospital,
  booking,
  amount = 250,
  onPaymentSuccess,
  onTrackQueue,
}) {
  const [copied, setCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('pending') // 'pending' | 'processing' | 'success'
  const [timeLeft, setTimeLeft] = useState(299) // 5 minutes countdown
  const [paymentId, setPaymentId] = useState('')
  const [utrNumber, setUtrNumber] = useState('')

  // Hospital Name & City chosen by the user
  const hospitalName = hospital?.name || booking?.hospital_name || 'AIIMS Rishikesh'
  const hospitalCity = hospital?.city || booking?.hospital_city || 'Rishikesh'
  const tokenNumber = booking?.token_number || booking?.id || 'A-025'
  const departmentName = booking?.department_name || 'General OPD'
  const doctorName = booking?.doctor_name || 'Consulting Physician'

  // Dynamic Razorpay Merchant UPI ID
  const hospitalSlug = hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const upiId = `opd.${hospitalSlug.slice(0, 15)}@razorpay`

  // Generate UPI payload string with chosen hospital name
  const upiPayload = useMemo(() => {
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(hospitalName)}&am=${amount}&cu=INR&tn=OPD_Token_${tokenNumber}_${encodeURIComponent(hospitalName.slice(0, 15))}`
  }, [upiId, hospitalName, amount, tokenNumber])

  // Generate QR Code boolean matrix
  const qrMatrix = useMemo(() => {
    try {
      return generateQrMatrix(upiPayload)
    } catch {
      return generateQrMatrix(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(hospitalName)}&am=${amount}`)
    }
  }, [upiPayload, upiId, hospitalName, amount])

  // Countdown timer for dynamic QR code expiry
  useEffect(() => {
    if (paymentStatus === 'success') return
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [paymentStatus])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  // Interactive demo: simulate patient scanning and paying in GPay/PhonePe
  const handleSimulatePayment = () => {
    setPaymentStatus('processing')
    setTimeout(() => {
      const generatedPayId = `pay_RZP${Math.floor(10000000 + Math.random() * 90000000)}`
      const generatedUtr = `32${Math.floor(1000000000 + Math.random() * 9000000000)}`
      setPaymentId(generatedPayId)
      setUtrNumber(generatedUtr)
      setPaymentStatus('success')
      onPaymentSuccess?.({
        paymentId: generatedPayId,
        utr: generatedUtr,
        hospital: hospitalName,
        amount,
      })
    }, 1400)
  }

  const handleDownloadSlip = () => {
    window.print?.()
  }

  return (
    <div className="razorpay-qr-card-container">
      {/* Razorpay Brand Bar */}
      <div className="razorpay-header-strip">
        <div className="rzp-brand-badge">
          <div className="rzp-lightning-icon">⚡</div>
          <div>
            <div className="rzp-title-row">
              <strong>Razorpay</strong>
              <span className="rzp-badge-tag">Trusted Business</span>
            </div>
            <small>Official Hospital Payment Gateway</small>
          </div>
        </div>

        <div className="rzp-security-pill">
          <ShieldCheck size={14} />
          <span>256-bit Encrypted</span>
        </div>
      </div>

      {/* Prominent Hospital Name Section */}
      <div className="rzp-hospital-banner">
        <div className="hospital-banner-icon">
          <Building2 size={24} />
        </div>
        <div className="hospital-banner-info">
          <span className="rzp-pay-to-label">PAYING TO MEDICAL FACILITY</span>
          <h3 className="rzp-chosen-hospital-name">{hospitalName}</h3>
          <p className="rzp-hospital-sub">
            📍 {hospitalCity} · Token <strong>{tokenNumber}</strong> ({departmentName})
          </p>
        </div>
        <div className="rzp-amount-badge">
          <small>OPD FEE</small>
          <strong>₹ {amount}</strong>
        </div>
      </div>

      {paymentStatus !== 'success' ? (
        <div className="rzp-qr-body">
          {/* QR Code Container */}
          <div className="qr-code-box-wrapper">
            <div className="qr-hospital-top-tag">
              <span>Scan to Pay to <strong>{hospitalName}</strong></span>
            </div>

            <div className="qr-svg-frame">
              {/* Dynamic SVG QR Matrix */}
              {qrMatrix && (
                <svg
                  viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                  className="qr-matrix-svg"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrMatrix.length} height={qrMatrix.length} fill="#ffffff" />
                  {qrMatrix.map((row, r) =>
                    row.map((cell, c) => (
                      cell ? (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null
                    ))
                  )}
                </svg>
              )}

              {/* Hospital Badge Overlay in QR Center */}
              <div className="qr-center-hospital-badge" title={`Paying to ${hospitalName}`}>
                <div className="center-hospital-dot">🏥</div>
                <span className="center-hospital-text">{hospitalName.slice(0, 14)}</span>
              </div>
            </div>

            <div className="qr-timer-row">
              <Clock size={13} />
              <span>
                QR Code expires in: <strong className={timeLeft < 60 ? 'text-red' : ''}>{formatTimer(timeLeft)}</strong>
              </span>
            </div>
          </div>

          {/* Payment Instructions & UPI Apps */}
          <div className="rzp-instructions-pane">
            <div className="upi-app-icons-row">
              <span className="accepted-label">Scan via any UPI App:</span>
              <div className="app-pills">
                <span className="upi-pill gpay">GPay</span>
                <span className="upi-pill phonepe">PhonePe</span>
                <span className="upi-pill paytm">Paytm</span>
                <span className="upi-pill bhim">BHIM</span>
                <span className="upi-pill cred">CRED</span>
              </div>
            </div>

            {/* UPI ID copy row */}
            <div className="rzp-upi-copy-box">
              <div className="upi-copy-text">
                <small>Hospital Razorpay UPI VPA</small>
                <code>{upiId}</code>
              </div>
              <button
                type="button"
                className="btn-copy-upi"
                onClick={handleCopyUpi}
              >
                {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy UPI'}</span>
              </button>
            </div>

            {/* Interactive Demo Simulate Button */}
            <div className="rzp-action-buttons">
              <button
                type="button"
                className="btn-simulate-pay"
                onClick={handleSimulatePayment}
                disabled={paymentStatus === 'processing'}
              >
                {paymentStatus === 'processing' ? (
                  <>
                    <RefreshCw size={16} className="spin-icon" />
                    <span>Verifying UPI Payment with {hospitalName}…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Simulate UPI Payment (Instant Demo)</span>
                  </>
                )}
              </button>
            </div>

            <p className="rzp-footer-note">
              🛡️ Payment is directly routed to <strong>{hospitalName}</strong> billing account. No middleman holding.
            </p>
          </div>
        </div>
      ) : (
        /* Payment Success View */
        <div className="rzp-success-view">
          <div className="success-icon-badge">
            <CheckCircle2 size={46} />
          </div>

          <h3 className="success-title">Payment Successful!</h3>
          <p className="success-sub">
            Payment of <strong>₹{amount}</strong> confirmed for <strong>{hospitalName}</strong>.
          </p>

          <div className="receipt-details-table">
            <div className="receipt-row">
              <span>Beneficiary Hospital</span>
              <strong>{hospitalName}</strong>
            </div>
            <div className="receipt-row">
              <span>City / Location</span>
              <strong>{hospitalCity}</strong>
            </div>
            <div className="receipt-row">
              <span>Department</span>
              <strong>{departmentName}</strong>
            </div>
            <div className="receipt-row">
              <span>Consulting Doctor</span>
              <strong>{doctorName}</strong>
            </div>
            <div className="receipt-row">
              <span>OPD Token</span>
              <strong className="text-blue">{tokenNumber}</strong>
            </div>
            <div className="receipt-row">
              <span>Razorpay Payment ID</span>
              <code>{paymentId}</code>
            </div>
            <div className="receipt-row">
              <span>Bank UPI Reference (UTR)</span>
              <code>{utrNumber}</code>
            </div>
            <div className="receipt-row">
              <span>Payment Mode</span>
              <span className="pill-success-paid">● Razorpay Instant UPI</span>
            </div>
          </div>

          <div className="success-actions-row">
            <button
              type="button"
              className="btn-download-slip"
              onClick={handleDownloadSlip}
            >
              <Download size={15} />
              <span>Print / Download OPD Slip</span>
            </button>

            {onTrackQueue && (
              <button
                type="button"
                className="btn-primary-blue"
                onClick={onTrackQueue}
              >
                <span>Track Live Queue</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
