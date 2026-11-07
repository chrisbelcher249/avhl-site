import assert from "node:assert/strict";
import { teams } from "../data/teams.js";
import { buildTeamRosterAndCap, rosterRules } from "../data/salaryCap.js";
import { computeCapObligations } from "../src/lib/capObligations.js";
import { applyWaiverOutcomes } from "../src/lib/waivers.js";

const teamName = (abbreviation) => {
  const team = teams.find((item) => item.abbreviation === abbreviation);
  assert.ok(team, `Unknown test team ${abbreviation}`);
  return team.name;
};
const basePlayer = {
  id: "0001", name: "John Smith", currentTeam: teamName("DEN"),
  aav: 12_000_000, yearsLeft: 3, role: "Skater", position: "C", overall: 80,
};
const trades = [
  { number: 1, salaryRetention: "F John Smith — ARI retains 50%" },
  { number: 2, salaryRetention: "F John Smith — CHI retains 50% of remaining" },
];

const retained = computeCapObligations([basePlayer], trades, []);
assert.deepEqual(retained.warnings, []);
assert.equal(retained.retainedByTeam.ARI, 6_000_000);
assert.equal(retained.retainedByTeam.CHI, 3_000_000);
assert.equal(retained.retainedByPlayer["0001"].total, 9_000_000);
assert.equal(buildTeamRosterAndCap([basePlayer], teamName("DEN"), { obligations: retained }).payroll, 3_000_000);
assert.equal(buildTeamRosterAndCap([basePlayer], teamName("ARI"), { obligations: retained }).payroll, 6_000_000);
assert.equal(buildTeamRosterAndCap([basePlayer], teamName("DEN"), {
  obligations: retained, ltirPlayerIds: ["0001"],
}).payroll, 0);

const clearance = { row: 2, team: "DEN", player: "F John Smith", outcome: "Cleared", claimedBy: "" };
const waived = applyWaiverOutcomes([basePlayer], [clearance]);
assert.equal(waived.players[0].currentTeam, "UFA");
const released = computeCapObligations(waived.players, trades, [clearance]);
assert.equal(released.deadCapByTeam.DEN, 750_000);
assert.equal(released.retainedByTeam.ARI, 6_000_000);
assert.equal(released.retainedByTeam.CHI, 3_000_000);
assert.equal(buildTeamRosterAndCap(waived.players, teamName("DEN"), { obligations: released }).payroll, 750_000);

const claimed = applyWaiverOutcomes([{ ...basePlayer, currentTeam: teamName("ARI") }], [{
  row: 3, team: "ARI", player: "John Smith", outcome: "Claimed", claimedBy: "DEN",
}]);
assert.equal(claimed.players[0].currentTeam, teamName("DEN"));
assert.equal(computeCapObligations(claimed.players, [], []).deadCapByTeam.ARI || 0, 0);
const malformed = computeCapObligations([basePlayer], [{ number: 3, salaryRetention: "F John Smith — ARI retains 60%" }], []);
assert.equal(malformed.retainedByTeam.ARI || 0, 0);
assert.ok(malformed.warnings.length > 0);

assert.equal(rosterRules.maximumPlayers, 28);
const roster29 = Array.from({ length: 29 }, (_, index) => ({
  ...basePlayer, id: String(index + 1).padStart(4, "0"), name: `Test Player ${index + 1}`,
  aav: 1_000_000,
}));
assert.equal(buildTeamRosterAndCap(roster29, teamName("DEN")).rosterSizeCompliant, false);
assert.equal(buildTeamRosterAndCap(roster29.slice(0, 28), teamName("DEN")).rosterSizeCompliant, true);

console.log("AVHL cap accounting: retention, double retention, waived release, claim, LTIR relief, and 28-player limit PASS");
