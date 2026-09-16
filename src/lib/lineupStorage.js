import fs from "node:fs/promises";
import path from "node:path";

const KEY_PREFIX = "avhl:lineup:v1:";
const DEV_FILE = path.join(process.cwd(), ".avhl-lineups.dev.json");

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

async function redisCommand(command) {
  const config = redisConfig();
  if (!config) throw new Error("Persistent lineup storage is not configured.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Lineup storage returned ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error);
  return payload?.result ?? null;
}

async function readDevFile() {
  try {
    return JSON.parse(await fs.readFile(DEV_FILE, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function writeDevFile(data) {
  await fs.writeFile(DEV_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function lineupStorageStatus() {
  if (redisConfig()) return { configured: true, mode: "redis" };
  if (process.env.NODE_ENV !== "production") return { configured: true, mode: "development-file" };
  return { configured: false, mode: "unconfigured" };
}

export async function getSavedLineup(abbreviation) {
  const key = `${KEY_PREFIX}${String(abbreviation || "").toUpperCase()}`;
  const config = redisConfig();
  if (config) {
    const value = await redisCommand(["GET", key]);
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  }
  if (process.env.NODE_ENV !== "production") {
    const data = await readDevFile();
    return data[String(abbreviation || "").toUpperCase()] ?? null;
  }
  return null;
}

export async function getSavedLineups(abbreviations) {
  const codes = [...new Set((abbreviations || []).map((value) => String(value || "").toUpperCase()).filter(Boolean))];
  if (!codes.length) return {};
  const config = redisConfig();
  if (config) {
    const values = await redisCommand(["MGET", ...codes.map((code) => `${KEY_PREFIX}${code}`)]);
    if (!Array.isArray(values)) throw new Error("Lineup storage returned an invalid MGET response.");
    const result = {};
    codes.forEach((code, index) => {
      const value = values[index];
      if (!value) return;
      try {
        result[code] = typeof value === "string" ? JSON.parse(value) : value;
      } catch (error) {
        console.error(`Unable to parse saved lineup for ${code}`, error);
        throw new Error(`Saved lineup data for ${code} is unreadable.`);
      }
    });
    return result;
  }
  if (process.env.NODE_ENV !== "production") {
    const data = await readDevFile();
    return Object.fromEntries(codes.filter((code) => data[code]).map((code) => [code, data[code]]));
  }
  return {};
}

export async function saveLineupIfRevision(abbreviation, lineup, expectedRevision) {
  const code = String(abbreviation || "").toUpperCase();
  const expected = Number(expectedRevision);
  if (!Number.isInteger(expected) || expected < 0) throw new Error("Expected lineup revision is invalid.");

  const status = lineupStorageStatus();
  if (!status.configured) throw new Error("Persistent lineup storage is not configured.");

  if (status.mode === "redis") {
    // Compare the stored revision and write the replacement in one Redis Lua
    // operation. A separate GET followed by SET would still allow two tabs to
    // race between those commands and both overwrite the same revision.
    const script = `
      local current = redis.call("GET", KEYS[1])
      local revision = 0
      if current then
        local ok, decoded = pcall(cjson.decode, current)
        if not ok or type(decoded) ~= "table" then
          return {-2, 0}
        end
        revision = tonumber(decoded["revision"]) or 0
      end
      if revision ~= tonumber(ARGV[1]) then
        return {0, revision}
      end
      redis.call("SET", KEYS[1], ARGV[2])
      return {1, revision + 1}
    `;
    const result = await redisCommand([
      "EVAL",
      script,
      1,
      `${KEY_PREFIX}${code}`,
      String(expected),
      JSON.stringify(lineup),
    ]);
    if (!Array.isArray(result) || result.length < 2) {
      throw new Error("Lineup storage returned an invalid compare-and-save response.");
    }
    const statusCode = Number(result[0]);
    const currentRevision = Math.max(0, Number(result[1]) || 0);
    if (statusCode === -2) throw new Error(`Saved lineup data for ${code} is unreadable.`);
    if (statusCode === 0) return { saved: false, currentRevision };
    if (statusCode !== 1) throw new Error("Lineup storage returned an unknown compare-and-save status.");
    return { saved: true, currentRevision: expected + 1, lineup };
  }

  // Local development uses a file instead of Redis. Re-check the revision just
  // before writing so dev behavior matches production conflict handling.
  const data = await readDevFile();
  const currentRevision = Math.max(0, Number(data[code]?.revision) || 0);
  if (currentRevision !== expected) return { saved: false, currentRevision };
  data[code] = lineup;
  await writeDevFile(data);
  return { saved: true, currentRevision: expected + 1, lineup };
}
