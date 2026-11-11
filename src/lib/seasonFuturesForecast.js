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
  if(divs.length!==2||idx.length!==20)throw Error("Expected two divisions of ten teams per conference.");...[truncated]