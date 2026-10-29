// Runtime validation coverage for hospital data and queue helpers.
import { describe, expect, it } from 'vitest'
import { distanceKm, doctorsByDept, hospitalKey, initialHospitals, navItems, opdKey } from './appData.js'

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

  it('calculates zero distance for identical coordinates', () => {
    expect(distanceKm({ lat: 12.9, lon: 77.6 }, { lat: 12.9, lon: 77.6 })).toBe(0)
  })
})
