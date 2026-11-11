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
   // "current" is the last fully published V7 forecast. "pending" is
   // independently prepared by the background workflow, never made active
   // until all 780 verified pair pools and the hybrid forecast are complete.
   const [current,pending]=await Promise.all([
     redisCommand(["GET",futuresRedisKey("current")]),
     redisCommand(["GET",futuresRedisKey("pending")])
   ]);
   const preparing=DIGEST.test(pending||"")&&pending!==current;
   let verified=null;
   if(DIGEST.test(current||"")){
     const raw=await redisCommand(["GET",futuresRedisKey("forecast:"+current)]);
     if(raw){
       const forecast=JSON.parse(raw);
       if(completeForecast(forecast,current))verified=forecast;
     }
   }
   if(verified&&!preparing)return reply({ok:true,...verified});

   const progressSnapshot=preparing?pending:DIGEST.test(pending||"")?pending:current;
   const progress=DIGEST.test(progressSnapshot||"")?
     Number(await redisCommand(["GET",futuresRedisKey("progress:"+progressSnapshot)]))||0:0;
   // In transition, the complete previous forecast stays available for
   // reference on every device, even on a fresh load with no browser cache.
   const fallback=verified||await lastCompleteForecast(current);
   return reply({
     ok:false,status:fallback?"updating":"building",
     completedPairs:Math.max(0,Math.min(780,progress)),requiredPairs:780,
     completedGameSamples:Math.max(0,Math.min(780,progress))*100,
     targetGameSamples:78000,fallback,
     error:fallback?
       "Refreshing V7 season futures. Previous verified odds stay visible until the new complete forecast is published.":
       "The first complete 780-pair V7 season forecast is still building."
   },fallback?200:503);
 }catch(error){
   console.error("V7 season futures read failure",error);
   return reply({ok:false,status:"unavailable",
     error:"The verified V7 matchup database is temporarily unavailable. Unverified odds will not be substituted."},503);
 }
}
