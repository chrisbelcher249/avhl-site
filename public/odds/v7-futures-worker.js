/* global importScripts, indexedDB, self */
// Exact (not Poisson) V7 score samples for every ordered matchup. Build them
// once per live lineup/version and reuse their empirical distribution for 3000
// future season/playoff resamples. This can be very CPU-intensive.
"use strict";
self.window=self;
importScripts("/sim/team-metadata.js","/sim/data.js","/sim/simulator.js");

const DATABASE="avhl-v7-futures-pools";
const STORE="games";
let job=0;
const fnv=text=>{
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
};
function dbOpen(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in self))return resolve(null);
    const r=indexedDB.open(DATABASE,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"key"});
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
async function getSample(key){
  try{
    const db=await dbOpen();
    if(!db)return [];
    return await new Promise(resolve=>{
      const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).get(key);
      r.onsuccess=()=>{db.close();resolve(Array.isArray(r.result?.samples)?r.result.samples:[]);};
      r.onerror=()=>{db.close();resolve([]);};
    });
  }catch{return [];}
}
async function saveSample(key,samples){
  try{
    const db=await dbOpen();
    if(!db)return;
    await new Promise(resolve=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put({key,samples,at:Date.now()});
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();resolve();};
    });
  }catch{/* Keep calculating without storage in restricted browsers. */}
}
async function run(message){
  const runId=++job;
  const codes=[...new Set(message.teams||[])].filter(x=>/^[A-Z0-9]{2,4}$/.test(x));
  if(codes.length!==40)throw new Error("The 40-team live league is required for complete futures odds.");
  const target=Math.max(1,Math.min(32,Math.floor(Number(message.samplesPerMatchup)||4)));
  await self.AVHL_LOAD_LIVE_ROSTERS();
  if(runId!==job)return;
  const response=await fetch("/sim/simulator.js",{cache:"no-store"});
  if(!response.ok)throw new Error("Cannot verify the running V7 simulator version.");
  const engine=fnv(await response.text());
  if(runId!==job)return;
  const needed=new Set(message.remainingPairs||[]);
  const pairs=[];
  for(const away of codes)for(const home of codes)if(away!==home)pairs.push({away,home,priority:needed.has(`${away}:${home}`)?1:0});
  pairs.sort((a,b)=>b.priority-a.priority||a.away.localeCompare(b.away)||a.home.localeCompare(b.home));
  const all=pairs.length*target;
  let complete=0,completePairs=0;
  const pools={};
  for(const {away,home} of pairs){
    if(runId!==job)return;
    const raw=self.AVHL_CREATE_MATCHUP_DATA(home,away);
    const key=`v7:future:1:${engine}:${away}:${home}:${fnv(JSON.stringify(raw))}`;
    const samples=(await getSample(key)).slice(0,target);
    if(runId!==job)return;
    complete+=samples.length;
    for(let i=samples.length;i<target;i++){
      if(runId!==job)return;
      // Identical V7 gameplay; this code only omits player-stat serialization.
      const seed=parseInt(fnv(`${key}:${i}`),16);
      const sim=new self.AVHLGameSimulator(structuredClone(raw),seed,{headless:true});
      const result=sim.simulateScoreOnly();
      samples.push({a:result.awayScore,h:result.homeScore,f:result.finish});
      complete++;
      await saveSample(key,samples);
      if(complete%3===0)self.postMessage({type:"progress",complete,total:all,pairs:completePairs,pairTotal:pairs.length,target});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    pools[`${away}:${home}`]=samples;
    completePairs++;
    if(completePairs%10===0||completePairs===pairs.length)
      self.postMessage({type:"progress",complete,total:all,pairs:completePairs,pairTotal:pairs.length,target});
  }
  if(runId===job)self.postMessage({type:"complete",complete,total:all,pairs:completePairs,pairTotal:pairs.length,target,pools});
}
self.onmessage=event=>{
  const message=event.data||{};
  if(message.type==="cancel"){job++;return;}
  if(message.type==="start")run(message).catch(error=>
    self.postMessage({type:"error",error:error instanceof Error?error.message:String(error)}));
};
