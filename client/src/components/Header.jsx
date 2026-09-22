import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { NAV_LINKS, LOGO_URL, IMAGES } from '../data/siteData';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Display-only grouping for the desktop "Treatments & Pricing" dropdown.
// The real categories in the database are organised by treatment TYPE
// (laser, injectables, fillers, wellness...), so a handful of them are
// closely related and read better clustered under one heading in the
// menu — this never touches the underlying category ids/titles/data,
// it only changes how the left-hand list is grouped and labelled here.
// Any category id not listed below (e.g. a new one added later in the
// admin panel) automatically falls back to its own single-item group,
// so the menu never silently hides anything.
const MENU_GROUPS = [
  { label: 'Free Consultations', categoryIds: ['free-consultations'] },
  { label: 'Injectables & Fillers', categoryIds: ['anti-wrinkle', 'fillers', 'skin-boosters'] },
  { label: 'Laser & Skin Treatments', categoryIds: ['diode-laser', 'microneedling'] },
  { label: 'Body Treatments', categoryIds: ['body-treatments'] },
  { label: 'Wellness & Specialist', categoryIds: ['wellness'] },
];

// Builds the grouped list actually shown in the dropdown from whatever
// categories are live right now, so it stays correct even if admin adds,
// renames, or removes a category — anything unrecognised just becomes
// its own group under its own title.
function buildMenuGroups(categories) {
  const byId = new Map(categories.map((cat) => [cat.id, cat]));
  const used = new Set();
  const groups = [];

  for (const group of MENU_GROUPS) {
    const members = group.categoryIds.map((id) => byId.get(id)).filter(Boolean);
    members.forEach((cat) => used.add(cat.id));
    if (members.length > 0) groups.push({ label: group.label, categories: members });
  }

  for (const cat of categories) {
    if (!used.has(cat.id)) groups.push({ label: cat.title, categories: [cat] });
  }

  return groups;
}

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
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [mobileTreatmentsOpen, setMobileTreatmentsOpen] = useState(false);
  const [mobileActiveCategoryId, setMobileActiveCategoryId] = useState(null);
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
        setActiveCategoryId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  // Default to the first category being "open" (its items showing in the
  // flyout) as soon as the dropdown appears, so the menu doesn't open on
  // an empty second panel — matches how the reference site's menu always
  // shows a populated flyout right away.
  useEffect(() => {
    if (dropdownOpen && categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [dropdownOpen, categories, activeCategoryId]);

  // Close the menu automatically on route change (NavLink click).
  const closeMenu = () => {
    setMenuOpen(false);
    setMobileTreatmentsOpen(false);
    setMobileActiveCategoryId(null);
  };

  // Each treatment category has its own dedicated page, e.g. /pricing/diode-laser.
  const goToCategory = (categoryId) => {
    setDropdownOpen(false);
    setActiveCategoryId(null);
    closeMenu();
    navigate(`/pricing/${categoryId}`);
  };

  const mobileActiveCategory = categories.find((cat) => cat.id === mobileActiveCategoryId) || null;
  const activeCategory = categories.find((cat) => cat.id === activeCategoryId) || null;
  const menuGroups = buildMenuGroups(categories);

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
                  onMouseLeave={() => { setDropdownOpen(false); setActiveCategoryId(null); }}
                >
                  <NavLink
                    to={link.href}
                    className={({ isActive }) => `mainnav-dropdown-trigger${isActive ? ' active' : ''}${dropdownOpen ? ' open' : ''}`}
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
                      <div className="mainnav-dropdown-bridge" />
                      <div className="mainnav-dropdown-panel">
                        <div className="mainnav-dropdown-categories">
                          {menuGroups.map((group) => (
                            <div className="mainnav-dropdown-group" key={group.label}>
                              {group.categories.length > 1 && (
                                <p className="mainnav-dropdown-group-label">{group.label}</p>
                              )}
                              {group.categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  className={`mainnav-dropdown-category${activeCategoryId === cat.id ? ' active' : ''}`}
                                  onMouseEnter={() => setActiveCategoryId(cat.id)}
                                  onFocus={() => setActiveCategoryId(cat.id)}
                                  onClick={() => goToCategory(cat.id)}
                                >
                                  {group.categories.length > 1 ? cat.title.replace(/ Treatments$/, '') : cat.title}
                                  <svg className="mainnav-dropdown-category-caret" width="7" height="12" viewBox="0 0 7 12" fill="none">
                                    <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>

                        {activeCategory && (
                          <div className="mainnav-dropdown-items">
                            <p className="mainnav-dropdown-items-title">{activeCategory.title}</p>
                            <div className="mainnav-dropdown-items-grid">
                              {activeCategory.items?.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="mainnav-dropdown-item"
                                  onClick={() => goToCategory(activeCategory.id)}
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="mainnav-dropdown-items-viewall"
                              onClick={() => goToCategory(activeCategory.id)}
                            >
                              View all {activeCategory.title}
                            </button>
                          </div>
                        )}

                        <div className="mainnav-dropdown-promo">
                          <img src={IMAGES.treatmentRoom} alt="" />
                          <div className="mainnav-dropdown-promo-copy">
                            <p className="mainnav-dropdown-promo-title">Not sure where to start?</p>
                            <NavLink to="/booking" className="btn btn-gold" onClick={() => setDropdownOpen(false)}>
                              Book a Free Consultation
                            </NavLink>
                          </div>
                        </div>
                      </div>
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
        {/* Root panel — the main link list, with "Treatments & Pricing"
            opening the category panel instead of expanding in place. */}
        <div className={`mobile-nav-panel${mobileTreatmentsOpen ? ' mobile-nav-panel-back' : ''}`}>
          <div className="mobile-nav-inner">
            {NAV_LINKS.map((link) =>
              link.dropdown ? (
                <button
                  key={link.href}
                  type="button"
                  className="mobile-nav-row"
                  onClick={() => setMobileTreatmentsOpen(true)}
                >
                  {link.label}
                  {categories.length > 0 && (
                    <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
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

        {/* Category panel — shown straight away once "Treatments & Pricing"
            is tapped, with a Back row at the top, matching the reference
            site's slide-to-next-panel pattern rather than an accordion. */}
        <div className={`mobile-nav-panel mobile-nav-panel-secondary${mobileTreatmentsOpen ? ' mobile-nav-panel-active' : ''}`}>
          <div className="mobile-nav-inner">
            <button
              type="button"
              className="mobile-nav-back"
              onClick={() => { setMobileTreatmentsOpen(false); setMobileActiveCategoryId(null); }}
            >
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>

            {!mobileActiveCategory ? (
              <>
                <p className="mobile-nav-panel-title">Treatments &amp; Pricing</p>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="mobile-nav-row"
                    onClick={() => setMobileActiveCategoryId(cat.id)}
                  >
                    {cat.title}
                    {cat.items?.length > 0 && (
                      <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                        <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
                <NavLink to="/pricing" className="mobile-nav-row mobile-nav-row-muted" onClick={closeMenu}>
                  View full price list
                </NavLink>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="mobile-nav-subback"
                  onClick={() => setMobileActiveCategoryId(null)}
                >
                  <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                    <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {mobileActiveCategory.title}
                </button>
                {mobileActiveCategory.items?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="mobile-nav-subitem-row"
                    onClick={() => goToCategory(mobileActiveCategory.id)}
                  >
                    <span>{item.name}</span>
                    <span className="mobile-nav-subitem-price">{item.price}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
