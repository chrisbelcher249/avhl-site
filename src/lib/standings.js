import { conferenceMap, teams } from "../../data/teams";
import { gameHasResult } from "@/lib/scheduleFormat";

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

// Official 2026–27 AVHL standings tiebreakers:
// PTS → PTS% → RW → W → GF/G → GA/G (lower is better) → GD.
export function compareStandings(a, b) {
  return (
    b.pts - a.pts ||
    b.ptsPct - a.ptsPct ||
    b.rw - a.rw ||
    b.wins - a.wins ||
    b.gfPerGame - a.gfPerGame ||
    a.gaPerGame - b.gaPerGame ||
    b.gd - a.gd ||
    a.team.name.localeCompare(b.team.name)
  );
}

function finalize(record) {
  record.gd = record.gf - record.ga;
  record.ptsPct = record.gp ? record.pts / (record.gp * 2) : 0;
  record.gfPerGame = record.gp ? record.gf / record.gp : 0;
  record.gaPerGame = record.gp ? record.ga / record.gp : 0;
  return record;
}

function assignSeeds(groups) {
  let nextSeed = 1;
  return groups.flatMap((group) =>
    [...group].sort(compareStandings).map((record) => ({ ...record, seed: nextSeed++ }))
  );
}

function applyCompletedGame(records, game) {
  if (!gameHasResult(game)) return false;
  const away = records[game.away];
  const home = records[game.home];
  if (!away || !home) return false;

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

  return true;
}

function compactRecord(record) {
  return {
    wins: record.wins,
    losses: record.losses,
    otl: record.otl,
    gp: record.gp,
    pts: record.pts,
  };
}

// Records shown on schedule cards should reflect the standings through that
// schedule date, not the current standings. This also naturally gives future
// games the latest available record until results on that date are entered.
export function calculateRecordSnapshotsByDate(schedule) {
  const records = Object.fromEntries(teams.map((team) => [team.slug, emptyRecord(team)]));
  const gamesByDate = new Map();

  for (const game of schedule) {
    if (!gamesByDate.has(game.date)) gamesByDate.set(game.date, []);
    gamesByDate.get(game.date).push(game);
  }

  const snapshots = {};
  for (const date of [...gamesByDate.keys()].sort()) {
    for (const game of gamesByDate.get(date)) applyCompletedGame(records, game);
    snapshots[date] = Object.fromEntries(
      Object.entries(records).map(([slug, record]) => [slug, compactRecord(record)])
    );
  }

  return snapshots;
}

export function calculateStandings(schedule) {
  const records = Object.fromEntries(teams.map((team) => [team.slug, emptyRecord(team)]));
  let completedGames = 0;

  for (const game of schedule) {
    if (applyCompletedGame(records, game)) completedGames += 1;
  }

  Object.values(records).forEach(finalize);

  const league = Object.values(records).sort(compareStandings);

  const conferences = Object.entries(conferenceMap).map(([conference, divisionNames]) => {
    const divisionSections = divisionNames.map((division) => {
      const divisionRecords = teams
        .filter((team) => team.division === division)
        .map((team) => records[team.slug])
        .sort(compareStandings);

      return {
        name: division,
        records: divisionRecords,
        topThree: divisionRecords.slice(0, 3),
        remaining: divisionRecords.slice(3),
      };
    });

    const conferenceRecords = teams
      .filter((team) => team.conference === conference)
      .map((team) => records[team.slug])
      .sort(compareStandings);

    const automatic = divisionSections.flatMap((division) => division.topThree);
    const automaticSlugs = new Set(automatic.map((record) => record.team.slug));
    const remaining = conferenceRecords.filter((record) => !automaticSlugs.has(record.team.slug));
    const wildCards = remaining.slice(0, 4);
    const outside = remaining.slice(4);

    // Seeding is structural before tiebreakers are applied within each tier:
    // 1–2 division winners, 3–4 second place, 5–6 third place, 7–10 wild cards.
    const divisionWinners = divisionSections.map((division) => division.records[0]).filter(Boolean);
    const secondPlace = divisionSections.map((division) => division.records[1]).filter(Boolean);
    const thirdPlace = divisionSections.map((division) => division.records[2]).filter(Boolean);
    const seeds = assignSeeds([divisionWinners, secondPlace, thirdPlace, wildCards]);

    return {
      conference,
      conferenceRecords,
      divisionSections,
      wildCards,
      outside,
      seeds,
    };
  });

  return { records, league, conferences, completedGames };
}
