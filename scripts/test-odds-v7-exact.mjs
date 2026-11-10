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
let collected=[];
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
    if(message.type==="error")rejectDone?.(new Error(message.error));
  },
  fetch:async uri=>{
    if(String(uri).startsWith("/api/sim-rosters"))return {ok:true,status:200,json:async()=>payload};
    if(uri==="/sim/simulator.js")return {ok:true,text:async()=>fs.readFileSync("public/sim/simulator.js","utf8")};
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

// Invalid owner data is not silently substituted with a projected lineup.
payload.lineups.ARI={...lineups.ARI,forwards:lineups.ARI.forwards.slice(1)};
const rejects=[];
rejectDone=error=>rejects.push(error.message);
resolveDone=()=>{};
c.onmessage({data:{type:"start",gameId:124,away:"ARI",home:"ATL",target:1}});
await new Promise(resolve=>setTimeout(resolve,100));
assert(rejects.length>0,"invalid lineup must prevent odds calculation");
console.log("Exact V7 odds worker: PASS (2 real full games, props, deterministic seeds, progress, bad lineup fail-closed).");
