import { Footer, Header } from '../components/Shared'
import { CONFIG } from '../config'

// Plain-language notice for the waitlist. It describes what the site actually does today; have it reviewed
// before ads run, and update it if you add anything (for example another ad pixel).
export default function PrivacyPage() {
  const contact = CONFIG.contactEmail
    ? <a href={`mailto:${CONFIG.contactEmail}`}>{CONFIG.contactEmail}</a>
    : 'by replying to any email we send you'
  return (
    <div className="op">
      <div className="wrap">
        <Header />
        <main className="legal">
          <h1>Privacy</h1>
          <p className="updated">Last updated 12 November 2026</p>

          <p>Ospod is a product being built in Nairobi, Kenya, by Flex Kipkoech. This page explains what we do with the details you give us when you join the Ospod waitlist.</p>

          <h2>What we collect</h2>
          <ul>
            <li>Your email address.</li>
            <li>Your answers to four questions: which description fits you, how many shows you produce, how many episodes a month, and what you spend on editing.</li>
            <li>Where you came from: the ad or link that brought you here (its campaign tags), the page you were on, and the site that referred you.</li>
            <li>A one-way scrambled version of your network address, used only to stop the form being flooded with fake signups. We cannot turn it back into your address.</li>
          </ul>

          <h2>Why we collect it</h2>
          <ul>
            <li>To hold your spot on the waitlist and, if you are among the first 500, your founding offer of 50% off for life.</li>
            <li>To email you about Ospod: when your invite is ready, and important news about the product.</li>
            <li>To understand who wants Ospod and what they need, so we build the right thing. We may invite you to a short call; you can say no.</li>
          </ul>
          <p>We do not sell your details and we do not send marketing about other products.</p>

          <h2>Who handles it for us</h2>
          <ul>
            <li>Supabase stores the signup records.</li>
            <li>Resend sends our emails.</li>
            <li>Netlify hosts this website.</li>
            {(CONFIG.metaPixelId || CONFIG.linkedinPartnerId) && (
              <li>Meta and LinkedIn measure whether our ads led to a signup, using their own tracking on this site.</li>
            )}
          </ul>
          <p>These providers may process data outside Kenya. They act on our instructions and are not allowed to use your details for their own purposes.</p>

          <h2>How long we keep it</h2>
          <p>Until Ospod launches and your invite has been sent, or until you ask us to delete your details, whichever comes first. If we stop building Ospod, we delete the waitlist.</p>

          <h2>Your rights</h2>
          <p>You can ask us to show you what we hold about you, correct it, delete it, or stop emailing you. You can also object to how we use it. Contact us {contact} and we will respond within 30 days. Every email we send will also have a way to opt out.</p>
          <p>If you are in Kenya, you may complain to the Office of the Data Protection Commissioner. If you are in the EU or UK, you may complain to your local data protection authority.</p>

          <h2>Changes</h2>
          <p>If we change this page in a way that matters, we will update the date above and, where it affects how we use your details, tell you by email.</p>
        </main>
        <Footer />
      </div>
    </div>
  )
}
