import { Activity, HeartPulse, MapPin, Ticket, BriefcaseMedical } from 'lucide-react'

const hospitalSamples = [
  { name: 'Apollo Hospitals', city: 'Bengaluru', area: 'Bannerghatta Road', distance: '2.4 km', rating: '4.8', wait: '18 min', specialty: 'Multi-specialty', lat: 12.8958, lng: 77.5996 },
  { name: 'Manipal Hospital', city: 'Bengaluru', area: 'Old Airport Road', distance: '5.1 km', rating: '4.7', wait: '24 min', specialty: 'Multi-specialty', lat: 12.9592, lng: 77.6484 },
  { name: 'Fortis Hospital', city: 'Bengaluru', area: 'Cunningham Road', distance: '3.8 km', rating: '4.6', wait: '12 min', specialty: 'Multi-specialty', lat: 12.9997, lng: 77.5946 },
  { name: 'AIIMS Delhi', city: 'Delhi', area: 'Ansari Nagar', distance: '3.2 km', rating: '4.9', wait: '42 min', specialty: 'Government', lat: 28.5672, lng: 77.21 },
  { name: 'Max Super Speciality Hospital', city: 'Delhi', area: 'Saket', distance: '6.8 km', rating: '4.7', wait: '26 min', specialty: 'Multi-specialty', lat: 28.5275, lng: 77.2145 },
  { name: 'Apollo Hospitals', city: 'Chennai', area: 'Greams Road', distance: '2.1 km', rating: '4.8', wait: '16 min', specialty: 'Multi-specialty', lat: 13.0634, lng: 80.2518 },
  { name: 'Kokilaben Hospital', city: 'Mumbai', area: 'Andheri West', distance: '4.3 km', rating: '4.8', wait: '21 min', specialty: 'Multi-specialty', lat: 19.1312, lng: 72.8244 },
  { name: 'Tata Memorial Hospital', city: 'Mumbai', area: 'Parel', distance: '6.1 km', rating: '4.9', wait: '38 min', specialty: 'Cancer care', lat: 19.003, lng: 72.843 },
  { name: 'Yashoda Hospitals', city: 'Hyderabad', area: 'Somajiguda', distance: '3.1 km', rating: '4.7', wait: '19 min', specialty: 'Multi-specialty', lat: 17.4239, lng: 78.4618 },
  { name: 'Ruby Hall Clinic', city: 'Pune', area: 'Sassoon Road', distance: '2.6 km', rating: '4.7', wait: '15 min', specialty: 'Multi-specialty', lat: 18.5295, lng: 73.876 },
]

// Keep a consistent location shape for static demo rows; unknown business data stays null.
export const initialHospitals = hospitalSamples.map(hospital => ({
  ...hospital,
  address: null,
  state: null,
  pincode: null,
  latitude: hospital.lat,
  longitude: hospital.lng,
  googlePlaceId: null,
  phone: null,
  openingHours: null,
  emergency24x7: null,
}))

export const departments = ['General Medicine', 'Cardiology', 'Orthopedics', 'Dermatology', 'Pediatrics']

export const doctorsByDept = {
  'General Medicine': ['Dr. Ananya Rao', 'Dr. Karan Mehta'],
  Cardiology: ['Dr. Neha Shah', 'Dr. R. Iyer'],
  Orthopedics: ['Dr. Arjun Nair', 'Dr. Kavita Rao'],
  Dermatology: ['Dr. Sana Ali', 'Dr. P. Menon'],
  Pediatrics: ['Dr. Maya Joshi', 'Dr. Vivek Rao'],
}

export const navItems = [
  { id: 'home', label: 'Home', icon: HeartPulse },
  { id: 'book', label: 'Book', icon: Ticket },
  { id: 'queue', label: 'Queue', icon: Activity },
  { id: 'nearby', label: 'Nearby', icon: MapPin },
  { id: 'staff', label: 'Staff', icon: BriefcaseMedical },
]

export const hospitalKey = hospital => `${hospital.city}::${hospital.name}`
export const opdKey = (hospital, department) => `${hospitalKey(hospital)}::${department}`

export function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function persistJson(key, value) {
  const json = JSON.stringify(value)
  if (localStorage.getItem(key) !== json) localStorage.setItem(key, json)
}

export const PHOTON_API = 'https://photon.komoot.io'

export function distanceKm(from, to) {
  const radians = degrees => degrees * Math.PI / 180
  const latitude = radians(to.lat - from.lat)
  const longitude = radians(to.lon - from.lon)
  const arc = Math.sin(latitude / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitude / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc))
}
