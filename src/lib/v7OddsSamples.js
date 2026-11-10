// Odds are measured from complete, unmodified V7 game simulations.
// No independent score-generation or player-performance model is used here.
export const INITIAL_V7_SAMPLES = 1000;
export const REFINED_V7_SAMPLES = 2000;
export const MAX_V7_SAMPLES = 5000;
export const canPublishV7Odds = count => Number.isInteger(count) && count >= INITIAL_V7_SAMPLES;

const divide = (value, total) => total ? value / total : 0;
const pct = (value, total) => divide(value, total);
const integer = (value) => Number(value) || 0;

export function fairMoneyline(probability) {
  if (probability <= 0 || probability >= 1) return "—";
  const value = probability >= 0.5
    ? -100 * probability / (1 - probability)
    : 100 * (1 - probability) / probability;
  return value > 0 ? `+${Math.round(value)}` : String(Math.round(value));
}

export function wilsonInterval(success, trials, z = 1.96) {
  if (!trials) return [0, 1];
  const p = success / trials;
  const z2 = z * z;
  const center = (p + z2 / (2 * trials)) / (1 + z2 / trials);
  const spread = z * Math.sqrt(p * (1-p) / trials + z2 / (4 * trials * trials)) / (1 + z2 / trials);
  return [Math.max(0, center - spread), Math.min(1, center + spread)];
}

export function summarizeV7Samples(samples, away, home) {
  const n = samples.length;
  const homeWinCount = samples.filter(s => s.h > s.a).length;
  const awayWinCount = n - homeWinCount;
  const mean = (getter) => divide(samples.reduce((sum,s) => sum+getter(s), 0), n);
  const rate = (predicate) => pct(samples.filter(predicate).length, n);
  const totals = [3.5,4.5,5.5,6.5,7.5,8.5,9.5].map(line => ({
    line,over:rate(s => s.a+s.h > line), under:rate(s => s.a+s.h < line)
  }));
  const puckLines = [1.5,2.5].map(line => ({
    line, homeCover:rate(s => s.h-s.a > line),awayCover:rate(s => s.a-s.h > line),
  }));
  const teamTotals = Object.fromEntries([[away,"a"],[home,"h"]].map(([abbr,field])=>[
    abbr,[1.5,2.5,3.5,4.5].map(line => ({
      line,over:rate(s=>s[field]>line),under:rate(s=>s[field]<line)
    }))
  ]));
  const players = new Map();
  const goalies = new Map();
  for (const sample of samples) {
    for (const row of sample.players || []) {
      const key = row.id;
      if (!players.has(key)) players.set(key,{id:key,name:row.name,team:row.t,metrics:{goals:0,assists:0,points:0,shots2:0,shots3:0,shots4:0,hits2:0},totals:{goals:0,assists:0,points:0,shots:0}});
      const p = players.get(key);
      if (row.g>=1) p.metrics.goals++;
      if (row.a>=1) p.metrics.assists++;
      if (row.p>=1) p.metrics.points++;
      if (row.s>=2) p.metrics.shots2++;
      if (row.s>=3) p.metrics.shots3++;
      if (row.s>=4) p.metrics.shots4++;
      if (row.h>=2) p.metrics.hits2++;
      p.totals.goals += integer(row.g);
      p.totals.assists += integer(row.a);
      p.totals.points += integer(row.p);
      p.totals.shots += integer(row.s);
    }
    for (const row of sample.goalies || []) {
      const key = row.id;
      if (!goalies.has(key))goalies.set(key,{id:key,name:row.name,team:row.t,starts:0,metrics:{saves20:0,saves25:0,saves30:0,shutouts:0},totals:{saves:0,against:0}});
      const g=goalies.get(key);
      g.starts += row.started?1:0;
      if (row.sv>=20) g.metrics.saves20++;
      if (row.sv>=25) g.metrics.saves25++;
      if (row.sv>=30) g.metrics.saves30++;
      const opponentScore=row.t===away?sample.h:sample.a;
      const otherGoaliePlayed=(sample.goalies||[]).some(other=>other.t===row.t&&other.id!==row.id&&integer(other.toi)>0);
      if (row.started && opponentScore===0 && !otherGoaliePlayed && integer(row.toi)>0) g.metrics.shutouts++;
      g.totals.saves += integer(row.sv);
      g.totals.against += integer(row.sa);
    }
  }
  const playerRows = [...players.values()].map(p=>({
    ...p,
    probability:Object.fromEntries(Object.entries(p.metrics).map(([key,value])=>[key,pct(value,n)])),
    average:Object.fromEntries(Object.entries(p.totals).map(([key,value])=>[key,divide(value,n)])),
  })).sort((a,b)=>b.average.points-a.average.points||b.average.goals-a.average.goals);
  const goalieRows = [...goalies.values()].map(g=>({
    ...g,
    probability:Object.fromEntries(Object.entries(g.metrics).map(([key,value])=>[key,pct(value,n)])),
    average:Object.fromEntries(Object.entries(g.totals).map(([key,value])=>[key,divide(value,n)])),
  })).sort((a,b)=>b.starts-a.starts||b.average.saves-a.average.saves);
  return {
    source:"v7-complete-games",count:n,away,home,
    homeWin:pct(homeWinCount,n),awayWin:pct(awayWinCount,n),
    homeCI:wilsonInterval(homeWinCount,n),awayCI:wilsonInterval(awayWinCount,n),
    homeMoneyline:fairMoneyline(pct(homeWinCount,n)),awayMoneyline:fairMoneyline(pct(awayWinCount,n)),
    homeGoals:mean(s=>s.h),awayGoals:mean(s=>s.a),
    homeShots:mean(s=>s.hs),awayShots:mean(s=>s.as),
    ot:rate(s=>s.f!=="REG"),shootout:rate(s=>s.f==="SO"),
    bothScore:rate(s=>s.h>0&&s.a>0),
    shutout:rate(s=>s.h===0||s.a===0),
    firstGoal:Object.fromEntries([[away,rate(s=>s.first===away)],[home,rate(s=>s.first===home)]]),
    totals,puckLines,teamTotals,
    players:playerRows,goalies:goalieRows,
  };
}

export function v7SampleCaveat(n) {
  if (n<INITIAL_V7_SAMPLES) return "Building the minimum 1,000 complete V7 games. Odds remain hidden until then.";
  if (n<REFINED_V7_SAMPLES) return "Minimum 1,000-game sample reached. Uncommon player outcomes still have high sampling uncertainty.";
  if (n<MAX_V7_SAMPLES) return "Based on complete V7 games; sampling intervals remain especially wide for rare events.";
  return "Based on actual V7 games. These are model estimates, not guaranteed outcomes.";
}
