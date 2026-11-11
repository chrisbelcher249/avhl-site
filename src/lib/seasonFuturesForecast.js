// Exploratory, standings-based season futures. This is NOT the V7 physics
// simulator and is never used for single-game/model player odds. Exactly
// completed AVHL results and official conference/qualifier/relegation rules
// determine the starting state and ranking of every projected season.
export const SEASON_SCENARIOS = 10000;
export const SEASON_METHOD = "standings-based-empirical";
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
function series(a,b,length,quality,random,homeAdv,scoreSamples){
  const needed=(length+1)/2;
  let aw=0,bw=0;
  for(let i=0;aw<needed&&bw<needed;i++){
    // Higher seed receives the opening two home games; subsequent home
    // assignments follow a 2-2-1 or 2-2-1-1-1 pattern.
    const aHome=i<2 || (i>=4&&i%2===0);
    const home=aHome?a:b,away=aHome?b:a;
    const p=homeProbability(home,away,quality,homeAdv);
    if(random()<p){if(aHome)aw++;else bw++;}
    else{if(aHome)bw++;else aw++;}
  }
  return aw>bw?a:b;
}
function homeProbability(h,a,quality,homeAdv){
  const delta=clamp(quality[h]-quality[a]+homeAdv,-4,4);
  return clamp(1/(1+Math.exp(-delta)),0.03,0.97);
}
function quantile(hist,q){
  const total=hist.reduce((s,v)=>s+v,0);
  let cum=0;
  for(let i=0;i<hist.length;i++){cum+=hist[i];if(cum>=q*total)return i;}
  return hist.length-1;
}
export function forecastSeasonFutures(schedule,teams,runs=SEASON_SCENARIOS){
  if(!Array.isArray(schedule)||!Array.isArray(teams)||teams.length!==40)
    throw Error("A full 40-team AVHL season is required.");
  if(!Number.isInteger(runs)||runs<1||runs>30000)throw Error("Invalid simulation count.");
  const idx=Object.fromEntries(teams.map((t,i)=>[t.slug,i]));
  if(Object.keys(idx).length!==40||new Set(teams.map(t=>t.abbreviation)).size!==40)
    throw Error("40 unique clubs are required.");
  const base=teams.map(()=>empty()),remaining=[],observed=[];
  let homeWins=0,awayWins=0;
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
    observed.push({high:Math.max(as,hs),low:Math.min(as,hs),ot});
    homeWins+=Number(hs>as);awayWins+=Number(as>hs);
    fingerprint.push(String(game.id)+":"+as+"-"+hs+":"+(ot?"OT":"REG"));
  }
  if(!observed.length)throw Error("No completed official AVHL games to anchor season futures.");
  if(schedule.length!==1640)throw Error("Season forecast requires exactly 1,640 scheduled games.");
  if(teams.some((t,i)=>base[i].gp+remaining.filter(g=>g.a===i||g.h===i).length!==82))
    throw Error("Each AVHL club must have an 82-game season.");

  // Shrunk team strengths from completed official season games only.
  // These are fast statistical *projections*, not simulated V7 matchups.
  const quality=base.map(r=>{
    const record=Math.log((r.wins+0.45*r.otl+8)/(r.losses+0.55*r.otl+8));
    const goalRate=Math.log((r.gf+45)/(r.ga+45));
    return clamp(0.72*record+1.25*goalRate,-1.3,1.3);
  });
  const homeP=clamp((homeWins+50)/(homeWins+awayWins+100),0.43,0.58);
  const homeAdv=Math.log(homeP/(1-homeP));
  const random=makeRandom(hashString("AVHL-SEASON:2026-27:forecast-v2:"+fingerprint.join("|")+":"+runs));

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
      const empirical=observed[Math.floor(random()*observed.length)];
      const homeWin=random()<homeProbability(game.h,game.a,quality,homeAdv);
      const h=homeWin?empirical.high:empirical.low;
      const a=homeWin?empirical.low:empirical.high;
      applyResult(rec[game.a],rec[game.h],a,h,empirical.ot);
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
      for(const seed of seeds)indicator(counts.playoffs,seed);
      const play89=series(seeds[7],seeds[8],5,quality,random,homeAdv,observed);
      const play710=series(seeds[6],seeds[9],5,quality,random,homeAdv,observed);
      const r1=[seeds[0],seeds[1],seeds[2],seeds[3],seeds[4],seeds[5],play89,play710];
      for(const id of r1)indicator(counts.round1,id);
      const q1=[
        series(seeds[0],play89,7,quality,random,homeAdv,observed),
        series(seeds[3],seeds[4],7,quality,random,homeAdv,observed),
        series(seeds[1],play710,7,quality,random,homeAdv,observed),
        series(seeds[2],seeds[5],7,quality,random,homeAdv,observed)
      ];
      for(const id of q1)indicator(counts.round2,id);
      const semi=[
        series(q1[0],q1[1],7,quality,random,homeAdv,observed),
        series(q1[2],q1[3],7,quality,random,homeAdv,observed)
      ];
      for(const id of semi)indicator(counts.conferenceFinal,id);
      const champion=series(semi[0],semi[1],7,quality,random,homeAdv,observed);
      indicator(counts.cupFinal,champion);
      champions.push(champion);
    }
    indicator(counts.cup,series(champions[0],champions[1],7,quality,random,homeAdv,observed));
  }
  return {
    version:"season-futures-statistical-v2",method:SEASON_METHOD,runs,
    completedGames:observed.length,remainingGames:remaining.length,
    modelNote:"Current-season standings and observed AVHL score patterns; fast exploratory forecast, not exact V7-game physics.",
    homeWinPrior:homeP,
    teams:teams.map((team,i)=>({
      ...team,record:{...base[i]},projectedWins:totalW[i]/runs,
      projectedPoints:totalPts[i]/runs,projectedRank:totalRank[i]/runs,
      winsP10:quantile(hist[i],0.1),winsP50:quantile(hist[i],0.5),
      winsP90:quantile(hist[i],0.9),winsHistogram:hist[i],
      probabilities:Object.fromEntries(labels.map(k=>[k,counts[k][i]/runs]))
    }))
  };
}
