// V7 repeatable, multi-team, paired-seed comparison against main.
// Run from repository root with: node scripts/calibrate-simulator-v7.mjs 60
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { players } from "../data/players.js";
import { teams } from "../data/teams.js";

function tokens(player) {
  return String(player.position || '').toUpperCase().split(/[\/,\s-]+/).filter(Boolean);
}
function isDefense(player) {
  return tokens(player).some((v) => ['D','LD','RD'].includes(v));
}
function hasPosition(player, pos) { return tokens(player).includes(pos); }
function takeBest(pool, pred = () => true) {
  const candidates = pool.filter(pred).sort((a,b) => (b.overall||0)-(a.overall||0));
  const chosen = candidates[0] || pool.slice().sort((a,b)=>(b.overall||0)-(a.overall||0))[0];
  if (!chosen) return null;
  pool.splice(pool.indexOf(chosen), 1);
  return chosen;
}
function simPlayer(player, abbr, extra={}) {
  return {
    id: `${abbr.toLowerCase()}-${player.id}`,
    avhlId: player.id,
    name: player.name,
    number: player.number,
    listedPosition: player.position,
    overall: player.overall,
    age: player.age,
    height: player.height,
    heightIn: player.heightIn,
    weight: player.weight,
    handedness: player.handedness,
    playerType: player.playerType,
    ratings: player.ratings,
    ...extra,
  };
}
function buildTeam(fullName, abbr, id) {
  const roster = players.filter((p) => p.currentTeam === fullName);
  const fRemain = roster.filter((p)=>p.role==='Skater'&&!isDefense(p)).slice();
  const dRemain = roster.filter((p)=>p.role==='Skater'&&isDefense(p)).slice();
  const centers=[];
  for (let line=1; line<=4; line++) centers.push(takeBest(fRemain,p=>hasPosition(p,'C')));
  const forwards=[];
  for (let line=1; line<=4; line++) {
    const left=takeBest(fRemain,p=>hasPosition(p,'LW'));
    const center=centers[line-1];
    const right=takeBest(fRemain,p=>hasPosition(p,'RW'));
    if (left) forwards.push(simPlayer(left,abbr,{position:'LW',line}));
    if (center) forwards.push(simPlayer(center,abbr,{position:'C',line}));
    if (right) forwards.push(simPlayer(right,abbr,{position:'RW',line}));
  }
  while (fRemain.length && forwards.length<12) {
    const p=takeBest(fRemain); const line=Math.floor(forwards.length/3)+1; const slot=forwards.length%3;
    forwards.push(simPlayer(p,abbr,{position:['LW','C','RW'][slot],line:Math.min(4,line)}));
  }
  const defense=[];
  for (let pair=1; pair<=3; pair++) {
    const left=takeBest(dRemain,p=>hasPosition(p,'LD'));
    const right=takeBest(dRemain,p=>hasPosition(p,'RD'));
    if (left) defense.push(simPlayer(left,abbr,{position:'LD',pair}));
    if (right) defense.push(simPlayer(right,abbr,{position:'RD',pair}));
  }
  while (dRemain.length && defense.length<6) {
    const p=takeBest(dRemain); const pair=Math.floor(defense.length/2)+1; const slot=defense.length%2;
    defense.push(simPlayer(p,abbr,{position:slot===0?'LD':'RD',pair:Math.min(3,pair)}));
  }
  const goalies=roster.filter(p=>p.role==='Goalie').slice().sort((a,b)=>(b.overall||0)-(a.overall||0)).slice(0,2)
    .map((p,i)=>simPlayer(p,abbr,{position:'G',starter:i===0}));
  if (forwards.length<12 || defense.length<6 || goalies.length<2) throw new Error(`${fullName}: bad roster ${forwards.length}F ${defense.length}D ${goalies.length}G`);
  return {
    id, name: fullName.split(' ').at(-1), city: fullName.split(' ').slice(0,-1).join(' '), fullName, abbreviation: abbr,
    arenaName: `${fullName} Arena`, primaryColor:'#111111', secondaryColor:'#eeeeee', assets:{},
    forwards:forwards.slice(0,12), defense:defense.slice(0,6), goalies, rosterSource:'bundled-test', shootoutOrder:[]
  };
}


