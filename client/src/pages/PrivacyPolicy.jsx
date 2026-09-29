import IntroHero from '../components/IntroHero';
import { CLINIC_PHONE, CLINIC_PHONE_HREF } from '../data/siteData';
import { useSeo } from '../hooks/useSeo';
import './LegalPage.css';

const LAST_UPDATED = '24 September 2026';

const REGISTERED_OFFICE = '19 Jackson Street, Gateshead, United Kingdom, NE8 1EE';
const COMPANY_NAME = 'La Derma Aesthetic Ltd';
const COMPANY_NUMBER = '16745176';

const SECTIONS = [
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'what-we-collect', label: 'What personal data we collect' },
  { id: 'health-data', label: 'Health information' },
  { id: 'how-we-use-it', label: 'How we use it, and our legal basis' },
  { id: 'who-we-share-with', label: 'Who we share it with' },
  { id: 'international-transfers', label: 'International transfers' },
  { id: 'how-long', label: 'How long we keep it' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'automated-decisions', label: 'Automated decisions' },
  { id: 'children', label: "Children's data" },
  { id: 'complaints', label: 'How to complain' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
];

export default function PrivacyPolicy() {
  useSeo({
    title: 'Privacy Policy',
    description: 'How La Derma Aesthetic Clinic collects, uses and protects your personal data, in line with UK GDPR.',
    path: '/privacy-policy',
  });

  return (
    <>
      <IntroHero
        badge="Legal"
        eyebrow="Privacy policy"
        title="How La Derma looks after your personal data."
        lede={`This explains what information we collect when you use this website or book a consultation, why, and what rights you have over it. Last updated ${LAST_UPDATED}.`}
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container privacy-wrap">
          <nav className="privacy-toc" aria-label="Sections of this policy">
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
                This website and booking service is operated by <strong>{COMPANY_NAME}</strong>, a company
                registered in England and Wales under company number <strong>{COMPANY_NUMBER}</strong>, whose
                registered office is at {REGISTERED_OFFICE}. We trade as <strong>La Derma Aesthetic Clinic</strong>.
              </p>
              <p>
                In this policy, "La Derma", "we", "us" and "our" mean La Derma Aesthetic Ltd. We are the{' '}
                <strong>data controller</strong> for the personal data described below — the organisation that
                decides why and how it's used.
              </p>
            </section>

            <section id="what-we-collect">
              <h2>What personal data we collect</h2>
              <p>We only collect what we need to run the booking service and, if you choose to create one, your account:</p>
              <ul>
                <li>
                  <strong>When you book a consultation</strong> (with or without an account): your full name,
                  email address, phone number, the treatment you're interested in, and any notes you choose to add.
                </li>
                <li>
                  <strong>If you create an account:</strong> the details above, plus a password. Your password is
                  never stored in readable form — only a one-way cryptographic hash of it, which can't be reversed
                  back into your actual password, even by us.
                </li>
                <li>
                  <strong>Automatically, while you're signed in:</strong> a session cookie that keeps you logged
                  in (see <a href="#cookies">Cookies</a> below).
                </li>
                <li>
                  <strong>Briefly, for security:</strong> if a sign-in is attempted repeatedly with the wrong
                  password, we note the IP address and a count of attempts for up to 10 minutes, purely to slow
                  down automated guessing. This isn't linked to your account and isn't kept any longer than that.
                </li>
              </ul>
              <p>
                We do <strong>not</strong> collect or store any payment card or banking details through this
                website — consultations are paid for in person at the clinic, not online.
              </p>
            </section>

            <section id="health-data">
              <h2>Health information</h2>
              <p>
                Some of our consultations (for example, anti-wrinkle, dermal filler, or GLP-1 weight loss) may
                involve you sharing information about your health, medical history, or current medication —
                whether in the notes field when booking, or in person during your consultation. Under UK GDPR,
                this counts as <strong>special category data</strong>, which the law treats with extra care.
              </p>
              <p>
                Where you share health information with us, we handle it on the basis that it's necessary for the
                provision of health or aesthetic care by, or under the responsibility of, a professional subject
                to a duty of confidentiality (UK GDPR Article 9(2)(h)), and/or because you've explicitly given it
                to us for that purpose (Article 9(2)(a)). We only use it to assess your suitability for a
                treatment and to plan your care safely — never for marketing, and we don't share it beyond what's
                described in <a href="#who-we-share-with">Who we share it with</a>.
              </p>
            </section>

            <section id="how-we-use-it">
              <h2>How we use it, and our legal basis</h2>
              <p>UK GDPR requires us to have a valid legal reason ("lawful basis") for everything we do with your data. Here's what we use yours for, and which basis applies:</p>
              <table className="privacy-table">
                <thead>
                  <tr><th>What we do</th><th>Why (lawful basis)</th></tr>
                </thead>
                <tbody>
                  <tr><td>Create and manage your booking</td><td>Performance of a contract with you</td></tr>
                  <tr><td>Create and manage your account, if you register</td><td>Performance of a contract with you</td></tr>
                  <tr><td>Send you confirmation, reschedule and cancellation emails about your bookings</td><td>Performance of a contract with you</td></tr>
                  <tr><td>Let you reset your password if you request it</td><td>Performance of a contract with you; our legitimate interest in keeping your account secure</td></tr>
                  <tr><td>Slow down repeated failed sign-in attempts</td><td>Our legitimate interest in keeping the service secure for everyone</td></tr>
                  <tr><td>Assess suitability and plan safe treatment, including any health information you share</td><td>Provision of health/aesthetic care under professional confidentiality; your explicit sharing of that information (see <a href="#health-data">Health information</a>)</td></tr>
                  <tr><td>Keep business, accounting and insurance records</td><td>Compliance with our legal obligations</td></tr>
                </tbody>
              </table>
              <p>We don't use your data for marketing emails or texts unless you separately ask us to, and we don't sell it to anyone, ever.</p>
            </section>

            <section id="who-we-share-with">
              <h2>Who we share it with</h2>
              <p>We use a small number of trusted service providers to run the booking system. Each only receives what it needs to do its specific job:</p>
              <ul>
                <li><strong>Google Calendar</strong> (Google) — to check appointment availability and store the confirmed appointment itself.</li>
                <li><strong>Brevo</strong> — to send your booking confirmation, cancellation and reschedule emails on our behalf.</li>
                <li><strong>Resend</strong> — to notify the clinic's own inbox that a new booking has come in.</li>
                <li><strong>Turso</strong> — our database provider, which securely stores your account details and which bookings belong to it.</li>
              </ul>
              <p>
                These providers act as our <strong>processors</strong>: they only handle your data under our
                instructions and to provide their specific service, never for their own purposes. We don't share
                your data with anyone else, and we never sell it.
              </p>
              <p>
                If required by law — for example, a court order, or to protect someone's safety — we may need to
                share limited information with the police or another authority.
              </p>
            </section>

            <section id="international-transfers">
              <h2>International transfers</h2>
              <p>
                Some of the providers above may process data outside the UK — for instance, on servers located in
                the United States. Where that happens, we rely on legally recognised safeguards to keep your data
                protected to UK standards, such as the UK International Data Transfer Addendum, Standard
                Contractual Clauses, or the provider's own certified compliance framework (e.g. the EU-U.S. Data
                Privacy Framework, where applicable).
              </p>
            </section>

            <section id="how-long">
              <h2>How long we keep it</h2>
              <ul>
                <li>
                  <strong>Booking and consultation records</strong> (whether or not you have an account): we keep
                  these for up to <strong>7 years</strong> after your last appointment, in line with our
                  insurance, accounting and professional record-keeping obligations, after which they're deleted
                  or anonymised.
                </li>
                <li>
                  <strong>Account details:</strong> kept for as long as your account is active. If you'd like your
                  account closed and your data deleted sooner (subject to the record-keeping obligations above),
                  contact us — see <a href="#contact">Contact us</a>.
                </li>
                <li>
                  <strong>Password reset links:</strong> expire automatically after 1 hour, and can only ever be
                  used once.
                </li>
                <li>
                  <strong>Failed sign-in attempt records:</strong> held only in server memory (never written to a
                  database), and cleared automatically after 10 minutes or on server restart.
                </li>
              </ul>
            </section>

            <section id="cookies">
              <h2>Cookies</h2>
              <p>
                We only use cookies (and equivalent browser storage) that are <strong>strictly necessary</strong>{' '}
                to make the site work. We don't use any analytics, advertising or tracking cookies, and nothing on
                this site tracks you across other websites.
              </p>
              <table className="privacy-table">
                <thead>
                  <tr><th>Name</th><th>Purpose</th><th>Lasts for</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>laderma.sid</code></td><td>Keeps a signed-in staff member logged in to the admin dashboard</td><td>Up to ~12 minutes of inactivity</td></tr>
                  <tr><td><code>laderma.client.sid</code></td><td>Keeps you signed in to your account</td><td>Up to ~12 minutes of inactivity</td></tr>
                  <tr><td><code>laderma.cookie-consent</code></td><td>Remembers the cookie choice you made, so we don't ask again on every visit (stored in your browser, not a cookie sent to our server)</td><td>Until you clear your browser's site data</td></tr>
                </tbody>
              </table>
              <p>
                Because these are all strictly necessary for the site to function, the law doesn't require us to
                ask your permission to use them — but we still show a cookie notice on your first visit so you
                always know what's being used and why.
              </p>
            </section>

            <section id="your-rights">
              <h2>Your rights</h2>
              <p>Under UK GDPR, you have the right to:</p>
              <ul>
                <li><strong>Access</strong> the personal data we hold about you.</li>
                <li><strong>Correct</strong> it, if it's inaccurate or incomplete.</li>
                <li><strong>Erase</strong> it, in some circumstances.</li>
                <li><strong>Restrict</strong> or <strong>object to</strong> how we use it, in some circumstances.</li>
                <li><strong>Receive a copy</strong> of it in a portable format, or ask us to send it directly to another organisation.</li>
                <li><strong>Withdraw consent</strong> at any time, where we're relying on your consent (for example, for health information you've chosen to share) — this won't affect anything we did before you withdrew it.</li>
              </ul>
              <p>
                To use any of these rights, contact us using the details in <a href="#contact">Contact us</a>. We'll
                respond within one month, as required by law. There's no charge for this unless your request is
                unfounded or excessive.
              </p>
            </section>

            <section id="automated-decisions">
              <h2>Automated decisions</h2>
              <p>
                We don't use your personal data for any automated decision-making or profiling that has a legal or
                similarly significant effect on you. Appointment availability is calculated automatically from the
                clinic's calendar, but every booking, cancellation and reschedule is something you actively choose
                to do.
              </p>
            </section>

            <section id="children">
              <h2>Children's data</h2>
              <p>
                Our treatments and this website are intended for adults. We don't knowingly collect personal data
                from children, and if we become aware that we've done so, we'll delete it.
              </p>
            </section>

            <section id="complaints">
              <h2>How to complain</h2>
              <p>
                If you're unhappy with how we've handled your personal data, please tell us first, using the
                details in <a href="#contact">Contact us</a> — we take this seriously and would like the chance to
                put it right. We'll acknowledge your complaint within 30 days and investigate without undue delay.
              </p>
              <p>
                You also have the right to complain directly to the UK's data protection regulator at any time:
              </p>
              <p>
                Information Commissioner's Office (ICO)<br />
                Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF<br />
                Telephone: 0303 123 1113<br />
                Website: <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>
              </p>
            </section>

            <section id="changes">
              <h2>Changes to this policy</h2>
              <p>
                We may update this policy from time to time — for example, if we start using a new service
                provider, or the law changes. The date at the top of this page shows when it was last updated.
                This version was last updated on {LAST_UPDATED}.
              </p>
            </section>

            <section id="contact">
              <h2>Contact us</h2>
              <p>
                For anything in this policy, or to exercise any of your rights, get in touch:
              </p>
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
