// Runs after `vite build`. A React single-page app serves the same HTML for every address, but ad platforms
// and link previews read the title, description and share image from the raw HTML and do not run scripts.
// So this writes a copy of the built index.html for each page with its own tags, and fills in the site address.
//
// Site address: SITE_URL if you set it, otherwise Netlify's URL (the primary domain), otherwise none, in which
// case the canonical/og:url tags are dropped and the share image falls back to a relative path.
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const base = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const site = (process.env.SITE_URL || process.env.URL || '').replace(/\/+$/, '')

const PAGES = [
  { route: '/', file: 'index.html' },
  {
    route: '/studios',
    file: 'studios/index.html',
    title: 'Ospod waitlist for podcast studios',
    description: 'The post-production and publishing hub for podcast studios and agencies. Upload raw footage from any setup, get the edited episode, clips, publishing and client reports. The first 500 get 50% off for life.',
  },
  {
    route: '/privacy',
    file: 'privacy/index.html',
    title: 'Privacy | Ospod',
    description: 'What Ospod collects when you join the waitlist, why, and your choices.',
  },
]

function render(page) {
  let html = base
  if (page.title) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${page.title}$2`)
  }
  if (page.description) {
    html = html
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${page.description}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${page.description}$2`)
  }
  const url = site + (page.route === '/' ? '/' : page.route)
  if (site) {
    html = html
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
      .replace(/__SITE_URL__/g, site)
  } else {
    html = html
      .replace(/\s*<meta property="og:url"[^>]*>/, '')
      .replace(/\s*<link rel="canonical"[^>]*>/, '')
      .replace(/__SITE_URL__/g, '')
  }
  return html
}

for (const page of PAGES) {
  const out = path.join(dist, page.file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, render(page))
  console.log('wrote', path.relative(process.cwd(), out))
}
if (!site) console.warn('SITE_URL not set: canonical and og:url were left out. Set it in Netlify before running ads.')
