import assert from "node:assert/strict";
import { selectUpcomingGames } from "./plan-v7-odds-refresh.mjs";

const live = {
  ok:true, source:"live", today:"2026-11-10", end:"2026-11-12",
  matchups:[
    {id:1,date:"2026-11-11",away:"ARI",home:"ATL"},
    {id:2,date:"2026-11-10",away:"SEA",home:"PHI"},
    {id:3,date:"2026-11-10",away:"SEA",home:"PHI"},
    {id:4,date:"2026-11-12",away:"LV",home:"DEN"},
  ],
};
const selected = selectUpcomingGames(live, 2);
assert.deepEqual(selected, [
  {away:"SEA",home:"PHI",date:"2026-11-10"},
  {away:"ARI",home:"ATL",date:"2026-11-11"},
]);
assert.equal(selectUpcomingGames(live,16).length,3);
assert.throws(()=>selectUpcomingGames({...live,source:"fallback"}),/verified live/);
assert.throws(()=>selectUpcomingGames({...live,matchups:[{date:"2026-11-11",away:"ARI",home:"ARI"}]}),/invalid matchup/);
assert.throws(()=>selectUpcomingGames({...live,matchups:[{date:"2026-11-13",away:"ARI",home:"ATL"}]}),/invalid matchup/);
assert.throws(()=>selectUpcomingGames(live,0),/limit/);
console.log("AVHL V7 odds 30-minute scheduler fixture selection: PASS");
