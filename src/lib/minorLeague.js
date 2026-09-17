import { minorTeams } from "../../data/minorTeams";
import { compareStandings } from "@/lib/standings";
import { isoDate, parseCsv } from "@/lib/seasonSheets";

export const MINOR_LEAGUE_SHEET_ID = "1tl45yj9ewpOFPfm_1YezfID92lnnsQ4z6FfBArRoK0Q";
export const MINOR_LEAGUE_SHEET_TAB = "Sheet1";

export const minorTeamBySlug = Object.fromEntries(minorTeams.map((team) => [team.slug, team]));
export const minorTeamByName = Object.fromEntries(minorTeams.map((team) => [team.name.trim().toLowerCase(), team]));

function clean(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function integer(value, fallback = 0) {
  const number = Number.parseInt(clean(value).replace(/,/g, ""), 10);
  return Number.isFinite(number) ? number : fallback;
}

function optionalInteger(value) {
  const text = clean(value);
  if (!text) return null;
  const number = Number.parseInt(text.replace(/,/g, ""), 10);
  return Number.isFinite(number) ? number : null;
}

function normalizeFinish(value) {
  const text = clean(value).toUpperCase().replace(/\s+/g, "");
  if (!text) return null;
  if (text.includes("SO")) return "SO";
  if (text.includes("OT")) return "OT";
  return "REG";
}

function csvToMinorRows(csv) {
  const rows = parseCsv(csv);
  let headerIndex = -1;
  let headers = [];

  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const candidate = rows[index].map(clean);
    if (candidate.includes("Game #") && candidate.includes("Away Team") && candidate.includes("Home Team")) {
      headerIndex = index;
      headers = candidate;
      break;
    }
  }

  if (headerIndex < 0) throw new Error("Minor League schedule is missing the expected Game # header row");

  return rows.slice(headerIndex + 1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      if (header) object[header] = row[index] ?? "";
    });
    return object;
  }).filter((row) => clean(row["Game #"]));
}

function parseMinorScheduleRows(rows) {
  return rows.map((row) => {
    const awayName = clean(row["Away Team"]);
    const homeName = clean(row["Home Team"]);
    const awayTeam = minorTeamByName[awayName.toLowerCase()];
    const homeTeam = minorTeamByName[homeName.toLowerCase()];
    const awayScore = optionalInteger(row["Away Score"]);
    const homeScore = optionalInteger(row["Home Score"]);
    const hasResult = Number.isFinite(awayScore) && Number.isFinite(homeScore) && awayScore !== homeScore;
    const finish = hasResult ? normalizeFinish(row["OT/SO"]) || "REG" : null;

    return {
      id: integer(row["Game #"]),
      day: integer(row.Day),
      date: isoDate(row.Date),
      away: awayTeam?.slug || "",
      home: homeTeam?.slug || "",
      awayName,
      homeName,
      awayScore: hasResult ? awayScore : null,
      homeScore: hasResult ? homeScore : null,
      overtime: hasResult ? finish === "OT" || finish === "SO" : false,
      shootout: hasResult ? finish === "SO" : false,
      finish,
    };
  }).filter((game) => game.id > 0 && game.away && game.home && game.date);
}

function sheetCandidates() {
  const id = process.env.AVHL_MINOR_SCHEDULE_SHEET_ID || MINOR_LEAGUE_SHEET_ID;
  const tab = encodeURIComponent(process.env.AVHL_MINOR_SCHEDULE_SHEET_TAB || MINOR_LEAGUE_SHEET_TAB);
  const bust = Date.now();
  const base = `https://docs.google.com/spreadsheets/d/${id}`;
  return [
    `${base}/gviz/tq?tqx=out:csv&sheet=${tab}&_=${bust}`,
    `${base}/export?format=csv&gid=0&_=${bust}`,
  ];
}

async function fetchMinorSchedule() {
  const errors = [];
  for (const url of sheetCandidates()) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "AVHL/1.0 (+https://avhl.org)",
        },
      });
      if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
      const schedule = parseMinorScheduleRows(csvToMinorRows(await response.text())).sort((a, b) => a.id - b.id);
      if (!schedule.length) throw new Error("No Minor League games were found");
      return schedule;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join(" | "));
}

export async function getMinorLeagueSchedule() {
  try {
    const schedule = await fetchMinorSchedule();
    const countWarning = schedule.length === 1640 ? null : `The live Minor League schedule currently contains ${schedule.length.toLocaleString()} recognized games instead of 1,640.`;
    return { schedule, source: "live", error: countWarning };
  } catch (error) {
    console.error("Unable to load live AVHL Minor League schedule", error);
    return {
      schedule: [],
      source: "unavailable",
      error: "The live Minor League schedule is temporarily unavailable.",
    };
  }
}

function emptyRecord(team) {
  return {
    team,
    gp: 0,
    wins: 0,
    losses: 0,
    otl: 0,
    pts: 0,
    rw: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    ptsPct: 0,
    gfPerGame: 0,
    gaPerGame: 0,
  };
}

function finalize(record) {
  record.gd = record.gf - record.ga;
  record.ptsPct = record.gp ? record.pts / (record.gp * 2) : 0;
  record.gfPerGame = record.gp ? record.gf / record.gp : 0;
  record.gaPerGame = record.gp ? record.ga / record.gp : 0;
  return record;
}

export function calculateMinorLeagueStandings(schedule) {
  const records = Object.fromEntries(minorTeams.map((team) => [team.slug, emptyRecord(team)]));
  let completedGames = 0;

  for (const game of schedule) {
    if (!Number.isFinite(game.awayScore) || !Number.isFinite(game.homeScore) || game.awayScore === game.homeScore) continue;
    const away = records[game.away];
    const home = records[game.home];
    if (!away || !home) continue;

    completedGames += 1;
    away.gp += 1;
    home.gp += 1;
    away.gf += game.awayScore;
    away.ga += game.homeScore;
    home.gf += game.homeScore;
    home.ga += game.awayScore;

    const awayWon = game.awayScore > game.homeScore;
    const winner = awayWon ? away : home;
    const loser = awayWon ? home : away;
    winner.wins += 1;
    winner.pts += 2;

    if (game.overtime) {
      loser.otl += 1;
      loser.pts += 1;
    } else {
      loser.losses += 1;
      winner.rw += 1;
    }
  }

  const league = Object.values(records).map(finalize).sort(compareStandings);
  const bySlug = Object.fromEntries(league.map((record, index) => [record.team.slug, { ...record, rank: index + 1 }]));

  return {
    league: league.map((record, index) => ({ ...record, rank: index + 1 })),
    bySlug,
    completedGames,
  };
}

export function gamesForMinorTeam(schedule, slug) {
  return schedule.filter((game) => game.away === slug || game.home === slug);
}
