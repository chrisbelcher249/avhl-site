import fs from "node:fs";
import vm from "node:vm";
import { players } from "../data/players.js";
import { teams } from "../data/teams.js";
import { buildProjectedLineup } from "../src/lib/lineups.js";
import { recordFromProjected } from "../src/lib/lineupRecords.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const lineups = {};
const lineupSources = {};
for (const team of teams) {
  const roster = players.filter((player) => player.currentTeam === team.name);
  lineups[team.abbreviation] = recordFromProjected(team.abbreviation, buildProjectedLineup(roster));
  lineupSources[team.abbreviation] = "projected";
}

const rosteredPlayers = players.filter((player) => player.currentTeam && player.currentTeam !== "UFA");
const payload = {
  ok: true,
  source: "live",
  playerCount: rosteredPlayers.length,
  players: rosteredPlayers,
  lineups,
  lineupSources,
  lineupStorage: { configured: true, mode: "redis" },
};

const context = {
  console,
  structuredClone,
  window: {},
  fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../public/sim/team-metadata.js", import.meta.url), "utf8"), context, { filename: "team-metadata.js" });
vm.runInContext(fs.readFileSync(new URL("../public/sim/data.js", import.meta.url), "utf8"), context, { filename: "data.js" });
vm.runInContext(fs.readFileSync(new URL("../public/sim/simulator.js", import.meta.url), "utf8"), context, { filename: "simulator.js" });

await context.window.AVHL_LOAD_LIVE_ROSTERS();

for (let index = 0; index < teams.length; index += 1) {
  const home = teams[index].abbreviation;
  const away = teams[(index + 1) % teams.length].abbreviation;
  const matchup = context.window.AVHL_CREATE_MATCHUP_DATA(home, away);
  for (const side of ["home", "away"]) {
    const team = matchup[side];
    assert(team.forwards.length === 12, `${team.abbreviation} did not produce 12 simulator forwards.`);
    assert(team.defense.length === 6, `${team.abbreviation} did not produce 6 simulator defensemen.`);
    assert(team.goalies.length === 2, `${team.abbreviation} did not produce 2 simulator goalies.`);
    assert(team.overtimeUnits.length === 2, `${team.abbreviation} did not produce 2 OT groups.`);
    assert(team.shootoutOrder.length === 5, `${team.abbreviation} did not produce 5 shootout shooters.`);
  }
}

// The simulator normalizer must preserve the exact server-supplied units rather
// than quietly replacing valid PP/PK/OT/shootout selections with its defaults.
{
  const raw = context.window.AVHL_CREATE_MATCHUP_DATA("CHI", "ARI");
  const simulator = new context.window.AVHLGameSimulator(raw, 246813579);
  const checks = [
    [raw.home, simulator.teams[simulator.homeId]],
    [raw.away, simulator.teams[simulator.awayId]],
  ];
  for (const [before, after] of checks) {
    for (const key of ["pp1", "pp2", "pk1", "pk2"]) {
      assert(JSON.stringify(after.specialTeams[key]) === JSON.stringify(before.specialTeams[key]), `${before.abbreviation} ${key} changed during simulator normalization.`);
    }
    assert(JSON.stringify(after.overtimeUnits) === JSON.stringify(before.overtimeUnits), `${before.abbreviation} OT groups changed during simulator normalization.`);
    assert(JSON.stringify(after.shootoutOrder) === JSON.stringify(before.shootoutOrder), `${before.abbreviation} shootout order changed during simulator normalization.`);
    assert(after.lineupSource === before.lineupSource, `${before.abbreviation} lineup source was not preserved.`);
    assert(after.lineupRevision === before.lineupRevision, `${before.abbreviation} lineup revision was not preserved.`);
  }
}

// A malformed server lineup must never trigger a browser-generated replacement.
// If the handoff cannot apply exactly, the matchup should fail closed.
const originalArizona = payload.lineups.ARI;
payload.lineups.ARI = { ...originalArizona, forwards: originalArizona.forwards.slice(0, 11) };
let rejectedMalformed = false;
try {
  context.window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
} catch {
  rejectedMalformed = true;
}
assert(rejectedMalformed, "Simulator silently replaced a malformed server lineup instead of refusing the matchup.");
payload.lineups.ARI = originalArizona;

const malformedSpecialTeams = {
  ...originalArizona,
  specialTeams: {
    ...originalArizona.specialTeams,
    pp1: originalArizona.specialTeams.pp1.slice(0, 4),
  },
};
payload.lineups.ARI = malformedSpecialTeams;
let rejectedMalformedSpecialTeams = false;
try {
  context.window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
} catch {
  rejectedMalformedSpecialTeams = true;
}
assert(rejectedMalformedSpecialTeams, "Simulator accepted a malformed server PP unit instead of refusing the matchup.");
payload.lineups.ARI = originalArizona;

// If a roster transaction invalidates an owner-saved lineup, the server sends
// a fresh valid projected record and marks it auto-optimized. The simulator
// must accept that server-authoritative fallback without commissioner repair.
payload.lineups.ARI = originalArizona;
payload.lineupSources.ARI = "auto-optimized";
await context.window.AVHL_LOAD_LIVE_ROSTERS();
const autoMatchup = context.window.AVHL_CREATE_MATCHUP_DATA("ARI", "ATL");
assert(autoMatchup.home.lineupSource === "auto-optimized", "Auto-optimized lineup source was not preserved into the simulator.");
payload.lineupSources.ARI = "projected";
await context.window.AVHL_LOAD_LIVE_ROSTERS();

console.log(`Simulator lineup handoff: PASS (${teams.length} team matchup transforms + malformed fail-closed + auto-optimized fallback checks).`);
