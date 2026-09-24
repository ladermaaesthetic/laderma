import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { buildBookingICS } from './ics.js';

const LOGO_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/la-derma-logo_de083f56.jpg';

const CLINIC_ADDRESS_TEXT = '19 Jackson St, Gateshead NE8 1EE';
const CLINIC_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=19+Jackson+St%2C+Gateshead+NE8+1EE';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Brevo has a genuine HTTP API (unlike raw SMTP, which is blocked outbound
// on Render's free tier — that's why Gmail SMTP didn't work) and its free
// tier does not require a verified sending domain before you can email
// real recipients, unlike Resend's free tier. This is what actually
// reaches real clients until a domain is verified in Resend.
let brevoClient = null;
function getBrevoClient() {
  if (brevoClient) return brevoClient;
  if (!process.env.BREVO_API_KEY) return null;
  brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  return brevoClient;
}

// The public site's own URL (not this API's), for links inside emails that
// should open the site itself — e.g. "Book again" after a cancellation.
// CLIENT_ORIGIN can be a comma-separated list (see index.js); the first
// entry is treated as the canonical public site.
function getSiteBaseUrl() {
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');
  return origins[0].trim();
}

function formatDateTime(iso, timezone) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone,
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone,
  });
  return { date, time };
}

// Shared email shell — logo header, cream/navy/gold branding matching the
// site, footer. Individual emails fill in the middle section.
function emailShell({ preheader, bodyHtml }) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background-color:#FAF6EF; font-family: Georgia, 'Times New Roman', serif;">
    <span style="display:none; font-size:1px; color:#FAF6EF;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6EF; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid rgba(169,131,71,0.16);">
            <tr>
              <td style="padding:32px 32px 24px; text-align:center; background-color:#FAF6EF; border-bottom:1px solid rgba(169,131,71,0.16);">
                <img src="${LOGO_URL}" width="56" height="56" alt="La Derma" style="border-radius:50%; display:inline-block; margin-bottom:12px;" />
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; letter-spacing:0.5px;">La Derma</div>
                <div style="font-family: Arial, sans-serif; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#9C7A46; margin-top:4px;">Results Led Aesthetic Care</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; font-family: Arial, sans-serif; color:#22314A;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#FAF6EF; border-top:1px solid rgba(169,131,71,0.16); text-align:center;">
                <div style="font-family: Arial, sans-serif; font-size:11px; color:rgba(34,49,74,0.5);">La Derma Aesthetic Clinic</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0; font-size:13px; color:rgba(34,49,74,0.56); text-transform:uppercase; letter-spacing:1px; width:140px; vertical-align:top;">${label}</td>
      <td style="padding:8px 0; font-size:15px; color:#22314A; vertical-align:top;">${value}</td>
    </tr>`;
}

// The "Add to Calendar" button. It links to a URL on our own server that
// serves this specific booking's .ics file (see index.js's
// /api/bookings/:id/calendar.ics route). Opening that URL is what
// reliably triggers the device's native calendar app on both iPhone and
// Android — a `cid:` reference to the attachment is not a supported way
// to make an attachment clickable across email clients, so a real HTTPS
// link is what actually works here. We still attach the .ics file too,
// as a fallback for anyone who'd rather open it directly from the email.
function addToCalendarButton(icsUrl) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:999px; background-color:#C9A66B;">
          <a href="${icsUrl}" style="display:inline-block; padding:13px 28px; font-family: Arial, sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#22314A; text-decoration:none; font-weight:bold;">
            + Add to Calendar
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px; line-height:1.6; color:rgba(34,49,74,0.5); margin:0 0 24px;">
      Works with Apple Calendar and Google Calendar. If the button doesn't open your calendar app, the same event is also attached to this email as a file.
    </p>`;
}

/**
 * Sends the branded confirmation email to the client — the ONLY booking
 * email they receive (we deliberately do not send Google's own calendar
 * invite; see calendar.js, sendUpdates is set to 'none'). Includes an
 * "Add to Calendar" button backed by an attached .ics file, which works
 * on both iPhone and Android.
 *
 * Sent via Brevo rather than Resend or Gmail SMTP: Resend's free tier
 * blocks sending to anyone except your own verified account email until
 * a domain is verified, and raw SMTP (which Gmail requires) is blocked
 * outbound on Render's free tier. Brevo's free tier is a genuine HTTP
 * API with no domain-verification requirement to send to real clients.
 */
