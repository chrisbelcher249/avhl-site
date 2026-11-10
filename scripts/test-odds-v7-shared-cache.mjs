import assert from "node:assert/strict";
import {GET} from "../src/app/api/odds/v7-cache/route.js";
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
let remoteReads=0;
let sampleReads=0;
globalThis.fetch=async (_url,options)=>{
  const cmd=JSON.parse(options.body);
  assert.equal(cmd[0],"GET");
  assert([ "avhl:odds:exact:sample:"+key, "avhl:odds:exact:summary:"+key ].includes(cmd[1]));
  remoteReads++;
  if(cmd[1].includes(":sample:"))sampleReads++;
  const value=cmd[1].includes(":summary:")?compact:{samples:cached};
  return {ok:true,status:200,json:async()=>({
    result:value==null?null:JSON.stringify(value)
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
  console.log("Exact V7 shared cache: PASS (restricted keys, 1k gate, instant compact summary lookup).");
} finally {
  globalThis.fetch=oldFetch;
  for (const [key,value] of Object.entries({
    UPSTASH_REDIS_REST_URL:savedUrl,UPSTASH_REDIS_REST_TOKEN:savedToken,
    KV_REST_API_URL:savedKVUrl,KV_REST_API_TOKEN:savedKVToken
  }))if(value===undefined)delete process.env[key];else process.env[key]=value;
}
