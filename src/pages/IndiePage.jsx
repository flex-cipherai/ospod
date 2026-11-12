import { CheckCircle, Faq, Footer, Header, Meter, OfferBand, SignupCard } from '../components/Shared'
import { useClaimed } from '../lib/useClaimed'

const OUTPUTS = [
  ['Edited episode', 'Both cameras, switched to whoever is talking'],
  ['Trailer', 'A 45-second cut of the best moments'],
  ['Vertical clips', 'Captioned and framed on the speaker'],
  ['Titles, chapters and show notes', 'Drafted for you to edit'],
  ['Published on your schedule', 'YouTube, your podcast host, Instagram and TikTok'],
]

const FAQ = [
  ['Can I use Ospod now?', 'Not yet. We’re building it now. People on the waitlist get access first, and founding members keep half price for life.'],
  ['Does Ospod host my podcast?', 'No. Keep your current host. Ospod sends finished episodes to it, and your host delivers them to Spotify and Apple Podcasts as it does today.'],
  ['What does joining the waitlist cost?', 'Nothing, and we don’t ask for a card. You only pay if you choose a plan after launch.'],
  ['Where will Ospod publish?', 'YouTube and your podcast host first. Instagram, TikTok and LinkedIn follow as each platform approves our app.'],
]

// [colour class, width %] per segment
const CAM_A = [['c1', 14], ['c0', 9], ['c1', 12], ['c0', 10], ['c1', 18], ['c0', 8], ['c1', 15], ['c0', 14]]
const CAM_B = [['c0', 14], ['c1', 9], ['c0', 12], ['c1', 10], ['c0', 18], ['c1', 8], ['c0', 15], ['c1', 14]]
const HOST = [['m1', 22], ['cut', 2], ['m1', 30], ['cut', 1.5], ['m1', 25], ['cut', 2], ['m1', 17.5]]
const GUEST = [['m1', 18], ['cut', 1.5], ['m1', 35], ['cut', 2.5], ['m1', 28], ['cut', 1], ['m1', 14]]

function Bar({ label, parts }) {
  return (
    <div className="row">
      <span className="rl">{label}</span>
      <div className="bar">
        {parts.map(([cls, w], i) => <span key={i} className={cls} style={{ width: w + '%' }} />)}
      </div>
    </div>
  )
}

