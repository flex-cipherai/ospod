// Optional ad conversion tracking. Does nothing unless an ID is set in the environment, so by default
// no third-party script is loaded and the privacy page stays accurate.
import { CONFIG } from '../config'

let loaded = false

export function initTracking() {
  if (loaded || typeof window === 'undefined') return
  loaded = true

  if (CONFIG.metaPixelId) {
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }
      if (!f._fbq) f._fbq = n
      n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []
      t = b.createElement(e); t.async = !0; t.src = 'https://connect.facebook.net/en_US/fbevents.js'
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    })(window, document, 'script')
    /* eslint-enable */
    window.fbq('init', CONFIG.metaPixelId)
    window.fbq('track', 'PageView')
  }

  if (CONFIG.linkedinPartnerId) {
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
    window._linkedin_data_partner_ids.push(CONFIG.linkedinPartnerId)
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'
    document.head.appendChild(s)
  }
}

// Call once, right after the server confirms a signup.
export function trackSignup() {
  try {
    if (CONFIG.metaPixelId && window.fbq) window.fbq('track', 'Lead')
    if (CONFIG.linkedinConversionId && window.lintrk) {
      window.lintrk('track', { conversion_id: Number(CONFIG.linkedinConversionId) })
    }
  } catch (_) { /* tracking must never break the signup */ }
}
