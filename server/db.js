import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from './dataDir.js';

// A single shared libSQL client for every table this server owns (admin
// accounts, treatment pricing, client accounts + their bookings).
//
// libSQL speaks the same SQL as SQLite, and the exact same @libsql/client
// API works two ways:
//   - Pointed at a local file (the default here) — behaves like plain
//     SQLite, no account or network needed. This is what local
//     development and any host with a real persistent disk should use.
//   - Pointed at a free Turso database (TURSO_DATABASE_URL +
//     TURSO_AUTH_TOKEN set) — the data lives on Turso's servers instead
//     of this container's disk, so it survives every redeploy and
//     restart even on a host with NO persistent disk at all, like
//     Render's free tier. See server/.env.example for setup steps.
//
// Because the same client type is used either way, nothing else in this
// codebase needs to know or care which mode it's in.
function createDbClient() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const localPath = path.join(DATA_DIR, 'laderma.db');
  return createClient({ url: `file:${localPath}` });
}

export const db = createDbClient();

export function usingTurso() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}
