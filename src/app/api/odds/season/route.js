import {redisCommand,futuresRedisKey} from "../../../../lib/v7FuturesRedis.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=30;

const reply=(data,status=200)=>Response.json(data,{
 status,headers:{"Cache-Control":"no-store"}
});
export async function GET(){
 try{
   // The 30-minute scheduled job publishes a canonical live-engine/lineup
   // fingerprint. Any lineup change invalidates the previous forecast.
   const snapshot=await redisCommand(["GET",futuresRedisKey("current")]);
   if(!snapshot||!/^[a-f0-9]{24}$/.test(snapshot)){
     return reply({ok:false,status:"building",completedPairs:0,requiredPairs:780,
       error:"The 780-pair exact V7 matchup database has not been prepared yet."},503);
   }
   const saved=await redisCommand(["GET",futuresRedisKey("forecast:"+snapshot)]);
   if(saved){
     const forecast=JSON.parse(saved);
     const recent=Date.parse(forecast.generatedAt);
     if(forecast.method==="exact-V7-game-outcome-resampling"&&
        forecast.sourceDigest===snapshot&&forecast.matchedPairs===780&&
        forecast.engineSamples===78000&&
        Number.isFinite(recent)&&Date.now()-recent<2*60*60*1000){
       return reply({ok:true,...forecast});
     }
   }
   const progress=Number(await redisCommand(["GET",futuresRedisKey("progress:"+snapshot)]))||0;
   return reply({ok:false,status:"building",
     completedPairs:Math.max(0,Math.min(780,progress)),requiredPairs:780,
     completedGameSamples:Math.max(0,Math.min(780,progress))*100,
     targetGameSamples:78000,
     error:"Exact V7 pairings are being generated or refreshed. Season odds are withheld until the full current 50/50 matchup database is complete."},503);
 }catch(error){
   console.error("V7 season futures read failure",error);
   return reply({ok:false,status:"unavailable",
     error:"The verified V7 matchup database is temporarily unavailable. Outdated standings-model odds will not be substituted."},503);
 }
}