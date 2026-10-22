import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parseSkaterGameRows } from "../src/lib/seasonStats.js";
import { buildOfficialSheetRows } from "../src/lib/officialGame.js";

const context = { console, structuredClone, fetch: async () => { throw new Error("No network expected"); }, window: {} };
context.window.window = context.window;
context.globalThis = context;
vm.createContext(context);
for (const file of ["public/sim/team-metadata.js", "public/sim/data.js", "public/sim/simulator.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}
const Simulator = context.window.AVHLGameSimulator;
const input = context.window.AVHL_DATA;
const sim = new Simulator(input, 444);
const state = sim.createInitialState();
const home = sim.teams[sim.homeId];
const away = sim.teams[sim.awayId];
const carrier = home.players[0];
const opponent = away.players[0];
state.onIce[sim.homeId] = [carrier.id];
state.onIce[sim.awayId] = [opponent.id];
state.possessionTeam = sim.homeId;
state.puckCarrierId = carrier.id;
sim.incrementToi(state, 2.5);
assert.equal(carrier.stats.puckPossessionTime, 2.5, "Controlled puck possession must accumulate for carrier");
assert.equal(carrier.stats.toi, 2.5, "Ordinary TOI remains independent");
assert.equal(carrier.stats.ppToi, 0, "Possession must not be incorrectly counted as PP TOI");
state.puckCarrierId = null;
sim.incrementToi(state, 1.5);
assert.equal(carrier.stats.puckPossessionTime, 2.5, "Loose puck must not count");
state.possessionTeam = sim.awayId;
state.puckCarrierId = carrier.id;
sim.incrementToi(state, 0.5);
assert.equal(carrier.stats.puckPossessionTime, 2.5, "Mismatched team/carrier must not count");
state.possessionTeam = sim.homeId;
sim.incrementToi(state, 0.5);
assert.equal(carrier.stats.puckPossessionTime, 3, "Carrier team possession resumes");

const completed = new Simulator(input, 78901).simulateGame();
const result = completed.finalSummary;
// The bundled demo fixture reuses some numeric player IDs across positions.
// Official AVHL submissions require unique AVHL IDs per dressed team;
// normalize only this test fixture, without touching simulator output logic.
for (const [teamIndex, teamId] of [completed.awayId, completed.homeId].entries()) {
  result.skaters[teamId].forEach((row, index) => {
    row.avhlId = String(1000 + teamIndex * 100 + index).padStart(4, "0");
  });
  result.goalieRows[teamId].forEach((row, index) => {
    row.avhlId = String(1100 + teamIndex * 100 + index).padStart(4, "0");
  });
}
const packet = {
  away: { ...input.away, score: result.score[completed.awayId] },
  home: { ...input.home, score: result.score[completed.homeId] },
  summary: result,
  finish: "REG",
};
const official = buildOfficialSheetRows(1, packet);
assert.equal(official.skaterRows.length, 36);
for (const row of official.skaterRows) {
  assert.equal(row.length, 24, "23 original columns + 1 new puck possession time column");
  assert.match(row[23], /^\d+:\d\d$/, "Real PPT must be exported as a time value");
}
const oldRows = parseSkaterGameRows([{ "Game ID": "1", "Player ID": "0123", PPT: "01:23" }]);
assert.equal(oldRows[0].ppToi, 83, "Legacy PPT must remain power-play TOI");
assert.equal(oldRows[0].puckPossessionTime, null, "Never invent historical puck possession");
const newRows = parseSkaterGameRows([{ "Game ID": "2", "Player ID": "0123", "PP TOI": "01:23", PPT: "02:04" }]);
assert.equal(newRows[0].ppToi, 83);
assert.equal(newRows[0].puckPossessionTime, 124);
console.log("Puck possession tracking and Sheet export compatibility: PASS");
