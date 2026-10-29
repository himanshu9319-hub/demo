import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { AppHeader } from './components/AppHeader'
import { AppFooter, BottomNavigation } from './components/AppNavigation'
import { AuthModal } from './components/AuthModal'
import { IconButton } from './components/IconButton'
import { LocationPanel } from './components/LocationPanel'
import { HomePage } from './components/pages/HomePage'
import { NearbyPage } from './components/pages/NearbyPage'
import { BookingPage } from './components/pages/BookingPage'
import { QueuePage } from './components/pages/QueuePage'
import { StaffPage } from './components/pages/StaffPage'
import { HospitalDashboard } from './components/dashboards/HospitalDashboard'
import { initialHospitals, departments, doctorsByDept, hospitalKey, opdKey, loadJson, persistJson, PHOTON_API, distanceKm } from './lib/appData'
import { getResults, patientDemoLogin, setApiAccessToken } from './lib/queueApi'

function App() {
  const [tab, setTab] = useState('home'), [city, setCity] = useState('Dehradun'), [cityCenter, setCityCenter] = useState({ lat: 30.3255646, lon: 78.0436813 }), [citySelected, setCitySelected] = useState(true), [search, setSearch] = useState(''), [dark, setDark] = useState(false), [booking, setBooking] = useState(null), [token, setToken] = useState(() => loadJson('queuefree-token', null)), [toast, setToast] = useState(''), [locationAsked, setLocationAsked] = useState(false), [liveHospitals, setLiveHospitals] = useState([]), [hospitalLoading, setHospitalLoading] = useState(false), [hospitalError, setHospitalError] = useState(''), [queues, setQueues] = useState(() => loadJson('queuefree-queues', {})), [dept, setDept] = useState(departments[0]), [doctor, setDoctor] = useState(doctorsByDept[departments[0]][0]), [staffHospital, setStaffHospital] = useState(''), [staffDept, setStaffDept] = useState(departments[0]), [paused, setPaused] = useState(() => loadJson('queuefree-paused', {})), [avgMinutes, setAvgMinutes] = useState(() => loadJson('queuefree-average', {})), [delayMinutes, setDelayMinutes] = useState(() => loadJson('queuefree-delay', {})), [citySuggestions, setCitySuggestions] = useState([]), [authOpen, setAuthOpen] = useState(false), [authStep, setAuthStep] = useState(0), [demoAbha, setDemoAbha] = useState(''), [abhaInput, setAbhaInput] = useState(''), [otp, setOtp] = useState(''), [otpCode, setOtpCode] = useState(''), [otpAttempts, setOtpAttempts] = useState(0), [otpExpires, setOtpExpires] = useState(0), [verified, setVerified] = useState(false), [phoneNumber, setPhoneNumber] = useState(''), [whatsappConsent, setWhatsappConsent] = useState(false), [authLoading, setAuthLoading] = useState(false), [authError, setAuthError] = useState(''), [language, setLanguage] = useState('en'), [apiAccessToken, setApiAccessTokenState] = useState(''), [apiBookings, setApiBookings] = useState([]), [apiError, setApiError] = useState('')
  const bookingLock = useRef(false)
  const [locationHospital, setLocationHospital] = useState(null)
  const closeAuth = useCallback(() => {
    setAuthOpen(false)
    setAuthStep(0)
    setDemoAbha('')
    setAbhaInput('')
    setOtp('')
    setOtpCode('')
    setOtpAttempts(0)
    setOtpExpires(0)
    setVerified(false)
    setPhoneNumber('')
    setWhatsappConsent(false)
    setAuthError('')
    setAuthLoading(false)
  }, [])
  const hospitals = liveHospitals
  const bookedHospitals = Object.values(queues).flat().map(item => ({ id: item.qkey + item.hospital, name: item.hospital, city: item.city, area: item.area, address: item.hospitalAddress, lat: item.hospitalLat, lng: item.hospitalLng, phone: item.phone, openingHours: item.openingHours, distance: '—', rating: null, specialty: 'Hospital' }))
  const allHospitals = [...initialHospitals, ...liveHospitals, ...bookedHospitals]
  const staffOptions = [...new Map(allHospitals.map(h => [hospitalKey(h), h])).values()]

  useEffect(() => persistJson('queuefree-queues', queues), [queues])
  useEffect(() => persistJson('queuefree-paused', paused), [paused])
  useEffect(() => persistJson('queuefree-average', avgMinutes), [avgMinutes])
  useEffect(() => persistJson('queuefree-delay', delayMinutes), [delayMinutes])
  useEffect(() => { if (token) persistJson('queuefree-token', token); else localStorage.removeItem('queuefree-token') }, [token])
  useEffect(() => {
    const sync = e => {
      if (e.key === 'queuefree-queues' && e.newValue) setQueues(loadJson('queuefree-queues', {}))
      if (e.key === 'queuefree-token') setToken(loadJson('queuefree-token', null))
      if (e.key === 'queuefree-paused') setPaused(loadJson('queuefree-paused', {}))
      if (e.key === 'queuefree-average') setAvgMinutes(loadJson('queuefree-average', {}))
      if (e.key === 'queuefree-delay') setDelayMinutes(loadJson('queuefree-delay', {}))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  useEffect(() => {
    setApiAccessToken(apiAccessToken)
    if (!apiAccessToken) {
      setApiBookings([])
      return
    }
    let active = true
    const refresh = () => getResults('/bookings/').then(data => {
      if (active) { setApiBookings(data); setApiError('') }
    }).catch(error => {
      if (active && error.status === 401) {
        setApiAccessToken('')
        setApiAccessTokenState('')
        setToast('Your shared API session expired. Please sign in again.')
      } else if (active) setApiError(error.message)
    })
    refresh()
    const interval = window.setInterval(refresh, Math.max(2000, Number(import.meta.env.VITE_API_POLL_MS || 5000)))
    return () => {
      active = false
      window.clearInterval(interval)
      setApiAccessToken('')
    }
  }, [apiAccessToken])

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id) }, [toast])
  useEffect(() => {
    const query = city.trim()
    if (tab !== 'nearby' || query.length < 2 || citySelected) { setCitySuggestions([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: '8', lang: language === 'hi' ? 'en' : language })
        params.append('layer', 'city'); params.append('layer', 'locality')
        const response = await fetch(`${PHOTON_API}/api/?${params}`)
        if (!response.ok) throw new Error('City suggestions are temporarily unavailable')
        const data = await response.json()
        if (!cancelled) setCitySuggestions((data.features || []).filter(f => f.geometry?.coordinates?.length === 2).map(f => {
          const p = f.properties, [lon, lat] = f.geometry.coordinates
          return { id: `${p.osm_type}-${p.osm_id}`, name: p.name || query, label: [p.name, p.state, p.country].filter(Boolean).join(', '), lat, lon }
        }))
      } catch { if (!cancelled) setCitySuggestions([]) }
    }, 900)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [city, citySelected, language, tab])
  useEffect(() => {
    if (tab !== 'nearby' || !citySelected || !cityCenter) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setHospitalLoading(true); setHospitalError('')
      try {
        const params = new URLSearchParams({ q: search.trim() || 'hospital', lat: String(cityCenter.lat), lon: String(cityCenter.lon), limit: '30', zoom: '13', lang: 'en' })
        params.append('osm_tag', 'amenity:hospital'); params.append('osm_tag', 'healthcare:hospital')
        const response = await fetch(`${PHOTON_API}/api/?${params}`, { signal: controller.signal, headers: { Accept: 'application/geo+json' } })
        if (!response.ok) throw new Error('Hospital listings are temporarily unavailable. Please retry in a moment.')
        const data = await response.json()
        const results = (data.features || []).map(feature => {
          const p = feature.properties || {}, [lon, lat] = feature.geometry?.coordinates || []
          const extra = p.extra || {}
          const street = [p.housenumber, p.street].filter(Boolean).join(' ')
          const area = p.locality || p.district || p.city || p.county || city
          return { id: `${p.osm_type}-${p.osm_id}`, name: p.name || 'Unnamed hospital', city: p.city || p.county || city, area, address: [street, area, p.state, p.postcode].filter(Boolean).join(', '), state: p.state, pincode: p.postcode, lat, lng: lon, latitude: lat, longitude: lon, googlePlaceId: p.google_place_id || null, openingHours: p.opening_hours || extra.opening_hours, emergency24x7: /24\s*\/?\s*7/i.test(p.opening_hours || extra.opening_hours || '') || null, distanceKm: Number.isFinite(lat) && Number.isFinite(lon) ? distanceKm(cityCenter, { lat, lon }) : null, specialty: p.osm_value === 'hospital' ? 'Hospital' : p.osm_value || 'Hospital', phone: p.phone || extra.phone, website: p.website || extra.website, hours: p.opening_hours || extra.opening_hours }
        }).filter(h => h.name !== 'Unnamed hospital' && (h.distanceKm == null || h.distanceKm < 50)).sort((a,b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)).map(h => ({ ...h, distance: h.distanceKm == null ? 'Nearby' : `${h.distanceKm.toFixed(1)} km away`, rating: null, wait: null }))
        setLiveHospitals(results)
        if (!results.length) setHospitalError('No mapped hospitals were found near this city. Try another city name or use your location.')
      } catch (error) {
        if (!controller.signal.aborted) { setLiveHospitals([]); setHospitalError(error.message || 'Could not load hospital listings right now.') }
      } finally { if (!controller.signal.aborted) setHospitalLoading(false) }
    }, search ? 750 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [city, cityCenter, citySelected, search, tab])

  const goTo = (next) => {
    if (next === 'staff' || next === 'reception') { window.location.assign('/reception'); return }
    if (next === 'doctor') { window.location.assign('/doctor'); return }
    setTab(next); setSearch(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const useLocation = () => {
    if (!navigator.geolocation) { setToast('Location isn’t available on this device'); return }
    setLocationAsked(true)
    navigator.geolocation.getCurrentPosition(pos => {
      const center = { lat: pos.coords.latitude, lon: pos.coords.longitude }
      setCityCenter(center); setCitySelected(true); setCitySuggestions([]); setTab('nearby')
      fetch(`${PHOTON_API}/reverse?lat=${center.lat}&lon=${center.lon}&lang=en`, { headers: { Accept: 'application/geo+json' } })
        .then(r => r.ok ? r.json() : null).then(data => {
          const p = data?.features?.[0]?.properties
          if (p) setCity([p.city || p.name || p.county, p.state, p.country].filter(Boolean).join(', '))
          setToast('Showing hospitals close to your location')
        }).catch(() => { setCity('Near me'); setToast('Showing hospitals close to your location') })
        .finally(() => setLocationAsked(false))
    }, () => { setLocationAsked(false); setToast('Could not access your location. Enter a city to continue.') }, { timeout: 10000 })
  }
  const openHospitalLocation = h => setLocationHospital(h)
  const chooseLocationHospital = h => { setBooking(h); setCity(h.city); setLocationHospital(null); if (tab === 'nearby') setTab('book') }
  const bookHospital = h => { bookingLock.current = false; setBooking(h); setCity(h.city); setDept(departments[0]); setDoctor(doctorsByDept[departments[0]][0]); setTab('book'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const confirmBooking = e => {
    e.preventDefault()
    if (bookingLock.current) { setToast('Your booking is being confirmed'); return }
    bookingLock.current = true
    if (!booking) { bookingLock.current = false; setToast('Choose a hospital before booking'); return }
    if (token && ['waiting', 'serving'].includes(token.status)) { bookingLock.current = false; setToast('You already have an active token. Cancel it before booking another.'); return }
    const qkey = opdKey(booking, dept), now = Date.now(), n = (queues[qkey] || []).length + 1
    const item = { id: `QF-${String(n).padStart(3,'0')}-${Math.random().toString(36).slice(2,5).toUpperCase()}`, hospital: booking.name, city: booking.city, area: booking.area, hospitalAddress: booking.address, hospitalLat: booking.lat || booking.latitude, hospitalLng: booking.lng || booking.lon || booking.longitude, phone: booking.phone, openingHours: booking.openingHours || booking.hours, department: dept, doctor, date: e.currentTarget.date.value, slot: e.currentTarget.slot.value, status: 'waiting', createdAt: now, average: Number(avgMinutes[qkey] || 8) }
    setQueues(q => ({ ...q, [qkey]: [...(q[qkey] || []), item] }))
    setToken({ ...item, qkey }); setTab('queue'); setToast('Your demo OPD token is confirmed'); setTimeout(() => { bookingLock.current = false }, 600)
  }
  const updateQueue = (qkey, action) => {
    const list = [...(queues[qkey] || [])], current = list.findIndex(x => x.status === 'serving'), next = list.findIndex(x => x.status === 'waiting')
    if (action === 'next' || action === 'complete') {
      if (current >= 0) list[current] = { ...list[current], status: 'completed', completedAt: Date.now() }
      const upcoming = list.findIndex(x => x.status === 'waiting')
      if (action === 'next' && upcoming >= 0 && !paused[qkey]) list[upcoming] = { ...list[upcoming], status: 'serving' }
      if (action === 'complete' && upcoming >= 0 && !paused[qkey]) list[upcoming] = { ...list[upcoming], status: 'serving' }
    } else if (action === 'skip' && current >= 0) { list[current] = { ...list[current], status: 'skipped' }; const upcoming = list.findIndex(x => x.status === 'waiting'); if (upcoming >= 0 && !paused[qkey]) list[upcoming] = { ...list[upcoming], status: 'serving' } }
    else if (action === 'start' && next >= 0 && !paused[qkey]) list[next] = { ...list[next], status: 'serving' }
    setQueues({ ...queues, [qkey]: list })
    const nextToken = token && token.qkey === qkey ? list.find(x => x.id === token.id) : null
    if (nextToken) setToken({ ...nextToken, qkey })
  }
  const beginAbha = () => {
    const numbers = new Uint32Array(2); crypto.getRandomValues(numbers)
    const id = `DEMO-ABHA-${String(numbers[0] % 10000).padStart(4,'0')}-${String(numbers[1] % 10000).padStart(4,'0')}`
    setDemoAbha(id); setAbhaInput(id); setAuthStep(0); setOtp(''); setOtpCode(''); setOtpAttempts(0); setVerified(false); setAuthError('')
  }
  const requestDemoOtp = e => {
    e.preventDefault()
    setAuthError('')
    const phone = phoneNumber.trim()
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) { setAuthError('Enter a valid phone number with country code, such as +91 followed by your number.'); return }
    if (!whatsappConsent) { setAuthError('Consent is required to continue with this demo sign-in.'); return }
    const id = abhaInput.trim().toUpperCase()
    if (id !== demoAbha || !/^DEMO-ABHA-\d{4}-\d{4}$/.test(id)) { setAuthError('Use the generated fake demo ID to continue.'); return }
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes)
    setOtpCode(String(100000 + bytes[0] % 900000)); setOtpExpires(Date.now() + 5 * 60 * 1000); setOtpAttempts(0); setOtp(''); setAuthStep(1)
  }
  const verifyDemoOtp = async e => {
    e.preventDefault()
    setAuthError('')
    if (Date.now() > otpExpires) { setAuthError('Demo code expired. Go back and generate a new one.'); return }
    if (otp === otpCode) {
      setAuthLoading(true)
      try {
        const session = await patientDemoLogin(abhaInput.trim().toUpperCase(), phoneNumber.trim(), whatsappConsent)
        setApiAccessTokenState(session.access)
        setVerified(true)
        setOtp('')
        setOtpCode('')
        setToast('Simulated ABHA verified; shared QueueFree demo session connected')
      } catch (error) {
        setAuthError(`Could not complete demo sign-in: ${error.message}`)
      } finally {
        setAuthLoading(false)
      }
      return
    }
    const attempts = otpAttempts + 1; setOtpAttempts(attempts); setOtp('')
    setAuthError(attempts >= 3 ? 'Too many attempts. Go back and restart demo verification.' : `That code does not match. ${3-attempts} attempts left.`)
  }
  const activeQueue = token?.qkey ? queues[token.qkey] || [] : []
  const tokenIndex = token ? activeQueue.findIndex(x => x.id === token.id) : -1
  const earlierQueue = tokenIndex >= 0 ? activeQueue.slice(0, tokenIndex) : []
  const ahead = earlierQueue.filter(x => x.status === 'waiting').length
  const servingAhead = earlierQueue.some(x => x.status === 'serving')
  const estimated = token ? Math.max(0, (ahead + (servingAhead ? 1 : 0)) * Number(avgMinutes[token.qkey] || token.average || 8) + Number(delayMinutes[token.qkey] || 0) + (paused[token.qkey] ? 10 : 0)) : 0
  const staffTarget = staffOptions.find(h => hospitalKey(h) === staffHospital) || staffOptions[0]
  const staffHospitalKey = staffTarget ? hospitalKey(staffTarget) : ''
  const staffKey = staffTarget ? opdKey(staffTarget, staffDept) : ''
  const staffQueue = staffKey ? queues[staffKey] || [] : []
  const labels = language === 'hi' ? { home: 'होम', book: 'बुक करें', queue: 'कतार', nearby: 'आसपास', staff: 'स्टाफ', signin: 'ABHA लॉगिन', hero: 'लाइन से बचें, समय बचाएँ।', heroCopy: 'घर से अस्पताल का OPD टोकन बुक करें और अपनी बारी की स्थिति देखें।', bookCta: 'टोकन बुक करें', queueCta: 'कतार की स्थिति देखें', nearbyTitle: 'पास का अस्पताल खोजें', bookingTitle: 'OPD टोकन बुक करें', queueTitle: 'आपकी कतार की स्थिति', staffTitle: 'अस्पताल कतार नियंत्रण', location: 'मेरी लोकेशन' } : { home: 'Home', book: 'Book', queue: 'Queue', nearby: 'Nearby', staff: 'Staff', signin: 'ABHA sign in', hero: 'Skip the line, save your time.', heroCopy: 'Book your hospital OPD token from home, track the live queue, and walk in just before your turn.', bookCta: 'Book your token', queueCta: 'Check queue status', nearbyTitle: 'Find a hospital nearby', bookingTitle: 'Book your OPD token', queueTitle: 'Your queue, at a glance', staffTitle: 'Hospital queue controls', location: 'Use my location' }

  const hospitalForToken = token ? allHospitals.find(hospital => hospital.name === token.hospital && (!token.city || hospital.city === token.city)) || { name: token.hospital, city: token.city, area: token.area, address: token.hospitalAddress, lat: token.hospitalLat, lng: token.hospitalLng, phone: token.phone, openingHours: token.openingHours } : null
  const queueLengthForHospital = token ? Object.values(queues).flat().filter(item => item.hospital === token.hospital && item.status === 'waiting').length : 0
  const refreshPatientBookings = async () => {
    if (!apiAccessToken) return
    setApiBookings(await getResults('/bookings/'))
  }
  const onApiBookingConfirmed = async bookingResult => {
    setToast(bookingResult.message)
    setTab('queue')
    await refreshPatientBookings()
  }
  const pageProps = { labels, token, activeQueue, ahead, estimated, goTo, city, cityCenter, citySelected, useLocation, onViewLocation: openHospitalLocation, hospitalForToken, queueLengthForHospital, search, setSearch, citySuggestions, setCity, setCityCenter, setCitySelected, setCitySuggestions, setLiveHospitals, setHospitalError, hospitals, hospitalLoading, hospitalError, booking, initialHospitals, setBooking, dept, setDept, doctor, setDoctor, doctorsByDept, departments, confirmBooking, queues, setQueues, setToken, setToast, staffTarget, staffHospitalKey, setStaffHospital, staffOptions, staffDept, setStaffDept, staffQueue, setAvgMinutes, avgMinutes, staffKey, delayMinutes, setDelayMinutes, paused, setPaused, updateQueue, bookHospital, apiMode: true, apiAuthenticated: Boolean(apiAccessToken), apiBookings, apiError, refreshPatientBookings, onApiBookingConfirmed }

  if (['/reception', '/hospital', '/doctor'].includes(window.location.pathname)) {
    return <HospitalDashboard role={window.location.pathname === '/doctor' ? 'doctor' : 'reception'} />
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <AppHeader goTo={goTo} language={language} setLanguage={setLanguage} dark={dark} setDark={setDark} onSignIn={() => { setAuthOpen(true); setAuthStep(0) }} labels={labels} />

    <a className="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content" key={tab} className="page-transition">
      {tab === 'home' && <HomePage {...pageProps} />}

      {tab === 'nearby' && <NearbyPage {...pageProps} />}

      {tab === 'book' && <BookingPage {...pageProps} />}

      {tab === 'queue' && <QueuePage {...pageProps} />}
      {tab === 'staff' && <StaffPage {...pageProps} />}
    </main>

    <AppFooter />
    <BottomNavigation tab={tab} goTo={goTo} labels={labels} />
    {toast && <div className="toast" role="status" aria-live="polite"><Check size={16}/>{toast}<IconButton label="Dismiss" onClick={() => setToast('')}><X size={15}/></IconButton></div>}
    <AuthModal open={authOpen} onClose={closeAuth} authStep={authStep} setAuthStep={setAuthStep} demoAbha={demoAbha} abhaInput={abhaInput} setAbhaInput={setAbhaInput} phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} whatsappConsent={whatsappConsent} setWhatsappConsent={setWhatsappConsent} otp={otp} setOtp={setOtp} otpCode={otpCode} otpAttempts={otpAttempts} verified={verified} loading={authLoading} error={authError} setError={setAuthError} beginAbha={beginAbha} requestDemoOtp={requestDemoOtp} verifyDemoOtp={verifyDemoOtp} />
    {locationHospital && <LocationPanel hospital={locationHospital} origin={cityCenter} onClose={() => setLocationHospital(null)} onSelect={chooseLocationHospital} liveQueueLength={Object.values(queues).flat().filter(item => item.hospital === locationHospital.name && item.status === 'waiting').length} />}
    {locationAsked && <span className="sr-only" aria-live="polite">Checking your location</span>}
  </div>
}

export default App
