import { Resend } from 'resend';

const LOGO_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663448677533/D7fnEQUJWHBXWGYDWnFdAo/la-derma-logo_de083f56.jpg';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
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

/**
 * Sends a branded confirmation email to the client. This is separate from
 * (and in addition to) the Google Calendar invite — Google's own invite
 * email can't be restyled with our branding, so this is the properly
 * branded confirmation the client actually sees front and centre.
 */
export async function sendClientConfirmationEmail({ to, name, treatment, startISO, timezone }) {
  const resend = getResendClient();
  if (!resend) {
    console.log('RESEND_API_KEY not set — skipping client confirmation email.');
    return;
  }

  const { date, time } = formatDateTime(startISO, timezone);

  const bodyHtml = `
    <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; color:#22314A; margin:0 0 16px;">Your consultation is confirmed</h1>
    <p style="font-size:15px; line-height:1.6; color:rgba(34,49,74,0.78); margin:0 0 24px;">
      Hi ${name}, thank you for booking with La Derma. Here are your consultation details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${detailRow('Treatment', treatment)}
      ${detailRow('Date', date)}
      ${detailRow('Time', `${time} (${timezone})`)}
    </table>
    <p style="font-size:14px; line-height:1.6; color:rgba(34,49,74,0.68); margin:0;">
      A calendar invite has also been sent separately so you can add this to your own calendar. If you need to reschedule or have any questions before your visit, just reply to this email.
    </p>
  `;

  await resend.emails.send({
    from: process.env.CLINIC_FROM_EMAIL || 'La Derma <onboarding@resend.dev>',
    to,
    subject: 'Your La Derma consultation is confirmed',
    html: emailShell({
      preheader: `Your ${treatment} consultation on ${date} at ${time} is confirmed.`,
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

  if (!resend || !notifyTo) {
    console.log('RESEND_API_KEY or CLINIC_NOTIFY_EMAIL not set — skipping clinic notification email.');
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
