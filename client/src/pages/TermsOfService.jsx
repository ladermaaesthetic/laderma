import IntroHero from '../components/IntroHero';
import { CLINIC_PHONE, CLINIC_PHONE_HREF } from '../data/siteData';
import './LegalPage.css';

const LAST_UPDATED = '24 September 2026';

const REGISTERED_OFFICE = '19 Jackson Street, Gateshead, United Kingdom, NE8 1EE';
const COMPANY_NAME = 'La Derma Aesthetic Ltd';
const COMPANY_NUMBER = '16745176';

const SECTIONS = [
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'agreement', label: 'Agreeing to these terms' },
  { id: 'eligibility', label: 'Who can use this site' },
  { id: 'using-the-site', label: 'Using this website' },
  { id: 'bookings', label: 'Booking a consultation' },
  { id: 'changes-cancellations', label: 'Changing or cancelling a booking' },
  { id: 'right-to-cancel', label: 'Your legal right to cancel' },
  { id: 'payment', label: 'Pricing and payment' },
  { id: 'missed-appointments', label: 'Missed appointments' },
  { id: 'treatment-suitability', label: 'Treatment suitability' },
  { id: 'accounts', label: 'Your account' },
  { id: 'intellectual-property', label: 'Intellectual property' },
  { id: 'liability', label: 'Our liability to you' },
  { id: 'law', label: 'Governing law' },
  { id: 'changes', label: 'Changes to these terms' },
  { id: 'contact', label: 'Contact us' },
];

