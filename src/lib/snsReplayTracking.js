import { isSaturdayNightShowdown } from "./replayLinks.js";

const SNS_REPLAY_HASH_KEY = "avhl:sns-replay-first-seen:v1";

// The first time the website observes a new Replay URL in the live Schedule
// sheet, it records that URL and its timestamp in a small, durable Redis hash.
// A hash field cannot expire after seven days: keeping the timestamp prevents
// an old link from becoming visible again when someone revisits the schedule.
function redisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    "";
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

async function redisCommand(config, parts) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SNS replay tracking returned ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error);
  return payload?.result ?? null;
}

function parseHash(value) {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;
  const result = {};
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 2) {
      if (value[index] != null) result[String(value[index])] = value[index + 1];
    }
  }
  return result;
}

function safeUrl(value) {
  try {
    const parsed = new URL(String(value ?? "").trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function decodeRecord(value) {
  try {
    const record = typeof value === "string" ? JSON.parse(value) : value;
    return record && typeof record === "object" ? record : null;
  } catch {
    return null;
  }
}

// Only call when the live Google Sheets Schedule was successfully loaded.
// This is deliberately not part of official simulator replay storage, and
// does not change/delete the sheet's links, scores, statistics, or lineups.
export async function observeSnsReplayLinks(schedule) {
  const config = redisConfig();
  if (!config) throw new Error("SNS replay tracking requires persistent Redis storage.");

  const current = parseHash(await redisCommand(config, ["HGETALL", SNS_REPLAY_HASH_KEY]));
  const observed = {};

  for (const game of schedule) {
    if (!isSaturdayNightShowdown(game)) continue;
    const id = String(game.id);
    const url = safeUrl(game.replayUrl);
    const previous = decodeRecord(current[id]);

    if (!url) {
      // A removed URL resets its clock if it is subsequently re-added.
      if (current[id] != null) await redisCommand(config, ["HDEL", SNS_REPLAY_HASH_KEY, id]);
      continue;
    }

    if (previous?.url === url && Number.isFinite(Date.parse(previous.firstSeenAt))) {
      observed[id] = previous;
      continue;
    }

    const fresh = { url, firstSeenAt: new Date().toISOString() };
    const value = JSON.stringify(fresh);

    if (current[id] == null) {
      // Concurrent schedule page loads must not reset the first-seen clock.
      const created = await redisCommand(config, ["HSETNX", SNS_REPLAY_HASH_KEY, id, value]);
      if (Number(created) === 1) {
        observed[id] = fresh;
        continue;
      }
      const existing = decodeRecord(await redisCommand(config, ["HGET", SNS_REPLAY_HASH_KEY, id]));
      if (existing?.url === url && Number.isFinite(Date.parse(existing.firstSeenAt))) {
        observed[id] = existing;
        continue;
      }
    }

    // Changing the URL begins a new seven-day period.
    await redisCommand(config, ["HSET", SNS_REPLAY_HASH_KEY, id, value]);
    observed[id] = fresh;
  }

  return observed;
}
