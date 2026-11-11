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

// Regression: Trade #303 must charge ND for the retained halves and JAX
// only for the remaining halves. Full contract AAV is unchanged on roster rows.
const trade303Players = [
  { ...basePlayer, id: "0893", name: "Nate Danielson", currentTeam: teamName("JAX"), aav: 4_000_000, yearsLeft: 2 },
  { ...basePlayer, id: "1045", name: "Konsta Helenius", currentTeam: teamName("JAX"), aav: 5_000_000, yearsLeft: 3 },
];
const trade303 = [{
  number: 303,
  salaryRetention: "F Nate Danielson — ND retains 50%; F Konsta Helenius — ND retains 50%",
}];
const trade303Obligations = computeCapObligations(trade303Players, trade303, []);
assert.deepEqual(trade303Obligations.warnings, []);
assert.equal(trade303Obligations.retainedByTeam.ND, 4_500_000);
const jaxTrade303 = buildTeamRosterAndCap(trade303Players, teamName("JAX"), { obligations: trade303Obligations });
const ndTrade303 = buildTeamRosterAndCap(trade303Players, teamName("ND"), { obligations: trade303Obligations });
assert.equal(jaxTrade303.payroll, 4_500_000);
assert.equal(ndTrade303.payroll, 4_500_000);
assert.equal(jaxTrade303.capBreakdown.rosterSalary, 9_000_000);
assert.equal(jaxTrade303.capBreakdown.salaryRetainedByOtherTeams, 4_500_000);
assert.equal(ndTrade303.capBreakdown.retainedSalary, 4_500_000);
const danielson = jaxTrade303.skaters.find((player) => player.id === "0893");
const helenius = jaxTrade303.skaters.find((player) => player.id === "1045");
assert.equal(danielson.aav, 4_000_000);
assert.equal(danielson.capHit, 2_000_000);
assert.equal(danielson.retainedByOtherTeams, 2_000_000);
assert.equal(helenius.aav, 5_000_000);
assert.equal(helenius.capHit, 2_500_000);
assert.equal(helenius.retainedByOtherTeams, 2_500_000);
assert.equal(trade303Players[0].aav, 4_000_000);
assert.equal(trade303Players[1].aav, 5_000_000);

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

// The floor is assessed before LTIR relief, but the $100M ceiling
// and active-roster requirements continue to apply after LTIR.
const ltirRoster = Array.from({ length: 24 }, (_, index) => ({
  ...basePlayer,
  id: String(index + 1).padStart(4, "0"),
  name: `LTIR Test ${index + 1}`,
  position: index < 14 ? "C" : index < 21 ? "D" : "G",
  role: index < 21 ? "Skater" : "Goalie",
  aav: index === 0 ? 8_000_000 : 3_000_000,
}));
const beforeRelief = buildTeamRosterAndCap(ltirRoster, teamName("DEN"));
assert.equal(beforeRelief.payroll, 77_000_000);
assert.equal(beforeRelief.compliant, true);

const ltirOnlyReduction = buildTeamRosterAndCap(ltirRoster, teamName("DEN"), {
  ltirPlayerIds: ["0001"],
});
assert.equal(ltirOnlyReduction.payrollBeforeLtir, 77_000_000);
assert.equal(ltirOnlyReduction.payroll, 69_000_000);
assert.equal(ltirOnlyReduction.effectiveBelowFloor, true);
assert.equal(ltirOnlyReduction.belowFloor, false);
assert.equal(ltirOnlyReduction.ltirFloorException, true);
assert.equal(ltirOnlyReduction.salaryCompliant, true);
assert.equal(ltirOnlyReduction.rosterCompliant, true);
assert.equal(ltirOnlyReduction.compliant, true);
assert.equal(ltirOnlyReduction.floorPosition, 7_000_000);
assert.equal(ltirOnlyReduction.issues.some((issue) => issue.includes("below floor")), false);

const alreadyBelowFloor = ltirRoster.map((player, index) => ({
  ...player, aav: index === 0 ? 8_000_000 : 2_500_000,
}));
const invalidFloor = buildTeamRosterAndCap(alreadyBelowFloor, teamName("DEN"), {
  ltirPlayerIds: ["0001"],
});
assert.equal(invalidFloor.payrollBeforeLtir, 65_500_000);
assert.equal(invalidFloor.payroll, 57_500_000);
assert.equal(invalidFloor.belowFloor, true);
assert.equal(invalidFloor.ltirFloorException, false);
assert.equal(invalidFloor.compliant, false);
assert.ok(invalidFloor.issues.some((issue) => issue.includes("below floor before LTIR")));

console.log("AVHL cap accounting: retention, double retention, waivers, 28 players, and LTIR-only floor exception PASS");
