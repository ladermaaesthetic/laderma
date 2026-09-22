import { google } from 'googleapis';
import { getAuthorizedClient } from './googleAuth.js';
import { sendClientConfirmationEmail, sendClinicNotificationEmail } from './email.js';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const CONSULTATION_MINUTES = Number(process.env.CONSULTATION_LENGTH_MINUTES || 60);
const TIMEZONE = process.env.CLINIC_TIMEZONE || 'Europe/London';

// Clinic working hours, used to generate candidate slots before checking
// them against real calendar busy times. 24h format, local clinic time.
const WORKING_HOURS = {
  1: { start: 9, end: 17 }, // Monday
  2: { start: 9, end: 17 },
  3: { start: 9, end: 17 },
  4: { start: 9, end: 17 },
  5: { start: 9, end: 17 },
  6: { start: 10, end: 15 }, // Saturday
  0: null, // Sunday — closed
};

function getCalendarClient() {
  const auth = getAuthorizedClient();
  if (!auth) return null;
  return google.calendar({ version: 'v3', auth });
}

/**
 * Returns available start times (as ISO strings) for a given calendar day,
 * derived from working hours minus whatever Google Calendar reports as busy.
 * Clients never see event titles/attendees — only which slots are free.
 */
export async function getAvailableSlots(dateStr) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const day = new Date(`${dateStr}T00:00:00`);
  const weekday = day.getDay();
  const hours = WORKING_HOURS[weekday];

  if (!hours) return []; // closed that day

  const dayStart = new Date(day);
  dayStart.setHours(hours.start, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(hours.end, 0, 0, 0);

  // Ask Google which windows are busy on the clinic's real calendar that day.
  const freeBusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: CALENDAR_ID }],
    },
  });

  const busy = freeBusyRes.data.calendars[CALENDAR_ID]?.busy || [];

  // Generate candidate slots at the consultation-length interval, then drop
  // any that overlap a busy window or that have already passed.
  const slots = [];
  const now = new Date();
  let cursor = new Date(dayStart);

  while (cursor.getTime() + CONSULTATION_MINUTES * 60000 <= dayEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + CONSULTATION_MINUTES * 60000);

    const overlapsBusy = busy.some((b) => {
      const busyStart = new Date(b.start);
      const busyEnd = new Date(b.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    const isPast = slotStart < now;

    if (!overlapsBusy && !isPast) {
      slots.push(slotStart.toISOString());
    }

    cursor = new Date(cursor.getTime() + CONSULTATION_MINUTES * 60000);
  }

  return slots;
}

/**
 * Creates the booking as a real event on the clinic's Google Calendar.
 * Re-checks the slot is still free immediately before booking to avoid a
 * race condition between two clients booking the same slot at once.
 */
export async function createBooking({ startISO, name, email, phone, treatment, notes }) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const start = new Date(startISO);
  const end = new Date(start.getTime() + CONSULTATION_MINUTES * 60000);

  // Race-condition guard: re-check free/busy right before insert.
  const freeBusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: CALENDAR_ID }],
    },
  });
  const busy = freeBusyRes.data.calendars[CALENDAR_ID]?.busy || [];
  if (busy.length > 0) {
    throw new Error('SLOT_NO_LONGER_AVAILABLE');
  }

  const event = {
    summary: `Consultation: ${treatment} — ${name}`,
    description:
      `Treatment focus: ${treatment}\n` +
      `Client: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}\n` +
      (notes ? `Notes: ${notes}` : 'Notes: (none provided)'),
    start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    attendees: [{ email, displayName: name }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: event,
    sendUpdates: 'none', // the client gets our own branded email instead of Google's calendar invite
  });

  // Fire off our own branded emails alongside the calendar write.
  // These failing shouldn't fail the booking itself — the calendar event
  // is the source of truth, so we log and continue rather than throwing.
  try {
    await sendClientConfirmationEmail({
      to: email,
      name,
      treatment,
      startISO,
      endISO: end.toISOString(),
      notes,
      timezone: TIMEZONE,
      bookingId: res.data.id,
    });
  } catch (err) {
    console.error('Failed to send client confirmation email:', err);
    if (err?.statusCode === 401) {
      console.error(
        'This looks like an invalid or missing Brevo API key: check ' +
        'BREVO_API_KEY is set correctly. See server/.env.example for details.'
      );
    } else if (err?.statusCode === 400 || err?.statusCode === 422) {
      console.error(
        'Brevo rejected the request — check BREVO_SENDER_EMAIL is set to a ' +
        'real, verified sender address in your Brevo account (Senders, ' +
        'Domains & Dedicated IPs > Senders).'
      );
    }
  }
  try {
    await sendClinicNotificationEmail({ name, email, phone, treatment, notes, startISO, timezone: TIMEZONE });
  } catch (err) {
    console.error('Failed to send clinic notification email:', err);
  }

  return res.data;
}

