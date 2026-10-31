const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')
let accessToken = ''

export function setApiAccessToken(token) {
  accessToken = token || ''
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const error = body?.error
    const detail = error?.details
    const message = typeof detail?.message === 'string'
      ? detail.message
      : typeof error?.message === 'string' && error.message !== 'The request could not be completed.'
        ? error.message
        : typeof detail === 'string' ? detail : `QueueFree API request failed (${response.status}).`
    const requestError = new Error(message)
    requestError.status = response.status
    requestError.details = detail
    throw requestError
  }
  return body
}

export async function getResults(path) {
  const response = await apiRequest(path)
  return Array.isArray(response) ? response : response.results || []
}

export async function patientDemoLogin(identifier, phone, whatsappConsent) {
  return apiRequest('/auth/patient/demo/', {
    method: 'POST',
    body: {
      abha_demo_identifier: identifier,
      phone,
      whatsapp_notifications_consent: whatsappConsent,
    },
  })
}

export async function patientPhoneLogin(phone, name = 'Ambika Sharma', email = 'ambika.sharma@example.com') {
  return apiRequest('/auth/patient/phone/', {
    method: 'POST',
    body: { phone, name, email },
  })
}

export async function patientVerifyAbha(abha_identifier, whatsappConsent = true) {
  return apiRequest('/auth/patient/verify-abha/', {
    method: 'POST',
    body: {
      abha_identifier,
      whatsapp_notifications_consent: whatsappConsent,
    },
  })
}

export async function staffLogin(username, password) {
  return apiRequest('/auth/staff/login/', { method: 'POST', body: { username, password } })
}

export async function createBooking(payload) {
  return apiRequest('/bookings/', { method: 'POST', body: payload })
}

export function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
