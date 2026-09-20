import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const REPLAY_META_HASH_KEY = "avhl:official-replay-meta:v1";
const REPLAY_KEY_PREFIX = "avhl:official-replay:v1:";
const DEV_FILE = path.join(process.cwd(), ".avhl-replays.dev.json");
const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_JSON_BYTES = 24 * 1024 * 1024;

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
  if (!config) throw new Error("Persistent replay storage is not configured.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Replay storage returned ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error);
  return payload?.result ?? null;
}

async function readDevFile() {
  try {
    const parsed = JSON.parse(await fs.readFile(DEV_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { meta: {}, archives: {} };
  } catch (error) {
    if (error?.code === "ENOENT") return { meta: {}, archives: {} };
    throw error;
  }
}

async function writeDevFile(data) {
  await fs.writeFile(DEV_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

function cleanGameId(value) {
  const gameId = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(gameId) && gameId >= 1 && gameId <= 1640 ? gameId : null;
}

function snapshotFromArchive(archive) {
  if (!archive || typeof archive !== "object") throw new Error("Official replay data was not supplied.");
  const encoding = String(archive.encoding || "");
  const data = String(archive.data || "");
  if (!data) throw new Error("Official replay archive is empty.");

  let bytes;
  try {
    bytes = Buffer.from(data, "base64");
  } catch {
    throw new Error("Official replay archive could not be decoded.");
  }
  if (!bytes.length || bytes.length > MAX_COMPRESSED_BYTES) throw new Error("Official replay archive is too large.");

  let jsonBytes;
  if (encoding === "gzip-base64") {
    try {
      jsonBytes = gunzipSync(bytes, { maxOutputLength: MAX_JSON_BYTES });
    } catch {
      throw new Error("Official replay archive could not be decompressed.");
    }
  } else if (encoding === "json-base64") {
    jsonBytes = bytes;
  } else {
    throw new Error("Official replay archive uses an unsupported encoding.");
  }

  if (jsonBytes.length > MAX_JSON_BYTES) throw new Error("Official replay snapshot is too large.");
  try {
    return JSON.parse(jsonBytes.toString("utf8"));
  } catch {
    throw new Error("Official replay snapshot is not valid JSON.");
  }
}

export function replayStorageStatus() {
  if (redisConfig()) return { configured: true, mode: "redis" };
  if (process.env.NODE_ENV !== "production") return { configured: true, mode: "development-file" };
  return { configured: false, mode: "unconfigured" };
}

export function validateReplayArchive({ gameId, archive, packet, scheduledAway, scheduledHome }) {
  const number = cleanGameId(gameId);
  if (!number) throw new Error("Official replay Game # is invalid.");
  const snapshot = snapshotFromArchive(archive);
  if (snapshot?.schema !== "avhl-official-replay-v1") throw new Error("Official replay snapshot schema is invalid.");
  if (Number(snapshot.gameId) !== number) throw new Error("Official replay snapshot Game # does not match the scheduled game.");
  if (!Array.isArray(snapshot.events) || snapshot.events.length < 2 || snapshot.events.at(-1)?.type !== "final") {
    throw new Error("Official replay snapshot is missing its completed event timeline.");
  }
  if (!snapshot?.matchupData?.home || !snapshot?.matchupData?.away || !snapshot?.finalSummary) {
    throw new Error("Official replay snapshot is missing its frozen rosters or final summary.");
  }

  const awayAbbreviation = String(snapshot.matchupData.away.abbreviation || "").toUpperCase();
  const homeAbbreviation = String(snapshot.matchupData.home.abbreviation || "").toUpperCase();
  if (awayAbbreviation !== String(scheduledAway || "").toUpperCase() || homeAbbreviation !== String(scheduledHome || "").toUpperCase()) {
    throw new Error("Official replay snapshot matchup does not match the official schedule.");
  }
  if (String(snapshot.simGameId || "") !== String(packet?.simGameId || "")) throw new Error("Official replay snapshot identity does not match the submitted game.");
  if (Number(snapshot.seed) !== Number(packet?.seed)) throw new Error("Official replay seed does not match the submitted game.");
  if (String(snapshot.simulatorVersion || "") !== String(packet?.simulatorVersion || "")) throw new Error("Official replay simulator version does not match the submitted game.");

  const snapshotAwayId = snapshot.awayId || snapshot.matchupData.away.id;
  const snapshotHomeId = snapshot.homeId || snapshot.matchupData.home.id;
  const snapshotAwayScore = Number(snapshot.finalSummary?.score?.[snapshotAwayId]);
  const snapshotHomeScore = Number(snapshot.finalSummary?.score?.[snapshotHomeId]);
  if (snapshotAwayScore !== Number(packet?.away?.score) || snapshotHomeScore !== Number(packet?.home?.score)) {
    throw new Error("Official replay final score does not match the submitted game.");
  }

  return snapshot;
}

export async function saveOfficialReplay({ gameId, archive, metadata }) {
  const number = cleanGameId(gameId);
  if (!number) throw new Error("Official replay Game # is invalid.");
  const status = replayStorageStatus();
  if (!status.configured) throw new Error("Persistent replay storage is not configured.");
  const key = String(number);
  const archiveValue = JSON.stringify(archive);
  const metaValue = JSON.stringify({ ...metadata, gameId: number, schema: "avhl-official-replay-meta-v1" });

  if (status.mode === "redis") {
    await redisCommand(["SET", `${REPLAY_KEY_PREFIX}${key}`, archiveValue]);
    try {
      await redisCommand(["HSET", REPLAY_META_HASH_KEY, key, metaValue]);
    } catch (error) {
      await redisCommand(["DEL", `${REPLAY_KEY_PREFIX}${key}`]).catch(() => {});
      throw error;
    }
    return key;
  }

  const data = await readDevFile();
  data.meta ||= {};
  data.archives ||= {};
  data.meta[key] = JSON.parse(metaValue);
  data.archives[key] = archive;
  await writeDevFile(data);
  return key;
}

export async function deleteOfficialReplay(gameId) {
  const number = cleanGameId(gameId);
  if (!number) return;
  const status = replayStorageStatus();
  if (!status.configured) return;
  const key = String(number);
  if (status.mode === "redis") {
    await Promise.all([
      redisCommand(["DEL", `${REPLAY_KEY_PREFIX}${key}`]),
      redisCommand(["HDEL", REPLAY_META_HASH_KEY, key]),
    ]);
    return;
  }
  const data = await readDevFile();
  if (data.meta) delete data.meta[key];
  if (data.archives) delete data.archives[key];
  await writeDevFile(data);
}

export async function getReplayMetadataMap() {
  const status = replayStorageStatus();
  if (!status.configured) return {};
  let raw;
  if (status.mode === "redis") raw = parseRedisHash(await redisCommand(["HGETALL", REPLAY_META_HASH_KEY]));
  else raw = (await readDevFile()).meta || {};
  const output = {};
  for (const [key, value] of Object.entries(raw || {})) {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (parsed && typeof parsed === "object") output[key] = parsed;
    } catch (error) {
      console.error(`Unable to parse replay metadata ${key}`, error);
    }
  }
  return output;
}

export async function getReplayMetadata(gameId) {
  const number = cleanGameId(gameId);
  if (!number) return null;
  const status = replayStorageStatus();
  if (!status.configured) return null;
  const key = String(number);
  if (status.mode === "redis") {
    const value = await redisCommand(["HGET", REPLAY_META_HASH_KEY, key]);
    if (!value) return null;
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      throw new Error(`Official replay metadata ${number} is corrupted.`);
    }
  }
  return (await readDevFile()).meta?.[key] || null;
}

export async function getOfficialReplay(gameId) {
  const number = cleanGameId(gameId);
  if (!number) return null;
  const status = replayStorageStatus();
  if (!status.configured) return null;
  const key = String(number);
  if (status.mode === "redis") {
    const [archiveValue, metaValue] = await Promise.all([
      redisCommand(["GET", `${REPLAY_KEY_PREFIX}${key}`]),
      redisCommand(["HGET", REPLAY_META_HASH_KEY, key]),
    ]);
    if (!archiveValue) return null;
    try {
      return {
        archive: typeof archiveValue === "string" ? JSON.parse(archiveValue) : archiveValue,
        metadata: metaValue ? (typeof metaValue === "string" ? JSON.parse(metaValue) : metaValue) : null,
      };
    } catch {
      throw new Error(`Official replay ${number} is corrupted.`);
    }
  }
  const data = await readDevFile();
  if (!data.archives?.[key]) return null;
  return { archive: data.archives[key], metadata: data.meta?.[key] || null };
}
