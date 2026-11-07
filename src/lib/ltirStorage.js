import fs from "node:fs/promises";
import path from "node:path";

const HASH_KEY = "avhl:ltir-designations:v1";
const DEV_FILE = path.join(process.cwd(), ".avhl-ltir.dev.json");

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function ltirStorageStatus() {
  if (redisConfig()) return { configured: true, mode: "redis" };
  if (process.env.NODE_ENV !== "production") return { configured: true, mode: "development-file" };
  return { configured: false, mode: "unconfigured" };
}

async function command(parts) {
  const config = redisConfig();
  if (!config) throw new Error("Persistent LTIR storage is unavailable.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(parts),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LTIR storage returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result?.error) throw new Error(result.error);
  return result?.result ?? null;
}

function parseHash(value) {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;
  const output = {};
  for (let index = 0; index < value.length; index += 2) {
    if (value[index] != null) output[String(value[index])] = value[index + 1];
  }
  return output;
}

async function devRecords() {
  try { return JSON.parse(await fs.readFile(DEV_FILE, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return {}; throw error; }
}

export async function getLtirDesignations() {
  const storage = ltirStorageStatus();
  if (!storage.configured) return [];
  const hash = storage.mode === "redis" ? parseHash(await command(["HGETALL", HASH_KEY])) : await devRecords();
  return Object.entries(hash).flatMap(([playerId, value]) => {
    try {
      const record = typeof value === "string" ? JSON.parse(value) : value;
      return record && typeof record === "object" && String(record.playerId) === playerId ? [record] : [];
    } catch (error) {
      console.error("Malformed LTIR designation", playerId, error);
      return [];
    }
  });
}

export async function saveLtirDesignation(record) {
  if (!ltirStorageStatus().configured) throw new Error("Persistent LTIR storage is unavailable.");
  const playerId = String(record.playerId || "").trim();
  if (!/^\d+$/.test(playerId)) throw new Error("Invalid player identifier.");
  const data = { ...record, playerId };
  const status = ltirStorageStatus();
  if (status.mode === "redis") await command(["HSET", HASH_KEY, playerId, JSON.stringify(data)]);
  else {
    const current = await devRecords();
    current[playerId] = data;
    await fs.writeFile(DEV_FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  }
  return data;
}
