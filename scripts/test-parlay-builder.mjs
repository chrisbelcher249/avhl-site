import assert from "node:assert/strict";
import {MAX_PARLAY_LEGS,MAX_DISPLAY_DECIMAL_ODDS,displayLegProbability,
  probabilityToAmerican,decimalToAmerican,estimatedParlay,canAddParlayLeg}
  from "../src/lib/parlayMath.js";

assert.equal(MAX_PARLAY_LEGS,6);
assert.equal(MAX_DISPLAY_DECIMAL_ODDS,10001);
assert.equal(probabilityToAmerican(0.5),"-100");
assert.equal(probabilityToAmerican(0.4),"+150");
assert.equal(probabilityToAmerican(0.8),"-400");
assert.equal(probabilityToAmerican(0),"+199,920");
assert.equal(probabilityToAmerican(1),"-200,000");
assert.equal(probabilityToAmerican(0,10000),"+1,000,000");
assert.equal(probabilityToAmerican(-0.1),"—");
assert.equal(probabilityToAmerican(NaN),"—");
assert.equal(decimalToAmerican(100000),"+1,000,000");
assert(displayLegProbability(0,10000)>0);
assert(displayLegProbability(1,10000)<1);
const a={id:"game:1:ml:ARI",type:"game",gameId:1,probability:0.6,samples:1000};
const b={id:"game:2:ml:ATL",type:"game",gameId:2,probability:0.4,samples:1000};
const c={id:"game:1:total:6.5",type:"game",gameId:1,probability:0.5,samples:1000};
const future={id:"future:ARI:cup",type:"future",probability:0.03,samples:10000};
assert.equal(canAddParlayLeg([],a).ok,true);
assert.equal(canAddParlayLeg([a],b).ok,true);
assert.equal(canAddParlayLeg([a],a).ok,false);
assert.match(canAddParlayLeg([a],c).reason,/one selection per game/i);
assert.equal(canAddParlayLeg([a],future).ok,true);
assert.match(canAddParlayLeg([future],{...future,id:"future:PHI:cup"}).reason,
  /one season futures selection/i);
assert.equal(canAddParlayLeg(Array(6).fill(a),b).ok,false);
assert.equal(canAddParlayLeg([],{...b,probability:-2}).ok,false);
assert.equal(canAddParlayLeg([],{...b,probability:null}).ok,false);
const ticket=estimatedParlay([a,b],100);
assert(Math.abs(ticket.probability-0.24)<1e-10);
assert.equal(ticket.american,"+317");
assert.equal(ticket.potentialPoints,417);
assert.equal(ticket.netPoints,317);
assert.equal(estimatedParlay([a,b],-5),null);
assert.equal(estimatedParlay([],100),null);
const longshot=estimatedParlay([{...a,probability:0,samples:10000},b],100);
assert.equal(longshot.american,"+1,000,000");
assert.equal(longshot.capped,true);
assert.equal(longshot.potentialPoints,1_000_100);
console.log("AVHL virtual parlay maths: PASS (fair lines, zero-count floor, independent product estimate, 6-leg cap, one-per-game and one-future guard).");
