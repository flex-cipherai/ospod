# Ospod waitlist

Landing pages that test demand for Ospod: people join a waitlist, and the first 500 lock in 50% off for life.

| Address | Page | Ads |
|---|---|---|
| `/` | Podcasters | Instagram |
| `/studios` | Studios and agencies | LinkedIn |
| `/privacy` | Privacy notice | |

React (Vite), no router. The designs are recreated from `Ospod Waitlist Landing Pages.html`; `src/styles/ospod.css` is the design's own CSS, `src/styles/extras.css` adds the font, the phone layout and a few helpers.

## How a signup works

1. The page sends the email, four answers, the page it was on, and the ad tags from the URL (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) to the `ospod-waitlist` Edge Function in the SDFM Supabase project.
2. The function validates it again, rate limits, and calls a database function that numbers the person (1, 2, 3 ...). Numbers 1 to 500 are founding members.
3. Everyone with the **Ospod Waitlist** module in the SDFM CRM gets an email, and the signup appears there (Ospod, Ospod Waitlist).
4. The page's "X of 500 claimed" meter is the real count from the same function. If the count cannot be loaded the page shows "500 founding spots" and no number.

The function, the migration and the CRM page are in the `cac-pipeline` repo (see "Ospod Waitlist" in its README).

## Ad links

Give each ad its own `utm_content` so the CRM can show results per ad:

```
https://<your-domain>/?utm_source=instagram&utm_medium=paid&utm_campaign=waitlist1&utm_content=ig_30
https://<your-domain>/?utm_source=instagram&utm_medium=paid&utm_campaign=waitlist1&utm_content=ig_15
https://<your-domain>/studios?utm_source=linkedin&utm_medium=paid&utm_campaign=waitlist1&utm_content=li_30
https://<your-domain>/studios?utm_source=linkedin&utm_medium=paid&utm_campaign=waitlist1&utm_content=li_15
```

## Run it

```
npm install
cp .env.example .env     # then edit
npm run dev              # http://localhost:5173
npm run build            # dist/, plus per-page HTML for /studios and /privacy
```

## Settings

Set these in `.env` locally and under **Site settings, Environment variables** on Netlify. All are public (they end up in the browser).

| Name | What it does |
|---|---|
| `VITE_WAITLIST_API_URL` | The `ospod-waitlist` Edge Function URL (defaults to the SDFM project). |
| `SITE_URL` | The final address, no trailing slash. Used for share previews and the canonical link. Netlify's own `URL` is used if this is empty. |
| `VITE_CALENDAR_URL` | The "Book a 15-minute call" link shown after signup. Empty hides the button. |
| `VITE_CONTACT_EMAIL` | The footer "Contact" link and the privacy page's contact address. Empty hides the link. |
| `VITE_META_PIXEL_ID`, `VITE_LINKEDIN_PARTNER_ID`, `VITE_LINKEDIN_CONVERSION_ID` | Optional ad conversion tracking. Empty means no third-party script is loaded. If you set them, the privacy page mentions Meta and LinkedIn automatically. |

## Deploy

**Netlify:** New site from Git, pick this repo. `netlify.toml` sets the build (`npm run build`, publish `dist`). Add the settings above.

**Custom domain:** add the subdomain in Netlify (Domain management), create the CNAME it asks for at your DNS host, then:
- set `SITE_URL` to the final address and redeploy;
- in Supabase run `supabase secrets set OSPOD_ALLOWED_ORIGINS=https://your-final-domain` so the browser is allowed to call the function from it (the function also allows `*.netlify.app`; set `OSPOD_ALLOW_NETLIFY=false` once the custom domain works).

## Before you run ads

- Run the migration and deploy the function (see the `cac-pipeline` README), then submit a test signup on each page and confirm the email arrives and the row shows in the CRM.
- Have the privacy page reviewed. It describes what the site does today; update it if you add anything.
- Set `VITE_CALENDAR_URL` and `VITE_CONTACT_EMAIL`, or the call button and contact link stay hidden.
- Decide your go/no-go number (for example, studio signups at a maximum cost each) before the ads go live.
- Keep the 500 cap real. When it fills, the pages switch to "Join the waitlist" wording on their own.
