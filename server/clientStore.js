import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from './db.js';

const BCRYPT_ROUNDS = 12; // same cost factor already used for admin accounts

// Client accounts + a local record of which Google Calendar bookings
// belong to which client. Calendar itself has no concept of "client
// accounts" — a booking is just an event with an attendee email — so this
// table is the only place that link exists. It's populated the moment a
// logged-in client creates a booking (see index.js), never by querying
// Calendar for it after the fact.
//
// Shares the same libSQL client (db.js) as pricingStore.js and
// adminAuth.js — one database, several tables, rather than a separate
// file per feature.
let ready = null;

function init() {
  if (ready) return ready;
  ready = db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).then(() => db.execute(`
    CREATE TABLE IF NOT EXISTS client_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      event_id TEXT NOT NULL UNIQUE,
      treatment TEXT NOT NULL,
      start_iso TEXT NOT NULL,
      created_at TEXT NOT NULL,
      cancelled INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `)).then(() => db.execute(`
    CREATE INDEX IF NOT EXISTS idx_client_bookings_client
      ON client_bookings(client_id)
  `)).then(() => db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `)).then(() => db.execute(`
    CREATE INDEX IF NOT EXISTS idx_password_resets_token
      ON password_resets(token_hash)
  `));
  return ready;
}

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Only a SHA-256 hash of the reset token is ever stored — the raw token
// exists only in the emailed link (see email.js's sendPasswordResetEmail)
// and briefly in memory here, so a database leak alone can never be used
// to reset someone's password.
function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function toClientJSON(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at ?? row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Account creation / auth
// ---------------------------------------------------------------------------
export async function registerClient({ email, password, name, phone }) {
  if (!isValidEmail(email)) throw new Error('A valid email address is required.');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!name || !name.trim()) throw new Error('Full name is required.');

  await init();
  const normalizedEmail = normalizeEmail(email);

  const existingResult = await db.execute({ sql: 'SELECT id FROM clients WHERE email = ?', args: [normalizedEmail] });
  if (existingResult.rows.length > 0) throw new Error('An account with that email already exists.');

  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const createdAt = new Date().toISOString();
  const result = await db.execute({
    sql: 'INSERT INTO clients (email, password_hash, name, phone, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [normalizedEmail, hash, name.trim(), (phone || '').trim(), createdAt],
  });

  return toClientJSON({
    id: result.lastInsertRowid,
    email: normalizedEmail,
    name: name.trim(),
    phone: (phone || '').trim(),
    created_at: createdAt,
  });
}

export async function verifyClientLogin(email, password) {
  await init();
  const result = await db.execute({ sql: 'SELECT * FROM clients WHERE email = ?', args: [normalizeEmail(email || '')] });
  const row = result.rows[0];
  if (!row) return null;
  const valid = bcrypt.compareSync(password || '', row.password_hash);
  if (!valid) return null;
  return toClientJSON(row);
}

export async function getClientById(id) {
  await init();
  const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
  return toClientJSON(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Generates a new password reset token for the given email, IF an account
 * exists for it. Returns { client, token } on success, or null if there's
 * no account with that email — the caller (clientSession.js) always
 * responds the same way either way, so the API never reveals whether an
 * email address has an account (no user enumeration via "forgot password").
 */
export async function createPasswordResetToken(email) {
  await init();
  const result = await db.execute({ sql: 'SELECT * FROM clients WHERE email = ?', args: [normalizeEmail(email || '')] });
  const row = result.rows[0];
  if (!row) return null;

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.execute({
    sql: 'INSERT INTO password_resets (client_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
    args: [row.id, hashResetToken(token), expiresAt, new Date().toISOString()],
  });

  return { client: toClientJSON(row), token };
}

/**
 * Validates a reset token (unused, unexpired) and sets the new password if
 * it checks out. All of a client's other outstanding reset tokens are
 * invalidated too, so an old emailed link can't be replayed after a
 * successful reset.
 */
export async function resetPasswordWithToken(token, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters.');

  await init();
  const tokenHash = hashResetToken(token || '');
  const result = await db.execute({
    sql: 'SELECT * FROM password_resets WHERE token_hash = ? AND used = 0',
    args: [tokenHash],
  });
  const resetRow = result.rows[0];
  if (!resetRow || new Date(resetRow.expires_at).getTime() < Date.now()) {
    throw new Error('This password reset link is invalid or has expired.');
  }

  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  await db.execute({
    sql: 'UPDATE clients SET password_hash = ? WHERE id = ?',
    args: [hash, resetRow.client_id],
  });
  await db.execute({
    sql: 'UPDATE password_resets SET used = 1 WHERE client_id = ?',
    args: [resetRow.client_id],
  });

  return getClientById(resetRow.client_id);
}

// ---------------------------------------------------------------------------
// Client <-> booking links
// ---------------------------------------------------------------------------
export async function linkBookingToClient({ clientId, eventId, treatment, startISO }) {
  await init();
  await db.execute({
    sql: 'INSERT INTO client_bookings (client_id, event_id, treatment, start_iso, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [clientId, eventId, treatment, startISO, new Date().toISOString()],
  });
}

export async function getBookingLinksForClient(clientId) {
  await init();
  const result = await db.execute({
    sql: 'SELECT event_id AS eventId, treatment, start_iso AS startISO, cancelled FROM client_bookings WHERE client_id = ? ORDER BY start_iso DESC',
    args: [clientId],
  });
  return result.rows.map((row) => ({
    eventId: row.eventId,
    treatment: row.treatment,
    startISO: row.startISO,
    cancelled: Number(row.cancelled),
  }));
}

export async function markBookingLinkCancelled(clientId, eventId) {
  await init();
  const existingResult = await db.execute({
    sql: 'SELECT id FROM client_bookings WHERE client_id = ? AND event_id = ?',
    args: [clientId, eventId],
  });
  if (existingResult.rows.length === 0) throw new Error('This booking is not linked to your account.');
  await db.execute({
    sql: 'UPDATE client_bookings SET cancelled = 1 WHERE client_id = ? AND event_id = ?',
    args: [clientId, eventId],
  });
}
