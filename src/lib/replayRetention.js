// The large official simulator replay is temporary; official game and player stats
// are stored separately in Google Sheets and are not managed by this module.
export const OFFICIAL_REPLAY_TTL_SECONDS = 7 * 24 * 60 * 60;
const RETENTION_MS = OFFICIAL_REPLAY_TTL_SECONDS * 1000;
const LEGACY_DATE_BUFFER_MS = 24 * 60 * 60 * 1000;

// Most records have a precise lockedAt timestamp. For exceptional older records
// with a date only, retain an additional day rather than expire early.
export function officialReplayExpiryAt(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  for (const field of ["savedAt", "lockedAt"]) {
    const value = metadata[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return timestamp + RETENTION_MS;
  }
  const date = String(metadata.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp + RETENTION_MS + LEGACY_DATE_BUFFER_MS : null;
}

export function officialReplayIsExpired(metadata, now = Date.now()) {
  const expiry = officialReplayExpiryAt(metadata);
  return expiry != null && now >= expiry;
}
