import assert from "node:assert/strict";
import {GET} from "../src/app/api/odds/v7-cache/route.js";
const oldFetch=globalThis.fetch;
const savedUrl=process.env.UPSTASH_REDIS_REST_URL;
const savedToken=process.env.UPSTASH_REDIS_REST_TOKEN;
const savedKVUrl=process.env.KV_REST_API_URL;
const savedKVToken=process.env.KV_REST_API_TOKEN;
process.env.UPSTASH_REDIS_REST_URL="https://fake-upstash.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN="test-only-token";
const key="v7:2:1234abcd:ARI:ATL:abcdef12";
let cached=[];
let remoteReads=0;
globalThis.fetch=async (_url,options)=>{
  const cmd=JSON.parse(options.body);
  assert.equal(cmd[0],"GET");
  assert.equal(cmd[1],"avhl:odds:exact:sample:"+key);
  remoteReads++;
  return {ok:true,status:200,json:async()=>({
    result:JSON.stringify({samples:cached})
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
  console.log("Exact V7 shared cache: PASS (restricted keys, >=1,000 samples, no premature publication).");
} finally {
  globalThis.fetch=oldFetch;
  for (const [key,value] of Object.entries({
    UPSTASH_REDIS_REST_URL:savedUrl,UPSTASH_REDIS_REST_TOKEN:savedToken,
    KV_REST_API_URL:savedKVUrl,KV_REST_API_TOKEN:savedKVToken
  }))if(value===undefined)delete process.env[key];else process.env[key]=value;
}
