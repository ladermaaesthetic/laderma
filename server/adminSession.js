import session from 'express-session';
import { verifyAdminLogin } from './adminAuth.js';

// Simple in-memory rate limiting for login attempts, keyed by IP. This is
// intentionally lightweight (not distributed-safe, resets on restart) —
// enough to slow down brute-force guessing on a small single-instance
// admin panel without adding a dependency.
const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
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

export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET env var is required for the admin panel to run securely. ' +
      'Set it to a long random string — see server/.env.example.'
    );
  }

  // The client (Netlify) and this server (Render) are different origins,
  // so the session cookie is cross-site from the browser's point of view.
  // Cross-site cookies require SameSite=None, which in turn requires
  // Secure — browsers refuse to set/send a SameSite=None cookie over
  // plain HTTP. In local dev (NODE_ENV !== 'production'), fall back to
  // 'lax'/non-secure since localhost isn't served over HTTPS. Getting
  // this wrong is why logins looked like they "didn't stick": the cookie
  // was set but never sent back on the next cross-origin request, so
  // every refresh (a fresh, cookie-less request cycle) looked logged out.
  const isProd = process.env.NODE_ENV === 'production';
  return session({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    },
  });
}

export function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminUsername) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated.' });
}

export function registerAdminAuthRoutes(app) {
  app.post('/api/admin/login', async (req, res) => {
    const ip = req.ip;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const valid = await verifyAdminLogin(username, password);
    if (!valid) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    clearAttempts(ip);
    req.session.adminUsername = username;
    res.json({ success: true, username });
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/admin/session', (req, res) => {
    if (req.session && req.session.adminUsername) {
      return res.json({ authenticated: true, username: req.session.adminUsername });
    }
    res.json({ authenticated: false });
  });
}
