import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {POST} from "../src/app/api/odds/v7-ingest/route.js";

const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk={...publicKey.export({format:"jwk"}),kid:"unit-test-key",use:"sig",alg:"RS256"};
const oldFetch=globalThis.fetch;
const savedVars=Object.fromEntries([
 "UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN",
 "UPSTASH_REDIS_REST_KV_REST_API_URL","UPSTASH_REDIS_REST_KV_REST_API_TOKEN"
].map(k=>[k,process.env[k]]));
process.env.UPSTASH_REDIS_REST_KV_REST_API_URL="https://fake-redis.invalid";
process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN="test-not-a-real-secret";
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const now=Math.floor(Date.now()/1000);
const defaultClaims={
 iss:"https://token.actions.githubusercontent.com",aud:"https://avhl.org/api/odds/v7-ingest",
 repository:"chrisbelcher249/avhl-site",repository_owner:"chrisbelcher249",
 ref:"refs/heads/main",
 workflow_ref:"chrisbelcher249/avhl-site/.github/workflows/refresh-v7-odds.yml@refs/heads/main",
 event_name:"schedule",run_id:"42",iat:now,exp:now+300
};
const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
function token(overrides={}){
 const data=b64({alg:"RS256",typ:"JWT",kid:"unit-test-key"})+"."+b64({...defaultClaims,...overrides});
 return data+"."+sign("RSA-SHA256",Buffer.from(data),privateKey).toString("base64url");
}
const key="v7:3:1234abcd:ATL:ARI:87654321";
const summary={
 source:"v7-complete-games",count:1000,home:"ATL",away:"ARI",
 homeWin:0.55,awayWin:0.45,players:[{},{}],goalies:[{},{}]
};
let writes=0;
globalThis.fetch=async (url,options)=>{
 if(String(url).includes("/.well-known/jwks"))return {ok:true,json:async()=>({keys:[jwk]})};
 if(String(url)==="https://fake-redis.invalid"){
   const body=JSON.parse(options.body);
   assert.equal(body[0],"SET");
   assert.equal(body[1],"avhl:odds:exact:summary:"+key);
   writes++;
   return {ok:true,json:async()=>({result:"OK"})};
 }
 throw Error("Unexpected network request");
};
const post=(auth,body)=>POST(new Request("https://avhl.org/api/odds/v7-ingest",{
 method:"POST",
 headers:{"Content-Type":"application/json",Authorization:auth?"Bearer "+auth:""},
 body:JSON.stringify(body)
}));
try{
 assert.equal((await post(null,{key,summary})).status,401);
 assert.equal((await post(token({ref:"refs/heads/experimental"}),{key,summary})).status,401);
 assert.equal((await post(token({aud:"https://example.com"}),{key,summary})).status,401);
 assert.equal((await post(token(),{key,summary:{...summary,count:999}})).status,400);
 assert.equal((await post(token(),{key:"v7:2:1234abcd:ATL:ARI:87654321",summary})).status,400);
 const approved=await post(token(),{key,summary});
 assert.equal(approved.status,200);
 const data=await approved.json();
 assert.equal(data.published,true);
 assert.equal(data.count,1000);
 assert.equal(writes,1,"Untrusted requests must never write to the shared cache");
 console.log("AVHL V7 OIDC publish: PASS (RSA signature, workflow identity, v7 key, 1000 gate and no secret-sharing).");
}finally{
 globalThis.fetch=oldFetch;
 for(const [key,value] of Object.entries(savedVars)) {
   if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
}
