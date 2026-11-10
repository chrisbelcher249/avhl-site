// Merge independent seeded V6/V7 calibration shards into one 192-game report.
// Usage: node scripts/aggregate-simulator-v7.mjs ./calibration-results
import fs from "node:fs";
import path from "node:path";

const folder = process.argv[2] || "calibration-results";
const paths = fs.readdirSync(folder).filter(p => /^result-\d+\.json$/.test(p)).sort((a,b)=> Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
if (!paths.length) throw new Error("No V7 calibration shard JSON files found in " + folder);
const reports = paths.map(p => JSON.parse(fs.readFileSync(path.join(folder,p), "utf8")));
const spans = reports.map(r => ({offset:r.offset, seeds:r.seeds})).sort((a,b)=>a.offset-b.offset);
for (let i=0; i<spans.length;i++) {
  if (spans[i].seeds < 5 || !Number.isInteger(spans[i].offset)) throw new Error("Bad shard span");
  if (i>0 && spans[i].offset < spans[i-1].offset+spans[i-1].seeds) throw new Error("Duplicate/overlapping seeds");
}
if (process.env.CALIBRATION_EXPECT_SHARDS && reports.length!==Number(process.env.CALIBRATION_EXPECT_SHARDS))
  throw new Error("Expected "+process.env.CALIBRATION_EXPECT_SHARDS+" shards, found "+reports.length);
const n = reports.reduce((s,r)=>s+r.seeds,0);
const sum = (arr,k)=>arr.reduce((s,r)=>s+(Number(r[k])||0),0);
function merge(label) {
  const raw = reports.map(r=>{
    if (r.test!=="SIM V7 PAIR-SEEDED CALIBRATION" || r.distinctRosters!==40 || !r.results?.[label]?.raw)
      throw new Error("Shard missing required data for "+label);
    return r.results[label].raw;
  });
  const totals={};
  for (const key of Object.keys(raw[0])) {
    if(key==="shotsByStrength")continue;
    totals[key]=sum(raw,key);
  }
  totals.shotsByStrength={};
  for(const r of raw)for(const [strength,values] of Object.entries(r.shotsByStrength||{})) {
    const z=totals.shotsByStrength[strength]||={attempts:0,shots:0,goals:0};
    for(const k of ["attempts","shots","goals"])z[k]+=values[k]||0;
  }
  const pct=(a,b)=>b ? Number((100*a/b).toFixed(2)) : null;
  const rate=(a,b)=>b ? Number((a/b).toFixed(3)) : null;
  return {
    games:totals.games,
    goalsPerTeam:rate(totals.goals,totals.games*2),
    shotsPerTeam:rate(totals.shots,totals.games*2),
    PPgoals:totals.ppGoals, PPOpportunities:totals.ppOpp,
    powerPlayPct:pct(totals.ppGoals,totals.ppOpp),
    shortHandedGoals:totals.shGoals,
    shGoalsPerGame:rate(totals.shGoals,totals.games),
    defenseGoalSharePct:pct(totals.defenderGoals,totals.skaterGoals),
    defenseShotSharePct:pct(totals.dShots,totals.shots),
    OTgames:totals.ot, SOgames:totals.so,
    OTgamesPct:pct(totals.ot,totals.games),
    OTdecidedPct:pct(totals.ot-totals.so,totals.ot),
    shutoutGamePct:pct(totals.shutouts,totals.games),
    ENGperGame:rate(totals.eng,totals.games),
    elite90PPG:rate(totals.pts90,totals.gp90),
    elite95PPG:rate(totals.pts95,totals.gp95),
    elite95Appearances:totals.gp95,
    elite90ShotsPG:rate(totals.shots90,totals.gp90),
    replayedGoals:totals.goalsWithReplayedScorer,
    byManpower:totals.shotsByStrength
  };
}
const summary={test:"AVHL SIM V7 MULTI-SHARD VALIDATION",games:n,shards:reports.length,seedRanges:spans,baseline:merge("baseline"),v7:merge("v7")};
if(summary.baseline.games!==n || summary.v7.games!==n)throw new Error("Game counts across shards do not reconcile");
if(summary.baseline.replayedGoals<=0 || summary.v7.replayedGoals<=0)throw new Error("No full replay validation");
console.log(JSON.stringify(summary,null,2));
if(process.env.CALIBRATION_SUMMARY)fs.writeFileSync(process.env.CALIBRATION_SUMMARY,JSON.stringify(summary,null,2)+"\n");
