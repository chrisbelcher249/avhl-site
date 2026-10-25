import { gunzipSync } from "node:zlib";
const ids = [204,258,279];
for(const n of ids){
  try{
    const r=await fetch(`https://www.avhl.org/api/replay/${n}`,{signal:AbortSignal.timeout(20000)});
    if(!r.ok){console.log("GOALIE_DECISION_UNAVAILABLE",n,r.status);continue;}
    const payload=await r.json(),archive=typeof payload.archive==="string"?JSON.parse(payload.archive):payload.archive;
    const b=Buffer.from(archive.data,"base64"),snap=JSON.parse((archive.encoding==="gzip-base64"?gunzipSync(b):b).toString("utf8"));
    if(Number(snap.gameId)!==n)throw Error("Unexpected game ID");
    const s=snap.finalSummary,teams=[snap.awayId,snap.homeId],winning=s.score[teams[0]]>s.score[teams[1]]?teams[0]:teams[1],losing=teams.find(id=>id!==winning);
    const isSO=snap.events.some(e=>e.type==="shootout-start");
    const gameGoals=snap.events.filter(e=>e.type==="goal"),wgoals=gameGoals.filter(e=>e.teamId===winning);
    const decidingGoal=isSO?null:wgoals[Number(s.score[losing])];
    if(!isSO&&!decidingGoal)throw Error("GWG missing");
    const starters=Object.fromEntries(teams.map(id=>[id,s.goalieRows[id].find(g=>g.starter).id]));
    let active={...starters},credit=null;
    for(const e of snap.events){
      if(e.type==="goalie-change")active[e.teamId]=e.playerId;
      if(e===decidingGoal)credit={...active};
    }
    if(isSO)credit={...active};
    if(!credit)throw Error("No credited goalie");
    for(const id of teams){
      const g=s.goalieRows[id].find(g=>g.id===credit[id]);
      if(!g)throw Error("Credited goalie missing");
      const abbr=snap.matchupData[id===snap.awayId?"away":"home"].abbreviation;
      console.log(`GOALIE_DECISION,${n},${abbr},${g.avhlId},${id===winning?"W":isSO?"OTL":(decidingGoal?.period===4?"OTL":"L")}`);
    }
  }catch(e){console.log("GOALIE_DECISION_ERROR",n,String(e.message||e).replace(/[,\n]/g," "));}
}
