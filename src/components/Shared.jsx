import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { getAttribution } from '../lib/attribution'
import { submitSignup } from '../lib/api'
import { trackSignup } from '../lib/tracking'

export const ROLES = ['I host a podcast', 'I run a studio or agency', 'I work on a brand podcast', 'Something else']
export const SHOWS = ['1', '2 to 4', '5 to 10', '11+']
export const EPISODES = ['1 to 4', '5 to 10', '11 to 30', '31+']
export const SPEND = ['I edit myself', 'Under $100', '$100 to $500', '$500 to $2,000', '$2,000+']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Header() {
  return (
    <header className="top">
      <a href="#" aria-label="Ospod home" className="brand">
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="brand-mark">
          <rect width="30" height="30" rx="8" fill="#18213A" />
          <circle cx="15" cy="15" r="7.5" fill="none" stroke="#fff" strokeWidth="2.5" />
          <rect x="13.75" y="4" width="2.5" height="22" rx="1.25" fill="#FFC23D" />
        </svg>
        <span className="brand-name">ospod</span>
      </a>
      <span className="pill"><span className="dot" />Now building</span>
    </header>
  )
}

export function CheckCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#FFC23D" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#18213A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// claimed === null means the count could not be loaded: show the cap, never an invented number.
export function meterState(claimed) {
  const known = claimed !== null && claimed !== undefined
  const full = known && claimed >= CONFIG.cap
  return { known, full, left: known ? Math.max(0, CONFIG.cap - claimed) : null }
}

export function Meter({ claimed, short }) {
  const { known, full, left } = meterState(claimed)
  const filled = known ? Math.floor(Math.min(claimed, CONFIG.cap) / 10) : -1
  const segs = Array.from({ length: 50 }, (_, i) => (
    i < filled ? 'seg on' : (known && i === filled && !full ? 'seg next' : 'seg')
  ))
  const label = known ? `${claimed} of ${CONFIG.cap} founding spots claimed` : `${CONFIG.cap} founding spots`
  return (
    <>
      <div className="meter" role="img" aria-label={label}>
        {segs.map((cls, i) => <span key={i} className={cls} />)}
      </div>
      {known ? (
        <div className={'mtxt' + (short ? ' mtxt-offer' : '')}>
          <span>
            <b>{claimed}</b> of {CONFIG.cap}{' '}
            {!short && <span className="x-long">founding spots </span>}claimed
          </span>
          <span>{full ? 'Founding 500 is full' : `${left} spots left`}</span>
        </div>
      ) : (
        <div className={'mtxt' + (short ? ' mtxt-offer' : '')}>
          <span><b>{CONFIG.cap}</b> founding spots</span>
          <span />
        </div>
      )}
    </>
  )
}

