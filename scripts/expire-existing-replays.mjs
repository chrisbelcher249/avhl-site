// Apply seven-day retention to preexisting official replay archives that were
// saved before automatic TTLs were enabled. Read-only by default.
// Usage:
//   node scripts/expire-existing-replays.mjs
//   node scripts/expire-existing-replays.mjs --apply
//
// Does not modify metadata, statistics, injuries, lineups, or SNS URLs.
// The --apply mode only adds an expiration to archive keys currently lacking one.
import { officialReplayExpiryAt } from "../src/lib/replayRetention.js";

const REPLAY_META_HASH_KEY = "avhl:official-replay-meta:v1";
const REPLAY_KEY_PREFIX = "avhl:official-replay:v1:";
const url = (process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || "").replace(/\/+$/, "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
if (!url || !token) throw new Error("Upstash REST environment variables are missing.");
const apply = process.argv.includes("--apply");

async function redis(parts) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash returned HTTP ${response.status}`);
  const json = await response.json();
  if (json?.error) throw new Error(String(json.error));
  return json?.result;
}

function hashPairs(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return Object.entries(raw);
  const result = [];
  for (let i = 0; i + 1 < raw.length; i += 2) result.push([String(raw[i]), raw[i + 1]]);
  return result;
}

function expiryOf(value) {
  try {
    const metadata = typeof value === "string" ? JSON.parse(value) : value;
    return officialReplayExpiryAt(metadata);
  } catch {
    return null;
  }
}

const entries = hashPairs(await redis(["HGETALL", REPLAY_META_HASH_KEY]));
const targets = [];
let missing = 0, alreadyHasTtl = 0, expiredWithoutTtl = 0, invalidMetadata = 0;
for (const [id, value] of entries) {
  if (!/^[1-9]\d{0,3}$/.test(id) || Number(id) > 1640) continue;
  const expiryAt = expiryOf(value);
  if (expiryAt == null) { invalidMetadata++; continue; }
  const ttl = Number(await redis(["TTL", REPLAY_KEY_PREFIX + id]));
  if (ttl === -2) { missing++; continue; }
  if (ttl >= 0) { alreadyHasTtl++; continue; }
  if (ttl !== -1) throw new Error("Unexpected Redis TTL response for Game " + id + ": " + ttl);
  if (expiryAt <= Date.now()) {
    expiredWithoutTtl++;
    continue; // Backup/delete expired archives with the separate cleanup script.
  }
  targets.push({ id, value, expiryAt });
}
console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY_RUN",
  metadataEntries: entries.length,
  needingTtl: targets.length,
  alreadyHasTtl,
  missing,
  expiredWithoutTtl,
  invalidMetadata,
  exampleGameIds: targets.slice(0, 20).map((record) => record.id),
}, null, 2));

if (apply) {
  let applied = 0, changedOrExpired = 0, alreadyManaged = 0;
  for (const { id, value } of targets) {
    const current = await redis(["HGET", REPLAY_META_HASH_KEY, id]);
    if (current !== value) { changedOrExpired++; continue; }
    const currentExpiry = expiryOf(current);
    if (currentExpiry == null || currentExpiry <= Date.now()) {
      changedOrExpired++;
      continue;
    }
    // NX avoids overriding existing TTLs, even if an official game was
    // re-saved between the initial scan and now.
    const remaining = Math.max(1, Math.ceil((currentExpiry - Date.now()) / 1000));
    const changed = Number(await redis(["EXPIRE", REPLAY_KEY_PREFIX + id, remaining, "NX"]));
    if (changed === 1) {
      const actualTtl = Number(await redis(["TTL", REPLAY_KEY_PREFIX + id]));
      if (actualTtl < 0) throw new Error("Failed to verify TTL on replay " + id);
      applied++;
    } else if (changed === 0) {
      alreadyManaged++;
    } else {
      throw new Error("Unexpected EXPIRE result for replay " + id);
    }
  }
  console.log(JSON.stringify({
    expiryApplied: applied,
    alreadyManagedOrMissing: alreadyManaged,
    changedOrExpired,
    metadataUntouched: true,
    statsUntouched: true,
  }, null, 2));
} else {
  console.log("No changes made. Run with --apply only after reviewing this dry run.");
}
