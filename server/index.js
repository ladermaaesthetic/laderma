import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  getAuthUrl,
  saveTokenFromCode,
  isCalendarConnected,
  disconnectCalendar,
} from './googleAuth.js';
import {
  getAvailableSlots,
  createBooking,
  getBookingById,
  listUpcomingBookings,
  cancelBooking,
  createUnavailableBlock,
  listUnavailableBlocks,
  deleteUnavailableBlock,
  CONSULTATION_MINUTES,
  TIMEZONE,
} from './calendar.js';
import { buildBookingICS } from './ics.js';
import { bootstrapAdminIfNeeded } from './adminAuth.js';
import { sessionMiddleware, requireAdminAuth, registerAdminAuthRoutes } from './adminSession.js';
import {
  seedFromStaticDataIfEmpty,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
} from './pricingStore.js';
import { STATIC_SEED_CATEGORIES } from './pricingSeed.js';
import {
  clientSessionMiddleware,
  requireClientAuth,
  registerClientAuthRoutes,
} from './clientSession.js';
import {
  getClientById,
  linkBookingToClient,
  getBookingLinksForClient,
  markBookingLinkCancelled,
} from './clientStore.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Render (and most hosts) put the app behind a reverse proxy, so Express
// sees a plain HTTP connection from the proxy even though the real
// visitor connected over HTTPS. Without this, req.secure is always
// false and express-session silently refuses to set cookies marked
// `secure: true` — which is exactly why logins didn't stick in
// production. `1` trusts the first hop (Render's own proxy).
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CLIENT_ORIGIN can be a single URL or a comma-separated list, e.g.
// "https://ladermaclinic.netlify.app,https://test-branch--ladermaclinic.netlify.app"
// — this lets a Netlify branch deploy (its own origin) talk to the same
// server as production without opening CORS up to everyone.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // No Origin header (e.g. curl, server-to-server, some mobile clients) — allow.
    if (!origin) return callback(null, true);
    if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(sessionMiddleware());
app.use(clientSessionMiddleware());

registerAdminAuthRoutes(app);
registerClientAuthRoutes(app);

const TREATMENT_OPTIONS = [
  'Laser Hair Consultation',
  'Endolift Consultation',
  'Anti-Wrinkle Consultation',
  'Dermal Filler Consultation',
  'Skin Rejuvenation Consultation',
  'GLP-1 Weight Loss Consultation',
];

// ---------------------------------------------------------------------------
// Public status — the front end uses this to know whether to show the
// booking calendar or a "not yet connected" message. No sensitive data here.
// ---------------------------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.json({
    connected: isCalendarConnected(),
    consultationMinutes: CONSULTATION_MINUTES,
    timezone: TIMEZONE,
    treatments: TREATMENT_OPTIONS,
  });
});

// ---------------------------------------------------------------------------
// One-time clinic owner setup: visit /api/auth/connect to grant calendar
// access. This should only ever be opened by clinic staff, not clients —
// keep this URL out of public nav (there is no public link to it anywhere
// in the React app).
// ---------------------------------------------------------------------------
app.get('/api/auth/connect', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`Google returned an error: ${error}`);
  }
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const tokens = await saveTokenFromCode(code);
    const usingEnvVar = Boolean(process.env.GOOGLE_TOKEN_JSON);

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; max-width: 720px; margin: 0 auto;">
          <h1>Google Calendar connected</h1>
          <p>La Derma's booking system is now linked to this Google Calendar.</p>
          ${usingEnvVar ? `
            <p style="color:#9C7A2E; font-weight:600;">
              Note: this server is currently reading its connection from a
              GOOGLE_TOKEN_JSON environment variable, which takes priority
              over what was just saved. To make THIS new connection active,
              copy the value below into GOOGLE_TOKEN_JSON in your hosting
              dashboard, then redeploy.
            </p>
          ` : `
            <p style="color:#4A7A5E; font-weight:600;">
              If you're running this on a host where the filesystem doesn't
              persist between deploys (e.g. Render's free tier), copy the
              value below into an environment variable named
              GOOGLE_TOKEN_JSON so the connection survives future redeploys.
            </p>
          `}
          <textarea readonly style="width:100%; height:120px; font-family: monospace; font-size: 12px; padding: 12px; box-sizing: border-box;">${JSON.stringify(tokens)}</textarea>
          <p>You can close this tab once you've copied what you need.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Something went wrong saving the calendar connection.');
  }
});

app.post('/api/auth/disconnect', (req, res) => {
  disconnectCalendar();
  res.json({ disconnected: true });
});

