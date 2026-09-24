import { google } from 'googleapis';
import { getAuthorizedClient } from './googleAuth.js';
import {
  sendClientConfirmationEmail,
  sendClinicNotificationEmail,
  sendClientCancellationEmail,
  sendClientRescheduledEmail,
  sendClientCompletionEmail,
} from './email.js';

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

// Bookings deliberately do NOT add the client as a Calendar "attendee" (see
// the comment on `attendees` in createBooking below) — so client name/email/
// phone/notes only ever live in the event description, and every place that
// needs them back out (admin listings, the .ics route, cancellation and
// reschedule emails) parses it the same way, via this one function.
export function parseBookingDescription(description) {
  const text = description || '';
  const treatmentMatch = /Treatment focus: (.+)/.exec(text);
  const clientMatch = /Client: (.+)/.exec(text);
  const emailMatch = /Email: (.+)/.exec(text);
  const phoneMatch = /Phone: (.+)/.exec(text);
  const notesMatch = /Notes: (.+)/.exec(text);
  return {
    treatment: treatmentMatch ? treatmentMatch[1] : null,
    name: clientMatch ? clientMatch[1] : null,
    email: emailMatch ? emailMatch[1] : null,
    phone: phoneMatch ? phoneMatch[1] : null,
    notes: notesMatch && notesMatch[1] !== '(none provided)' ? notesMatch[1] : null,
  };
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
    // Deliberately NOT adding the client as a Calendar attendee. Attendees
    // get Google's own invite/update/cancellation emails straight from
    // Google, entirely outside our control (independent of sendUpdates on
    // later calls) — that's what was sending a generic Google email on
    // cancellation instead of our branded one. Client name/email/phone
    // live in the description above instead (see parseBookingDescription),
    // and our own Brevo emails are the ONLY thing the client ever receives.
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

// A booking's own extendedProperties marker for "the admin has marked this
// appointment complete" — same pattern as BLOCK_MARKER further down, just
// for bookings instead of blocked-out time.
const COMPLETED_MARKER_KEY = 'ladermaCompleted';

function isBlockEvent(event) {
  return event.extendedProperties?.private?.ladermaBlock === 'true';
}

function eventToBooking(event) {
  const details = parseBookingDescription(event.description);
  return {
    id: event.id,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    treatment: details.treatment,
    clientName: details.name,
    clientEmail: details.email,
    clientPhone: details.phone,
    notes: details.notes,
    completed: event.extendedProperties?.private?.[COMPLETED_MARKER_KEY] === 'true',
  };
}

/**
 * Returns how many client bookings (never admin "unavailable" blocks) fall
 * on each date within the given month — used by the admin dashboard's
 * calendar to show a count under every day without needing a separate
 * request per day.
 */
export async function getBookingCountsForMonth(year, month) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // first of the following month, exclusive

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const counts = {};
  for (const event of res.data.items || []) {
    if (isBlockEvent(event)) continue;
    const dateStr = (event.start?.dateTime || event.start?.date || '').slice(0, 10);
    if (!dateStr) continue;
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  }
  return counts;
}

/**
 * Lists every booking (past, present or future — unlike the public
 * availability endpoint, which only ever looks forward) on one specific
 * date, with full client details. Used by the admin dashboard's calendar
 * day view. Admin-only: the public site never calls this.
 */
export async function listBookingsForDate(dateStr) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60000);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || [])
    .filter((event) => !isBlockEvent(event))
    .map(eventToBooking);
}

/**
 * Marks a booking as completed (an appointment that's already happened)
 * and sends the client a branded "thanks for visiting" email inviting a
 * review and a follow on social media. Tagged with an extendedProperties
 * marker on the event itself, the same pattern createUnavailableBlock uses
 * below — no separate database needed, and it survives exactly as long as
 * the booking itself does.
 */
