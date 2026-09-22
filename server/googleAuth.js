import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataDir.js';

const TOKEN_PATH = path.join(DATA_DIR, 'google-token.json');

// Scopes: read free/busy + create events on the clinic's calendar.
// We deliberately do NOT request broader Gmail/Drive scopes — only calendar access.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Token storage: on most cloud hosts (Render's free tier included), the
// local filesystem is wiped on every redeploy/restart, so a token saved
// only to disk disappears the moment the service restarts. To survive
// that, we prefer an environment variable (GOOGLE_TOKEN_JSON) when it's
// set, and only fall back to the on-disk file for local development,
// where persistence across restarts isn't an issue.
function readStoredToken() {
  if (process.env.GOOGLE_TOKEN_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_TOKEN_JSON);
    } catch {
      console.error(
        'GOOGLE_TOKEN_JSON env var is set but is not valid JSON — ignoring it. ' +
        'Falling back to on-disk token, if any. Fix or remove this variable in ' +
        'your hosting dashboard.'
      );
      // Fall through to the on-disk check rather than crashing the process.
    }
  }
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  }
  return null;
}

function writeStoredToken(tokens) {
  // If GOOGLE_TOKEN_JSON is in use, we can't rewrite the platform's env
  // vars from here — log the refreshed token so it can be updated
  // manually if needed, but this normally only matters for the
  // access_token, which Google reissues automatically from the
  // refresh_token on every authorized request anyway.
  if (process.env.GOOGLE_TOKEN_JSON) {
    console.log('Token refreshed in memory. If issues persist, update GOOGLE_TOKEN_JSON with:');
    console.log(JSON.stringify(tokens));
    return;
  }
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Missing Google OAuth env vars. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
      'and GOOGLE_REDIRECT_URI in server/.env — see server/.env.example.'
    );
  }

  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// Generates the URL the clinic owner visits once to grant calendar access.
export function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // needed to receive a refresh_token
    prompt: 'consent',      // forces refresh_token to be reissued even on repeat auth
    scope: SCOPES,
  });
}

// Exchanges the one-time code Google sends back for tokens, and saves them.
export async function saveTokenFromCode(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  writeStoredToken(tokens);

  if (process.env.GOOGLE_TOKEN_JSON) {
    console.log(
      'NOTE: GOOGLE_TOKEN_JSON is already set as an env var, which takes ' +
      'priority. If you want THIS new connection to take effect, update ' +
      'GOOGLE_TOKEN_JSON in your hosting dashboard to the value below, ' +
      'then redeploy:'
    );
    console.log(JSON.stringify(tokens));
  }

  return tokens;
}

// Returns an authenticated OAuth2 client using the saved token, or null if not yet connected.
export function getAuthorizedClient() {
  const tokens = readStoredToken();
  if (!tokens) return null;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  // googleapis automatically refreshes the access_token using the refresh_token
  // when it expires, as long as tokens.refresh_token is present. Persist any
  // refreshed token so restarts don't lose it (file-based storage only —
  // see writeStoredToken for the env-var case).
  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    writeStoredToken(merged);
  });

  return oauth2Client;
}

export function isCalendarConnected() {
  return readStoredToken() !== null;
}

export function disconnectCalendar() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  if (process.env.GOOGLE_TOKEN_JSON) {
    console.log(
      'NOTE: GOOGLE_TOKEN_JSON is still set in your environment — remove ' +
      'it from your hosting dashboard and redeploy to fully disconnect.'
    );
  }
}