function ChipGroup({ legend, options, value, onPick, last, children }) {
  return (
    <fieldset className={last ? "field field-last" : "field"}>
      <legend className="lab">{legend}</legend>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={value === o ? 'chip on' : 'chip'}
            aria-pressed={value === o ? 'true' : 'false'}
            onClick={() => onPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {children}
    </fieldset>
  )
}

// The form card. Becomes the confirmation after a successful signup.
export function SignupCard({ variant, claimed, onClaimedChange }) {
  const studios = variant === 'studios'
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(studios ? 'I run a studio or agency' : 'I host a podcast')
  const [shows, setShows] = useState('')
  const [eps, setEps] = useState('')
  const [spend, setSpend] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [emailErr, setEmailErr] = useState(false)
  const [pickErr, setPickErr] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState({ memberNo: null, founding: true })
  const mountedAt = useRef(Date.now())
  const doneRef = useRef(null)

  const { full } = meterState(claimed)
  const pick = (setter) => (v) => { setter(v); setPickErr(false) }

  useEffect(() => {
    if (done && doneRef.current) doneRef.current.focus()
  }, [done])

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const badEmail = !EMAIL_RE.test(email.trim())
    const missing = !(role && shows && eps && spend)
    setEmailErr(badEmail)
    setPickErr(missing)
    setFormErr('')
    if (badEmail || missing) return

    setBusy(true)
    const attribution = getAttribution()
    const res = await submitSignup({
      email: email.trim(),
      role,
      shows,
      episodes: eps,
      spend,
      variant,
      page_path: window.location.pathname,
      referrer: attribution.referrer || '',
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      website: honeypot,
      elapsed_ms: Date.now() - mountedAt.current,
    })
    setBusy(false)

    if (res.ok) {
      setResult({ memberNo: res.memberNo, founding: res.founding })
      if (res.claimed !== null && onClaimedChange) onClaimedChange(res.claimed)
      trackSignup()
      setDone(true)
      return
    }
    if (res.kind === 'validation' && res.fields && res.fields.email) {
      setEmailErr(true)
    } else if (res.kind === 'validation') {
      setPickErr(true)
    } else if (res.kind === 'rate_limited') {
      setFormErr('Too many attempts. Please wait a minute and try again.')
    } else {
      setFormErr('We could not save your spot just now. Please try again in a moment.')
    }
  }

  if (done) {
    const founding = result.founding
    return (
      <div className="card" id="join">
        <div className="done" role="status" ref={doneRef} tabIndex={-1}>
          <span className="badge">{founding ? 'Spot claimed' : 'On the waitlist'}</span>
          <h2>
            {founding
              ? (result.memberNo ? <>You&rsquo;re founding member #{result.memberNo}.</> : <>You&rsquo;re a founding member.</>)
              : <>You&rsquo;re on the waitlist.</>}
          </h2>
          <p className="sub">
            {founding
              ? <>Your 50% lock is saved to {email.trim()}. We&rsquo;ll email you when your invite is ready.</>
              : <>We saved {email.trim()}. We&rsquo;ll email you when your invite is ready.</>}
          </p>
          {CONFIG.calendarUrl && (
            <>
              <p className="done-ask">
                {studios
                  ? 'Want a say in what we build first? Walk us through how your studio runs in a 15-minute call.'
                  : 'Want a say in what we build first? Tell us how you make your show in a 15-minute call.'}
              </p>
              <a className="btn" href={CONFIG.calendarUrl} target="_blank" rel="noopener noreferrer">Book a 15-minute call</a>
            </>
          )}
          <button className="btn alt" type="button" onClick={() => setDone(false)}>Back to the form</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" id="join">
      <form onSubmit={submit} noValidate>
        <h2>{full ? 'Join the waitlist' : 'Claim a founding spot'}</h2>
        <p className="sub">
          {full
            ? 'The Founding 500 is full. Join to get early access when we launch.'
            : 'The first 500 people lock in 50% off Ospod for life.'}
        </p>
        <div className="field">
          <label className="lab" htmlFor="email">Email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={studios ? 'you@yourstudio.com' : 'you@yourshow.com'}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailErr(false) }}
            aria-invalid={emailErr ? 'true' : undefined}
          />
          {emailErr && <p className="err">Enter your email so we can hold your spot.</p>}
        </div>

        {/* Honeypot: invisible to people, tempting to bots. Anything typed here is silently dropped. */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <ChipGroup legend="Which describes you?" options={ROLES} value={role} onPick={pick(setRole)} />
        <ChipGroup legend="How many shows do you produce?" options={SHOWS} value={shows} onPick={pick(setShows)} />
        <ChipGroup legend="Episodes a month, across all shows" options={EPISODES} value={eps} onPick={pick(setEps)} />
        <ChipGroup legend="What do you spend on editing a month now?" options={SPEND} value={spend} onPick={pick(setSpend)} last>
          {pickErr && <p className="err">Answer all four questions to claim your spot.</p>}
        </ChipGroup>

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving your spot…' : (full ? 'Join the waitlist' : 'Claim my founding spot')}
        </button>
        {formErr && <p className="err err-form" role="alert">{formErr}</p>}
        <p className="fine">Free to join. No card. We&rsquo;ll only email you about Ospod.</p>
      </form>
    </div>
  )
}

export function OfferBand({ claimed }) {
  const { full } = meterState(claimed)
  return (
    <section className="sec">
      <div className="offer dark">
        <div>
          <p className="big">{full ? 'Founding 500 is full' : 'Founding 500'}</p>
          <p>
            {full
              ? 'Thank you to the first 500. Join the waitlist to get early access when Ospod launches.'
              : 'Join the waitlist free today. The first 500 people get 50% off Ospod for life.'}
          </p>
          <p className="terms">
            {full ? '' : '50% off any plan, for as long as your subscription stays active. No card needed to join.'}
          </p>
        </div>
        <div>
          <Meter claimed={claimed} short />
          <a className="btn y" href="#join">{full ? 'Join the waitlist' : 'Claim my founding spot'}</a>
        </div>
      </div>
    </section>
  )
}

export function Faq({ items }) {
  return (
    <section className="sec">
      <h2 className="h2">Questions</h2>
      <div className="faq">
        {items.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </div>
    </section>
  )
}

export function Footer({ credit }) {
  return (
    <footer className="foot">
      <span className="foot-brand">ospod</span>
      {credit && <span>{credit}</span>}
      <nav>
        {CONFIG.contactEmail && <a href={`mailto:${CONFIG.contactEmail}`}>Contact</a>}
        <a href="/privacy">Privacy</a>
      </nav>
    </footer>
  )
}
