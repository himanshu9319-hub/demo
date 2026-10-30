// Runtime validation coverage for hospital data and queue helpers.
import { describe, expect, it } from 'vitest'
import { createDoctorDirectory, distanceKm, doctorsByDept, hospitalKey, initialHospitals, navItems, opdKey } from './appData.js'

describe('hospital and queue helpers', () => {
  it('provides location data and stable keys for sample hospitals', () => {
    expect(initialHospitals.length).toBeGreaterThan(0)
    expect(initialHospitals[0].latitude).toBe(initialHospitals[0].lat)
    expect(hospitalKey(initialHospitals[0])).toBe('Bengaluru::Apollo Hospitals')
    expect(opdKey(initialHospitals[0], 'Cardiology')).toBe('Bengaluru::Apollo Hospitals::Cardiology')
  })

  it('provides navigation icons and department doctors', () => {
    expect(navItems).toHaveLength(5)
    expect(navItems.every(item => item.icon)).toBe(true)
    expect(doctorsByDept.Cardiology).toContain('Dr. Neha Shah')
  })

  it('generates selectable demo profiles with bounded metrics for every doctor', () => {
    const directory = createDoctorDirectory(() => 0.5)
    expect(directory).toHaveLength(Object.values(doctorsByDept).flat().length)
    expect(directory.find(doctor => doctor.name === 'Dr. Neha Shah')).toMatchObject({
      department: 'Cardiology',
      experienceYears: 15,
      rating: 4.6,
      patientsToday: 17,
      availableSlots: 4,
      averageMinutes: 18,
    })
    expect(directory.every(doctor => doctor.id === `${doctor.department}::${doctor.name}`)).toBe(true)
  })

  it('calculates zero distance for identical coordinates', () => {
    expect(distanceKm({ lat: 12.9, lon: 77.6 }, { lat: 12.9, lon: 77.6 })).toBe(0)
  })
})
