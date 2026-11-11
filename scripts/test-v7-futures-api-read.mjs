import assert from "node:assert/strict";
import {GET} from "../src/app/api/odds/season/route.js";

const savedEnv=Object.fromEntries([
  "UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL","KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_KV_REST_API_URL","UPSTASH_REDIS_REST_KV_REST_API_TOKEN"
].map(k=>[k,process.env[k]]));
const savedFetch=globalThis.fetch;
for(const name of Object.keys(savedEnv))delete process.env[name];
process.env.UPSTASH_REDIS_REST_URL="https://mock-avhl-redis.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN="test-only-not-a-secret";

const first="012f9ea40d459dfab579a961";
const second="bbbbbbbbbbbbbbbbbbbbbbbb";
let current=first,forecast=null,progress=780;
let lastVerified=null,priorForecast=null;
const source={
  method:"exact-V7-game-outcome-resampling",
  sourceDigest:first,matchedPairs:780,engineSamples:78000,runs:10000,
  generatedAt:new Date(Date.now()-4*60*60*1000).toISOString(),
  teams:[{abbreviation:"ATL",probabilities:{cup:0.1}}],
};
globalThis.fetch=async(url,options)=>{
  assert.equal(String(url),"https://mock-avhl-redis.invalid");
  const command=JSON.parse(options.body);
  assert.equal(command[0],"GET");
  const key=command[1];
  const value=key==="avhl:odds:futures:current"?current:
    key==="avhl:odds:futures:last-verified"?lastVerified:
    key==="avhl:odds:futures:forecast:"+current?forecast:
    key==="avhl:odds:futures:forecast:"+first?priorForecast:
    key==="avhl:odds:futures:progress:"+current?String(progress):null;
  return {ok:true,json:async()=>({result:value})};
};
try{
  // Regression: a complete current-snapshot forecast MUST remain visible
  // after a GitHub scheduled refresh is more than two hours late.
  forecast=JSON.stringify(source);
  const complete=await GET();
  assert.equal(complete.status,200,"A real 780/780 forecast must not show Building after two hours.");
  const full=await complete.json();
  assert.equal(full.ok,true);
  assert.equal(full.runs,10000);
  assert.equal(full.engineSamples,78000);

  // A newly selected fingerprint must show older fully verified prices
  // as REFERENCE ONLY, never as current prices.
  current=second;progress=600;
  forecast=null;
  lastVerified=first;
  priorForecast=JSON.stringify(source);
  let pending=await GET();
  assert.equal(pending.status,200);
  const updating=await pending.json();
  assert.equal(updating.ok,false);
  assert.equal(updating.status,"updating");
  assert.equal(updating.completedPairs,600);
  assert.equal(updating.fallback.sourceDigest,first);
  assert.equal(updating.fallback.teams[0].abbreviation,"ATL");

  // No prior trusted publication means there are no fabricated lines.
  lastVerified=null;
  pending=await GET();
  assert.equal(pending.status,503);
  assert.equal((await pending.json()).completedPairs,600);

  // Reject corrupted or incorrectly labeled forecasts even at 780/780.
  current=first;progress=780;
  forecast=JSON.stringify({...source,engineSamples:7800});
  pending=await GET();
  assert.equal(pending.status,503);
  assert.equal((await pending.json()).completedPairs,780);
  forecast=JSON.stringify({...source,sourceDigest:second});
  assert.equal((await GET()).status,503);

  console.log("V7 futures API freshness regression: PASS (latest verified remains current; previous full V7 forecast shown as updating-only; no invented prices).");
}finally{
  globalThis.fetch=savedFetch;
  for(const [name,value] of Object.entries(savedEnv)){
    if(value===undefined)delete process.env[name];
    else process.env[name]=value;
  }
}
