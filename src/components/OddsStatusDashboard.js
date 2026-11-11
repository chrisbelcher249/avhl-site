"use client";

import {useCallback,useEffect,useState} from "react";

const group=x=>x||{success:0,failed:0,running:0,queued:0,other:0};
const fmtTime=value=>{
 if(!value)return "—";
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return "—";
 return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})+" ET";
};
function Progress({completed,total,label}){
 const p=total?Math.max(0,Math.min(100,100*completed/total)):0;
 return <div>
  <div className="flex items-baseline justify-between gap-3">
   <span className="text-3xl font-black tabular-nums text-[#000B36]">{completed.toLocaleString()} <span className="text-lg text-[#718096]">/ {total.toLocaleString()}</span></span>
   <span className="text-sm font-black tabular-nums text-[#000B36]">{p.toFixed(1)}%</span>
  </div>
  <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total}
     aria-valuenow={completed} className="mt-3 h-3 overflow-hidden rounded-full bg-[#E8EDF5]">
   <div className="h-full rounded-full bg-[#18BDFC] transition-all duration-500" style={{width:p+"%"}}/>
  </div>
 </div>;
}
function Workflow({title,item,href,description}){
 const c=group(item?.counts);
 return <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h3 className="text-lg font-black text-[#000B36]">{title}</h3>
    <p className="mt-1 max-w-xl text-xs leading-5 text-[#6B778D]">{description}</p>
   </div>
   <span className="rounded-xl bg-[#EFF3F9] px-3 py-2 text-xs font-black text-[#000B36]">
    {item?.status==="in_progress"?"Calculating":item?.status==="queued"?"Queued":item?.conclusion==="success"?"Last run finished":
     item?.status==="unavailable"?"Status unavailable":item?.conclusion==="failure"?"Needs recovery":"Checking"}
   </span>
  </div>
  {item?.counts?<div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
   {[
    ["Successful",c.success],
    ["Running",c.running],
    ["Queued",c.queued],
    ["Failed",c.failed]
   ].map(([label,n])=><div key={label} className="rounded-xl bg-[#F5F7FA] p-3">
    <p className="text-xs font-bold text-[#708096]">{label}</p>
    <p className="mt-1 text-2xl font-black tabular-nums text-[#000B36]">{n}</p>
   </div>)}
  </div>:<p className="mt-4 text-sm text-[#708096]">Job totals are temporarily unavailable. See the GitHub workflow for details.</p>}
  {c.failed>0?<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
   Failed jobs require another valid calculation pass. For season futures, lineup changes after a batch
   is planned can cause jobs to skip or fail rather than publish outdated odds. Saved valid pairs remain reusable.
  </p>:null}
  <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-[#6B778D]">
   <span>Run started: {fmtTime(item?.startedAt)}</span>
   <a href={item?.url||href} target="_blank" rel="noopener noreferrer"
      className="font-black text-[#000B36] underline decoration-[#18BDFC] underline-offset-4">View live GitHub jobs ↗</a>
  </div>
 </section>;
}
export default function OddsStatusDashboard(){
 const [status,setStatus]=useState(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  try{
   const r=await fetch("/api/odds/status",{cache:"no-store"});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error("Live odds status could not be loaded.");
   setStatus(data);setError("");
  }catch(e){setError(e.message||String(e));}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  refresh();
  const t=setInterval(refresh,60000);
  return ()=>clearInterval(t);
 },[refresh]);
 const season=status?.season||{};
 const finished=season.ok===true && season.method==="exact-V7-game-outcome-resampling";
 const total=780,completed=finished?780:Math.min(total,Math.max(0,Number(season.completedPairs)||0));
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <p className="text-xs font-bold text-[#6F7D92]">Updates automatically about once per minute</p>
    <p className="mt-1 text-xs text-[#6F7D92]">Last checked: {fmtTime(status?.checkedAt)}</p>
   </div>
   <button type="button" disabled={loading} onClick={()=>{setLoading(true);refresh();}}
      className="rounded-xl bg-[#000B36] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
      {loading?"Checking…":"Refresh now"}
   </button>
  </div>
  {error?<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>:null}
  <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A90117]">Season odds</p>
     <h2 className="mt-2 text-xl font-black text-[#000B36]">V7 matchup database</h2>
     <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66758B]">
      All 780 unique team pairings, with 50 actual V7 games in each home direction.
      This supplies the projected wins, division, playoffs, Cup and relegation markets.
     </p>
    </div>
    <span className="rounded-xl bg-[#EFF3F9] px-3 py-2 text-xs font-black text-[#000B36]">{finished?"Published":season.status==="building"?"Building":"Checking"}</span>
   </div>
   <div className="mt-6"><Progress completed={completed} total={total} label="V7 futures sampled pairings"/></div>
   <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-[#60718A]">
    <span>{(completed*100).toLocaleString()} of 78,000 actual V7 games in complete saved pairings</span>
    <a href="/odds/season" className="font-black text-[#000B36] underline underline-offset-4">Open season futures ↗</a>
   </div>
   {!finished?<p className="mt-4 rounded-xl bg-[#F5F7FA] p-3 text-xs leading-5 text-[#62738D]">
    Odds remain withheld until the complete current-lineup 780-pair database is verified.
    A new owner lineup can change the required pairing hashes; unchanged saved V7 outcomes are reused.
   </p>:null}
  </section>
  <div className="grid gap-4 lg:grid-cols-2">
   <Workflow title="Individual game odds" item={status?.gameWorkflow}
     description="1,000 complete V7 games for each scheduled matchup. These jobs are independent of the season-futures cache. A successful job can also mean an existing valid cache was reused."
     href="https://github.com/chrisbelcher249/avhl-site/actions/workflows/refresh-v7-odds.yml"/>
   <Workflow title="Season-futures sampling" item={status?.futuresWorkflow}
     description="GitHub workers calculate missing real V7 pairings; only fully completed 50-home/50-away pairs count toward the progress bar above."
     href="https://github.com/chrisbelcher249/avhl-site/actions/workflows/refresh-v7-futures.yml"/>
  </div>
  <p className="text-xs leading-5 text-[#64748B]">
    GitHub job counts and the cache progress are different metrics: one job can simulate multiple pairings,
    and some successful jobs simply reuse existing samples. The season progress bar measures actual
    fully completed pair caches. For individual games, choose a matchup on the odds page to see if
    its current 1,000-game cache is ready.
  </p>
 </div>;
}