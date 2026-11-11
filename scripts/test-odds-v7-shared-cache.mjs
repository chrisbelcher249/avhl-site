import assert from "node:assert/strict";
import {GET} from "../src/app/api/odds/v7-cache/route.js";
import {lastVerifiedGameOdds} from "../src/lib/v7LastVerifiedOdds.js";
const oldFetch=globalThis.fetch;
const savedUrl=process.env.UPSTASH_REDIS_REST_URL;
const savedToken=process.env.UPSTASH_REDIS_REST_TOKEN;
const savedKVUrl=process.env.KV_REST_API_URL;
const savedKVToken=process.env.KV_REST_API_TOKEN;
process.env.UPSTASH_REDIS_REST_URL="https://fake-upstash.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN="test-only-token";
const key="v7:3:1234abcd:ARI:ATL:abcdef12";
let cached=[];
let compact=null;
let pointer=null;
let remoteReads=0;
let sampleReads=0;
globalThis.fetch=async (_url,options)=>{
  const cmd=JSON.parse(options.body);
  assert.equal(cmd[0],"GET");
  assert([ "avhl:odds:exact:sample:"+key, "avhl:odds:exact:summary:"+key,
    "avhl:odds:exact:latest:ARI:ATL" ].includes(cmd[1]));
  remoteReads++;
  if(cmd[1].includes(":sample:"))sampleReads++;
  const value=cmd[1].includes(":latest:")?pointer:
    cmd[1].includes(":summary:")?compact:{samples:cached};
  return {ok:true,status:200,json:async()=>({
    result:value==null?null:typeof value==="string"?value:JSON.stringify(value)
  })};
};
try {
  const invalid=await GET(new Request("https://site.invalid/api/odds/v7-cache?key=avhl:lineup:v1:ARI"));
  assert.equal(invalid.status,400);
  assert.equal(remoteReads,0,"malicious/out-of-scope Redis keys must never be queried.");
  const cold=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)));
  assert.equal(cold.status,200);
  assert.equal((await cold.json()).ready,false);
  cached=Array.from({length:999},(_,i)=>({a:2,h:3,f:"REG",i}));
  const stillCold=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)));
  assert.equal((await stillCold.json()).ready,false);
  cached.push({a:4,h:1,f:"REG"});
  const ready=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)));
  const result=await ready.json();
  assert.equal(result.ready,true);
  assert.equal(result.count,1000);
  assert.equal(result.samples.length,1000);
  compact={count:1000,summary:{count:1000,source:"v7-complete-games",homeWin:0.62,awayWin:0.38}};
  cached=[]; // A small summary alone should now be enough.
  const readsBefore=sampleReads;
  const summaryResponse=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)));
  const summaryResult=await summaryResponse.json();
  assert.equal(summaryResult.ready,true);
  assert.equal(summaryResult.count,1000);
  assert.equal(summaryResult.summary.homeWin,0.62);
  assert.equal(summaryResult.samples,undefined);
  assert.equal(sampleReads,readsBefore,"Summary lookup must avoid reading heavy game samples.");
  // Signed historical odds are reference-only and require both a trusted
  // publisher and a bounded, matching 1,000-game summary.
  pointer=key;
  compact={count:1000,summary:{
    count:1000,source:"v7-complete-games",home:"ARI",away:"ATL",
    homeWin:0.62,awayWin:0.38
  },publisher:"trusted-github-actions",generatedAt:new Date().toISOString()};
  const referenceRead=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)+"&checkLatest=1"));
  const referenceData=await referenceRead.json();
  assert.equal(referenceData.referenceReady,true);
  assert.equal(referenceData.publisher,"trusted-github-actions");
  pointer=null;
  const unregistered=await GET(new Request("https://site.invalid/api/odds/v7-cache?key="+encodeURIComponent(key)+"&checkLatest=1"));
  assert.equal((await unregistered.json()).referenceReady,false);
  pointer=key;
  const historical=await lastVerifiedGameOdds("ARI","ATL");
  assert.equal(historical.key,key);
  assert.equal(historical.summary.homeWin,0.62);
  assert.equal(await lastVerifiedGameOdds("ARI","ATL",key),null,"Current key cannot be its own stale fallback.");
  compact.publisher="untrusted";
  assert.equal(await lastVerifiedGameOdds("ARI","ATL"),null,"Never display unsigned historical markets.");
  compact.publisher="trusted-github-actions";
  compact.generatedAt=new Date(Date.now()-32*24*60*60*1000).toISOString();
  assert.equal(await lastVerifiedGameOdds("ARI","ATL"),null,"Expired markets must not be shown.");
  console.log("Exact V7 shared cache: PASS (1k gate, signed last-good matchup reference, no stale price as current).");
} finally {
  globalThis.fetch=oldFetch;
  for (const [key,value] of Object.entries({
    UPSTASH_REDIS_REST_URL:savedUrl,UPSTASH_REDIS_REST_TOKEN:savedToken,
    KV_REST_API_URL:savedKVUrl,KV_REST_API_TOKEN:savedKVToken
  }))if(value===undefined)delete process.env[key];else process.env[key]=value;
}
