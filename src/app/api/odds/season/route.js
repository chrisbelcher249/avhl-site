import { unstable_cache } from "next/cache";
import { getSchedule } from "@/lib/schedule";
import { teams } from "../../../../../data/teams";
import { forecastSeasonFutures, SEASON_SCENARIOS } from "@/lib/seasonFuturesForecast";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=60;

// Calculate the standings-based outlook once per 30-minute window rather
// than re-simulating 10,000 seasons for each visitor.
const getCachedForecast=unstable_cache(async()=>{
  const {schedule,source,error}=await getSchedule();
  if(source!=="live"||error)throw Error("Complete live AVHL schedule and scores are temporarily unavailable.");
  const snapshot=forecastSeasonFutures(schedule,teams.map(t=>({
    slug:t.slug,name:t.name,abbreviation:t.abbreviation,
    conference:t.conference,division:t.division,
    logo:t.assets?.logo||"/teams/"+t.abbreviation+"/logo.webp"
  })),SEASON_SCENARIOS);
  return {...snapshot,generatedAt:new Date().toISOString()};
},["avhl-season-outlook-2026-v2"],{revalidate:1800});

export async function GET(){
  try{
    const result=await getCachedForecast();
    return Response.json({ok:true,...result},{headers:{
      "Cache-Control":"public, s-maxage=60, stale-while-revalidate=60"
    }});
  }catch(error){
    console.error("Unable to compute AVHL season outlook",error);
    return Response.json({
      ok:false,error:"Live season results are unavailable. Season probabilities are withheld rather than estimated from fallback results."
    },{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
