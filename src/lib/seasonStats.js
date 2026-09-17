import { teams } from "../../data/teams";

export const SEASON_STATS_SHEET_ID = "1oE_GTm72iMRlTAZBZTBw305vBWnGUeJfY7_fGvcWr5M";
export const SEASON_STATS_TABS = Object.freeze({
  schedule: "Schedule",
  team: "Team Stats",
  skater: "Skater Stats",
  goalie: "Goalie Stats",
});

const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation.toUpperCase(), team]));

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
}

export function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => String(value || "").trim());
  return rows.slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function tabCsvUrl(tabName) {
  return `https://docs.google.com/spreadsheets/d/${SEASON_STATS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

export async function fetchSeasonTab(tabName) {
  const response = await fetch(tabCsvUrl(tabName), { cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status} for ${tabName}`);
  const rows = parseCsv(await response.text());
  if (!rows.length) throw new Error(`${tabName} did not contain a header row`);
  return rowsToObjects(rows);
}

function number(value) {
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return 0;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value) {
  return Math.trunc(number(value));
}

function percentage(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const parsed = Number.parseFloat(text.replace("%", ""));
  if (!Number.isFinite(parsed)) return 0;
  return text.includes("%") ? parsed / 100 : parsed;
}

export function timeToSeconds(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number.parseFloat(text) || 0;
  const parts = text.split(":").map((part) => Number.parseFloat(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function secondsToTime(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function normalizePlayerId(value) {
  return String(value ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
}

function emptySkater(id, name = "") {
  return { id, name, team: "", pos: "", gp: 0, toiSeconds: 0, g: 0, a: 0, pts: 0, plusMinus: 0, s: 0, shootingPct: 0, ppToiSeconds: 0, pim: 0, hits: 0, ppg: 0, shg: 0, fot: 0, fow: 0, foPct: 0 };
}

function emptyGoalie(id, name = "") {
  return { id, name, team: "", gp: 0, toiSeconds: 0, sa: 0, sv: 0, svPct: 0, ga: 0, gaa: 0, eng: 0, pim: 0, g: 0, a: 0, pts: 0 };
}

export function aggregateSkaterRows(rows) {
  const index = new Map();
  for (const row of rows) {
    const id = normalizePlayerId(row["Player ID"]);
    if (!id || id === "0000") continue;
    const stat = index.get(id) || emptySkater(id, String(row.Name || "").trim());
    stat.name = String(row.Name || stat.name).trim();
    stat.team = String(row.Team || stat.team).trim().toUpperCase();
    stat.pos = String(row.Pos || stat.pos).trim();
    stat.gp += 1;
    stat.toiSeconds += timeToSeconds(row.Min);
    stat.g += integer(row.G);
    stat.a += integer(row.A);
    stat.pts += integer(row.PTS);
    stat.plusMinus += integer(row["+/-"]);
    stat.s += integer(row.S);
    stat.ppToiSeconds += timeToSeconds(row.PPT);
    stat.pim += integer(row.PIM);
    stat.hits += integer(row.Hits);
    stat.ppg += integer(row.PPG);
    stat.shg += integer(row.SHG);
    stat.fot += integer(row.FOT);
    stat.fow += integer(row.FOW);
    index.set(id, stat);
  }
  for (const stat of index.values()) {
    stat.shootingPct = stat.s ? stat.g / stat.s : 0;
    stat.foPct = stat.fot ? stat.fow / stat.fot : 0;
  }
  return index;
}

export function aggregateGoalieRows(rows) {
  const index = new Map();
  for (const row of rows) {
    const id = normalizePlayerId(row["Player ID"]);
    if (!id || id === "0000") continue;
    const stat = index.get(id) || emptyGoalie(id, String(row.Name || "").trim());
    stat.name = String(row.Name || stat.name).trim();
    stat.team = String(row.Team || stat.team).trim().toUpperCase();
    const toi = timeToSeconds(row.Min);
    if (toi > 0) stat.gp += 1;
    stat.toiSeconds += toi;
    stat.sa += integer(row.SA);
    stat.sv += integer(row.SV);
    stat.ga += integer(row.GA);
    stat.eng += integer(row.ENG);
    stat.pim += integer(row.PIM);
    stat.g += integer(row.G);
    stat.a += integer(row.A);
    stat.pts += integer(row.PTS);
    index.set(id, stat);
  }
  for (const stat of index.values()) {
    stat.svPct = stat.sa ? stat.sv / stat.sa : 0;
    stat.gaa = stat.toiSeconds ? (stat.ga * 3600) / stat.toiSeconds : 0;
  }
  return index;
}

export function aggregateTeamRows(rows) {
  const index = new Map();
  for (const row of rows) {
    const abbreviation = String(row.Team || "").trim().toUpperCase();
    if (!teamByAbbreviation[abbreviation]) continue;
    const stat = index.get(abbreviation) || {
      abbreviation, team: teamByAbbreviation[abbreviation], gp: 0, w: 0, l: 0, otl: 0,
      gf: 0, ga: 0, shots: 0, hits: 0, toaSeconds: 0, passingTotal: 0, passingGames: 0,
      faceoffsWon: 0, pim: 0, ppg: 0, ppo: 0, ppSeconds: 0, shg: 0, injuries: 0, manGamesLost: 0,
    };
    stat.gp += 1;
    const result = String(row.Result || "").trim().toUpperCase();
    const finish = String(row.Finish || "REG").trim().toUpperCase();
    if (result === "W") stat.w += 1;
    else if (result === "L" && (finish === "OT" || finish === "SO")) stat.otl += 1;
    else if (result === "L") stat.l += 1;
    stat.gf += integer(row.Score);
    stat.ga += integer(row["Opp Score"]);
    stat.shots += integer(row["Total Shots"]);
    stat.hits += integer(row.Hits);
    stat.toaSeconds += timeToSeconds(row["Time On Attack"]);
    const passPct = percentage(row.Passing);
    if (String(row.Passing ?? "").trim()) { stat.passingTotal += passPct; stat.passingGames += 1; }
    stat.faceoffsWon += integer(row["Faceoffs Won"]);
    stat.pim += integer(row["Penalty Minutes"]);
    const pp = String(row.Powerplays || "").split("/");
    stat.ppg += integer(pp[0]);
    stat.ppo += integer(pp[1]);
    stat.ppSeconds += timeToSeconds(row["Powerplay Minutes"]);
    stat.shg += integer(row["Shorthanded Goals"]);
    stat.injuries += integer(row.Injuries);
    stat.manGamesLost += integer(row["Man-Games Lost"]);
    index.set(abbreviation, stat);
  }
  for (const stat of index.values()) {
    stat.pts = stat.w * 2 + stat.otl;
    stat.shotsPerGame = stat.gp ? stat.shots / stat.gp : 0;
    stat.hitsPerGame = stat.gp ? stat.hits / stat.gp : 0;
    stat.gfPerGame = stat.gp ? stat.gf / stat.gp : 0;
    stat.gaPerGame = stat.gp ? stat.ga / stat.gp : 0;
    stat.passing = stat.passingGames ? stat.passingTotal / stat.passingGames : 0;
    stat.ppPct = stat.ppo ? stat.ppg / stat.ppo : 0;
  }
  return index;
}

export async function getSeasonStats() {
  try {
    const [teamRows, skaterRows, goalieRows] = await Promise.all([
      fetchSeasonTab(SEASON_STATS_TABS.team),
      fetchSeasonTab(SEASON_STATS_TABS.skater),
      fetchSeasonTab(SEASON_STATS_TABS.goalie),
    ]);
    return {
      teamRows, skaterRows, goalieRows,
      teams: aggregateTeamRows(teamRows),
      skaters: aggregateSkaterRows(skaterRows),
      goalies: aggregateGoalieRows(goalieRows),
      source: "live",
      error: null,
    };
  } catch (error) {
    console.error("Unable to load live 2026–27 AVHL statistics", error);
    return {
      teamRows: [], skaterRows: [], goalieRows: [],
      teams: new Map(), skaters: new Map(), goalies: new Map(),
      source: "unavailable",
      error: "Live 2026–27 statistics are temporarily unavailable.",
    };
  }
}

export function playerSeasonStat(stats, player) {
  const id = normalizePlayerId(player?.id);
  if (player?.role === "Goalie") return stats.goalies.get(id) || emptyGoalie(id, player?.name || "");
  return stats.skaters.get(id) || emptySkater(id, player?.name || "");
}

export function teamSeasonStat(stats, abbreviation) {
  const key = String(abbreviation || "").toUpperCase();
  return stats.teams.get(key) || {
    abbreviation: key, team: teamByAbbreviation[key] || null, gp: 0, w: 0, l: 0, otl: 0, pts: 0,
    gf: 0, ga: 0, shots: 0, hits: 0, toaSeconds: 0, passing: 0, faceoffsWon: 0, pim: 0,
    ppg: 0, ppo: 0, ppSeconds: 0, ppPct: 0, shg: 0, injuries: 0, manGamesLost: 0,
    shotsPerGame: 0, hitsPerGame: 0, gfPerGame: 0, gaPerGame: 0,
  };
}
