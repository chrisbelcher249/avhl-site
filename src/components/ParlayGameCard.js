"use client";
import Image from "next/image";
import {useMemo,useState} from "react";
import {probabilityToAmerican} from "@/lib/parlayMath";

const SKATER_PROPS=[
  ["goals","Goal · 1+"],["goals2","Goals · 2+"],["assists","Assist · 1+"],
  ["assists2","Assists · 2+"],["points","Point · 1+"],["points2","Points · 2+"],
  ["points3","Points · 3+"],["shots2","Shots · 2+"],["shots3","Shots · 3+"],
  ["shots4","Shots · 4+"],["shots5","Shots · 5+"],["hits2","Hits · 2+"],
  ["hits3","Hits · 3+"],["takeaways1","Takeaway · 1+"],
  ["ppGoal1","Power-play goal"],["faceoffWins5","Faceoff wins · 5+"],
  ["faceoffWins10","Faceoff wins · 10+"]
];
const GOALIE_PROPS=[
  ["saves15","Saves · 15+"],["saves20","Saves · 20+"],["saves25","Saves · 25+"],
  ["saves30","Saves · 30+"],["saves35","Saves · 35+"],
  ["allowedUnder15","Goals allowed · under 1.5"],
  ["allowedUnder25","Goals allowed · under 2.5"],
  ["allowedOver25","Goals allowed · over 2.5"],["shutouts","Shutout"]
];
const MARKETS=[
  ["moneyline","Moneyline"],["totals","Total goals"],["puck","Puck lines"],
  ["team","Team goals"],["skater","Skater props"],["goalie","Goalie props"],
  ["other","Other markets"]
];
const LIMITS={totals:[3.5,4.5,5.5,6.5,7.5,8.5,9.5],
  puck:[1.5,2.5],team:[1.5,2.5,3.5,4.5]};
const percent=(p,n)=>p===0?"0 / "+n+" sampled":p===1?n+" / "+n+" sampled":
  (100*p).toFixed(p<0.01?2:1)+"% chance";
function Picker({label,value,onChange,options}){
  return <label className="min-w-0 flex-1">
    <span className="mb-1 block text-[11px] font-bold text-[#64748B]">{label}</span>
    <select value={value} onChange={e=>onChange(e.target.value)}
      aria-label={label} className="w-full min-w-0 rounded-xl border border-[#CED7E4] bg-white px-3 py-2.5 text-xs font-bold text-[#000B36]">
      {options.map(([key,label])=><option key={String(key)} value={String(key)}>{label}</option>)}
    </select>
  </label>;
}
function Club({team}){
  return <span className="flex min-w-0 items-center gap-2">
    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {team?.logo?<Image src={team.logo} alt="" fill sizes="36px" className="object-contain p-1"/>:null}
    </span>
    <span className="truncate text-sm font-black text-[#000B36]">{team?.abbreviation||"?"}</span>
  </span>;
}

