// Shared idle-timeout tuning for BOTH the admin panel and client accounts.
// The actual sign-out is driven by the frontend (mouse/keyboard/touch
// activity — see client/src/config/sessionTimeout.js, which uses the same
// numbers), which calls /logout the moment someone's been idle too long.
// This cookie maxAge is the server-side backstop for when that JS never
// gets a chance to run at all (tab backgrounded/suspended, script blocked,
// etc) — rolling:true means real activity (the frontend's own periodic
// "still here" ping, or any authenticated request) keeps refreshing it, so
// an actively-used session never gets cut off mid-use.
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const BUFFER_MS = 2 * 60 * 1000; // headroom over the frontend's own timeout
export const SESSION_COOKIE_MAX_AGE_MS = IDLE_TIMEOUT_MS + BUFFER_MS;
