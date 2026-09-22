import bcrypt from 'bcrypt';
import { db } from './db.js';

const BCRYPT_ROUNDS = 12; // strong, still fast enough for interactive login

// Admin (staff) accounts, backed by the same shared libSQL client as
// pricingStore.js and clientStore.js — a local SQLite file by default, or
// a free Turso database in production, so accounts survive redeploys
// even on hosts with no persistent disk. Previously a plain JSON file;
// moved to a real table for the same reason pricing/client data is a
// table — one consistent, always-persisted storage layer instead of a
// mix of files and databases.
let ready = null;

function init() {
  if (ready) return ready;
  ready = db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  return ready;
}

/**
 * Creates the very first admin account if none exist yet, using
 * ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD from the
 * environment. This only ever runs once — after that, accounts are
 * managed through the admin panel itself. This avoids ever needing to
 * commit a real password anywhere.
 */
export async function bootstrapAdminIfNeeded() {
  await init();
  const countResult = await db.execute('SELECT COUNT(*) AS count FROM admins');
  if (Number(countResult.rows[0].count) > 0) return;

  const { ADMIN_BOOTSTRAP_USERNAME, ADMIN_BOOTSTRAP_PASSWORD } = process.env;
  if (!ADMIN_BOOTSTRAP_USERNAME || !ADMIN_BOOTSTRAP_PASSWORD) {
    console.log(
      'No admin accounts exist yet, and ADMIN_BOOTSTRAP_USERNAME/' +
      'ADMIN_BOOTSTRAP_PASSWORD are not set — the admin panel will be ' +
      'inaccessible until you set them and restart. See server/.env.example.'
    );
    return;
  }

  const hash = bcrypt.hashSync(ADMIN_BOOTSTRAP_PASSWORD, BCRYPT_ROUNDS);
  await db.execute({
    sql: 'INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)',
    args: [ADMIN_BOOTSTRAP_USERNAME, hash, new Date().toISOString()],
  });
  console.log(`Bootstrapped first admin account: ${ADMIN_BOOTSTRAP_USERNAME}`);
}

export async function verifyAdminLogin(username, password) {
  await init();
  const result = await db.execute({ sql: 'SELECT * FROM admins WHERE username = ?', args: [username] });
  const account = result.rows[0];
  if (!account) return false;
  return bcrypt.compareSync(password, account.password_hash);
}

export async function createAdmin(username, password) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT username FROM admins WHERE username = ?', args: [username] });
  if (existingResult.rows.length > 0) {
    throw new Error('An account with that username already exists.');
  }
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  await db.execute({
    sql: 'INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)',
    args: [username, hash, new Date().toISOString()],
  });
}

export async function listAdmins() {
  await init();
  const result = await db.execute('SELECT username, created_at AS createdAt FROM admins');
  return result.rows.map((row) => ({ username: row.username, createdAt: row.createdAt }));
}

export async function deleteAdmin(username) {
  await init();
  await db.execute({ sql: 'DELETE FROM admins WHERE username = ?', args: [username] });
}

export async function changeAdminPassword(username, newPassword) {
  await init();
  const existingResult = await db.execute({ sql: 'SELECT username FROM admins WHERE username = ?', args: [username] });
  if (existingResult.rows.length === 0) throw new Error('No such account.');
  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  await db.execute({ sql: 'UPDATE admins SET password_hash = ? WHERE username = ?', args: [hash, username] });
}
