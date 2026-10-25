import assert from "node:assert/strict";
import { goalieDecisionsFromReplay } from "../src/lib/goalieDecisions.js";
import { parseGoalieGameRows, aggregateGoalies } from "../src/lib/seasonStats.js";
import { buildOfficialSheetRows } from "../src/lib/officialGame.js";

const goalies = {
  "away-x": [{id:"x-g1",avhlId:"1696",starter:true},{id:"x-g2",avhlId:"1697",starter:false}],
  "home-y": [{id:"y-g1",avhlId:"1698",starter:true},{id:"y-g2",avhlId:"1699",starter:false}],
};
const packet = {
  finish:"REG",away:{id:"away-x",abbreviation:"ARI",score:2},
  home:{id:"home-y",abbreviation:"DEN",score:3},
  summary:{goalieRows:goalies},
};
const events = [
 {type:"goal",teamId:"home-y"},
 {type:"goal",teamId:"away-x"},
 {type:"goalie-change",teamId:"home-y",playerId:"y-g2"},
 {type:"goal",teamId:"away-x"},
 {type:"goal",teamId:"home-y"},
 {type:"goalie-change",teamId:"away-x",playerId:"x-g2"},
 {type:"goal",teamId:"home-y"},
];
const result = goalieDecisionsFromReplay(packet,{events});
assert.deepEqual(result, {
  DEN:{playerId:"1699",decision:"W"},ARI:{playerId:"1697",decision:"L"},
}, "Relief goalie on ice when GWG scored must get W/L");
const shootout = goalieDecisionsFromReplay({
 ...packet,finish:"SO",away:{...packet.away,score:2},
 home:{...packet.home,score:3},
},{events:[
 {type:"goal",teamId:"home-y"},{type:"goal",teamId:"away-x"},
 {type:"goal",teamId:"away-x"},{type:"goal",teamId:"home-y"},
 {type:"goalie-change",teamId:"home-y",playerId:"y-g2"},
]});
assert.equal(shootout.DEN.playerId,"1699");
assert.equal(shootout.ARI.decision,"OTL");
assert.throws(()=>goalieDecisionsFromReplay(packet,{events:events.slice(0,5)}),/Replay goal events/);

const rows=parseGoalieGameRows([
 {"Game ID":"1",Source:"SIM",Team:"DEN","Player ID":"1698",Min:"20:00",GS:"1",Decision:""},
 {"Game ID":"1",Source:"SIM",Team:"DEN","Player ID":"1699",Min:"40:00",GS:"0",Decision:"W"},
 {"Game ID":"1",Source:"SIM",Team:"ARI","Player ID":"1696",Min:"30:00",GS:"1",Decision:""},
 {"Game ID":"1",Source:"SIM",Team:"ARI","Player ID":"1697",Min:"30:00",GS:"0",Decision:"L"},
 {"Game ID":"2",Source:"SIM",Team:"ARI","Player ID":"1696",Min:"60:00",GS:"1",Decision:"OTL"},
 {"Game ID":"2",Source:"SIM",Team:"ARI","Player ID":"1697",Min:"0:00",GS:"0",Decision:""},
]);
const records=aggregateGoalies(rows,[]);
const byId=Object.fromEntries(records.map(g=>[g.playerId,g]));
assert.deepEqual([byId["1696"].wins,byId["1696"].losses,byId["1696"].otl],[0,0,1]);
assert.deepEqual([byId["1697"].wins,byId["1697"].losses,byId["1697"].otl],[0,1,0]);
assert.deepEqual([byId["1699"].wins,byId["1699"].losses,byId["1699"].otl],[1,0,0]);
assert.equal(byId["1699"].gs,0,"Relief win does not become a start");
assert.equal(byId["1698"].decisionsUnverified,0,"Valid relief W leaves starting goalie without decision");

console.log("Verified replay goalie of record, relief wins, SO losses and aggregator: PASS");
