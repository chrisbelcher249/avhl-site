// Read-only by default. Requires the Vercel production Redis environment variables.
// Run: node scripts/cleanup-expired-replays.mjs
// After a database backup and verification: node scripts/cleanup-expired-replays.mjs --apply
// Preserves metadata, lineups, injuries and all Google Sheets statistics.
import { officialReplayExpiryAt, OFFICIAL_REPLAY_TTL_SECONDS } from "../src/lib/replayRetention.js";

const prefix = "avhl:official-replay:v1:";
const metaHash = "avhl:official-replay-meta:v1";
const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || "").replace(/\\/+$/, "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
if (!url || !token) throw new Error("Missing Upstash REST credentials in environment. Use a securely configured local shell.");
const apply = process.argv.includes("--apply");
async function redis(parts) {
  const response = await fetch(url, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(parts)
  });
  if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(String(json.error));
  return json.result;
}
function pairs(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return Object.entries(raw);
  const out = [];
  for (let i = 0; i + 1 < raw.length; i += 2) out.push([String(raw[i]), raw[i+1]]);
  return out;
}
const entries = pairs(await redis(["HGETALL",metaHash]));
const now = Date.now();
const expired = [], active = [], unknown = [];
for (const [id, value] of entries) {
  if (!/^[1-9]\\d{0,3}$/.test(id) || +id > 1640) continue;
  let meta;
  try { meta = typeof value === "string" ? JSON.parse(value) : value; } catch { unknown.push(id); continue; }
  const expiry = officialReplayExpiryAt(meta);
  if (expiry == null) { unknown.push(id); continue; }
  (expiry <= now ? expired : active).push({id, expiry});
}
console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY_RUN", metadataEntries: entries.length,
  expired: expired.length, active: active.length, unknown: unknown.length,
  expiredExamples: expired.slice(0, 25).map(x=>x.id), ttlSeconds: OFFICIAL_REPLAY_TTL_SECONDS
}, null, 2));
if (unknown.length) console.log("Unknown timestamps were skipped: " + unknown.slice(0,25).join(", "));
if (apply) {
  let deleted = 0, alreadyMissing = 0, skippedNewer = 0;
  for (const {id,expiry} of expired) {
    // Recheck the timestamp in case metadata changed after the dry run.
    const latest = await redis(["HGET", metaHash, id]);
    if (!latest) { skippedNewer++; continue; }
    let record;
    try { record = typeof latest === "string" ? JSON.parse(latest) : latest; } catch { skippedNewer++; continue; }
    const expiryNow = officialReplayExpiryAt(record);
    if (expiryNow == null || expiryNow > Date.now()) { skippedNewer++; continue; }
    // Only the large replay archive key is ever deleted.
    const result = Number(await redis(["DEL", prefix + id])) || 0;
    if (result) deleted++; else alreadyMissing++;
  }
  console.log(JSON.stringify({deleted, alreadyMissing, skippedNewer, preservedMetadata:true}));
} else console.log("No changes made. Back up the database, verify stats, then rerun with --apply.");
