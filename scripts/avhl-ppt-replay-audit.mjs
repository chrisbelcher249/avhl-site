import { gunzipSync } from "node:zlib";

const ids = Array.from({ length: 56 }, (_, i) => i + 201).filter((g) => g !== 221);
const fmt = (seconds) => {
  const rounded = Math.max(0, Math.floor((Number(seconds) || 0) + 0.5));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
};
function reconstruct(game, expectedGameId) {
  if (game.schema !== "avhl-official-replay-v1" || Number(game.gameId) !== expectedGameId) throw Error("Unexpected game replay schema or ID");
  const { homeId, awayId, finalSummary, matchupData, events } = game;
  if (!Array.isArray(events) || events.length < 2) throw Error("No events");
  const players = [...(finalSummary?.skaters?.[homeId] || []), ...(finalSummary?.skaters?.[awayId] || [])];
  if (players.length !== 36) throw Error(`Expected 36 skaters, saw ${players.length}`);
  const lookup = new Map(players.map((p) => [p.id, p]));
  const totals = new Map();
  let duration = 0, attributed = 0;
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1], curr = events[i];
    const a = prev.absoluteTime, b = curr.absoluteTime;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const dt = b - a; duration += dt;
    const s = prev.spatial || {};
    const carrier = s.puckCarrierId, team = s.possessionTeam;
    if (lookup.has(carrier) && (team === homeId || team === awayId) && (s.onIce?.[team] || []).includes(carrier)) {
      totals.set(carrier, (totals.get(carrier) || 0) + dt); attributed += dt;
    }
  }
  if (duration < 3300 || duration > 4000) throw Error(`Unexpected replay timeline duration ${duration}`);
  const out = [];
  for (const side of [homeId, awayId]) {
    const team = matchupData[side === homeId ? "home" : "away"].abbreviation;
    for (const p of finalSummary.skaters[side]) {
      const pid = String(p.avhlId || p.id).replace(/\D/g, "").padStart(4, "0").slice(-4);
      out.push(`${expectedGameId},${pid},${team},${fmt(totals.get(p.id) || 0)}`);
    }
  }
  return { out, duration: duration.toFixed(2), attributed: (100 * attributed / duration).toFixed(1) };
}
console.log("AVHL_PPT_BEGIN");
let ok = 0, errors = 0;
for (const n of ids) {
  try {
    const response = await fetch(`https://www.avhl.org/api/replay/${n}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const archive = typeof payload.archive === "string" ? JSON.parse(payload.archive) : payload.archive;
    if (!payload.ok || !archive?.data) throw Error("Archive missing");
    const bytes = Buffer.from(archive.data, "base64");
    const snapshot = JSON.parse((archive.encoding === "gzip-base64" ? gunzipSync(bytes) : bytes).toString("utf8"));
    const result = reconstruct(snapshot, n);
    for (const line of result.out) console.log(`AVHL_PPT_ROW,${line}`);
    console.log(`AVHL_PPT_AUDIT,${n},${result.out.length},${result.duration},${result.attributed}`);
    ok++;
  } catch (error) { errors++; console.log(`AVHL_PPT_ERROR,${n},${String(error?.message || error).replace(/[,\n]/g, " ")}`); }
}
console.log(`AVHL_PPT_DONE,${ok},${errors}`);
