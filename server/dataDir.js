import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where server/data files (admins.json, pricing.db, clients.db,
// google-token.json) are read from and written to.
//
// By default this is server/data — fine for local development, but on
// most cloud hosts (Render's free tier included) the local filesystem is
// wiped on every redeploy or restart, so anything written there
// disappears. The Google Calendar token already has an env-var escape
// hatch for this (GOOGLE_TOKEN_JSON); the admin/pricing/client databases
// don't fit that pattern (they're relational and grow over time, not a
// single value), so the real fix for those is a persistent disk.
//
// On Render: add a paid instance's "Disk" (Dashboard → your service →
// Disks → Add Disk), give it a mount path such as /var/data, and set
// DATA_DIR=/var/data in the service's environment variables. Everything
// in server/data/ — admins.json, pricing.db, clients.db,
// google-token.json — then survives redeploys and restarts exactly like
// a normal server, with no code changes needed beyond this variable.
//
// Leave DATA_DIR unset for local development and it behaves exactly as
// before, reading/writing server/data/ next to the server code.
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
