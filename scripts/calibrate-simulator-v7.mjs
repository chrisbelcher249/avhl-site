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
  const Simulator = context.window.AVHLGameSimulator;
  // Instrument actual attempts, on-net shots and goals by manpower state.
  // Observe the real simulation without adding any random draws or modifying decisions.
  const originalShot = Simulator.prototype.simulateShot;
  Simulator.prototype.simulateShot = function(state, teamId, options) {
    const depth = this.__calibrationShotDepth || 0;
    const start = depth === 0 ? {
      situation: this.teamSituation(state, teamId),
      attempts: state.attempts[teamId], shots: state.shots[teamId], goals: state.score[teamId]
    } : null;
    this.__calibrationShotDepth = depth + 1;
    try {
      return originalShot.call(this, state, teamId, options);
    } finally {
      this.__calibrationShotDepth = depth;
      if (start) {
        const bucket = this.__shotByManpower ||= {};
        const entry = bucket[start.situation] ||= {attempts:0,shots:0,goals:0};
        entry.attempts += state.attempts[teamId] - start.attempts;
        entry.shots += state.shots[teamId] - start.shots;
        entry.goals += state.score[teamId] - start.goals;
      }
    }
  };
  return Simulator;
}
const current = fs.readFileSync("public/sim/simulator.js", "utf8");
const base = execFileSync("git", ["show", "origin/main:public/sim/simulator.js"], {encoding: "utf8", maxBuffer: 2 * 1024 * 1024});
const versions = {baseline: simulatorFrom(base), v7: simulatorFrom(current)};
const n = Math.max(5, Math.min(500, Number(process.argv[2]) || 60));
const offset = Math.max(0, Number(process.argv[3]) || 0);
const teamData = names.map((name, index) => buildTeam(name, "T" + index, "team" + index));
const games = [];
for (let i = offset; i < offset + n; i++) {
  const away = (i * 7) % teamData.length;
  const home = (i * 7 + 11) % teamData.length;
  if (away === home) throw new Error("Same team fixture");
  games.push({data: {away: teamData[away], home: teamData[home]}, seed: 871000 + i * 37});
}
// Isolated 3-on-3 benchmark: force an opening overtime faceoff instead of
// waiting for a regulation tie. Uses real bundled 40-team lines/ratings and
// the exact five-minute sudden-death period engine on both versions.
if (process.env.CALIBRATE_OT_ONLY === "1") {
  function overtimeOnly(Simulator) {
    let decided=0, shots=0, attempts=0, ppGoals=0, goals=0, penalties=0, eventCount=0;
    for(const fixture of games) {
      const sim=new Simulator(structuredClone(fixture.data),fixture.seed,{headless:true});
      sim.resetStats();
      const state=sim.createInitialState();
      sim.simulatePeriod(state,4,300,true);
      const h=sim.homeId,a=sim.awayId;
      const g=state.score[h]+state.score[a];
      if(g>1)throw Error("Sudden-death overtime did not stop after its first goal");
      decided += g>0 ? 1:0;
      goals+=g;
      shots+=state.shots[h]+state.shots[a];
      attempts+=state.attempts[h]+state.attempts[a];
      ppGoals+=state.powerPlayGoals[h]+state.powerPlayGoals[a];
      penalties+=sim.events.filter(e=>e.type==="penalty").length;
      eventCount+=sim.events.length;
    }
    return {
      games:games.length,decided,scoringPct:Number((100*decided/games.length).toFixed(2)),
      shotsPerOvertime:Number((shots/games.length).toFixed(3)),
      attemptsPerOvertime:Number((attempts/games.length).toFixed(3)),
      penalties,ppGoals,goals,eventCount
    };
  }
  const results=Object.fromEntries(Object.entries(versions).map(([label,Simulator])=>[label,overtimeOnly(Simulator)]));
  const report={test:"AVHL V7 ISOLATED THREE-ON-THREE VALIDATION",games:games.length,offset,results};
  console.log(JSON.stringify(report,null,2));
  if(process.env.CALIBRATION_OUTPUT)fs.writeFileSync(process.env.CALIBRATION_OUTPUT,JSON.stringify(report,null,2)+"\n");
  process.exit(0);
}
const summarize = (Simulator) => {
 const z = {games: 0, goals: 0, shots: 0, homeWins: 0, watchedSkaters: [], ppGoals: 0, ppOpp: 0, shGoals: 0, defenderGoals: 0, skaterGoals: 0, fShots: 0, dShots: 0, ot: 0, so: 0, shutouts: 0, eng: 0, pts90: 0, gp90: 0, pts95: 0, gp95: 0, shots90: 0, toi90: 0, goalies: 0, goalieGA: 0, goalsWithReplayedScorer:0, eventCount:0, shotsByStrength: {}, goalieSamples: [] };
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
   z.homeWins += s.score[h] > s.score[a] ? 1 : 0;
   z.so += shootout ? 1 : 0;
   z.ot += overtime ? 1 : 0;
   z.goals += s.score[h] + s.score[a] - (shootout ? 1 : 0);
   z.shots += s.shots[h] + s.shots[a];
   z.ppGoals += s.powerPlayGoals[h] + s.powerPlayGoals[a];
   z.ppOpp += s.powerPlayOpportunities[h] + s.powerPlayOpportunities[a];
   z.shGoals += s.shorthandedGoals[h] + s.shorthandedGoals[a];
   z.eng += s.goalies[h].emptyNetGoals + s.goalies[a].emptyNetGoals;
   z.eventCount += game.events.length;
   for (const teamId of [h, a]) {
     for (const goalie of s.goalieRows[teamId] || []) {
       if (goalie.shotsAgainst > 0) z.goalieSamples.push({
         id: String(goalie.avhlId || goalie.id), name: goalie.name,
         overall: Number(goalie.overall),
         shots: Number(goalie.shotsAgainst), saves: Number(goalie.saves),
         goals: Number(goalie.goalsAgainst), toi: Number(goalie.toi)
       });
     }
   }
   for (const [strength, numbers] of Object.entries(sim.__shotByManpower || {})) {
     const v = z.shotsByStrength[strength] ||= {attempts:0,shots:0,goals:0};
     v.attempts += numbers.attempts;
     v.shots += numbers.shots;
     v.goals += numbers.goals;
   }
   for (const team of [h, a]) {
     z.shutouts += (s.score[team] - (shootout && s.score[team] > s.score[team===h ? a:h] ? 1 : 0)) === 0 ? 1 : 0;
     z.goalieGA += s.goalies[team].goalsAgainst;
     for (const sk of s.skaters[team]) {
       if (["Connor McDavid", "Nathan MacKinnon", "Leon Draisaitl", "Cale Makar", "Auston Matthews"].includes(sk.name)) {
         z.watchedSkaters.push({name:sk.name,id:String(sk.avhlId || sk.id),overall:sk.overall,points:sk.points,goals:sk.goals,assists:sk.assists,shots:sk.shots,toi:sk.toi});
       }
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
 return {games:z.games, goalsPerTeam:round(z.goals/(2*n)), shotsPerTeam:round(z.shots/(2*n)), powerPlayPct:round(z.ppGoals/Math.max(1,z.ppOpp)*100), PPgoals:z.ppGoals, PPOpp:z.ppOpp, SHgoals:z.shGoals, SHgoalsPerGame:round(z.shGoals/n), defenderGoalSharePct:round(100*z.defenderGoals/Math.max(1,z.skaterGoals)), defenderShotSharePct:round(100*z.dShots/Math.max(1,z.shots)), OTperGamePct:round(100*z.ot/n), OTdecidedPct:round(100*(z.ot-z.so)/Math.max(1,z.ot)), SOgames:z.so, shutoutGamePct:round(100*z.shutouts/n), emptyNetGoalsPerGame:round(z.eng/n), elite90PPG:round(z.pts90/Math.max(1,z.gp90)), elite95PPG:round(z.pts95/Math.max(1,z.gp95)), elite90ShotsPg:round(z.shots90/Math.max(1,z.gp90)), elite90TOImin:round(z.toi90/Math.max(1,z.gp90)/60), goalieGA:z.goalieGA, skaterGoals:z.skaterGoals, totalEvents:z.eventCount, replayedGoals:z.goalsWithReplayedScorer, shootingByStrength:z.shotsByStrength, raw: z};
};
// A headless comparison is meaningful only if it generates exactly the same
// hockey as the full, replay-producing simulator. Check for RNG divergence.
for (const [label, Simulator] of Object.entries(versions)) {
  const fixture = games[0];
  const normal = new Simulator(structuredClone(fixture.data), fixture.seed).simulateGame();
  const fast = new Simulator(structuredClone(fixture.data), fixture.seed, {headless: true}).simulateGame();
  const fingerprint = g => JSON.stringify({
    score: g.finalSummary.score,
    shots: g.finalSummary.shots,
    powerPlayGoals: g.finalSummary.powerPlayGoals,
    powerPlayOpportunities: g.finalSummary.powerPlayOpportunities,
    shorthandedGoals: g.finalSummary.shorthandedGoals,
    injuries: g.finalSummary.injuries,
    skaters: g.finalSummary.skaters,
    goalieRows: g.finalSummary.goalieRows
  });
  if (fingerprint(normal) !== fingerprint(fast)) throw new Error(label + ": headless gameplay differs from complete replay mode");
}
const results = Object.fromEntries(Object.entries(versions).map(([key, Simulator]) => [key, summarize(Simulator)]));
const report = {test:"SIM V7 PAIR-SEEDED CALIBRATION",distinctRosters:names.length,seeds:n,offset,results};
console.log(JSON.stringify(report,null,2));
if (process.env.CALIBRATION_OUTPUT) fs.writeFileSync(process.env.CALIBRATION_OUTPUT, JSON.stringify(report,null,2)+"\n");
// Safety invariants: all player goals counted and replay source remains available.
for (const [label,x] of Object.entries(results)) {
  if (!x.replayedGoals || x.skaterGoals < x.goalieGA) throw new Error(label + ": invalid scoring / replay accounting");
}
