// Generates a standard iCalendar (.ics) file for one event. This is the
// universal format every calendar app understands — iPhone Mail, Gmail on
// Android, Outlook, Google Calendar — so attaching/linking one .ics file
// gives every client a working "Add to Calendar" action regardless of
// their phone or email client, without us needing separate Apple/Google
// specific integrations.

function toICSDate(date) {
  // UTC, formatted as YYYYMMDDTHHMMSSZ per the iCalendar spec.
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildBookingICS({ uid, startISO, endISO, treatment, name, notes, organizerEmail }) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();

  const description = escapeICSText(
    `Consultation with La Derma Aesthetic Clinic.\n` +
    `Treatment focus: ${treatment}\n` +
    (notes ? `Notes: ${notes}` : '')
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Derma Aesthetic Clinic//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICSText(`La Derma Consultation — ${treatment}`)}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=La Derma Aesthetic Clinic:mailto:${organizerEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // iCalendar requires CRLF line endings.
  return lines.join('\r\n');
}
