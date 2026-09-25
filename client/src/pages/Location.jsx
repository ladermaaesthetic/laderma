import IntroHero from '../components/IntroHero';
import { CLINIC_ADDRESS } from '../data/siteData';
import './Location.css';

function PinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DirectionsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8-8 18-2-8-8-2Z" />
    </svg>
  );
}

// Real, nearby car parks worth knowing about before a visit — the same
// building's other tenants have been pointing clients to these for years,
// so it's genuinely useful info, not just decoration. Each links to a real,
// live Google Maps search for that car park (same URL pattern as
// CLINIC_ADDRESS.googleMapsUrl) rather than a static image, so it's always
// accurate and clients can get live directions from wherever they are.
const CAR_PARKS = [
  {
    name: 'Jackson Street Car Park',
    note: 'Behind the dental surgery — the cheapest option nearby. Download the RingGo app to pay and park.',
    mapsQuery: 'Jackson Street Car Park, Gateshead',
  },
  {
    name: 'Trinity Square Car Park',
    note: 'Gateshead',
    mapsQuery: 'Trinity Square Car Park, Gateshead',
  },
  {
    name: 'Charles Street Short Stay Car Park',
    note: null,
    mapsQuery: 'Charles Street Short Stay Car Park, Gateshead',
  },
];

function mapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function Location() {
  return (
    <>
      <IntroHero
        badge="Find us"
        eyebrow="Location"
        title="Visit La Derma Aesthetic Clinic."
        lede="Our clinic is based in Gateshead, easily reached from across Newcastle and the wider North East. Get directions below or reach out ahead of your visit."
      />

      <section style={{ paddingTop: 0 }}>
        <div className="container location-grid">
          <div className="location-panel">
            <p className="location-panel-label">Clinic address</p>
            <div className="location-address">
              <span className="location-address-icon"><PinIcon /></span>
              <div>
                <p className="location-address-line">{CLINIC_ADDRESS.line1}</p>
                <p className="location-address-line">{CLINIC_ADDRESS.city}, {CLINIC_ADDRESS.postcode}</p>
              </div>
            </div>

            <a
              className="btn btn-gold btn-gold-lg location-directions-btn"
              href={CLINIC_ADDRESS.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              <DirectionsIcon />
              Get Directions
            </a>

            <div className="location-note">
              <p className="location-note-title">Planning your visit</p>
              <p>
                For opening hours or to check parking and access before you come, please get
                in touch with the clinic directly and we'll be happy to help — or book a
                consultation online and we'll confirm all the details with you.
              </p>
            </div>
          </div>

          <div className="location-map">
            <iframe
              title="La Derma Aesthetic Clinic location"
              src={CLINIC_ADDRESS.googleMapsEmbedSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="howtofind-section">
        <div className="container howtofind-grid">
          <div className="howtofind-photo-wrap">
            <img
              src="/location/clinic-entrance.webp"
              alt="Street-level entrance to La Derma Aesthetic Clinic, next to a lamp post with a blue One Way sign"
              className="howtofind-photo"
            />
          </div>

          <div>
            <p className="section-eyebrow">How to find us</p>
            <h2 className="section-title">Finding our first-floor entrance.</h2>
            <p className="section-desc">
              We're upstairs, above the street-level shops — here's exactly what to look out for.
            </p>

            <ol className="howtofind-steps">
              <li>
                <span className="howtofind-step-num">1</span>
                <p>Look for our entrance between <strong>Savers</strong> and <strong>Creative Studio Tattoo</strong> — you'll spot a blue "One Way" sign on the lamp post right in front of the door.</p>
              </li>
              <li>
                <span className="howtofind-step-num">2</span>
                <p>Go through the <strong>red double door</strong> at street level.</p>
              </li>
              <li>
                <span className="howtofind-step-num">3</span>
                <p>Head <strong>upstairs to the first floor</strong>.</p>
              </li>
              <li>
                <span className="howtofind-step-num">4</span>
                <p>Look for <strong>Offices 1, 2 and 3</strong> — or simply follow our <strong>La Derma sign</strong>.</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="carparking-section">
        <div className="container">
          <p className="section-eyebrow">Car parking</p>
          <h2 className="section-title">Nearby places to park.</h2>
          <p className="section-desc" style={{ marginBottom: 8 }}>
            A few options within easy walking distance of the clinic.
          </p>

          <div className="carparking-list">
            {CAR_PARKS.map((park) => (
              <div className="carparking-row" key={park.name}>
                <span className="location-address-icon carparking-icon"><PinIcon /></span>
                <div className="carparking-body">
                  <p className="carparking-name">{park.name}</p>
                  {park.note && <p className="carparking-note">{park.note}</p>}
                </div>
                <a
                  className="carparking-directions"
                  href={mapsSearchUrl(park.mapsQuery)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DirectionsIcon />
                  Directions
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
