"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_V7_SAMPLES, REFINED_V7_SAMPLES, MAX_V7_SAMPLES, fairMoneyline, summarizeV7Samples, v7SampleCaveat } from "@/lib/v7OddsSamples";

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
export default function OddsBoard({games,dates,teamDirectory,initialDate}){
  const [selectedDate,setSelectedDate]=useState(initialDate||dates[0]||"");
  const [selectedGameId,setSelectedGameId]=useState(null);
  const [marketTab,setMarketTab]=useState("game");
  const [job,setJob]=useState({status:"loading",samples:[],completed:0,target:INITIAL_V7_SAMPLES,error:"",cached:false});
  const workerRef=useRef(null);
  const slate=useMemo(()=>games.filter(g=>g.date===selectedDate),[games,selectedDate]);
  const selected=slate.find(g=>g.id===selectedGameId)||slate[0]||null;
  const away=selected?teamDirectory[selected.away]:null;
  const home=selected?teamDirectory[selected.home]:null;

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
      }else if(data.type==="progress"||data.type==="done"){
        setJob(current=>({
          ...current,
          status:data.type==="done"?"ready":"running",
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
    worker.postMessage({type:"start",gameId:selected.id,away:away.abbreviation,home:home.abbreviation,target:INITIAL_V7_SAMPLES});
    return ()=>{worker.postMessage({type:"cancel"});worker.terminate();if(workerRef.current===worker)workerRef.current=null;};
  },[selected?.id,away?.abbreviation,home?.abbreviation]);

  const odds=useMemo(()=>{
    if(!selected||!away||!home||job.completed<INITIAL_V7_SAMPLES)return null;
    return summarizeV7Samples(job.samples,away.abbreviation,home.abbreviation);
  },[job.samples,job.completed,selected?.id,away?.abbreviation,home?.abbreviation]);
  const progress=Math.min(100,job.target?Math.round(100*job.completed/job.target):0);
  const pending=job.status==="loading"||job.status==="running";
  function refine(){
    if(!workerRef.current||!selected||pending)return;
    const target=job.completed<REFINED_V7_SAMPLES?REFINED_V7_SAMPLES:Math.min(MAX_V7_SAMPLES,Math.max(REFINED_V7_SAMPLES,job.completed*2));
    if(target<=job.completed)return;
    setJob(current=>({...current,status:"running",target,error:""}));
    workerRef.current.postMessage({type:"start",gameId:selected.id,away:away.abbreviation,home:home.abbreviation,target});
  }
  return <div className="space-y-6">
    <header className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Exact V7 Monte Carlo</p>
          <h2 className="mt-1 text-2xl font-black text-[#000B36]">Game & Player Odds</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Every sample is a complete game played by the same V7 simulator that runs the AVHL.
            Official live rosters, owner-selected units, starting goalies, injuries and player ratings
            are loaded directly. No numerical odds appear until 1,000 complete V7 games have finished.
            Progress is saved on this device for the exact lineup and engine version.
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
            <span className="font-black text-[#000B36]">{pending?"Running complete V7 games…":"Sample available"}</span>
            <span className="font-bold tabular-nums text-[#000B36]">{job.completed} / {job.target}</span>
          </div>
          <div role="progressbar" aria-valuenow={job.completed} aria-valuemin={0} aria-valuemax={job.target}
            aria-label="V7 games simulated" className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[#18BDFC] transition-[width] duration-300" style={{width:`${progress}%`}}/>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {v7SampleCaveat(job.completed)} {job.cached?"Previously calculated samples restored.":""}
            {pending?" This calculation can take a substantial amount of time on a new lineup; saved progress resumes when you return.":""}
          </p>
          {!pending && job.completed<MAX_V7_SAMPLES?<button type="button" onClick={refine}
            className="mt-3 rounded-xl bg-[#000B36] px-4 py-2 text-xs font-black text-white">
            Refine with more V7 games
          </button>:null}
        </div>
        {odds?<div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {[[away,odds.awayWin,odds.awayCI,odds.awayMoneyline],[home,odds.homeWin,odds.homeCI,odds.homeMoneyline]].map(([team,p,ci,line])=>
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
              <Market label="Game reaches overtime" probability={odds.ot}/>
              <Market label="Game goes to shootout" probability={odds.shootout}/>
              <Market label="Both teams score" probability={odds.bothScore}/>
              <Market label="Either team records a shutout" probability={odds.shutout}/>
              <Market label={`${away.abbreviation} scores first`} probability={odds.firstGoal[away.abbreviation]}/>
              <Market label={`${home.abbreviation} scores first`} probability={odds.firstGoal[home.abbreviation]}/>
            </MarketSection>
            <MarketSection title="Game total goals">
              <p className="mb-2 text-xs text-slate-500">Projected: {odds.awayGoals.toFixed(2)}–{odds.homeGoals.toFixed(2)} · Includes OT and official shootout-deciding goal</p>
              {odds.totals.map(m=><Market key={m.line} label={`Over ${m.line}`} probability={m.over} sub={`Under ${m.line}: ${percent(m.under)}`}/>)}
            </MarketSection>
            <MarketSection title="Puck lines">
              {odds.puckLines.flatMap(m=>[
                <Market key={`h${m.line}`} label={`${home.abbreviation} -${m.line}`} probability={m.homeCover}/>,
                <Market key={`a${m.line}`} label={`${away.abbreviation} -${m.line}`} probability={m.awayCover}/>
              ])}
            </MarketSection>
            <MarketSection title="Team totals">
              {Object.entries(odds.teamTotals).flatMap(([team,rows])=>rows.map(m=>
                <Market key={`${team}-${m.line}`} label={`${team} over ${m.line}`} probability={m.over} sub={`Under: ${percent(m.under)}`}/>
              ))}
            </MarketSection>
          </div>:null}
          {marketTab==="skaters"?<div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="mb-2 text-sm font-black text-[#000B36]">Skater props — all dressed players</h3>
            <p className="mb-3 text-xs text-slate-500">Probability of reaching each threshold in one complete V7 game, including scoreless games and injuries.</p>
            <SampleTable rows={odds.players} kind="skaters"/>
          </div>:null}
          {marketTab==="goalies"?<div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="mb-2 text-sm font-black text-[#000B36]">Goalie props — starters and relief appearances</h3>
            <p className="mb-3 text-xs text-slate-500">Probabilities are unconditional across simulations; backups who do not appear count as zero saves.</p>
            <SampleTable rows={odds.goalies} kind="goalies"/>
          </div>:null}
          <p className="text-xs leading-5 text-slate-500">All probabilities are fair model frequencies without a sportsbook margin. Simulation sampling error can be large, especially for rare player events. No official game or injury record is created.</p>
        </div>:<p className="mt-5 text-sm font-bold text-slate-500">Odds appear after {INITIAL_V7_SAMPLES} complete simulations, then can be refined.</p>}
      </>}
    </section>:<div className="rounded-2xl bg-white p-6 text-slate-500">No games on the selected date.</div>}
  </div>;
}
