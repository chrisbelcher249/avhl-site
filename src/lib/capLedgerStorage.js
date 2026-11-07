import fs from "node:fs/promises";
import path from "node:path";
import { latestWaiverRecords, waiverPlayerKey } from "./waivers";

const HASH_KEY = "avhl:dead-cap:v1";
const DEV_FILE = path.join(process.cwd(), ".avhl-dead-cap.dev.json");

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

function mode() {
  if (redis()) return "redis";
  return process.env.NODE_ENV === "production" ? "unavailable" : "file";
}

async function execute(parts) {
  const config = redis();
  if (!config) throw new Error("Persistent dead-cap ledger is unavailable.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(parts), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Dead-cap ledger returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error);
  return payload?.result;
}

function parseHash(value) {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;
  const output = {};
  for (let i = 0; i < value.length; i += 2) if (value[i] != null) output[String(value[i])] = value[i + 1];
  return output;
}

async function readRecords() {
  if (mode() === "unavailable") throw new Error("Persistent dead-cap ledger is unavailable.");
  if (mode() === "redis") return parseHash(await execute(["HGETALL", HASH_KEY]));
  try { return JSON.parse(await fs.readFile(DEV_FILE, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return {}; throw error; }
}

async function writeOnce(key, record) {
  if (mode() === "redis") {
    await execute(["HSETNX", HASH_KEY, key, JSON.stringify(record)]);
    return;
  }
  const current = await readRecords();
  if (!current[key]) {
    current[key] = record;
    await fs.writeFile(DEV_FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  }
}

function seasonStartYear(today = new Date()) {
  const month = today.getUTCMonth() + 1;
  return month >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
}

export async function reconcileDeadCapLedger(releases = [], waiverRecords = []) {
  const currentSeasonYear = seasonStartYear();
  const activeRows = new Map(
    latestWaiverRecords(waiverRecords).filter((record) => record.outcome === "Cleared")
      .map((record) => [String(record.row), record]),
  );
  // On the first confirmed release, freeze the salary share and remaining term.
  // Future changes to a player's roster, AAV, and contract years cannot change
  // this recorded liability. The original contract document is never edited.
  for (const release of releases.filter((entry) => entry.type === "release")) {
    const raw = activeRows.get(String(release.waiverRow));
    if (!raw) continue;
    const key = `waiver-row-${release.waiverRow}`;
    await writeOnce(key, {
      key,
      playerId: String(release.playerId),
      playerName: release.playerName,
      team: release.team,
      annualCharge: release.annualCharge,
      originalRemainingSeasons: release.yearsLeft,
      startsSeasonYear: currentSeasonYear,
      expiresAfterSeasonYear: currentSeasonYear + release.yearsLeft - 1,
      waiverRow: release.waiverRow,
      recordedAt: new Date().toISOString(),
    });
  }
  const stored = await readRecords();
  const deadCapByTeam = {};
  const activeLedger = [];
  const warnings = [];
  for (const [key, encoded] of Object.entries(stored)) {
    let record;
    try { record = typeof encoded === "string" ? JSON.parse(encoded) : encoded; }
    catch { warnings.push(`Malformed saved dead-cap entry: ${key}`); continue; }
    const row = activeRows.get(String(record.waiverRow));
    if (!row || row.team !== record.team || waiverPlayerKey(row.player) !== waiverPlayerKey(record.playerName)) continue;
    if (record.expiresAfterSeasonYear < currentSeasonYear) continue;
    if (!Number.isFinite(record.annualCharge) || record.annualCharge < 0) {
      warnings.push(`Invalid saved dead-cap amount for ${record.playerName}.`);
      continue;
    }
    deadCapByTeam[record.team] = (deadCapByTeam[record.team] || 0) + record.annualCharge;
    activeLedger.push({ ...record, type: "release", yearsLeft: record.expiresAfterSeasonYear - currentSeasonYear + 1 });
  }
  return { deadCapByTeam, activeLedger, warnings };
}
