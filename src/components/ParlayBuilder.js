"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import ParlayGameCard from "@/components/ParlayGameCard";
import {canAddParlayLeg,estimatedParlay,probabilityToAmerican} from "@/lib/parlayMath";
import {seasonFuturesPrice,winTotalOutcomeStatus} from "@/lib/seasonFuturesPrices";

const FUTURE_MARKETS=[
  ["cup","Win the AVHL Cup"],["playoffs","Make the playoffs"],
  ["division","Win the division"],["conference","Lead the conference"],
  ["presidents","Win the Presidents' Trophy"],["round1","Reach Round 1"],
  ["round2","Reach Round 2"],["conferenceFinal","Reach the conference final"],
  ["cupFinal","Reach the AVHL Final"],["relegation","Be relegated"],
  ["wins","Season win total"]
];
const WIN_LINES=[20.5,25.5,30.5,35.5,40.5,45.5,50.5,55.5,60.5];
const STORAGE_KEY="avhl-fun-parlay-slips-v1";
const shortDate=(value)=>new Date(value+"T12:00:00Z").toLocaleDateString("en-US",{
  weekday:"short",month:"short",day:"numeric",timeZone:"UTC"
});
const fmtPercent=p=>p===0?"0 observed":p===1?"100% observed":
  p<0.0001?"<0.01%":(p*100).toFixed(p<0.01?2:1)+"%";