export default function IndiePage() {
  const [claimed, setClaimed] = useClaimed()
  return (
    <div className="op">
      <div className="wrap">
        <Header />

        <section className="hero">
          <div>
            <h1 className="h1">You record the episode. Ospod handles the six hours after.</h1>
            <p className="lede">
              Upload your raw footage once. Get back an edited episode, a trailer and clips, ready to publish{' '}
              <span className="lede-long">to YouTube, your podcast host and your socials</span>
              <span className="lede-short">everywhere</span> from one place.
            </p>
            <div style={{ maxWidth: 560 }}>
              <div className="fh">Founding 500: half price for life</div>
              <Meter claimed={claimed} />
            </div>
          </div>
          <SignupCard variant="indie" claimed={claimed} onClaimedChange={setClaimed} />
        </section>

        <section aria-label="Product preview">
          <div className="band">
            <div>
              <h3>Your raw upload</h3>
              <div className="files">
                <span className="file">cam-a.mp4</span><span className="file">cam-b.mp4</span>
                <span className="file">host-mic.wav</span><span className="file">guest-mic.wav</span>
              </div>
              <div className="tl">
                <div className="ruler">
                  <span />
                  <div className="ticks"><span>00:00</span><span>15:00</span><span>30:00</span><span>45:00</span><span>60:00</span></div>
                </div>
                <Bar label="Camera A" parts={CAM_A} />
                <Bar label="Camera B" parts={CAM_B} />
                <Bar label="Host mic" parts={HOST} />
                <Bar label="Guest mic" parts={GUEST} />
                <div className="flagzone" aria-hidden="true"><span className="flagtag">23:10</span></div>
              </div>
              <div className="callout">
                <p><b>Flagged, not cut</b>23:10 to 27:40. A long tangent with your guest. Keep it or cut it?</p>
                <div className="mini">
                  <button type="button" className="mbtn k">Keep it</button>
                  <button type="button" className="mbtn">Cut it</button>
                </div>
              </div>
              <div className="legend">
                <span><i className="sw" style={{ background: '#8E9BFF' }} />Camera on the speaker</span>
                <span><i className="sw" style={{ background: 'repeating-linear-gradient(135deg,#18213A 0 4px,#56617C 4px 6px)' }} />Filler and long silence, removed</span>
                <span><i className="sw" style={{ background: '#FFC23D' }} />Bigger cuts wait for your OK</span>
              </div>
            </div>
            <div>
              <h3>What comes back</h3>
              <ul className="outs">
                {OUTPUTS.map(([title, sub]) => (
                  <li key={title}><CheckCircle /><div><b>{title}</b><span>{sub}</span></div></li>
                ))}
              </ul>
            </div>
          </div>
          <p className="caption">A preview of the product we&rsquo;re building. Ospod isn&rsquo;t available yet.</p>
        </section>

        <section className="sec">
          <h2 className="h2">Recording takes an hour. Everything after takes your weekend.</h2>
          <p className="p">Editing, captions, clips, a trailer and five separate uploads, every single episode. It&rsquo;s the reason so many shows quietly stop.</p>
          <div className="tbars">
            <div className="tb"><span className="n">Recording</span><div className="track"><div className="rec" /></div><span className="v">1 hr</span></div>
            <div className="tb">
              <span className="n">Everything after</span>
              <div className="track">
                <div className="after">
                  <div style={{ flex: 3 }}>Editing</div><div style={{ flex: 1 }}>Captions</div><div style={{ flex: 1 }}>Clips</div>
                  <div style={{ flex: 0.8 }}>Trailer</div><div style={{ flex: 1 }}>Uploads</div>
                </div>
              </div>
              <span className="v">6+ hrs</span>
            </div>
          </div>
          <p className="src">41% of independent podcasters spend six or more hours per episode, and editing is where the hours go. Source: The Podcast Host survey of 558 podcasters.</p>
        </section>

        <section className="sec">
          <h2 className="h2">How Ospod will work</h2>
          <ol className="steps">
            <li><span className="num">1</span><h3>Set your show&rsquo;s style once</h3><p>Pick how cuts, captions, intro and outro, clips and publishing should look. Every episode after that follows it.</p></li>
            <li><span className="num">2</span><h3>Upload your raw footage</h3><p>From any camera, mic or recording app. Separate camera and mic files are fine. Ospod syncs them.</p></li>
            <li><span className="num">3</span><h3>Approve, then publish</h3><p>Check anything Ospod flagged, then send the episode to YouTube and your host, and the clips to your socials.</p></li>
          </ol>
        </section>

        <section className="sec">
          <h2 className="h2">Built so you can trust the edit</h2>
          <div className="trust">
            <div>
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#FFC23D" /><path d="M14 30V10M14 11h12l-3 4.5 3 4.5H14" fill="none" stroke="#18213A" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /></svg>
              <h3>Nothing big gets cut without your OK</h3>
              <p>Ospod removes filler and long silences. Anything bigger is flagged for you to keep or cut.</p>
            </div>
            <div>
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#FFC23D" /><rect x="9" y="14" width="16" height="12" rx="2.5" fill="none" stroke="#18213A" strokeWidth="2.2" /><path d="M25 18l6-3.5v11L25 22" fill="none" stroke="#18213A" strokeWidth="2.2" strokeLinejoin="round" /></svg>
              <h3>Works with the setup you have</h3>
              <p>Record in a studio, on Zoom or in a browser app. Keep your current podcast host too.</p>
            </div>
            <div>
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#FFC23D" /><circle cx="20" cy="20" r="9" fill="none" stroke="#18213A" strokeWidth="2.2" /><path d="M20 15v5l3.5 2.5" fill="none" stroke="#18213A" strokeWidth="2.2" strokeLinecap="round" /></svg>
              <h3>A price you can predict</h3>
              <p>Plans priced per show and episode, not credits that run out mid-month.</p>
            </div>
          </div>
        </section>

        <OfferBand claimed={claimed} />
        <Faq items={FAQ} />
        <Footer />
      </div>
    </div>
  )
}
