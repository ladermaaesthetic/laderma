import { useEffect, useState } from 'react';
import './Loader.css';

// Shown after a few seconds of waiting. The booking server runs on a free
// host that goes to sleep after a quiet period and takes up to a minute to
// wake on the next request — without a word of explanation that looks like
// a broken site, so say what's happening.
export function LoadingHint({ delayMs = 6000 }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!slow) return null;
  return (
    <p className="loader-hint" role="status">
      Still loading — our booking system may be waking up after a quiet
      period. This can take up to a minute, thank you for your patience.
    </p>
  );
}

export default function Loader({ message = 'Loading…' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-mark">
        <span className="loader-ring" />
        <img src="/la-derma-logo.jpg" alt="" width="56" height="56" />
      </div>
      <p className="loader-message">{message}</p>
      <LoadingHint />
    </div>
  );
}