const formatPoints=n=>Math.round(n).toLocaleString("en-US");
function Control({label,value,onChange,options,disabled=false}){
  return <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-bold text-[#64748B]">{label}</span>
    <select className="w-full min-w-0 rounded-xl border border-[#CED8E5] bg-white px-3 py-3 text-sm font-bold text-[#000B36]"
      value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} aria-label={label}>
      {options.map(([v,text])=><option key={String(v)} value={String(v)}>{text}</option>)}
    </select>
  </label>;
}
function FuturePicker({forecast,onAdd,selectedTeams=[],atCapacity=false}){
  const [selectedTeam,setSelectedTeam]=useState("");
  const [market,setMarket]=useState("cup");
  const [line,setLine]=useState("40.5");
  const [side,setSide]=useState("over");
  const teams=(forecast?.teams||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  const team=teams.find(t=>t.abbreviation===selectedTeam)||teams[0];
  if(!forecast||forecast.method!=="hybrid-V7-empirical-injury-goalie-v1"||
    !Array.isArray(forecast.teams)||forecast.teams.length!==40){
    return <div className="rounded-2xl border border-[#000B36]/10 bg-white p-6 text-sm text-[#64748B]">
      Awaiting the verified 10,000-scenario hybrid futures forecast. No substitute lines are displayed.
    </div>;
  }
  const alreadyPicked=selectedTeams.includes(team?.abbreviation);
  const win=market==="wins",status=win?winTotalOutcomeStatus(team,line,side):{
    possible:true,guaranteed:false
  };
  const hist=team.winsHistogram||[];
  const over=hist.slice(Math.floor(Number(line))+1).reduce((sum,n)=>sum+n,0)/
    (hist.reduce((sum,n)=>sum+n,0)||1);
  const p=win?(side==="under"?1-over:over):team.probabilities?.[market];
  const sample=seasonFuturesPrice(p,{...status,runs:forecast.runs});
  const marketTitle=FUTURE_MARKETS.find(x=>x[0]===market)?.[1]||market;
  const label=team.name+" · "+(win?(side==="over"?"Over ":"Under ")+line+" wins":marketTitle);
  const available=status.possible&&!status.guaranteed&&typeof p==="number"&&
    Number.isFinite(p)&&p>=0&&p<=1;
  return <section className="rounded-2xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold leading-5 text-[#64748B]">
      Hybrid AVHL futures · {forecast.runs.toLocaleString()} scenarios · Updated
      {" "+new Date(forecast.generatedAt).toLocaleString("en-US",{
        month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"
      })+" ET"}
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Control label="Team" value={team?.abbreviation||""} onChange={setSelectedTeam}
        options={teams.map(t=>[t.abbreviation,t.name])}/>
      <Control label="Season market" value={market} onChange={setMarket} options={FUTURE_MARKETS}/>
      {win?<>
        <Control label="Win total" value={line} onChange={setLine}
          options={WIN_LINES.map(x=>[String(x),x+" wins"])}/>
        <Control label="Pick a side" value={side} onChange={setSide}
          options={[["over","Over"],["under","Under"]]}/>
      </>:null}
    </div>
    {team?<div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DCE6F0] bg-[#F8FAFD] p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#000B36]">{label}</p>
        <p className="mt-1 text-xs text-[#64748B]">
          Current {team.record.wins}-{team.record.losses}-{team.record.otl}
          {" · Projected "+team.projectedWins.toFixed(1)+" wins"}
        </p>
        <p className="mt-1 text-xs text-[#64748B]">{sample.detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-2xl font-black tabular-nums text-[#000B36]">{sample.price}</p>
        <button type="button" disabled={atCapacity||alreadyPicked||!available}
          onClick={()=>onAdd({
            id:"future:"+team.abbreviation+":"+market+":"+line+":"+side,type:"future",
            label,context:"2026–27 AVHL hybrid season futures",
            probability:p,samples:forecast.runs,source:forecast.sourceDigest+":"+forecast.generatedAt,
            teamCodes:[team.abbreviation],market,division:team.division,conference:team.conference
          })}
          className="mt-2 rounded-xl bg-[#000B36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#143159] disabled:cursor-not-allowed disabled:opacity-45">
          {atCapacity?"8-leg limit":alreadyPicked?"Team already chosen":available?"Add selection +":"Not available"}
        </button>
      </div>
    </div>:null}
    <p className="mt-3 text-xs leading-5 text-[#687992]">
      Choose up to eight different teams (one pick per team). Futures are correlated;
      the combined price is illustrative, not a joint-simulation result.
    </p>
  </section>;
}
export default function ParlayBuilder({games,dates,directory,initialSnapshots={},scheduleReady}){
  const [view,setView]=useState("same");
  const [selectedGameId,setSelectedGameId]=useState(String(games[0]?.id||""));
  const [selectedDate,setSelectedDate]=useState(dates[0]||"");
  const [gameQuotes,setGameQuotes]=useState(initialSnapshots);
  const [season,setSeason]=useState(null);
  const [legs,setLegs]=useState([]);
  const [notice,setNotice]=useState("");
  const [virtualPoints,setVirtualPoints]=useState(100);
  const [saved,setSaved]=useState([]);
  const [copied,setCopied]=useState(false);
  const visibleGames=useMemo(()=>games.filter(g=>g.date===selectedDate),[games,selectedDate]);
  const selectedGame=visibleGames.find(g=>String(g.id)===selectedGameId)||visibleGames[0];
  const modeName=view==="same"?"Same-game":view==="day"?"One-day":"Futures";
  const slipGameIds=legs.filter(l=>l.type==="game").map(l=>l.gameId).sort((a,b)=>a-b).join(",");
  useEffect(()=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      const value=raw?JSON.parse(raw):[];
      if(Array.isArray(value))setSaved(value.slice(0,12).filter(x=>x&&Array.isArray(x.legs)));
    }catch{}
  },[]);
  useEffect(()=>{
    if(!scheduleReady)return;
    let cancelled=false;
    let pending=null;
    const shown=games.filter(g=>g.date===selectedDate);
    const selected=legs.filter(l=>l.type==="game")
      .map(l=>games.find(g=>g.id===l.gameId)).filter(Boolean);
    const chosen=[...new Map([...shown,...selected].map(g=>[g.id,g])).values()];
    async function refresh(){
      const values=await Promise.all(chosen.map(async g=>{
        const a=directory[g.away]?.abbreviation,h=directory[g.home]?.abbreviation;
        if(!a||!h)return [g.id,null];
        try{
          const result=await fetch("/api/odds/v7-current?home="+encodeURIComponent(h)+
            "&away="+encodeURIComponent(a),{cache:"no-store"});
          const q=await result.json();
          if(!result.ok||!q.ok||!q.ready||q.count<1000||
             q.summary?.source!=="v7-complete-games"||q.summary.count!==q.count||
             q.summary.home!==h||q.summary.away!==a)return [g.id,null];
          return [g.id,q];
        }catch{return [g.id,null];}
      }));
      if(cancelled)return;
      const latest=new Map(values);
      setGameQuotes(prev=>{
        const next={...prev};
        for(const [id,value] of values){
          if(value)next[String(id)]=value;
          else delete next[String(id)];
        }
        return next;
      });
      setLegs(prev=>prev.map(l=>{
        if(l.type!=="game"||!latest.has(l.gameId))return l;
        const q=latest.get(l.gameId);
        return {...l,stale:!q||l.source!==q.key};
      }));
    }
    refresh();
    pending=setInterval(refresh,60000);
    return ()=>{cancelled=true;if(pending)clearInterval(pending);};
  },[games,directory,selectedDate,slipGameIds,scheduleReady]);
  useEffect(()=>{
    let cancelled=false,timer=null;
    async function refresh(){
      try{
        const response=await fetch("/api/odds/season",{cache:"no-store"});
        const data=await response.json();
        if(cancelled)return;
        const valid=response.ok&&data?.ok&&data.method==="hybrid-V7-empirical-injury-goalie-v1"&&
          data.matchedPairs===780&&data.runs>=10000&&data.teams?.length===40;
        if(!valid){setSeason(null);
          setLegs(prev=>prev.map(l=>l.type==="future"?{...l,stale:true}:l));
          return;
        }
        setSeason(data);
        const current=data.sourceDigest+":"+data.generatedAt;
        setLegs(prev=>prev.map(l=>l.type==="future"?{...l,stale:l.source!==current}:l));
      }catch{
        if(!cancelled){setSeason(null);setLegs(prev=>prev.map(l=>
          l.type==="future"?{...l,stale:true}:l));}
      }
    }
    refresh();
    timer=setInterval(refresh,60000);
    return ()=>{cancelled=true;if(timer)clearInterval(timer);};
  },[]);
  const add=useCallback(candidate=>{
    const decision=canAddParlayLeg(legs,candidate,view);
    if(!decision.ok){setNotice(decision.reason);return;}
    setLegs(prev=>[...prev,{...candidate,stale:false}]);
    setNotice("Added to your slip: "+candidate.label);
    setCopied(false);
  },[legs,view]);
  const remove=id=>{setLegs(prev=>prev.filter(x=>x.id!==id));setCopied(false);};
  const stale=legs.some(l=>l.stale);
  const result=estimatedParlay(legs,virtualPoints);
  const ready=legs.length>=2&&!stale&&result;
  const ticketText=()=>{
    const items=legs.map((l,i)=>(i+1)+". "+l.label+" ("+l.context+") · "+
      probabilityToAmerican(l.probability,l.samples));
    return ["AVHL "+modeName.toUpperCase()+" FUN PARLAY · NOT REAL MONEY",...items,"",
      "Combined estimated odds: "+result.american+(result.capped?" (display capped)":""),
      "Virtual points: "+virtualPoints,
      "Potential imaginary return: "+formatPoints(result.potentialPoints)+" points",
      "Illustrative independence estimate only. Same-game and futures outcomes can be strongly correlated.",
      "No real money, accounts, wagers or prizes."].join("\n");
  };
  async function copySlip(){
    if(!ready)return;
    try{await navigator.clipboard.writeText(ticketText());setCopied(true);setNotice("Ticket copied! Share it anywhere.");}
    catch{setNotice("Clipboard access is blocked. Try copying from a supported browser.");}
  }
  function saveSlip(){
    if(!ready)return;
    const record={id:Date.now().toString(36),at:new Date().toISOString(),
      legs:legs.map(l=>({label:l.label,context:l.context,price:probabilityToAmerican(l.probability,l.samples)})),
      odds:result.american,mode:view,virtualPoints,potentialPoints:result.potentialPoints};
    const next=[record,...saved].slice(0,12);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setSaved(next);
      setNotice("Saved on this browser. This is a snapshot, not a tracked wager.");}
    catch{setNotice("This browser could not save your slip locally.");}
  }
  function removeSaved(id){
    const next=saved.filter(x=>x.id!==id);setSaved(next);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}
  }
  return <div className="space-y-5">
    <div className="rounded-2xl border border-[#000B36]/10 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-black text-[#000B36]">Choose your parlay format</p>
      <p className="mt-1 text-sm leading-6 text-[#64748B]">
        Choose up to eight picks. Games use <strong>verified 1,000+ V7 simulations</strong>;
        season picks use the <strong>10,000-scenario hybrid forecast</strong>.
        No real money or prize is involved. Combined odds are illustrative,
        calculated by multiplying marginal probabilities and assuming independent outcomes.
      </p>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(330px,410px)] xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="min-w-0 space-y-4">
        <div role="group" aria-label="Choose parlay market source"
          className="grid grid-cols-1 gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm sm:grid-cols-3">
          {[["same","Same-game parlay"],["day","One-day parlay"],["futures","Futures parlay"]].map(([key,label])=>
            <button type="button" key={key} onClick={()=>{if(view===key)return;setView(key);setLegs([]);setCopied(false);setNotice(legs.length?"Changing parlay types clears your previous ticket.":"");}}
              aria-pressed={view===key}
              className={"rounded-xl px-3 py-3 text-xs font-black transition sm:text-sm "+
                (view===key?"bg-[#000B36] text-white":"bg-[#F2F5F9] text-[#000B36] hover:bg-slate-200")}>
              {label}
            </button>
          )}
        </div>
        {notice?<p role="status" className="rounded-xl bg-[#EAF5FC] px-4 py-3 text-xs font-semibold text-[#16315E]">
          {notice}
        </p>:null}
        {view!=="futures"?<>
          {scheduleReady&&dates.length?<div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-[#000B36]">{view==="same"?"Same-game matchups":"One-day slate"}</h2>
              <p className="mt-1 text-xs text-[#64748B]">{view==="same"?"Combine different markets from one matchup.":"Pick one market from each different game on this date."}</p>
            </div>
            <Control label="Game date" value={selectedDate} disabled={legs.length>0}
               onChange={value=>{setSelectedDate(value);setSelectedGameId("");}}
              options={dates.map(x=>[x,shortDate(x)])}/>
          </div>:null}
          {!scheduleReady?<div className="rounded-2xl bg-white p-6 text-sm text-[#64748B]">
            Official game schedule temporarily unavailable. Season futures can still be selected.
          </div>:null}
          {scheduleReady&&!visibleGames.length?<div className="rounded-2xl bg-white p-6 text-sm text-[#64748B]">
            No upcoming games for this date. Other game dates and season markets may be available.
          </div>:null}
          {visibleGames.length?<div className="grid gap-2 rounded-2xl border border-[#DDE6EF] bg-white p-3 sm:grid-cols-2">
            {visibleGames.map(g=>{
              const active=selectedGame?.id===g.id;
              const picked=legs.some(l=>l.gameId===g.id);
              const disabled=view==="same"&&legs.length>0&&legs[0].gameId!==g.id;
              return <button key={g.id} type="button" disabled={disabled} aria-pressed={active}
                onClick={()=>setSelectedGameId(String(g.id))}
                className={"flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition "+
                  (active?"border-[#007FAF] bg-[#EAF7FC] ring-1 ring-[#18BDFC]":"border-[#DCE4EE] bg-[#F8FAFD] hover:border-[#93B4C7]")+
                  " disabled:cursor-not-allowed disabled:opacity-40"}>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[#000B36]">
                    {directory[g.away]?.abbreviation||"?"} @ {directory[g.home]?.abbreviation||"?"}
                  </span>
                  <span className="block text-[11px] text-[#64748B]">
                    Game {g.id} · {gameQuotes[String(g.id)]?.ready?"V7 ready":"Odds pending"}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-black text-[#007DA0]">
                  {picked?"✓ Picked":active?"Selected":"View"}
                </span>
              </button>;
            })}
          </div>:null}
          {legs.length?<p className="text-xs text-[#64748B]">Date is locked for this ticket. Clear your picks to select another date.</p>:null}
          {selectedGame?<ParlayGameCard key={selectedGame.id} game={selectedGame}
            home={directory[selectedGame.home]} away={directory[selectedGame.away]}
            quote={gameQuotes[String(selectedGame.id)]} onAdd={add}
            locked={view==="day"&&legs.some(l=>l.gameId===selectedGame.id)}/>:null}
          <p className="text-xs leading-5 text-[#64748B]">
            {view==="same"?"Same-game outcomes may be strongly correlated. The combined odds below assume independence; they are not measured joint V7 probabilities.":
            "One-day outcomes are from separate games; combined odds still assume independence."}
          </p>
        </>:<>
          <div><h2 className="text-xl font-black text-[#000B36]">Hybrid season futures</h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Win totals, playoffs, Cup, relegation and advancement markets for all 40 teams.
            </p>
          </div>
          <FuturePicker forecast={season} onAdd={add} selectedTeams={legs.map(l=>l.teamCodes?.[0])} atCapacity={legs.length>=8}/>
        </>}
      </div>
      <aside className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-[1.65rem] border border-[#000B36]/12 bg-white shadow-lg">
          <div className="bg-[#000B36] px-5 py-5 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Imaginary ticket · For fun only
            </p>
            <div className="mt-1 flex items-end justify-between">
              <h2 className="text-xl font-black sm:text-2xl">{modeName} slip</h2>
              <span className="text-sm font-bold text-white/70">{legs.length} / 8 legs</span>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            {!legs.length?<div className="rounded-xl border border-dashed border-[#B8C6D8] bg-[#F7F9FC] px-4 py-10 text-center">
              <p className="text-sm font-black text-[#000B36]">Your ticket is empty</p>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Add a game result, player prop or futures outcome to start.
              </p>
            </div>:<div className="space-y-2">
              {legs.map((l,i)=><div key={l.id} className="rounded-xl border border-[#DDE4EF] bg-[#F9FBFE] p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EAF0F8] text-xs font-black text-[#000B36]">
                    {i+1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-black leading-5 text-[#000B36]">{l.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#667A93]">{l.context}</p>
                    {l.stale?<p className="mt-1 text-[11px] font-bold text-[#A90117]">
                      This price changed or is unavailable. Remove and reselect.
                    </p>:null}
                  </div>
                  <button type="button" onClick={()=>remove(l.id)} aria-label={"Remove "+l.label}
                    className="shrink-0 rounded-lg border border-[#CFD9E7] px-2 py-1 text-xs font-black text-[#7D1A2C] hover:bg-red-50">
                    ×
                  </button>
                </div>
                <div className="mt-2 text-right text-sm font-black tabular-nums text-[#000B36]">
                  {probabilityToAmerican(l.probability,l.samples)}
                </div>
              </div>)}
            </div>}
            <div className="border-t border-[#E2E8F0] pt-4">
              <Control label="Imaginary stake (virtual points)"
                value={String(virtualPoints)} onChange={v=>setVirtualPoints(Number(v))}
                options={[10,25,50,100,250,1000].map(v=>[String(v),v+" points"])}/>
              <div className="mt-4 rounded-xl bg-[#EFF5FB] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#526A87]">Illustrative combined odds</p>
                <p className="mt-2 break-words text-2xl font-black tracking-tight tabular-nums sm:text-3xl text-[#000B36]">
                  {result?.american||"—"}
                </p>
                {result?.capped?<p className="mt-1 text-xs font-bold text-[#7C547B]">
                  Display capped at +1,000,000
                </p>:null}
                <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-[#CCD9E8] pt-3">
                  <span className="text-xs font-semibold text-[#536781]">Potential imaginary return</span>
                  <strong className="text-xl tabular-nums text-[#000B36]">
                    {result?formatPoints(result.potentialPoints):"—"}
                  </strong>
                </div>
                <p className="mt-1 text-right text-[11px] text-[#627791]">virtual points · no cash value</p>
              </div>
              {stale?<p className="mt-3 text-xs font-bold text-[#A90117]">
                Revalidate stale selections before sharing or saving.
              </p>:null}
              {legs.length===1?<p className="mt-3 text-xs text-[#64748B]">
                Add one more selection to make a parlay.
              </p>:null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={!ready} onClick={copySlip}
                  className="rounded-xl bg-[#000B36] px-3 py-3 text-xs font-black text-white hover:bg-[#15315B] disabled:cursor-not-allowed disabled:opacity-40">
                  {copied?"Copied!":"Copy & share"}
                </button>
                <button type="button" disabled={!ready} onClick={saveSlip}
                  className="rounded-xl border border-[#000B36]/20 bg-white px-3 py-3 text-xs font-black text-[#000B36] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Save on device
                </button>
              </div>
              <button type="button" disabled={!legs.length}
                className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-bold text-[#75849A] hover:bg-slate-100 disabled:opacity-40"
                onClick={()=>{setLegs([]);setNotice("Ticket cleared.");setCopied(false);}}>
                Clear ticket
              </button>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-[#000B36]/10 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-[#000B36]">How the estimates work</h3>
          <p className="mt-2 text-xs leading-5 text-[#64748B]">
            Combined odds multiply the selected single-market probabilities, with a small
            adjustment for zero/100% simulation counts. This <strong>assumes independence</strong>;
            even different games and futures can be correlated. Actual joint-event odds may
            differ substantially. Each ticket follows its selected parlay mode. All combined odds are approximate.
          </p>
          <p className="mt-2 text-xs leading-5 text-[#64748B]">
            This is a fan-made prediction game, not a real sportsbook.
            There is no wagering, account balance, leaderboard, redemption or money.
            Saved tickets are snapshots stored only on this browser; they are not auto-graded.
          </p>
        </section>
        {saved.length?<section className="rounded-2xl border border-[#000B36]/10 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-[#000B36]">Saved fun tickets</h3>
          <p className="mt-1 text-xs text-[#64748B]">Stored locally on this device; no account needed.</p>
          <div className="mt-3 space-y-2">
            {saved.map(ticket=><details key={ticket.id}
              className="rounded-xl border border-[#DCE5EF] bg-[#FAFBFE] p-3">
              <summary className="cursor-pointer text-xs font-bold text-[#000B36]">
                {ticket.mode==="same"?"Same-game":ticket.mode==="futures"?"Futures":"One-day"} · {ticket.legs.length} legs · {ticket.odds} · {new Date(ticket.at).toLocaleDateString("en-US")}
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-[#65748B]">
                {ticket.legs.map((leg,i)=><li key={i}>{leg.label} · {leg.price}</li>)}
              </ol>
              <button type="button" onClick={()=>removeSaved(ticket.id)}
                className="mt-3 text-xs font-bold text-[#A90117] underline">
                Delete saved ticket
              </button>
            </details>)}
          </div>
        </section>:null}
      </aside>
    </div>
  </div>;
}