export default function ParlayGameCard({game,home,away,quote,onAdd,locked=false}){
  const [market,setMarket]=useState("moneyline");
  const [line,setLine]=useState("6.5");
  const [puck,setPuck]=useState("1.5");
  const [teamLine,setTeamLine]=useState("2.5");
  const [teamCode,setTeamCode]=useState("");
  const [skater,setSkater]=useState("");
  const [skaterProp,setSkaterProp]=useState("points");
  const [goalie,setGoalie]=useState("");
  const [goalieProp,setGoalieProp]=useState("saves25");
  const h=home?.abbreviation,a=away?.abbreviation;
  const valid=quote?.ok===true&&quote?.ready===true&&quote.count>=1000&&
    quote.summary?.source==="v7-complete-games"&&
    quote.summary.count===quote.count&&quote.summary.home===h&&quote.summary.away===a;
  const odds=valid?quote.summary:null;
  const players=odds?.players||[];
  const startingGoalies=(odds?.goalies||[]).filter(g=>g.starts>0);
  const activeSkater=players.find(x=>String(x.id)===skater)||players[0];
  const activeGoalie=startingGoalies.find(x=>String(x.id)===goalie)||startingGoalies[0];
  const activeTeam=[a,h].includes(teamCode)?teamCode:a;
  const addOption=(key,label,p)=>({key,label,p});
  const options=useMemo(()=>{
    if(!odds)return [];
    if(market==="moneyline")return [
      addOption("ml:"+a,a+" to win",odds.awayWin),
      addOption("ml:"+h,h+" to win",odds.homeWin)
    ];
    if(market==="totals"){
      const row=odds.totals?.find(x=>x.line===Number(line));
      return row?[
        addOption("total:o:"+line,"Over "+line+" combined goals",row.over),
        addOption("total:u:"+line,"Under "+line+" combined goals",row.under)
      ]:[];
    }
    if(market==="puck"){
      const row=odds.puckLines?.find(x=>x.line===Number(puck));
      return row?[
        addOption("puck:a-:"+puck,a+" −"+puck,row.awayCover),
        addOption("puck:h-:"+puck,h+" −"+puck,row.homeCover),
        addOption("puck:a+:"+puck,a+" +"+puck,row.awayPlus),
        addOption("puck:h+:"+puck,h+" +"+puck,row.homePlus)
      ]:[];
    }
    if(market==="team"){
      const row=odds.teamTotals?.[activeTeam]?.find(x=>x.line===Number(teamLine));
      return row?[
        addOption("tt:"+activeTeam+":o:"+teamLine,activeTeam+" over "+teamLine+" goals",row.over),
        addOption("tt:"+activeTeam+":u:"+teamLine,activeTeam+" under "+teamLine+" goals",row.under)
      ]:[];
    }
    if(market==="skater"&&activeSkater){
      const label=SKATER_PROPS.find(([key])=>key===skaterProp)?.[1]||skaterProp;
      return [addOption("skater:"+activeSkater.id+":"+skaterProp,
        activeSkater.name+" · "+label,activeSkater.probability?.[skaterProp])];
    }
    if(market==="goalie"&&activeGoalie){
      const label=GOALIE_PROPS.find(([key])=>key===goalieProp)?.[1]||goalieProp;
      return [addOption("goalie:"+activeGoalie.id+":"+goalieProp,
        activeGoalie.name+" · "+label,activeGoalie.probability?.[goalieProp])];
    }
    if(market==="other")return [
      addOption("other:ot","Game reaches overtime",odds.ot),
      addOption("other:shootout","Game reaches a shootout",odds.shootout),
      addOption("other:both","Both teams score",odds.bothScore),
      addOption("other:shutout","Either team shutout",odds.shutout),
      addOption("other:first:"+a,a+" scores first",odds.firstGoal?.[a]),
      addOption("other:first:"+h,h+" scores first",odds.firstGoal?.[h])
    ];
    return [];
  },[odds,market,line,puck,teamLine,activeTeam,activeSkater,skaterProp,activeGoalie,goalieProp,a,h]);
  const date=new Date(game.date+"T12:00:00Z").toLocaleDateString("en-US",{
    weekday:"short",month:"short",day:"numeric",timeZone:"UTC"
  });
  return <section className="min-w-0 rounded-2xl border border-[#000B36]/10 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <Club team={away}/><span className="text-xs font-bold text-slate-400">@</span><Club team={home}/>
      </div>
      <div className="text-right text-xs font-semibold text-[#72829A]">
        Game {game.id} · {date}
        <div className="mt-0.5 text-[11px]">{valid?quote.count.toLocaleString()+" verified V7 games":"Awaiting verified V7 odds"}</div>
      </div>
    </div>
    {!valid?<p className="py-5 text-sm leading-6 text-[#64748B]">
      No published prices for this current lineup yet. Select another matchup or return after the official V7 cache is complete.
    </p>:<>
      <div className="mt-3 flex flex-wrap gap-2">
        <Picker label="Market" value={market} onChange={setMarket} options={MARKETS}/>
        {market==="totals"?<Picker label="Goal line" value={line} onChange={setLine}
          options={LIMITS.totals.map(v=>[String(v),String(v)])}/>:null}
        {market==="puck"?<Picker label="Spread" value={puck} onChange={setPuck}
          options={LIMITS.puck.map(v=>[String(v),String(v)])}/>:null}
        {market==="team"?<>
          <Picker label="Team" value={activeTeam} onChange={setTeamCode}
            options={[[a,away.name],[h,home.name]]}/>
          <Picker label="Line" value={teamLine} onChange={setTeamLine}
            options={LIMITS.team.map(v=>[String(v),String(v)])}/>
        </>:null}
        {market==="skater"?<>
          <Picker label="Player" value={String(activeSkater?.id||"")} onChange={setSkater}
            options={players.map(p=>[String(p.id),p.name+" ("+p.team+")"])}/>
          <Picker label="Stat" value={skaterProp} onChange={setSkaterProp} options={SKATER_PROPS}/>
        </>:null}
        {market==="goalie"?<>
          <Picker label="Starting goalie" value={String(activeGoalie?.id||"")} onChange={setGoalie}
            options={startingGoalies.map(g=>[String(g.id),g.name+" ("+g.team+")"])}/>
          <Picker label="Stat" value={goalieProp} onChange={setGoalieProp} options={GOALIE_PROPS}/>
        </>:null}
      </div>
      {locked?<p className="mt-3 text-xs font-semibold text-[#A90117]">
        One selection from this game is already on your slip. Remove it to choose another.
      </p>:null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.filter(x=>typeof x.p==="number"&&Number.isFinite(x.p)).map(x=>
          <button type="button" key={x.key} disabled={locked}
            aria-label={"Add "+x.label+" to parlay"}
            onClick={()=>onAdd({
              id:"game:"+game.id+":"+x.key,type:"game",gameId:game.id,
              label:x.label,context:a+" @ "+h+" · "+date,
              probability:x.p,samples:quote.count,source:quote.key,
              teamCodes:[a,h]
            })}
            className="flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-xl border border-[#D7DFEB] bg-[#F8FAFD] p-3 text-left transition hover:border-[#18BDFC] hover:bg-[#EFFBFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-45">
            <span className="min-w-0 text-xs font-bold leading-5 text-[#000B36]">
              {x.label}
              <span className="mt-0.5 block text-[11px] font-medium text-[#72829A]">
                {percent(x.p,quote.count)}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-base font-black tabular-nums text-[#000B36]">
                {probabilityToAmerican(x.p,quote.count)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#007DA0]">Add +</span>
            </span>
          </button>
        )}
      </div>
    </>}
  </section>;
}
