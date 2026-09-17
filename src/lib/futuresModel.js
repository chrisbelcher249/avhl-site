import { hashString, makeRandom, simulateModelGame } from "./oddsModel.js";

export const FUTURE_RUNS = 3000;

function applyGame(recordAway, recordHome, awayScore, homeScore, overtime) {
  recordAway.gp += 1;
  recordHome.gp += 1;
  recordAway.gf += awayScore;
  recordAway.ga += homeScore;
  recordHome.gf += homeScore;
  recordHome.ga += awayScore;
  const awayWon = awayScore > homeScore;
  const winner = awayWon ? recordAway : recordHome;
  const loser = awayWon ? recordHome : recordAway;
  winner.wins += 1;
  winner.pts += 2;
  if (overtime) {
    loser.otl += 1;
    loser.pts += 1;
  } else {
    loser.losses += 1;
    winner.rw += 1;
  }
}

function compareRecords(aIndex, bIndex, records, teams) {
  const a = records[aIndex];
  const b = records[bIndex];
  const aPtsPct = a.gp ? a.pts / (a.gp * 2) : 0;
  const bPtsPct = b.gp ? b.pts / (b.gp * 2) : 0;
  const aGfPg = a.gp ? a.gf / a.gp : 0;
  const bGfPg = b.gp ? b.gf / b.gp : 0;
  const aGaPg = a.gp ? a.ga / a.gp : 0;
  const bGaPg = b.gp ? b.ga / b.gp : 0;
  const aGd = a.gf - a.ga;
  const bGd = b.gf - b.ga;
  return (
    b.pts - a.pts ||
    bPtsPct - aPtsPct ||
    b.rw - a.rw ||
    b.wins - a.wins ||
    bGfPg - aGfPg ||
    aGaPg - bGaPg ||
    bGd - aGd ||
    teams[aIndex].name.localeCompare(teams[bIndex].name)
  );
}

function playoffSeeds(conference, teams, records) {
  const conferenceIndexes = teams.map((team, index) => ({ team, index })).filter(({ team }) => team.conference === conference).map(({ index }) => index);
  const divisions = [...new Set(conferenceIndexes.map((index) => teams[index].division))];
  const divisionTables = divisions.map((division) => conferenceIndexes.filter((index) => teams[index].division === division).sort((a, b) => compareRecords(a, b, records, teams)));
  const winners = divisionTables.map((table) => table[0]).filter((value) => value !== undefined).sort((a, b) => compareRecords(a, b, records, teams));
  const seconds = divisionTables.map((table) => table[1]).filter((value) => value !== undefined).sort((a, b) => compareRecords(a, b, records, teams));
  const thirds = divisionTables.map((table) => table[2]).filter((value) => value !== undefined).sort((a, b) => compareRecords(a, b, records, teams));
  const automatic = new Set([...winners, ...seconds, ...thirds]);
  const wildCards = conferenceIndexes.filter((index) => !automatic.has(index)).sort((a, b) => compareRecords(a, b, records, teams)).slice(0, 4);
  return [...winners, ...seconds, ...thirds, ...wildCards];
}

function seriesWinner(a, b, bestOf, models, random) {
  const needed = Math.floor(bestOf / 2) + 1;
  let aWins = 0;
  let bWins = 0;
  while (aWins < needed && bWins < needed) {
    const result = simulateModelGame(models[a], models[b], random);
    if (result.awayScore > result.homeScore) aWins += 1;
    else bWins += 1;
  }
  return aWins > bWins ? a : b;
}

function conferenceChampion(seeds, models, random) {
  if (seeds.length < 10) return null;
  const q89 = seriesWinner(seeds[7], seeds[8], 5, models, random);
  const q710 = seriesWinner(seeds[6], seeds[9], 5, models, random);
  const r1a = seriesWinner(seeds[0], q89, 7, models, random);
  const r1b = seriesWinner(seeds[3], seeds[4], 7, models, random);
  const r1c = seriesWinner(seeds[1], q710, 7, models, random);
  const r1d = seriesWinner(seeds[2], seeds[5], 7, models, random);
  const r2a = seriesWinner(r1a, r1b, 7, models, random);
  const r2b = seriesWinner(r1c, r1d, 7, models, random);
  return seriesWinner(r2a, r2b, 7, models, random);
}

export function simulateFutures(schedule, teams, models, runs = FUTURE_RUNS) {
  const teamIndex = Object.fromEntries(teams.map((team, index) => [team.slug, index]));
  const base = teams.map(() => ({ gp: 0, wins: 0, losses: 0, otl: 0, pts: 0, rw: 0, gf: 0, ga: 0 }));
  const remaining = [];
  const completedFingerprint = [];

  for (const game of schedule) {
    const away = teamIndex[game.away];
    const home = teamIndex[game.home];
    if (away === undefined || home === undefined) continue;
    if (game.awayScore != null && game.homeScore != null) {
      applyGame(base[away], base[home], Number(game.awayScore), Number(game.homeScore), Boolean(game.overtime));
      completedFingerprint.push(`${game.id}:${game.awayScore}-${game.homeScore}:${game.finish || "REG"}`);
    } else {
      remaining.push({ away, home });
    }
  }

  const divisionWins = teams.map(() => 0);
  const presidents = teams.map(() => 0);
  const cups = teams.map(() => 0);
  const modelFingerprint = models.map((model) => `${model.abbreviation}:${model.lineupRevision}:${model.attack.toFixed(2)}:${model.defending.toFixed(2)}:${model.goalie.toFixed(2)}`).join("|");
  const random = makeRandom(hashString(`AVHL-FUTURES:${completedFingerprint.join("|")}:${modelFingerprint}`));
  const divisionNames = [...new Set(teams.map((team) => team.division))];
  const divisionIndexes = Object.fromEntries(divisionNames.map((division) => [division, teams.map((team, index) => ({ team, index })).filter(({ team }) => team.division === division).map(({ index }) => index)]));

  for (let run = 0; run < runs; run += 1) {
    const records = base.map((record) => ({ ...record }));
    for (const game of remaining) {
      const result = simulateModelGame(models[game.away], models[game.home], random);
      applyGame(records[game.away], records[game.home], result.awayScore, result.homeScore, result.overtime);
    }

    const league = teams.map((_, index) => index).sort((a, b) => compareRecords(a, b, records, teams));
    presidents[league[0]] += 1;

    for (const division of divisionNames) {
      const table = [...divisionIndexes[division]].sort((a, b) => compareRecords(a, b, records, teams));
      if (table[0] !== undefined) divisionWins[table[0]] += 1;
    }

    const westSeeds = playoffSeeds("Western", teams, records);
    const eastSeeds = playoffSeeds("Eastern", teams, records);
    const westChampion = conferenceChampion(westSeeds, models, random);
    const eastChampion = conferenceChampion(eastSeeds, models, random);
    if (westChampion != null && eastChampion != null) {
      const champion = seriesWinner(westChampion, eastChampion, 7, models, random);
      cups[champion] += 1;
    }
  }

  return { divisionWins, presidents, cups, remainingGames: remaining.length, runs };
}
