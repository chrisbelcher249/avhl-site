const prefix="avhl:odds:futures:";
export const futuresRedisKey=key=>prefix+key;
export function redisConfig(){
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
 return url&&token?{url:url.replace(/\/+$/,""),token}:null;
}
export async function redisCommand(command){
 const config=redisConfig();
 if(!config)throw Error("Persistent AVHL futures cache is not configured.");
 const response=await fetch(config.url,{
  method:"POST",
  headers:{Authorization:`Bearer ${config.token}`,"Content-Type":"application/json"},
  body:JSON.stringify(command),
  cache:"no-store",signal:AbortSignal.timeout(18000)
 });
 if(!response.ok)throw Error("Persistent AVHL futures cache temporarily unavailable.");
 const result=await response.json();
 if(result.error)throw Error("Persistent AVHL futures cache command failed.");
 return result.result??null;
}
export async function redisMultiGet(keys){
 const values=[];
 for(let i=0;i<keys.length;i+=100){
  const batch=await redisCommand(["MGET",...keys.slice(i,i+100)]);
  if(!Array.isArray(batch))throw Error("AVHL futures cache multiget returned invalid data.");
  values.push(...batch.map(v=>typeof v==="string"?JSON.parse(v):null));
 }
 return values;
}
