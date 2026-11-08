import { teams } from "../../data/teams.js";
import { parseCsv, TRADE_SHEET_ID } from "./trades.js";
import { waiverPlayerKey } from "./waivers.js";

export const SIGNINGS_SHEET_GID = "631921187";
export const SIGNINGS_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${TRADE_SHEET_ID}/export?format=csv&gid=${SIGNINGS_SHEET_GID}`;

const teamByCode = new Map(teams.map((team) => [team.abbreviation, team]));
const teamByFullName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));

export function signingTeam(value) {
  const text = String(value || "").trim();
  return teamByCode.get(text.toUpperCase()) || teamByFullName.get(text.toLowerCase()) || null;
}

export function signingAav(value) {
  const text = String(value ?? "").trim().replace(/[$,\s]/g, "");
  const match = text.match(/^(\d+(?:\.\d+)?)([mMkK])?$/);
  if (!match) return null;
  const multiplier = match[2]?.toLowerCase() === "m" ? 1_000_000
    : match[2]?.toLowerCase() === "k" ? 1_000 : 1;
  const amount = Math.round(Number(match[1]) * multiplier);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseSignings(rows = []) {
  const warnings = [];
  const headings = (rows[0] || []).map((cell) => String(cell || "").trim());
  for (const heading of ["Player", "Team", "Term", "AAV"]) {
    if (!headings.includes(heading)) throw new Error(`Missing required Signings column: ${heading}`);
  }
  const field = (row, name) => String(row[headings.indexOf(name)] ?? "").trim();
  const records = [];
  rows.slice(1).forEach((row, index) => {
    const player = field(row, "Player");
    const teamName = field(row, "Team");
    const termValue = field(row, "Term");
    const aavValue = field(row, "AAV");
    if (![player, teamName, termValue, aavValue].some(Boolean)) return;
    const rowNumber = index + 2;
    const team = signingTeam(teamName);
    const term = Number(termValue);
    const aav = signingAav(aavValue);
    if (!player || !team || !Number.isInteger(term) || term <= 0 || term > 20 ||
      aav === null || aav < 900_000 || aav > 20_000_000) {
      warnings.push(`Signings row ${rowNumber}: enter a player, valid AVHL team, term (1–20 years), and AAV ($900K–$20M).`);
      return;
    }
    records.push({
      row: rowNumber, player, team: team.abbreviation, term, aav,
      submittedAt: headings.includes("Submitted At") ? field(row, "Submitted At") : "",
      historical: headings.includes("Historical") && field(row, "Historical").toLowerCase() === "yes",
    });
  });
  return { records, warnings };
}

export async function getSignings() {
  try {
    const response = await fetch(SIGNINGS_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Signings sheet returned HTTP ${response.status}`);
    const rows = parseCsv(await response.text());
    if (!rows.length) throw new Error("The Signings sheet has no header row.");
    return { ...parseSignings(rows), error: null };
  } catch (error) {
    console.error("Unable to load AVHL signings", error);
    return { records: [], warnings: [], error: "Signings are temporarily unavailable; contract updates cannot be verified." };
  }
}

// Like waivers, these are derived website overlays. Never mutate the source
// player/contract workbook. A signing applies only when the live record is
// unassigned or already lists that team, preventing an old signing from
// reversing a later trade or contract change in the authoritative database.
export function applySignings(players = [], signings = []) {
  const updated = players.map((player) => ({ ...player }));
  const warnings = [];
  const byName = new Map();
  for (const player of updated) {
    const key = waiverPlayerKey(player.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(player);
  }
  for (const signing of signings) {
    // Historical records show past contracts without overwriting today's live player data.
    if (signing.historical) continue;
    const matches = byName.get(waiverPlayerKey(signing.player)) || [];
    const team = teamByCode.get(signing.team);
    if (matches.length !== 1 || !team) {
      warnings.push(`Signings row ${signing.row}: ${signing.player} could not be unambiguously matched to a player and team.`);
      continue;
    }
    const player = matches[0];
    if (player.currentTeam !== "UFA" && player.currentTeam !== team.name) {
      warnings.push(`Signings row ${signing.row}: ${player.name} is currently on ${player.currentTeam}, not ${team.name}; the older signing was not reapplied.`);
      continue;
    }
    if (player.signedContract && player.signedContract.row === signing.row) continue;
    if (!player.signedContract && player.currentTeam === team.name && player.aav === signing.aav && player.yearsLeft === signing.term) continue;
    const original = { team: player.currentTeam, aav: player.aav, yearsLeft: player.yearsLeft };
    player.currentTeam = team.name;
    player.aav = signing.aav;
    player.yearsLeft = signing.term;
    player.signedContract = { ...signing, previous: original };
  }
  return { players: updated, warnings };
}
