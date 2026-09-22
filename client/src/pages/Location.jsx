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
    </>
  );
}
