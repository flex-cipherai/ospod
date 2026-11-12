import { CONFIG } from '../config'

const TIMEOUT_MS = 15000

async function request(options) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(CONFIG.apiUrl, { ...options, signal: ctrl.signal })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  } finally {
    clearTimeout(timer)
  }
}

// How many founding spots are taken. Returns null if it cannot be read, and the page then shows no number
// rather than a made-up one.
export async function fetchClaimed() {
  try {
    const { status, data } = await request({ method: 'GET' })
    if (status === 200 && Number.isFinite(data.claimed)) return data.claimed
  } catch (_) { /* offline or blocked: show no count */ }
  return null
}

// Resolves { ok: true, memberNo, founding, claimed } or { ok: false, kind, fields? }.
// kind: 'validation' | 'rate_limited' | 'network' | 'server'
export async function submitSignup(payload) {
  try {
    const { status, data } = await request({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (status === 200 && data.ok) {
      return { ok: true, memberNo: data.member_no ?? null, founding: data.founding !== false, claimed: data.claimed ?? null }
    }
    if (status === 400) return { ok: false, kind: 'validation', fields: data.fields || {} }
    if (status === 429) return { ok: false, kind: 'rate_limited' }
    return { ok: false, kind: 'server' }
  } catch (_) {
    return { ok: false, kind: 'network' }
  }
}
