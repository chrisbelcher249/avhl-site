import assert from "node:assert/strict";
import {summarizeV7Samples,fairMoneyline,canPublishV7Odds} from "../src/lib/v7OddsSamples.js";
const sample=[
 {a:4,h:2,as:28,hs:24,f:"REG",first:"ARI",
  players:[{id:"p1",name:"Example Skater",t:"ARI",g:2,a:1,p:3,s:5,h:3,tk:1,ppg:1,fw:10}],
  goalies:[
   {id:"g1",name:"Starter",t:"ARI",started:true,sv:24,sa:26,ga:2,toi:3600},
   {id:"g2",name:"Backup",t:"ARI",started:false,sv:0,sa:0,ga:0,toi:0},
   {id:"g3",name:"Opponent Starter",t:"ATL",started:true,sv:24,sa:28,ga:4,toi:3600}
  ]},
 {a:1,h:3,as:22,hs:29,f:"OT",first:"ATL",
  players:[{id:"p1",name:"Example Skater",t:"ARI",g:0,a:0,p:0,s:2,h:1,tk:0,ppg:0,fw:3}],
  goalies:[
   {id:"g1",name:"Starter",t:"ARI",started:true,sv:26,sa:29,ga:3,toi:3600},
   {id:"g2",name:"Backup",t:"ARI",started:false,sv:0,sa:0,ga:0,toi:0},
   {id:"g3",name:"Opponent Starter",t:"ATL",started:true,sv:21,sa:22,ga:1,toi:3600}
  ]}
];
const odds=summarizeV7Samples(sample,"ARI","ATL");
assert.equal(odds.players.length,1);
assert.equal(odds.goalies.length,2,"Relief goalies must not appear in featured goalie props");
assert(odds.goalies.every(g=>g.starts===2));
const skater=odds.players[0];
for(const k of ["goals","goals2","assists","assists2","points","points2","points3","shots2","shots3","shots4","shots5","hits2","hits3","takeaways1","ppGoal1","faceoffWins5","faceoffWins10"]){
 assert.equal(typeof skater.probability[k],"number", "Missing "+k);
}
assert.equal(skater.probability.goals2,0.5);
assert.equal(skater.probability.shots2,1);
assert.equal(skater.probability.shots5,0.5);
assert.equal(skater.probability.ppGoal1,0.5);
assert.equal(skater.probability.faceoffWins10,0.5);
const starter=odds.goalies.find(g=>g.team==="ARI");
assert.equal(starter.probability.saves20,1);
assert.equal(starter.probability.saves25,0.5);
assert.equal(starter.probability.allowedUnder25,0.5);
assert.equal(starter.probability.shutouts,0);
assert.equal(odds.totalGoals,undefined);
assert.equal(odds.homeWin+odds.awayWin,1);
assert.equal(fairMoneyline(.25),"+300");
assert.equal(fairMoneyline(.75),"-300");
assert.equal(canPublishV7Odds(12),false);
assert.equal(canPublishV7Odds(999),false);
assert.equal(canPublishV7Odds(1000),true);
console.log("AVHL V7 odds market catalog: PASS (17 skater thresholds, starter-only goalie props, moneyline-first, 1k publication gate).");
