// Read-only by default. Requires the Vercel production Redis environment variables.
// Run: node scripts/cleanup-expired-replays.mjs
// After verifying independent official stats: node scripts/cleanup-expired-replays.mjs --apply
// --apply first backs up every archive to ~/AVHL-Replay-Backups/, verifies the copy, then deletes expired archives.
// Preserves metadata, lineups, injuries and all Google Sheets statistics.
import { officialReplayExpiryAt, OFFICIAL_REPLAY_TTL_SECONDS } from "../src/lib/replayRetention.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const prefix = "avhl:official-replay:v1:";
const metaHash = "avhl:official-replay-meta:v1";
const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || "").replace(/\/+$/, "");
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
  if (!/^[1-9]\d{0,3}$/.test(id) || +id > 1640) continue;
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
  // First back up every eligible archive, using only game-scoped keys. This
  // script never deletes an archive without an independently verified copy.
  const parent = path.join(os.homedir(), "AVHL-Replay-Backups");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const backupDir = path.join(parent, "official-replays-" + new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(backupDir, { mode: 0o700 });
  console.log("Backing up expired replay archives to: " + backupDir);
  const backedUp = [];
  let alreadyMissing = 0, skippedNewer = 0, backupBytes = 0;
  for (const { id } of expired) {
    const metadata = await redis(["HGET", metaHash, id]);
    if (!metadata) { skippedNewer++; continue; }
    let parsed;
    try { parsed = typeof metadata === "string" ? JSON.parse(metadata) : metadata; }
    catch { skippedNewer++; continue; }
    const expiry = officialReplayExpiryAt(parsed);
    if (expiry == null || expiry > Date.now()) { skippedNewer++; continue; }
    const archive = await redis(["GET", prefix + id]);
    if (archive == null) { alreadyMissing++; continue; }
    if (typeof archive !== "string") throw new Error("Unexpected archive format for game " + id + "; no archives were deleted.");
    const fileName = "game-" + id + ".json";
    const record = JSON.stringify({ gameId: id, key: prefix + id, metadata, archive });
    const target = path.join(backupDir, fileName);
    await writeFile(target, record, { encoding: "utf8", flag: "wx", mode: 0o600 });
    // Read it back before we authorize any deletion.
    const checked = JSON.parse(await readFile(target, "utf8"));
    if (checked.gameId !== id || checked.archive !== archive || checked.metadata !== metadata) {
      throw new Error("Backup verification failed for game " + id + "; no archives were deleted.");
    }
    backupBytes += Buffer.byteLength(record);
    backedUp.push({ id, metadata, archive, fileName });
  }
  const manifest = {
    generatedAt: new Date().toISOString(), databaseKeyPrefix: prefix,
    backupCount: backedUp.length, backupBytes,
    preserved: ["official-replay metadata", "lineups", "injuries", "Google Sheets stats"],
    gameIds: backedUp.map(({id}) => id)
  };
  const manifestFile = path.join(backupDir, "manifest.json");
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
  const checkedManifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (checkedManifest.backupCount !== backedUp.length || checkedManifest.gameIds.length !== backedUp.length)
    throw new Error("Backup manifest verification failed; no archives were deleted.");
  console.log(JSON.stringify({ backupComplete: true, backupDir, backedUp: backedUp.length, backupBytes }, null, 2));
  let deleted = 0, skippedChanged = 0;
  for (const { id, metadata, archive } of backedUp) {
    // A newly resaved or modified replay must not be deleted.
    const latestMetadata = await redis(["HGET", metaHash, id]);
    const latestArchive = await redis(["GET", prefix + id]);
    if (latestMetadata !== metadata || latestArchive !== archive) { skippedChanged++; continue; }
    const result = Number(await redis(["DEL", prefix + id])) || 0;
    if (result) deleted++; else alreadyMissing++;
  }
  console.log(JSON.stringify({
    deleted, alreadyMissing, skippedNewer, skippedChanged,
    backupDir, preservedMetadata: true, preservedLineups: true, preservedInjuries: true
  }, null, 2));
} else console.log("No changes made. Rerun with --apply to back up expired archives before removing them.");
