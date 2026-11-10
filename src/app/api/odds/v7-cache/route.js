// Public read-only cache of precomputed, exact V7 game outcomes.
// A key contains the actual V7 simulator hash AND the complete matchup
// configuration hash, including owner lineups. No player ratings or lineup
// edits are ever accepted from callers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const KEY_RE = /^v7:(?:2|3):[a-f0-9]{8}:[A-Z0-9]{2,4}:[A-Z0-9]{2,4}:[a-f0-9]{8}$/;
const NAMESPACE = "avhl:odds:exact:sample:";
const SUMMARY_NAMESPACE = "avhl:odds:exact:summary:";
function config() {
  const url=process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? {url:url.replace(/\/+$/,""),token}:null;
}
export async function GET(request) {
  const key=new URL(request.url).searchParams.get("key") || "";
  if(!KEY_RE.test(key))return Response.json({ok:false,error:"Invalid V7 cache key."},{status:400});
  const redis=config();
  if(!redis)return Response.json({ok:false,error:"Shared V7 odds cache has not been configured."},{
    status:503,headers:{"Cache-Control":"no-store"}
  });
  try {
    async function readRedis(redisKey) {
      const response=await fetch(redis.url,{
        method:"POST",headers:{"Authorization":`Bearer ${redis.token}`,"Content-Type":"application/json"},
        body:JSON.stringify(["GET",redisKey]),cache:"no-store"
      });
      if(!response.ok)throw new Error("Shared cache is temporarily unavailable.");
      const body=await response.json();
      if(body?.error)throw new Error("Shared cache read failed.");
      return typeof body?.result==="string"?JSON.parse(body.result):null;
    }
    // The summary is tiny: visitor browsers do not need 1,000 complete
    // 36-skater box-score objects just to render the odds board.
    const compact=await readRedis(SUMMARY_NAMESPACE+key);
    if(compact?.count>=1000 && compact.summary?.count===compact.count &&
       compact.summary.source==="v7-complete-games"){
      return Response.json({ok:true,ready:true,count:compact.count,summary:compact.summary},{
        headers:{"Cache-Control":"no-store"}
      });
    }
    const saved=await readRedis(NAMESPACE+key);
    if(!Array.isArray(saved?.samples)||saved.samples.length<1000)return Response.json({
      ok:true,ready:false,count:Array.isArray(saved?.samples)?saved.samples.length:0
    },{headers:{"Cache-Control":"no-store"}});
    return Response.json({ok:true,ready:true,count:saved.samples.length,samples:saved.samples},{
      headers:{"Cache-Control":"public, s-maxage=45, stale-while-revalidate=45"}
    });
  } catch(error) {
    console.error("Unable to read shared V7 odds cache",error);
    return Response.json({ok:false,error:"Shared odds cache is temporarily unavailable."},{
      status:503,headers:{"Cache-Control":"no-store"}
    });
  }
}
