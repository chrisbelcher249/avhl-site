import { schedule as fallbackSchedule } from "../../data/schedule";
import { teams } from "../../data/teams";
import { fetchSeasonSheet, SEASON_SHEET_ID, SEASON_TABS } from "@/lib/seasonSheets";
import { getTeamGameRows, parseScheduleRows } from "@/lib/seasonStats";

export const SCHEDULE_SHEET_ID = SEASON_SHEET_ID;
export const SCHEDULE_SHEET_TAB = SEASON_TABS.schedule;
const teamBySlug = Object.fromEntries(teams.map((team) => [team.slug, team]));

function applyResults(fixtures, teamRows) {
  const rowsByGame = new Map();
  for (const row of teamRows) { if (!rowsByGame.has(row.gameId)) rowsByGame.set(row.gameId, []); rowsByGame.get(row.gameId).push(row); }
  return fixtures.map((fixture) => {
    const rows = rowsByGame.get(fixture.id) || [];
    const awayAbbr = teamBySlug[fixture.away]?.abbreviation, homeAbbr = teamBySlug[fixture.home]?.abbreviation;
    const awayRow = rows.find((row) => row.team === awayAbbr), homeRow = rows.find((row) => row.team === homeAbbr);
    if (!awayRow || !homeRow || awayRow.opponent !== homeAbbr || homeRow.opponent !== awayAbbr || awayRow.score !== homeRow.oppScore || homeRow.score !== awayRow.oppScore || awayRow.score === homeRow.score) return { ...fixture, awayScore: null, homeScore: null, overtime: null, shootout: false, finish: null };
    const finish = awayRow.finish || homeRow.finish || "REG";
    return { ...fixture, awayScore: awayRow.score, homeScore: homeRow.score, overtime: finish === "OT" || finish === "SO", shootout: finish === "SO", finish };
  });
}

export async function getSchedule() {
  const [{ rows: teamRows, error: statsError }, scheduleResult] = await Promise.all([getTeamGameRows(), fetchSeasonSheet(SEASON_TABS.schedule).catch((error) => ({ error }))]);
  let fixtures = fallbackSchedule.map((game) => ({ ...game, awayScore: null, homeScore: null, overtime: null, shootout: false, finish: null }));
  let source = "fallback"; const errors = [];
  if (scheduleResult?.rows) {
    try {
      const liveFixtures = parseScheduleRows(scheduleResult.rows).map((game) => ({ id: game.id, day: game.day, date: game.date, away: game.away, home: game.home, awayScore: null, homeScore: null, overtime: null, shootout: false, finish: null }));
      if (liveFixtures.length !== 1640) throw new Error(`Expected 1,640 games, found ${liveFixtures.length}`);
      fixtures = liveFixtures.sort((a, b) => a.id - b.id); source = "live";
    } catch (error) { console.error("Unable to parse live AVHL schedule; using bundled fallback", error); errors.push("The live fixture list is temporarily unavailable, so the bundled schedule is being shown."); }
  } else { console.error("Unable to load live AVHL schedule; using bundled fallback", scheduleResult?.error); errors.push("The live fixture list is temporarily unavailable, so the bundled schedule is being shown."); }
  if (statsError) errors.push(statsError);
  return { schedule: applyResults(fixtures, teamRows), source, error: errors.length ? errors.join(" ") : null };
}

export function groupScheduleByTeam(schedule) { return schedule.reduce((index, game) => { for (const slug of [game.away, game.home]) { if (!index[slug]) index[slug] = []; index[slug].push(game); } return index; }, {}); }
export function getSeasonMonths(schedule) { return [...new Set(schedule.map((game) => game.date.slice(0, 7)))].sort(); }
