import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { buildBookingICS } from './ics.js';

const LOGO_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/la-derma-logo_de083f56.jpg';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Gmail SMTP has no "can only send to your own address" restriction the
// way an unverified Resend account does, so this is what actually sends
// the client-facing confirmation email until a domain is verified in
// Resend. Requires a Gmail App Password (not the regular account
// password) — see server/.env.example for how to generate one.
let gmailTransporter = null;
function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter;
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;

  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return gmailTransporter;
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
 * Sent via Gmail SMTP rather than Resend, because Resend's free tier
 * blocks sending to anyone except your own verified account email until
 * a domain is verified — Gmail has no such restriction, so this is what
 * actually reaches real clients in the meantime.
 */
export async function sendClientConfirmationEmail({ to, name, treatment, startISO, endISO, notes, timezone, bookingId }) {
  const transporter = getGmailTransporter();
  if (!transporter) {
    console.log('GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping client confirmation email.');
    return;
  }

  const { date, time } = formatDateTime(startISO, timezone);
  const icsFilename = 'la-derma-consultation.ics';
  const organizerEmail = process.env.GMAIL_USER || process.env.CLINIC_NOTIFY_EMAIL || 'bookings@laderma.com';

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
    </table>
    ${addToCalendarButton(icsUrl)}
    <p style="font-size:14px; line-height:1.6; color:rgba(34,49,74,0.68); margin:0;">
      If you need to reschedule or have any questions before your visit, just reply to this email.
    </p>
  `;

  await transporter.sendMail({
    from: process.env.CLINIC_FROM_EMAIL || `La Derma <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your La Derma consultation is confirmed',
    html: emailShell({
      preheader: `Your ${treatment} consultation on ${date} at ${time} is confirmed.`,
      bodyHtml,
    }),
    attachments: [
      {
        filename: icsFilename,
        content: ics,
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
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
