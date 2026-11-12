import { CheckCircle, Faq, Footer, Header, Meter, OfferBand, SignupCard } from '../components/Shared'
import { useClaimed } from '../lib/useClaimed'

const BOARD = [
  ['The Founders Table', 'Ep. 41', 'Founders brand kit', 'sy', 'Waiting on client approval'],
  ['Kitchen Money', 'Ep. 112', 'KM brand kit', 'sg', 'Published with 6 clips'],
  ['Build Weekly', 'Ep. 9', 'Build brand kit', 'sw2', '2 flags for your editor'],
  ['Northside Health Talk', 'Ep. 23', 'Northside brand kit', 'sb', 'Editing'],
]

const REPORT = [
  ['Episode downloads', 'Pulled from the show’s podcast host'],
  ['YouTube views and watch time', 'For the full episodes and the clips'],
  ['Which clips drove episode views', 'So you can show what’s working'],
  ['In your studio’s branding', 'Ready to send, no spreadsheet work'],
]

const FAQ = [
  ['Can my studio use Ospod now?', 'Not yet. We’re building it now. People on the waitlist get access first, and founding members keep half price for life.'],
  ['Does it replace my editors?', 'No. It does the first pass: syncing, switching cameras, removing filler and cutting clips. Your editors spend their time on review and polish instead.'],
  ['Does it handle in-person multicam shows?', 'Yes. Upload the separate camera and mic files. Ospod syncs them and switches to whoever is talking.'],
  ['Does Ospod host podcasts?', 'No. Your clients keep their current host. Ospod sends finished episodes to it, and the host delivers them to Spotify and Apple Podcasts.'],
  ['What does joining the waitlist cost?', 'Nothing, and we don’t ask for a card. You only pay if you choose a plan after launch.'],
]

const iconProps = { width: 40, height: 40, viewBox: '0 0 40 40', 'aria-hidden': true }
const stroke = { fill: 'none', stroke: '#18213A', strokeWidth: 2.2 }

export default function StudiosPage() {
  const [claimed, setClaimed] = useClaimed()
  return (
    <div className="op">
      <div className="wrap">
        <Header />

        <section className="hero">
          <div>
            <h1 className="h1">Run 20 shows with the team you have.</h1>
            <p className="lede">Ospod is the post-production and publishing hub for podcast studios and agencies. Upload raw footage from any setup. Get the edited episode, clips, publishing and client reports from one place.</p>
            <div style={{ maxWidth: 560 }}>
              <div className="fh">Founding 500: half price for life</div>
              <Meter claimed={claimed} />
            </div>
          </div>
          <SignupCard variant="studios" claimed={claimed} onClaimedChange={setClaimed} />
        </section>

        <section aria-label="Product preview">
          <div className="band">
            <div>
              <h3>This week across your shows</h3>
              <div className="board" role="table" aria-label="Example show board">
                <div className="brow bhead" role="row">
                  <span role="columnheader">Show</span><span role="columnheader">Preset</span><span role="columnheader">Status</span>
                </div>
                {BOARD.map(([show, ep, preset, cls, status]) => (
                  <div className="brow" role="row" key={show}>
                    <span role="cell"><b>{show}</b>{ep}</span>
                    <span role="cell">{preset}</span>
                    <span role="cell"><i className={'st ' + cls}>{status}</i></span>
                  </div>
                ))}
              </div>
              <div className="callout">
                <p><b>Approval link sent</b>The Founders Table&rsquo;s producer can watch the cut and approve it without an Ospod login.</p>
                <div className="mini"><button type="button" className="mbtn k">Copy link</button></div>
              </div>
            </div>
            <div>
              <h3>Monthly client report</h3>
              <ul className="outs">
                {REPORT.map(([title, sub]) => (
                  <li key={title}><CheckCircle /><div><b>{title}</b><span>{sub}</span></div></li>
                ))}
              </ul>
            </div>
          </div>
          <p className="caption">A preview of the product we&rsquo;re building. Ospod isn&rsquo;t available yet.</p>
        </section>

        <section className="sec">
          <h2 className="h2">Every new client show adds a week of post-production.</h2>
          <p className="p">Each episode needs an edit, clips, uploads to several platforms and a report for the client. Most of that work is the same every time.</p>
          <div className="eq">
            <div className="eqb"><span className="eqn">40</span><span>episodes a month</span></div>
            <span className="op2" aria-hidden="true">&times;</span>
            <div className="eqb"><span className="eqn">$150 to $500</span><span>of editing per episode</span></div>
            <span className="op2" aria-hidden="true">=</span>
            <div className="eqb eqd"><span className="eqn">$6,000 to $20,000</span><span>a month, before clips and reports</span></div>
          </div>
          <p className="src">Editing range: typical freelance rates for a 45 to 60 minute interview episode.</p>
        </section>

        <section className="sec">
          <h2 className="h2">How Ospod will work</h2>
          <ol className="steps">
            <li><span className="num">1</span><h3>Set a preset for each show</h3><p>Cuts, captions, intro and outro, brand kit, clip count and where the show publishes. New episodes follow it.</p></li>
            <li><span className="num">2</span><h3>Upload raw footage from any setup</h3><p>In-person multicam, Zoom or a browser app. Ospod syncs separate camera and mic files and switches to whoever is talking.</p></li>
            <li><span className="num">3</span><h3>Approve, publish, report</h3><p>Your editors review flagged cuts, clients approve through a link, and Ospod publishes and builds the monthly report.</p></li>
          </ol>
        </section>

        <section className="sec">
          <h2 className="h2">Made for running many shows</h2>
          <div className="trust t2">
            <div>
              <svg {...iconProps}><rect width="40" height="40" rx="10" fill="#FFC23D" /><rect x="10" y="11" width="20" height="5" rx="1.5" {...stroke} /><rect x="10" y="20" width="20" height="5" rx="1.5" {...stroke} /><path d="M10 30h12" stroke="#18213A" strokeWidth="2.2" strokeLinecap="round" /></svg>
              <h3>A preset for every show</h3>
              <p>Each client keeps its own brand kit, captions style and publishing schedule, so nothing gets mixed up.</p>
            </div>
            <div>
              <svg {...iconProps}><rect width="40" height="40" rx="10" fill="#FFC23D" /><path d="M17 23l6-6M15 19l-2 2a4 4 0 005.7 5.7l2-2M25 21l2-2a4 4 0 00-5.7-5.7l-2 2" {...stroke} strokeLinecap="round" /></svg>
              <h3>Client approval links</h3>
              <p>Clients watch the cut and approve it from one link. No logins, no email chains.</p>
            </div>
            <div>
              <svg {...iconProps}><rect width="40" height="40" rx="10" fill="#FFC23D" /><path d="M12 29V19M20 29V12M28 29v-6" stroke="#18213A" strokeWidth="2.6" strokeLinecap="round" /></svg>
              <h3>Monthly reports in your branding</h3>
              <p>Downloads, YouTube views and clip results for each show, ready to send to the client.</p>
            </div>
            <div>
              <svg {...iconProps}><rect width="40" height="40" rx="10" fill="#FFC23D" /><path d="M14 30V10M14 11h12l-3 4.5 3 4.5H14" {...stroke} strokeLinejoin="round" strokeLinecap="round" /></svg>
              <h3>Nothing big cut without a flag</h3>
              <p>Ospod removes filler and silences. Bigger cuts are flagged for your editors to keep or cut.</p>
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
