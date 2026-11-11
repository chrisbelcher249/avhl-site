import {verifyActionsToken} from "../v7-ingest/route.js";
import {snapshotDigest,TOTAL_PAIRS,validatePairPool} from "../../../../lib/v7FuturesPairs.js";
import {futuresRedisKey,redisCommand,redisMultiGet} from "../../../../lib/v7FuturesRedis.js";
import {forecastSeasonFutures,SEASON_SCENARIOS,SEASON_METHOD} from "../../../../lib/seasonFuturesForecast.js";
import {HYBRID_FUTURES_METHOD} from "../../../../lib/hybridFuturesModel.js";
import {fetchSeasonSheet,SEASON_TABS} from "../../../../lib/seasonSheets.js";
import {aggregateGoalies,parseGoalieGameRows} from "../../../../lib/seasonStats.js";
import {teams} from "../../../../../data/teams.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=120;

const AUDIENCE="https://avhl.org/api/odds/v7-futures-control";
const WORKFLOW="chrisbelcher249/avhl-site/.github/workflows/refresh-v7-futures.yml@refs/heads/main";
const PAIR_RE=/^v7f:1:[a-f0-9]{16}:[A-Z0-9]{2,4}:[A-Z0-9]{2,4}:[a-f0-9]{16}$/;
const DIGEST_RE=/^[a-f0-9]{24}$/;
const response=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const parse=v=>typeof v==="string"?JSON.parse(v):null;
async function getPlan(snapshot){
 return parse(await redisCommand(["GET",futuresRedisKey("plan:"+snapshot)]));
}
function checkEntries(entries,snapshot){
 if(!Array.isArray(entries)||entries.length!==TOTAL_PAIRS||!DIGEST_RE.test(snapshot))
   throw Error("Invalid AVHL futures plan.");
 const clubs=new Set(),pairSet=new Set(),keySet=new Set();
 for(const {a,b,key} of entries){
   if(typeof a!=="string"||typeof b!=="string"||a>=b||!PAIR_RE.test(key)||
      key.split(":")[3]!==a||key.split(":")[4]!==b)throw Error("Invalid canonical V7 pairing.");
   const pair=a+":"+b;
   if(pairSet.has(pair)||keySet.has(key))throw Error("Duplicate V7 pairing.");
   pairSet.add(pair);keySet.add(key);clubs.add(a);clubs.add(b);
 }
 if(clubs.size!==40)throw Error("Expected 40 different AVHL teams.");
 const codes=[...clubs].sort();
 for(let i=0;i<codes.length;i++)for(let j=i+1;j<codes.length;j++)
   if(!pairSet.has(codes[i]+":"+codes[j]))throw Error("Incomplete AVHL pairing coverage.");
 if(snapshotDigest(entries)!==snapshot)throw Error("V7 pairing fingerprint mismatch.");
}
export async function POST(request){
 let action="";
 try{
   const auth=request.headers.get("authorization")||"";
   if(!auth.startsWith("Bearer "))return response({ok:false,error:"Unauthorized."},401);
   await verifyActionsToken(auth.slice(7),{audience:AUDIENCE,workflowRef:WORKFLOW});
   const body=await request.json();
   action=body?.action;
   if(action==="inspect"){
     const {entries,snapshot}=body;
     checkEntries(entries,snapshot);
     const values=await redisMultiGet(entries.map(p=>futuresRedisKey("pair:"+p.key)));
     const missing=entries.filter((p,i)=>!validatePairPool(values[i]));
     const plan={snapshot,entries,createdAt:new Date().toISOString()};
     await redisCommand(["SET",futuresRedisKey("plan:"+snapshot),JSON.stringify(plan),"EX",604800]);
     await redisCommand(["SET",futuresRedisKey("current"),snapshot]);
     await redisCommand(["SET",futuresRedisKey("progress:"+snapshot),String(TOTAL_PAIRS-missing.length),"EX",604800]);
     return response({ok:true,snapshot,completed:TOTAL_PAIRS-missing.length,
       required:TOTAL_PAIRS,missing});
   }
   if(action==="ingest"){
     const {snapshot,key,pool}=body||{};
     if(!DIGEST_RE.test(snapshot||"")||!PAIR_RE.test(key||"")||
        !validatePairPool(pool))return response({ok:false,error:"Invalid V7 game outcome pool."},400);
     const plan=await getPlan(snapshot);
     if(!plan?.entries?.some(p=>p.key===key))return response({ok:false,error:"Unknown V7 pairing in snapshot."},400);
     const current=await redisCommand(["GET",futuresRedisKey("current")]);
     if(current!==snapshot)return response({ok:false,error:"Stale V7 pairing snapshot."},409);
     const storageKey=futuresRedisKey("pair:"+key);
     // Only a fully complete 50/50 V7 pair is ever published.
     const previously=await redisCommand(["GET",storageKey]);
     await redisCommand(["SET",storageKey,JSON.stringify(pool),"EX",17280000]);
     if(previously==null)await redisCommand(["INCR",futuresRedisKey("progress:"+snapshot)]);
     return response({ok:true,key,samples:100});
   }
   if(action==="finalize"){
     const {snapshot}=body||{};
     if(!DIGEST_RE.test(snapshot||""))return response({ok:false,error:"Invalid V7 snapshot."},400);
     const current=await redisCommand(["GET",futuresRedisKey("current")]);
     if(current!==snapshot)return response({ok:false,error:"Superseded V7 snapshot."},409);
     const plan=await getPlan(snapshot);
     if(!plan?.entries||plan.entries.length!==TOTAL_PAIRS)return response({ok:false,error:"Missing V7 pairing plan."},409);
     const values=await redisMultiGet(plan.entries.map(p=>futuresRedisKey("pair:"+p.key)));
     const incomplete=values.filter(v=>!validatePairPool(v)).length;
     if(incomplete)return response({ok:false,error:"V7 matchup sampling still incomplete.",
       completed:TOTAL_PAIRS-incomplete,required:TOTAL_PAIRS},409);
     const pools=Object.fromEntries(plan.entries.map((p,i)=>[p.a+":"+p.b,values[i]]));
     const {getSchedule}=await import("@/lib/schedule");
     const {schedule,source,error}=await getSchedule();
     if(source!=="live"||error)throw Error("Official live AVHL results are unavailable.");
     const league=teams.map(t=>({
       slug:t.slug,name:t.name,abbreviation:t.abbreviation,
       conference:t.conference,division:t.division,
       logo:t.assets?.logo||"/teams/"+t.abbreviation+"/logo.webp"
     }));
     // Validate and retain the pure-V7 forecast for side-by-side comparison.
     // It must never silently masquerade as our calibrated hybrid projection.
     const pure=forecastSeasonFutures(schedule,league,SEASON_SCENARIOS,pools,snapshot);
     const [rosterResponse,goalieSheet]=await Promise.all([
       fetch("https://www.avhl.org/api/sim-rosters",{
         cache:"no-store",signal:AbortSignal.timeout(45000)
       }),
       fetchSeasonSheet(SEASON_TABS.goalieStats),
     ]);
     if(!rosterResponse.ok)throw Error("Live injury/owner lineup source unavailable.");
     const live=await rosterResponse.json();
     if(!live?.ok||live.source!=="live"||!Array.isArray(live.players)||
        Object.keys(live.lineups||{}).length!==40||!Array.isArray(live.activeInjuries))
       throw Error("Injuries and effective owner lineups are not fully available.");
     const goalieStats=aggregateGoalies(parseGoalieGameRows(goalieSheet.rows),[]);
     const outlook=forecastSeasonFutures(schedule,league,SEASON_SCENARIOS,pools,snapshot,{
       players:live.players,lineups:live.lineups,
       injuries:live.activeInjuries,goalieStats
     });
     if(outlook.method!==HYBRID_FUTURES_METHOD||pure.method!==SEASON_METHOD)
       throw Error("Expected separate pure-V7 and hybrid season forecast models.");
     const published={...outlook,
       pureV7:{method:pure.method,runs:pure.runs,teams:pure.teams,
         modelNote:pure.modelNote},
       sourceDigest:snapshot,
       generatedAt:new Date().toISOString(),pairedGameSamples:TOTAL_PAIRS*100,
       perPairHomeSamples:50,perPairAwaySamples:50};
     // Publish after the *entire* snapshot and official schedule have passed.
     // Seven-day bounded retention ensures a delayed GitHub Actions schedule
     // cannot hide a valid, fully-sampled current-lineup forecast after 6h.
     // Publication still requires all 780 canonical live V7 matchup pools.
     await redisCommand(["SET",futuresRedisKey("forecast:"+snapshot),JSON.stringify(published),"EX",604800]);
     // Keep the last fully verified snapshot discoverable while new lineups
     // are rebuilding. This pointer never makes older prices current.
     await redisCommand(["SET",futuresRedisKey("last-verified"),snapshot,"EX",604800]);
     await redisCommand(["SET",futuresRedisKey("progress:"+snapshot),String(TOTAL_PAIRS),"EX",604800]);
     return response({ok:true,published:true,snapshot,pairedGameSamples:78000,
       completedGames:outlook.completedGames,runs:outlook.runs});
   }
   return response({ok:false,error:"Unknown V7 futures action."},400);
 }catch(error){
   console.error("V7 futures control failed:",{action,reason:error instanceof Error?error.message:String(error)});
   const msg=error instanceof Error?error.message:"";
   return response({ok:false,error:/token|OIDC|identity|signature|signing key|Unauthorized/i.test(msg)?
     "Unauthorized V7 futures publisher.":"Unable to process exact V7 futures refresh."},
     /token|OIDC|identity|signature|signing key|Unauthorized/i.test(msg)?401:503);
 }
}