import {createHash} from "node:crypto";

export const PAIR_HOME_SAMPLES=50;
export const TOTAL_PAIRS=780;
export const FUTURES_SCHEMA=1;
export const pairNames=(a,b)=>[a,b].sort((x,y)=>x.localeCompare(y));
export const sha16=x=>createHash("sha256").update(x).digest("hex").slice(0,16);
export const snapshotDigest=pairEntries=>createHash("sha256")
  .update(pairEntries.map(x=>x.key).sort().join("|")).digest("hex").slice(0,24);
export function canonicalPairKey(a,b,engineSource,firstHomeMatch,secondHomeMatch){
  const [first,second]=pairNames(a,b);
  if(first!==a||second!==b||first===second)throw Error("Pair keys must be in canonical order.");
  return ["v7f",FUTURES_SCHEMA,sha16(engineSource),a,b,
    sha16(JSON.stringify([firstHomeMatch,secondHomeMatch]))].join(":");
}
export function validatePairPool(pair){
  if(!pair||typeof pair!=="object"||!Array.isArray(pair.firstHome)||!Array.isArray(pair.secondHome)||
     pair.firstHome.length!==PAIR_HOME_SAMPLES||pair.secondHome.length!==PAIR_HOME_SAMPLES)return false;
  return [...pair.firstHome,...pair.secondHome].every(x=>
    Array.isArray(x)&&x.length===3&&
    Number.isInteger(x[0])&&Number.isInteger(x[1])&&
    x[0]>=0&&x[1]>=0&&x[0]!==x[1]&&x[0]<=30&&x[1]<=30&&
    (x[2]===0||x[2]===1)&&(!x[2]||Math.abs(x[0]-x[1])===1));
}
export function makeAllPairEntries(codes, engineSource, matchupBuilder){
  const unique=[...new Set(codes)].sort();
  if(unique.length!==40||!unique.every(x=>/^[A-Z0-9]{2,4}$/.test(x)))
    throw Error("The 40 official AVHL teams are required.");
  const entries=[];
  for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){
    const a=unique[i],b=unique[j];
    const first=matchupBuilder(a,b); // a home, b away
    const second=matchupBuilder(b,a); // b home, a away
    entries.push({a,b,key:canonicalPairKey(a,b,engineSource,first,second)});
  }
  if(entries.length!==TOTAL_PAIRS)throw Error("AVHL requires 780 pairings.");
  return entries;
}
export function drawV7Score(pools,homeCode,awayCode,random){
  const [a,b]=pairNames(homeCode,awayCode);
  const key=a+":"+b,pool=pools[key];
  if(!pool||!Array.isArray(pool.firstHome)||!Array.isArray(pool.secondHome))throw Error("Missing genuine V7 outcome pool for "+key);
  const arr=homeCode===a?pool.firstHome:pool.secondHome;
  const result=arr[Math.floor(random()*arr.length)];
  return {
    homeScore:homeCode===a?result[0]:result[1],
    awayScore:homeCode===a?result[1]:result[0],
    ot:Boolean(result[2])
  };
}
