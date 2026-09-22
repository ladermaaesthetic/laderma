import { NavLink } from 'react-router-dom';
import {
  LOGO_URL,
  CLINIC_ADDRESS,
  CLINIC_PHONE,
  CLINIC_PHONE_HREF,
  SOCIAL_LINKS,
  FOOTER_COMPANY_LINKS,
  FOOTER_EXPLORE_LINKS,
} from '../data/siteData';
import './Footer.css';

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.49 17.52 2 12 2S2 6.49 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand-col">
          <NavLink to="/" className="footer-brand">
            <span className="footer-brand-logo">
              <img src={LOGO_URL} alt="La Derma Aesthetic Clinic logo" />
            </span>
            <div>
              <p className="footer-brand-eyebrow">Results led aesthetic care</p>
              <p className="footer-brand-name">La Derma</p>
            </div>
          </NavLink>

          <div className="footer-contact">
            <a href={CLINIC_ADDRESS.googleMapsUrl} target="_blank" rel="noreferrer">
              {CLINIC_ADDRESS.line1}, {CLINIC_ADDRESS.city} {CLINIC_ADDRESS.postcode}
            </a>
            <a href={CLINIC_PHONE_HREF}>{CLINIC_PHONE}</a>
          </div>

          <div className="footer-social">
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="La Derma Aesthetic Clinic on Facebook"
              className="footer-social-icon"
            >
              <FacebookIcon />
            </a>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="La Derma Aesthetic Clinic on Instagram"
              className="footer-social-icon"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        <div className="footer-nav-block">
          <p className="footer-label">Company</p>
          <div className="footer-nav">
            {FOOTER_COMPANY_LINKS.map((link) => (
              <NavLink key={link.href} to={link.href} end={link.href === '/'}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="footer-nav-block">
          <p className="footer-label">Explore</p>
          <div className="footer-nav">
            {FOOTER_EXPLORE_LINKS.map((link) => (
              <NavLink key={link.href} to={link.href} end={link.href === '/'}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>&copy; {new Date().getFullYear()} La Derma Aesthetic Clinic</p>
      </div>
    </footer>
  );
}
