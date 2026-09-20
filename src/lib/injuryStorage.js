import fs from "node:fs/promises";
import path from "node:path";

const INJURY_HASH_KEY = "avhl:injuries:v1";
const DEV_FILE = path.join(process.cwd(), ".avhl-injuries.dev.json");

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
  if (!config) throw new Error("Persistent injury storage is not configured.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Injury storage returned ${response.status}.`);
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

export function injuryStorageStatus() {
  if (redisConfig()) return { configured: true, mode: "redis" };
  if (process.env.NODE_ENV !== "production") return { configured: true, mode: "development-file" };
  return { configured: false, mode: "unconfigured" };
}

export function injuryRecordKey(record) {
  const gameId = Number.parseInt(String(record?.officialGameId ?? ""), 10);
  const playerId = String(record?.playerId || "").trim();
  if (!Number.isInteger(gameId) || !playerId) return "";
  return `${gameId}:${playerId}`;
}

function parseRedisHash(value) {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;
  if (!Array.isArray(value)) return {};
  const output = {};
  for (let index = 0; index < value.length; index += 2) {
    if (value[index] == null) continue;
    output[String(value[index])] = value[index + 1];
  }
  return output;
}

export async function getInjuryRecords() {
  const status = injuryStorageStatus();
  if (!status.configured) return [];

  let raw;
  if (status.mode === "redis") raw = parseRedisHash(await redisCommand(["HGETALL", INJURY_HASH_KEY]));
  else raw = await readDevFile();

  return Object.entries(raw || {}).map(([key, value]) => {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      return parsed && typeof parsed === "object" ? { ...parsed, storageKey: parsed.storageKey || key } : null;
    } catch (error) {
      console.error(`Unable to parse injury record ${key}`, error);
      return null;
    }
  }).filter(Boolean);
}

export async function saveInjuryRecords(records) {
  const clean = (records || []).map((record) => {
    const key = injuryRecordKey(record);
    return key ? { ...record, storageKey: key } : null;
  }).filter(Boolean);
  if (!clean.length) return [];

  const status = injuryStorageStatus();
  if (!status.configured) throw new Error("Persistent injury storage is not configured.");

  if (status.mode === "redis") {
    const command = ["HSET", INJURY_HASH_KEY];
    for (const record of clean) command.push(record.storageKey, JSON.stringify(record));
    await redisCommand(command);
    return clean.map((record) => record.storageKey);
  }

  const data = await readDevFile();
  for (const record of clean) data[record.storageKey] = record;
  await writeDevFile(data);
  return clean.map((record) => record.storageKey);
}

export async function deleteInjuryRecords(keys) {
  const clean = [...new Set((keys || []).map((key) => String(key || "").trim()).filter(Boolean))];
  if (!clean.length) return;
  const status = injuryStorageStatus();
  if (!status.configured) return;

  if (status.mode === "redis") {
    await redisCommand(["HDEL", INJURY_HASH_KEY, ...clean]);
    return;
  }

  const data = await readDevFile();
  for (const key of clean) delete data[key];
  await writeDevFile(data);
}