// ---------------------------------------------------------------------------
// Availability — clients only ever see which slots are free, never event
// details, attendee info, or anything else on the clinic's calendar.
// ---------------------------------------------------------------------------
app.get('/api/availability', async (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Provide a date as ?date=YYYY-MM-DD' });
  }

  try {
    const slots = await getAvailableSlots(date);
    res.json({ date, slots });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not yet connected.' });
    }
    console.error('Availability error:', err);
    res.status(500).json({ error: 'Could not load availability.' });
  }
});

// ---------------------------------------------------------------------------
// Booking creation
// ---------------------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/bookings', async (req, res) => {
  const { startISO, name, email, phone, treatment, notes } = req.body || {};

  const errors = [];
  if (!startISO || isNaN(Date.parse(startISO))) errors.push('A valid appointment time is required.');
  if (!name || name.trim().length < 2) errors.push('Full name is required.');
  if (!email || !isValidEmail(email)) errors.push('A valid email address is required.');
  if (!phone || phone.trim().length < 5) errors.push('A valid phone number is required.');
  if (!treatment || !TREATMENT_OPTIONS.includes(treatment)) errors.push('Please select a treatment focus.');
  if (notes && notes.length > 1000) errors.push('Notes must be under 1000 characters.');

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const event = await createBooking({
      startISO,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      treatment,
      notes: (notes || '').trim(),
    });

    // If the person booking is signed in to a client account, record this
    // booking against their account so it shows up in "My Bookings" —
    // guest (not-signed-in) bookings still work exactly as before, just
    // without that link.
    if (req.session && req.session.clientId) {
      try {
        await linkBookingToClient({
          clientId: req.session.clientId,
          eventId: event.id,
          treatment,
          startISO: event.start.dateTime,
        });
      } catch (err) {
        console.error('Failed to link booking to client account:', err);
      }
    }

    res.status(201).json({
      confirmed: true,
      eventId: event.id,
      start: event.start,
      end: event.end,
    });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not yet connected.' });
    }
    if (err.message === 'SLOT_NO_LONGER_AVAILABLE') {
      return res.status(409).json({ error: 'That slot was just booked by someone else. Please pick another.' });
    }
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Could not create the booking. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Serves the .ics calendar file for a specific booking, so the "Add to
// Calendar" button in the confirmation email has a real, stable URL to
// link to. Opening this URL is what triggers the device's native calendar
// app (Apple Calendar, Google Calendar, Outlook) to import the event —
// this is the standards-based approach that works the same way across
// iPhone and Android, rather than needing separate platform-specific
// "add to calendar" integrations.
// ---------------------------------------------------------------------------
app.get('/api/bookings/:id/calendar.ics', async (req, res) => {
  try {
    const event = await getBookingById(req.params.id);

    // Pull the client's name/email back out of the event we stored it in,
    // since we don't keep a separate database of bookings.
    const attendee = (event.attendees || [])[0] || {};
    const treatmentMatch = /Treatment focus: (.+)/.exec(event.description || '');
    const notesMatch = /Notes: (.+)/.exec(event.description || '');

    const ics = buildBookingICS({
      uid: `${event.id}@laderma`,
      startISO: event.start.dateTime,
      endISO: event.end.dateTime,
      treatment: treatmentMatch ? treatmentMatch[1] : 'Consultation',
      name: attendee.displayName || '',
      notes: notesMatch && notesMatch[1] !== '(none provided)' ? notesMatch[1] : '',
      organizerEmail: process.env.CLINIC_NOTIFY_EMAIL || 'bookings@laderma.com',
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="la-derma-consultation.ics"');
    res.send(ics);
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).send('Calendar is not connected.');
    }
    console.error('Failed to serve .ics for booking:', req.params.id, err);
    res.status(404).send('Booking not found.');
  }
});

// ---------------------------------------------------------------------------
// Client accounts — a logged-in client can see their own upcoming and past
// appointments and cancel an upcoming one. This deliberately never exposes
// other clients' bookings: everything here is scoped to req.session.clientId,
// looked up against the local client_bookings link table (Calendar itself
// has no concept of "which client owns this event").
// ---------------------------------------------------------------------------
app.get('/api/account/me', requireClientAuth, async (req, res) => {
  const client = await getClientById(req.session.clientId);
  if (!client) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ client });
});

