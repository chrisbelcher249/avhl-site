import { schedule as fallbackSchedule } from "../../data/schedule";
import { teams } from "../../data/teams";
import { fetchSeasonTab, SEASON_STATS_SHEET_ID, SEASON_STATS_TABS } from "@/lib/seasonStats";

export const SCHEDULE_SHEET_ID = SEASON_STATS_SHEET_ID;
export const SCHEDULE_SHEET_NAME = SEASON_STATS_TABS.schedule;

const teamByName = Object.fromEntries(teams.map((team) => [team.name.toLowerCase(), team]));
const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation.toUpperCase(), team]));

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

function isoDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return text;
  let [, month, day, year] = match;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function buildResults(teamRows) {
  const grouped = new Map();
  for (const row of teamRows) {
    const id = integer(row["Game ID"]);
    if (!id) continue;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row);
  }
  return grouped;
}

function resultForGame(rows, awayTeam, homeTeam) {
  if (!rows?.length) return { awayScore: null, homeScore: null, overtime: null, finish: null };
  const awayRow = rows.find((row) => String(row.Team || "").trim().toUpperCase() === awayTeam.abbreviation);
  const homeRow = rows.find((row) => String(row.Team || "").trim().toUpperCase() === homeTeam.abbreviation);

  let awayScore = score(awayRow?.Score);
  let homeScore = score(homeRow?.Score);
  if (awayScore === null && homeRow) awayScore = score(homeRow["Opp Score"]);
  if (homeScore === null && awayRow) homeScore = score(awayRow["Opp Score"]);

  const finish = String(awayRow?.Finish || homeRow?.Finish || "").trim().toUpperCase() || null;
  const overtime = finish ? finish === "OT" || finish === "SO" : null;
  return { awayScore, homeScore, overtime, finish };
}

export async function getSchedule() {
  try {
    const [fixtureRows, teamRows] = await Promise.all([
      fetchSeasonTab(SEASON_STATS_TABS.schedule),
      fetchSeasonTab(SEASON_STATS_TABS.team).catch((error) => {
        console.error("Unable to load live team results while loading schedule", error);
        return [];
      }),
    ]);
    if (!fixtureRows.length) throw new Error("Schedule tab did not contain game rows");
    const results = buildResults(teamRows);

    const games = fixtureRows.map((row, index) => {
      const awayName = String(row["Away Team"] || "").trim();
      const homeName = String(row["Home Team"] || "").trim();
      const awayTeam = teamByName[awayName.toLowerCase()];
      const homeTeam = teamByName[homeName.toLowerCase()];
      if (!awayName && !homeName) return null;
      if (!awayTeam || !homeTeam) throw new Error(`Unknown team name in schedule row ${index + 2}: ${awayName} vs ${homeName}`);
      const id = integer(row["Game ID"]) ?? index + 1;
      return {
        id,
        day: integer(row.Day) ?? 0,
        date: isoDate(row.Date),
        away: awayTeam.slug,
        home: homeTeam.slug,
        ...resultForGame(results.get(id), awayTeam, homeTeam),
      };
    }).filter(Boolean);

    if (!games.length) throw new Error("Schedule tab did not contain recognizable games");
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

export async function getOfficialScheduleGame(gameId) {
  const id = Number.parseInt(String(gameId ?? ""), 10);
  if (!Number.isInteger(id) || id < 1 || id > 1640) return null;
  const rows = await fetchSeasonTab(SEASON_STATS_TABS.schedule);
  const row = rows.find((candidate) => integer(candidate["Game ID"]) === id);
  if (!row) return null;
  const awayTeam = teamByName[String(row["Away Team"] || "").trim().toLowerCase()];
  const homeTeam = teamByName[String(row["Home Team"] || "").trim().toLowerCase()];
  if (!awayTeam || !homeTeam) return null;
  return {
    id,
    day: integer(row.Day) ?? 0,
    date: isoDate(row.Date),
    away: awayTeam,
    home: homeTeam,
  };
}

export function getTeamByAbbreviation(abbreviation) {
  return teamByAbbreviation[String(abbreviation || "").trim().toUpperCase()] || null;
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
