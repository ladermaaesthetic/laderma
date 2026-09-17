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
    if (err?.name === 'validation_error' || /You can only send testing emails/i.test(err?.message || '')) {
      console.error(
        'This looks like the Resend free-tier restriction: without a verified ' +
        'domain, you can only send TO the email address your Resend account ' +
        'is registered under — not to real clients. Verify a domain in Resend ' +
        'to lift this, see server/.env.example for details.'
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

export { CONSULTATION_MINUTES, TIMEZONE };
