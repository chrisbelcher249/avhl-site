import assert from "node:assert/strict";
import {renderParlayShareCard} from "../src/lib/parlayShareCard.js";
import {MAX_PARLAY_LEGS,PARLAY_MODES,MAX_DISPLAY_DECIMAL_ODDS,
  displayLegProbability,probabilityToAmerican,decimalToAmerican,
  estimatedParlay,canAddParlayLeg} from "../src/lib/parlayMath.js";

assert.equal(MAX_PARLAY_LEGS,8);
assert.deepEqual(PARLAY_MODES,["same","day","futures"]);
assert.equal(MAX_DISPLAY_DECIMAL_ODDS,10001);
assert.equal(probabilityToAmerican(0.5),"-100");
assert.equal(probabilityToAmerican(0.4),"+150");
assert.equal(probabilityToAmerican(0.8),"-400");
assert.equal(probabilityToAmerican(0),"+200,100");
assert.equal(probabilityToAmerican(1),"-200,100");
assert.equal(probabilityToAmerican(0,10000),"+1,000,000");
assert.equal(probabilityToAmerican(-0.1),"—");
assert.equal(probabilityToAmerican(NaN),"—");
assert.equal(decimalToAmerican(100000),"+1,000,000");
assert(displayLegProbability(0,10000)>0);
assert(displayLegProbability(1,10000)<1);

const a={id:"game:1:ml:ARI",type:"game",date:"2026-11-11",gameId:1,
  marketKey:"ml:ARI",teamCodes:["ARI","ATL"],probability:0.6,samples:1000};
const b={id:"game:2:ml:ATL",type:"game",date:"2026-11-11",gameId:2,
  marketKey:"ml:ATL",teamCodes:["ATL","ARI"],probability:0.4,samples:1000};
const c={id:"game:1:total:o:6.5",type:"game",date:"2026-11-11",gameId:1,
  marketKey:"total:o:6.5",teamCodes:["ARI","ATL"],probability:0.5,samples:1000};
const future={id:"future:ARI:cup",type:"future",market:"cup",teamCodes:["ARI"],
  division:"Central",conference:"West",probability:0.03,samples:10000};
const future2={id:"future:ATL:playoffs",type:"future",market:"playoffs",
  teamCodes:["ATL"],division:"Atlantic",conference:"East",probability:0.6,samples:10000};

assert.equal(canAddParlayLeg([],a,"same").ok,true);
assert.equal(canAddParlayLeg([a],c,"same").ok,true,
  "Different markets in one game are allowed");
assert.match(canAddParlayLeg([a],b,"same").reason,/one matchup/i);
assert.match(canAddParlayLeg([a],{...a,id:"game:1:ml:ATL",marketKey:"ml:ATL"},"same").reason,/moneyline/i);
assert.match(canAddParlayLeg([c],{...c,id:"game:1:total:u:6.5",marketKey:"total:u:6.5"},"same").reason,/total/i);
assert.equal(canAddParlayLeg([a],{...a,id:"game:1:puck:a-:1.5",marketKey:"puck:a-:1.5"},"same").ok,true);
assert.match(canAddParlayLeg([a],{...a,id:"game:1:puck:h-:1.5",marketKey:"puck:h-:1.5"},"same").reason,/cannot cover/i);
assert.match(canAddParlayLeg([{...a,id:"game:1:other:both",marketKey:"other:both"}],
  {...a,id:"game:1:other:shutout",marketKey:"other:shutout"},"same").reason,/cannot happen/i);

assert.equal(canAddParlayLeg([a],b,"day").ok,true);
assert.match(canAddParlayLeg([a],c,"day").reason,/one selection per game/i);
assert.match(canAddParlayLeg([a],{...b,date:"2026-11-12"},"day").reason,/same calendar day/i);
assert.match(canAddParlayLeg([a],future,"day").reason,/only accept/i);
assert.match(canAddParlayLeg([future],a,"same").reason,/separate tickets/i);
assert.match(canAddParlayLeg([a],a,"day").reason,/already on your slip/i);

assert.equal(canAddParlayLeg([],future,"futures").ok,true);
assert.equal(canAddParlayLeg([future],future2,"futures").ok,true);
assert.match(canAddParlayLeg([future],{...future,id:"future:ARI:playoffs",market:"playoffs"},"futures").reason,/one futures outcome per team/i);
assert.match(canAddParlayLeg([future],{...future,id:"future:ATL:cup",teamCodes:["ATL"]},"futures").reason,/only one team/i);
assert.match(canAddParlayLeg([future],a,"futures").reason,/only accept/i);
assert.match(canAddParlayLeg([{...future,market:"division"}],
  {...future2,market:"division",division:"Central"},"futures").reason,/same division/i);
assert.match(canAddParlayLeg([{...future,market:"conference"}],
  {...future2,market:"conference",conference:"West"},"futures").reason,/same conference/i);

const eight=Array.from({length:8},(_,i)=>({...a,gameId:i+1,id:"game:"+String(i+1)+":ml:ARI"}));
assert.equal(canAddParlayLeg(eight,b,"day").ok,false);
assert.match(canAddParlayLeg(eight,b,"day").reason,/eight selections/i);
assert.equal(estimatedParlay(eight,100)?.points,100);
assert.equal(estimatedParlay([...eight,b],100),null);
assert.equal(canAddParlayLeg([],{...a,probability:-2},"same").ok,false);
assert.equal(canAddParlayLeg([],{...a,probability:null},"same").ok,false);

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
// Verify client-side branded share card creation without a browser, server or network call.
const drawn=[];
const canvas={width:0,height:0,
  getContext:()=>({
    beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},
    fillRect(){},drawImage(){},
    measureText:value=>({width:String(value).length*13}),
    fillText:value=>drawn.push(String(value))
  }),
  toBlob:callback=>callback(new Blob(["virtual-ticket-test"],{type:"image/png"}))
};
const oldDocument=globalThis.document,oldImage=globalThis.Image;
globalThis.document={createElement:tag=>{assert.equal(tag,"canvas");return canvas;}};
globalThis.Image=class{set src(value){queueMicrotask(()=>this.onerror?.());}};
try{
  for(const [mode,legsCount] of [["same",2],["day",5],["futures",8]]){
    drawn.length=0;
    const ticket={mode,at:"2026-11-11T15:00:00Z",
      legs:Array.from({length:legsCount},(_,i)=>({
        label:"Team "+(i+1)+" · Win the Cup",
        context:"2026–27 AVHL season",price:"+150"
      })),
      odds:"+12,500",virtualPoints:100,potentialPoints:12600};
    const output=await renderParlayShareCard(ticket);
    assert.equal(output.blob.type,"image/png");
    assert.match(output.filename,new RegExp(mode+"-"+legsCount+"-leg\\.png$"));
    assert.equal(canvas.width,1080);
    assert(canvas.height>=1120);
    assert(drawn.includes("AVHL SPORTSBOOK"));
    assert(drawn.some(line=>line.includes("NO REAL MONEY")));
    assert(drawn.includes("Team "+legsCount+" · Win the Cup"));
  }
  await assert.rejects(()=>renderParlayShareCard({mode:"same",legs:[]}),/Invalid shareable parlay/);
}finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
}
console.log("AVHL virtual parlay maths: PASS (8 legs; same-game, one-day and futures rules; contradiction guards; independence estimate).");
console.log("AVHL Sportsbook PNG share cards: PASS (same-game, one-day, eight-leg futures, no backend).");
