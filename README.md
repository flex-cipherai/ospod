# Ospod

The operations hub for audio and video podcasters: publish everywhere with one click, turn episodes into clips and trailers, and see all your analytics in one place with AI.

> **Branches.** `main` is still the live waitlist site. The platform is built on the `platform` branch and replaces the waitlist when we launch.

## Stack

| Part | Tool |
|---|---|
| Web app | Next.js 16 (App Router, TypeScript), Tailwind CSS 4, on Netlify |
| Database, sign-in, permissions | Supabase (Postgres, Auth, row level security) |
| Media storage and delivery (Milestone 2–3) | Cloudflare R2 + a Cloudflare Worker for feeds and download counting |
| Background jobs (Milestone 2+) | Trigger.dev, running FFmpeg |
| Transcription (Milestone 2) | Deepgram |
| AI | Claude |
| Billing (Milestone 6) | Paystack (card and M-Pesa) |

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation: design system, sign-in, dashboard shell, super admin console, marketing site, database | Done |
| M1 | Shows: import from any host or Apple Podcasts, create, edit, cover art, team invites | Done |
| M2 | Upload and processing: loudness-matched audio, transcripts, AI titles, show notes, chapters | **Built** (needs service accounts, see step 5) |
| M3 | One-click publishing: RSS feeds, YouTube, scheduling, migration | Next |
| M4 | Analytics hub and "Ask Ospod" | |
| M5 | Clips and trailers | |
| M6 | Billing and plans (Paystack) | |
| M7 | Beta and launch on ospod.io | |

## Where things are

```
src/
  app/
    (marketing)/     Home, pricing, privacy, terms (public, static)
    (auth)/          Sign in, sign up, password reset + their server actions
    auth/            Email-link callback and sign out
    app/             The podcaster dashboard (signed in)
    admin/           Super admin console (super admins only)
  components/        Logo, buttons, fields, app shell
  lib/
    auth.ts          Who's signed in, their workspace, requireSuperAdmin()
    plans.ts         The five plans, prices and limits (single source of truth)
    supabase/        Supabase client for the server
  proxy.ts           Keeps the session fresh and sends signed-out people to /login
supabase/migrations/ Database schema, permissions and admin functions
```

## Security model

- Every table has row level security. People only see the workspaces they belong to.
- Plan and billing columns can't be changed from the app, only by the server (billing webhooks, Milestone 6).
- **Super admin** is `profiles.platform_role = 'super_admin'`. It can only be set from the Supabase SQL editor; nobody can promote themselves from the app. Admin pages return "not found" to everyone else.

## Set up (first time)

### 1. Supabase

1. In Supabase, create a new project named **ospod** (region: the one closest to most of your users; Frankfurt `eu-central-1` works well for Kenya and Europe).
2. Open **SQL Editor → New query** and run each file in `supabase/migrations/` **in name order** (paste the whole file, click **Run**, then the next one). Each new milestone adds files here; run only the new ones.
3. **Authentication → URL Configuration**:
   - Site URL: your Netlify address for now (later `https://ospod.io`).
   - Redirect URLs: add `http://localhost:3000/**`, `https://*--<your-netlify-site>.netlify.app/**`, and later `https://ospod.io/**`.
4. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key.
5. Supabase's built-in email sender allows only a few emails an hour. Before inviting real users, connect a proper sender under **Authentication → Emails → SMTP Settings** (we'll set up Resend together).

### 2. Make yourself super admin

Sign up on the site first, then in **SQL Editor** run (with your own email):

```sql
update public.profiles set platform_role = 'super_admin' where email = 'you@example.com';
```

Sign out and back in. **Super admin** now appears in the sidebar, at `/admin`.

### 3. Netlify

1. In the Netlify site connected to this repo, go to **Site configuration → Build & deploy → Branches and deploy contexts** and add `platform` under **Branch deploys**. (Production stays on `main`, the waitlist, until launch.)
2. **Site configuration → Environment variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_CONTACT_EMAIL` (optional)
3. Push to `platform`. The branch deploy appears at `https://platform--<your-site>.netlify.app`.

### 4. Run it on your computer

```
npm install
cp .env.example .env.local     # then fill in the Supabase values
npm run dev                    # http://localhost:3000
```

### 5. Episode uploads and processing (Milestone 2)

Uploads go straight from the browser to **Cloudflare R2**. A background job on **Trigger.dev** levels the audio with FFmpeg, **ElevenLabs Scribe** transcribes it (Deepgram also works), and **Claude** drafts the title, show notes, chapters and clip ideas.

| Service | What to create | Values you'll need |
|---|---|---|
| Cloudflare R2 | A bucket named `ospod-media`, and an R2 API token with **Object Read & Write** on that bucket | Account ID, Access Key ID, Secret Access Key |
| ElevenLabs | An API key with Speech to Text access (elevenlabs.io → Developers → API keys) | API key |
| Anthropic | An API key (with billing set up) | API key |
| Trigger.dev | A project named `ospod` | Project ref (`proj_…`), Production secret key (`tr_prod_…`) |
| Supabase | (already have it) | The **secret** key from Project Settings → API Keys |

Where each value goes:

| Name | Netlify | Trigger.dev (Production) |
|---|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (`ospod-media`) | ✓ | ✓ |
| `TRIGGER_SECRET_KEY` | ✓ | |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | | ✓ |
| `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY` | | ✓ |

Then, once:

```
node --env-file=.env.local scripts/setup-r2-cors.mjs      # lets browsers upload to the bucket
npx trigger.dev@latest login
npx trigger.dev@latest deploy                               # deploys the processing job
```

Redeploy the processing job whenever files in `src/trigger/` or `src/lib/{media,ai}/` change. Estimated unit costs for the admin console are in `src/lib/costs.ts`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build (what Netlify runs) |
| `npm run lint` | Check the code |
