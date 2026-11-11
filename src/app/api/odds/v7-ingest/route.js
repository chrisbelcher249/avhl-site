// Trusted GitHub Actions OIDC endpoint for publishing ONLY 1,000+ exact V7
// sample aggregates into the site's already-configured Upstash Redis.
// GitHub signs short-lived workload tokens; no Redis secret leaves Vercel.
import {createPublicKey,verify as cryptoVerify} from "node:crypto";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const AUDIENCE="https://avhl.org/api/odds/v7-ingest";
const ISSUER="https://token.actions.githubusercontent.com";
const WORKFLOW="chrisbelcher249/avhl-site/.github/workflows/refresh-v7-odds.yml@refs/heads/main";
const REPO="chrisbelcher249/avhl-site";
const CACHE_KEY=/^v7:3:[a-f0-9]{8}:[A-Z0-9]{2,4}:[A-Z0-9]{2,4}:[a-f0-9]{8}$/;
// Old lineup versions should not occupy Redis for the entire season.
export const V7_ODDS_CACHE_TTL_SECONDS=30*24*60*60;
function redisConfig(){
  const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url&&token?{url:url.replace(/\/+$/,""),token}:null;
}
function decodeBase64Url(value){
  return Buffer.from(value,"base64url");
}
export async function verifyActionsToken(token,{audience=AUDIENCE,workflowRef=WORKFLOW}={}){
  if(typeof token!=="string"||token.length>12000)throw new Error("Invalid authentication token.");
  const parts=token.split(".");
  if(parts.length!==3)throw new Error("Invalid token shape.");
  const header=JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
  const claims=JSON.parse(decodeBase64Url(parts[1]).toString("utf8"));
  if(header.alg!=="RS256"||!header.kid||typeof header.kid!=="string")throw new Error("Unsupported token algorithm.");
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==ISSUER||claims.aud!==audience ||
     claims.repository!==REPO||claims.repository_owner!=="chrisbelcher249"||
     claims.ref!=="refs/heads/main"||claims.workflow_ref!==workflowRef||
     !["schedule","push","workflow_dispatch"].includes(claims.event_name)||
     typeof claims.exp!=="number"||typeof claims.iat!=="number"||
     claims.iat>now+60||claims.exp<=now||claims.exp-claims.iat>1200){
    throw new Error("GitHub Actions identity not authorized for V7 odds publishing.");
  }
  const jwksResponse=await fetch(`${ISSUER}/.well-known/jwks`,{
    cache:"force-cache",next:{revalidate:3600},signal:AbortSignal.timeout(8000)
  });
  if(!jwksResponse.ok)throw new Error("Unable to verify GitHub OIDC signing keys.");
  const jwks=await jwksResponse.json();
  const jwk=(jwks.keys||[]).find(key=>key.kid===header.kid&&key.kty==="RSA"&&key.use==="sig");
  if(!jwk)throw new Error("Unknown GitHub Actions signing key.");
  const key=createPublicKey({key:jwk,format:"jwk"});
  const signed=Buffer.from(parts[0]+"."+parts[1]);
  const signature=decodeBase64Url(parts[2]);
  if(!cryptoVerify("RSA-SHA256",signed,key,signature))throw new Error("Invalid OIDC signature.");
  return claims;
}
export async function POST(request){
  try{
    const authorization=request.headers.get("authorization")||"";
    if(!authorization.startsWith("Bearer "))return Response.json({ok:false,error:"Unauthorized."},{status:401});
    const claims=await verifyActionsToken(authorization.slice(7));
    const len=Number(request.headers.get("content-length")||0);
    if(len>1024*1024)return Response.json({ok:false,error:"Summary payload too large."},{status:413});
    const {key,summary}=await request.json();
    if(!CACHE_KEY.test(key||"")||!summary||
       summary.source!=="v7-complete-games"||!Number.isInteger(summary.count)||summary.count<1000||
       summary.count>5000||!Array.isArray(summary.players)||!Array.isArray(summary.goalies)||
       summary.players.length<2||summary.goalies.length!==2||
       !Number.isFinite(summary.homeWin)||!Number.isFinite(summary.awayWin)||
       Math.abs(summary.homeWin+summary.awayWin-1)>1e-8){
      return Response.json({ok:false,error:"Invalid complete V7 sample summary."},{status:400});
    }
    const [,version,engineHash,home,away,lineupHash]=key.split(":");
    if(version!=="3"||engineHash.length!==8||lineupHash.length!==8 ||
       summary.home!==home||summary.away!==away) {
      return Response.json({ok:false,error:"V7 matchup cache fingerprint mismatch."},{status:400});
    }
    const redis=redisConfig();
    if(!redis)return Response.json({ok:false,error:"Shared odds cache is not configured."},{status:503});
    const generatedAt=new Date().toISOString();
    const value={count:summary.count,summary,generatedAt,engineHash,
      publisher:"trusted-github-actions",runId:claims.run_id||""};
    const response=await fetch(redis.url,{
      method:"POST",headers:{
        Authorization:`Bearer ${redis.token}`,"Content-Type":"application/json"
      },body:JSON.stringify(["SET","avhl:odds:exact:summary:"+key,JSON.stringify(value),
        "EX",V7_ODDS_CACHE_TTL_SECONDS]),
      cache:"no-store",signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw new Error("Persistent cache write failed.");
    const result=await response.json();
    if(result?.error)throw new Error("Persistent cache rejected the V7 odds summary.");
    // Keep one tiny pointer per ordered matchup. Historical prices are
    // reference-only until the current fingerprint has its own 1,000 games.
    // Never store an unsigned/browser-computed summary as a fallback.
    const pointer=await fetch(redis.url,{
      method:"POST",headers:{
        Authorization:`Bearer ${redis.token}`,"Content-Type":"application/json"
      },body:JSON.stringify(["SET","avhl:odds:exact:latest:"+home+":"+away,
        key,"EX",V7_ODDS_CACHE_TTL_SECONDS]),
      cache:"no-store",signal:AbortSignal.timeout(10000)
    });
    if(!pointer.ok||(await pointer.json())?.error)
      throw new Error("Persistent verified-odds reference pointer write failed.");
    return Response.json({ok:true,published:true,count:summary.count,generatedAt},{
      headers:{"Cache-Control":"no-store"}
    });
  }catch(error){
    const message=error instanceof Error?error.message:"Unknown odds ingest failure";
    // Do not echo JWTs or Redis credentials to user-visible error responses.
    console.error("V7 odds ingest rejected:",message);
    const authError=/token|signature|identity|signing key|OIDC|Unauthorized/i.test(message);
    return Response.json({ok:false,error:authError?"Unauthorized V7 odds publisher.":"V7 odds publishing failed."},
      {status:authError?401:503,headers:{"Cache-Control":"no-store"}});
  }
}