app.get('/api/account/bookings', requireClientAuth, async (req, res) => {
  try {
    const links = await getBookingLinksForClient(req.session.clientId);
    const now = Date.now();

    // Cross-check each linked booking against the live calendar event, so
    // a booking cancelled from the admin panel (which deletes the Calendar
    // event but doesn't touch this table) doesn't linger as "upcoming"
    // forever — it's marked cancelled here the moment we notice it's gone.
    // Only a genuine "this event no longer exists" response (Google
    // returns 404/410 for a deleted event) counts as gone — any other
    // error (calendar temporarily disconnected, a transient API error)
    // is treated as "unknown, assume still valid" so a connectivity
    // hiccup can never wrongly mark a real booking as cancelled.
    const results = await Promise.all(
      links.map(async (link) => {
        let confirmedGone = false;
        if (!link.cancelled) {
          try {
            await getBookingById(link.eventId);
          } catch (err) {
            const status = err.code || err.status || err.response?.status;
            if (status === 404 || status === 410) {
              confirmedGone = true;
            }
            // Any other error (including CALENDAR_NOT_CONNECTED) is
            // swallowed here — we simply can't verify right now, so we
            // don't penalize the booking for it.
          }
        }
        return {
          eventId: link.eventId,
          treatment: link.treatment,
          startISO: link.startISO,
          cancelled: Boolean(link.cancelled) || confirmedGone,
        };
      })
    );

    const upcoming = results.filter((b) => !b.cancelled && new Date(b.startISO).getTime() >= now);
    const past = results.filter((b) => b.cancelled || new Date(b.startISO).getTime() < now);

    upcoming.sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
    past.sort((a, b) => new Date(b.startISO) - new Date(a.startISO));

    res.json({ upcoming, past });
  } catch (err) {
    console.error('Failed to load client bookings:', err);
    res.status(500).json({ error: 'Could not load your bookings.' });
  }
});

app.delete('/api/account/bookings/:eventId', requireClientAuth, async (req, res) => {
  try {
    // markBookingLinkCancelled throws if this event isn't linked to the
    // signed-in client, so a client can never cancel someone else's
    // booking by guessing an event id.
    await markBookingLinkCancelled(req.session.clientId, req.params.eventId);
    await cancelBooking(req.params.eventId);
    res.json({ cancelled: true });
  } catch (err) {
    if (err.message === 'This booking is not linked to your account.') {
      return res.status(403).json({ error: err.message });
    }
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Failed to cancel client booking:', req.params.eventId, err);
    res.status(500).json({ error: 'Could not cancel the booking.' });
  }
});

// ---------------------------------------------------------------------------
// Admin routes — everything below requires a logged-in admin session.
// These expose full client details and calendar control that the public
// site deliberately never exposes.
// ---------------------------------------------------------------------------

app.get('/api/admin/bookings', requireAdminAuth, async (req, res) => {
  try {
    const bookings = await listUpcomingBookings();
    res.json({ bookings });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Failed to list bookings for admin:', err);
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

app.delete('/api/admin/bookings/:id', requireAdminAuth, async (req, res) => {
  try {
    await cancelBooking(req.params.id);
    res.json({ cancelled: true });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Failed to cancel booking:', req.params.id, err);
    res.status(500).json({ error: 'Could not cancel the booking.' });
  }
});

// Admin walk-in booking creation reuses the same createBooking logic as
// the public site (including the double-check that the slot is still
// free), so a walk-in can never silently double-book a slot either.
app.post('/api/admin/bookings', requireAdminAuth, async (req, res) => {
  const { startISO, name, email, phone, treatment, notes } = req.body || {};

  const errors = [];
  if (!startISO || isNaN(Date.parse(startISO))) errors.push('A valid appointment time is required.');
  if (!name || name.trim().length < 2) errors.push('Full name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email address is required.');
  if (!phone || phone.trim().length < 5) errors.push('A valid phone number is required.');
  if (!treatment) errors.push('Please select a treatment focus.');

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const event = await createBooking({
      startISO,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      treatment,
      notes: (notes || '').trim(),
    });
    res.status(201).json({ confirmed: true, eventId: event.id, start: event.start, end: event.end });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    if (err.message === 'SLOT_NO_LONGER_AVAILABLE') {
      return res.status(409).json({ error: 'That slot is no longer available.' });
    }
    console.error('Failed to create admin booking:', err);
    res.status(500).json({ error: 'Could not create the booking.' });
  }
});

// Same public availability logic, exposed for the admin panel's own slot
// picker when creating a walk-in booking.
app.get('/api/admin/availability', requireAdminAuth, async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Provide a date as ?date=YYYY-MM-DD' });
  }
  try {
    const slots = await getAvailableSlots(date);
    res.json({ date, slots, treatments: TREATMENT_OPTIONS });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Admin availability error:', err);
    res.status(500).json({ error: 'Could not load availability.' });
  }
});

// Block out unavailable time — creates a real event on the clinic's
// Google Calendar so it's instantly reflected in availability everywhere
// (this booking site, and the calendar itself if checked directly).
app.post('/api/admin/blocks', requireAdminAuth, async (req, res) => {
  const { dateStr, allDay, startISO, endISO, label } = req.body || {};
  try {
    const event = await createUnavailableBlock({ dateStr, allDay, startISO, endISO, label });
    res.status(201).json({ created: true, id: event.id, start: event.start, end: event.end });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    if (err.message === 'INVALID_BLOCK_RANGE') {
      return res.status(400).json({ error: 'Provide a valid date, or a start and end time where the end is after the start.' });
    }
    console.error('Failed to create unavailable block:', err);
    res.status(500).json({ error: 'Could not block that time.' });
  }
});

