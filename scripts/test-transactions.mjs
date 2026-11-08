import assert from "node:assert/strict";
import { teams } from "../data/teams.js";
import { parseSignings, signingAav, applySignings } from "../src/lib/signings.js";
import { applyWaiverOutcomes } from "../src/lib/waivers.js";
import { computeCapObligations } from "../src/lib/capObligations.js";
import { buildTeamRosterAndCap } from "../data/salaryCap.js";

const teamName = (code) => teams.find((team) => team.abbreviation === code).name;
const inputRows = [
  ["Player", "Team", "Term", "AAV"],
  ["John Smith", "CHI", "3", "$4,500,000"],
  ["Jane Doe", teamName("ARI"), "2", "2.5M"],
  ["", "", "", ""],
  ["Unknown", "NO-TEAM", "1", "$2M"],
];
const parsed = parseSignings(inputRows);
assert.equal(parsed.records.length, 2);
assert.equal(parsed.records[0].team, "CHI");
assert.equal(parsed.records[0].term, 3);
assert.equal(parsed.records[0].aav, 4_500_000);
assert.equal(parsed.records[1].team, "ARI");
assert.equal(parsed.records[1].aav, 2_500_000);
assert.equal(parsed.warnings.length, 1);
assert.equal(signingAav("1.25M"), 1_250_000);
assert.equal(signingAav("$900,000"), 900_000);
assert.equal(signingAav("junk"), null);

const source = [{
  id: "0001", name: "John Smith", currentTeam: "UFA", aav: 3_000_000,
  yearsLeft: 1, role: "Skater", position: "C", overall: 80,
}];
const signed = applySignings(source, parsed.records);
assert.equal(signed.players[0].currentTeam, teamName("CHI"));
assert.equal(signed.players[0].aav, 4_500_000);
assert.equal(signed.players[0].yearsLeft, 3);
assert.equal(signed.players[0].signedContract.previous.aav, 3_000_000);
assert.equal(source[0].currentTeam, "UFA");
assert.equal(source[0].aav, 3_000_000);
assert.equal(buildTeamRosterAndCap(signed.players, teamName("CHI")).payroll, 4_500_000);

// Do not let a historical signing undo a later transfer in the official roster.
const moved = applySignings([{ ...source[0], currentTeam: teamName("DEN") }], parsed.records);
assert.equal(moved.players[0].currentTeam, teamName("DEN"));
assert.ok(moved.warnings.some((warning) => warning.includes("older signing")));

// A released player signed to a new team still leaves a 25% dead cap
// obligation on the original club, using the OLD contract.
const oldContract = [{ ...source[0], aav: 4_000_000, yearsLeft: 2 }];
const release = { row: 2, team: "DEN", player: "John Smith", outcome: "Cleared", claimedBy: "" };
const afterWaiver = applyWaiverOutcomes(oldContract, [release]);
const afterNewContract = applySignings(afterWaiver.players, [{
  row: 2, player: "John Smith", team: "CHI", term: 3, aav: 3_000_000,
}]);
const obligations = computeCapObligations(afterNewContract.players, [], [release]);
assert.equal(obligations.deadCapByTeam.DEN, 1_000_000);
assert.equal(obligations.ledger.find((entry) => entry.type === "release").yearsLeft, 2);
assert.equal(buildTeamRosterAndCap(afterNewContract.players, teamName("CHI"), {
  obligations,
}).payroll, 3_000_000);

// Retention on a previous contract does not reduce a NEW signing's payroll.
const priorRetention = {
  retainedByPlayer: { "0001": { total: 2_000_000, entries: [{ team: "DEN", amount: 2_000_000 }] } },
  retainedByTeam: { DEN: 2_000_000 },
};
assert.equal(buildTeamRosterAndCap(afterNewContract.players, teamName("CHI"), {
  obligations: priorRetention,
}).payroll, 3_000_000);
assert.equal(buildTeamRosterAndCap(afterNewContract.players, teamName("DEN"), {
  obligations: priorRetention,
}).payroll, 2_000_000);

console.log("AVHL transactions: four-field signings, ownership safeguards, new cap terms and prior dead-cap PASS");
