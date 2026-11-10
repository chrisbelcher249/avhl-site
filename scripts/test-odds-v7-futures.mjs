import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {players} from "../data/players.js";
import {teams} from "../data/teams.js";
import {buildProjectedLineup} from "../src/lib/lineups.js";
import {recordFromProjected} from "../src/lib/lineupRecords.js";
import {simulateV7Futures} from "../src/lib/futuresModel.js";

globalThis.window=globalThis;
const payload={
  ok:true,source:"live",
  players:players.filter(p=>p.currentTeam&&p.currentTeam!=="UFA"),
  lineups:Object.fromEntries(teams.map(t=>[t.abbreviation,recordFromProjected(t.abbreviation,
    buildProjectedLineup(players.filter(p=>p.currentTeam===t.name)))])),
};
globalThis.fetch=async uri=>{
  if(String(uri).startsWith("/api/sim-rosters"))return {ok:true,status:200,json:async()=>payload};
  throw new Error("Unexpected fetch "+uri);
};
for(const file of ["team-metadata.js","data.js","simulator.js"]){
  vm.runInThisContext(fs.readFileSync("public/sim/"+file,"utf8"),{filename:file});
}
await globalThis.AVHL_LOAD_LIVE_ROSTERS();
const matchup=globalThis.AVHL_CREATE_MATCHUP_DATA("ARI","ATL");
const seed=429853;
const full=new globalThis.AVHLGameSimulator(structuredClone(matchup),seed,{headless:true}).simulateGame();
const scores=new globalThis.AVHLGameSimulator(structuredClone(matchup),seed,{headless:true}).simulateScoreOnly();
assert.equal(scores.awayScore,full.finalSummary.score[full.awayId]);
assert.equal(scores.homeScore,full.finalSummary.score[full.homeId]);
const finish=full.events.some(e=>e.type==="shootout-start")?"SO":
  full.events.some(e=>e.period===4)?"OT":"REG";
assert.equal(scores.finish,finish,"score-only output must use identical gameplay");
const pools={};
for(const a of teams)for(const h of teams)if(a!==h){
  // Structural fixture ONLY: deliberately reuse one real V7 score everywhere.
  // Tests routing, seeding and preservation of completed games, NOT accuracy.
  pools[`${a.abbreviation}:${h.abbreviation}`]=[{a:scores.awayScore,h:scores.homeScore,f:scores.finish}];
}
const fixtures=[
  {id:1,away:teams[0].slug,home:teams[1].slug,awayScore:3,homeScore:2,finish:"REG"},
  {id:2,away:teams[2].slug,home:teams[3].slug,awayScore:null,homeScore:null}
];
const frozen=JSON.stringify(fixtures);
const a=simulateV7Futures(fixtures,teams,pools,5,"routing-test");
const b=simulateV7Futures(fixtures,teams,pools,5,"routing-test");
assert.deepEqual(a,b,"futures must be reproducible from exact sample library");
assert.equal(JSON.stringify(fixtures),frozen,"official results may not be modified");
assert.equal(a.remainingGames,1);
assert.equal(a.presidents.reduce((s,v)=>s+v,0),5);
assert.equal(a.cups.reduce((s,v)=>s+v,0),5);
for(const division of new Set(teams.map(t=>t.division))){
  const divisionIndexes=teams.map((t,i)=>t.division===division?i:null).filter(i=>i!==null);
  assert.equal(divisionIndexes.reduce((n,i)=>n+a.divisionWins[i],0),5);
}
delete pools[`${teams[0].abbreviation}:${teams[1].abbreviation}`];
assert.throws(()=>simulateV7Futures(fixtures,teams,pools,1),/additional matchup sample/);
console.log("Exact V7 futures routing: PASS (score-only/full-game parity, no Poisson fallback, playoff totals and official-result invariants).");
