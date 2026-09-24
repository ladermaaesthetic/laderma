// Shared idle-timeout tuning for both the client account area and the
// admin dashboard — how long a signed-in session can sit with no mouse/
// keyboard/touch activity before a warning appears, then before it's
// signed out automatically. One place to tune both.
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const IDLE_WARNING_MS = 60 * 1000; // show the warning 60s before sign-out
