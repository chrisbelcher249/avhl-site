// Season futures hybrid: empirical AVHL game results + completed V7 matchup outcomes.
// This module never invents a historical score or mutates an owner lineup.
// V7 final score shapes are reused; winner probabilities are statistically adjusted.
export const HYBRID_FUTURES_METHOD = "hybrid-V7-empirical-injury-goalie-v1";
export const HYBRID_V7_LOGIT_WEIGHT = 0.45;
export const MAX_GOALIE_STARTS = 60;
const GOALIE_LOGIT_PER_OVERALL = 0.075;
const MIN_P = 0.005;
const clip = (x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const logistic = x => x >= 0 ? 1/(1+Math.exp(-x)) : Math.exp(x)/(1+Math.exp(x));
const logit = p => Math.log(clip(p,MIN_P,1-MIN_P)/(1-clip(p,MIN_P,1-MIN_P)));
const id = v => String(v ?? "").trim();
const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const isDefense = player => /(^|\/)(LD|RD|D)(\/|$)/.test(String(player?.position||""));
const isGoalie = player => player?.role==="Goalie" || String(player?.position||"")==="G";

/**
 * Regularized Bradley–Terry results rating, with a small goal-differential
 * component. Both are drawn ONLY from already-completed official AVHL games.
 * This compares each result to its actual opponent (strength of schedule),
 * rather than extrapolating a team's raw wins over an 82-game season.
 */
export function fitEmpiricalStrength(schedule,teams) {
  if(!Array.isArray(teams)||teams.length!==40)throw Error("40 teams required for hybrid futures.");
  const indices = new Map(teams.map((t,i)=>[t.slug,i]));
  const games=[],gf=new Float64Array(40),ga=new Float64Array(40),gp=new Float64Array(40);
  for(const g of schedule||[]){
    if(g.awayScore==null||g.homeScore==null)continue;
    const h=indices.get(g.home),a=indices.get(g.away);
    if(h==null||a==null||h===a)throw Error("Unknown team in completed hybrid fixture.");
    const hs=Number(g.homeScore),as=Number(g.awayScore);
    if(!Number.isInteger(hs)||!Number.isInteger(as)||hs<0||as<0||hs===as)
      throw Error("Invalid completed AVHL fixture in empirical model.");
    games.push({h,a,y:Number(hs>as),gameId:Number(g.id)});
    gp[h]++;gp[a]++;gf[h]+=hs;ga[h]+=as;gf[a]+=as;ga[a]+=hs;
  }
  const rating=new Float64Array(40);
  let homeAdv=0.1;
  // Penalization avoids treating a 12–20-game hot streak as permanent team talent.
  const teamRidge=4.5,homeRidge=9;
  for(let iter=0;iter<90;iter++){
    const grad=new Float64Array(40),info=new Float64Array(40);
    let homeGrad=0,homeInfo=0;
    for(const g of games){
      const p=logistic(homeAdv+rating[g.h]-rating[g.a]);
      const residual=g.y-p,curvature=p*(1-p);
      grad[g.h]+=residual;grad[g.a]-=residual;
      info[g.h]+=curvature;info[g.a]+=curvature;
      homeGrad+=residual;homeInfo+=curvature;
    }
    for(let i=0;i<40;i++){
      const step=clip((grad[i]-teamRidge*rating[i])/(info[i]+teamRidge),-0.22,0.22);
      rating[i]+=0.5*step;
    }
    const mean=rating.reduce((s,v)=>s+v,0)/40;
    for(let i=0;i<40;i++)rating[i]-=mean;
    homeAdv=clip(homeAdv+0.4*clip((homeGrad-homeRidge*(homeAdv-0.1))/(homeInfo+homeRidge),-0.12,0.12),-0.35,0.4);
  }
  const strengths=teams.map((t,i)=>{
    // One outlier scoring result cannot swamp a team's W–L evidence.
    const netGoalsPerGame=clip((gf[i]-ga[i])/(gp[i]+10),-1.5,1.5);
    return 0.80*rating[i]+0.20*(0.65*netGoalsPerGame);
  });
  const center=strengths.reduce((sum,x)=>sum+x,0)/40;
  return {
    games:games.length,
    homeAdvantage:homeAdv,
    byCode:Object.fromEntries(teams.map((t,i)=>[t.abbreviation,strengths[i]-center])),
    goalDifferentialPriorGames:10,
    teamRidge,
  };
}

export function empiricalHomeWinProbability(model,home,away) {
  const h=model?.byCode?.[home],a=model?.byCode?.[away];
  if(!Number.isFinite(h)||!Number.isFinite(a))throw Error("Missing empirical team strength.");
  return clip(logistic(model.homeAdvantage+h-a),MIN_P,1-MIN_P);
}

function injuryEligible(injury,gameId) {
  const returnId=Number(injury.expectedReturnGameId ?? injury.returnGameId);
  if(!Number.isInteger(returnId)||returnId<=0||gameId<returnId)return false;
  return !(injury.missedGameIds||[]).includes(gameId);
}

export function buildHybridContext({teams,players,lineups,injuries=[],goalieStats=[]}) {
  const playerById=new Map((players||[]).map(p=>[id(p.id),p]));
  const goalieStarts=new Map((goalieStats||[]).map(row=>[id(row.playerId),Math.max(0,Math.trunc(number(row.gs)))]));
  const byTeam={};
  let relevantInjuries=0;
  for(const team of teams){
    const code=team.abbreviation, lineup=lineups?.[code];
    if(!lineup||!Array.isArray(lineup.forwards)||lineup.forwards.length!==12||
       !Array.isArray(lineup.defense)||lineup.defense.length!==6||
       !Array.isArray(lineup.goalies)||lineup.goalies.length!==2)
      throw Error("Incomplete live owner lineup for "+code);
    const healthyForwards=lineup.forwards.map(x=>playerById.get(id(x.playerId))).filter(Boolean);
    const healthyDefense=lineup.defense.map(x=>playerById.get(id(x.playerId))).filter(Boolean);
    if(healthyForwards.length!==12||healthyDefense.length!==6)
      throw Error("Missing live skater ratings for "+code);
    const teamRoster=(players||[]).filter(p=>p.currentTeam===team.name);
    const teamInjuries=(injuries||[]).filter(x=>x.teamAbbreviation===code&&
      playerById.get(id(x.playerId))?.currentTeam===team.name);
    const injuredById=new Map(teamInjuries.map(x=>[id(x.playerId),x]));
    const skaterReturns=[];
    for(const injury of teamInjuries){
      const player=playerById.get(id(injury.playerId));
      if(!player||isGoalie(player))continue;
      const dressed=isDefense(player)?healthyDefense:healthyForwards;
      const lowest=Math.min(...dressed.map(p=>number(p.overall)));
      const improvement=clip((number(player.overall)-lowest)*0.018,0,0.28);
      skaterReturns.push({playerId:id(player.id),returnGameId:Number(injury.expectedReturnGameId)||null,
        missedGameIds:injury.missedGameIds||[],improvement});
      relevantInjuries++;
    }
    const selectedGoalie=lineup.goalies.find(g=>g.starter)||lineup.goalies[0];
    const selectedId=id(selectedGoalie.playerId);
    const goalies=teamRoster.filter(isGoalie).map(p=>{
      const dress=lineup.goalies.some(g=>id(g.playerId)===id(p.id));
      const injury=injuredById.get(id(p.id))||null;
      return {id:id(p.id),name:p.name,overall:number(p.overall),starts:goalieStarts.get(id(p.id))||0,
        selected:id(p.id)===selectedId,dressed:dress,injury};
    });
    if(goalies.length<2||!goalies.some(g=>g.selected))
      throw Error("Incomplete live goalie roster for "+code);
    const v7Starter=goalies.find(g=>g.selected);
    byTeam[code]={code,goalies,v7StarterId:selectedId,v7StarterOverall:v7Starter.overall,
      skaterReturns};
    relevantInjuries+=teamInjuries.filter(x=>isGoalie(playerById.get(id(x.playerId)))).length;
  }
  return {byTeam,activeInjuriesModeled:relevantInjuries,goalieStartCap:MAX_GOALIE_STARTS};
}

export function returnLogitShift(teamContext,gameId) {
  let improvement=0;
  for(const r of teamContext.skaterReturns){
    if(r.improvement>0 && injuryEligible(r,gameId))improvement+=r.improvement;
  }
  return clip(improvement,0,0.55);
}

function eligibleGoalies(teamContext,gameId,starts,regularSeason) {
  return teamContext.goalies.filter(g=>{
    if(g.injury&&!injuryEligible(g.injury,gameId))return false;
    return !regularSeason || (starts.get(g.id)||0)<MAX_GOALIE_STARTS;
  });
}

/** Choose one legal goalie for each remaining game, never exceeding 60 starts. */
export function chooseGoalie(teamContext,gameId,starts,random,{regularSeason=true}={}) {
  const available=eligibleGoalies(teamContext,gameId,starts,regularSeason);
  if(!available.length)throw Error("No eligible goalie under the 60-start limit for "+teamContext.code);
  if(available.length===1){
    if(regularSeason)starts.set(available[0].id,(starts.get(available[0].id)||0)+1);
    return available[0];
  }
  const scores=available.map(g=>{
    const recovered=!!g.injury;
    const usageBonus=0.55*Math.log1p(g.starts);
    return 0.075*(g.overall-85)+(g.selected?0.7:0)+usageBonus+
      (!g.dressed?(recovered?-0.25:-2.5):0);
  });
  const shift=Math.max(...scores);
  const weights=scores.map(x=>Math.exp(x-shift));
  const total=weights.reduce((s,w)=>s+w,0);
  let choice=clip(random(),0,1-Number.EPSILON)*total;
  let selected=available[available.length-1];
  for(let i=0;i<available.length;i++){
    choice-=weights[i];
    if(choice<0){selected=available[i];break;}
  }
  if(regularSeason)starts.set(selected.id,(starts.get(selected.id)||0)+1);
  return selected;
}

export function goalieStartMap(teamContext) {
  return new Map(teamContext.goalies.map(g=>[g.id,g.starts]));
}

export function hybridHomeWinProbability(v7HomeWin,empiricalHomeWin,homeContext,awayContext,
  homeGoalie,awayGoalie,homeReturnShift=0,awayReturnShift=0) {
  const goalieEdge=clip(GOALIE_LOGIT_PER_OVERALL*(homeGoalie.overall-homeContext.v7StarterOverall),-1.5,1.5)-
    clip(GOALIE_LOGIT_PER_OVERALL*(awayGoalie.overall-awayContext.v7StarterOverall),-1.5,1.5);
  const v7Adjusted=logit(v7HomeWin)+goalieEdge+
    clip(homeReturnShift-awayReturnShift,-0.75,0.75);
  const score=HYBRID_V7_LOGIT_WEIGHT*v7Adjusted+
    (1-HYBRID_V7_LOGIT_WEIGHT)*logit(empiricalHomeWin);
  return clip(logistic(score),MIN_P,1-MIN_P);
}

/**
 * Keep the genuine V7 goal totals and OT/REG structure, while flipping the
 * winner only when required by the empirical/goalie/injury calibration.
 * This is a hybrid scoreline, not an unmodified V7 simulation.
 */
export function adjustV7Result(result,originalHomeWinProbability,targetHomeWinProbability,random) {
  const homeWin=result.homeScore>result.awayScore;
  const p=clip(originalHomeWinProbability,0,1),t=clip(targetHomeWinProbability,0,1);
  let flip=0;
  if(homeWin&&t<p)flip=(p-t)/p;
  if(!homeWin&&t>p)flip=(t-p)/(1-p);
  if(!Number.isFinite(flip))flip=0;
  return random()<flip?
    {homeScore:result.awayScore,awayScore:result.homeScore,ot:result.ot}:
    result;
}

export function v7HomeWinRate(pool,homeIsFirst) {
  const samples=homeIsFirst?pool.firstHome:pool.secondHome;
  if(!Array.isArray(samples)||samples.length!==50)throw Error("Incomplete canonical V7 pairing.");
  let homeWins=0;
  for(const sample of samples)homeWins+=homeIsFirst?Number(sample[0]>sample[1]):Number(sample[1]>sample[0]);
  return homeWins/samples.length;
}
