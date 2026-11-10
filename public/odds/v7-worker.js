/* global importScripts, indexedDB, self */
// Real AVHL V7 game engine, not a second scoring model. Classic worker keeps
// full physics/gameplay off the browser's UI thread.
"use strict";
self.window = self;
importScripts("/sim/team-metadata.js", "/sim/data.js", "/sim/simulator.js");

const CACHE_DB = "avhl-v7-game-odds";
const CACHE_STORE = "matchups";
const SCHEMA = 2;
let activeRequest = 0;
let engineHashPromise = null;

function fnv(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16).padStart(8,"0");
}
function engineHash() {
  if (!engineHashPromise) {
    engineHashPromise = fetch("/sim/simulator.js", {cache:"no-store"})
      .then(response => {
        if (!response.ok) throw new Error("Cannot verify the V7 simulator version.");
        return response.text();
      }).then(text=>fnv(text)).catch(error=>{engineHashPromise=null;throw error;});
  }
  return engineHashPromise;
}
function openDb() {
  return new Promise((resolve,reject)=>{
    if (!("indexedDB" in self)) return resolve(null);
    const request = indexedDB.open(CACHE_DB,1);
    request.onupgradeneeded = ()=>request.result.createObjectStore(CACHE_STORE,{keyPath:"key"});
    request.onsuccess = ()=>resolve(request.result);
    request.onerror = ()=>reject(request.error);
  });
}
async function readCache(key) {
  try {
    const db = await openDb();
    if (!db) return [];
    return await new Promise(resolve=>{
      const tx = db.transaction(CACHE_STORE,"readonly");
      const r = tx.objectStore(CACHE_STORE).get(key);
      r.onsuccess=()=>{db.close(); resolve(Array.isArray(r.result?.samples)?r.result.samples:[]);};
      r.onerror=()=>{db.close();resolve([]);};
    });
  } catch {return [];}
}
async function writeCache(key,samples) {
  try {
    const db=await openDb();
    if(!db)return;
    await new Promise(resolve=>{
      const tx=db.transaction(CACHE_STORE,"readwrite");
      tx.objectStore(CACHE_STORE).put({key,samples,updatedAt:Date.now()});
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();resolve();};
    });
  } catch { /* Private browsing should still calculate without persistence. */ }
}
function gameSample(game,away,home){
  const s=game.finalSummary,h=game.homeId,a=game.awayId;
  const finish=game.events.some(e=>e.type==="shootout-start")?"SO":
    game.events.some(e=>e.period===4)?"OT":"REG";
  const firstEvent=game.events.find(e=>e.type==="goal" && (e.teamId===a||e.teamId===h));
  const players=[];
  const goalies=[];
  for(const [id,abbr] of [[a,away],[h,home]]){
    for(const p of s.skaters[id]||[])players.push({
      id:String(p.avhlId||p.id),name:p.name,t:abbr,
      g:Number(p.goals)||0,a:Number(p.assists)||0,
      p:Number(p.points)||0,s:Number(p.shots)||0,h:Number(p.hits)||0
    });
    for(const p of s.goalieRows[id]||[])goalies.push({
      id:String(p.avhlId||p.id),name:p.name,t:abbr,started:Boolean(p.starter),
      sv:Number(p.saves)||0,sa:Number(p.shotsAgainst)||0,ga:Number(p.goalsAgainst)||0,toi:Number(p.toi)||0
    });
  }
  return {
    a:Number(s.score[a]),h:Number(s.score[h]),
    as:Number(s.shots[a]),hs:Number(s.shots[h]),f:finish,
    first:firstEvent?.teamId===h?home:firstEvent?.teamId===a?away:null,
    players,goalies
  };
}
async function start(message){
  const request = ++activeRequest;
  const {away,home,gameId} = message;
  const target = Math.max(1,Math.min(5000,Math.floor(Number(message.target)||1000)));
  if (!/^[A-Z0-9]{2,4}$/.test(away)|| !/^[A-Z0-9]{2,4}$/.test(home)||away===home) {
    throw new Error("Invalid game matchup.");
  }
  // Always reload official live player and owner-lineup data for each new job.
  const [, engine] = await Promise.all([self.AVHL_LOAD_LIVE_ROSTERS(),engineHash()]);
  if(request!==activeRequest)return;
  const matchup=self.AVHL_CREATE_MATCHUP_DATA(home,away);
  const key=`v7:${SCHEMA}:${engine}:${home}:${away}:${fnv(JSON.stringify(matchup))}`;
  const samples=await readCache(key);
  if(request!==activeRequest)return;
  // Restore persisted work once. Subsequent messages report only NEW samples.
  // Previously sending all accumulated player statistics every two games was
  // O(n^2) structured-clone traffic and got expensive at 1,000+ games.
  self.postMessage({type:"progress",gameId,key,completed:samples.length,
    target:Math.max(target,samples.length),samples,fromCache:true});
  let unsent=[];
  for(let i=samples.length;i<target;i++){
    if(request!==activeRequest)return;
    // Stable independent seed for every distinct game/lineup/version and run.
    const seed=parseInt(fnv(`${key}:${i}`),16);
    const sim=new self.AVHLGameSimulator(structuredClone(matchup),seed,{headless:true});
    const game=sim.simulateGame();
    const sample=gameSample(game,away,home);
    samples.push(sample);
    unsent.push(sample);
    if(unsent.length>=5 || samples.length===target){
      self.postMessage({type:"progress",gameId,key,completed:samples.length,target,
        newSamples:unsent,fromCache:false});
      unsent=[];
    }
    // Persist in bounded batches, rather than overwriting a growing array
    // every few games. If a tab closes, at most 24 unfinished games are lost.
    if(samples.length%25===0||samples.length===target)await writeCache(key,samples);
    // Give the worker's message queue a turn so navigation can cancel the job.
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(request===activeRequest)
    self.postMessage({type:"done",gameId,key,completed:samples.length,target,
      newSamples:unsent,fromCache:samples.length>=target && !unsent.length});
}

self.onmessage=(event)=>{
  const message=event.data||{};
  if(message.type==="cancel"){activeRequest++;return;}
  if(message.type==="start")start(message).catch(error=>{
    self.postMessage({type:"error",gameId:message.gameId,error:error instanceof Error?error.message:String(error)});
  });
};
