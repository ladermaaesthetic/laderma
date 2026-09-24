import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './CookieConsent.css';

const STORAGE_KEY = 'laderma.cookie-consent';

// A last-resort in-memory fallback for when the browser blocks every kind
// of site storage (some "block all cookies/site data" settings block
// localStorage and sessionStorage too, not just cookies). This at least
// stops the popup reappearing on every click while browsing in a single
// visit — it can't survive a page reload without real storage, but that's
// an honest limit of a "no cookies at all" browser setting, not a bug.
let inMemoryConsent = null;

function readConsent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage unavailable — fall through to sessionStorage.
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // sessionStorage unavailable too — fall through to memory.
  }
  return inMemoryConsent;
}

function writeConsent(value) {
  inMemoryConsent = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return;
  } catch {
    // Try the next-best option.
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Nothing persists this browser's choice beyond the in-memory flag —
    // the popup will show again on a fresh page load, which is expected
    // once every form of site storage is blocked.
  }
}

// Centred modal, shown once per browser until a choice is made, regardless
// of which page someone lands on first (a Google result can land on
// /gallery or /pricing just as easily as the homepage) — mounted in
// Layout.jsx so it's present on every public route, not just Home. Dims
// the rest of the page behind it and blocks interaction until a choice
// is made.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  const respond = (value) => {
    writeConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent-backdrop">
      <div
        className="cookie-consent"
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label="Cookie consent"
      >
        <p className="cookie-consent-text">
          We only use cookies that are strictly necessary to keep you signed in — no analytics or advertising
          cookies. See our{' '}
          <NavLink to="/privacy-policy#cookies" target="_blank" rel="noreferrer">Privacy Policy</NavLink> for
          details.
        </p>
        <div className="cookie-consent-actions">
          <button type="button" className="btn btn-outline cookie-consent-decline" onClick={() => respond('declined')}>
            Essential only
          </button>
          <button type="button" className="btn btn-gold" onClick={() => respond('accepted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
