// Loads .env relative to this file's own directory, not the process's
// working directory — unlike the bare 'dotenv/config' import, this works
// correctly even when the server is started from the repo root (e.g. the
// local dev launch config runs `node server/index.js` from the repo root).
//
// This must be imported FIRST in index.js, before any other local module
// (calendar.js, adminSession.js, etc.) — ES module imports are evaluated in
// source order before a file's own top-level code runs, and several of
// those modules read process.env at their own top level.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
