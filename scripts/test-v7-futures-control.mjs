import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {POST} from "../src/app/api/odds/v7-futures-control/route.js";
import {GET} from "../src/app/api/odds/season/route.js";
import {snapshotDigest} from "../src/lib/v7FuturesPairs.js";

const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk={...publicKey.export({format:"jwk"}),kid:"v7-futures-test-key",use:"sig",alg:"RS256"};
const oldFetch=globalThis.fetch;
const envs=Object.fromEntries(["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN",
 "KV_REST_API_URL","KV_REST_API_TOKEN"].map(k=>[k,process.env[k]]));
process.env.UPSTASH_REDIS_REST_URL="https://fake-futures-redis.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN="test-only";
const mem=new Map();
let writes=0;
const now=Math.floor(Date.now()/1000);
const claims={
 iss:"https://token.actions.githubusercontent.com",
 aud:"https://avhl.org/api/odds/v7-futures-control",
 repository:"chrisbelcher249/avhl-site",repository_owner:"chrisbelcher249",
 ref:"refs/heads/main",
 workflow_ref:"chrisbelcher249/avhl-site/.github/workflows/refresh-v7-futures.yml@refs/heads/main",
 event_name:"schedule",run_id:"99",iat:now,exp:now+300
};
const b64=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const jwt=(change={})=>{
 const core=b64({alg:"RS256",kid:jwk.kid})+"."+b64({...claims,...change});
 return core+"."+sign("RSA-SHA256",Buffer.from(core),privateKey).toString("base64url");
};
globalThis.fetch=async (url,opts={})=>{
 if(String(url).includes(".well-known/jwks"))return {ok:true,json:async()=>({keys:[jwk]})};
 if(String(url)==="https://fake-futures-redis.invalid"){
   const [cmd,...args]=JSON.parse(opts.body);
   if(cmd==="GET")return {ok:true,json:async()=>({result:mem.has(args[0])?mem.get(args[0]):null})};
   if(cmd==="SET"){mem.set(args[0],args[1]);writes++;return{ok:true,json:async()=>({result:"OK"})};}
   if(cmd==="INCR"){const next=Number(mem.get(args[0])||0)+1;mem.set(args[0],String(next));return {ok:true,json:async()=>({result:next})};}
   if(cmd==="MGET")return {ok:true,json:async()=>({result:args.map(k=>mem.has(k)?mem.get(k):null)})};
   if(cmd==="SCAN")return {ok:true,json:async()=>({result:["0",[]]})};
   throw Error("Unexpected Redis command "+cmd);
 }
 throw Error("Unexpected external network access in V7 futures test "+url);
};
const codes=Array.from({length:40},(_,i)=>"T"+String(i).padStart(2,"0"));
const entries=[];
for(let i=0;i<40;i++)for(let j=i+1;j<40;j++){
 const a=codes[i],b=codes[j];
 entries.push({a,b,key:"v7f:1:1234567890abcdef:"+a+":"+b+":1234567890abcdef"});
}
const snapshot=snapshotDigest(entries);
const pool={
 firstHome:Array.from({length:50},()=>[3,2,0]),
 secondHome:Array.from({length:50},()=>[2,3,0])
};
const post=(token,body)=>POST(new Request("https://www.avhl.org/api/odds/v7-futures-control",{
 method:"POST",headers:{Authorization:token?"Bearer "+token:"","Content-Type":"application/json"},
 body:JSON.stringify(body)
}));
try{
 assert.equal((await post(null,{action:"inspect",entries,snapshot})).status,401);
 assert.equal((await post(jwt({aud:"https://avhl.org/api/odds/v7-ingest"}),{action:"inspect",entries,snapshot})).status,401);
 assert.equal((await post(jwt({workflow_ref:claims.workflow_ref.replace("refresh-v7-futures","refresh-v7-odds")}),
   {action:"inspect",entries,snapshot})).status,401);
 assert.equal(writes,0);
 const inspected=await post(jwt(),{action:"inspect",entries,snapshot});
 assert.equal(inspected.status,200);
 const initial=await inspected.json();
 assert.equal(initial.missing.length,780);
 assert.equal(initial.completed,0);
 assert.equal(mem.get("avhl:odds:futures:pending"),snapshot);
 assert(!mem.has("avhl:odds:futures:current"),"Planning must not publish an incomplete current snapshot.");
 let publicResult=await GET();
 assert.equal(publicResult.status,503);
 assert.equal((await publicResult.json()).status,"building");
 const invalid=await post(jwt(),{action:"ingest",snapshot,key:entries[0].key,
   pool:{...pool,firstHome:pool.firstHome.slice(0,49)}});
 assert.equal(invalid.status,400);
 const published=await post(jwt(),{action:"ingest",snapshot,key:entries[0].key,pool});
 assert.equal(published.status,200);
 assert.equal((await published.json()).samples,100);
 publicResult=await GET();
 assert.equal(publicResult.status,503);
 const state=await publicResult.json();
 assert.equal(state.completedPairs,1);
 assert.equal(state.targetGameSamples,78000);
 const premature=await post(jwt(),{action:"finalize",snapshot});
 assert.equal(premature.status,409);
 assert.equal((await premature.json()).completed,1);
 assert(!mem.has("avhl:odds:futures:forecast:"+snapshot));
 // Regression: when a new lineup arrives, inspect MUST preserve the already
 // published complete market while calculating the replacement.
 const oldDigest="aaaaaaaabbbbbbbbcccccccc";
 const oldForecast={method:"hybrid-V7-empirical-injury-goalie-v1",
   sourceDigest:oldDigest,matchedPairs:780,engineSamples:78000,runs:10000,
   generatedAt:new Date().toISOString(),
   teams:[{abbreviation:"COL",probabilities:{cup:0.034}}]};
 mem.set("avhl:odds:futures:current",oldDigest);
 mem.set("avhl:odds:futures:forecast:"+oldDigest,JSON.stringify(oldForecast));
 const inspectingAgain=await post(jwt(),{action:"inspect",entries,snapshot});
 assert.equal(inspectingAgain.status,200);
 assert.equal(mem.get("avhl:odds:futures:current"),oldDigest,
   "A pending goalie/lineup change may NOT invalidate the public completed forecast.");
 assert.equal(mem.get("avhl:odds:futures:pending"),snapshot);
 assert.equal(mem.get("avhl:odds:futures:last-verified"),oldDigest);
 assert.equal(JSON.parse(mem.get("avhl:odds:futures:last-complete-forecast")).sourceDigest,oldDigest,
   "Last fully verified odds must also survive in a stable archive.");
 publicResult=await GET();
 assert.equal(publicResult.status,200);
 const whileUpdating=await publicResult.json();
 assert.equal(whileUpdating.status,"updating");
 assert.equal(whileUpdating.fallback.sourceDigest,oldDigest);
 assert.equal(whileUpdating.fallback.teams[0].probabilities.cup,0.034);
 // Simulate the final atomic commit: finished forecast stored first, then
 // the current pointer moves, replacing the previous prices in one read.
 const replacement={...oldForecast,sourceDigest:snapshot};
 mem.set("avhl:odds:futures:forecast:"+snapshot,JSON.stringify(replacement));
 mem.set("avhl:odds:futures:current",snapshot);
 publicResult=await GET();
 assert.equal(publicResult.status,200);
 const afterSwap=await publicResult.json();
 assert.equal(afterSwap.ok,true);
 assert.equal(afterSwap.sourceDigest,snapshot);
 console.log("AVHL exact V7 futures control: PASS (atomic publish, old odds remain during goalie change, 780-pair gate, signed OIDC).");
}finally{
 globalThis.fetch=oldFetch;
 for(const [k,v] of Object.entries(envs))if(v===undefined)delete process.env[k];else process.env[k]=v;
}