/**
 * Fetches a single previously-created booking event by its Google
 * Calendar event ID — used to regenerate its .ics file on demand for the
 * "Add to Calendar" link in the confirmation email, without us needing
 * our own separate database of bookings.
 */
export async function getBookingById(eventId) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  return res.data;
}

/**
 * Lists all upcoming bookings with full client details — used by the
 * admin panel only. The public site never calls this; the public
 * availability endpoint deliberately only returns free/busy times, not
 * event contents, to protect client privacy.
 */
export async function listUpcomingBookings() {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map((event) => {
    const attendee = (event.attendees || [])[0] || {};
    const treatmentMatch = /Treatment focus: (.+)/.exec(event.description || '');
    const phoneMatch = /Phone: (.+)/.exec(event.description || '');
    const notesMatch = /Notes: (.+)/.exec(event.description || '');

    return {
      id: event.id,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      summary: event.summary,
      treatment: treatmentMatch ? treatmentMatch[1] : null,
      clientName: attendee.displayName || null,
      clientEmail: attendee.email || null,
      clientPhone: phoneMatch ? phoneMatch[1] : null,
      notes: notesMatch && notesMatch[1] !== '(none provided)' ? notesMatch[1] : null,
    };
  });
}

/**
 * Cancels (deletes) a booking by its Google Calendar event ID. Used by
 * the admin panel to remove no-shows, cancellations, or mistaken bookings.
 */
export async function cancelBooking(eventId) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: 'none',
  });
}

// ---------------------------------------------------------------------------
// Admin "block out unavailable time" — creates a real event on the same
// Google Calendar the booking system already reads busy/free from, so a
// block takes effect immediately with no separate logic: getAvailableSlots
// above already excludes anything busy on the calendar. Blocks are tagged
// with a private extended property (invisible to attendees/clients, not
// shown anywhere on the public site) so the admin panel can tell its own
// blocks apart from real client bookings when listing/deleting them.
const BLOCK_MARKER = { private: { ladermaBlock: 'true' } };

/**
 * Creates a block-out event. Pass either `allDay: true` for a whole day
 * off, or a `startISO`/`endISO` pair for a specific time range within a
 * day — both are just calendar events, so freebusy treats them exactly
 * like a real appointment and hides the covered slots automatically.
 */
export async function createUnavailableBlock({ dateStr, allDay, startISO, endISO, label }) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const summary = label?.trim() ? label.trim() : 'Unavailable';
  let event;

  if (allDay) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('INVALID_BLOCK_RANGE');
    }
    // Google Calendar all-day events use exclusive end dates — end is the
    // day *after* the last day the block covers.
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60000);
    event = {
      summary,
      start: { date: dateStr },
      end: { date: end.toISOString().slice(0, 10) },
      extendedProperties: BLOCK_MARKER,
    };
  } else {
    if (!startISO || !endISO || isNaN(Date.parse(startISO)) || isNaN(Date.parse(endISO))) {
      throw new Error('INVALID_BLOCK_RANGE');
    }
    if (new Date(endISO) <= new Date(startISO)) {
      throw new Error('INVALID_BLOCK_RANGE');
    }
    event = {
      summary,
      start: { dateTime: new Date(startISO).toISOString(), timeZone: TIMEZONE },
      end: { dateTime: new Date(endISO).toISOString(), timeZone: TIMEZONE },
      extendedProperties: BLOCK_MARKER,
    };
  }

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: event,
    sendUpdates: 'none',
  });

  return res.data;
}

/**
 * Lists upcoming block-out events (not real bookings) so the admin panel
 * can show what's currently blocked and offer to remove it.
 */
export async function listUnavailableBlocks() {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
    privateExtendedProperty: 'ladermaBlock=true',
  });

  return (res.data.items || []).map((event) => ({
    id: event.id,
    summary: event.summary,
    allDay: Boolean(event.start?.date),
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
  }));
}

/**
 * Removes a block-out event by id. Reuses the same delete call as a real
 * booking cancellation — Google Calendar events are events either way.
 */
export async function deleteUnavailableBlock(eventId) {
  await cancelBooking(eventId);
}

export { CONSULTATION_MINUTES, TIMEZONE };
