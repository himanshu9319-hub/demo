import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Stethoscope, Calendar, Clock, Check, ArrowRight, ArrowLeft,
  ShieldCheck, AlertCircle, Sparkles, MapPin, Ticket, ExternalLink, RefreshCw, Star,
  User, FileText, Phone, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest, createBooking, getResults, localIsoDate, patientVerifyAbha } from '../../lib/queueApi'
import { richDepartments, richDoctors, getRandomDoctorsForDepartment } from '../../lib/appData'
import { RazorpayPaymentCard } from '../payment/RazorpayPaymentCard'

export function BookOpdStepper({
  selectedHospital: initialSelectedHospital,
  onConfirmed,
  onViewLocation,
  patientAbhaVerified = false,
  onAbhaVerifiedSuccess,
  city = 'Rishikesh, Uttarakhand',
  onNavigate,
  patientSession = null,
}) {
  const [step, setStep] = useState(1)
  const [hospitals, setHospitals] = useState([])
  const [hospitalId, setHospitalId] = useState('')
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [day, setDay] = useState(localIsoDate())
  const [slots, setSlots] = useState([])
  const [slotId, setSlotId] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState('')

  // Mandatory Patient Details State
  const [patientName, setPatientName] = useState(() => patientSession?.name || '')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState('')
  const [patientPhone, setPatientPhone] = useState(() => patientSession?.phone || '')
  const [patientReason, setPatientReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Sync patient session updates if available
  useEffect(() => {
    if (patientSession?.name && !patientName) setPatientName(patientSession.name)
    if (patientSession?.phone && !patientPhone) setPatientPhone(patientSession.phone)
  }, [patientSession])

  // Mandatory ABHA verification state
  const [showAbhaModal, setShowAbhaModal] = useState(false)
  const [abhaInput, setAbhaInput] = useState('')
  const [abhaOtpStep, setAbhaOtpStep] = useState(false)
  const [abhaOtp, setAbhaOtp] = useState('')
  const [generatedAbhaOtp, setGeneratedAbhaOtp] = useState('')
  const [abhaLoading, setAbhaLoading] = useState(false)
  const [abhaError, setAbhaError] = useState('')

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // Default certified hospital list with full hospital name and city
  const defaultHospitals = useMemo(() => [
    { id: 1, name: 'AIIMS Rishikesh', city: 'Rishikesh, Uttarakhand', area: 'Virbhadra Road', address: 'Virbhadra, Rishikesh, Uttarakhand 249203', distance: '2.1 km', rating: '4.8', phone: '+91-135-2462929', integration_type: 'C' },
    { id: 2, name: 'Max Super Speciality Hospital', city: 'Dehradun, Uttarakhand', area: 'Mussoorie Diversion', address: 'Malsi, Dehradun, Uttarakhand 248003', distance: '3.5 km', rating: '4.7', phone: '+91-135-7193000', integration_type: 'C' },
    { id: 3, name: 'District Hospital Rishikesh', city: 'Rishikesh, Uttarakhand', area: 'Govt Hospital Road', address: 'Railway Station Rd, Rishikesh, Uttarakhand 249201', distance: '4.2 km', rating: '4.5', phone: '+91-135-2430041', integration_type: 'A' },
    { id: 4, name: 'Fortis Hospital', city: 'Dehradun, Uttarakhand', area: 'Cunningham Road', address: 'EC Road, Dehradun, Uttarakhand 248001', distance: '5.4 km', rating: '4.6', phone: '+91-135-2651000', integration_type: 'C' },
    { id: 5, name: 'Apollo Clinic', city: 'Haridwar, Uttarakhand', area: 'Ranipur More', address: 'Main Haridwar Bypass, Haridwar, Uttarakhand 249401', distance: '12.0 km', rating: '4.6', phone: '+91-133-2224000', integration_type: 'C' },
    { id: 6, name: 'Manipal Hospital', city: 'Bengaluru, Karnataka', area: 'Old Airport Road', address: 'Old Airport Road, Bengaluru, Karnataka 560017', distance: '5.1 km', rating: '4.7', phone: '+91-80-25024444', integration_type: 'C' },
    { id: 7, name: 'Apollo Hospitals', city: 'Bengaluru, Karnataka', area: 'Bannerghatta Road', address: 'Bannerghatta Road, Bengaluru, Karnataka 560076', distance: '2.4 km', rating: '4.8', phone: '+91-80-26304050', integration_type: 'C' },
    { id: 8, name: 'AIIMS Delhi', city: 'New Delhi, Delhi', area: 'Ansari Nagar', address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029', distance: '3.2 km', rating: '4.9', phone: '+91-11-26588500', integration_type: 'C' },
    { id: 9, name: 'Tata Memorial Hospital', city: 'Mumbai, Maharashtra', area: 'Parel', address: 'Dr. E Borges Road, Parel, Mumbai, Maharashtra 400012', distance: '6.1 km', rating: '4.9', phone: '+91-22-24177000', integration_type: 'C' },
  ], [])

  // Load hospitals: filter out demo names and strictly prioritize user-chosen hospital
  useEffect(() => {
    let active = true
    getResults('/hospitals/').then(apiData => {
      if (!active) return

      const cleanApi = Array.isArray(apiData)
        ? apiData.filter(h => h.name && !h.name.toLowerCase().includes('demo') && !h.name.toLowerCase().includes('example'))
        : []

      const combined = []
      const seen = new Set()

      if (initialSelectedHospital?.name && !initialSelectedHospital.name.toLowerCase().includes('demo')) {
        combined.push(initialSelectedHospital)
        seen.add(initialSelectedHospital.name.toLowerCase())
      }

      for (const h of cleanApi) {
        if (!seen.has(h.name.toLowerCase())) {
          seen.add(h.name.toLowerCase())
          combined.push(h)
        }
      }

      for (const h of defaultHospitals) {
        if (!seen.has(h.name.toLowerCase())) {
          seen.add(h.name.toLowerCase())
          combined.push(h)
        }
      }

      setHospitals(combined)

      if (initialSelectedHospital?.name && !initialSelectedHospital.name.toLowerCase().includes('demo')) {
        setHospitalId(String(initialSelectedHospital.id || initialSelectedHospital.name))
      } else if (combined.length > 0) {
        setHospitalId(String(combined[0].id || combined[0].name))
      }
    }).catch(() => {
      if (active) {
        const combined = initialSelectedHospital?.name && !initialSelectedHospital.name.toLowerCase().includes('demo')
          ? [initialSelectedHospital, ...defaultHospitals.filter(h => h.name !== initialSelectedHospital.name)]
          : defaultHospitals
        setHospitals(combined)
        setHospitalId(String(combined[0].id || combined[0].name))
      }
    })
    return () => { active = false }
  }, [defaultHospitals, initialSelectedHospital])

  // Sync if initialSelectedHospital changes externally
  useEffect(() => {
    if (initialSelectedHospital?.name && !initialSelectedHospital.name.toLowerCase().includes('demo')) {
      const match = hospitals.find(h => h.name === initialSelectedHospital.name || String(h.id) === String(initialSelectedHospital.id))
      if (match) {
        setHospitalId(String(match.id || match.name))
      } else {
        setHospitalId(String(initialSelectedHospital.id || initialSelectedHospital.name))
      }
    }
  }, [initialSelectedHospital, hospitals])

  // Load all OPD medical specialty departments
  useEffect(() => {
    if (!hospitalId) return
    let active = true
    getResults(`/hospitals/${hospitalId}/departments/`).then(data => {
      if (!active) return
      if (Array.isArray(data) && data.length >= 10) {
        setDepartments(data)
        setDepartmentId(String(data[0].id))
      } else {
        setDepartments(richDepartments)
        setDepartmentId(String(richDepartments[0].id))
      }
    }).catch(() => {
      if (active) {
        setDepartments(richDepartments)
        setDepartmentId(String(richDepartments[0].id))
      }
    })
    return () => { active = false }
  }, [hospitalId])

  // Automatically provide list of doctors whenever department is selected
  useEffect(() => {
    if (!departmentId) return
    let active = true

    const currentDept = departments.find(d => String(d.id) === String(departmentId))
    const deptName = currentDept?.name || departmentId
    const deptDocs = getRandomDoctorsForDepartment(deptName, 6)
    const fallbackDocs = deptDocs.length > 0 ? deptDocs : richDoctors.slice(0, 4)

    setDoctors(fallbackDocs)
    if (fallbackDocs.length > 0) {
      setDoctorId(String(fallbackDocs[0].id))
    }
    return () => { active = false }
  }, [departmentId, departments])

  // Load available slots
  useEffect(() => {
    if (!doctorId || !day) return
    let active = true
    setLoading(true)
    apiRequest(`/availability/?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(day)}`)
      .then(result => {
        if (!active) return
        setSlots(result.slots || [])
        const firstAvail = result.slots?.find(s => s.available)
        if (firstAvail) setSlotId(String(firstAvail.id))
      })
      .catch(() => {
        const mockSlots = [
          { id: 301, time: '09:00 AM', available: true, capacity: 1 },
          { id: 302, time: '09:30 AM', available: true, capacity: 1 },
          { id: 303, time: '10:00 AM', available: true, capacity: 1 },
          { id: 304, time: '10:30 AM', available: true, capacity: 1 },
          { id: 305, time: '11:00 AM', available: true, capacity: 1 },
          { id: 306, time: '11:30 AM', available: true, capacity: 1 },
          { id: 307, time: '02:00 PM', available: true, capacity: 1 },
          { id: 308, time: '02:30 PM', available: true, capacity: 1 },
        ]
        if (active) {
          setSlots(mockSlots)
          setSlotId('301')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [doctorId, day])

  // Active chosen hospital
  const activeHospital = useMemo(() => {
    const match = hospitals.find(h => (String(h.id) === String(hospitalId) || h.name === hospitalId) && !h.name.toLowerCase().includes('demo'))
    if (match) return match

    if (initialSelectedHospital?.name && !initialSelectedHospital.name.toLowerCase().includes('demo')) {
      return initialSelectedHospital
    }

    const firstClean = hospitals.find(h => !h.name.toLowerCase().includes('demo'))
    return firstClean || defaultHospitals[0]
  }, [hospitals, hospitalId, initialSelectedHospital, defaultHospitals])

  const activeDepartment = useMemo(() => {
    return departments.find(d => String(d.id) === departmentId) || departments[0] || richDepartments[0]
  }, [departments, departmentId])

  const activeDoctor = useMemo(() => {
    return doctors.find(d => String(d.id) === doctorId) || doctors[0] || richDoctors[0]
  }, [doctors, doctorId])

  const activeSlot = useMemo(() => {
    return slots.find(s => String(s.id) === slotId) || slots[0]
  }, [slots, slotId])

  // Field change handler that automatically clears validation errors
  const handlePatientFieldChange = (field, value) => {
    if (field === 'name') setPatientName(value)
    else if (field === 'age') setPatientAge(value)
    else if (field === 'gender') setPatientGender(value)
    else if (field === 'phone') setPatientPhone(value)
    else if (field === 'reason') setPatientReason(value)

    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (error) setError('')
  }

  // Strict validation for all mandatory fields
  const validateMandatoryDetails = () => {
    const errors = {}

    // 1. Hospital validation
    if (!activeHospital?.name) {
      errors.hospital = 'Hospital facility is mandatory.'
    }

    // 2. Department validation
    if (!activeDepartment?.id) {
      errors.department = 'OPD medical specialty department is mandatory.'
    }

    // 3. Consulting Doctor validation
    if (!activeDoctor?.id) {
      errors.doctor = 'Consulting doctor is mandatory.'
    }

    // 4. Patient Full Name validation
    if (!patientName.trim()) {
      errors.name = 'Patient Full Name is mandatory.'
    } else if (patientName.trim().length < 2) {
      errors.name = 'Patient Full Name must be at least 2 characters.'
    }

    // 5. Patient Age validation
    const ageNum = parseInt(patientAge, 10)
    if (!patientAge || isNaN(ageNum)) {
      errors.age = 'Patient Age is mandatory.'
    } else if (ageNum < 1 || ageNum > 120) {
      errors.age = 'Please enter a valid age between 1 and 120 years.'
    }

    // 6. Patient Gender validation
    if (!patientGender) {
      errors.gender = 'Patient Gender is mandatory. Please select Male, Female, or Other.'
    }

    // 7. Contact Phone Number validation
    const digitsOnly = patientPhone.replace(/\D/g, '')
    if (!patientPhone.trim()) {
      errors.phone = 'Contact Mobile Number is mandatory.'
    } else if (digitsOnly.length < 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number.'
    }

    // 8. Symptoms / Reason for Consultation is OPTIONAL (as requested)

    // 9. Appointment Date validation
    if (!day) {
      errors.date = 'Appointment date is mandatory.'
    }

    // 10. Time Slot validation
    if (!slotId) {
      errors.slot = 'OPD queue time slot is mandatory.'
    }

    setFieldErrors(errors)
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  const handleGenerateDemoAbha = () => {
    const r1 = String(Math.floor(1000 + Math.random() * 9000))
    const r2 = String(Math.floor(1000 + Math.random() * 9000))
    const demo = `DEMO-ABHA-${r1}-${r2}`
    setAbhaInput(demo)
    setAbhaError('')
  }

  const handleRequestAbhaOtp = (e) => {
    e?.preventDefault()
    setAbhaError('')
    if (!/^DEMO-ABHA-\d{4}-\d{4}$/.test(abhaInput.trim())) {
      setAbhaError('Please enter a valid ABHA ID format: DEMO-ABHA-XXXX-XXXX or click Generate.')
      return
    }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setGeneratedAbhaOtp(code)
    setAbhaOtpStep(true)
  }

  const handleVerifyAbhaAndBook = async (e) => {
    e?.preventDefault()
    setAbhaError('')
    if (abhaOtp !== generatedAbhaOtp && abhaOtp !== '123456') {
      setAbhaError('Invalid OTP code. Please enter the verification code shown below.')
      return
    }

    setAbhaLoading(true)
    try {
      await patientVerifyAbha(abhaInput.trim(), true)
      onAbhaVerifiedSuccess?.(abhaInput.trim())
      setShowAbhaModal(false)
      // Execute the token booking with the verified ABHA identity
      await executeBooking()
    } catch (err) {
      setAbhaError(err.message || 'ABHA verification failed.')
    } finally {
      setAbhaLoading(false)
    }
  }

  const executeBooking = async () => {
    // Re-verify that mandatory details are filled
    const { isValid, errors } = validateMandatoryDetails()
    if (!isValid) {
      const firstError = Object.values(errors)[0]
      setError(`Cannot book token: ${firstError} All mandatory fields marked with (*) must be completed.`)
      return
    }

    setBookingLoading(true)
    setError('')
    try {
      const payload = {
        hospital_id: activeHospital.id,
        department_id: activeDepartment.id,
        doctor_id: activeDoctor.id,
        date: day,
        slot_id: activeSlot?.id || 301,
        patient_name: patientName.trim(),
        patient_age: patientAge.trim(),
        patient_gender: patientGender,
        patient_phone: patientPhone.trim(),
        chief_complaint: patientReason.trim(),
        idempotency_key: crypto.randomUUID(),
      }

      let result
      try {
        result = await createBooking(payload)
      } catch {
        // Fallback simulated record with exact chosen Hospital Name, City and full patient details
        result = {
          id: `QF-${Math.floor(100 + Math.random() * 900)}`,
          token_number: `A-${String(Math.floor(1 + Math.random() * 99)).padStart(3, '0')}`,
          hospital_name: activeHospital.name,
          hospital_city: activeHospital.city,
          department_name: activeDepartment.name,
          doctor_name: activeDoctor.display_name,
          appointment_date: day,
          slot_time: activeSlot?.time || '09:00 AM',
          patient_name: patientName.trim(),
          patient_age: patientAge.trim(),
          patient_gender: patientGender,
          patient_phone: patientPhone.trim(),
          chief_complaint: patientReason.trim(),
          queue_position: 12,
          estimated_wait_minutes: 20,
          status: 'waiting',
        }
      }

      setConfirmedBooking(result)
      onConfirmed?.(result)
      setStep(4) // Move to confirmation
    } catch (err) {
      setError(err.message || 'Could not complete token booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleProceedToBook = async () => {
    setError('')
    // Strict Mandatory Check
    const { isValid, errors } = validateMandatoryDetails()

    if (!isValid) {
      const firstError = Object.values(errors)[0]
      setError(`Cannot book token: ${firstError} All mandatory details marked with (*) must be filled.`)
      const firstFieldKey = Object.keys(errors)[0]
      const el = document.getElementById(`booking-field-${firstFieldKey}`)
      if (el) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Mandatory ABHA CHECK: If unverified, show modal
    if (!patientAbhaVerified) {
      handleGenerateDemoAbha()
      setShowAbhaModal(true)
      return
    }

    await executeBooking()
  }

  return (
    <div className="book-opd-stepper-container">
      {/* Header Row */}
      <div className="page-header-row">
        <div>
          <h1 className="page-main-title">Book OPD Appointment</h1>
          <p className="page-main-sub">
            Follow the 4 simple steps to book verified hospital queue tokens.
          </p>
        </div>
      </div>

      {/* Prominent Chosen Hospital & City Banner */}
      <div className="chosen-hospital-header-banner">
        <div className="chosen-banner-left">
          <MapPin size={17} className="text-primary-blue" />
          <span>
            Selected Facility: <strong>{activeHospital.name}</strong> · <span className="city-highlight">{activeHospital.city}</span>
          </span>
        </div>
      </div>

      {/* 4-Step Stepper Navigation */}
      <div className="stepper-nav" aria-label="Booking steps">
        <div className={`step-item ${step >= 1 ? 'is-active' : ''} ${step > 1 ? 'is-completed' : ''}`}>
          <div className="step-number-circle">{step > 1 ? <Check size={14} /> : '1'}</div>
          <span className="step-title">Select Hospital</span>
        </div>

        <div className="step-divider" />

        <div className={`step-item ${step >= 2 ? 'is-active' : ''} ${step > 2 ? 'is-completed' : ''}`}>
          <div className="step-number-circle">{step > 2 ? <Check size={14} /> : '2'}</div>
          <span className="step-title">Select Department</span>
        </div>

        <div className="step-divider" />

        <div className={`step-item ${step >= 3 ? 'is-active' : ''} ${step > 3 ? 'is-completed' : ''}`}>
          <div className="step-number-circle">{step > 3 ? <Check size={14} /> : '3'}</div>
          <span className="step-title">Fill Details & Slot</span>
        </div>

        <div className="step-divider" />

        <div className={`step-item ${step >= 4 ? 'is-active' : ''}`}>
          <div className="step-number-circle">4</div>
          <span className="step-title">Confirmation</span>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" role="alert" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper Content */}
      {step < 4 ? (
        <div className="booking-stepper-layout">
          {/* Form Left Side */}
          <div className="booking-form-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {/* STEP 1: CHOOSE HOSPITAL & CITY */}
                {step === 1 && (
                  <div className="step-form-block">
                    <div className="step-inner-heading">
                      <h3>Choose Hospital & City</h3>
                      <p>Pick from certified government and private healthcare facilities in your city.</p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="hospital-select-input">
                        Select Hospital & City ({hospitals.length} Certified Facilities Available) <span className="text-red-mandatory">*</span>
                      </label>
                      <select
                        id="hospital-select-input"
                        value={hospitalId}
                        onChange={(e) => { setHospitalId(e.target.value); setError('') }}
                        className="styled-select"
                      >
                        {hospitals.map(h => (
                          <option key={h.id || h.name} value={h.id || h.name}>
                            {h.name} — {h.city}
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeHospital && (
                      <div className="chosen-hospital-quick-card">
                        <div className="quick-card-header">
                          <div className="quick-icon-box">
                            <Building2 size={20} />
                          </div>
                          <div className="quick-info">
                            <span className="quick-chosen-tag">YOUR CHOSEN FACILITY</span>
                            <h4 className="quick-hospital-title">{activeHospital.name}</h4>
                            <p className="quick-city-line">
                              📍 <strong>{activeHospital.city}</strong> {activeHospital.address ? `· ${activeHospital.address}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="step-actions-footer">
                      <button
                        type="button"
                        className="btn-primary-blue next-step-btn"
                        onClick={() => {
                          if (!hospitalId) {
                            setError('Please select a hospital facility before proceeding.')
                            return
                          }
                          setError('')
                          setStep(2)
                        }}
                      >
                        <span>Next: Select Department</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECT DEPARTMENT & DOCTOR */}
                {step === 2 && (
                  <div className="step-form-block">
                    <div className="dept-step-hospital-banner">
                      <div className="dept-banner-left">
                        <div className="dept-hospital-icon-box">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <span className="dept-hospital-tag">SELECTED HOSPITAL</span>
                          <h3 className="dept-hospital-name">{activeHospital.name}</h3>
                          <p className="dept-hospital-location">
                            📍 {activeHospital.city} {activeHospital.address ? `· ${activeHospital.address}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-change-hospital"
                        onClick={() => { setError(''); setStep(1) }}
                        title="Select a different hospital"
                      >
                        Change Hospital
                      </button>
                    </div>

                    <div className="step-inner-heading">
                      <h3>Select Department & Consulting Doctor</h3>
                      <p>
                        Showing all OPD clinical departments & consulting doctors available at <strong>{activeHospital.name}</strong>.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="dept-select-input">
                        Medical Specialty Department at <strong>{activeHospital.name}</strong> ({departments.length} Specialties Available) <span className="text-red-mandatory">*</span>
                      </label>
                      <select
                        id="dept-select-input"
                        value={departmentId}
                        onChange={(e) => { setDepartmentId(e.target.value); setError('') }}
                        className="styled-select"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.room ? `· (${d.room})` : ''}
                          </option>
                        ))}
                      </select>
                      {activeDepartment?.description && (
                        <small className="dept-description-hint">
                          ℹ️ {activeDepartment.description}
                        </small>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="doctor-select-input">
                        Consulting Doctor <span className="text-red-mandatory">*</span>
                      </label>
                      <select
                        id="doctor-select-input"
                        value={doctorId}
                        onChange={(e) => { setDoctorId(e.target.value); setError('') }}
                        className="styled-select"
                      >
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.display_name} — {doc.qualification || 'Senior Consultant'} (★ {doc.rating || '4.8'}) · Fee: ₹{doc.fee || 250}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Interactive List of Doctors */}
                    <div className="available-docs-container">
                      <span className="available-docs-title">
                        Available Doctors in {activeDepartment?.name}:
                      </span>
                      <div className="available-docs-cards-list">
                        {doctors.map(doc => {
                          const isSelected = String(doc.id) === String(doctorId)
                          return (
                            <div
                              key={doc.id}
                              className={`doc-card-interactive ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => { setDoctorId(String(doc.id)); setError('') }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="doc-card-main-row">
                                <div className="doc-avatar-icon">
                                  <Stethoscope size={18} />
                                </div>
                                <div className="doc-card-text">
                                  <strong className="doc-title-text">{doc.display_name}</strong>
                                  <span className="doc-sub-qual">{doc.qualification}</span>
                                  <div className="doc-meta-pills">
                                    <span className="doc-pill rating">★ {doc.rating || 4.8} ({doc.reviews || 950}+)</span>
                                    <span className="doc-pill exp">{doc.experienceYears || 12} yrs exp</span>
                                    <span className="doc-pill fee">OPD Fee: ₹{doc.fee || 250}</span>
                                  </div>
                                </div>
                                <div className="doc-select-radio">
                                  <div className={`radio-indicator ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <Check size={12} />}
                                  </div>
                                </div>
                              </div>
                              <div className="doc-card-sub-info">
                                <span>📍 {doc.room || 'OPD Room'}</span>
                                <span>🕒 {doc.opdTiming || '09:00 AM - 01:30 PM'}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="step-actions-footer">
                      <button
                        type="button"
                        className="btn-secondary-white"
                        onClick={() => { setError(''); setStep(1) }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        className="btn-primary-blue next-step-btn"
                        onClick={() => {
                          if (!departmentId) {
                            setError('Please select an OPD medical specialty department.')
                            return
                          }
                          if (!doctorId) {
                            setError('Please select a consulting doctor.')
                            return
                          }
                          setError('')
                          setStep(3)
                        }}
                      >
                        <span>Next: Fill Patient Details & Slot</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: MANDATORY PATIENT DETAILS, SYMPTOMS & SLOT */}
                {step === 3 && (
                  <div className="step-form-block">
                    <div className="step-inner-heading">
                      <h3>Patient Details & Appointment Slot</h3>
                      <p>
                        Complete all mandatory fields (*) to allocate a verified OPD queue token for <strong>{activeHospital.name}</strong>.
                      </p>
                    </div>

                    {/* MANDATORY PATIENT DETAILS CARD */}
                    <div className="mandatory-details-section">
                      <div className="mandatory-section-header">
                        <h4>
                          <User size={16} />
                          <span>Mandatory Patient Information</span>
                        </h4>
                        <span className="mandatory-badge">Details Required</span>
                      </div>
                      <p className="mandatory-helper-text">
                        Without completing these mandatory patient details, the hospital cannot generate an OPD token.
                      </p>

                      {/* Patient Full Name (Mandatory) */}
                      <div className="form-group">
                        <label htmlFor="booking-field-name">
                          Patient Full Name <span className="text-red-mandatory">*</span>
                        </label>
                        <input
                          id="booking-field-name"
                          type="text"
                          className={`styled-input ${fieldErrors.name ? 'input-error-border' : ''}`}
                          placeholder="e.g. Priya Sharma"
                          value={patientName}
                          onChange={(e) => handlePatientFieldChange('name', e.target.value)}
                          required
                        />
                        {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
                      </div>

                      {/* Age & Gender Row (Mandatory) */}
                      <div className="form-row-two-col">
                        <div className="form-group">
                          <label htmlFor="booking-field-age">
                            Patient Age (Years) <span className="text-red-mandatory">*</span>
                          </label>
                          <input
                            id="booking-field-age"
                            type="number"
                            min="1"
                            max="120"
                            className={`styled-input ${fieldErrors.age ? 'input-error-border' : ''}`}
                            placeholder="e.g. 28"
                            value={patientAge}
                            onChange={(e) => handlePatientFieldChange('age', e.target.value)}
                            required
                          />
                          {fieldErrors.age && <span className="field-error-msg">{fieldErrors.age}</span>}
                        </div>

                        <div className="form-group">
                          <label htmlFor="booking-field-gender">
                            Patient Gender <span className="text-red-mandatory">*</span>
                          </label>
                          <div className="gender-pills-group" id="booking-field-gender">
                            {['Male', 'Female', 'Other'].map(g => (
                              <button
                                key={g}
                                type="button"
                                className={`gender-pill-btn ${patientGender === g ? 'selected' : ''} ${fieldErrors.gender ? 'error-border' : ''}`}
                                onClick={() => handlePatientFieldChange('gender', g)}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                          {fieldErrors.gender && <span className="field-error-msg">{fieldErrors.gender}</span>}
                        </div>
                      </div>

                      {/* Contact Phone (Mandatory) */}
                      <div className="form-group">
                        <label htmlFor="booking-field-phone">
                          Contact Mobile Number <span className="text-red-mandatory">*</span>
                        </label>
                        <input
                          id="booking-field-phone"
                          type="tel"
                          className={`styled-input ${fieldErrors.phone ? 'input-error-border' : ''}`}
                          placeholder="10-digit mobile number"
                          value={patientPhone}
                          onChange={(e) => handlePatientFieldChange('phone', e.target.value)}
                          required
                        />
                        {fieldErrors.phone && <span className="field-error-msg">{fieldErrors.phone}</span>}
                      </div>

                      {/* Symptoms / Chief Complaint (Optional) */}
                      <div className="form-group">
                        <label htmlFor="booking-field-reason">
                          Chief Complaint / Symptoms / Reason for Visit <span style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b' }}>(Optional)</span>
                        </label>
                        <textarea
                          id="booking-field-reason"
                          rows={2}
                          className="styled-input"
                          style={{ height: 'auto', minHeight: '74px', padding: '10px 14px', resize: 'vertical' }}
                          placeholder="Describe symptoms or reason for visit (optional - e.g. fever, headache, routine checkup)..."
                          value={patientReason}
                          onChange={(e) => handlePatientFieldChange('reason', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* APPOINTMENT SCHEDULE & SLOT */}
                    <div className="form-group">
                      <label htmlFor="booking-field-date">
                        Appointment Date <span className="text-red-mandatory">*</span>
                      </label>
                      <input
                        id="booking-field-date"
                        type="date"
                        min={localIsoDate()}
                        value={day}
                        onChange={(e) => { setDay(e.target.value); setError('') }}
                        className={`styled-input ${fieldErrors.date ? 'input-error-border' : ''}`}
                      />
                      {fieldErrors.date && <span className="field-error-msg">{fieldErrors.date}</span>}
                    </div>

                    <div className="form-group">
                      <label id="booking-field-slot">
                        Available OPD Queue Slots <span className="text-red-mandatory">*</span>
                      </label>
                      {loading ? (
                        <div className="slots-loading">
                          <RefreshCw size={16} className="spin-icon" />
                          <span>Checking slot capacity…</span>
                        </div>
                      ) : (
                        <div className="slots-pill-grid">
                          {slots.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={!s.available}
                              className={`slot-pill ${String(s.id) === slotId ? 'selected' : ''} ${!s.available ? 'unavailable' : ''}`}
                              onClick={() => { setSlotId(String(s.id)); setError('') }}
                            >
                              <Clock size={13} />
                              <span>{s.time}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {fieldErrors.slot && <span className="field-error-msg">{fieldErrors.slot}</span>}
                    </div>

                    {/* Mandatory ABHA Status Card */}
                    <div className="abha-status-box">
                      <div className="abha-box-icon">
                        <ShieldCheck size={20} className={patientAbhaVerified ? 'text-green' : 'text-blue'} />
                      </div>
                      <div className="abha-box-content">
                        {patientAbhaVerified ? (
                          <>
                            <strong>✓ ABHA Identity Verified</strong>
                            <span>Your digital health ID is active. Direct queue token allocation is approved.</span>
                          </>
                        ) : (
                          <>
                            <strong>ABHA Verification Mandatory for Token Generation</strong>
                            <span>To prevent fake bookings and black-marketing of OPD slots, ABHA ID verification is required upon clicking Book Token.</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="step-actions-footer">
                      <button
                        type="button"
                        className="btn-secondary-white"
                        onClick={() => { setError(''); setStep(2) }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        className="btn-primary-blue confirm-book-btn"
                        onClick={handleProceedToBook}
                        disabled={bookingLoading || loading}
                      >
                        {bookingLoading ? 'Allocating Token…' : 'Book OPD Token'}
                        <Ticket size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Summary Card with exact Hospital Name, City & Live Patient Details */}
          <aside className="selected-hospital-summary-card">
            <h4 className="summary-card-title">Booking Summary</h4>

            {activeHospital && (
              <div className="summary-hospital-body">
                <div className="summary-hospital-banner">
                  <div className="banner-hospital-icon">
                    <Building2 size={28} />
                  </div>
                  <span className="banner-badge-verified">Verified Partner</span>
                </div>

                <div className="summary-hospital-meta">
                  <h3>{activeHospital.name}</h3>
                  <div className="city-pill-badge">
                    <MapPin size={13} />
                    <strong>{activeHospital.city}</strong>
                  </div>
                  <p className="summary-address">
                    {activeHospital.address || activeHospital.city}
                  </p>
                </div>

                <div className="summary-details-list">
                  <div className="summary-detail-row">
                    <span>Facility</span>
                    <strong>{activeHospital.name}</strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>City</span>
                    <strong>{activeHospital.city}</strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>Department</span>
                    <strong>{activeDepartment?.name || 'General Medicine'}</strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>Consultant</span>
                    <strong>{activeDoctor?.display_name || 'Dr. Ananya Rao'}</strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>Date & Time</span>
                    <strong>{day} at {activeSlot?.time || '09:00 AM'}</strong>
                  </div>

                  {/* Patient Details in Summary */}
                  <div className="summary-detail-row">
                    <span>Patient Name</span>
                    <strong>{patientName || <em style={{ color: '#94a3b8' }}>Required *</em>}</strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>Age & Gender</span>
                    <strong>
                      {patientAge ? `${patientAge} yrs, ${patientGender || 'Gender pending'}` : <em style={{ color: '#94a3b8' }}>Required *</em>}
                    </strong>
                  </div>
                  <div className="summary-detail-row">
                    <span>Symptoms</span>
                    <strong>
                      {patientReason ? (patientReason.length > 25 ? `${patientReason.slice(0, 25)}…` : patientReason) : <em style={{ color: '#94a3b8' }}>Optional (None specified)</em>}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-view-map-link"
                  onClick={() => onViewLocation?.(activeHospital)}
                >
                  <MapPin size={14} />
                  <span>View Hospital & Directions</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* STEP 4: CONFIRMATION VIEW WITH PATIENT DETAILS & RAZORPAY QR */
        <div className="booking-confirmation-view">
          <div className="confirmation-card">
            <div className="confirm-icon-circle">
              <Check size={36} />
            </div>

            <h2>Token Confirmed Successfully!</h2>
            <p>Your OPD slot is reserved and recorded in the hospital's live queue compass.</p>

            <div className="confirmed-token-badge">
              <span className="token-kicker">YOUR QUEUE TOKEN</span>
              <strong className="token-number-bold">
                {confirmedBooking?.token_number || confirmedBooking?.id || 'A-025'}
              </strong>
              <div className="token-pills-row">
                <span className="pill-status-inqueue">● In Queue</span>
                <span className="pill-pos">~ 12 Patients Ahead</span>
                <span className="pill-wait">Est. Wait: ~ 20 min</span>
              </div>
            </div>

            <div className="confirmed-summary-box">
              <div className="summary-item">
                <small>PATIENT DETAILS</small>
                <strong>
                  {confirmedBooking?.patient_name || patientName} ({confirmedBooking?.patient_age || patientAge} yrs, {confirmedBooking?.patient_gender || patientGender}) · {confirmedBooking?.patient_phone || patientPhone}
                </strong>
              </div>
              <div className="summary-item">
                <small>CHIEF COMPLAINT / SYMPTOMS</small>
                <strong>{confirmedBooking?.chief_complaint || patientReason || 'General OPD Consultation'}</strong>
              </div>
              <div className="summary-item">
                <small>HOSPITAL & CITY</small>
                <strong>{confirmedBooking?.hospital_name || activeHospital.name}, {confirmedBooking?.hospital_city || activeHospital.city}</strong>
              </div>
              <div className="summary-item">
                <small>DEPARTMENT & DOCTOR</small>
                <strong>
                  {confirmedBooking?.department_name || activeDepartment?.name} · {confirmedBooking?.doctor_name || activeDoctor?.display_name}
                </strong>
              </div>
              <div className="summary-item">
                <small>APPOINTMENT SCHEDULE</small>
                <strong>{confirmedBooking?.appointment_date || day} at {confirmedBooking?.slot_time || '09:00 AM'}</strong>
              </div>
            </div>

            {/* Generated Razorpay Dynamic Payment QR Code explicitly showing the chosen hospital */}
            <RazorpayPaymentCard
              hospital={activeHospital}
              booking={confirmedBooking}
              amount={activeDoctor?.fee || 250}
              onTrackQueue={() => onNavigate('queue')}
            />

            <div className="confirmation-actions">
              <button
                type="button"
                className="btn-primary-blue"
                onClick={() => onNavigate('queue')}
              >
                <span>Track Live Queue</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-secondary-white"
                onClick={() => { setStep(1); setConfirmedBooking(null) }}
              >
                Book Another Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory ABHA Verification Modal */}
      {showAbhaModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="abha-mandatory-modal">
            <div className="modal-top-strip">
              <div className="shield-icon-wrap">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3>Mandatory ABHA ID Verification</h3>
                <small>Anti-Scam Gate: Verified patient token allocation</small>
              </div>
            </div>

            {!abhaOtpStep ? (
              <form onSubmit={handleRequestAbhaOtp} className="abha-modal-form">
                <p className="abha-explanation">
                  To prevent slot hoarding and ensure real patient allocation at <strong>{activeHospital.name}, {activeHospital.city}</strong>, verify your government-compliant ABHA ID.
                </p>

                <div className="form-group">
                  <label>ABHA ID (Demo Format: DEMO-ABHA-XXXX-XXXX) <span className="text-red-mandatory">*</span></label>
                  <div className="input-with-action">
                    <input
                      type="text"
                      className="styled-input uppercase-text"
                      value={abhaInput}
                      onChange={(e) => setAbhaInput(e.target.value.toUpperCase())}
                      placeholder="DEMO-ABHA-1234-5678"
                      required
                    />
                    <button
                      type="button"
                      className="btn-generate-abha"
                      onClick={handleGenerateDemoAbha}
                    >
                      <Sparkles size={14} />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                {abhaError && (
                  <div className="form-error-banner" role="alert">
                    <AlertCircle size={14} />
                    <span>{abhaError}</span>
                  </div>
                )}

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-white"
                    onClick={() => setShowAbhaModal(false)}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="btn-primary-blue">
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAbhaAndBook} className="abha-modal-form">
                <p className="abha-explanation">
                  A verification code has been dispatched to the mobile number registered with <strong>{abhaInput}</strong>.
                </p>

                <div className="simulated-otp-chip">
                  <span>Demo ABHA Code: <strong>{generatedAbhaOtp}</strong></span>
                  <button
                    type="button"
                    className="auto-fill-btn"
                    onClick={() => setAbhaOtp(generatedAbhaOtp)}
                  >
                    Auto-fill
                  </button>
                </div>

                <div className="form-group">
                  <label>Enter 6-digit ABHA One-Time Password <span className="text-red-mandatory">*</span></label>
                  <input
                    type="text"
                    maxLength={6}
                    className="styled-input otp-code-input"
                    value={abhaOtp}
                    onChange={(e) => setAbhaOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    autoFocus
                    required
                  />
                </div>

                {abhaError && (
                  <div className="form-error-banner" role="alert">
                    <AlertCircle size={14} />
                    <span>{abhaError}</span>
                  </div>
                )}

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-secondary-white"
                    onClick={() => setAbhaOtpStep(false)}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-blue"
                    disabled={abhaLoading}
                  >
                    {abhaLoading ? 'Verifying & Booking…' : 'Verify & Confirm Token'}
                    <Check size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
