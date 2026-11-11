import {drawV7Score,TOTAL_PAIRS,validatePairPool} from "./v7FuturesPairs.js";
// Exploratory, standings-based season futures. This is NOT the V7 physics
// simulator and is never used for single-game/model player odds. Exactly
// completed AVHL results and official conference/qualifier/relegation rules
// determine the starting state and ranking of every projected season.
export const SEASON_SCENARIOS = 10000;
export const SEASON_METHOD = "exact-V7-game-outcome-resampling";
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const clean=x=>Number.isFinite(Number(x))?Number(x):0;
const empty=()=>({gp:0,wins:0,losses:0,otl:0,pts:0,rw:0,gf:0,ga:0});
const pct=(x,n)=>n?x/n:0;
function hashString(str){
  let hash=2166136261;
  for(let i=0;i<str.length;i++){hash^=str.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function makeRandom(seed){
  let state=seed>>>0;
  return ()=>{
    let x=state+=0x6d2b79f5;
    x=Math.imul(x^(x>>>15),x|1);
    x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  };
}
function applyResult(away,home,awayScore,homeScore,ot){
  away.gp++;home.gp++;
  away.gf+=awayScore;away.ga+=homeScore;
  home.gf+=homeScore;home.ga+=awayScore;
  const aw=awayScore>homeScore,winner=aw?away:home,loser=aw?home:away;
  winner.wins++;winner.pts+=2;
  if(ot){loser.otl++;loser.pts++;}
  else{loser.losses++;winner.rw++;}
}
function compare(a,b,records,teams){
  const x=records[a],y=records[b];
  return y.pts-x.pts ||
    pct(y.pts,2*y.gp)-pct(x.pts,2*x.gp) ||
    y.rw-x.rw || y.wins-x.wins ||
    pct(y.gf,y.gp)-pct(x.gf,x.gp) ||
    pct(x.ga,x.gp)-pct(y.ga,y.gp) ||
    (y.gf-y.ga)-(x.gf-x.ga) ||
    teams[a].name.localeCompare(teams[b].name);
}
function seedsFor(conference,teams,records){
  const idx=teams.map((t,i)=>t.conference===conference?i:-1).filter(i=>i>=0);
  const divs=[...new Set(idx.map(i=>teams[i].division))];
  if(divs.length!==2||idx.length!==20)throw Error("Expected two divisions of ten teams per conference.");
  const lists=divs.map(div=>idx.filter(i=>teams[i].division===div).sort((a,b)=>compare(a,b,records,teams)));
  if(lists.some(x=>x.length!==10))throw Error("Incomplete official conference/division structure.");
  const tiers=[lists.map(x=>x[0]),lists.map(x=>x[1]),lists.map(x=>x[2])];
  const automatic=new Set(tiers.flat());
  const wild=idx.filter(i=>!automatic.has(i)).sort((a,b)=>compare(a,b,records,teams)).slice(0,4);
  return [...tiers.map(t=>t.sort((a,b)=>compare(a,b,records,teams))).flat(),...wild];
}
function indicator(array,index){array[index]++;}
function series(a,b,length,draw,higherSeed){
  const needed=(length+1)/2;
  let aw=0,bw=0;
  for(let i=0;aw<needed&&bw<needed;i++){
    const higherHome=i<2 || (i>=4&&i%2===0);
    const aHome=higherHome?(higherSeed===a):(higherSeed!==a);
    const home=aHome?a:b,away=aHome?b:a;
    const result=draw(home,away);
    const homeWon=result.homeScore>result.awayScore;
    if(homeWon){if(aHome)aw++;else bw++;}
    else{if(aHome)bw++;else aw++;}
  }
  return aw>bw?a:b;
}
function quantile(hist,q){
  const total=hist.reduce((s,v)=>s+v,0);
  let cum=0;
  for(let i=0;i<hist.length;i++){cum+=hist[i];if(cum>=q*total)return i;}
  return hist.length-1;
}
export function forecastSeasonFutures(schedule,teams,runs=SEASON_SCENARIOS,pools=null,sourceDigest=""){
  // Fail closed. No games are invented by team-strength or Poisson formulas.
  if(!pools||Object.keys(pools).length!==TOTAL_PAIRS)
    throw Error("780 fully sampled official V7 matchups are required.");
  for(const [key,pool] of Object.entries(pools))
    if(!/^[A-Z0-9]{2,4}:[A-Z0-9]{2,4}$/.test(key)||!validatePairPool(pool))
      throw Error("Invalid or incomplete 50/50 V7 pair pool: "+key);
  if(!Array.isArray(schedule)||!Array.isArray(teams)||teams.length!==40)
    throw Error("A full 40-team AVHL season is required.");
  if(!Number.isInteger(runs)||runs<1||runs>30000)throw Error("Invalid simulation count.");
  const idx=Object.fromEntries(teams.map((t,i)=>[t.slug,i]));
  if(Object.keys(idx).length!==40||new Set(teams.map(t=>t.abbreviation)).size!==40)
    throw Error("40 unique clubs are required.");
  const base=teams.map(()=>empty()),remaining=[];
  const fingerprint=[];
  for(const game of schedule){
    const a=idx[game.away],h=idx[game.home];
    if(a==null||h==null||a===h)throw Error("Official schedule contains an unknown team.");
    if(game.awayScore==null&&game.homeScore==null){remaining.push({a,h});continue;}
    const as=clean(game.awayScore),hs=clean(game.homeScore);
    if(as<0||hs<0||as===hs||!Number.isInteger(as)||!Number.isInteger(hs))
      throw Error("Incomplete/invalid completed official game score.");
    const ot=Boolean(game.overtime);
    if(ot&&Math.abs(as-hs)!==1)throw Error("Overtime result must be one goal apart.");
    applyResult(base[a],base[h],as,hs,ot);
    fingerprint.push(String(game.id)+":"+as+"-"+hs+":"+(ot?"OT":"REG"));
  }
  if(schedule.length!==1640)throw Error("Season forecast requires exactly 1,640 scheduled games.");
  if(teams.some((t,i)=>base[i].gp+remaining.filter(g=>g.a===i||g.h===i).length!==82))
    throw Error("Each AVHL club must have an 82-game season.");

  const random=makeRandom(hashString("AVHL-EXACT-V7-2026-27:"+sourceDigest+":"+fingerprint.join("|")+":"+runs));
  const draw=(home,away)=>drawV7Score(pools,teams[home].abbreviation,teams[away].abbreviation,random);

  const labels=["division","conference","presidents","playoffs","round1","round2",
    "conferenceFinal","cupFinal","cup","relegation","topFive","topTen"];
  const counts=Object.fromEntries(labels.map(k=>[k,teams.map(()=>0)]));
  const hist=teams.map(()=>Array(83).fill(0)),totalW=teams.map(()=>0),
    totalPts=teams.map(()=>0),totalRank=teams.map(()=>0);
  const divisions=[...new Set(teams.map(t=>t.division))];
  if(divisions.length!==4)throw Error("AVHL requires four divisions.");
  const divisionMembers=divisions.map(d=>teams.map((t,i)=>t.division===d?i:-1).filter(i=>i>=0));
  const conferences=["Western","Eastern"];
  for(let run=0;run<runs;run++){
    const rec=base.map(r=>({...r}));
    // Sample score/OT shapes from actual completed AVHL games. Reweight
    // the winner by regular-season strength and observed home advantage.
    for(const game of remaining){
      const result=draw(game.h,game.a);
      applyResult(rec[game.a],rec[game.h],result.awayScore,result.homeScore,result.ot);
    }
    const ranks=teams.map((_,i)=>i).sort((a,b)=>compare(a,b,rec,teams));
    indicator(counts.presidents,ranks[0]);
    for(let rank=0;rank<40;rank++){
      const i=ranks[rank],wins=rec[i].wins;
      hist[i][wins]++;totalW[i]+=wins;totalPts[i]+=rec[i].pts;totalRank[i]+=rank+1;
      if(rank<5)indicator(counts.topFive,i);
      if(rank<10)indicator(counts.topTen,i);
      if(rank>=37)indicator(counts.relegation,i);
    }
    for(const members of divisionMembers){
      const first=[...members].sort((a,b)=>compare(a,b,rec,teams))[0];
      indicator(counts.division,first);
    }
    for(const conf of conferences){
      const confTop=teams.map((t,i)=>t.conference===conf?i:-1)
        .filter(i=>i>=0).sort((a,b)=>compare(a,b,rec,teams))[0];
      indicator(counts.conference,confTop);
    }
    const champions=[];
    for(const conf of conferences){
      const seeds=seedsFor(conf,teams,rec);
      const rank=Object.fromEntries(seeds.map((id,i)=>[id,i]));
      const higher=(a,b)=>rank[a]<rank[b]?a:b;
      const playoff=(a,b,bestOf)=>series(a,b,bestOf,draw,higher(a,b));
      for(const seed of seeds)indicator(counts.playoffs,seed);
      const play89=playoff(seeds[7],seeds[8],5);
      const play710=playoff(seeds[6],seeds[9],5);
      const r1=[seeds[0],seeds[1],seeds[2],seeds[3],seeds[4],seeds[5],play89,play710];
      for(const id of r1)indicator(counts.round1,id);
      const q1=[
        playoff(seeds[0],play89,7),
        playoff(seeds[3],seeds[4],7),
        playoff(seeds[1],play710,7),
        playoff(seeds[2],seeds[5],7)
      ];
      for(const id of q1)indicator(counts.round2,id);
      const semi=[
        playoff(q1[0],q1[1],7),
        playoff(q1[2],q1[3],7)
      ];
      for(const id of semi)indicator(counts.conferenceFinal,id);
      const champion=playoff(semi[0],semi[1],7);
      indicator(counts.cupFinal,champion);
      champions.push(champion);
    }
    const finalHome=compare(champions[0],champions[1],rec,teams)<=0?champions[0]:champions[1];
    indicator(counts.cup,series(champions[0],champions[1],7,draw,finalHome));
  }
  return {
    version:"season-futures-statistical-v2",method:SEASON_METHOD,runs,
    completedGames:observed.length,remainingGames:remaining.length,
    modelNote:"Every future game result is drawn from actual V7 engine simulations: 50 with each team at home in all 780 matchups. The season itself resamples stored V7 results, not the spatial engine.",
    sourceDigest,matchedPairs:TOTAL_PAIRS,engineSamples:TOTAL_PAIRS*100,
    teams:teams.map((team,i)=>({
      ...team,record:{...base[i]},projectedWins:totalW[i]/runs,
      projectedPoints:totalPts[i]/runs,projectedRank:totalRank[i]/runs,
      winsP10:quantile(hist[i],0.1),winsP50:quantile(hist[i],0.5),
      winsP90:quantile(hist[i],0.9),winsHistogram:hist[i],
      probabilities:Object.fromEntries(labels.map(k=>[k,counts[k][i]/runs]))
    }))
  };
}
