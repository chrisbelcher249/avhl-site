import { teams } from "../../data/teams";
import { parseCsv, TRADE_SHEET_ID } from "./trades";

export const WAIVER_SHEET_GID = "290425403";
const WAIVER_CSV_URL = `https://docs.google.com/spreadsheets/d/${TRADE_SHEET_ID}/export?format=csv&gid=${WAIVER_SHEET_GID}`;
const teamByAbbreviation = new Map(teams.map((team) => [team.abbreviation, team]));

export function waiverPlayerKey(value) {
  return String(value || "").replace(/^\s*(?:F|D|G)\s+/i, "").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function getWaiverRecords() {
  try {
    const response = await fetch(WAIVER_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Waiver tracker returned HTTP ${response.status}`);
    const rows = parseCsv(await response.text());
    if (!rows.length) throw new Error("Waiver tracker has no header.");
    const headers = rows[0].map((cell) => String(cell || "").trim());
    const required = ["Team", "Player", "Outcome"];
    if (!required.every((name) => headers.includes(name))) throw new Error("Waiver tab must have Team, Player, and Outcome columns.");
    const field = (row, name) => String(row[headers.indexOf(name)] || "").trim();
    const records = rows.slice(1).map((row, index) => ({
      row: index + 2,
      team: field(row, "Team").toUpperCase(),
      player: field(row, "Player"),
      outcome: field(row, "Outcome"),
      claimedBy: headers.includes("Claimed By") ? field(row, "Claimed By").toUpperCase() : "",
    })).filter((entry) => entry.team && entry.player);
    return { records, error: null };
  } catch (error) {
    console.error("Unable to load AVHL waiver tracker", error);
    return { records: [], error: "The waiver tracker could not be loaded; cap obligations cannot be verified." };
  }
}

// The most recent manual row for a player/team is the active administrative decision.
// Prior rows are kept in the sheet for audit, rather than removed.
export function latestWaiverRecords(records) {
  const byKey = new Map();
  for (const record of records || []) byKey.set(`${record.team}:${waiverPlayerKey(record.player)}`, record);
  return [...byKey.values()];
}

export function applyWaiverOutcomes(players, records) {
  const warnings = [];
  const updated = (players || []).map((player) => ({ ...player }));
  const byName = new Map();
  for (const player of updated) {
    const key = waiverPlayerKey(player.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(player);
  }
  for (const record of latestWaiverRecords(records)) {
    const matches = byName.get(waiverPlayerKey(record.player)) || [];
    if (matches.length !== 1) {
      warnings.push(`Waivers row ${record.row}: player "${record.player}" is ${matches.length ? "ambiguous" : "not in the live roster"}.`);
      continue;
    }
    const player = matches[0];
    const original = teamByAbbreviation.get(record.team);
    if (!original) {
      warnings.push(`Waivers row ${record.row}: unknown originating team ${record.team}.`);
      continue;
    }
    if (record.outcome === "Claimed") {
      const destination = teamByAbbreviation.get(record.claimedBy);
      if (!destination || destination.abbreviation === original.abbreviation) {
        warnings.push(`Waivers row ${record.row}: Claimed requires a valid, different Claiming Team in "Claimed By".`);
        continue;
      }
      if (player.currentTeam === original.name || player.currentTeam === destination.name) {
        player.currentTeam = destination.name;
      } else {
        warnings.push(`Waivers row ${record.row}: live roster has ${player.name} on ${player.currentTeam}, not ${original.name}; ownership was not overridden.`);
      }
    }
    if (record.outcome === "Cleared") {
      if (player.currentTeam === original.name || player.currentTeam === "UFA") player.currentTeam = "UFA";
      else warnings.push(`Waivers row ${record.row}: ${player.name} is on ${player.currentTeam}; historical clearance was not applied to the current roster.`);
    }
  }
  return { players: updated, warnings };
}
