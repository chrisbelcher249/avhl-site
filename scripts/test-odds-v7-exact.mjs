import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {players} from "../data/players.js";
import {teams} from "../data/teams.js";
import {buildProjectedLineup} from "../src/lib/lineups.js";
import {recordFromProjected} from "../src/lib/lineupRecords.js";
import {INITIAL_V7_SAMPLES, canPublishV7Odds, summarizeV7Samples,fairMoneyline,wilsonInterval} from "../src/lib/v7OddsSamples.js";

const lineups = Object.fromEntries(teams.map(team=>[
  team.abbreviation,recordFromProjected(team.abbreviation,
    buildProjectedLineup(players.filter(p=>p.currentTeam===team.name)))
]));
const payload={
  ok:true,source:"live",playerCount:players.length,
  players:players.filter(p=>p.currentTeam&&p.currentTeam!=="UFA"),
  lineups,lineupSources:{}
};
const deliveries=[];
let resolveDone;
let rejectDone;
let resolveDemo;
let collected=[];
let sharedReady=null;
const c={
  console,Date,Math,structuredClone,setTimeout,clearTimeout,
  postMessage:original=>{
    // Real Worker.postMessage performs a structured clone: the emulator must
    // copy payloads rather than retaining the worker's mutable sample array.
    const message=structuredClone(original);
    deliveries.push(message);
    if(Array.isArray(message.samples))collected=message.samples;
    else if(Array.isArray(message.newSamples))collected.push(...message.newSamples);
    if(message.type==="done")resolveDone?.({...message,samples:collected});
    if(message.type==="demoDone")resolveDemo?.(message);
    if(message.type==="error")rejectDone?.(new Error(message.error));
  },
  fetch:async uri=>{
    if(String(uri).startsWith("/api/sim-rosters"))return {ok:true,status:200,json:async()=>payload};
    if(uri==="/sim/simulator.js")return {ok:true,text:async()=>fs.readFileSync("public/sim/simulator.js","utf8")};
    if(String(uri).startsWith("/api/odds/v7-cache"))return {ok:true,json:async()=>sharedReady||{ok:true,ready:false,count:0}};
    throw new Error("Unrecognized endpoint: "+uri);
  }
};
c.self=c;
vm.createContext(c);
c.importScripts=(...paths)=>paths.forEach(p=>vm.runInContext(fs.readFileSync("public"+p,"utf8"),c,{filename:p}));
vm.runInContext(fs.readFileSync("public/odds/v7-worker.js","utf8"),c,{filename:"/odds/v7-worker.js"});
async function run(){
  return await new Promise((resolve,reject)=>{
    collected=[];resolveDone=resolve;rejectDone=reject;
    c.onmessage({data:{type:"start",gameId:123,away:"ARI",home:"ATL",target:2}});
  });
}
const first=await run();
assert.equal(first.samples.length,2);
assert.equal(INITIAL_V7_SAMPLES,1000);
assert.equal(canPublishV7Odds(999),false);
assert.equal(canPublishV7Odds(1000),true);
assert.equal(canPublishV7Odds(5000),true);
assert.equal(deliveries.filter(m=>m.type==="progress").length>=2,true);
assert.equal(first.samples[0].players.length,36);
assert(first.samples[0].goalies.length>=2);
assert(["REG","OT","SO"].includes(first.samples[0].f));
const result=summarizeV7Samples(first.samples,"ARI","ATL");
assert.equal(result.count,2);
assert.equal(result.homeWin+result.awayWin,1);
assert.equal(result.shutout>=0&&result.shutout<=1,true);
assert.equal(result.totals.every(m=>m.over+m.under===1),true);
assert(result.players.some(p=>p.name));
assert(result.goalies.some(g=>g.name));
const second=await run();
assert.deepEqual(second.samples,first.samples,"same engine/lineups/game index must be deterministic");
assert.equal(fairMoneyline(0),"—");
assert.equal(fairMoneyline(1),"—");
assert.deepEqual(wilsonInterval(0,0),[0,1]);

// Full 12-game design QA is intentionally opt-in, not part of every Vercel
// deployment build. 12 spatial V7 games are expensive on serverless CI CPUs.
assert.equal(canPublishV7Odds(12),false);
if(process.env.AVHL_TEST_ODDS_DESIGN_PREVIEW==="1"){
  // Preview-only 12-game layout demonstration runs real V7 games and reports
  // the complete box scores, without bypassing the 1,000-game publishing rule.
  const demo=await new Promise((resolve,reject)=>{
    resolveDemo=resolve;rejectDone=reject;
    c.onmessage({data:{type:"previewDemo",gameId:230,away:"ARI",home:"ATL"}});
  });
  assert.equal(demo.completed,12);
  assert.equal(demo.results.length,12);
  assert.equal(demo.samples.length,12);
  const layoutPreview=summarizeV7Samples(demo.samples,"ARI","ATL");
  assert.equal(layoutPreview.count,12);
  assert.equal(layoutPreview.totals.length,7);
  assert.equal(layoutPreview.puckLines.length,2);
  assert(layoutPreview.players.length>=30);
  assert(layoutPreview.goalies.length>=2);
  assert.equal(canPublishV7Odds(layoutPreview.count),false,"12-game preview must never be published.");
  assert(demo.results.every(game=>Number.isInteger(game.awayScore)&&Number.isInteger(game.homeScore)));
  assert(deliveries.filter(m=>m.type==="demoProgress").length>=12);
}

// Public cache-only mode must deliver a 1,000-game summary without running any
// V7 games on a visitor's device (the entire motive for 30-minute prewarming).
sharedReady={ok:true,ready:true,count:1000,summary:{...result,count:1000}};
const cachedOnly=await new Promise((resolve,reject)=>{
  collected=[];resolveDone=resolve;rejectDone=reject;
  c.onmessage({data:{type:"start",gameId:125,away:"ARI",home:"ATL",target:1000,mode:"readOnly"}});
});
assert.equal(cachedOnly.summary.count,1000);
assert.equal(cachedOnly.samples.length,0,"Public cache-only request must not simulate games locally");
sharedReady=null;

// Invalid owner data is not silently substituted with a projected lineup.
payload.lineups.ARI={...lineups.ARI,forwards:lineups.ARI.forwards.slice(1)};
const rejects=[];
rejectDone=error=>rejects.push(error.message);
resolveDone=()=>{};
c.onmessage({data:{type:"start",gameId:124,away:"ARI",home:"ATL",target:1}});
await new Promise(resolve=>setTimeout(resolve,100));
assert(rejects.length>0,"invalid lineup must prevent odds calculation");
console.log("Exact V7 odds worker: PASS (headless V7 games, zero-CPU read-only summary, deterministic seeds, 1k gate, lineup fail-closed).");
