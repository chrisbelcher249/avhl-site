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
assert.equal(Object.hasOwn(carrier.stats, "ppToi"), false, "Removed individual PP TOI must not be recorded");
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
  assert.equal(row.length, 24, "23 displayed stats columns plus a format marker");
  assert.match(row[15], /^\d+:\d\d$/, "Real PPT must replace PP TOI in original column P");
  assert.equal(row[23], "v2", "Mark rows that contain true PPT in column P");
}
const oldRows = parseSkaterGameRows([{ "Game ID": "1", "Player ID": "0123", PPT: "01:23" }]);
assert.equal(oldRows[0].puckPossessionTime, null, "Never count historical power-play TOI as puck possession");
const middleRows = parseSkaterGameRows([{ "Game ID": "2", "Player ID": "0123", "PP TOI": "01:23", PPT: "02:04" }]);
assert.equal(middleRows[0].puckPossessionTime, 124, "First release's separate PPT must stay valid");
const preservedRows = parseSkaterGameRows([{ "Game ID": "3", "Player ID": "0123", PPT: "01:23", "PPT Provenance": "02:04" }]);
assert.equal(preservedRows[0].puckPossessionTime, 124, "Old true PPT remains readable after changing headers");
const newRows = parseSkaterGameRows([{ "Game ID": "4", "Player ID": "0123", PPT: "02:04", "PPT Provenance": "v2" }]);
assert.equal(newRows[0].puckPossessionTime, 124, "Current format reads true PPT directly from column P");
const unknownAfterRename = parseSkaterGameRows([{ "Game ID": "5", "Player ID": "0123", PPT: "01:23", "PPT Provenance": "" }]);
assert.equal(unknownAfterRename[0].puckPossessionTime, null, "Unmarked legacy PP TOI stays untracked");
console.log("Puck possession tracking and Sheet export compatibility: PASS");
