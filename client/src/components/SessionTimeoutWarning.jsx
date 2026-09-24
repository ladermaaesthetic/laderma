import './SessionTimeoutWarning.css';

// Shown a fixed window (see config/sessionTimeout.js) before an idle
// session is signed out automatically — see useIdleTimeout.js for the
// activity-tracking behind it. ANY activity while this is open (moving
// the mouse, a key press, a tap, not just clicking the button below)
// dismisses it and resets the idle clock, via the same listeners the
// idle hook already has running.
export default function SessionTimeoutWarning({ show, secondsLeft, onStay, onSignOut, label = 'session' }) {
  if (!show) return null;

  return (
    <div className="session-timeout-backdrop">
      <div
        className="session-timeout-card"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label="Session timeout warning"
      >
        <h2 className="session-timeout-title">Still there?</h2>
        <p className="session-timeout-text">
          Your {label} has been idle for a while. For your security, you'll be signed out automatically.
        </p>
        <p className="session-timeout-countdown">{secondsLeft}s</p>
        <div className="session-timeout-actions">
          <button type="button" className="btn btn-gold" onClick={onStay}>
            Stay Signed In
          </button>
          <button type="button" className="session-timeout-signout" onClick={onSignOut}>
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
