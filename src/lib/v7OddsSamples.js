// Every number is calculated from complete, official V7 simulated games.
// The 12-game preview is NEVER eligible to publish betting-style odds.
export const INITIAL_V7_SAMPLES=1000;
export const REFINED_V7_SAMPLES=2000;
export const MAX_V7_SAMPLES=5000;
export const canPublishV7Odds=count=>Number.isInteger(count)&&count>=INITIAL_V7_SAMPLES;
const ratio=(x,n)=>n?x/n:0;
const num=x=>Number(x)||0;
export function fairMoneyline(p) {
  if(!Number.isFinite(p)||p<=0||p>=1)return "—";
  const value=p>=0.5?-100*p/(1-p):100*(1-p)/p;
  return value>=0?`+${Math.round(value)}`:String(Math.round(value));
}
export function wilsonInterval(success,trials,z=1.96) {
  if(!trials)return [0,1];
  const p=success/trials,z2=z*z,denom=1+z2/trials;
  const center=(p+z2/(2*trials))/denom;
  const spread=z*Math.sqrt(p*(1-p)/trials+z2/(4*trials*trials))/denom;
  return [Math.max(0,center-spread),Math.min(1,center+spread)];
}
export function summarizeV7Samples(samples,away,home){
  const n=samples.length;
  const count=predicate=>samples.filter(predicate).length;
  const rate=predicate=>ratio(count(predicate),n);
  const avg=fn=>ratio(samples.reduce((sum,row)=>sum+num(fn(row)),0),n);
  const homeWins=count(s=>s.h>s.a),awayWins=n-homeWins;
  const totals=[3.5,4.5,5.5,6.5,7.5,8.5,9.5].map(line=>({
    line,over:rate(s=>s.a+s.h>line),under:rate(s=>s.a+s.h<line)
  }));
  const puckLines=[1.5,2.5].map(line=>({
    line,homeCover:rate(s=>s.h-s.a>line),awayCover:rate(s=>s.a-s.h>line),
    homePlus:rate(s=>s.h-s.a>-line),awayPlus:rate(s=>s.a-s.h>-line),
  }));
  const teamTotals=Object.fromEntries([[away,"a"],[home,"h"]].map(([abbr,field])=>[
    abbr,[1.5,2.5,3.5,4.5].map(line=>({
      line,over:rate(s=>s[field]>line),under:rate(s=>s[field]<line)
    }))
  ]));
  const skaters=new Map(),goalies=new Map();
  for(const sample of samples){
    for(const p of sample.players||[]){
      if(!skaters.has(p.id))skaters.set(p.id,{
        id:p.id,name:p.name,team:p.t,
        metrics:Object.fromEntries(["goals","goals2","assists","assists2","points","points2","points3","shots2","shots3","shots4","shots5","hits2","hits3","takeaways1","ppGoal1","faceoffWins5","faceoffWins10"].map(k=>[k,0])),
        totals:{goals:0,assists:0,points:0,shots:0,hits:0,takeaways:0,faceoffWins:0}
      });
      const row=skaters.get(p.id),m=row.metrics;
      m.goals+=Number(p.g>=1);m.goals2+=Number(p.g>=2);
      m.assists+=Number(p.a>=1);m.assists2+=Number(p.a>=2);
      m.points+=Number(p.p>=1);m.points2+=Number(p.p>=2);m.points3+=Number(p.p>=3);
      for(const threshold of [2,3,4,5])m[`shots${threshold}`]+=Number(p.s>=threshold);
      for(const threshold of [2,3])m[`hits${threshold}`]+=Number(p.h>=threshold);
      m.takeaways1+=Number(p.tk>=1);m.ppGoal1+=Number(p.ppg>=1);
      m.faceoffWins5+=Number(p.fw>=5);m.faceoffWins10+=Number(p.fw>=10);
      for(const [key,value] of Object.entries({goals:p.g,assists:p.a,points:p.p,shots:p.s,hits:p.h,takeaways:p.tk,faceoffWins:p.fw})){
        row.totals[key]+=num(value);
      }
    }
    // Only starting goalies are ever featured; backups remain in raw game
    // samples for correct relief and solo-shutout accounting.
    for(const g of sample.goalies||[]){
      if(!g.started)continue;
      if(!goalies.has(g.id))goalies.set(g.id,{
        id:g.id,name:g.name,team:g.t,starts:0,
        metrics:{saves15:0,saves20:0,saves25:0,saves30:0,saves35:0,
          allowedUnder15:0,allowedUnder25:0,allowedOver25:0,shutouts:0},
        totals:{saves:0,against:0,allowed:0}
      });
      const row=goalies.get(g.id),m=row.metrics;
      row.starts++;
      for(const threshold of [15,20,25,30,35])m[`saves${threshold}`]+=Number(g.sv>=threshold);
      m.allowedUnder15+=Number(g.ga<=1);m.allowedUnder25+=Number(g.ga<=2);
      m.allowedOver25+=Number(g.ga>=3);
      const otherGoaliePlayed=(sample.goalies||[]).some(other=>
        other.t===g.t&&other.id!==g.id&&num(other.toi)>0);
      const opponentScore=g.t===away?sample.h:sample.a;
      if(opponentScore===0&&!otherGoaliePlayed&&num(g.toi)>0)m.shutouts++;
      row.totals.saves+=num(g.sv);row.totals.against+=num(g.sa);row.totals.allowed+=num(g.ga);
    }
  }
  const players=[...skaters.values()].map(p=>({
    ...p,probability:Object.fromEntries(Object.entries(p.metrics).map(([k,v])=>[k,ratio(v,n)])),
    average:Object.fromEntries(Object.entries(p.totals).map(([k,v])=>[k,ratio(v,n)]))
  })).sort((a,b)=>b.average.points-a.average.points||b.average.goals-a.average.goals);
  const goalieRows=[...goalies.values()].map(g=>({
    ...g,probability:Object.fromEntries(Object.entries(g.metrics).map(([k,v])=>[k,ratio(v,n)])),
    average:Object.fromEntries(Object.entries(g.totals).map(([k,v])=>[k,ratio(v,n)]))
  })).sort((a,b)=>b.starts-a.starts||b.average.saves-a.average.saves);
  return {
    source:"v7-complete-games",count:n,away,home,
    homeWin:ratio(homeWins,n),awayWin:ratio(awayWins,n),
    homeCI:wilsonInterval(homeWins,n),awayCI:wilsonInterval(awayWins,n),
    homeMoneyline:fairMoneyline(ratio(homeWins,n)),awayMoneyline:fairMoneyline(ratio(awayWins,n)),
    homeGoals:avg(s=>s.h),awayGoals:avg(s=>s.a),
    homeShots:avg(s=>s.hs),awayShots:avg(s=>s.as),
    ot:rate(s=>s.f!=="REG"),shootout:rate(s=>s.f==="SO"),
    bothScore:rate(s=>s.h>0&&s.a>0),shutout:rate(s=>s.h===0||s.a===0),
    firstGoal:Object.fromEntries([[away,rate(s=>s.first===away)],[home,rate(s=>s.first===home)]]),
    totals,puckLines,teamTotals,players,goalies:goalieRows
  };
}
export function v7SampleCaveat(n) {
  if(n<INITIAL_V7_SAMPLES)return "Odds are withheld until at least 1,000 full V7 games are sampled.";
  if(n<REFINED_V7_SAMPLES)return "1,000-game V7 sample; rare player events still have substantial sampling uncertainty.";
  return "Based on complete V7 games, with remaining uncertainty for rare events.";
}
