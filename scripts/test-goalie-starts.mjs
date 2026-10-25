import assert from "node:assert/strict";
import { aggregateGoalies, parseGoalieGameRows } from "../src/lib/seasonStats.js";

const makeGoalie = (gameId, team, playerId, min, source = "SIM", gs = "") => ({
  "Game ID": String(gameId), Source: source, Team: team, "Player ID": playerId,
  Name: `Goalie ${playerId}`, Min: min, GS: gs,
});

const rows = parseGoalieGameRows([
  makeGoalie(1, "ARI", "1696", "20:00"),
  makeGoalie(1, "ARI", "1697", "40:00"), // Relief played more; never receives a start
  makeGoalie(2, "ARI", "1696", "20:00", "SIM", "0"),
  makeGoalie(2, "ARI", "1697", "40:00", "SIM", "1"), // Explicit new-game GS overrides row order
  makeGoalie(3, "ARI", "1696", "60:00", "SNS"),
  makeGoalie(3, "ARI", "1697", "0:00", "SNS"),
  makeGoalie(4, "ARI", "1696", "30:00", "SNS"),
  makeGoalie(4, "ARI", "1697", "30:00", "SNS"), // Without EA starter flag, don't guess
]);
const goalies = aggregateGoalies(rows, []);
const first = goalies.find((row) => row.playerId === "1696");
const second = goalies.find((row) => row.playerId === "1697");
assert.equal(first.gs, 2);
assert.equal(second.gs, 1);
assert.equal(first.gp, 4);
assert.equal(second.gp, 3);
assert.equal(first.startsUnverified, 1);
assert.equal(second.startsUnverified, 1);
assert.equal(first.startsRemaining, 58);
assert.equal(second.startsRemaining, 59);
assert.equal(first.gameRows.find((row) => row.gameId === 1).started, true);
assert.equal(second.gameRows.find((row) => row.gameId === 1).started, false);
assert.equal(second.gameRows.find((row) => row.gameId === 2).started, true);

const fullSeason = [];
for (let game = 1; game <= 61; game++) {
  fullSeason.push(makeGoalie(game, "DEN", "1700", "60:00", "SIM", "1"));
  fullSeason.push(makeGoalie(game, "DEN", "1701", "0:00", "SIM", "0"));
}
const exceeded = aggregateGoalies(parseGoalieGameRows(fullSeason), []).find((row) => row.playerId === "1700");
assert.equal(exceeded.gs, 61);
assert.equal(exceeded.startsRemaining, 0);
assert.equal(exceeded.overStartLimit, true, "61st start must be identifiable as a rule violation");

console.log("Explicit and historical goalie starts, relief GP, uncertain SNS starts, and 60-start warning: PASS");