export async function sendClientConfirmationEmail({ to, name, treatment, startISO, endISO, notes, timezone, bookingId }) {
  const brevo = getBrevoClient();
  if (!brevo) {
    console.log('BREVO_API_KEY not set — skipping client confirmation email.');
    return;
  }

  const { date, time } = formatDateTime(startISO, timezone);
  const icsFilename = 'la-derma-consultation.ics';
  const organizerEmail = process.env.BREVO_SENDER_EMAIL || process.env.CLINIC_NOTIFY_EMAIL || 'bookings@laderma.com';

  const ics = buildBookingICS({
    uid: `${bookingId}@laderma`,
    startISO,
    endISO,
    treatment,
    name,
    notes,
    organizerEmail,
  });

  const apiBase = process.env.PUBLIC_API_BASE || `http://localhost:${process.env.PORT || 4000}`;
  const icsUrl = `${apiBase}/api/bookings/${bookingId}/calendar.ics`;

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">Your consultation is confirmed</h1>
    <p style="font-size:15px; line-height:1.6; color:rgba(34,49,74,0.78); margin:0 0 24px;">
      Hi ${name}, thank you for booking with La Derma. Here are your consultation details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${detailRow('Treatment', treatment)}
      ${detailRow('Date', date)}
      ${detailRow('Time', `${time} (${timezone})`)}
      ${detailRow('Location', `${CLINIC_ADDRESS_TEXT}<br/><a href="${CLINIC_MAPS_URL}" style="color:#9C7A46; text-decoration:none; font-size:13px;">Get directions →</a>`)}
    </table>
    ${addToCalendarButton(icsUrl)}
    <p style="font-size:14px; line-height:1.6; color:rgba(34,49,74,0.68); margin:0;">
      If you need to reschedule or have any questions before your visit, just reply to this email.
    </p>
  `;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: 'La Derma',
    },
    to: [{ email: to, name }],
    subject: 'Your La Derma consultation is confirmed',
    htmlContent: emailShell({
      preheader: `Your ${treatment} consultation on ${date} at ${time} is confirmed.`,
      bodyHtml,
    }),
    attachment: [
      {
        name: icsFilename,
        content: Buffer.from(ics).toString('base64'),
      },
    ],
  });
}

/**
 * Sends the branded cancellation email — replaces what used to be Google
 * Calendar's own generic cancellation notice (see the comment on
 * `attendees` in calendar.js's createBooking for why that was happening).
 * This is the ONLY cancellation notice a client receives now, whether the
 * cancellation was made by the client themselves or by clinic staff.
 */
export async function sendClientCancellationEmail({ to, name, treatment, startISO, timezone }) {
  const brevo = getBrevoClient();
  if (!brevo) {
    console.log('BREVO_API_KEY not set — skipping client cancellation email.');
    return;
  }

  const { date, time } = formatDateTime(startISO, timezone);
  const bookingUrl = `${getSiteBaseUrl()}/booking`;

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">Your consultation has been cancelled</h1>
    <p style="font-size:15px; line-height:1.6; color:rgba(34,49,74,0.78); margin:0 0 24px;">
      Hi ${name}, this confirms your consultation below is no longer booked.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${detailRow('Treatment', treatment)}
      ${detailRow('Was on', `${date}`)}
      ${detailRow('Was at', `${time} (${timezone})`)}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:999px; background-color:#C9A66B;">
          <a href="${bookingUrl}" style="display:inline-block; padding:13px 28px; font-family: Arial, sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#22314A; text-decoration:none; font-weight:bold;">
            Book Another Time
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:14px; line-height:1.6; color:rgba(34,49,74,0.68); margin:0;">
      If you didn't request this cancellation, or have any questions, just reply to this email.
    </p>
  `;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'La Derma' },
    to: [{ email: to, name }],
    subject: 'Your La Derma consultation has been cancelled',
    htmlContent: emailShell({
      preheader: `Your ${treatment} consultation on ${date} at ${time} has been cancelled.`,
      bodyHtml,
    }),
  });
}

/**
 * Sends the branded reschedule email — shows the previous time struck
 * through against the new one, with a fresh "Add to Calendar" button/.ics
 * for the new time. The underlying Calendar event keeps the same ID when
 * rescheduled (see calendar.js's rescheduleBooking, which patches rather
 * than delete+recreate), so the same /api/bookings/:id/calendar.ics link
 * already used for the original confirmation still works here too.
 */
