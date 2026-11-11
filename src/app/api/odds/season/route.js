import {redisCommand,futuresRedisKey} from "../../../../lib/v7FuturesRedis.js";
import {HYBRID_FUTURES_METHOD} from "../../../../lib/hybridFuturesModel.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=30;

const reply=(data,status=200)=>Response.json(data,{
 status,headers:{"Cache-Control":"no-store"}
});
const DIGEST=/^[a-f0-9]{24}$/;
function completeForecast(forecast,snapshot){
  const generated=Date.parse(forecast?.generatedAt);
  return (forecast?.method===HYBRID_FUTURES_METHOD||
    forecast?.method==="exact-V7-game-outcome-resampling")&&
    forecast?.sourceDigest===snapshot&&forecast?.matchedPairs===780&&
    forecast?.engineSamples===78000&&
    Number.isFinite(generated)&&generated<=Date.now()+5*60*1000;
}
async function lastCompleteForecast(current){
  const previous=await redisCommand(["GET",futuresRedisKey("last-verified")]);
  if(!DIGEST.test(previous||"")||previous===current)return null;
  const raw=await redisCommand(["GET",futuresRedisKey("forecast:"+previous)]);
  if(!raw)return null;
  const forecast=JSON.parse(raw);
  if(!completeForecast(forecast,previous)||Date.now()-Date.parse(forecast.generatedAt)>7*24*60*60*1000)
    return null;
  return forecast;
}
export async function GET(){
 try{
   // The 30-minute scheduled job publishes a canonical live-engine/lineup
   // fingerprint. Any lineup change invalidates the previous forecast.
   const snapshot=await redisCommand(["GET",futuresRedisKey("current")]);
   if(!DIGEST.test(snapshot||"")){
     const fallback=await lastCompleteForecast(null);
     return reply({ok:false,status:fallback?"updating":"building",
       completedPairs:0,requiredPairs:780,fallback,
       error:"The current 780-pair V7 matchup database has not been prepared yet."},
       fallback?200:503);
   }
   // A complete forecast remains valid for its canonical V7 lineup snapshot.
   // Do not pretend the 780-pair database is still building solely because
   // a GitHub scheduled refresh has been delayed beyond two hours.
   const saved=await redisCommand(["GET",futuresRedisKey("forecast:"+snapshot)]);
   if(saved){
     const forecast=JSON.parse(saved);
     if(completeForecast(forecast,snapshot)){
       return reply({ok:true,...forecast});
     }
   }
   const progress=Number(await redisCommand(["GET",futuresRedisKey("progress:"+snapshot)]))||0;
   const fallback=await lastCompleteForecast(snapshot);
   return reply({ok:false,status:fallback?"updating":"building",
     completedPairs:Math.max(0,Math.min(780,progress)),requiredPairs:780,
     completedGameSamples:Math.max(0,Math.min(780,progress))*100,
     targetGameSamples:78000,fallback,
     error:fallback?"Refreshing the 780-pair V7 database for the current lineups. Previous verified futures remain visible for reference only.":
       "Exact V7 pairings are being generated or refreshed. Current futures odds will appear after the full 50/50 matchup database is complete."},
     fallback?200:503);
 }catch(error){
   console.error("V7 season futures read failure",error);
   return reply({ok:false,status:"unavailable",
     error:"The verified V7 matchup database is temporarily unavailable. Outdated standings-model odds will not be substituted."},503);
 }
}