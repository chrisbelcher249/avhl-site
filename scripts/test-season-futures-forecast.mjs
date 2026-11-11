import assert from "node:assert/strict";
import {schedule as officialSchedule} from "../data/schedule.js";
import {teams} from "../data/teams.js";
import {forecastSeasonFutures,SEASON_METHOD,SEASON_SCENARIOS} from "../src/lib/seasonFuturesForecast.js";
import {drawV7Score,validatePairPool,snapshotDigest,makeAllPairEntries,TOTAL_PAIRS} from "../src/lib/v7FuturesPairs.js";

// STRUCTURAL FIXTURES ONLY. These are deliberate artificial test scores and
// cannot be published as V7 engine samples by the signed production publisher.
const league=teams.map(t=>({
  slug:t.slug,name:t.name,abbreviation:t.abbreviation,
  division:t.division,conference:t.conference,logo:t.assets?.logo
}));
const pairs={};
const ids=league.map(t=>t.abbreviation).sort();
const entries=[];
for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
 const a=ids[i],b=ids[j];
 pairs[a+":"+b]={
   firstHome:Array.from({length:50},()=>[3,2,0]),
   secondHome:Array.from({length:50},()=>[2,3,0])
 };
 entries.push({a,b,key:"v7f:1:1234567890abcdef:"+a+":"+b+":1234567890abcdef"});
}
assert.equal(Object.keys(pairs).length,TOTAL_PAIRS);
assert(pairs["ARI:ATL"]&&validatePairPool(pairs["ARI:ATL"]));
assert.equal(drawV7Score(pairs,"ARI","ATL",()=>0).homeScore,3);
assert.equal(drawV7Score(pairs,"ATL","ARI",()=>0).homeScore,3);
assert.equal(snapshotDigest(entries).length,24);
const schedule=officialSchedule.map((g,i)=>{
  const played=i<80;
  return {...g,awayScore:played?(i%3===0?3:2):null,
    homeScore:played?(i%3===0?1:3):null,overtime:played&&i%3!==0};
});
const source=JSON.stringify(schedule);
const result=forecastSeasonFutures(schedule,league,250,pairs,"structural-test-only");
const result2=forecastSeasonFutures(schedule,league,250,pairs,"structural-test-only");
assert.deepEqual(result,result2,"Same verified score pool and official results must reproduce probabilities.");
assert.equal(JSON.stringify(schedule),source,"Completed official results must never mutate.");
assert.equal(result.teams.length,40);
assert.equal(result.completedGames,80);
assert.equal(result.remainingGames,1560);
assert.equal(SEASON_SCENARIOS,10000);
assert.equal(SEASON_METHOD,"exact-V7-game-outcome-resampling");
assert.equal(result.engineSamples,78000);
const sum=k=>result.teams.reduce((n,t)=>n+t.probabilities[k],0);
const near=(v,w)=>assert(Math.abs(v-w)<1e-9,"Expected "+w+", got "+v);
near(sum("division"),4);
near(sum("conference"),2);
near(sum("presidents"),1);
near(sum("playoffs"),20);
near(sum("round1"),16);
near(sum("round2"),8);
near(sum("conferenceFinal"),4);
near(sum("cupFinal"),2);
near(sum("cup"),1);
near(sum("relegation"),3);
near(sum("topFive"),5);
near(sum("topTen"),10);
for(const team of result.teams){
  near(team.winsHistogram.reduce((n,v)=>n+v,0),250);
  assert(team.projectedWins>=team.record.wins);
  assert(team.projectedWins<=82);
  assert(team.projectedPoints>=team.record.pts);
  assert(team.winsP10<=team.winsP50 && team.winsP50<=team.winsP90);
  assert(team.probabilities.round1<=team.probabilities.playoffs);
  assert(team.probabilities.round2<=team.probabilities.round1);
  assert(team.probabilities.conferenceFinal<=team.probabilities.round2);
  assert(team.probabilities.cupFinal<=team.probabilities.conferenceFinal);
  assert(team.probabilities.cup<=team.probabilities.cupFinal);
}
assert.throws(()=>forecastSeasonFutures(schedule,league,5,null),/780/);
assert.throws(()=>forecastSeasonFutures(schedule,league,5,{"ARI:ATL":pairs["ARI:ATL"]}),/780/);
assert.throws(()=>forecastSeasonFutures(schedule.slice(0,1000),league,1,pairs),/1,640/);
// Owner changes to one club must invalidate only its 39 pairings, not
// prevent the other 741 current-lineup V7 pairing pools from being reused.
const rosterVersion={};
const makeEntries=()=>makeAllPairEntries(ids,"official-test-v7-engine",
  (home,away)=>({home,away,homeRosterRev:rosterVersion[home]||0,
    awayRosterRev:rosterVersion[away]||0}));
const before=makeEntries();
rosterVersion[ids[0]]=1;
const after=makeEntries();
assert.notEqual(snapshotDigest(before),snapshotDigest(after));
let invalidated=0;
for(let i=0;i<before.length;i++){
  assert.equal(before[i].a,after[i].a);
  assert.equal(before[i].b,after[i].b);
  if(before[i].key!==after[i].key)invalidated++;
}
assert.equal(invalidated,39,"One owner lineup edit must preserve 741 unrelated pairs.");
console.log("AVHL exact V7 futures rules: PASS (780 50/50 pair pools, no fallback, 20 playoffs, 3 relegations, official result invariants).");
