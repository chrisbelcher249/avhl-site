import { teams } from "../../data/teams";
import { waiverPlayerKey, latestWaiverRecords } from "./waivers";

const teamCodes = new Set(teams.map((team) => team.abbreviation));
const retentionPattern = /^(?:[FDG]\s+)?(.+?)\s*[—–-]\s*([A-Z]{2,4})\s+retains\s+(\d+(?:\.\d+)?)%\s*(of\s+remaining)?\s*$/i;

function byUniqueName(players) {
  const index = new Map();
  for (const player of players) {
    const key = waiverPlayerKey(player.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(player);
  }
  return index;
}

export function computeCapObligations(players = [], trades = [], waivers = []) {
  const warnings = [];
  const names = byUniqueName(players);
  const retainedByPlayer = {};
  const retainedByTeam = {};
  const deadCapByTeam = {};
  const ledger = [];

  function resolve(name, kind) {
    const found = names.get(waiverPlayerKey(name)) || [];
    if (found.length !== 1) {
      warnings.push(`${kind}: "${name}" ${found.length ? "has multiple matching players" : "does not match a player"}; check the official AVHL name.`);
      return null;
    }
    return found[0];
  }

  // Each retention event is a percentage of the transferring team's then-current
  // obligation, not of the player's original AAV. Maximum two events per contract.
  for (const trade of [...trades].sort((a, b) => a.number - b.number)) {
    if (!String(trade.salaryRetention || "").trim()) continue;
    const entries = trade.salaryRetention.split(/[;\n]+/).map((value) => value.trim()).filter(Boolean);
    for (const text of entries) {
      const match = text.match(retentionPattern);
      if (!match) {
        warnings.push(`Trade #${trade.number}: invalid retention entry "${text}". Use "F Name — ARI retains 50%".`);
        continue;
      }
      const [, name, rawTeam, rawPercent, ofRemaining] = match;
      const team = rawTeam.toUpperCase();
      const rate = Number(rawPercent) / 100;
      if (!teamCodes.has(team) || !(rate > 0 && rate <= 0.5)) {
        warnings.push(`Trade #${trade.number}: retaining team or percentage invalid in "${text}" (limit 50%).`);
        continue;
      }
      const player = resolve(name, `Trade #${trade.number}`);
      if (!player || !(player.aav > 0)) {
        if (player) warnings.push(`Trade #${trade.number}: original salary unavailable for ${name}.`);
        continue;
      }
      const existing = retainedByPlayer[player.id] || { total: 0, entries: [] };
      if (existing.entries.length >= 2) {
        warnings.push(`Trade #${trade.number}: ${name} already has two retention events; additional retention rejected.`);
        continue;
      }
      if (existing.entries.length && !ofRemaining) {
        warnings.push(`Trade #${trade.number}: second retention for ${name} must specify "of remaining".`);
        continue;
      }
      if (existing.entries.some((item) => item.team === team)) {
        warnings.push(`Trade #${trade.number}: the same team cannot retain another share of ${name}'s contract.`);
        continue;
      }
      if (existing.total + rate * (player.aav - existing.total) >= player.aav) {
        warnings.push(`Trade #${trade.number}: retention would leave no salary obligation with the acquiring team.`);
        continue;
      }
      const amount = Math.round((player.aav - existing.total) * rate);
      existing.total += amount;
      existing.entries.push({ team, amount, percentage: rate * 100, tradeNumber: trade.number });
      retainedByPlayer[player.id] = existing;
      retainedByTeam[team] = (retainedByTeam[team] || 0) + amount;
      ledger.push({ type: "retained", team, playerId: player.id, playerName: player.name, annualCharge: amount, yearsLeft: player.yearsLeft, tradeNumber: trade.number });
    }
  }

  for (const record of latestWaiverRecords(waivers)) {
    if (record.outcome !== "Cleared") continue;
    if (!teamCodes.has(record.team)) {
      warnings.push(`Waivers row ${record.row}: unknown waiving team ${record.team}.`);
      continue;
    }
    const player = resolve(record.player, `Waivers row ${record.row}`);
    if (!player) continue;
    // A historical clearance must not penalize a team if the player has
    // subsequently joined another franchise on a new contract.
    if (player.currentTeam !== "UFA") {
      warnings.push(`Waivers row ${record.row}: ${player.name} is currently on ${player.currentTeam}; verify release history before assessing dead cap.`);
      continue;
    }
    if (!(player.aav > 0) || !(player.yearsLeft > 0)) {
      warnings.push(`Waivers row ${record.row}: cannot determine ${player.name}'s contract salary and remaining term.`);
      continue;
    }
    const currentShare = Math.max(0, player.aav - (retainedByPlayer[player.id]?.total || 0));
    const annualCharge = Math.round(currentShare * 0.25);
    deadCapByTeam[record.team] = (deadCapByTeam[record.team] || 0) + annualCharge;
    ledger.push({ type: "release", team: record.team, playerId: player.id, playerName: player.name, annualCharge, yearsLeft: player.yearsLeft, waiverRow: record.row });
  }

  return { retainedByPlayer, retainedByTeam, deadCapByTeam, ledger, warnings };
}

export function playerOwnerCapShare(player, obligations) {
  if (!player || !Number.isFinite(player.aav)) return 0;
  return Math.max(0, player.aav - (obligations?.retainedByPlayer?.[player.id]?.total || 0));
}
