import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Tracks real user activity (mouse, keyboard, touch, scroll) and drives an
 * idle-timeout warning + sign-out — used for both the client account area
 * and the admin dashboard (see config/sessionTimeout.js for the shared
 * durations).
 *
 * Deliberately timestamp-based rather than a single long setTimeout:
 * background/inactive browser tabs throttle timers heavily, so a plain
 * setTimeout could fire minutes late. Re-checking elapsed wall-clock time
 * on an interval, and again immediately when the tab regains visibility,
 * means the warning/timeout still lands at the right moment even after the
 * tab was backgrounded.
 *
 * `onHeartbeat` fires (throttled) on real activity so the caller can ping
 * the server and keep its rolling session cookie in sync with what the
 * user is actually seeing on screen, not just with API calls made in that
 * window.
 */
export function useIdleTimeout({ enabled, idleMs, warningMs, onTimeout, onHeartbeat }) {
  const [secondsLeft, setSecondsLeft] = useState(null); // null = warning not showing
  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(0);
  const warningShownRef = useRef(false);
  const timedOutRef = useRef(false);

  const registerActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    timedOutRef.current = false;
    if (warningShownRef.current) {
      warningShownRef.current = false;
      setSecondsLeft(null);
    }
    if (onHeartbeat && now - lastHeartbeatRef.current > 30 * 1000) {
      lastHeartbeatRef.current = now;
      onHeartbeat();
    }
  }, [onHeartbeat]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      warningShownRef.current = false;
      timedOutRef.current = false;
      return undefined;
    }

    lastActivityRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();
    warningShownRef.current = false;
    timedOutRef.current = false;

    let lastHandled = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandled < ACTIVITY_THROTTLE_MS) return;
      lastHandled = now;
      registerActivity();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const check = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = idleMs - elapsed;

      if (remaining <= 0) {
        if (!timedOutRef.current) {
          timedOutRef.current = true;
          onTimeout();
        }
        return;
      }

      if (remaining <= warningMs) {
        warningShownRef.current = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    };

    const interval = setInterval(check, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    check();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [enabled, idleMs, warningMs, onTimeout, registerActivity]);

  return { secondsLeft, stayActive: registerActivity };
}
