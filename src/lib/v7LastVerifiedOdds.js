// Show only previously signed, fully sampled game odds while a new V7
// lineup fingerprint is being calculated. Never label historical odds current.
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
async function command(redis,args){
  const r=await fetch(redis.url,{
    method:"POST",cache:"no-store",signal:AbortSignal.timeout(10000),
    headers:{Authorization:"Bearer "+redis.token,"Content-Type":"application/json"},
    body:JSON.stringify(args)
  });
  if(!r.ok)throw Error("Verified V7 market archive unavailable.");
  const body=await r.json();
  if(body.error)throw Error("Verified V7 market archive read failed.");
  return body.result??null;
}
const get=(redis,key)=>command(redis,["GET",key]);
function validatedSummary(raw,key,home,away){
  if(typeof raw!=="string"||!KEY.test(key))return null;
  const parts=key.split(":");
  if(parts[3]!==home||parts[4]!==away)return null;
  const value=JSON.parse(raw),age=Date.now()-Date.parse(value.generatedAt);
  if(value.publisher!=="trusted-github-actions"||value.count<1000||
     !Number.isInteger(value.count)||!Number.isFinite(age)||
     age<0||age>MAX_AGE_MS||value.summary?.source!=="v7-complete-games"||
     value.summary?.count!==value.count||
     value.summary?.home!==home||value.summary?.away!==away||
     !Number.isFinite(value.summary?.homeWin)||!Number.isFinite(value.summary?.awayWin))
     return null;
  return {key,count:value.count,summary:value.summary,generatedAt:value.generatedAt};
}

async function findLegacyVerified(redis,home,away,excludeKey){
  // The original signed publisher created 30-day summary archives before it
  // started writing per-matchup "latest" pointers. A goalie change left those
  // older, authentic odds unreachable. Recover only the exact same home/away
  // pairing from signed, complete summary records (never other markets).
  const prefix=PREFIX+"summary:";
  const pattern=prefix+"v7:3:*:"+home+":"+away+":*";
  let cursor="0",best=null,reads=0;
  for(let page=0;page<8;page++){
    const batch=await command(redis,["SCAN",cursor,"MATCH",pattern,"COUNT",400]);
    if(!Array.isArray(batch)||batch.length!==2||!Array.isArray(batch[1]))
      break;
    for(const recordKey of batch[1]){
      if(reads>=24)break;
      if(typeof recordKey!=="string"||!recordKey.startsWith(prefix))continue;
      const key=recordKey.slice(prefix.length);
      if(!KEY.test(key)||key===excludeKey)continue;
      reads++;
      try{
        const candidate=validatedSummary(await get(redis,recordKey),key,home,away);
        if(candidate&&(!best||Date.parse(candidate.generatedAt)>Date.parse(best.generatedAt)))
          best=candidate;
      }catch{
        // Corrupt or unavailable individual archives are not usable odds.
      }
    }
    cursor=String(batch[0]);
    if(cursor==="0"||reads>=24)break;
  }
  if(best){
    // Never overwrite a newer pointer created by a concurrent signed publish.
    try{await command(redis,["SET",PREFIX+"latest:"+home+":"+away,
      best.key,"EX",30*24*60*60,"NX"]);}catch{}
  }
  return best;
}
export async function lastVerifiedGameOdds(home,away,excludeKey=""){
  if(!CLUB.test(home)||!CLUB.test(away)||home===away)return null;
  const redis=redisConfig();
  if(!redis)return null;
  const pointer=await get(redis,PREFIX+"latest:"+home+":"+away);
  if(pointer&&KEY.test(pointer)&&pointer!==excludeKey){
    const result=validatedSummary(await get(redis,PREFIX+"summary:"+pointer),
      pointer,home,away);
    if(result)return result;
  }
  return findLegacyVerified(redis,home,away,excludeKey);
}
