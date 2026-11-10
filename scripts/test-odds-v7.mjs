// Regression/health checks for the lightweight V7 odds surrogate.
// This is NOT a substitute for empirical calibration against the V7 engine.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { players } from "../data/players.js";
import { teams } from "../data/teams.js";
import { buildProjectedLineup } from "../src/lib/lineups.js";
import { recordFromProjected } from "../src/lib/lineupRecords.js";
import {
  ODDS_GAMEPLAY_VERSION, MODEL_RUNS, buildTeamModel,
  expectedGoals, runMonteCarlo, simulateModelGame, makeRandom,
} from "../src/lib/oddsModel.js";
import { simulateFutures } from "../src/lib/futuresModel.js";

assert.equal(ODDS_GAMEPLAY_VERSION, "V7");
const teamByName = Object.fromEntries(teams.map(t => [t.name, t.abbreviation]));
const lineupByAbbreviation = {};
for (const team of teams) {
  lineupByAbbreviation[team.abbreviation] = recordFromProjected(
    team.abbreviation,
    buildProjectedLineup(players.filter(p => p.currentTeam === team.name))
  );
}
const rostered = players.filter(p => p.currentTeam && p.currentTeam !== "UFA");
const roster = rostered.map(p => ({ ...p, __teamAbbreviation: teamByName[p.currentTeam] || "" }));
const models = Object.fromEntries(teams.map(t => [
  t.abbreviation,
  buildTeamModel(t.abbreviation, roster, lineupByAbbreviation[t.abbreviation])
]));
assert.equal(Object.keys(models).length, 40);
for (const model of Object.values(models)) {
  for (const key of ["attack", "defending", "goalie", "goalieOverall", "eliteCreation", "eliteFinishing", "pace", "overall"]) {
    assert(Number.isFinite(model[key]), model.abbreviation + ": invalid " + key);
  }
}
const lineupStats = Object.values(models);
const means = Object.fromEntries(["attack", "defending", "goalie", "goalieOverall", "eliteCreation"].map(key => [
  key, lineupStats.reduce((s,m) => s + m[key], 0) / lineupStats.length
]));
const worst = lineupStats.slice().sort((a,b) => a.overall-b.overall)[0];
const best = lineupStats.slice().sort((a,b) => b.overall-a.overall)[0];
const matches = [];
for (const away of lineupStats) {
  for (const home of lineupStats) {
    if (away.abbreviation === home.abbreviation) continue;
    const awayLambda = expectedGoals(away, home);
    const homeLambda = expectedGoals(home, away);
    assert(awayLambda >= 1.45 && awayLambda <= 5.5, "bad lambda");
    assert(homeLambda >= 1.45 && homeLambda <= 5.5, "bad lambda");
    matches.push({away,home,awayLambda,homeLambda});
  }
}
const meanLambda = matches.reduce((s,m) => s+m.awayLambda+m.homeLambda,0) / (2*matches.length);
assert(meanLambda > 2.85 && meanLambda < 3.15, "league mean goals needs V7 re-check: " + meanLambda);

// One set of lineup models must give the same result for the same seed/game.
const specific = { id: 12001 };
const first = runMonteCarlo(specific, worst, best, 10000);
const second = runMonteCarlo(specific, worst, best, 10000);
assert.deepEqual(first, second, "probabilities must be reproducible");
assert(Math.abs(first.awayWin+first.homeWin-1)<1e-10);
assert(Math.abs(first.over65+first.under65-1)<1e-10);
assert(first.homeWin > 0.5, "strong team should favor against weakest");
assert(first.homeWin > 0.60, "surrogate still under-separates strong/weak projected rosters");
assert(first.homeWin < 0.90, "surrogate over-separates strong/weak projected rosters");
assert(first.homeCover15 <= first.homeWin, "puck line should be subset of outright win");
assert(first.otRate > 0 && first.shootoutRate < first.otRate);

// Ensure V7 elite and goaltending terms move predictions in the right direction.
const neutral = structuredClone(lineupStats[10]);
const opponent = structuredClone(lineupStats[20]);
const baseline = expectedGoals(neutral,opponent);
assert(expectedGoals({...neutral,eliteCreation:neutral.eliteCreation*1.25},opponent)>baseline);
assert(expectedGoals({...neutral,eliteFinishing:neutral.eliteFinishing+0.008},opponent)>baseline);
assert(expectedGoals(neutral,{...opponent,goalieOverall:opponent.goalieOverall+5})<baseline);
assert(expectedGoals(neutral,{...opponent,goalie:opponent.goalie+5})<baseline);
assert(expectedGoals({...neutral,attack:neutral.attack+5},opponent)>baseline);
assert(expectedGoals(neutral,{...opponent,defending:opponent.defending+5})<baseline);

// Official completed results remain locked in futures; no modification of schedule.
const sampleTeams = teams.map(t => ({
  slug:t.slug,name:t.name,abbreviation:t.abbreviation,division:t.division,conference:t.conference,
}));
const schedule = [
  {id:1,away:sampleTeams[0].slug,home:sampleTeams[1].slug,awayScore:3,homeScore:2,overtime:false},
  {id:2,away:sampleTeams[2].slug,home:sampleTeams[3].slug,awayScore:null,homeScore:null,overtime:false},
];
const copy = JSON.stringify(schedule);
const futures = simulateFutures(schedule,sampleTeams,sampleTeams.map(t=>models[t.abbreviation]),10);
assert.equal(futures.remainingGames,1);
assert.equal(JSON.stringify(schedule),copy, "schedule must not mutate");
assert.equal(futures.presidents.reduce((a,b)=>a+b,0),10);
assert.equal(futures.cups.reduce((a,b)=>a+b,0),10);
console.log(JSON.stringify({
  test: "odds-v7-regression",status:"PASS",teams:lineupStats.length,
  matchupOrientations:matches.length,expectedRegulationGoalsPerTeam:+meanLambda.toFixed(3),
  best:best.abbreviation,worst:worst.abbreviation,
  bestHomeWinAgainstWorst:+first.homeWin.toFixed(3),
  projectedGoals: +(first.awayProjected+first.homeProjected).toFixed(3),
  modelRuns:MODEL_RUNS,means
},null,2));