app.get('/api/admin/blocks', requireAdminAuth, async (req, res) => {
  try {
    const blocks = await listUnavailableBlocks();
    res.json({ blocks });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Failed to list unavailable blocks:', err);
    res.status(500).json({ error: 'Could not load blocked times.' });
  }
});

app.delete('/api/admin/blocks/:id', requireAdminAuth, async (req, res) => {
  try {
    await deleteUnavailableBlock(req.params.id);
    res.json({ removed: true });
  } catch (err) {
    if (err.message === 'CALENDAR_NOT_CONNECTED') {
      return res.status(503).json({ error: 'Calendar is not connected.' });
    }
    console.error('Failed to remove unavailable block:', req.params.id, err);
    res.status(500).json({ error: 'Could not remove that block.' });
  }
});

// ---------------------------------------------------------------------------
// Public pricing — the Treatments & Pricing page fetches the live list of
// categories and items from here instead of a static bundled file, so
// admin edits show up immediately without a redeploy.
// ---------------------------------------------------------------------------
app.get('/api/pricing', async (req, res) => {
  try {
    res.json({ categories: await getAllCategories() });
  } catch (err) {
    console.error('Failed to load pricing:', err);
    res.status(500).json({ error: 'Could not load pricing.' });
  }
});

// ---------------------------------------------------------------------------
// Admin pricing management — full CRUD on treatment categories and their
// individual items/prices, behind the same admin session auth as bookings.
// ---------------------------------------------------------------------------
app.post('/api/admin/pricing/categories', requireAdminAuth, async (req, res) => {
  const { title, description } = req.body || {};
  try {
    const category = await createCategory({ title, description });
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create category.' });
  }
});

app.put('/api/admin/pricing/categories/:id', requireAdminAuth, async (req, res) => {
  const { title, description } = req.body || {};
  try {
    const category = await updateCategory(req.params.id, { title, description });
    res.json({ category });
  } catch (err) {
    const status = err.message === 'Category not found.' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not update category.' });
  }
});

app.delete('/api/admin/pricing/categories/:id', requireAdminAuth, async (req, res) => {
  try {
    await deleteCategory(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    const status = err.message === 'Category not found.' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not delete category.' });
  }
});

app.put('/api/admin/pricing/categories/reorder', requireAdminAuth, async (req, res) => {
  const { orderedIds } = req.body || {};
  try {
    await reorderCategories(orderedIds);
    res.json({ categories: await getAllCategories() });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not reorder categories.' });
  }
});

app.post('/api/admin/pricing/categories/:categoryId/items', requireAdminAuth, async (req, res) => {
  const { name, price } = req.body || {};
  try {
    const item = await createItem(req.params.categoryId, { name, price });
    res.status(201).json({ item });
  } catch (err) {
    const status = err.message === 'Category not found.' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not create item.' });
  }
});

app.put('/api/admin/pricing/items/:itemId', requireAdminAuth, async (req, res) => {
  const { name, price } = req.body || {};
  try {
    const item = await updateItem(req.params.itemId, { name, price });
    res.json({ item });
  } catch (err) {
    const status = err.message === 'Item not found.' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not update item.' });
  }
});

app.delete('/api/admin/pricing/items/:itemId', requireAdminAuth, async (req, res) => {
  try {
    await deleteItem(req.params.itemId);
    res.json({ deleted: true });
  } catch (err) {
    const status = err.message === 'Item not found.' ? 404 : 400;
    res.status(status).json({ error: err.message || 'Could not delete item.' });
  }
});

app.put('/api/admin/pricing/categories/:categoryId/items/reorder', requireAdminAuth, async (req, res) => {
  const { orderedItemIds } = req.body || {};
  try {
    await reorderItems(req.params.categoryId, orderedItemIds);
    const categories = await getAllCategories();
    res.json({ category: categories.find((c) => c.id === req.params.categoryId) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not reorder items.' });
  }
});

async function start() {
  // Bootstrap the first admin account and seed pricing data before the
  // server starts accepting requests — both now hit the database (Turso
  // or local file), so they need to be awaited rather than fired at
  // import time, otherwise an early request could race ahead of the
  // tables even existing yet.
  await bootstrapAdminIfNeeded();
  await seedFromStaticDataIfEmpty(STATIC_SEED_CATEGORIES);

  app.listen(PORT, () => {
    console.log(`La Derma booking API running on http://localhost:${PORT}`);
    console.log(`Calendar connected: ${isCalendarConnected()}`);
    if (!isCalendarConnected()) {
      console.log(`Visit http://localhost:${PORT}/api/auth/connect to connect Google Calendar.`);
    }
  });
}

start();
