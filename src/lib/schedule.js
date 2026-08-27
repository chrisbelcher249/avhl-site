import { schedule as fallbackSchedule } from "../../data/schedule";
import { teams } from "../../data/teams";

export const SCHEDULE_SHEET_ID = "1dyD6lh5CwO6ODeoJztKEwo3Xxm0mctmHf75V2DBJ0MI";
export const SCHEDULE_SHEET_GID = "0";
export const SCHEDULE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SCHEDULE_SHEET_ID}/export?format=csv&gid=${SCHEDULE_SHEET_GID}`;

const teamByName = Object.fromEntries(teams.map((team) => [team.name.toLowerCase(), team]));

function parseCsv(text) {
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
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function integer(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function score(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function overtime(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (["yes", "y", "true", "1", "ot", "overtime", "so", "shootout"].includes(text)) return true;
  if (["no", "n", "false", "0", "reg", "regulation"].includes(text)) return false;
  return null;
}

function isoDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return text;
  let [, month, day, year] = match;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function requiredIndex(headers, name) {
  const index = headers.indexOf(name);
  if (index < 0) throw new Error(`Schedule sheet is missing ${name}`);
  return index;
}

export async function getSchedule() {
  try {
    const response = await fetch(SCHEDULE_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);

    const csv = await response.text();
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error("Schedule sheet did not contain game rows");

    const headers = rows[0].map((header) => String(header || "").trim());
    const gameIdIndex = requiredIndex(headers, "Game ID");
    const dayIndex = requiredIndex(headers, "Day");
    const dateIndex = requiredIndex(headers, "Date");
    const awayTeamIndex = requiredIndex(headers, "Away Team");
    const homeTeamIndex = requiredIndex(headers, "Home Team");
    const awayScoreIndex = requiredIndex(headers, "Away Score");
    const homeScoreIndex = requiredIndex(headers, "Home Score");
    const overtimeIndex = requiredIndex(headers, "OT?");

    const games = rows.slice(1).map((row, index) => {
      const awayName = String(row[awayTeamIndex] || "").trim();
      const homeName = String(row[homeTeamIndex] || "").trim();
      const awayTeam = teamByName[awayName.toLowerCase()];
      const homeTeam = teamByName[homeName.toLowerCase()];

      if (!awayName && !homeName) return null;
      if (!awayTeam || !homeTeam) {
        throw new Error(`Unknown team name in schedule row ${index + 2}: ${awayName} vs ${homeName}`);
      }

      return {
        id: integer(row[gameIdIndex]) ?? index + 1,
        day: integer(row[dayIndex]) ?? 0,
        date: isoDate(row[dateIndex]),
        away: awayTeam.slug,
        home: homeTeam.slug,
        awayScore: score(row[awayScoreIndex]),
        homeScore: score(row[homeScoreIndex]),
        overtime: overtime(row[overtimeIndex]),
      };
    }).filter(Boolean);

    if (!games.length) throw new Error("Schedule sheet did not contain recognizable games");
    games.sort((a, b) => a.id - b.id);
    return { schedule: games, source: "live", error: null };
  } catch (error) {
    console.error("Unable to load live AVHL schedule; using bundled fallback", error);
    return {
      schedule: fallbackSchedule,
      source: "fallback",
      error: "The live schedule is temporarily unavailable, so the bundled schedule is being shown.",
    };
  }
}

export function groupScheduleByTeam(schedule) {
  return schedule.reduce((index, game) => {
    for (const slug of [game.away, game.home]) {
      if (!index[slug]) index[slug] = [];
      index[slug].push(game);
    }
    return index;
  }, {});
}

export function getSeasonMonths(schedule) {
  return [...new Set(schedule.map((game) => game.date.slice(0, 7)))].sort();
}
