import session from 'express-session';
import { verifyClientLogin, registerClient, createPasswordResetToken, resetPasswordWithToken } from './clientStore.js';
import { sendPasswordResetEmail } from './email.js';
import { SESSION_COOKIE_MAX_AGE_MS } from './sessionConfig.js';

// Same lightweight in-memory rate limiting pattern as adminSession.js,
// kept as a separate map/keyspace so a burst of client login attempts
// never counts against (or gets blocked by) admin login attempts.
const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// A separate, more generous rate limit for "forgot password" requests —
// keyed and windowed independently of login attempts so it never interacts
// with (or gets tripped by) someone just mistyping their password.
const resetRequestAttempts = new Map(); // ip -> { count, resetAt }
const MAX_RESET_REQUESTS = 5;
const RESET_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isResetRateLimited(ip) {
  const entry = resetRequestAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    resetRequestAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_RESET_REQUESTS;
}

function recordResetRequest(ip) {
  const entry = resetRequestAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    resetRequestAttempts.set(ip, { count: 1, resetAt: Date.now() + RESET_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

// Where to send someone after they click the reset link in their email —
// the public site, not this API. Same first-of-comma-list convention as
// CORS's CLIENT_ORIGIN handling in index.js.
function getSiteBaseUrl() {
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');
  return origins[0].trim();
}

// A second express-session instance with its own cookie name ("laderma.sid"
// is Express's default, already used by the admin session — giving this
// one an explicit different name keeps the two sessions fully independent
// in the same browser).
export function clientSessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET env var is required for client accounts to run securely. ' +
      'Set it to a long random string — see server/.env.example.'
    );
  }

  // Same cross-origin cookie reasoning as adminSession.js: the client
  // (Netlify) and this server (Render) are different origins, so the
  // cookie needs SameSite=None + Secure in production, or it never makes
  // it back on the next fetch — which is exactly why clients looked
  // logged out on refresh and "Could not load your bookings" showed up
  // even for a client who'd just logged in and booked successfully.
  const isProd = process.env.NODE_ENV === 'production';
  return session({
    name: 'laderma.client.sid',
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // refresh maxAge on every request — an active session never gets cut off
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE_MS, // idle sign-out — see sessionConfig.js
    },
  });
}

export function requireClientAuth(req, res, next) {
  if (req.session && req.session.clientId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated.' });
}

export function registerClientAuthRoutes(app) {
  app.post('/api/account/register', async (req, res) => {
    const { email, password, name, phone } = req.body || {};
    try {
      const client = await registerClient({ email, password, name, phone });
      req.session.clientId = client.id;
      res.status(201).json({ success: true, client });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Could not create account.' });
    }
  });

  app.post('/api/account/login', async (req, res) => {
    const ip = req.ip;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let client;
    try {
      client = await verifyClientLogin(email, password);
    } catch (err) {
      console.error('Client login lookup failed:', err);
      return res.status(500).json({ error: 'Could not sign in right now. Please try again.' });
    }

    if (!client) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    clearAttempts(ip);
    req.session.clientId = client.id;
    res.json({ success: true, client });
  });

  app.post('/api/account/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/account/session', (req, res) => {
    if (req.session && req.session.clientId) {
      return res.json({ authenticated: true, clientId: req.session.clientId });
    }
    res.json({ authenticated: false });
  });

  app.post('/api/account/forgot-password', async (req, res) => {
    const ip = req.ip;
    if (isResetRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    }
    recordResetRequest(ip);

    const { email } = req.body || {};
    // Always respond the same way regardless of whether the email matches
    // an account — this is what stops "forgot password" being usable to
    // check which emails have an account on this site.
    const genericResponse = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

    if (!email) return res.json(genericResponse);

    try {
      const result = await createPasswordResetToken(email);
      if (result) {
        const resetUrl = `${getSiteBaseUrl()}/account/reset-password?token=${result.token}`;
        await sendPasswordResetEmail({ to: result.client.email, name: result.client.name, resetUrl });
      }
    } catch (err) {
      console.error('Failed to process forgot-password request:', err);
      // Still return the generic response — don't leak whether it failed
      // because of a bad email vs. a real server error.
    }

    res.json(genericResponse);
  });

  app.post('/api/account/reset-password', async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'A reset token and new password are required.' });
    }

    try {
      const client = await resetPasswordWithToken(token, password);
      // Sign them in immediately — they just proved account ownership via
      // the emailed link, no reason to make them log in again right after.
      req.session.clientId = client.id;
      res.json({ success: true, client });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Could not reset your password.' });
    }
  });
}
