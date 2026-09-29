import { NavLink } from 'react-router-dom';
import FadeImage from '../components/FadeImage';
import { IMAGES } from '../data/siteData';
import { useSeo } from '../hooks/useSeo';
import './Home.css';

const SERVICES = [
  {
    num: '01',
    tag: 'Smoother skin',
    title: 'Laser Hair Treatment',
    desc: 'Advanced laser protocols designed for smoother skin, dependable hair reduction, and a treatment journey tailored to comfort, skin tone, and long term results.',
  },
  {
    num: '02',
    tag: 'Visible lift',
    title: 'Endolift',
    desc: 'A precision led lifting treatment focused on firmer definition, sharper contours, and visible refinement for clients seeking minimally invasive facial rejuvenation.',
  },
  {
    num: '03',
    tag: 'Natural balance',
    title: 'Fillers',
    desc: 'Balanced filler treatments created to restore support, refine proportions, and enhance facial harmony while preserving a natural looking finish.',
  },
  {
    num: '04',
    tag: 'Refreshed finish',
    title: 'Anti-Wrinkle',
    desc: 'Targeted anti wrinkle treatment planned with care to soften expression lines, maintain movement, and deliver a fresher, well rested appearance.',
  },
];

const ABOUT_CHECKS = [
  'Personalised treatment plans shaped around your goals',
  'Clinically led care with precise technique and attention to detail',
  'Premium aftercare designed to support comfort and confidence',
  'Natural looking results that prioritise balance and client satisfaction',
];

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  );
}

export default function Home() {
  useSeo({
    title: 'Gateshead Aesthetic Clinic',
    description: 'La Derma Aesthetic Clinic in Gateshead offers laser hair removal, Endolift, dermal fillers and anti-wrinkle treatments, with personalised consultations and refined, natural looking results.',
    path: '/',
  });

  return (
    <>
      {/* Hero */}
      <section className="hero" style={{ padding: 0 }}>
        <div className="hero-bg" />
        <div className="container hero-inner">
          <div>
            <div className="hero-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                <path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path>
              </svg>
              Results led aesthetic care
            </div>

            <p className="hero-eyebrow" style={{ marginTop: 24 }}>La Derma Aesthetic Clinic</p>
            <h1 className="hero-title">Expert aesthetic treatments designed for refined, natural looking results.</h1>
            <p className="hero-lede">La Derma combines careful assessment, advanced treatment planning, and premium aftercare across laser hair treatment, Endolift, fillers, and Botox to help every client feel confident in their results.</p>

            <div className="hero-actions">
              <NavLink to="/booking" className="btn btn-gold btn-gold-lg">Book Consultation</NavLink>
              <NavLink to="/gallery" className="btn btn-outline">View Gallery</NavLink>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <p className="hero-stat-num">4</p>
                <p className="hero-stat-label">Signature treatments</p>
              </div>
              <div className="hero-stat">
                <p className="hero-stat-num">Tailored</p>
                <p className="hero-stat-label">Treatment planning</p>
              </div>
              <div className="hero-stat">
                <p className="hero-stat-num">Results led</p>
                <p className="hero-stat-label">Care approach</p>
              </div>
            </div>
          </div>

          <div className="hero-media">
            <div className="hero-media-grid">
              <div className="hero-photo-main">
                <FadeImage src={IMAGES.heroMain} alt="La Derma founder standing beneath the gold La Derma sign at reception" />
              </div>
              <div className="hero-sidecards">
                <div className="hero-card">
                  <p className="hero-card-eyebrow">Trusted treatment planning</p>
                  <p className="hero-card-title">Every treatment journey begins with clarity, expertise, and a focus on results that still feel like you.</p>
                </div>
                <div className="hero-card-dark">
                  <p className="hero-card-eyebrow">Service promise</p>
                  <p>From consultation to aftercare, the experience is shaped around safety, precision, and client confidence so your results feel considered at every stage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services overview */}
      <section>
        <div className="container">
          <div style={{ maxWidth: '640px' }}>
            <p className="section-eyebrow">Services overview</p>
            <h2 className="section-title">Treatments chosen for visible improvement, balanced outcomes, and confident long term care.</h2>
            <p className="section-desc">Each service is presented with a results first perspective, helping visitors understand the quality of care, the level of refinement, and the personalised planning behind every recommendation.</p>
          </div>

          <div className="services-grid">
            {SERVICES.map((s) => (
              <article className="service-card" key={s.num}>
                <div className="service-top">
                  <p className="service-num">{s.num}</p>
                  <span className="service-tag">{s.tag}</span>
                </div>
                <h3 className="service-title">{s.title}</h3>
                <p className="service-desc">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* About the clinic */}
      <section className="about-section">
        <div className="about-bg">
          <FadeImage src={IMAGES.aboutBg} alt="Abstract brand artwork" fill />
        </div>
        <div className="container about-grid">
          <div className="about-photo">
            <FadeImage src={IMAGES.treatmentRoom} alt="La Derma treatment room with treatment bed and seating" fill />
          </div>
          <div>
            <p className="section-eyebrow">About the clinic</p>
            <h2 className="section-title" style={{ maxWidth: '32rem' }}>Results matter more when they are delivered with precision, honesty, and individual care.</h2>
            <p className="section-desc" style={{ maxWidth: '38rem' }}>La Derma is positioned around thoughtful treatment planning, natural looking outcomes, and a premium standard of service that helps clients feel informed, supported, and well looked after from first enquiry to review.</p>

            <div className="about-checks">
              {ABOUT_CHECKS.map((c) => (
                <div className="about-check" key={c}>
                  <span className="about-check-icon"><CheckIcon /></span>
                  <p>{c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="reviews-section">
        <div className="container">
          <div className="reviews-head">
            <p className="section-eyebrow">What clients say</p>
            <h2 className="section-title" style={{ maxWidth: '30rem' }}>Real experiences from La Derma clients.</h2>
            <p className="section-desc" style={{ maxWidth: '38rem' }}>We're building our collection of client reviews — read the latest on Google and Facebook, or leave your own after your visit.</p>
          </div>

          <div className="reviews-links">
            <a href="https://www.facebook.com/p/La-Derma-Aesthetic-Clinic-100085383892345/" target="_blank" rel="noreferrer" className="reviews-link-card">
              <span className="reviews-link-label">Facebook</span>
              <span className="reviews-link-cta">Read reviews →</span>
            </a>
            <a href="https://www.google.com/search?q=La+Derma+Aesthetic+Clinic+reviews" target="_blank" rel="noreferrer" className="reviews-link-card">
              <span className="reviews-link-label">Google</span>
              <span className="reviews-link-cta">Read reviews →</span>
            </a>
          </div>
        </div>
      </section>

      {/* Booking invitation */}
      <section>
        <div className="container booking-grid">
          <div>
            <p className="section-eyebrow">Booking invitation</p>
            <h2 className="section-title" style={{ maxWidth: '30rem' }}>Start with a consultation shaped around your goals, your features, and the result you want to achieve.</h2>
            <p className="section-desc" style={{ maxWidth: '38rem' }}>The next step is a personalised discussion of suitability, treatment options, and expected outcomes.</p>
            <div className="booking-actions">
              <NavLink to="/booking" className="btn btn-gold btn-gold-lg">Book Consultation</NavLink>
              <NavLink to="/pricing" className="btn btn-outline">Review Pricing</NavLink>
            </div>
          </div>

          <div className="booking-photo-wrap">
            <div className="booking-photo-inner">
              <FadeImage src={IMAGES.bookingPhoto} alt="La Derma waiting area with mirror and gold La Derma sign" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
