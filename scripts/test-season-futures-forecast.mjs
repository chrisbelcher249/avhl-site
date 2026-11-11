import assert from "node:assert/strict";
import {schedule as officialSchedule} from "../data/schedule.js";
import {teams} from "../data/teams.js";
import {forecastSeasonFutures,SEASON_SCENARIOS} from "../src/lib/seasonFuturesForecast.js";

const league=teams.map(t=>({
  slug:t.slug,name:t.name,abbreviation:t.abbreviation,
  division:t.division,conference:t.conference,logo:t.assets?.logo
}));
const schedule=officialSchedule.map((g,i)=>{
  const played=i<80;
  return {
    ...g,awayScore:played?i%3===0?3:2:null,
    homeScore:played?i%3===0?1:3:null,
    overtime:played&&i%3!==0
  };
});
const source=JSON.stringify(schedule);
const result=forecastSeasonFutures(schedule,league,250);
const result2=forecastSeasonFutures(schedule,league,250);
assert.deepEqual(result,result2,"The same official scores must give reproducible probabilities.");
assert.equal(JSON.stringify(schedule),source,"Official games cannot be mutated.");
assert.equal(result.teams.length,40);
assert.equal(result.completedGames,80);
assert.equal(result.remainingGames,1560);
assert.equal(SEASON_SCENARIOS,10000);
assert.equal(result.method,"standings-based-empirical");
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
assert.throws(()=>forecastSeasonFutures(schedule.slice(0,1000),league,1),/1,640/);
const noScores=schedule.map(g=>({...g,awayScore:null,homeScore:null}));
assert.throws(()=>forecastSeasonFutures(noScores,league,10),/No completed official/);
console.log("AVHL season futures rules: PASS (20 playoff, 16 main bracket, 4 divisions, 3 relegated, Cup and points/wins invariants).");