const counts = new Map();
for (const p of players) {
  const name = p.currentTeam;
  if (!name) continue;
  const n = counts.get(name) || { F: 0, D: 0, G: 0 };
  if (p.role === "Goalie") n.G++;
  else if (p.role === "Skater" && isDefense(p)) n.D++;
  else if (p.role === "Skater") n.F++;
  counts.set(name, n);
}
const names = teams.map(t => t.name).filter(name => {const n = counts.get(name);return n && n.F >= 12 && n.D >= 6 && n.G >= 2;}).sort();
if (names.length < 12) throw new Error("Not enough fully staffed bundled rosters: " + names.length);
function simulatorFrom(code) {
  const context = {window: {}, console, structuredClone, Math, Date};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context);
  if (!context.window.AVHLGameSimulator) throw new Error("Simulator constructor missing");
  return context.window.AVHLGameSimulator;
}
const current = fs.readFileSync("public/sim/simulator.js", "utf8");
const base = execFileSync("git", ["show", "origin/main:public/sim/simulator.js"], {encoding: "utf8", maxBuffer: 2 * 1024 * 1024});
const versions = {baseline: simulatorFrom(base), v7: simulatorFrom(current)};
const n = Math.max(5, Math.min(500, Number(process.argv[2]) || 60));
const teamData = names.map((name, index) => buildTeam(name, "T" + index, "team" + index));
const games = [];
for (let i = 0; i < n; i++) {
  const away = (i * 7) % teamData.length;
  const home = (i * 7 + 11) % teamData.length;
  if (away === home) throw new Error("Same team fixture");
  games.push({data: {away: teamData[away], home: teamData[home]}, seed: 871000 + i * 37});
}
const summarize = (Simulator) => {
 const z = {games: 0, goals: 0, shots: 0, ppGoals: 0, ppOpp: 0, shGoals: 0, defenderGoals: 0, skaterGoals: 0, fShots: 0, dShots: 0, ot: 0, so: 0, shutouts: 0, eng: 0, pts90: 0, gp90: 0, pts95: 0, gp95: 0, shots90: 0, toi90: 0, goalies: 0, goalieGA: 0, goalsWithReplayedScorer:0, eventCount:0 };
 for (const fixture of games) {
   // Retain one complete replay; headless mode uses identical hockey mechanics
   // but omits expensive presentation snapshots for distributional testing.
   const sim = new Simulator(structuredClone(fixture.data), fixture.seed, {headless: z.games > 0});
   const game = sim.simulateGame();
   const s = game.finalSummary;
   const h = game.homeId, a = game.awayId;
   const shootout = game.events.some(e => e.type === "shootout-start");
   const overtime = game.events.some(e => Number(e.period) === 4);
   z.games++;
   z.so += shootout ? 1 : 0;
   z.ot += overtime ? 1 : 0;
   z.goals += s.score[h] + s.score[a] - (shootout ? 1 : 0);
   z.shots += s.shots[h] + s.shots[a];
   z.ppGoals += s.powerPlayGoals[h] + s.powerPlayGoals[a];
   z.ppOpp += s.powerPlayOpportunities[h] + s.powerPlayOpportunities[a];
   z.shGoals += s.shorthandedGoals[h] + s.shorthandedGoals[a];
   z.eng += s.goalies[h].emptyNetGoals + s.goalies[a].emptyNetGoals;
   z.eventCount += game.events.length;
   for (const team of [h, a]) {
     z.shutouts += (s.score[team] - (shootout && s.score[team] > s.score[team===h ? a:h] ? 1 : 0)) === 0 ? 1 : 0;
     z.goalieGA += s.goalies[team].goalsAgainst;
     for (const sk of s.skaters[team]) {
       z.skaterGoals += sk.goals;
       const defender = sk.position.includes("D");
       if (defender) {z.defenderGoals += sk.goals; z.dShots += sk.shots;}
       else z.fShots += sk.shots;
       if (sk.overall >= 90) {z.pts90 += sk.points; z.gp90++; z.shots90 += sk.shots; z.toi90 += sk.toi;}
       if (sk.overall >= 95) {z.pts95 += sk.points; z.gp95++;}
     }
   }
   z.goalsWithReplayedScorer += game.events.filter(e => e.type === "goal" && e.replay && e.playerId).length;
 }
 const round = v => Number(v.toFixed(3));
 return {games:z.games, goalsPerTeam:round(z.goals/(2*n)), shotsPerTeam:round(z.shots/(2*n)), powerPlayPct:round(z.ppGoals/Math.max(1,z.ppOpp)*100), PPgoals:z.ppGoals, PPOpp:z.ppOpp, SHgoals:z.shGoals, SHgoalsPerGame:round(z.shGoals/n), defenderGoalSharePct:round(100*z.defenderGoals/Math.max(1,z.skaterGoals)), defenderShotSharePct:round(100*z.dShots/Math.max(1,z.shots)), OTperGamePct:round(100*z.ot/n), OTdecidedPct:round(100*(z.ot-z.so)/Math.max(1,z.ot)), SOgames:z.so, shutoutGamePct:round(100*z.shutouts/n), emptyNetGoalsPerGame:round(z.eng/n), elite90PPG:round(z.pts90/Math.max(1,z.gp90)), elite95PPG:round(z.pts95/Math.max(1,z.gp95)), elite90ShotsPg:round(z.shots90/Math.max(1,z.gp90)), elite90TOImin:round(z.toi90/Math.max(1,z.gp90)/60), goalieGA:z.goalieGA, skaterGoals:z.skaterGoals, totalEvents:z.eventCount, replayedGoals:z.goalsWithReplayedScorer};
};
const results = Object.fromEntries(Object.entries(versions).map(([key, Simulator]) => [key, summarize(Simulator)]));
console.log(JSON.stringify({test:"SIM V7 PAIR-SEEDED CALIBRATION",distinctRosters:names.length,seeds:n,results},null,2));
// Safety invariants: all player goals counted and replay source remains available.
for (const [label,x] of Object.entries(results)) {
  if (!x.replayedGoals || x.skaterGoals < x.goalieGA) throw new Error(label + ": invalid scoring / replay accounting");
}