export async function completeBooking(eventId) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const existing = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: {
      extendedProperties: { private: { [COMPLETED_MARKER_KEY]: 'true' } },
    },
    sendUpdates: 'none',
  });

  const details = parseBookingDescription(existing.data.description);
  if (details.email) {
    try {
      await sendClientCompletionEmail({
        to: details.email,
        name: details.name || 'there',
        treatment: details.treatment || 'consultation',
      });
    } catch (err) {
      console.error('Failed to send completion email:', err);
    }
  }

  return eventToBooking({ ...existing.data, extendedProperties: { private: { [COMPLETED_MARKER_KEY]: 'true' } } });
}

/**
 * Cancels (deletes) a booking by its Google Calendar event ID. Used by both
 * a client cancelling their own booking and the admin panel cancelling any
 * booking (no-shows, mistaken bookings, etc). Fetches the event first so we
 * can send our own branded cancellation email — the event, and the
 * description its client details live in, are gone once deleted. Best
 * effort: a client/block event with no parseable email (e.g. an admin
 * "unavailable" block, see deleteUnavailableBlock below) simply gets no
 * email, and a failure to look the event up first still lets the delete
 * proceed rather than blocking the cancellation on it.
 */
export async function cancelBooking(eventId) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  let details = null;
  try {
    const existing = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
    details = {
      ...parseBookingDescription(existing.data.description),
      startISO: existing.data.start?.dateTime || existing.data.start?.date,
    };
  } catch (err) {
    console.error('Could not look up booking before cancelling (proceeding with delete):', err);
  }

  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: 'none',
  });

  if (details?.email && details?.startISO) {
    try {
      await sendClientCancellationEmail({
        to: details.email,
        name: details.name || 'there',
        treatment: details.treatment || 'consultation',
        startISO: details.startISO,
        timezone: TIMEZONE,
      });
    } catch (err) {
      console.error('Failed to send cancellation email:', err);
    }
  }
}

/**
 * Moves an existing booking to a new start time (admin dashboard "Reschedule"
 * action) by patching the same Calendar event in place, so it keeps the same
 * event ID — and therefore the same .ics/"Add to Calendar" link already
 * emailed to the client still resolves to the correct, updated time. Re-checks
 * the new slot is free first, the same race-condition guard as createBooking,
 * filtering out the event's own current slot (which would otherwise always
 * show up as "busy against itself" if the new time overlaps the old one).
 */
export async function rescheduleBooking({ eventId, newStartISO }) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('CALENDAR_NOT_CONNECTED');
  }

  const existing = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const oldStartISO = existing.data.start?.dateTime;
  const oldEndISO = existing.data.end?.dateTime;
  if (!oldStartISO || !oldEndISO) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  const newStart = new Date(newStartISO);
  const newEnd = new Date(newStart.getTime() + CONSULTATION_MINUTES * 60000);
  const oldStart = new Date(oldStartISO);
  const oldEnd = new Date(oldEndISO);

  const freeBusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: newStart.toISOString(),
      timeMax: newEnd.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: CALENDAR_ID }],
    },
  });
  const busy = (freeBusyRes.data.calendars[CALENDAR_ID]?.busy || []).filter((b) => {
    const isThisBookingsOwnCurrentSlot =
      new Date(b.start).getTime() === oldStart.getTime() && new Date(b.end).getTime() === oldEnd.getTime();
    return !isThisBookingsOwnCurrentSlot;
  });
  if (busy.length > 0) {
    throw new Error('SLOT_NO_LONGER_AVAILABLE');
  }

  const res = await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: {
      start: { dateTime: newStart.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: newEnd.toISOString(), timeZone: TIMEZONE },
    },
    sendUpdates: 'none',
  });

  const details = parseBookingDescription(existing.data.description);
  if (details.email) {
    try {
      await sendClientRescheduledEmail({
        to: details.email,
        name: details.name || 'there',
        treatment: details.treatment || 'consultation',
        oldStartISO,
        newStartISO: newStart.toISOString(),
        newEndISO: newEnd.toISOString(),
        timezone: TIMEZONE,
        bookingId: eventId,
      });
    } catch (err) {
      console.error('Failed to send reschedule email:', err);
    }
  }

  return res.data;
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
