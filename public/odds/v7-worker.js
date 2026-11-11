/* global importScripts, indexedDB, self */
// Real AVHL V7 game engine, not a second scoring model. Classic worker keeps
// full physics/gameplay off the browser's UI thread.
"use strict";
self.window = self;
importScripts("/sim/team-metadata.js", "/sim/data.js", "/sim/simulator.js", "/odds/v7-sample-extractor.js");

const CACHE_DB = "avhl-v7-game-odds";
const CACHE_STORE = "matchups";
const SCHEMA = 3;
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
async function start(message){
  const request = ++activeRequest;
  const {away,home,gameId} = message;
  let target = Math.max(1,Math.min(5000,Math.floor(Number(message.target)||1000)));
  if (!/^[A-Z0-9]{2,4}$/.test(away)|| !/^[A-Z0-9]{2,4}$/.test(home)||away===home) {
    throw new Error("Invalid game matchup.");
  }
  // The *server* owns the canonical matchup hash. Never depend on browser-
  // cached simulator files, roster state or IndexedDB to locate published odds.
  // Each response re-verifies the current lineup against exactly 1,000 real V7 games.
  if(message.mode==="readOnly"){
    let announced=false;
    while(request===activeRequest){
      try{
        const url="/api/odds/v7-current?home="+encodeURIComponent(home)+
          "&away="+encodeURIComponent(away);
        const response=await fetch(url,{cache:"no-store"});
        const result=await response.json();
        if(request!==activeRequest)return;
        if(!response.ok||!result?.ok)throw Error(result?.error||"The verified odds cache is unavailable.");
        if(result.ready===true&&result.count>=1000&&
          result.summary?.source==="v7-complete-games"&&
          result.summary.count===result.count&&
          result.summary.home===home&&result.summary.away===away){
          self.postMessage({type:"done",gameId,key:result.key,
            completed:result.count,target:result.count,summary:result.summary,fromCache:true});
          return;
        }
        if(!announced){
          self.postMessage({type:"pending",gameId,key:result.key,completed:0,target:1000,
            message:"Current V7 lineup needs 1,000 game samples."});
          announced=true;
        }
      }catch(error){
        if(request!==activeRequest)return;
        if(!announced){
          self.postMessage({type:"error",gameId,error:
            "Unable to verify official V7 odds; checking again automatically."});
          announced=true;
        }
      }
      await new Promise(resolve=>setTimeout(resolve,30000));
    }
    return;
  }
  // Only the interactive V7 simulator needs local engine/roster scripts.
  const [, engine] = await Promise.all([self.AVHL_LOAD_LIVE_ROSTERS(),engineHash()]);
  if(request!==activeRequest)return;
  const matchup=self.AVHL_CREATE_MATCHUP_DATA(home,away);
  const key=`v7:${SCHEMA}:${engine}:${home}:${away}:${fnv(JSON.stringify(matchup))}`;
  let samples=await readCache(key);
  if(request!==activeRequest)return;
  // Read the shared precomputed pool before spending CPU on this device.
  // Never use a pool from a different simulator build or lineup fingerprint.
  if(samples.length<1000){
    try{
      const response=await fetch(`/api/odds/v7-cache?key=${encodeURIComponent(key)}`,{cache:"no-store"});
      if(response.ok){
        const shared=await response.json();
        if(shared?.ok && shared.ready && shared.count>=1000 &&
            shared.summary?.source==="v7-complete-games" &&
            shared.summary?.count===shared.count){
          self.postMessage({type:"done",gameId,key,completed:shared.count,target:shared.count,
            summary:shared.summary,fromCache:true});
          return;
        }
        if(shared?.ok && shared.ready && Array.isArray(shared.samples) &&
            shared.samples.length>=1000 && shared.samples.length>samples.length){
          samples=shared.samples;
          await writeCache(key,samples);
        }
      }
    }catch{/* A cold/unavailable shared cache must not block exact V7 sampling. */}
  }
  if(request!==activeRequest)return;
  target=Math.max(target,samples.length);

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
    const sample=self.AVHL_ODDS_EXTRACT_SAMPLE(game,away,home);
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

// Preview-only market-layout review: 12 actual full V7 games + box scores.
// Do not publish these probabilities as official odds or store them in the
// 1,000+ run production cache.
async function previewDemo(message) {
  const request=++activeRequest;
  const {away,home,gameId}=message;
  if(!/^[A-Z0-9]{2,4}$/.test(away) || !/^[A-Z0-9]{2,4}$/.test(home) || away===home)
    throw new Error("Invalid V7 demonstration matchup.");
  await self.AVHL_LOAD_LIVE_ROSTERS();
  if(request!==activeRequest)return;
  const matchup=self.AVHL_CREATE_MATCHUP_DATA(home,away);
  const results=[];
  const samples=[];
  const target=12;
  for(let i=0;i<target;i++){
    if(request!==activeRequest)return;
    const seed=(Date.now()+i*100003)>>>0;
    const game=new self.AVHLGameSimulator(structuredClone(matchup),seed,{headless:true}).simulateGame();
    const s=game.finalSummary;
    samples.push(self.AVHL_ODDS_EXTRACT_SAMPLE(game,away,home));
    results.push({
      awayScore:Number(s.score[game.awayId]),homeScore:Number(s.score[game.homeId]),
      leadingScorers:Object.values(s.skaters||{}).flat()
        .filter(row=>row.points>0)
        .sort((a,b)=>b.points-a.points).slice(0,3)
        .map(row=>({name:row.name,points:row.points}))
    });
    self.postMessage({type:"demoProgress",gameId,completed:i+1,target,results});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(request===activeRequest)self.postMessage({type:"demoDone",gameId,completed:target,target,results,samples});
}

self.onmessage=(event)=>{
  const message=event.data||{};
  if(message.type==="cancel"){activeRequest++;return;}
  if(message.type==="start")start(message).catch(error=>{
    self.postMessage({type:"error",gameId:message.gameId,error:error instanceof Error?error.message:String(error)});
  });
  if(message.type==="previewDemo")previewDemo(message).catch(error=>{
    self.postMessage({type:"demoError",gameId:message.gameId,error:error instanceof Error?error.message:String(error)});
  });
};
