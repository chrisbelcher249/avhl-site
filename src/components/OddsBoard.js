"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_V7_SAMPLES, canPublishV7Odds, fairMoneyline, summarizeV7Samples, v7SampleCaveat } from "@/lib/v7OddsSamples";

function formatDate(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US",{timeZone:"UTC",weekday:"long",month:"long",day:"numeric",year:"numeric"})
    .format(new Date(Date.UTC(year,month-1,day)));
}
function percent(x){return `${(x*100).toFixed(0)}%`;}
function Team({team}){
  return <div className="flex items-center gap-3">
    <span className="relative h-10 w-10 shrink-0 rounded-xl bg-white p-1 ring-1 ring-slate-200">
      <Image src={team.logo} alt="" fill sizes="40px" className="object-contain p-1"/>
    </span>
    <span><span className="block font-black text-[#000B36]">{team.name}</span>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{team.abbreviation}</span></span>
  </div>;
}
function Market({label,probability,sub}){
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
    <div><p className="text-sm font-bold text-[#000B36]">{label}</p>{sub?<p className="text-xs text-slate-500">{sub}</p>:null}</div>
    <div className="text-right"><span className="font-black tabular-nums text-[#000B36]">{percent(probability)}</span>
      <span className="ml-2 text-xs font-bold text-slate-500">{fairMoneyline(probability)}</span></div>
  </div>;
}
function MarketSection({title,children}){
  return <section className="rounded-2xl border border-slate-100 bg-white p-4">
    <h3 className="mb-2 text-sm font-black uppercase tracking-[0.13em] text-[#A90117]">{title}</h3>{children}
  </section>;
}
function SampleTable({rows,kind}){
  if(!rows.length)return <p className="py-5 text-sm text-slate-500">No sampled players yet.</p>;
  return <div className="overflow-x-auto">
    <table className="min-w-full text-left text-xs md:text-sm">
      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
        <tr><th className="px-2 py-3">Player</th>
          {kind==="skaters"?<>
            <th className="px-2 py-3 text-right">Goal 1+</th><th className="px-2 py-3 text-right">Assist 1+</th>
            <th className="px-2 py-3 text-right">Point 1+</th><th className="px-2 py-3 text-right">Shots 3+</th>
          </>:<>
            <th className="px-2 py-3 text-right">Avg. saves</th><th className="px-2 py-3 text-right">20+ saves</th>
            <th className="px-2 py-3 text-right">25+ saves</th><th className="px-2 py-3 text-right">Shutout</th>
          </>}
        </tr>
      </thead>
      <tbody>{rows.map(row=><tr key={row.id} className="border-t border-slate-100">
        <td className="whitespace-nowrap px-2 py-3"><span className="font-bold text-[#000B36]">{row.name}</span>
          <span className="ml-2 text-[10px] font-bold text-slate-400">{row.team}</span></td>
        {kind==="skaters"?<>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.goals)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.assists)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.points)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.shots3)}</td>
        </>:<>
          <td className="px-2 py-3 text-right tabular-nums">{row.average.saves.toFixed(1)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.saves20)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.saves25)}</td>
          <td className="px-2 py-3 text-right tabular-nums">{percent(row.probability.shutouts)}</td>
        </>}
      </tr>)}</tbody>
    </table>
  </div>;
}
export default function OddsBoard({games,dates,teamDirectory,initialDate,previewOnly=false}){
  const [selectedDate,setSelectedDate]=useState(initialDate||dates[0]||"");
  const [selectedGameId,setSelectedGameId]=useState(null);
  const [marketTab,setMarketTab]=useState("game");
  const [job,setJob]=useState({status:"loading",samples:[],summary:null,completed:0,target:INITIAL_V7_SAMPLES,error:"",cached:false});
  const workerRef=useRef(null);
  const demoWorkerRef=useRef(null);
  const [demo,setDemo]=useState({status:"idle",completed:0,results:[],samples:[],error:""});
  const slate=useMemo(()=>games.filter(g=>g.date===selectedDate),[games,selectedDate]);
  const selected=slate.find(g=>g.id===selectedGameId)||slate[0]||null;
  const away=selected?teamDirectory[selected.away]:null;
  const home=selected?teamDirectory[selected.home]:null;

  useEffect(()=>{
    if(demoWorkerRef.current){demoWorkerRef.current.terminate();demoWorkerRef.current=null;}
    setDemo({status:"idle",completed:0,results:[],samples:[],error:""});
    return ()=>{if(demoWorkerRef.current){demoWorkerRef.current.terminate();demoWorkerRef.current=null;}};
  },[selected?.id,away?.abbreviation,home?.abbreviation]);

  function runDemo(){
    if(!previewOnly||!selected||!home||!away||demo.status==="running")return;
    if(demoWorkerRef.current)demoWorkerRef.current.terminate();
    const worker=new Worker("/odds/v7-worker.js");
    demoWorkerRef.current=worker;
    setDemo({status:"running",completed:0,results:[],samples:[],error:""});
    worker.onmessage=event=>{
      const data=event.data||{};
      if(String(data.gameId)!==String(selected.id))return;
      if(data.type==="demoError"){
        setDemo(current=>({...current,status:"error",error:data.error||"The V7 demonstration failed."}));
        worker.terminate();if(demoWorkerRef.current===worker)demoWorkerRef.current=null;
      }else if(data.type==="demoProgress"||data.type==="demoDone"){
        setDemo({status:data.type==="demoDone"?"done":"running",
          completed:data.completed||0,results:data.results||[],samples:data.samples||[],error:""});
        if(data.type==="demoDone"){worker.terminate();if(demoWorkerRef.current===worker)demoWorkerRef.current=null;}
      }
    };
    worker.onerror=()=>setDemo(current=>({...current,status:"error",error:"The V7 demonstration worker failed."}));
    worker.postMessage({type:"previewDemo",gameId:selected.id,away:away.abbreviation,home:home.abbreviation});
  }

  useEffect(()=>{
    if(!selected||!away||!home)return undefined;
    const worker=new Worker("/odds/v7-worker.js");
    workerRef.current=worker;
    setJob({status:"loading",samples:[],completed:0,target:INITIAL_V7_SAMPLES,error:"",cached:false});
    worker.onmessage=event=>{
      const data=event.data||{};
      if(String(data.gameId)!==String(selected.id))return;
      if(data.type==="error"){
        setJob(current=>({...current,status:"error",error:data.error||"The V7 simulation failed."}));
      }else if(data.type==="progress"||data.type==="done"||data.type==="pending"){
        setJob(current=>({
          ...current,
          status:data.type==="done"?"ready":data.type==="pending"?"pending":"running",
          summary:data.summary || current.summary,
          samples:Array.isArray(data.samples) ? data.samples :
            (Array.isArray(data.newSamples) && data.newSamples.length
              ? current.samples.concat(data.newSamples) : current.samples),
          completed:data.completed||0,
          target:data.target||current.target,error:"",
          cached:Boolean(data.fromCache)
        }));
      }
    };
    worker.onerror=()=>setJob(current=>({...current,status:"error",error:"The V7 worker could not start."}));
    worker.postMessage({type:"start",gameId:selected.id,away:away.abbreviation,home:home.abbreviation,target:INITIAL_V7_SAMPLES,mode:"readOnly"});
    return ()=>{worker.postMessage({type:"cancel"});worker.terminate();if(workerRef.current===worker)workerRef.current=null;};
  },[selected?.id,away?.abbreviation,home?.abbreviation]);

  const odds=useMemo(()=>{
    if(!selected||!away||!home||!canPublishV7Odds(job.completed))return null;
    return job.summary || summarizeV7Samples(job.samples,away.abbreviation,home.abbreviation);
  },[job.samples,job.summary,job.completed,selected?.id,away?.abbreviation,home?.abbreviation]);
  // The 12-game mode exists ONLY on Vercel preview builds to review the
  // market list and UI. It cannot bypass the >=1,000 game publishing gate.
  const designOdds=useMemo(()=>{
    if(!previewOnly || demo.status!=="done" || demo.samples.length!==12 || !away || !home)return null;
    return summarizeV7Samples(demo.samples,away.abbreviation,home.abbreviation);
  },[previewOnly,demo.status,demo.samples,away?.abbreviation,home?.abbreviation]);
  const displayedOdds=designOdds||odds;
  const progress=Math.min(100,job.target?Math.round(100*job.completed/job.target):0);
  const pending=job.status==="loading"||job.status==="running"||job.status==="pending";
  return <div className="space-y-6">
    <header className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Exact V7 Monte Carlo</p>
          <h2 className="mt-1 text-2xl font-black text-[#000B36]">Game & Player Odds</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Every sample is a complete game played by the same V7 simulator that runs the AVHL.
            Official live rosters, owner-selected units, starting goalies, injuries and player ratings
            are loaded directly. {previewOnly?"This preview can use 12 full V7 games to display all available markets and help us review the layout. The published site will still require at least 1,000 simulations per matchup.":"Published odds require at least 1,000 complete V7 games, precomputed and shared across visitors."}
          </p></div>
        <label className="min-w-[240px] text-xs font-black uppercase tracking-wide text-slate-500">
          Game date
          <select value={selectedDate} onChange={event=>{setSelectedDate(event.target.value);setSelectedGameId(null);}}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-[#000B36]">
            {dates.map(date=><option key={date} value={date}>{formatDate(date)}</option>)}
          </select>
        </label>
      </div>
    </header>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {slate.map(g=>{
        const a=teamDirectory[g.away],h=teamDirectory[g.home];
        const active=selected?.id===g.id;
        return <button type="button" key={g.id} onClick={()=>{setSelectedGameId(g.id);setMarketTab("game");}}
          className={`rounded-2xl border p-4 text-left transition ${active?"border-[#18BDFC] bg-[#EAF9FF] shadow-sm":"border-slate-200 bg-white hover:border-slate-300"}`}>
          <p className="text-xs font-black text-[#000B36]">{a?.abbreviation} at {h?.abbreviation}</p>
          <p className="mt-1 truncate text-[11px] text-slate-500">Game {g.id}</p>
        </button>;
      })}
    </div>
    {selected?<section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team team={away}/><span className="text-center text-xs font-black uppercase text-slate-400">at</span><div className="justify-self-end"><Team team={home}/></div>
      </div>
      {job.status==="error"?<div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-900">{job.error}</div>:<>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-[#000B36]">{job.status==="ready"?"V7 odds ready":job.status==="pending"?(previewOnly?"No odds samples generated for this preview":"Waiting for the scheduled server calculation"):"Checking current V7 odds…"}</span>
            <span className="font-bold tabular-nums text-[#000B36]">{job.completed} / {job.target}</span>
          </div>
          <div role="progressbar" aria-valuenow={job.completed} aria-valuemin={0} aria-valuemax={job.target}
            aria-label="V7 games simulated" className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[#18BDFC] transition-[width] duration-300" style={{width:`${progress}%`}}/>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {v7SampleCaveat(job.completed)} {job.cached?"Shared precomputed V7 results loaded.":""}
            {pending?(previewOnly?" The 30-minute scheduled calculation is not activated in this draft preview. No odds will appear here until the precompute system is configured.":" Upcoming matchups are checked every 30 minutes; newly changed lineups must be recomputed. You do not need to keep this tab open."):""}
          </p>

        </div>
        {previewOnly&&!odds?<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-950">12-game odds layout preview</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            Click below to simulate 12 complete V7 games with live lineups, then explore the winner,
            totals, puck line, skater, and goalie markets. These samples are for layout review only.
            The real 1,000-game odds feed is not active in this preview.
          </p>
          <button type="button" onClick={runDemo} disabled={demo.status==="running"}
            className="mt-3 rounded-xl bg-[#000B36] px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            {demo.status==="running"?"Running 12 V7 games…":demo.status==="done"?"Rerun 12-game design preview":"Generate 12-game odds design preview"}
          </button>
          {demo.status==="running"||demo.status==="done"?<div className="mt-3" aria-live="polite">
            <p className="text-xs font-bold text-amber-950">{demo.completed}/12 complete V7 games · Design review only</p>
            <div role="progressbar" aria-valuenow={demo.completed} aria-valuemin={0} aria-valuemax={12}
              aria-label="V7 demonstration games simulated" className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200">
              <div className="h-full bg-[#18BDFC] transition-[width] duration-300" style={{width:`${Math.round(demo.completed/12*100)}%`}}/>
            </div>
            {demo.results.slice(-3).map((sample,i)=><p key={demo.completed-3+i} className="mt-2 text-xs text-amber-950">
              Sample {Math.max(1,demo.completed-2+i)}: {away.abbreviation} {sample.awayScore} – {home.abbreviation} {sample.homeScore}
              {sample.leadingScorers?.length?" · "+sample.leadingScorers.map(p=>`${p.name} ${p.points}P`).join(", "):""}
            </p>)}
          </div>:null}
          {demo.status==="error"?<p role="alert" className="mt-2 text-xs font-bold text-red-700">{demo.error}</p>:null}
        </div>:null}
        {displayedOdds?<div className="mt-6 space-y-5">
          {designOdds?<div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
            DESIGN PREVIEW ONLY · 12 actual V7 games · Percentages are highly unreliable and are shown solely to review market names, layout, and navigation. Not published AVHL odds.
          </div>:null}
          <div className="grid gap-3 sm:grid-cols-2">
            {[[away,displayedOdds.awayWin,displayedOdds.awayCI,displayedOdds.awayMoneyline],[home,displayedOdds.homeWin,displayedOdds.homeCI,displayedOdds.homeMoneyline]].map(([team,p,ci,line])=>
              <div key={team.abbreviation} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{team.abbreviation} win</p>
                <p className="mt-1 text-3xl font-black tabular-nums text-[#000B36]">{percent(p)}</p>
                <p className="text-sm font-black text-[#A90117]">{line}</p>
                <p className="mt-2 text-[11px] text-slate-500">95% sampling interval: {percent(ci[0])}–{percent(ci[1])}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[[ "game","Game markets"],["skaters","Skater props"],["goalies","Goalie props"]].map(([id,label])=>
              <button type="button" key={id} onClick={()=>setMarketTab(id)}
                className={`rounded-xl px-4 py-2 text-xs font-black ${marketTab===id?"bg-[#000B36] text-white":"bg-slate-100 text-[#000B36]"}`}>{label}</button>
            )}
          </div>
          {marketTab==="game"?<div className="grid gap-4 lg:grid-cols-2">
            <MarketSection title="Game outcomes">
              <Market label="Game reaches overtime" probability={displayedOdds.ot}/>
              <Market label="Game goes to shootout" probability={displayedOdds.shootout}/>
              <Market label="Both teams score" probability={displayedOdds.bothScore}/>
              <Market label="Either team records a shutout" probability={displayedOdds.shutout}/>
              <Market label={`${away.abbreviation} scores first`} probability={displayedOdds.firstGoal[away.abbreviation]}/>
              <Market label={`${home.abbreviation} scores first`} probability={displayedOdds.firstGoal[home.abbreviation]}/>
            </MarketSection>
            <MarketSection title="Game total goals">
              <p className="mb-2 text-xs text-slate-500">Projected: {displayedOdds.awayGoals.toFixed(2)}–{displayedOdds.homeGoals.toFixed(2)} · Includes OT and official shootout-deciding goal</p>
              {displayedOdds.totals.map(m=><Market key={m.line} label={`Over ${m.line}`} probability={m.over} sub={`Under ${m.line}: ${percent(m.under)}`}/>)}
            </MarketSection>
            <MarketSection title="Puck lines">
              {displayedOdds.puckLines.flatMap(m=>[
                <Market key={`h${m.line}`} label={`${home.abbreviation} -${m.line}`} probability={m.homeCover}/>,
                <Market key={`a${m.line}`} label={`${away.abbreviation} -${m.line}`} probability={m.awayCover}/>
              ])}
            </MarketSection>
            <MarketSection title="Team totals">
              {Object.entries(displayedOdds.teamTotals).flatMap(([team,rows])=>rows.map(m=>
                <Market key={`${team}-${m.line}`} label={`${team} over ${m.line}`} probability={m.over} sub={`Under: ${percent(m.under)}`}/>
              ))}
            </MarketSection>
          </div>:null}
          {marketTab==="skaters"?<div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="mb-2 text-sm font-black text-[#000B36]">Skater props — all dressed players</h3>
            <p className="mb-3 text-xs text-slate-500">Probability of reaching each threshold in one complete V7 game, including scoreless games and injuries.</p>
            <SampleTable rows={displayedOdds.players} kind="skaters"/>
          </div>:null}
          {marketTab==="goalies"?<div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="mb-2 text-sm font-black text-[#000B36]">Goalie props — starters and relief appearances</h3>
            <p className="mb-3 text-xs text-slate-500">Probabilities are unconditional across simulations; backups who do not appear count as zero saves.</p>
            <SampleTable rows={displayedOdds.goalies} kind="goalies"/>
          </div>:null}
          <p className="text-xs leading-5 text-slate-500">All probabilities are fair model frequencies without a sportsbook margin. Simulation sampling error can be large, especially for rare player events. No official game or injury record is created.</p>
        </div>:<p className="mt-5 text-sm font-bold text-slate-500">{previewOnly?"Select ‘Generate 12-game odds design preview’ to see the available markets.":"Published odds will appear when 1,000 real V7 simulations have been precomputed."}</p>}
      </>}
    </section>:<div className="rounded-2xl bg-white p-6 text-slate-500">No games on the selected date.</div>}
  </div>;
}
