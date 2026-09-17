import crypto from "node:crypto";
import { SEASON_STATS_SHEET_ID } from "@/lib/seasonStats";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function base64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function serviceAccount() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const privateKey = String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("Google Sheets write credentials are not configured.");
  return { email, privateKey };
}

async function accessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) return cachedToken;
  const { email, privateKey } = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  const assertion = `${unsigned}.${base64url(signature)}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Unable to authenticate with Google Sheets.");
  cachedToken = payload.access_token;
  cachedTokenExpiresAt = Date.now() + (Number(payload.expires_in) || 3600) * 1000;
  return cachedToken;
}

async function sheetsFetch(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SEASON_STATS_SHEET_ID}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Google Sheets API returned ${response.status}`);
  return payload;
}

async function columnValues(tabName) {
  const range = encodeURIComponent(`'${tabName}'!A:A`);
  const payload = await sheetsFetch(`/values/${range}?majorDimension=COLUMNS`);
  return Array.isArray(payload.values?.[0]) ? payload.values[0] : [];
}

export async function gameAlreadySaved(gameId) {
  const values = await columnValues("Team Stats");
  const target = String(gameId);
  return values.slice(1).some((value) => String(value).trim() === target);
}

export async function writeOfficialGameRows({ gameId, teamRows, skaterRows, goalieRows }) {
  const [teamIds, skaterIds, goalieIds] = await Promise.all([
    columnValues("Team Stats"), columnValues("Skater Stats"), columnValues("Goalie Stats"),
  ]);
  const target = String(gameId);
  if (teamIds.slice(1).some((value) => String(value).trim() === target)) {
    const error = new Error(`Game ${gameId} has already been submitted.`);
    error.code = "DUPLICATE_GAME";
    throw error;
  }

  const teamStart = Math.max(2, teamIds.length + 1);
  const skaterStart = Math.max(2, skaterIds.length + 1);
  const goalieStart = Math.max(2, goalieIds.length + 1);
  const data = [
    { range: `'Team Stats'!A${teamStart}:U${teamStart + teamRows.length - 1}`, majorDimension: "ROWS", values: teamRows },
    { range: `'Skater Stats'!A${skaterStart}:W${skaterStart + skaterRows.length - 1}`, majorDimension: "ROWS", values: skaterRows },
    { range: `'Goalie Stats'!A${goalieStart}:R${goalieStart + goalieRows.length - 1}`, majorDimension: "ROWS", values: goalieRows },
  ];

  await sheetsFetch("/values:batchUpdate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
  return { teamStart, skaterStart, goalieStart };
}
