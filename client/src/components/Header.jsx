import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { NAV_LINKS, LOGO_URL } from '../data/siteData';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function AccountIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-3.6 5-5.5 8-5.5s6.4 1.9 8 5.5" />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileTreatmentsOpen, setMobileTreatmentsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { client } = useAuth();

  // Treatment categories for the "Treatments & Pricing" dropdown come from
  // the same live /api/pricing endpoint the Pricing page itself uses, so
  // the dropdown never drifts out of sync with what admins add/rename/
  // remove through the admin panel.
  useEffect(() => {
    fetch(`${API_BASE}/api/pricing`)
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close the desktop dropdown on outside click.
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  // Close the menu automatically on route change (NavLink click).
  const closeMenu = () => {
    setMenuOpen(false);
    setMobileTreatmentsOpen(false);
  };

  // Jump straight to a category anchor on the Treatments & Pricing page,
  // whether we're already on that page (just scroll) or navigating there
  // from elsewhere (navigate, then let the browser's hash scroll handle it).
  const goToCategory = (categoryId) => {
    setDropdownOpen(false);
    closeMenu();
    navigate(`/pricing#${categoryId}`);
  };

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
            {NAV_LINKS.map((link) =>
              link.dropdown ? (
                <div
                  className="mainnav-dropdown-wrap"
                  key={link.href}
                  ref={dropdownRef}
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <NavLink
                    to={link.href}
                    className={({ isActive }) => `mainnav-dropdown-trigger${isActive ? ' active' : ''}`}
                    onClick={(e) => {
                      // On touch devices there's no hover, so a tap opens
                      // the dropdown first rather than navigating straight
                      // away — a second tap (or a tap on a subsection) does
                      // the actual navigation.
                      if (!dropdownOpen && window.matchMedia('(hover: none)').matches) {
                        e.preventDefault();
                        setDropdownOpen(true);
                      }
                    }}
                  >
                    {link.label}
                    <svg className="dropdown-caret" width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </NavLink>

                  {dropdownOpen && categories.length > 0 && (
                    <div className="mainnav-dropdown">
                      <p className="mainnav-dropdown-label">Browse by category</p>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className="mainnav-dropdown-item"
                          onClick={() => goToCategory(cat.id)}
                        >
                          {cat.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/'}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {link.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="header-cta">
            <NavLink to="/account" className="header-account-link" aria-label={client ? 'My Account' : 'Sign In'}>
              <AccountIcon />
              <span>{client ? client.name.split(' ')[0] : 'Sign In'}</span>
            </NavLink>
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
          {NAV_LINKS.map((link) =>
            link.dropdown ? (
              <div className="mobile-nav-dropdown" key={link.href}>
                <div className="mobile-nav-dropdown-head">
                  <NavLink
                    to={link.href}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </NavLink>
                  {categories.length > 0 && (
                    <button
                      type="button"
                      className={`mobile-nav-dropdown-toggle${mobileTreatmentsOpen ? ' open' : ''}`}
                      aria-label="Show treatment categories"
                      onClick={() => setMobileTreatmentsOpen((v) => !v)}
                    >
                      <svg width="14" height="8" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
                {mobileTreatmentsOpen && (
                  <div className="mobile-nav-subsection">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="mobile-nav-subsection-item"
                        onClick={() => goToCategory(cat.id)}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            )
          )}
          <NavLink to="/account" className={({ isActive }) => (isActive ? 'active' : undefined)} onClick={closeMenu}>
            {client ? `My Account (${client.name.split(' ')[0]})` : 'Sign In'}
          </NavLink>
          <NavLink to="/booking" className="btn mobile-nav-cta" onClick={closeMenu}>
            Book Consultation
          </NavLink>
        </div>
      </div>
    </>
  );
}
