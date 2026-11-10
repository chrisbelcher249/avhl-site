// Regression: long periods must never end just because an event counter was hit.
import fs from "node:fs";
import vm from "node:vm";
const context={window:{},console,structuredClone};
context.globalThis=context;
vm.createContext(context);
for(const path of ["public/sim/team-metadata.js","public/sim/data.js","public/sim/simulator.js"])
  vm.runInContext(fs.readFileSync(path,"utf8"),context,{filename:path});
const Simulator=context.window.AVHLGameSimulator;
function assert(x,msg){if(!x)throw Error(msg)}
function create(seed){
  return new Simulator(structuredClone(context.window.AVHL_DATA),seed);
}
// Regression reproduces V6's 1,200-event premature-ending failure:
// 2,400 legal half-second possession events must consume the full 20 minutes.
{
  const sim=create(10021);
  const state=sim.createInitialState();
  let steps=0;
  sim.simulatePossessionStep=(s)=>{
    steps++;
    s.clock=Math.max(0,s.clock-0.5);
    s.absoluteTime+=0.5;
  };
  const otGoal=sim.simulatePeriod(state,1,1200,false);
  assert(!otGoal,"Regular period must not be ended as overtime");
  assert(steps===2400,`Period truncated: processed ${steps} of 2400 required possession events`);
  assert(Math.abs(state.absoluteTime-1200)<1e-5,"Regular period lost live game time");
  assert(sim.events.some(e=>e.type==="period-end"),"Missing regulation period-end event");
}
// A pathological sequence of no-clock events cannot silently delete time.
// Recovery should only advance small, explicitly accounted-for increments.
{
  const sim=create(10022);
  const state=sim.createInitialState();
  let simulated=0,maxIncrement=0,clockBefore=0;
  sim.simulatePossessionStep=()=>{simulated++};
  sim.advanceClock=(s,seconds)=>{
    maxIncrement=Math.max(maxIncrement,seconds);
    clockBefore+=seconds;
    s.clock=Math.max(0,s.clock-seconds);
    s.absoluteTime+=seconds;
    return [];
  };
  sim.simulatePeriod(state,2,12,false);
  assert(simulated>1200,"Stalled-clock watchdog was not exercised");
  assert(maxIncrement<=0.25+1e-8,"Period used a dangerous clock fast-forward");
  assert(Math.abs(clockBefore-12)<1e-5,"Period skipped live time during stall recovery");
  assert(Math.abs(state.absoluteTime-12)<1e-5,"Stalled period has an incorrect final time");
}
// Sudden-death overtime remains allowed to finish immediately upon a goal.
{
  const sim=create(10023);
  const state=sim.createInitialState();
  let steps=0;
  sim.simulatePossessionStep=(s)=>{
    steps++;
    s.clock-=0.5;
    s.absoluteTime+=0.5;
    if(steps===4)s.score[sim.homeId]+=1;
  };
  const decided=sim.simulatePeriod(state,4,300,true);
  assert(decided&&steps===4,"A golden-goal OT did not stop promptly");
}
console.log("Period integrity: PASS (2,400 events, zero-time stall recovery, sudden-death OT).");
