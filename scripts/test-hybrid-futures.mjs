import assert from "node:assert/strict";
import {teams} from "../data/teams.js";
import {players} from "../data/players.js";
import {schedule as fixtures} from "../data/schedule.js";
import {buildProjectedLineup} from "../src/lib/lineups.js";
import {recordFromProjected} from "../src/lib/lineupRecords.js";
import {forecastSeasonFutures} from "../src/lib/seasonFuturesForecast.js";
import {
  HYBRID_FUTURES_METHOD,MAX_GOALIE_STARTS,
  fitEmpiricalStrength,buildHybridContext,returnLogitShift,
  chooseGoalie,goalieStartMap,adjustV7Result,hybridHomeWinProbability
} from "../src/lib/hybridFuturesModel.js";

const livePlayers=players.filter(p=>p.currentTeam&&p.currentTeam!=="UFA");
const lineups=Object.fromEntries(teams.map(t=>[t.abbreviation,recordFromProjected(
  t.abbreviation,buildProjectedLineup(livePlayers.filter(p=>p.currentTeam===t.name))
)]));
const teamsWithEnoughPlayers=teams.every(t=>lineups[t.abbreviation]?.forwards?.length===12&&
  lineups[t.abbreviation]?.defense?.length===6&&lineups[t.abbreviation]?.goalies?.length===2);
assert(teamsWithEnoughPlayers,"Structural V7 test requires complete projected rosters.");
const starter=lineups[teams[0].abbreviation].goalies.find(g=>g.starter);
assert(starter);
const goalieStats=[{playerId:starter.playerId,gs:59}];
const t=teams[0],skaters=livePlayers.filter(p=>p.currentTeam===t.name&&p.role!=="Goalie");
const highest=skaters.slice().sort((a,b)=>b.overall-a.overall)[0];
const injury={
  teamAbbreviation:t.abbreviation,playerId:highest.id,missedGameIds:[100,101],
  expectedReturnGameId:102
};
const context=buildHybridContext({teams,players:livePlayers,lineups,
  injuries:[injury],goalieStats});
assert.equal(context.goalieStartCap,60);
assert.equal(context.activeInjuriesModeled,1);
assert.equal(returnLogitShift(context.byTeam[t.abbreviation],100),0);
assert.equal(returnLogitShift(context.byTeam[t.abbreviation],101),0);
assert(returnLogitShift(context.byTeam[t.abbreviation],102)>=0);
const gctx=context.byTeam[t.abbreviation],starts=goalieStartMap(gctx);
const chosen=chooseGoalie(gctx,110,starts,()=>0,{regularSeason:true});
assert.equal(chosen.id,starter.playerId);
assert.equal(starts.get(starter.playerId),60);
const next=chooseGoalie(gctx,111,starts,()=>0,{regularSeason:true});
assert.notEqual(next.id,starter.playerId,"Hard goalie-start ceiling must override starter selection.");
assert.equal(starts.get(starter.playerId),60);
assert.equal(MAX_GOALIE_STARTS,60);
const pristine={homeScore:3,awayScore:2,ot:true};
assert.deepEqual(adjustV7Result(pristine,1,0,()=>0),{homeScore:2,awayScore:3,ot:true});
assert.equal(hybridHomeWinProbability(0.5,0.5,gctx,gctx,{overall:80},{overall:80}),0.5);
const strength=fitEmpiricalStrength(fixtures.map(x=>({...x,awayScore:null,homeScore:null})),teams);
assert.equal(strength.games,0);
assert.equal(Object.keys(strength.byCode).length,40);
const scores={};
const abbrs=teams.map(x=>x.abbreviation).sort();
for(let i=0;i<abbrs.length;i++)for(let j=i+1;j<abbrs.length;j++){
  scores[abbrs[i]+":"+abbrs[j]]={
    firstHome:Array.from({length:50},()=>[3,2,0]),
    secondHome:Array.from({length:50},()=>[2,3,0])
  };
}
assert.equal(Object.keys(scores).length,780);
const schedule=fixtures.map((g,i)=>({...g,
  awayScore:i<90?2+(i%2):null,
  homeScore:i<90?3+(i%2):null,
  overtime:false
}));
const saved=JSON.stringify(schedule);
const pure=forecastSeasonFutures(schedule,teams,80,scores,"synthetic-test-only");
const hybrid=forecastSeasonFutures(schedule,teams,80,scores,"synthetic-test-only",{
  players:livePlayers,lineups,injuries:[injury],goalieStats
});
assert.equal(hybrid.method,HYBRID_FUTURES_METHOD);
assert.equal(hybrid.matchedPairs,780);
assert.equal(hybrid.hybridDetails.activeInjuriesModeled,1);
assert.equal(hybrid.hybridDetails.goalieStartCap,60);
assert.equal(hybrid.teams.length,40);
assert.equal(hybrid.engineSamples,78000);
assert.equal(hybrid.completedGames,90);
assert.equal(JSON.stringify(schedule),saved,"Forecasts must never change official scores or lineups.");
const sum=k=>hybrid.teams.reduce((s,t)=>s+t.probabilities[k],0);
for(const [market,count] of Object.entries({
  division:4,conference:2,presidents:1,playoffs:20,round1:16,
  round2:8,conferenceFinal:4,cupFinal:2,cup:1,relegation:3
}))assert(Math.abs(sum(market)-count)<1e-8,market+" did not conserve "+count+" titles");
assert.equal(hybrid.teams.reduce((s,x)=>s+x.projectedWins,0),1640);
assert.notDeepEqual(hybrid.teams.map(x=>x.projectedWins),pure.teams.map(x=>x.projectedWins));
assert.deepEqual(
  forecastSeasonFutures(schedule,teams,80,scores,"synthetic-test-only",{
    players:livePlayers,lineups,injuries:[injury],goalieStats
  }),
  hybrid,"Hybrid forecasts must be deterministic across identical inputs."
);
console.log("AVHL hybrid futures: PASS (empirical form, known injury returns, 60-goalie-start limit, 780 reuse, no synthetic historical scores, deterministic 10k-scenario math and conservation).");
