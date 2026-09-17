# La Derma — v3

A full React + Node backend rebuild of the La Derma site, with a real
booking system that talks directly to Google Calendar — no third-party
booking platform (no Cal.com, no Calendly).

**What's new in v3 (vs v2):**
- Real favicon (the actual clinic logo) instead of a generic browser icon
- Refined colour system: navy stays the primary "trust" colour, gold is
  now reserved for calls-to-action and the most important highlights
  only, and a new muted sage-green secondary accent carries smaller
  repeated labels — so gold reads as special again instead of being
  everywhere
- Skeleton loading states on the booking page (shaped placeholders that
  match the real content, not a spinner or "Loading…" text) while
  availability data is being fetched
- A subtle fade-in on page/section images once they've actually loaded,
  and a soft fade-in transition between routes
- Confirmed the mobile navigation is the same fixed, fully-opaque overlay
  pattern from v1 — the earlier "transparent nav" bug does not apply
  here, since it never used the buggy CSS pattern that caused it

```
laderma-v3/
├── client/   React + Vite front end (Home, About, Gallery, Pricing, Booking)
└── server/   Node/Express API + Google Calendar OAuth2 integration
```

## How it works

- The **client** is a normal React site. Every page except Booking is
  static content (same copy/images as the live site).
- The **Booking** page calls the **server's** API to show real available
  time slots and create real bookings as events on the clinic's Google
  Calendar.
- The server never uses Cal.com or any other booking platform — it talks
  to the Google Calendar API directly using OAuth2, with the clinic's own
  Google account.
- Clients only ever see *which times are free* — never event titles,
  other clients' details, or anything else on the calendar.

## 1. Set up Google Calendar API access

1. Go to <https://console.cloud.google.com/apis/credentials> and create
   (or select) a project.
2. Under **APIs & Services → Library**, enable the **Google Calendar API**.
3. Under **APIs & Services → OAuth consent screen**, configure it (choose
   "External" if this isn't a Google Workspace account) and add the
   Google account you'll use for the clinic as a **test user** — this
   lets you authorize the app without publishing it.
4. Under **APIs & Services → Credentials**, create an **OAuth client ID**
   of type **Web application**.
5. Add this exact **Authorized redirect URI**:
   ```
   http://localhost:4000/api/auth/callback
   ```
6. Copy the generated **Client ID** and **Client Secret** — you'll need
   them in the next step.

## 2. Configure the server

```bash
cd server
cp .env.example .env
```

Open `.env` and fill in:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1
- `GOOGLE_REDIRECT_URI` — leave as-is for local dev
- `GOOGLE_CALENDAR_ID` — leave as `primary` to use the connected
  account's main calendar, or paste a specific calendar's ID
- `CONSULTATION_LENGTH_MINUTES`, `CLINIC_TIMEZONE` — adjust to taste

Then install and start it:

```bash
npm install
npm run dev
```

You should see:
```
La Derma booking API running on http://localhost:4000
Calendar connected: false
Visit http://localhost:4000/api/auth/connect to connect Google Calendar.
```

## 3. Connect your Google Calendar (one-time)

With the server running, open this URL **yourself, once**, in a browser:

```
http://localhost:4000/api/auth/connect
```

Log in with the clinic's Google account and grant calendar access. You'll
land on a confirmation page once it's done. A token is saved to
`server/data/google-token.json` (never committed — see `.gitignore`) and
the server will use it automatically from then on, refreshing itself as
needed. You should not need to repeat this step unless you delete that
file or explicitly disconnect.

**Do not share this `/api/auth/connect` link publicly** — it's a staff-only
setup step, not something that belongs on the public site (there is no
link to it anywhere in the React app).

## 4. Configure and run the client

In a separate terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Visit the URL Vite prints (typically `http://localhost:5173`). The
Booking page will automatically detect the calendar is connected and show
real availability.

## 5. Set up branded email notifications (optional)

By default, no confirmation email is sent to the client and no
notification is sent to the clinic when someone books — the appointment
is only added to your connected Google Calendar. To send a properly
branded confirmation email to the client (with an Add to Calendar
button/attachment), and a notification email to the clinic whenever
someone books:

1. Sign up free at [resend.com](https://resend.com)
2. Create an API key under **API Keys** in their dashboard
3. In `server/.env`, add:
   ```
   RESEND_API_KEY=re_your_api_key_here
   CLINIC_NOTIFY_EMAIL=your-clinic-inbox@example.com
   PUBLIC_API_BASE=http://localhost:4000
   ```
4. Restart the server

If these variables aren't set, bookings still work exactly as before —
the emails are simply skipped, with a note in the server log.

### Important: Resend's free-tier sending restriction

**Without a verified domain, Resend only lets you send TO the email
address your Resend account itself is registered under** — not to real
clients. This means, until you verify a domain:

- The **clinic notification** email will only actually arrive if
  `CLINIC_NOTIFY_EMAIL` is set to the same address you signed up to
  Resend with.
- The **client confirmation** email will fail for any real client whose
  email differs from that address — you'll see this in the server logs
  as a `validation_error` from Resend.

This is a genuine platform limit, not a bug — bookings themselves still
succeed and still land on the calendar even when these emails fail; the
booking flow does not depend on email sending working.

To send properly to real clients, you need to verify your own domain in
Resend's dashboard (**Domains → Add Domain**, then add the DNS records it
gives you at your domain registrar). Once verified, you can send to any
address and from a real address of your own, e.g.
`CLINIC_FROM_EMAIL=La Derma <bookings@laderma.com>`, instead of the
default shared `onboarding@resend.dev` sender.

## 6. Using it day to day

- Bookings made through the site appear directly in your connected Google
  Calendar, with the client's name, email, phone, and notes in the event
  description, and the client added as an attendee (so they get a
  calendar invite automatically).
- To change clinic working hours, edit `WORKING_HOURS` in
  `server/calendar.js`.
- To change the list of treatment options, edit `TREATMENT_OPTIONS` in
  `server/index.js`.
- To update pricing or page copy, edit the files in
  `client/src/data/` and `client/src/pages/`.

## Deploying

This runs entirely locally until you deploy it somewhere. At a minimum
you'll need:
- Hosting for the `server/` app that keeps running continuously (it holds
  the calendar connection) — e.g. Render, Railway, a small VPS.
- Hosting for the static `client/` build (`npm run build` in `client/`
  produces a `dist/` folder) — e.g. Netlify, Vercel, Cloudflare Pages.
- Once deployed, add the **production** callback URL (e.g.
  `https://your-api-domain.com/api/auth/callback`) as an additional
  Authorized redirect URI in the Google Cloud credentials, and update
  `GOOGLE_REDIRECT_URI` and `CLIENT_ORIGIN` in the server's environment,
  and `VITE_API_BASE` in the client's environment, to match.
- If hosting the server on a platform with an ephemeral filesystem (e.g.
  Render's free tier), the Google Calendar connection will be lost on
  every redeploy unless you also set `GOOGLE_TOKEN_JSON` — see the note
  in `server/.env.example` for details.
- `client/public/_redirects` is required for Netlify (or `client/public/vercel.json`
  for Vercel, if you switch) so that refreshing any page other than the
  homepage doesn't 404 — this is already included, no action needed
  unless you switch static hosts to one that needs a different
  equivalent rule.