export default function TermsOfService() {
  return (
    <>
      <IntroHero
        badge="Legal"
        eyebrow="Terms of service"
        title="The terms that apply when you use this website."
        lede={`These terms cover using this website and booking a consultation with us. They don't cover the treatments themselves, which are agreed separately, in person, at your consultation. Last updated ${LAST_UPDATED}.`}
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container privacy-wrap">
          <nav className="privacy-toc" aria-label="Sections of these terms">
            <p className="privacy-toc-label">On this page</p>
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="privacy-content">
            <section id="who-we-are">
              <h2>Who we are</h2>
              <p>
                This website is operated by <strong>{COMPANY_NAME}</strong>, a company registered in England and
                Wales under company number <strong>{COMPANY_NUMBER}</strong>, whose registered office is at{' '}
                {REGISTERED_OFFICE}. We trade as <strong>La Derma Aesthetic Clinic</strong>.
              </p>
              <p>
                In these terms, "La Derma", "we", "us" and "our" mean La Derma Aesthetic Ltd, and "you" means
                anyone who uses this website or books a consultation through it.
              </p>
            </section>

            <section id="agreement">
              <h2>Agreeing to these terms</h2>
              <p>
                By using this website — browsing it, creating an account, or booking a consultation — you agree
                to these terms. If you don't agree to them, please don't use the site; you're always welcome to
                contact the clinic directly by phone instead.
              </p>
              <p>
                These terms sit alongside our{' '}
                <a href="/privacy-policy">Privacy Policy</a>, which explains how we handle your personal data —
                please read that too.
              </p>
            </section>

            <section id="eligibility">
              <h2>Who can use this site</h2>
              <p>
                Our treatments and consultations are for adults. You must be at least 18 years old to book a
                consultation or create an account with us. If we have reason to believe an account or booking was
                made by someone under 18, we may cancel it.
              </p>
            </section>

            <section id="using-the-site">
              <h2>Using this website</h2>
              <p>You agree to use this website only for its intended purpose — finding out about our treatments and booking a consultation — and not to:</p>
              <ul>
                <li>Make bookings using false details, or impersonate someone else.</li>
                <li>Attempt to interfere with, overload, or gain unauthorised access to the booking system or any account other than your own.</li>
                <li>Use any automated system (a bot or script) to make bookings or scrape information from the site.</li>
              </ul>
              <p>
                We work to keep this website accurate and available, but we don't guarantee it will always be
                uninterrupted, error-free, or available at any particular time — for example, the booking calendar
                depends on our connection to Google Calendar, which can occasionally be temporarily unavailable.
              </p>
            </section>

            <section id="bookings">
              <h2>Booking a consultation</h2>
              <p>
                The calendar on our <a href="/booking">booking page</a> shows genuinely available consultation
                slots, checked live against the clinic's calendar. When you submit a booking, we do a final check
                that the slot is still free before confirming it — occasionally, if someone else books the same
                slot moments before you, we won't be able to confirm yours and you'll be asked to choose another
                time.
              </p>
              <p>
                Once confirmed, you'll receive a confirmation email with your appointment details and a calendar
                file you can add to your own calendar. That email is your confirmation that the booking exists —
                if you don't receive one, please contact us before assuming your consultation is booked.
              </p>
              <p>
                You can book as a guest, or create an account first so your bookings are saved to it — see{' '}
                <a href="#accounts">Your account</a> below.
              </p>
            </section>

            <section id="changes-cancellations">
              <h2>Changing or cancelling a booking</h2>
              <p>
                If you have an account, you can cancel any upcoming booking yourself from{' '}
                <a href="/account">My Account</a>, free of charge, at any time before the appointment. If you
                booked as a guest, please contact us by phone to cancel or change your booking.
              </p>
              <p>
                We may occasionally need to reschedule or cancel a booking ourselves — for example, if the clinic
                is unexpectedly closed, or a practitioner is unavailable. If we do, we'll always contact you by
                email with the reason and, where possible, offer you a new time.
              </p>
            </section>

            <section id="right-to-cancel">
              <h2>Your legal right to cancel</h2>
              <p>
                Because a booking made through this website is a contract agreed at a distance, UK law (the
                Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013) gives you
                the right to cancel it, without giving a reason, within 14 days of booking. As we don't take any
                payment through this website, exercising this right works exactly the same as cancelling any
                other booking under the section above — free, with nothing to refund.
              </p>
              <p>
                If your appointment is scheduled to take place within that 14-day period, confirming your booking
                counts as your express request for us to go ahead with it sooner — this doesn't take away your
                right to cancel free of charge at any point before the appointment itself.
              </p>
            </section>

            <section id="payment">
              <h2>Pricing and payment</h2>
              <p>
                This website does not take any payment. Consultations and treatments are paid for in person, at
                the clinic, using whatever methods the clinic accepts at the time.
              </p>
              <p>
                Prices shown on our <a href="/pricing">Treatments &amp; Pricing</a> page are a guide to help you
                plan, and may change from time to time. The price that applies to you will always be confirmed
                with you at your consultation, before any treatment goes ahead.
              </p>
            </section>

            <section id="missed-appointments">
              <h2>Missed appointments</h2>
              <p>
                We don't currently charge a fee for a cancelled or missed appointment. We simply ask for as much
                notice as possible if you can no longer make it, so we can offer the slot to someone else. We
                reserve the right to introduce a deposit or cancellation charge for future bookings if
                appointments are repeatedly missed without notice.
              </p>
            </section>

            <section id="treatment-suitability">
              <h2>Treatment suitability</h2>
              <p>
                Booking a consultation reserves you time with the clinic — it isn't a guarantee that any specific
                treatment will go ahead. Whether a treatment is right for you is always assessed in person, at
                your consultation, by a qualified member of our team, taking into account your health, medical
                history and goals.
              </p>
              <p>
                Some treatments (for example, GLP-1 weight loss consultations) involve prescription-only
                medication. Where that applies, any prescription is only ever issued following a proper clinical
                assessment by an appropriately qualified prescriber, in line with UK law — never based on the
                booking form alone.
              </p>
              <p>
                Full details of your treatment, its risks, aftercare and your consent to proceed are covered
                separately, in person, before any treatment — not by these website terms.
              </p>
            </section>

            <section id="accounts">
              <h2>Your account</h2>
              <p>
                If you create an account, you're responsible for keeping your password confidential and for
                anything that happens under your account. Let us know straight away if you think someone else has
                access to it.
              </p>
              <p>
                We may suspend or close an account that we reasonably believe is being misused, or that's been
                inactive for a very long time. You can ask us to close your account and delete your data at any
                time — see our <a href="/privacy-policy#how-long">Privacy Policy</a> for how long we need to keep
                certain records regardless.
              </p>
            </section>

            <section id="intellectual-property">
              <h2>Intellectual property</h2>
              <p>
                Everything on this website — text, photos, our logo and branding — belongs to us or to whoever
                licensed it to us, and is protected by copyright and other intellectual property law. You're
                welcome to view and share pages of this site for your own personal, non-commercial use, but you
                may not copy, reproduce or reuse our content, images or branding for any other purpose without our
                written permission.
              </p>
            </section>

            <section id="liability">
              <h2>Our liability to you</h2>
              <p>
                Nothing in these terms limits or excludes our liability for death or personal injury caused by our
                negligence, for fraud or fraudulent misrepresentation, or for anything else that can't lawfully be
                limited or excluded under English law.
              </p>
              <p>
                Subject to that, we provide this website "as is" and, to the extent the law allows, we aren't
                liable for any indirect or consequential loss arising from your use of it (for example, loss of
                time or opportunity from a technical fault with the booking calendar) — though we'll always do our
                best to put things right. This doesn't affect your statutory rights as a consumer, including your
                right to a service performed with reasonable care and skill under the Consumer Rights Act 2015.
              </p>
            </section>

            <section id="law">
              <h2>Governing law</h2>
              <p>
                These terms are governed by the law of England and Wales. If a dispute can't be resolved between
                us directly, the courts of England and Wales will have jurisdiction — though if you live elsewhere
                in the UK, you may also be able to bring proceedings in your local courts.
              </p>
            </section>

            <section id="changes">
              <h2>Changes to these terms</h2>
              <p>
                We may update these terms from time to time, for example if we change how bookings work or the
                law changes. The date at the top of this page shows when it was last updated. This version was
                last updated on {LAST_UPDATED}.
              </p>
            </section>

            <section id="contact">
              <h2>Contact us</h2>
              <p>Questions about these terms, or about a booking, are always welcome:</p>
              <p>
                {COMPANY_NAME} (trading as La Derma Aesthetic Clinic)<br />
                {REGISTERED_OFFICE}<br />
                Telephone: <a href={CLINIC_PHONE_HREF}>{CLINIC_PHONE}</a>
              </p>
            </section>
          </article>
        </div>
      </section>
    </>
  );
}
