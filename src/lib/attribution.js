// Where the visitor came from, so every signup can be tied to the ad that brought it (ig_30, li_15 ...).
// Captured once per browser tab session, so it survives moving between the two pages and a refresh.
const KEY = 'ospod_attribution'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

function readStored() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null') || {}
  } catch (_) {
    return {}
  }
}

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const fresh = {}
    for (const f of FIELDS) {
      const v = params.get(f)
      if (v) fresh[f] = v.slice(0, 120)
    }
    const stored = readStored()
    // New UTM tags replace the old ones; with none in the URL, keep whatever this session already had.
    const next = Object.keys(fresh).length
      ? { ...fresh, referrer: document.referrer || stored.referrer || '' }
      : { ...stored, referrer: stored.referrer ?? (document.referrer || '') }
    sessionStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch (_) {
    return {}
  }
}

export function getAttribution() {
  return readStored()
}
