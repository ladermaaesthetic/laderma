import session from 'express-session';
import { verifyClientLogin, registerClient } from './clientStore.js';

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

  return session({
    name: 'laderma.client.sid',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — clients expect to stay signed in
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
}
