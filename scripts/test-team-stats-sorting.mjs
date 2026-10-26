import assert from "node:assert/strict";
import {
  TEAM_SKATER_COLUMNS, TEAM_GOALIE_COLUMNS, nextTeamStatSort, sortTeamStatRows,
} from "../src/lib/teamStatsSorting.js";

const skaters = [
  {name: "Luke Hughes", playerId: "1", points: 12, goals: 8, plusMinus: -5, shotPct: 0.308, toi: 18079},
  {name: "Macklin Celebrini", playerId: "2", points: 12, goals: 5, plusMinus: -1, shotPct: 0.135, toi: 19016},
  {name: "Mason Lohrei", playerId: "3", points: 9, goals: 2, plusMinus: 4, shotPct: 0.063, toi: 22011},
];
const sortIds = (rows, spec, cols) => sortTeamStatRows(rows, spec, cols).map((row) => row.playerId);
assert.deepEqual(sortIds(skaters, {key: "points", direction: "desc"}, TEAM_SKATER_COLUMNS), ["1","2","3"],
  "Original PTS-desc default must break ties on goals");
assert.deepEqual(sortIds(skaters, {key: "plusMinus", direction: "desc"}, TEAM_SKATER_COLUMNS), ["3","2","1"],
  "Higher (including negative) +/- must sort numerically rather than lexicographically");
assert.deepEqual(sortIds(skaters, {key: "plusMinus", direction: "asc"}, TEAM_SKATER_COLUMNS), ["1","2","3"]);
assert.deepEqual(sortIds(skaters, {key: "shotPct", direction: "desc"}, TEAM_SKATER_COLUMNS), ["1","2","3"]);
assert.deepEqual(sortIds(skaters, {key: "toi", direction: "desc"}, TEAM_SKATER_COLUMNS), ["3","2","1"],
  "TOI must sort by numeric seconds, not formatted clock text");
assert.deepEqual(sortIds(skaters, {key: "name", direction: "asc"}, TEAM_SKATER_COLUMNS), ["1","2","3"]);
assert.deepEqual(nextTeamStatSort({key:"points",direction:"desc"},"plusMinus",TEAM_SKATER_COLUMNS),{key:"plusMinus",direction:"desc"});
assert.deepEqual(nextTeamStatSort({key:"plusMinus",direction:"desc"},"plusMinus",TEAM_SKATER_COLUMNS),{key:"plusMinus",direction:"asc"});
assert.deepEqual(nextTeamStatSort({key:"plusMinus",direction:"desc"},"name",TEAM_SKATER_COLUMNS),{key:"name",direction:"asc"});
const goalies = [
  {playerId: "4",name: "A",gp: 10,gs: 8,toi: 28000,savePct: 0.90,gaa: 2.3},
  {playerId: "5",name: "B",gp: 12,gs: 11,toi: 33000,savePct: 0.95,gaa: 1.8},
  {playerId: "6",name: "C",gp: 12,gs: 9,toi: 29000,savePct: 0.93,gaa: 2.1},
];
assert.deepEqual(sortIds(goalies,{key:"gp",direction:"desc"},TEAM_GOALIE_COLUMNS),["5","6","4"],
  "Original goalie GP default must break ties on minutes played");
assert.deepEqual(sortIds(goalies,{key:"gs",direction:"desc"},TEAM_GOALIE_COLUMNS),["5","6","4"]);
assert.deepEqual(sortIds(goalies,{key:"gaa",direction:"asc"},TEAM_GOALIE_COLUMNS),["5","6","4"]);
assert.deepEqual(sortIds(goalies,{key:"savePct",direction:"desc"},TEAM_GOALIE_COLUMNS),["5","6","4"]);
assert.equal(skaters[0].playerId,"1","Sorting must never mutate the source array");
console.log("Team-page skater and goalie table sorting (all numeric types and toggles): PASS");
