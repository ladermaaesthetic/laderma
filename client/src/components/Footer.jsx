import { NavLink } from 'react-router-dom';
import { NAV_LINKS, LOGO_URL } from '../data/siteData';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-brand-logo">
            <img src={LOGO_URL} alt="La Derma Aesthetic Clinic logo" />
          </span>
          <div>
            <p className="footer-brand-eyebrow">Results led aesthetic care</p>
            <p className="footer-brand-name">La Derma</p>
          </div>
        </div>

        <div className="footer-nav-block">
          <p className="footer-label">Navigate</p>
          <div className="footer-nav">
            {NAV_LINKS.map((link) => (
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
