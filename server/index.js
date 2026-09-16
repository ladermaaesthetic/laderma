import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  getAuthUrl,
  saveTokenFromCode,
  isCalendarConnected,
  disconnectCalendar,
} from './googleAuth.js';
import { getAvailableSlots, createBooking, getBookingById, CONSULTATION_MINUTES, TIMEZONE } from './calendar.js';
import { buildBookingICS } from './ics.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`La Derma booking API running on http://localhost:${PORT}`);
  console.log(`Calendar connected: ${isCalendarConnected()}`);
  if (!isCalendarConnected()) {
    console.log(`Visit http://localhost:${PORT}/api/auth/connect to connect Google Calendar.`);
  }
});
