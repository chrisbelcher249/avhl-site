import { players } from "../data/players.js";
import { teams } from "../data/teams.js";
import { buildProjectedLineup } from "../src/lib/lineups.js";
import { recordFromProjected, validateLineupRecord } from "../src/lib/lineupRecords.js";

function rosterFor(team) {
  return players.filter((player) => player.currentTeam === team.name);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const records = new Map();
for (const team of teams) {
  const roster = rosterFor(team);
  const record = recordFromProjected(team.abbreviation, buildProjectedLineup(roster));
  const validation = validateLineupRecord(record, roster, team.abbreviation);
  assert(validation.ok, `${team.abbreviation} projection failed: ${validation.errors.join(" | ")}`);
  records.set(team.abbreviation, { team, roster, record: validation.record });
}

assert(records.size === 40, `Expected 40 projected lineups, found ${records.size}.`);

const sample = records.get("ARI") || records.values().next().value;
assert(sample, "No sample lineup available for mutation tests.");

{
  const bad = clone(sample.record);
  bad.forwards[0].playerId = bad.defense[0].playerId;
  const validation = validateLineupRecord(bad, sample.roster, sample.team.abbreviation);
  assert(!validation.ok && validation.errors.some((error) => /forward slot/i.test(error)), "F-to-D crossover was not rejected.");
}

{
  const bad = clone(sample.record);
  bad.specialTeams.pp1 = bad.forwards.slice(0, 5).map((entry) => entry.playerId);
  const validation = validateLineupRecord(bad, sample.roster, sample.team.abbreviation);
  assert(!validation.ok && validation.errors.some((error) => /PP1 must use/i.test(error)), "Invalid 5F power play was not rejected.");
}

{
  const bad = clone(sample.record);
  bad.overtimeUnits = [bad.overtimeUnits[0]];
  const validation = validateLineupRecord(bad, sample.roster, sample.team.abbreviation);
  assert(!validation.ok && validation.errors.some((error) => /Exactly two 3-on-3 overtime groups/i.test(error)), "Missing OT group was not rejected.");
}

{
  const bad = clone(sample.record);
  bad.shootoutOrder[1] = bad.shootoutOrder[0];
  const validation = validateLineupRecord(bad, sample.roster, sample.team.abbreviation);
  assert(!validation.ok && validation.errors.some((error) => /Shootout order cannot contain the same player/i.test(error)), "Duplicate shootout shooter was not rejected.");
}

console.log(`Lineup integrity: PASS (${records.size} team projections + mutation checks).`);
