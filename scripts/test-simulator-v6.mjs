globalThis.window = {};

const { players } = await import('../data/players.js');
await import('../public/sim/simulator.js');

const Simulator = globalThis.window.AVHLGameSimulator;

// Test-only instrumentation: sum the Bernoulli probabilities offered to the
// injury RNG so calibration does not depend on a tiny sample of realized injuries.
const originalMaybeCauseInjury = Simulator.prototype.maybeCauseInjury;
Simulator.prototype.maybeCauseInjury = function(state, player, options = {}) {
  const base = Number(options.baseProbability) || 0;
  const impact = Number(options.impact) || 1;
  const probability = player ? Math.max(0, Math.min(0.12, base * this.injuryRiskMultiplier(player) * Math.max(0.35, Math.min(2.8, impact)))) : 0;
  this.__expectedInjuries = (this.__expectedInjuries || 0) + probability;
  const cause = options.cause || 'hit';
  this.__expectedByCause ||= {};
  this.__expectedByCause[cause] = (this.__expectedByCause[cause] || 0) + probability;
  return originalMaybeCauseInjury.call(this, state, player, options);
};

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

const data={
  home: buildTeam('Charleston Tsunami','CHA','cha'),
  away: buildTeam('Richmond Robbers','RIC','ric'),
};

const inspect = new Simulator(data, 3222149441);
const carlson = inspect.teams.cha.players.find((p)=>p.avhlId==='0001');
if (!carlson) throw new Error('John Carlson not found in Charleston test roster.');
const expected = players.find((p)=>p.id==='0001');
for (const [prop,label] of [
  ['handEye','Hand Eye'],['passing','Passing'],['puckControl','Puck Control'],['durability','Durability'],['shotBlocking','Shot Blocking'],['agility','Agility']
]) {
  const expectedValue = Number(expected.ratings[label]);
  if (Math.abs(carlson[prop]-expectedValue)>1e-9) throw new Error(`Rating mismatch ${prop}: sim=${carlson[prop]} csv=${expectedValue}`);
}
console.log('Rating identity check: PASS (John Carlson full V6 ratings match bundled current CSV).');

const g1 = new Simulator(data, 123456789).simulateGame();
const g2 = new Simulator(data, 123456789).simulateGame();
const sig = (g) => JSON.stringify({score:g.finalSummary.score, injuries:g.finalSummary.injuries, events:g.events.map(e=>[e.type,e.text,e.clockText])});
if (sig(g1)!==sig(g2)) throw new Error('Seed repeatability failed.');
console.log('Seed repeatability check: PASS.');

const count = Math.max(1, Number(process.argv[2] || 10));
const aggregate={games:count,goals:0,shots:0,hits:0,attempts:0,injuries:0,manGames:0,ot:0,shootouts:0,blocks:0,fights:0,goaliePlays:0,injuryEvents:0,expectedInjuries:0};
const expectedByCause={};
const causeCounts={};
const severityCounts={};
for (let i=0;i<count;i++) {
  const simulator=new Simulator(data, 900000+i);
  const game=simulator.simulateGame();
  aggregate.expectedInjuries += simulator.__expectedInjuries || 0;
  for (const [cause,value] of Object.entries(simulator.__expectedByCause || {})) expectedByCause[cause]=(expectedByCause[cause]||0)+value;
  const s=game.finalSummary;
  aggregate.goals += s.score.cha+s.score.ric;
  aggregate.shots += s.shots.cha+s.shots.ric;
  aggregate.hits += s.hits.cha+s.hits.ric;
  aggregate.attempts += s.attempts.cha+s.attempts.ric;
  aggregate.injuries += s.injuries.length;
  aggregate.blocks += game.events.filter(e=>e.type==='shot-attempt' && e.outcome==='blocked').length;
  aggregate.fights += game.events.filter(e=>e.type==='fight').length;
  aggregate.goaliePlays += game.events.filter(e=>e.type==='goalie-play').length;
  aggregate.injuryEvents += game.events.filter(e=>e.type==='injury').length;
  aggregate.manGames += s.injuries.reduce((sum,inj)=>sum+inj.gamesMissed,0);
  if (game.events.some(e=>e.period===4)) aggregate.ot++;
  if (game.events.some(e=>e.period==='SO')) aggregate.shootouts++;
  for (const inj of s.injuries) {
    causeCounts[inj.cause]=(causeCounts[inj.cause]||0)+1;
    severityCounts[inj.severity]=(severityCounts[inj.severity]||0)+1;
  }
}
const avg = (x)=>(x/count).toFixed(2);
console.log(JSON.stringify({
  games:count,
  avgGoalsPerGame:avg(aggregate.goals),
  avgShotsPerGame:avg(aggregate.shots),
  avgAttemptsPerGame:avg(aggregate.attempts),
  avgHitsPerGame:avg(aggregate.hits),
  avgBlocksPerGame:avg(aggregate.blocks),
  avgFightsPerGame:avg(aggregate.fights),
  avgGoaliePlaysPerGame:avg(aggregate.goaliePlays),
  avgInjuriesPerGame:avg(aggregate.injuries),
  projectedInjuriesPerTeam82:Number((aggregate.injuries/count/2*82).toFixed(2)),
  expectedInjuriesPerGame:Number((aggregate.expectedInjuries/count).toFixed(3)),
  expectedInjuriesPerTeam82:Number((aggregate.expectedInjuries/count/2*82).toFixed(2)),
  expectedByCause:Object.fromEntries(Object.entries(expectedByCause).map(([k,v])=>[k,Number((v/count).toFixed(3))])),
  avgFutureGamesMissedPerInjury: aggregate.injuries ? Number((aggregate.manGames/aggregate.injuries).toFixed(2)) : 0,
  otRate:Number((aggregate.ot/count).toFixed(3)),
  shootoutRate:Number((aggregate.shootouts/count).toFixed(3)),
  injuryCauses:causeCounts,
  injurySeverities:severityCounts,
},null,2));
