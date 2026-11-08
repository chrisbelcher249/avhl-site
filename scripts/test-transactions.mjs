import assert from "node:assert/strict";
import { teams } from "../data/teams.js";
import { parseSignings, signingAav, applySignings } from "../src/lib/signings.js";
import { applyWaiverOutcomes, isLegacyWaiver } from "../src/lib/waivers.js";
import { computeCapObligations } from "../src/lib/capObligations.js";
import { buildTeamRosterAndCap } from "../data/salaryCap.js";
import { candidatesFromSheets, transactionSearchText } from "../src/lib/transactionFeed.js";

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

const events = candidatesFromSheets([
  { row: 4, team: "DEN", player: "John Smith", outcome: "Claimed", claimedBy: "CHI" },
  { row: 5, team: "ARI", player: "Jane Doe", outcome: "Cleared", claimedBy: "" },
  { row: 6, team: "CHI", player: "Free Agent", outcome: "On Waivers", claimedBy: "" },
], parsed.records);
assert.equal(events.filter((entry) => entry.type === "waiver").length, 3);
assert.equal(events.filter((entry) => entry.type === "claim").length, 1);
assert.equal(events.filter((entry) => entry.type === "release").length, 1);
assert.equal(events.filter((entry) => entry.type === "signing").length, 2);
assert.ok(transactionSearchText(events.find((entry) => entry.type === "claim")).includes("chicago"));

// Before November 6, 2026: cleared means historical only, with no dead cap,
// no active roster override and no contractual change from archived signings.
const historicalWaiver = {
  row: 20, team: "DEN", player: "John Smith", outcome: "Cleared",
  claimedBy: "", submittedAt: "2026-11-05T23:59:59",
};
const newWaiver = { ...historicalWaiver, row: 21, submittedAt: "2026-11-06T00:00:00" };
assert.equal(isLegacyWaiver(historicalWaiver), true);
assert.equal(isLegacyWaiver(newWaiver), false);
assert.equal(isLegacyWaiver({ ...newWaiver, submittedAt: "" }), false);

const beforeCutoff = applyWaiverOutcomes([{ ...source[0], currentTeam: teamName("DEN") }], [historicalWaiver]);
assert.equal(beforeCutoff.players[0].currentTeam, teamName("DEN"));
assert.equal(computeCapObligations(beforeCutoff.players, [], [historicalWaiver]).deadCapByTeam.DEN || 0, 0);
const afterCutoff = applyWaiverOutcomes([{ ...source[0], currentTeam: teamName("DEN") }], [newWaiver]);
assert.equal(afterCutoff.players[0].currentTeam, "UFA");
assert.equal(computeCapObligations(afterCutoff.players, [], [newWaiver]).deadCapByTeam.DEN, 750_000);

const historicalSigning = { row: 8, player: "John Smith", team: "CHI", term: 2, aav: 1_000_000, historical: true };
const olderSigned = applySignings([{ ...source[0], currentTeam: "UFA" }], [historicalSigning]);
assert.equal(olderSigned.players[0].currentTeam, "UFA");
assert.equal(olderSigned.players[0].aav, source[0].aav);

console.log("AVHL transactions: signings, waiver history cutoff, previous liabilities and transaction types PASS");