export async function sendClientRescheduledEmail({
  to, name, treatment, oldStartISO, newStartISO, newEndISO, timezone, bookingId,
}) {
  const brevo = getBrevoClient();
  if (!brevo) {
    console.log('BREVO_API_KEY not set — skipping client reschedule email.');
    return;
  }

  const was = formatDateTime(oldStartISO, timezone);
  const now = formatDateTime(newStartISO, timezone);
  const icsFilename = 'la-derma-consultation.ics';
  const organizerEmail = process.env.BREVO_SENDER_EMAIL || process.env.CLINIC_NOTIFY_EMAIL || 'bookings@laderma.com';

  const ics = buildBookingICS({
    uid: `${bookingId}@laderma`,
    startISO: newStartISO,
    endISO: newEndISO,
    treatment,
    name,
    organizerEmail,
  });

  const apiBase = process.env.PUBLIC_API_BASE || `http://localhost:${process.env.PORT || 4000}`;
  const icsUrl = `${apiBase}/api/bookings/${bookingId}/calendar.ics`;

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">Your consultation has been rescheduled</h1>
    <p style="font-size:15px; line-height:1.6; color:rgba(34,49,74,0.78); margin:0 0 24px;">
      Hi ${name}, your ${treatment} consultation has moved to a new time:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${detailRow('Treatment', treatment)}
      ${detailRow('Previously', `<span style="text-decoration:line-through; color:rgba(34,49,74,0.45);">${was.date}, ${was.time}</span>`)}
      ${detailRow('New date', now.date)}
      ${detailRow('New time', `${now.time} (${timezone})`)}
      ${detailRow('Location', `${CLINIC_ADDRESS_TEXT}<br/><a href="${CLINIC_MAPS_URL}" style="color:#9C7A46; text-decoration:none; font-size:13px;">Get directions →</a>`)}
    </table>
    ${addToCalendarButton(icsUrl)}
    <p style="font-size:14px; line-height:1.6; color:rgba(34,49,74,0.68); margin:0;">
      If this new time doesn't work, just reply to this email and we'll sort out another one.
    </p>
  `;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'La Derma' },
    to: [{ email: to, name }],
    subject: 'Your La Derma consultation has been rescheduled',
    htmlContent: emailShell({
      preheader: `Your ${treatment} consultation has moved to ${now.date} at ${now.time}.`,
      bodyHtml,
    }),
    attachment: [
      {
        name: icsFilename,
        content: Buffer.from(ics).toString('base64'),
      },
    ],
  });
}

/**
 * Sends the "reset your password" link for a client account. The link
 * itself (with the raw token) is only ever handed to Brevo here — the
 * server only ever stores a hash of it (see clientStore.js), so this email
 * is the one place the usable token exists in plaintext.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const brevo = getBrevoClient();
  if (!brevo) {
    // Unlike the other "skipping" logs in this file, the link itself is
    // logged here too — without Brevo configured there's no other way to
    // get it while developing locally, since it's never stored anywhere
    // in plaintext (see the note on this function above).
    console.log(`BREVO_API_KEY not set — skipping password reset email. Reset link for ${to}: ${resetUrl}`);
    return;
  }

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">Reset your password</h1>
    <p style="font-size:15px; line-height:1.6; color:rgba(34,49,74,0.78); margin:0 0 24px;">
      Hi ${name}, we received a request to reset the password on your La Derma account. Click below to choose a new one — this link expires in 1 hour.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:999px; background-color:#C9A66B;">
          <a href="${resetUrl}" style="display:inline-block; padding:13px 28px; font-family: Arial, sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#22314A; text-decoration:none; font-weight:bold;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px; line-height:1.6; color:rgba(34,49,74,0.56); margin:0;">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  `;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'La Derma' },
    to: [{ email: to, name }],
    subject: 'Reset your La Derma password',
    htmlContent: emailShell({
      preheader: 'Reset the password on your La Derma account.',
      bodyHtml,
    }),
  });
}

/**
 * Sends a notification to the clinic's own inbox whenever a client books,
 * so the person running the clinic doesn't have to keep checking the
 * booking site or Google Calendar to know a new booking came in.
 */
export async function sendClinicNotificationEmail({ name, email, phone, treatment, notes, startISO, timezone }) {
  const resend = getResendClient();
  const notifyTo = process.env.CLINIC_NOTIFY_EMAIL;

  if (!resend) {
    console.log('RESEND_API_KEY not set — skipping clinic notification email.');
    return;
  }
  if (!notifyTo) {
    console.log('CLINIC_NOTIFY_EMAIL not set — skipping clinic notification email.');
    return;
  }

  const { date, time } = formatDateTime(startISO, timezone);

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">New consultation booked</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${detailRow('Client', name)}
      ${detailRow('Email', `<a href="mailto:${email}" style="color:#9C7A46; text-decoration:none;">${email}</a>`)}
      ${detailRow('Phone', phone)}
      ${detailRow('Treatment', treatment)}
      ${detailRow('Date', date)}
      ${detailRow('Time', `${time} (${timezone})`)}
      ${detailRow('Notes', notes || '(none provided)')}
    </table>
    <p style="font-size:13px; line-height:1.6; color:rgba(34,49,74,0.56); margin-top:20px;">
      This has already been added to your connected Google Calendar.
    </p>
  `;

  await resend.emails.send({
    from: process.env.CLINIC_FROM_EMAIL || 'La Derma Booking <onboarding@resend.dev>',
    to: notifyTo,
    subject: `New booking: ${name} — ${treatment} on ${date}`,
    html: emailShell({
      preheader: `${name} booked a ${treatment} consultation for ${date} at ${time}.`,
      bodyHtml,
    }),
  });
}
