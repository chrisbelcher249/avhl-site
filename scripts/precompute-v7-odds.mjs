#!/usr/bin/env node
// Precompute exact V7 samples for shared Upstash storage, not synthetic scores.
// node scripts/precompute-v7-odds.mjs --away ARI --home ATL --target 1000
// Test without Redis/network: add --fixture --dry-run --target 2
import fs from "node:fs/promises";
import vm from "node:vm";
import process from "node:process";
import {summarizeV7Samples} from "../src/lib/v7OddsSamples.js";
const args=process.argv.slice(2);
const opt=(k,def="")=>{const i=args.indexOf(k);return i>=0?args[i+1]||def:def;};
const away=opt("--away").toUpperCase(), home=opt("--home").toUpperCase();
const target=Number(opt("--target","1000")),fixture=args.includes("--fixture"),dry=args.includes("--dry-run"),oidc=args.includes("--publish-oidc");
const site=opt("--site",process.env.AVHL_ODDS_SITE_URL||"https://avhl.org").replace(/\/+$/,"");
if(!/^[A-Z0-9]{2,4}$/.test(away)||!/^[A-Z0-9]{2,4}$/.test(home)||away===home)throw Error("Invalid --away/--home.");
if(!Number.isInteger(target)||target<1||target>5000)throw Error("Target must be an integer between 1 and 5,000.");
if(!dry&&target<1000)throw Error("A published odds cache requires 1,000+ V7 games.");
if(fixture&&!dry)throw Error("Do not publish bundled fixture rosters.");
if(oidc&&(fixture||dry))throw Error("OIDC publishing only accepts real complete live V7 games.");
if(oidc&&!["https://avhl.org","https://www.avhl.org"].includes(site))throw Error("OIDC publisher is restricted to the official AVHL production origin.");
const redisUrl=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const redisToken=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
if(!dry&&!oidc&&(!redisUrl||!redisToken))throw Error("Persistent Redis credentials must be configured.");
const files=["public/sim/team-metadata.js","public/sim/data.js","public/sim/simulator.js","public/odds/v7-sample-extractor.js"];
const scripts=await Promise.all(files.map(f=>fs.readFile(f,"utf8")));
const fnv=x=>{let h=2166136261;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,"0");};
async function redis(command){
 const response=await fetch(redisUrl.replace(/\/+$/,""),{
   method:"POST",headers:{Authorization:`Bearer ${redisToken}`,"Content-Type":"application/json"},
   body:JSON.stringify(command),cache:"no-store"
 });
 if(!response.ok)throw Error(`Shared Redis HTTP ${response.status}`);
 const body=await response.json();
 if(body.error)throw Error("Shared Redis response error.");
 return body.result??null;
}
let roster;
if(fixture){
 const [{players},{teams},{buildProjectedLineup},{recordFromProjected}]=await Promise.all([
  import("../data/players.js"),import("../data/teams.js"),
  import("../src/lib/lineups.js"),import("../src/lib/lineupRecords.js")
 ]);
 roster={ok:true,source:"live",players:players.filter(p=>p.currentTeam&&p.currentTeam!=="UFA"),
  lineups:Object.fromEntries(teams.map(t=>[t.abbreviation,recordFromProjected(t.abbreviation,
    buildProjectedLineup(players.filter(p=>p.currentTeam===t.name)))]))};
}else{
 let lastError;
 for(let attempt=1;attempt<=3;attempt++){
   try{
     const response=await fetch(`${site}/api/sim-rosters`,{
       cache:"no-store",signal:AbortSignal.timeout(45000)
     });
     if(!response.ok)throw Error(`Official roster request failed: ${response.status}`);
     const candidate=await response.json();
     if(!candidate?.ok||candidate.source!=="live"||!Array.isArray(candidate.players)||!candidate.lineups)
       throw Error("Official live lineups are incomplete.");
     roster=candidate;break;
   }catch(error){
     lastError=error;
     if(attempt<3){
       console.warn(`Live V7 roster read attempt ${attempt} failed; retrying.`);
       await new Promise(resolve=>setTimeout(resolve,15000*attempt));
     }
   }
 }
 if(!roster)throw lastError;
}
const ctx={console,Date,Math,structuredClone,fetch:async u=>{
 if(String(u).startsWith("/api/sim-rosters"))return {ok:true,status:200,json:async()=>roster};
 throw Error("Unexpected data request: "+u);
}};
ctx.self=ctx;ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
scripts.forEach((script,i)=>vm.runInContext(script,ctx,{filename:files[i]}));
await ctx.AVHL_LOAD_LIVE_ROSTERS();
const data=ctx.AVHL_CREATE_MATCHUP_DATA(home,away);
const key=`v7:3:${fnv(scripts[2])}:${home}:${away}:${fnv(JSON.stringify(data))}`;
const redisKey="avhl:odds:exact:sample:"+key;
async function getOidcToken(){
 const url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
 const token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!url||!token)throw Error("GitHub Actions workload identity is unavailable.");
 const separator=url.includes("?")?"&":"?";
 const response=await fetch(url+separator+"audience="+encodeURIComponent("https://avhl.org/api/odds/v7-ingest"),{
   headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Error("Could not obtain GitHub Actions OIDC token.");
 const data=await response.json();
 if(typeof data.value!=="string")throw Error("GitHub did not return a signed workload token.");
 return data.value;
}

const summaryRedisKey="avhl:odds:exact:summary:"+key;
let samples=[];
if(oidc){
  // The normal 30-minute check is cheap: skip without any V7 physics when
  // identical engine+owner-lineup odds have already been published.
  const response=await fetch(`${site}/api/odds/v7-cache?key=${encodeURIComponent(key)}`,{
    cache:"no-store",signal:AbortSignal.timeout(10000)
  });
  if(response.ok){
    const cached=await response.json();
    if(cached?.ok&&cached.ready&&cached.count>=target){
      console.log(JSON.stringify({status:"already-cached",away,home,count:cached.count,key}));
      process.exit(0);
    }
  }
}else if(!dry){
  const raw=await redis(["GET",redisKey]);
  const saved=typeof raw==="string"?JSON.parse(raw):null;
  if(Array.isArray(saved?.samples))samples=saved.samples;
}
if(samples.length>5000)throw Error("Corrupt cached sample count.");
const initial=samples.length;
if(!dry && samples.length>=1000){
  // Repair absent/stale compact summaries even if no new games are needed.
  const raw=await redis(["GET",summaryRedisKey]);
  const existingSummary=typeof raw==="string"?JSON.parse(raw):null;
  if(existingSummary?.count!==samples.length){
    await redis(["SET",summaryRedisKey,JSON.stringify({
      count:samples.length,summary:summarizeV7Samples(samples,away,home),
      engineHash:fnv(scripts[2]),generatedAt:new Date().toISOString()
    })]);
  }
}
console.log(JSON.stringify({away,home,target,initial,mode:fixture?"fixture":"live",key}));
for(let i=initial;i<target;i++){
 const seed=parseInt(fnv(`${key}:${i}`),16);
 const game=new ctx.AVHLGameSimulator(structuredClone(data),seed,{headless:true}).simulateGame();
 samples.push(ctx.AVHL_ODDS_EXTRACT_SAMPLE(game,away,home));
 if(samples.length%25===0||samples.length===target){
  if(!dry&&!oidc){
    const generatedAt=new Date().toISOString();
    await redis(["SET",redisKey,JSON.stringify({samples,engineHash:fnv(scripts[2]),away,home,source:"exact-v7",at:generatedAt})]);
    // Published viewers fetch only this compact summary, not 1,000+ box scores.
    if(samples.length>=1000){
      const summary=summarizeV7Samples(samples,away,home);
      await redis(["SET",summaryRedisKey,JSON.stringify({
        count:samples.length,summary,engineHash:fnv(scripts[2]),generatedAt
      })]);
    }
  }
  console.log(`Exact V7 games: ${samples.length} / ${target}`);
 }
}
if(oidc){
  if(samples.length<1000)throw Error("Refusing to publish fewer than 1,000 actual V7 games.");
  const summary=summarizeV7Samples(samples,away,home);
  const token=await getOidcToken();
  const response=await fetch(`${site}/api/odds/v7-ingest`,{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
    body:JSON.stringify({key,summary}),cache:"no-store",signal:AbortSignal.timeout(30000)
  });
  const receipt=await response.json();
  if(!response.ok||!receipt.ok||!receipt.published)throw Error("V7 odds publication failed; HTTP "+response.status+": "+JSON.stringify(receipt));
  console.log(JSON.stringify({status:"published",away,home,count:receipt.count,key}));
}
if(dry)console.log(JSON.stringify({smoke:"PASS",samples:samples.length,scores:samples.slice(0,2).map(s=>[s.a,s.h,s.f]),player:samples[0]?.players?.[0]?.name}));
