import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_LINKS, LOGO_URL } from '../data/siteData';
import './Header.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close the menu automatically on route change (NavLink click).
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <NavLink to="/" className="brand" onClick={closeMenu}>
            <span className="brand-logo">
              <img src={LOGO_URL} alt="La Derma Aesthetic Clinic logo" />
            </span>
            <span className="brand-text">
              <span className="brand-eyebrow">Results led aesthetic care</span>
              <span className="brand-name">La Derma</span>
            </span>
          </NavLink>

          <nav className="mainnav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-cta">
            <NavLink to="/booking" className="btn btn-gold">Book Consultation</NavLink>
          </div>

          <button
            className={`menu-toggle${menuOpen ? ' open' : ''}`}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <div
        className={`mobile-nav-backdrop${menuOpen ? ' open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        <div className="mobile-nav-inner">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === '/'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink to="/booking" className="btn mobile-nav-cta" onClick={closeMenu}>
            Book Consultation
          </NavLink>
        </div>
      </div>
    </>
  );
}
