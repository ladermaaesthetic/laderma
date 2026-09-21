import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMINS_PATH = path.join(__dirname, 'data', 'admins.json');

const BCRYPT_ROUNDS = 12; // strong, still fast enough for interactive login

// Plain JSON file rather than a database — this is deliberately the same
// pattern already used for the Google Calendar token (see googleAuth.js).
// The admin account list is small (a handful of staff at most), so a
// database adds complexity (and, in the case of libraries needing native
// compilation, real deployment risk) without a real benefit here.
function readAdmins() {
  if (!fs.existsSync(ADMINS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ADMINS_PATH, 'utf-8'));
  } catch {
    console.error('admins.json is corrupted or unreadable — treating as empty.');
    return [];
  }
}

function writeAdmins(admins) {
  fs.mkdirSync(path.dirname(ADMINS_PATH), { recursive: true });
  fs.writeFileSync(ADMINS_PATH, JSON.stringify(admins, null, 2));
}

/**
 * Creates the very first admin account if none exist yet, using
 * ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD from the
 * environment. This only ever runs once — after that, accounts are
 * managed through the admin panel itself (or by editing the file
 * directly). This avoids ever needing to commit a real password anywhere.
 */
export function bootstrapAdminIfNeeded() {
  const admins = readAdmins();
  if (admins.length > 0) return;

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
  writeAdmins([{ username: ADMIN_BOOTSTRAP_USERNAME, passwordHash: hash, createdAt: new Date().toISOString() }]);
  console.log(`Bootstrapped first admin account: ${ADMIN_BOOTSTRAP_USERNAME}`);
}

export function verifyAdminLogin(username, password) {
  const admins = readAdmins();
  const account = admins.find((a) => a.username === username);
  if (!account) return false;
  return bcrypt.compareSync(password, account.passwordHash);
}

export function createAdmin(username, password) {
  const admins = readAdmins();
  if (admins.some((a) => a.username === username)) {
    throw new Error('An account with that username already exists.');
  }
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  admins.push({ username, passwordHash: hash, createdAt: new Date().toISOString() });
  writeAdmins(admins);
}

export function listAdmins() {
  return readAdmins().map(({ username, createdAt }) => ({ username, createdAt }));
}

export function deleteAdmin(username) {
  const admins = readAdmins().filter((a) => a.username !== username);
  writeAdmins(admins);
}

export function changeAdminPassword(username, newPassword) {
  const admins = readAdmins();
  const account = admins.find((a) => a.username === username);
  if (!account) throw new Error('No such account.');
  account.passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  writeAdmins(admins);
}
