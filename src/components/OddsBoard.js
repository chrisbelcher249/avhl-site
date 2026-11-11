"use client";

import Image from "next/image";
import {useEffect,useMemo,useRef,useState} from "react";
import {INITIAL_V7_SAMPLES,canPublishV7Odds,fairMoneyline,summarizeV7Samples} from "@/lib/v7OddsSamples";

const COLORS={navy:"#000B36",red:"#A90117"};
const formatDate=date=>{
  const [y,m,d]=String(date).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US",{timeZone:"UTC",weekday:"short",month:"short",day:"numeric"})
    .format(new Date(Date.UTC(y,m-1,d)));
};
const pct=p=>Number.isFinite(p)?`${(p*100).toFixed(1)}%`:"—";
function TeamLogo({team,size=42}){
  return <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#000B36]/8 bg-white"
    style={{height:size,width:size}}>
    {team?.logo?<Image src={team.logo} alt={`${team.name} logo`} fill sizes={`${size}px`} className="object-contain p-1.5"/>:
    <span className="text-xs font-black">{team?.abbreviation||"?"}</span>}
  </span>;
}
function Choice({label,value,onChange,options}){
  return <label className="flex items-center gap-2 text-xs font-bold text-[#000B36]/60">
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={String(value)} onChange={e=>onChange(e.target.value)}
      className="min-w-[100px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-black text-[#000B36] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#18BDFC]">
      {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
function OddsText({probability,large=false}){
  return <div className="shrink-0 text-right tabular-nums">
    <div className={`font-black tracking-tight text-[#000B36] ${large?"text-3xl sm:text-4xl":"text-2xl"}`}>{fairMoneyline(probability)}</div>
    <div className="mt-0.5 text-xs font-bold text-[#000B36]/45">{pct(probability)} chance</div>
  </div>;
}
function OddsRow({label,sub,probability,team}){
  return <div className="flex min-h-[92px] items-center justify-between gap-3 rounded-2xl border border-[#000B36]/8 bg-[#F7F9FC] px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      {team?<TeamLogo team={team} size={36}/>:null}
      <div className="min-w-0">
        <div className="font-black leading-5 text-[#000B36]">{label}</div>
        {sub?<div className="mt-1 text-xs text-[#000B36]/48">{sub}</div>:null}
      </div>
    </div>
    <OddsText probability={probability}/>
  </div>;
}
function Panel({title,description,tools,children,wide=false}){
  return <section className={`min-w-0 rounded-[1.6rem] border border-[#000B36]/10 bg-white p-4 shadow-sm sm:p-5 ${wide?"lg:col-span-2":""}`}>
    <div className="mb-4 flex min-h-[64px] flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-black tracking-tight text-[#000B36]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#000B36]/50">{description}</p></div>
      {tools}
    </div>
    {children}
  </section>;
}
const SKATER_MARKETS=[
  {label:"Goals · 1+",key:"goals",detail:"Anytime goal scorer"},
  {label:"Goals · 2+",key:"goals2",detail:"2+ goals"},
  {label:"Assists · 1+",key:"assists",detail:"1+ assists"},
  {label:"Assists · 2+",key:"assists2",detail:"2+ assists"},
  {label:"Points · 1+",key:"points",detail:"1+ total points"},
  {label:"Points · 2+",key:"points2",detail:"2+ total points"},
  {label:"Points · 3+",key:"points3",detail:"3+ total points"},
  {label:"Shots on goal · 2+",key:"shots2",detail:"2+ shots on goal"},
  {label:"Shots on goal · 3+",key:"shots3",detail:"3+ shots on goal"},
  {label:"Shots on goal · 4+",key:"shots4",detail:"4+ shots on goal"},
  {label:"Shots on goal · 5+",key:"shots5",detail:"5+ shots on goal"},
  {label:"Hits · 2+",key:"hits2",detail:"2+ credited hits"},
  {label:"Hits · 3+",key:"hits3",detail:"3+ credited hits"},
  {label:"Takeaways · 1+",key:"takeaways1",detail:"1+ takeaways"},
  {label:"Power-play goals · 1+",key:"ppGoal1",detail:"Any PP goal"},
  {label:"Faceoff wins · 5+",key:"faceoffWins5",detail:"5+ faceoffs won"},
  {label:"Faceoff wins · 10+",key:"faceoffWins10",detail:"10+ faceoffs won"},
];
const GOALIE_MARKETS=[
  {label:"Saves · 15+",key:"saves15",detail:"15+ saves"},
  {label:"Saves · 20+",key:"saves20",detail:"20+ saves"},
  {label:"Saves · 25+",key:"saves25",detail:"25+ saves"},
  {label:"Saves · 30+",key:"saves30",detail:"30+ saves"},
  {label:"Saves · 35+",key:"saves35",detail:"35+ saves"},
  {label:"Goals allowed · under 1.5",key:"allowedUnder15",detail:"0–1 goals allowed"},
  {label:"Goals allowed · under 2.5",key:"allowedUnder25",detail:"0–2 goals allowed"},
  {label:"Goals allowed · over 2.5",key:"allowedOver25",detail:"3+ goals allowed"},
  {label:"Shutout",key:"shutouts",detail:"Solo shutout"},
];
const selectOptions=(values)=>values.map(v=>({value:String(v),label:String(v)}));

export default function OddsBoard({games,dates,teamDirectory,initialDate,previewOnly=false}){
  const [selectedDate,setSelectedDate]=useState(initialDate||dates[0]||"");
  const [selectedGameId,setSelectedGameId]=useState(null);
  const [tab,setTab]=useState("game");
  const [totalLine,setTotalLine]=useState("6.5");
  const [puckLine,setPuckLine]=useState("1.5");
  const [teamLine,setTeamLine]=useState("2.5");
  const [skaterMarket,setSkaterMarket]=useState("points");
  const [skaterTeam,setSkaterTeam]=useState("all");
  const [goalieMarket,setGoalieMarket]=useState("saves25");
  const [firstGoalTeam,setFirstGoalTeam]=useState("home");
  const [job,setJob]=useState({status:"loading",samples:[],summary:null,completed:0,target:INITIAL_V7_SAMPLES,error:""});
  const [demo,setDemo]=useState({status:"idle",completed:0,samples:[],error:""});
  const jobWorker=useRef(null),demoWorker=useRef(null);
  const slate=useMemo(()=>games.filter(g=>g.date===selectedDate),[games,selectedDate]);
  const selected=slate.find(g=>g.id===selectedGameId)||slate[0]||null;
  const away=selected?teamDirectory[selected.away]:null;
  const home=selected?teamDirectory[selected.home]:null;

  useEffect(()=>{
    if(!selected||!away||!home)return;
    if(jobWorker.current)jobWorker.current.terminate();
    if(demoWorker.current)demoWorker.current.terminate();
    setDemo({status:"idle",completed:0,samples:[],error:""});
    setJob({status:"loading",samples:[],summary:null,completed:0,target:INITIAL_V7_SAMPLES,error:""});
    const worker=new Worker("/odds/v7-worker.js?rev=server-canonical-v7-20261110");
    jobWorker.current=worker;
    worker.onmessage=event=>{
      const data=event.data||{};
      if(String(data.gameId)!==String(selected.id))return;
      if(data.type==="error")setJob(cur=>({...cur,status:"error",error:data.error||"Unable to load exact V7 odds."}));
      if(["progress","done","pending"].includes(data.type)){
        setJob(cur=>({
          status:data.type==="done"?"ready":data.type==="pending"?"pending":"loading",
          samples:Array.isArray(data.samples)?data.samples:
            Array.isArray(data.newSamples)?cur.samples.concat(data.newSamples):cur.samples,
          summary:data.summary||cur.summary,
          completed:data.completed||0,target:data.target||cur.target,error:""
        }));
      }
    };
    worker.onerror=()=>setJob(cur=>({...cur,status:"error",error:"Unable to start V7 odds reader."}));
    worker.postMessage({type:"start",mode:"readOnly",gameId:selected.id,away:away.abbreviation,home:home.abbreviation,target:INITIAL_V7_SAMPLES});
    return ()=>{worker.terminate();if(jobWorker.current===worker)jobWorker.current=null;
      if(demoWorker.current){demoWorker.current.terminate();demoWorker.current=null;}};
  },[selected?.id,away?.abbreviation,home?.abbreviation]);

  function startPreview(){
    if(!previewOnly||!selected||!away||!home||demo.status==="running")return;
    if(demoWorker.current)demoWorker.current.terminate();
    const worker=new Worker("/odds/v7-worker.js?rev=server-canonical-v7-20261110");
    demoWorker.current=worker;
    setDemo({status:"running",completed:0,samples:[],error:""});
    worker.onmessage=e=>{
      const d=e.data||{};
      if(String(d.gameId)!==String(selected.id))return;
      if(d.type==="demoError"){
        setDemo({status:"error",completed:0,samples:[],error:d.error||"V7 preview failed."});
        worker.terminate();
      }
      if(["demoProgress","demoDone"].includes(d.type)){
        setDemo(cur=>({...cur,status:d.type==="demoDone"?"done":"running",
          completed:d.completed||0,samples:d.samples||cur.samples,error:""}));
        if(d.type==="demoDone")worker.terminate();
      }
    };
    worker.onerror=()=>setDemo({status:"error",completed:0,samples:[],error:"Preview worker failed."});
    worker.postMessage({type:"previewDemo",gameId:selected.id,away:away.abbreviation,home:home.abbreviation});
  }
  const liveOdds=useMemo(()=>{
    if(!away||!home||!canPublishV7Odds(job.completed))return null;
    return job.summary||summarizeV7Samples(job.samples,away.abbreviation,home.abbreviation);
  },[job.samples,job.summary,job.completed,away?.abbreviation,home?.abbreviation]);
  const previewOdds=useMemo(()=>{
    if(!previewOnly||demo.status!=="done"||demo.samples.length!==12||!away||!home)return null;
    return summarizeV7Samples(demo.samples,away.abbreviation,home.abbreviation);
  },[demo.status,demo.samples,previewOnly,away?.abbreviation,home?.abbreviation]);
  const odds=liveOdds||previewOdds;
  const isDesign=Boolean(previewOdds&&!liveOdds);
  const matchupTeams={ [away?.abbreviation]:away, [home?.abbreviation]:home };
  const marketTotal=odds?.totals.find(x=>x.line===Number(totalLine));
  const marketPuck=odds?.puckLines.find(x=>x.line===Number(puckLine));
  const filterSkaters=(odds?.players||[]).filter(p=>skaterTeam==="all"||p.team===skaterTeam)
    .sort((a,b)=>(b.probability?.[skaterMarket]||0)-(a.probability?.[skaterMarket]||0));
  const starters=(odds?.goalies||[]).filter(g=>g.starts>0);
  const selectedSkaterMarket=SKATER_MARKETS.find(x=>x.key===skaterMarket);
  const selectedGoalieMarket=GOALIE_MARKETS.find(x=>x.key===goalieMarket);

  return <div className="space-y-5">
    <div className="rounded-[1.6rem] border border-[#000B36]/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.19em] text-[#A90117]">V7 simulation-based markets</p>
          <h2 className="mt-1 text-xl font-black text-[#000B36]">Game odds & player props</h2>
          <p className="mt-1 text-xs text-[#000B36]/55">Fair model prices · Live lineups · {previewOnly?"12-game design preview available":"Minimum 1,000 complete V7 simulations"}</p>
        </div>
        <Choice label="Game date" value={selectedDate} onChange={v=>{setSelectedDate(v);setSelectedGameId(null);}}
          options={dates.map(d=>({label:formatDate(d),value:d}))}/>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {slate.map(g=>{
          const a=teamDirectory[g.away],h=teamDirectory[g.home],active=g.id===selected?.id;
          return <button key={g.id} type="button" onClick={()=>{setSelectedGameId(g.id);setSkaterTeam("all");}}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition hover:border-[#18BDFC] ${active?"border-[#18BDFC] bg-[#EFFBFF]":"border-[#000B36]/10 bg-slate-50"}`}>
            <TeamLogo team={a} size={29}/><span className="text-xs font-black text-[#000B36]">{a?.abbreviation} @ {h?.abbreviation}</span><TeamLogo team={h} size={29}/>
          </button>;
        })}
      </div>
    </div>
    {selected&&away&&home?<div className="space-y-5">
      <div className="overflow-hidden rounded-[1.8rem] bg-[#000B36] p-5 text-white shadow-sm sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs">
          <span className="font-black uppercase tracking-[0.16em] text-cyan-200">Matchup moneyline</span>
          <span className="text-white/55">{formatDate(selected.date)} · Game {selected.id}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[[away,odds?.awayWin,odds?.awayCI],[home,odds?.homeWin,odds?.homeCI]].map(([team,p,ci])=>
            <div key={team.abbreviation} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.09] p-4 text-center sm:p-6">
              <div className="mx-auto w-fit"><TeamLogo team={team} size={60}/></div>
              <div className="mt-3 truncate text-xs font-black uppercase tracking-[0.09em] text-white/70 sm:text-sm">{team.name}</div>
              <div className="mt-3 text-4xl font-black tracking-tight tabular-nums text-white sm:text-5xl">{p==null?"—":fairMoneyline(p)}</div>
              <div className="mt-2 text-sm font-semibold text-cyan-200">{p==null?"Odds pending":`${pct(p)} implied chance`}</div>
              {ci?<div className="mt-1 text-[11px] text-white/50">95% simulation interval {pct(ci[0])}–{pct(ci[1])}</div>:null}
            </div>
          )}
        </div>
      </div>
      {isDesign?<div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        <strong className="block text-sm">Design preview — 12 V7 games only</strong>
        These moneylines and percentages are too uncertain to use as predictions. They appear solely to review the
        odds layout and available markets. The published odds minimum stays at 1,000 games.
        A dash means the event occurred in none or all of the 12 games, so a finite fair line cannot be calculated.
      </div>:null}
      {!odds?<div className="rounded-2xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-[#000B36]">{job.status==="error"?"Odds unavailable":previewOnly?"Preview odds are not generated yet":"Awaiting precomputed V7 odds"}</p>
        <p className="mt-2 text-sm leading-6 text-[#000B36]/55">
          {job.status==="error"?job.error:previewOnly?
          "For layout review, generate 12 complete V7 games. This will reveal every market without changing the 1,000-game requirement for public odds.":
          "This matchup does not yet have 1,000 completed V7 games for its current lineup. Other games may already have odds: select another matchup above. This page checks the shared cache every 30 seconds; the server refresh job checks the upcoming slate every 30 minutes."}
        </p>
        {!previewOnly && slate.length>1 && job.status!=="error"?<button
          type="button" className="mt-4 rounded-xl bg-[#000B36] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#16315E]"
          onClick={()=>{
            const idx=slate.findIndex(g=>g.id===selected.id);
            setSelectedGameId(slate[(idx+1)%slate.length].id);
          }}>
          Check next matchup
        </button>:null}
        {previewOnly?<div className="mt-4">
          <button type="button" disabled={demo.status==="running"} onClick={startPreview}
            className="rounded-xl bg-[#000B36] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            {demo.status==="running"?"Simulating V7 games…":"Generate 12-game design preview"}
          </button>
          {demo.status==="running"||demo.status==="done"?<div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-[#000B36]/65">
              <span>Complete V7 games</span><span>{demo.completed}/12</span>
            </div>
            <div role="progressbar" aria-label="Preview simulations complete" aria-valuenow={demo.completed}
              aria-valuemin={0} aria-valuemax={12} className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#18BDFC] transition-[width] duration-300"
                style={{width:`${100*demo.completed/12}%`}}/>
            </div>
          </div>:null}
          {demo.status==="error"?<p role="alert" className="mt-3 text-sm font-bold text-[#A90117]">{demo.error}</p>:null}
        </div>:null}
      </div>:null}
      {odds?<>
        <nav aria-label="Odds markets" className="flex flex-wrap gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2">
          {[["game","Game lines"],["skaters","Skater props"],["goalies","Starting goalies"]].map(([id,label])=>
            <button key={id} type="button" onClick={()=>setTab(id)}
              className={`rounded-xl px-4 py-3 text-xs font-black transition ${tab===id?"bg-[#000B36] text-white":"bg-[#F1F4F8] text-[#000B36] hover:bg-[#E4EBF4]"}`}>
              {label}
            </button>)}
        </nav>
        {tab==="game"?<>
          <p className="text-xs text-[#000B36]/45">Each market shows one selection at a time. Choose a different line instead of listing redundant over/under complements.</p>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title="Total goals" description="One over/under selection, adjustable line"
              tools={<Choice label="Total-goals line" value={totalLine} onChange={setTotalLine}
              options={selectOptions([3.5,4.5,5.5,6.5,7.5,8.5,9.5])}/>}>
              <div className="space-y-2">
                <OddsRow label={`Over ${totalLine}`} sub="Combined game goals" probability={marketTotal?.over||0}/>
                <div className="flex items-center justify-between rounded-xl bg-[#F7F9FC] px-4 py-3 text-xs font-semibold text-[#000B36]/58">
                  <span>Projected score</span><span className="font-black text-[#000B36]">{away.abbreviation} {odds.awayGoals.toFixed(2)} · {home.abbreviation} {odds.homeGoals.toFixed(2)}</span>
                </div>
              </div>
            </Panel>
            <Panel title="Puck lines" description="Winning by more than the selected margin"
              tools={<Choice label="Puck-line margin" value={puckLine} onChange={setPuckLine}
              options={selectOptions([1.5,2.5])}/>}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <OddsRow team={away} label={`${away.abbreviation} −${puckLine}`} sub="Cover the spread" probability={marketPuck?.awayCover||0}/>
                <OddsRow team={home} label={`${home.abbreviation} −${puckLine}`} sub="Cover the spread" probability={marketPuck?.homeCover||0}/>
              </div>
            </Panel>
            <Panel wide title="Team goals" description="Individual team totals, single adjustable threshold"
              tools={<Choice label="Team goals threshold" value={teamLine} onChange={setTeamLine}
              options={selectOptions([1.5,2.5,3.5,4.5])}/>}>
              <div className="grid gap-2 sm:grid-cols-2">
                {[away,home].map(team=><OddsRow key={team.abbreviation} team={team}
                  label={`Over ${teamLine}`} sub={team.abbreviation+" goals"}
                  probability={odds.teamTotals[team.abbreviation]?.find(x=>x.line===Number(teamLine))?.over||0}/>)}
              </div>
            </Panel>
            <Panel wide title="Other game markets" description="Outcomes not already reflected by the moneyline">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <OddsRow label="Overtime" sub="Game reaches OT" probability={odds.ot}/>
                <OddsRow label="Shootout" sub="Game reaches a shootout" probability={odds.shootout}/>
                <OddsRow label="Both teams score" sub="At least one each" probability={odds.bothScore}/>
                <OddsRow label="Any shutout" sub="Either team finishes with zero" probability={odds.shutout}/>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#000B36]/8 pt-3">
                <Choice label="Team to score first" value={firstGoalTeam} onChange={setFirstGoalTeam}
                  options={[{label:`${away.abbreviation} first goal`,value:"away"},{label:`${home.abbreviation} first goal`,value:"home"}]}/>
                <OddsText probability={odds.firstGoal[firstGoalTeam==="away"?away.abbreviation:home.abbreviation]||0}/>
              </div>
            </Panel>
          </div>
        </>:null}
        {tab==="skaters"?<div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#000B36]/10 bg-white p-4">
            <Choice label="Skater market" value={skaterMarket} onChange={setSkaterMarket}
              options={SKATER_MARKETS.map(x=>({label:x.label,value:x.key}))}/>
            <Choice label="Filter skaters by team" value={skaterTeam} onChange={setSkaterTeam}
              options={[{label:"Both teams",value:"all"},{label:away.name,value:away.abbreviation},{label:home.name,value:home.abbreviation}]}/>
            <span className="text-xs text-[#000B36]/48">Dressed skaters · Fair odds, no bookmaker margin</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h3 className="text-lg font-black text-[#000B36]">{selectedSkaterMarket.label}</h3>
              <p className="mt-0.5 text-xs text-[#000B36]/50">{selectedSkaterMarket.detail}</p></div>
            <p className="text-xs text-[#000B36]/45">{filterSkaters.length} players</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filterSkaters.map(player=><OddsRow key={player.id} label={player.name}
              team={matchupTeams[player.team]}
              sub={`${player.team} · ${selectedSkaterMarket.detail}`}
              probability={player.probability?.[skaterMarket]||0}/>)}
          </div>
        </div>:null}
        {tab==="goalies"?<div className="space-y-4">
          <Panel title="Starting goalie props" description="Only the designated starters are shown; relief goalies are excluded."
            tools={<Choice label="Goalie market" value={goalieMarket} onChange={setGoalieMarket}
              options={GOALIE_MARKETS.map(x=>({label:x.label,value:x.key}))}/>}>
            <div className="grid gap-3 sm:grid-cols-2">
              {starters.map(goalie=><div key={goalie.id} className="rounded-2xl border border-[#000B36]/10 bg-[#F7F9FC] p-5">
                <div className="flex items-center gap-3">
                  <TeamLogo team={matchupTeams[goalie.team]} size={46}/>
                  <div><div className="text-sm font-black text-[#000B36]">{goalie.name}</div>
                    <div className="mt-0.5 text-xs font-bold text-[#000B36]/45">{goalie.team} · Starting goalie</div></div>
                </div>
                <div className="mt-5 flex items-end justify-between gap-2">
                  <div><div className="text-sm font-black text-[#000B36]">{selectedGoalieMarket.detail}</div>
                    <div className="mt-1 text-xs text-[#000B36]/50">Avg. {goalie.average.saves.toFixed(1)} saves · {goalie.average.allowed.toFixed(1)} GA</div>
                  </div>
                  <OddsText probability={goalie.probability?.[goalieMarket]||0} large/>
                </div>
              </div>)}
            </div>
            {!starters.length?<p className="text-sm text-[#000B36]/50">Starting goalies unavailable in this sample.</p>:null}
          </Panel>
        </div>:null}
        <p className="text-xs leading-5 text-[#000B36]/45">
          Model-implied fair prices, not sportsbook offerings. All results are from V7 box scores.
          {isDesign?" Design preview probabilities are not reliable.":" No odds are shown without 1,000 completed sims for the current lineup."}
        </p>
      </>:null}
    </div>:<div className="rounded-2xl bg-white p-6 text-[#000B36]/60">No games on the selected date.</div>}
  </div>;
}
