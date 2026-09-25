import { NavLink } from 'react-router-dom';
import IntroHero from '../components/IntroHero';
import './About.css';

const PHILOSOPHY = [
  { num: '01', title: 'Medical led precision', desc: 'Every treatment is approached with a strong understanding of skin biology, safety, and evidence based decision making.' },
  { num: '02', title: 'Refined results', desc: 'La Derma prioritises elegant, natural looking outcomes that enhance confidence without compromising individuality.' },
  { num: '03', title: 'Personalised care', desc: 'Consultations are shaped around your concerns, your features, and a plan that feels appropriate for your goals.' },
  { num: '04', title: 'Premium standards', desc: 'From hygiene and professionalism to aftercare and comfort, each detail is handled to a high clinical standard.' },
];

const STORY_POINTS = [
  'Bachelor of Science background with over 4 years of experience',
  'Advanced treatments including PRP, Exosomes, Mesotherapy, Endolift, and Fractional Laser',
  'Natural, refined, and long lasting results over trend driven overcorrection',
  "Personalised treatment plans tailored to each client's skin and goals",
  'High standards of hygiene, safety, and professionalism',
  'A luxury, comfortable, and private clinic experience',
];

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  );
}

export default function About() {
  return (
    <>
      <IntroHero
        badge="Founder led expertise"
        eyebrow="About La Derma"
        title="Science led aesthetics with a personal standard of care."
        lede="At La Derma Aesthetic Clinic, we combine medical expertise with advanced aesthetic technology to deliver high end, result driven treatments. The clinic is built for clients seeking premium aesthetic treatments with careful planning, honest guidance, and refined results that look naturally well considered."
      />

      {/* Credential strip */}
      <div className="stat-strip">
        <div className="container">
          <div className="stat">
            <p className="stat-num">4+ years</p>
            <p className="stat-label">Aesthetic experience</p>
          </div>
          <div className="stat">
            <p className="stat-num">Bachelor</p>
            <p className="stat-label">Science</p>
          </div>
          <div className="stat">
            <p className="stat-num">Advanced</p>
            <p className="stat-label">Treatment approach</p>
          </div>
        </div>
      </div>

      {/* Founder intro */}
      <div className="container">
        <div className="founder-intro">
          <div>
            <p className="founder-eyebrow">Meet the founder</p>
            <h2 className="founder-name">Dalia Shahrour</h2>
            <p className="founder-role">Founder of La Derma Aesthetic Clinic</p>
          </div>
        </div>
      </div>

      {/* What defines La Derma */}
      <section style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <p className="section-eyebrow">What defines La Derma</p>
          <p className="section-desc" style={{ marginTop: 12 }}>Premium care here means personalised treatment planning, advanced techniques, and a commitment to natural, refined, and long lasting results delivered with professionalism and discretion.</p>
        </div>
      </section>

      {/* Philosophy */}
      <section>
        <div className="container">
          <div style={{ maxWidth: '640px' }}>
            <p className="section-eyebrow">Our philosophy</p>
            <h2 className="section-title">A clinic created for clients who expect more than basic beauty services.</h2>
            <p className="section-desc">La Derma is designed for clients who want premium aesthetic treatments supported by clinical understanding, advanced technology, and a treatment experience that feels both elevated and safe.</p>
          </div>

          <div className="philosophy-grid">
            {PHILOSOPHY.map((p) => (
              <article className="philosophy-card" key={p.num}>
                <div className="philosophy-top">
                  <p className="philosophy-num">{p.num}</p>
                  <span className="philosophy-tag">La Derma</span>
                </div>
                <h3 className="philosophy-title">{p.title}</h3>
                <p className="philosophy-desc">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Founder story */}
      <section className="story-section">
        <div className="container">
          <p className="section-eyebrow">A bit about Dalia</p>
          <h2 className="section-title" style={{ maxWidth: '32rem' }}>The background and approach behind every consultation.</h2>

          <div className="story-grid">
            <div className="story-body">
              <p>Dalia Shahrour founded La Derma with a clear vision: to offer premium aesthetic care grounded in science, precision, and personalised attention. Her Bachelor of Science background gives every treatment plan a strong understanding of skin biology, treatment safety, and the importance of long term skin health.</p>
              <p>With more than four years of hands on experience in aesthetics, Dalia approaches each consultation with care, honesty, and a commitment to refined outcomes. Her focus is not on over treatment, but on helping every client achieve natural looking improvements that feel elegant, balanced, and confidence boosting.</p>
            </div>
            <ul className="story-list">
              {STORY_POINTS.map((point) => (
                <li key={point}>
                  <span className="story-list-icon"><CheckIcon /></span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Advanced treatments */}
      <section>
        <div className="container advanced-grid">
          <div>
            <p className="section-eyebrow">Advanced treatments</p>
            <h2 className="section-title" style={{ maxWidth: '26rem' }}>Thoughtful treatment planning across advanced regenerative and contour focused care.</h2>
            <p className="section-desc" style={{ maxWidth: '38rem' }}>Alongside established injectable and skin focused services, La Derma offers advanced treatments such as PRP, Exosomes, Mesotherapy, Endolift, and Fractional Laser. Each option is recommended selectively, based on suitability, desired results, and a plan tailored to the individual rather than a trend.</p>
            <div className="advanced-actions">
              <NavLink to="/pricing" className="btn btn-gold btn-gold-lg">Review Pricing</NavLink>
              <NavLink to="/gallery" className="btn btn-outline">View Gallery</NavLink>
            </div>
          </div>

          <div className="advanced-panel">
            <p className="advanced-panel-label">Advanced options</p>
            <ul>
              <li>PRP</li>
              <li>Exosomes</li>
              <li>Mesotherapy</li>
              <li>Endolift</li>
              <li>Fractional Laser</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
