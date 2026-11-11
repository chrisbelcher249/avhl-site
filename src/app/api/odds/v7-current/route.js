// Canonical *server* lookup for the real, signed 1,000-game V7 odds cache.
// The browser must not recompute a trusted Redis key from potentially stale
// importScripts, roster data, or IndexedDB entries.
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createContext,runInContext} from "node:vm";
import {GET as getLiveRosters} from "../../sim-rosters/route.js";
import {GET as getExactCache} from "../v7-cache/route.js";
import {lastVerifiedGameOdds} from "@/lib/v7LastVerifiedOdds";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=30;

const RESPONSE_HEADERS={"Cache-Control":"no-store"};
const CLUB=/^[A-Z0-9]{2,4}$/;

async function historicalOr(response,home,away,currentKey=null){
  try{
    const fallback=await lastVerifiedGameOdds(home,away,currentKey||"");
    if(fallback)return Response.json({
      ok:true,ready:false,count:0,key:currentKey,
      status:"updating",fallback
    },{headers:RESPONSE_HEADERS});
  }catch(error){
    console.error("AVHL last-good game odds lookup failed",{
      home,away,reason:error instanceof Error?error.message:String(error)
    });
  }
  return response;
}

function fnv(text){
 let hash=2166136261;
 for(let i=0;i<text.length;i++){
   hash^=text.charCodeAt(i);
   hash=Math.imul(hash,16777619);
 }
 return (hash>>>0).toString(16).padStart(8,"0");
}
async function scriptSource(path,origin){
 try{return await readFile(join(process.cwd(),"public",path),"utf8");}
 catch(error){
   if(error?.code!=="ENOENT")throw error;
   const response=await fetch(new URL("/"+path,origin),{
     cache:"no-store",signal:AbortSignal.timeout(15000)
   });
   if(!response.ok)throw Error("V7 engine source unavailable.");
   return response.text();
 }
}
export async function GET(request){
 const url=new URL(request.url);
 const home=(url.searchParams.get("home")||"").toUpperCase();
 const away=(url.searchParams.get("away")||"").toUpperCase();
 if(!CLUB.test(home)||!CLUB.test(away)||home===away)
   return Response.json({ok:false,error:"Invalid V7 matchup."},{status:400,headers:RESPONSE_HEADERS});
 try{
   const [rosterResponse,metadata,data,engine]=await Promise.all([
     getLiveRosters(),
     scriptSource("sim/team-metadata.js",url.origin),
     scriptSource("sim/data.js",url.origin),
     scriptSource("sim/simulator.js",url.origin)
   ]);
   if(!rosterResponse.ok)
     return historicalOr(Response.json({ok:false,error:"Official live V7 rosters are temporarily unavailable."},
       {status:503,headers:RESPONSE_HEADERS}),home,away);
   const roster=await rosterResponse.json();
   if(roster?.source!=="live"||!Array.isArray(roster.players)||!roster.lineups)
     return historicalOr(Response.json({ok:false,error:"Incomplete official V7 roster state."},
       {status:503,headers:RESPONSE_HEADERS}),home,away);
   const ctx={
     Date,Math,structuredClone,console,
     fetch:async input=>{
       if(!String(input).startsWith("/api/sim-rosters"))
         throw Error("Unexpected external resource in canonical odds reader.");
       return {ok:true,status:200,json:async()=>roster};
     }
   };
   ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
   createContext(ctx);
   runInContext(metadata,ctx,{filename:"team-metadata.js",timeout:1000});
   runInContext(data,ctx,{filename:"data.js",timeout:1000});
   await ctx.AVHL_LOAD_LIVE_ROSTERS();
   const matchup=ctx.AVHL_CREATE_MATCHUP_DATA(home,away);
   const key="v7:3:"+fnv(engine)+":"+home+":"+away+":"+fnv(JSON.stringify(matchup));
   // The existing cache API enforces the actual 1,000 COMPLETE V7 games
   // and only returns a compact, signed-publisher-produced market summary.
   const cached=await getExactCache(new Request(
     new URL("/api/odds/v7-cache?key="+encodeURIComponent(key),url.origin)
   ));
   const result=await cached.json();
   if(!cached.ok||!result.ok)
     return historicalOr(Response.json({ok:false,error:"Verified V7 game cache temporarily unavailable."},
       {status:503,headers:RESPONSE_HEADERS}),home,away,key);
   if(result.ready===true&&result.count>=1000&&
      result.summary?.source==="v7-complete-games"&&
      result.summary?.count===result.count&&
      result.summary.away===away&&result.summary.home===home){
     return Response.json({ok:true,ready:true,count:result.count,key,
       generatedAt:result.generatedAt||null,summary:result.summary},
       {headers:RESPONSE_HEADERS});
   }
   return historicalOr(Response.json({ok:true,ready:false,count:0,key},
     {headers:RESPONSE_HEADERS}),home,away,key);
 }catch(error){
   console.error("Canonical V7 odds read failed",{
     home,away,reason:error instanceof Error?error.message:String(error)
   });
   return historicalOr(Response.json({ok:false,error:"Could not verify current V7 matchup odds."},
     {status:503,headers:RESPONSE_HEADERS}),home,away);
 }
}
