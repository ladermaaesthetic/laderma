import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import IntroHero from '../components/IntroHero';
import './Reviews.css';

// Real client reviews, sourced from La Derma Aesthetic Clinic's Google
// Business Profile (5.0 average, 25 reviews at time of writing). Kept
// verbatim/near-verbatim to the reviewer's own words.
const REVIEWS = [
  {
    name: 'Sanaa Ali',
    meta: 'Local Guide · 216 reviews',
    rating: 5,
    text: "I've been going to this clinic for three years because it's excellent. It offers everything my body and face need in terms of care, and Dr. Dalia is wonderful and highly skilled in her work, performing it with precision, expertise, and integrity. She's also constantly improving. I've tried everything and I absolutely love it. I can't imagine going anywhere else.",
  },
  {
    name: 'Julia Kallas',
    meta: 'Google review',
    rating: 5,
    text: 'I had a really positive experience at La Derma clinic. The staff were so friendly and welcoming. The consultation was very detailed, and they took the time to explain everything clearly while giving honest advice tailored to my skin concerns.',
  },
  {
    name: 'Dana Alsuweiti',
    meta: 'Google review',
    rating: 5,
    text: 'I had Mesotherapy done to my face. Such a wonderful therapist — just by one session and my acne reduced by 70%. Highly recommended.',
  },
  {
    name: 'Nour Alhaj Mohammad',
    meta: 'Google review',
    rating: 5,
    text: "I had an appointment yesterday, it was an adorable experience for me. The staff were friendly and kind. I'll definitely visit again.",
  },
  {
    name: 'A.',
    meta: 'Google review',
    rating: 5,
    text: 'Thank you La Derma Aesthetic Clinic for the great service. I had under-eye and full-face injections, and special thanks to Dr. Dalia for her amazing care.',
  },
];

function StarRow({ rating }) {
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.8 7.1-.7z" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [paused, setPaused] = useState(false);
  // Duplicate the list so the CSS marquee can scroll seamlessly from the
  // end straight back into the start with no visible jump/reset.
  const track = [...REVIEWS, ...REVIEWS];

  return (
    <>
      <IntroHero
        badge="5.0 on Google"
        eyebrow="Reviews"
        title="What clients say about La Derma."
        lede="Real feedback from real clients, straight from our Google Business Profile — 5.0 out of 5 across 25 reviews at the time of writing."
      />

      <section style={{ paddingTop: 0 }}>
        <div
          className={`reviews-carousel${paused ? ' paused' : ''}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused((v) => !v)}
        >
          <div className="reviews-track">
            {track.map((review, i) => (
              <article className="review-card" key={`${review.name}-${i}`}>
                <StarRow rating={review.rating} />
                <p className="review-text">&ldquo;{review.text}&rdquo;</p>
                <div className="review-footer">
                  <p className="review-name">{review.name}</p>
                  <p className="review-meta">{review.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="reviews-hint">Hover to pause and read — tap to pause on mobile.</p>
      </section>

      <section className="reviews-cta-band">
        <div className="container reviews-cta-inner">
          <div>
            <p className="section-eyebrow" style={{ color: 'rgba(255,240,212,0.82)' }}>Join our clients</p>
            <h2 className="section-title" style={{ color: '#F6EFE2' }}>Ready to experience La Derma for yourself?</h2>
          </div>
          <NavLink className="btn btn-gold btn-gold-lg" to="/booking">Book a Consultation</NavLink>
        </div>
      </section>
    </>
  );
}
