import { players } from "../data/players.js";
import { teams } from "../data/teams.js";
import { buildProjectedLineup } from "../src/lib/lineups.js";
import { recordFromProjected, validateLineupRecord } from "../src/lib/lineupRecords.js";
import { blankUnavailableLineupRecord, repairLineupRecord } from "../src/lib/lineupRepair.js";

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


// Trades/injuries should leave the owner-facing record intact except for open
// slots, while the simulator can build a legal temporary repair that preserves
// every still-eligible even-strength assignment.
{
  const transactionSample = records.get("ARI") || sample;
  const removedId = transactionSample.record.forwards[0].playerId;
  const healthyRoster = transactionSample.roster.filter((player) => String(player.id) !== String(removedId));
  const blanked = blankUnavailableLineupRecord(transactionSample.record, healthyRoster, transactionSample.team.abbreviation);
  assert(blanked.forwards.length === 12, "Owner-facing blanked lineup lost a forward slot.");
  assert(blanked.forwards[0].playerId === "", "Unavailable dressed player was not shown as an open slot.");
  const survivingBefore = transactionSample.record.forwards.slice(1).map((entry) => entry.playerId);
  const survivingAfter = blanked.forwards.slice(1).map((entry) => entry.playerId);
  assert(JSON.stringify(survivingAfter) === JSON.stringify(survivingBefore), "Blanking an unavailable player moved unaffected forward assignments.");

  const repaired = repairLineupRecord(transactionSample.record, healthyRoster, transactionSample.roster, transactionSample.team.abbreviation);
  assert(repaired.ok, `Temporary simulator repair failed: ${repaired.errors.join(" | ")}`);
  assert(repaired.record.forwards[0].playerId && repaired.record.forwards[0].playerId !== removedId, "Simulator repair did not fill the unavailable forward slot.");
  for (let index = 1; index < transactionSample.record.forwards.length; index += 1) {
    assert(repaired.record.forwards[index].playerId === transactionSample.record.forwards[index].playerId, `Simulator repair moved unaffected forward slot ${index}.`);
  }
}

console.log(`Lineup integrity: PASS (${records.size} team projections + mutation + deferred-repair checks).`);
