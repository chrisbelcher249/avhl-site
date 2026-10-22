import assert from "node:assert/strict";
import { calculateGoalieShutouts } from "../src/lib/goalieShutouts.js";
import { aggregateGoalies, parseTeamGameRows, parseGoalieGameRows } from "../src/lib/seasonStats.js";

const team = (id, club, score, against, finish = "REG", result = null) => ({
  "Game ID": String(id), Team: club, Score: String(score),
  "Opp Score": String(against), Finish: finish,
  Result: result || (score > against ? "W" : score < against ? "L" : ""),
});
const goalie = (id, club, player, time, goalsAgainst = 0) => ({
  "Game ID": String(id), Team: club, "Player ID": String(player),
  Name: `Goalie ${player}`, Min: time, GA: String(goalsAgainst),
  SA: "20", SV: String(20 - goalsAgainst),
});
const teams = parseTeamGameRows([
  team(1, "ARI", 3, 0),           // Solo regulation shutout
  team(2, "ARI", 0, 2),           // Goalie conceded two
  team(3, "ARI", 1, 0, "SO"),   // Winner after scoreless 0-0 shootout
  team(3, "DEN", 0, 1, "SO"),   // SO loser ALSO has shutout
  team(4, "ARI", 2, 0),           // Combined team shutout, no individual
  team(5, "ARI", 2, 1),           // Empty-net GA: zero goalie GA, but no SO
  team(7, "ARI", 2, 0),           // Solo regulation shutout
  team(8, "ARI", 2, 0),           // Duplicate team row: later corrections win
  team(8, "ARI", 2, 2),
  team(9, "ARI", 0, 0),           // Incomplete game cannot count
  team(10, "ARI", 0, 1, "SO"),  // SO loser with no gameplay goals conceded
  team(11, "ARI", 2, 1, "OT"),  // OT goal against is not a shutout
]);
const goalies = parseGoalieGameRows([
  goalie(1, "ARI", 1696, "60:00"), goalie(1, "ARI", 1697, "0:00"),
  goalie(2, "ARI", 1696, "60:00", 2),
  goalie(3, "ARI", 1696, "65:00"), goalie(3, "DEN", 1796, "65:00"),
  goalie(4, "ARI", 1696, "30:00"), goalie(4, "ARI", 1697, "30:00"),
  goalie(5, "ARI", 1696, "60:00"), // Empty-net GA not charged to goalie
  goalie(6, "ARI", 1696, "60:00"), // Missing team result
  goalie(7, "ARI", 1696, "60:00"),
  goalie(8, "ARI", 1696, "60:00"),
  goalie(9, "ARI", 1696, "60:00"),
  goalie(10, "ARI", 1696, "65:00"),
  goalie(11, "ARI", 1696, "62:00", 1),
]);
const result = calculateGoalieShutouts(teams, goalies);
assert.equal(result.get("1696"), 4, "Only four valid solo shutouts for ARI goalie (REG x2, SO x2)");
assert.equal(result.get("1796"), 1, "Goalie on losing side of scoreless shootout receives SO");
assert.equal(result.get("1697") || 0, 0, "Dressed backup and combined game must not earn individual SO");
assert.equal([...result.values()].reduce((a, b) => a + b, 0), 5);
const aggregate = aggregateGoalies(goalies, teams);
assert.equal(aggregate.find((r) => r.playerId === "1696")?.shutouts, 4);
assert.equal(aggregate.find((r) => r.playerId === "1796")?.shutouts, 1);
assert.equal(aggregate.find((r) => r.playerId === "1697")?.shutouts, 0);
assert.equal(aggregate.find((r) => r.playerId === "1697")?.gp, 1, "Backup GP still only counts ice-time appearances");
console.log("Sheet-derived solo shutouts, SO exceptions, duplicate rows and aggregated goalie stats: PASS");
