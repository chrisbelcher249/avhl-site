// Shared serialization for actual V7 game output. Both the browser odds
// worker and server-side precomputation use this exact extractor.
(function (scope) {
function gameSample(game,away,home){
  const s=game.finalSummary,h=game.homeId,a=game.awayId;
  const finish=game.events.some(e=>e.type==="shootout-start")?"SO":
    game.events.some(e=>e.period===4)?"OT":"REG";
  const firstEvent=game.events.find(e=>e.type==="goal" && (e.teamId===a||e.teamId===h));
  const players=[];
  const goalies=[];
  for(const [id,abbr] of [[a,away],[h,home]]){
    for(const p of s.skaters[id]||[])players.push({
      id:String(p.avhlId||p.id),name:p.name,t:abbr,
      g:Number(p.goals)||0,a:Number(p.assists)||0,
      p:Number(p.points)||0,s:Number(p.shots)||0,h:Number(p.hits)||0
    });
    for(const p of s.goalieRows[id]||[])goalies.push({
      id:String(p.avhlId||p.id),name:p.name,t:abbr,started:Boolean(p.starter),
      sv:Number(p.saves)||0,sa:Number(p.shotsAgainst)||0,ga:Number(p.goalsAgainst)||0,toi:Number(p.toi)||0
    });
  }
  return {
    a:Number(s.score[a]),h:Number(s.score[h]),
    as:Number(s.shots[a]),hs:Number(s.shots[h]),f:finish,
    first:firstEvent?.teamId===h?home:firstEvent?.teamId===a?away:null,
    players,goalies
  };
}

scope.AVHL_ODDS_EXTRACT_SAMPLE=gameSample;
})(typeof self!=="undefined"?self:globalThis);
