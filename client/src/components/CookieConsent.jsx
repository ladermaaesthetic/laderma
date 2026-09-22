import { useEffect, useState } from 'react';
import './CookieConsent.css';

const STORAGE_KEY = 'laderma.cookie-consent';

// Shown once per browser until a choice is made, regardless of which page
// someone lands on first (a Google result can land on /gallery or /pricing
// just as easily as the homepage) — mounted in Layout.jsx so it's present
// on every public route, not just Home.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // If localStorage is unavailable (private browsing, blocked storage),
      // fail open and show the banner rather than silently skipping it.
      setVisible(true);
    }
  }, []);

  const respond = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage may be unavailable — the banner will simply reappear next
      // visit, which is an acceptable degrade rather than a broken page.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-consent-inner">
        <p className="cookie-consent-text">
          We use cookies to keep you signed in and to remember your booking details.
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
