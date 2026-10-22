import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { LEAGUE_STANDINGS_COLUMNS, sortLeagueStandings } from "../src/lib/leagueStandingsSort.js";

const context = { console, structuredClone, window: {} };
context.window.window = context.window;
context.globalThis = context;
vm.createContext(context);
for (const file of ["public/sim/team-metadata.js", "public/sim/data.js", "public/sim/simulator.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}
const Simulator = context.window.AVHLGameSimulator;
const input = context.window.AVHL_DATA;
const makePenalty = (teamId, remaining = 120) => ({
  id: `test-${teamId}-${remaining}`, teamId, affectsStrength: true,
  releasableOnGoal: true, remaining, originalDuration: remaining, type: "Tripping"
});
const match = new Simulator(input, 8321);
const { homeId, awayId } = match;
const state = match.createInitialState();
state.period = 4;
const strength = () => [match.strengthCounts(state)[homeId], match.strengthCounts(state)[awayId]];
assert.deepEqual(strength(), [3, 3], "OT starts 3v3");
state.activePenalties.push(makePenalty(awayId));
assert.deepEqual(strength(), [4, 3], "Single away penalty produces 4v3, not 3v2");
assert.equal(Math.min(...strength()), 3, "No OT skater count below three");
state.activePenalties.push(makePenalty(awayId, 160));
assert.deepEqual(strength(), [5, 3], "Two penalties on one club produce 5v3");
state.activePenalties = [];
state.otCarryoverSkaters = null;
state.activePenalties.push(makePenalty(homeId), makePenalty(awayId));
assert.deepEqual(strength(), [3, 3], "Offsetting penalties preserve 3v3");
state.activePenalties = [makePenalty(awayId, 5)];
assert.deepEqual(strength(), [4, 3]);
match.decrementPenalties(state, 5);
assert.deepEqual(strength(), [4, 4], "4v3 becomes 4v4 when penalty ends during play");
match.simulateFaceoff(state, { x: 100, y: 42.5 }, "stoppage");
assert.deepEqual(strength(), [3, 3], "Next whistle restores 3v3");
state.activePenalties = [makePenalty(awayId, 4), makePenalty(awayId, 10)];
assert.deepEqual(strength(), [5, 3]);
match.decrementPenalties(state, 4);
assert.deepEqual(strength(), [5, 4], "5v3 becomes 5v4 after first expiry");
match.decrementPenalties(state, 6);
assert.deepEqual(strength(), [5, 5], "Second expiry becomes 5v5 until whistle");
match.simulateFaceoff(state, { x: 100, y: 42.5 }, "stoppage");
assert.deepEqual(strength(), [3, 3], "5v5 reverts to 3v3 at next whistle");
console.log("OT 4v3/5v3, offsetting penalties and expiration transitions: PASS");

// Owner-specified first five must be preserved exactly, and the remaining
// eligible players ranked for later attempts, including defensemen.
const explicit = [input.home.forwards[4].id, input.home.forwards[3].id,
  input.home.forwards[2].id, input.home.forwards[1].id, input.home.forwards[0].id];
const shootoutInput = {
  ...input, home: { ...input.home, shootoutOrder: explicit },
};
const sim = new Simulator(shootoutInput, 9277);
const shooters = sim.teams[sim.homeId].shootoutOrder;
assert.equal(shooters.length, sim.teams[sim.homeId].players.length,
  "Every dressed skater, including defense, should appear exactly once");
assert.deepEqual([...shooters.slice(0, 5)], explicit, "Owner's five shooters retain their order");
assert.equal(new Set(shooters).size, shooters.length, "Shootout order must not repeat skaters");

const soState = sim.createInitialState();
const attemptsByTeam = { [sim.homeId]: [], [sim.awayId]: [] };
sim.simulateShootoutAttempt = function(state, teamId, shooter, round) {
  attemptsByTeam[teamId].push({ round, playerId: shooter.id });
  state.shootout.attempts[teamId] += 1;
  // Guarantee five tied rounds before the home team wins in round six.
  if (round === 6 && teamId === this.homeId) state.shootout.goals[teamId] += 1;
  return round === 6 && teamId === this.homeId;
};
const winner = sim.simulateShootout(soState);
assert.equal(winner, sim.homeId);
for (const teamId of [sim.homeId, sim.awayId]) {
  const shots = attemptsByTeam[teamId];
  assert.deepEqual(shots.map((shot) => shot.round), [1, 2, 3, 4, 5, 6],
    "Sudden death must begin in round 6 after five full regulation rounds");
  assert.equal(new Set(shots.map((shot) => shot.playerId)).size, 6,
    "Sixth shooter must be a previously unused player");
}
assert.deepEqual(attemptsByTeam[sim.homeId].slice(0, 5).map((x) => x.playerId), explicit);
const injuryTest = sim.createInitialState();
injuryTest.injuries.push({ playerId: shooters[0], teamId: sim.homeId });
assert.notEqual(sim.shootoutShooterForRound(injuryTest, sim.homeId, 1).id, shooters[0],
  "Injured skaters should not be selected");
const fullCycle = [...Array(shooters.length + 1)].map((_, index) =>
  sim.shootoutShooterForRound(sim.createInitialState(), sim.homeId, index + 1).id);
assert.equal(new Set(fullCycle.slice(0, shooters.length)).size, shooters.length,
  "No reuse before all eligible skaters shoot");
assert.equal(fullCycle.at(-1), fullCycle[0], "Cycling resumes after every eligible skater");
console.log("Five-round shootout, owner order, unused skaters and sudden death: PASS");

// Sorting is presentation-only; the official rank remains attached.
const standings = [
  { team: { name: "Zulu" }, pts: 10, gp: 9, wins: 3, losses: 3, otl: 3, ptsPct: 0.56, rw: 1, gfPerGame: 2.2, gaPerGame: 2.8, gf: 21, ga: 25, gd: -4 },
  { team: { name: "Alpha" }, pts: 8, gp: 10, wins: 3, losses: 5, otl: 2, ptsPct: 0.4, rw: 2, gfPerGame: 1.8, gaPerGame: 3.2, gf: 18, ga: 32, gd: -14 },
  { team: { name: "Bravo" }, pts: 6, gp: 8, wins: 2, losses: 4, otl: 2, ptsPct: 0.375, rw: 2, gfPerGame: 2.5, gaPerGame: 3.3, gf: 20, ga: 26, gd: -6 }
];
assert.equal(LEAGUE_STANDINGS_COLUMNS.length, 14);
assert.deepEqual(sortLeagueStandings(standings).map((r) => r.officialRank), [1, 2, 3]);
assert.deepEqual(sortLeagueStandings(standings, { key: "team", direction: "asc" }).map((r) => r.record.team.name), ["Alpha", "Bravo", "Zulu"]);
assert.deepEqual(sortLeagueStandings(standings, { key: "rank", direction: "desc" }).map((r) => r.officialRank), [3, 2, 1]);
for (const column of LEAGUE_STANDINGS_COLUMNS.filter((c) => c.type === "number" && c.key !== "rank")) {
  const asc = sortLeagueStandings(standings, { key: column.key, direction: "asc" });
  const desc = sortLeagueStandings(standings, { key: column.key, direction: "desc" });
  for (let i = 1; i < asc.length; i += 1) {
    assert.ok(asc[i - 1].record[column.key] <= asc[i].record[column.key],
      `Ascending sort failed for ${column.key}`);
    assert.ok(desc[i - 1].record[column.key] >= desc[i].record[column.key],
      `Descending sort failed for ${column.key}`);
  }
  // Equal values deliberately retain official-rank order, rather than
  // reverse when direction changes.
  for (const entries of [asc, desc]) {
    for (let i = 1; i < entries.length; i += 1) {
      if (entries[i].record[column.key] === entries[i - 1].record[column.key]) {
        assert.ok(entries[i - 1].officialRank < entries[i].officialRank,
          `Tied values must use official rank for ${column.key}`);
      }
    }
  }
}
assert.equal(standings[0].team.name, "Zulu", "Sorting must not mutate the official source");
console.log("League standings all columns, sort direction and official rank: PASS");
