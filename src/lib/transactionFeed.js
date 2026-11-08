import { teamByAbbreviation } from "../../data/teams.js";

const HASH = "avhl:transaction-feed:v1";
const tradingTeams = (trade) => [trade.teamA, trade.teamB, trade.teamC].filter(Boolean);
const isoNow = () => new Date().toISOString();

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

function parseHash(raw) {
  if (!raw) return {};
  if (raw && !Array.isArray(raw) && typeof raw === "object") return raw;
  const result = {};
  for (let i = 0; i < raw.length; i += 2) result[String(raw[i])] = raw[i + 1];
  return result;
}

async function redisRequest(parts) {
  const config = redisConfig();
  if (!config) throw new Error("Transaction journal Redis is unavailable.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(parts), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Transaction journal Redis returned ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

async function persistNewAndChanged(previous, events) {
  const config = redisConfig();
  if (!config) return;
  const now = isoNow();
  const pending = [];
  for (const event of events) {
    let prior;
    try { prior = previous[event.id] ? JSON.parse(previous[event.id]) : null; } catch { prior = null; }
    const stored = { ...event, loggedAt: prior?.loggedAt || now };
    if (!prior || JSON.stringify(prior) !== JSON.stringify(stored)) {
      pending.push(["HSET", HASH, event.id, JSON.stringify(stored)]);
    }
    previous[event.id] = JSON.stringify(stored);
  }
  if (!pending.length) return;
  // One network round trip even if several waiver/signing rows were just added.
  const result = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(pending), cache: "no-store",
  });
  if (!result.ok) throw new Error(`Transaction journal write returned ${result.status}`);
  const replies = await result.json();
  if (!Array.isArray(replies) || replies.some((reply) => reply.error)) {
    throw new Error("Transaction journal failed to save one or more entries.");
  }
}

function candidatesFromSheets(waivers = [], signings = []) {
  const items = [];
  for (const signing of signings) {
    items.push({
      id: `signing-${signing.row}`, type: "signing", player: signing.player,
      team: signing.team, teams: [signing.team], term: signing.term,
      aav: signing.aav, sheetRow: signing.row,
    });
  }
  for (const waiver of waivers) {
    const type = waiver.outcome === "Claimed" ? "claim"
      : waiver.outcome === "Cleared" ? "release"
      : waiver.outcome === "On Waivers" ? "waiver" : null;
    if (!type) continue;
    // The waiver listing is itself a transaction, even when the first import
    // happens after the claim window has already closed.
    items.push({
      id: `waiver-${waiver.row}-waiver`, type: "waiver", player: waiver.player,
      team: waiver.team, teams: [waiver.team], claimedBy: "",
      sheetRow: waiver.row,
    });
    if (type !== "waiver") items.push({
      id: `waiver-${waiver.row}-${type}`, type, player: waiver.player,
      team: waiver.team, teams: [waiver.team, ...(type === "claim" && waiver.claimedBy ? [waiver.claimedBy] : [])],
      claimedBy: waiver.claimedBy || "", sheetRow: waiver.row,
    });
  }
  return items;
}

function parseDate(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function buildTransactionFeed(trades = [], waivers = [], signings = []) {
  const candidates = candidatesFromSheets(waivers, signings);
  let archive = {};
  let journalWarning = null;
  try {
    if (!redisConfig()) throw new Error("Redis is not configured.");
    archive = parseHash(await redisRequest(["HGETALL", HASH]));
    await persistNewAndChanged(archive, candidates);
  } catch (error) {
    console.error("AVHL transactions journal temporarily unavailable", error);
    journalWarning = "Transaction history storage is unavailable. Current entries are displayed, but previous waiver stages may not be retained.";
  }
  const seen = {};
  for (const raw of Object.values(archive)) {
    try {
      const event = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (event?.id && ["signing", "waiver", "claim", "release"].includes(event.type)) seen[event.id] = event;
    } catch { /* Skip malformed archived entries rather than breaking the feed. */ }
  }
  // Keep current entries visible even if persistence cannot be reached.
  for (const event of candidates) if (!seen[event.id]) seen[event.id] = { ...event, loggedAt: null };

  const records = Object.values(seen).map((event) => ({
    ...event,
    date: event.loggedAt || null,
    dateKind: "logged",
    sortAt: parseDate(event.loggedAt),
  }));
  for (const trade of trades) {
    records.push({
      id: `trade-${trade.number}`, type: "trade", trade, teams: tradingTeams(trade),
      date: trade.date, dateKind: "official", sortAt: parseDate(trade.date),
      player: "", sheetRow: Number(trade.number) || 0,
    });
  }
  records.sort((a, b) => {
    const at = a.sortAt ?? -1, bt = b.sortAt ?? -1;
    return bt - at || (b.sheetRow || 0) - (a.sheetRow || 0) || a.id.localeCompare(b.id);
  });
  return { records, warning: journalWarning };
}

export function transactionSearchText(item) {
  const names = (item.teams || []).flatMap((code) => {
    const team = teamByAbbreviation[code];
    return [code, team?.name, team?.nickname, team?.city].filter(Boolean);
  });
  const trade = item.trade;
  return [...names, item.player,
    trade?.teamAReceives, trade?.teamBReceives, trade?.teamCReceives, trade?.salaryRetention,
    item.type].filter(Boolean).join(" ").toLowerCase();
}
