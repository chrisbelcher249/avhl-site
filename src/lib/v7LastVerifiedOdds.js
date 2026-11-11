// Read-only fallback for the last *trusted, fully sampled* game market.
// A different live lineup fingerprint is NEVER called current. This data may
// be shown for reference while the signed V7 publisher refreshes the matchup.
const KEY=/^v7:3:[a-f0-9]{8}:[A-Z0-9]{2,4}:[A-Z0-9]{2,4}:[a-f0-9]{8}$/;
const CLUB=/^[A-Z0-9]{2,4}$/;
const PREFIX="avhl:odds:exact:";
const MAX_AGE_MS=30*24*60*60*1000;

function redisConfig(){
  const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url&&token?{url:url.replace(/\/+$/,""),token}:null;
}
async function get(redis,key){
  const r=await fetch(redis.url,{
    method:"POST",cache:"no-store",signal:AbortSignal.timeout(10000),
    headers:{Authorization:"Bearer "+redis.token,"Content-Type":"application/json"},
    body:JSON.stringify(["GET",key])
  });
  if(!r.ok)throw Error("Verified market archive unavailable.");
  const result=await r.json();
  if(result.error)throw Error("Verified market archive read failed.");
  return result.result??null;
}
export async function lastVerifiedGameOdds(home,away,excludeKey=""){
  if(!CLUB.test(home)||!CLUB.test(away)||home===away)return null;
  const redis=redisConfig();
  if(!redis)return null;
  // The pointer is only written by the authenticated signed 1,000-game publisher.
  const pointer=await get(redis,PREFIX+"latest:"+home+":"+away);
  if(!pointer||!KEY.test(pointer)||pointer===excludeKey)return null;
  const parts=pointer.split(":");
  if(parts[3]!==home||parts[4]!==away)return null;
  const raw=await get(redis,PREFIX+"summary:"+pointer);
  if(typeof raw!=="string")return null;
  const value=JSON.parse(raw),age=Date.now()-Date.parse(value.generatedAt);
  if(value.publisher!=="trusted-github-actions"||value.count<1000||
     !Number.isInteger(value.count)||!Number.isFinite(age)||
     age<0||age>MAX_AGE_MS||value.summary?.source!=="v7-complete-games"||
     value.summary?.count!==value.count||
     value.summary?.home!==home||value.summary?.away!==away||
     !Number.isFinite(value.summary?.homeWin)||!Number.isFinite(value.summary?.awayWin))
     return null;
  return {key:pointer,count:value.count,summary:value.summary,generatedAt:value.generatedAt};
}
