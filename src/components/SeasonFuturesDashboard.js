"use client";
import Image from "next/image";
import {useEffect,useMemo,useState} from "react";
import {fairMoneyline} from "@/lib/v7OddsSamples";

const TABS=[
  {key:"wins",label:"Win totals",subtitle:"Over/under projected season wins"},
  {key:"playoffs",label:"Playoff odds",subtitle:"Qualification and playoff-round advancement"},
  {key:"division",label:"Division titles",subtitle:"Finish first in the division"},
  {key:"presidents",label:"Presidents' Trophy",subtitle:"Best overall regular-season record"},
  {key:"cup",label:"Cup odds",subtitle:"Win the AVHL championship"},
  {key:"relegation",label:"Relegation",subtitle:"Finish 38th–40th in the league"},
  {key:"conference",label:"Conference titles",subtitle:"Lead the conference or reach the League Final"},
  {key:"team",label:"Team explorer",subtitle:"All season markets for a selected club"}
];
const PLAYOFFS=[
  {value:"playoffs",label:"Qualify for the playoffs (top 10 per conference)"},
  {value:"round1",label:"Reach Round 1 (survive qualifiers)"},
  {value:"round2",label:"Reach Round 2"},
  {value:"conferenceFinal",label:"Reach the conference final"},
  {value:"cupFinal",label:"Reach the League Final"},
  {value:"cup",label:"Win the AVHL Cup"}
];
const CONFERENCE=[
  {value:"conference",label:"First in conference (regular season)"},
  {value:"cupFinal",label:"Win conference playoffs (League Final)"}
];
const LINE_OPTIONS=[20.5,25.5,30.5,35.5,40.5,45.5,50.5,55.5,60.5];
const fmt=(p)=>Number.isFinite(p)?(p*100).toFixed(p<0.01?2:1)+"%":"—";
const date=(iso)=>iso?new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}):"";
function TeamLogo({team,size=43}){
  return <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#000B36]/10 bg-[#F5F7FA]"
    style={{height:size,width:size}}>
    <Image src={team.logo} alt={team.name+" logo"} fill sizes={size+"px"} className="object-contain p-1.5"/>
  </span>;
}
function Price({p,hero=false}){
  return <div className="text-right tabular-nums">
    <p className={hero?"text-3xl font-black leading-tight tracking-tight text-[#000B36] sm:text-4xl":"text-2xl font-black tracking-tight text-[#000B36]"}>
      {fairMoneyline(p)}
    </p>
    <p className="mt-1 text-[11px] font-bold text-[#65748A]">{fmt(p)} likelihood</p>
  </div>;
}
function Select({label,value,onChange,options}){
  return <label className="block">
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}
      className="max-w-full rounded-xl border border-[#000B36]/12 bg-white px-3 py-2.5 text-xs font-black text-[#000B36] shadow-sm">
      {options.map(x=><option key={String(x.value)} value={String(x.value)}>{x.label}</option>)}
    </select>
  </label>;
}
function MetricRow({team,value,detail,big=false}){
  return <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#000B36]/8 bg-white p-4 shadow-sm md:p-5">
    <div className="flex min-w-0 items-center gap-3">
      <TeamLogo team={team} size={big?52:43}/>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#000B36] md:text-base">{team.name}</p>
        <p className="mt-1 text-xs font-semibold text-[#68798E]">{detail||team.abbreviation}</p>
      </div>
    </div>
    <Price p={value} hero={big}/>
  </div>;
}
function marketChance(team,market,line,side,secondary){
  if(market==="wins"){
    const h=team.winsHistogram||[];
    const above=h.slice(Math.floor(Number(line))+1).reduce((s,n)=>s+n,0);
    const p=above/h.reduce((s,n)=>s+n,0);
    return side==="under"?1-p:p;
  }
  if(market==="playoffs")return team.probabilities[secondary||"playoffs"];
  if(market==="conference")return team.probabilities[secondary||"conference"];
  return team.probabilities[market]||0;
}
const marketDescription={
  wins:"Current wins + projected remaining-season results",
  playoffs:"Conference top 10 qualify; seeds 7–10 play a best-of-five qualifier",
  division:"One champion per division · official standings tiebreakers",
  presidents:"Highest regular-season point total · official tiebreakers",
  cup:"Two conference brackets, qualifiers and best-of-seven playoff rounds",
  relegation:"Bottom three of all 40 clubs are relegated",
  conference:"Western and Eastern Conference",
  team:"Complete season outlook, win ranges and every available futures market"
};
export default function SeasonFuturesDashboard({initialMarket="wins"}){
  const [snapshot,setSnapshot]=useState(null);
  const [state,setState]=useState({status:"loading",error:""});
  const [market,setMarket]=useState(TABS.some(t=>t.key===initialMarket)?initialMarket:"wins");
  const [filter,setFilter]=useState("all");
  const [line,setLine]=useState("40.5");
  const [side,setSide]=useState("over");
  const [playoffMarket,setPlayoffMarket]=useState("playoffs");
  const [confMarket,setConfMarket]=useState("conference");
  const [selectedTeam,setSelectedTeam]=useState("");
  useEffect(()=>{
    let cancelled=false;
    setState({status:"loading",error:""});
    fetch("/api/odds/season",{cache:"no-store"})
      .then(async response=>{const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||"Season outlook is currently unavailable.");return data;})
      .then(data=>{if(cancelled)return;setSnapshot(data);setSelectedTeam(data.teams?.[0]?.abbreviation||"");setState({status:"ready",error:""});})
      .catch(error=>{if(!cancelled)setState({status:"error",error:error.message||String(error)});});
    return ()=>{cancelled=true;};
  },[]);
  const data=snapshot,teams=data?.teams||[];
  const tabs=TABS;
  const current=tabs.find(x=>x.key===market)||tabs[0];
  const divisions=[...new Set(teams.map(t=>t.division))];
  const filters=[{value:"all",label:"All 40 teams"},{value:"Western",label:"Western Conference"},{value:"Eastern",label:"Eastern Conference"},
    ...divisions.map(x=>({value:x,label:x+" Division"}))];
  const matching=teams.filter(t=>filter==="all"||t.conference===filter||t.division===filter);
  const ranked=useMemo(()=>matching.map(team=>({
    team,value:marketChance(team,market,line,side,market==="playoffs"?playoffMarket:confMarket)
  })).sort((a,b)=>b.value-a.value||a.team.name.localeCompare(b.team.name)),[teams,filter,market,line,side,playoffMarket,confMarket]);
  const featured=ranked.slice(0,4);
  const explorer=teams.find(t=>t.abbreviation===selectedTeam)||teams[0];
  const chooseMarket=(value)=>{
    setMarket(value);
    if(typeof window!=="undefined")window.history.replaceState(null,"","/odds/season?market="+encodeURIComponent(value));
  };
  const explorerRows=explorer?[
    ["Division champion","division"],
    ["Conference regular-season leader","conference"],
    ["Presidents' Trophy","presidents"],
    ["Make playoffs (conference top 10)","playoffs"],
    ["Advance past qualifier","round1"],
    ["Reach Round 2","round2"],
    ["Reach Conference Final","conferenceFinal"],
    ["Reach League Final","cupFinal"],
    ["Win the Cup","cup"],
    ["Finish league top 5","topFive"],
    ["Finish league top 10","topTen"],
    ["Relegation (bottom 3)","relegation"]
  ]:[];

  return <div className="space-y-6">
    <section className="rounded-[1.75rem] border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-7">
      <p className="text-[11px] font-black uppercase tracking-[0.19em] text-[#A90117]">2026–27 AVHL · Season Markets</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#000B36] md:text-3xl">Every race. Every team. One season.</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-[#54647A]">
        Projected wins, division titles, playoff spots, postseason advancement, Cup odds and relegation.
        Percentages come from a fast <strong>standings-based statistical forecast</strong> using the official completed
        schedule and 10,000 remaining-season scenarios. Unlike the game odds, these are <strong>not 10,000 complete V7 physics
        simulations</strong>. The forecast should be treated as provisional and is not a sportsbook price.
      </p>
      {data?<div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[#5A6880]">
        <span className="rounded-xl bg-[#F2F5F9] px-3 py-2">{data.runs.toLocaleString()} scenarios</span>
        <span className="rounded-xl bg-[#F2F5F9] px-3 py-2">{data.completedGames} completed games</span>
        <span className="rounded-xl bg-[#F2F5F9] px-3 py-2">{data.remainingGames} games remaining</span>
        <span className="rounded-xl bg-[#F2F5F9] px-3 py-2">Updated {date(data.generatedAt)} ET</span>
      </div>:null}
    </section>
    <nav aria-label="Season markets" className="grid grid-cols-2 gap-2 rounded-2xl border border-[#000B36]/10 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-4">
      {tabs.map(item=><button key={item.key} type="button" onClick={()=>chooseMarket(item.key)}
        className={"rounded-xl px-3 py-3 text-left text-xs font-black transition md:text-sm "+(market===item.key?
          "bg-[#000B36] text-white":"bg-[#F4F7FA] text-[#000B36] hover:bg-[#E7ECF5]")}>
        {item.label}
      </button>)}
    </nav>
    {state.status==="loading"?<section aria-live="polite" className="rounded-2xl border border-[#000B36]/10 bg-white p-7 text-sm font-semibold text-[#62718A]">
      Loading the latest official results and cached 10,000-season projection…
    </section>:null}
    {state.status==="error"?<section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h3 className="text-lg font-black text-amber-950">Season projections temporarily unavailable</h3>
      <p className="mt-2 text-sm leading-6 text-amber-900">{state.error}</p>
      <p className="mt-2 text-sm text-amber-900">No bundled or outdated standings are being substituted for current results.</p>
    </section>:null}
    {data?<>
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#000B36]">{current.label}</h3>
          <p className="mt-1 text-sm text-[#65758B]">{marketDescription[market]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {market!=="team"?<Select label="Filter by conference or division" value={filter} onChange={setFilter} options={filters}/>:null}
          {market==="wins"?<>
            <Select label="Win total threshold" value={line} onChange={setLine} options={LINE_OPTIONS.map(x=>({value:String(x),label:x+" wins"}))}/>
            <Select label="Over or under" value={side} onChange={setSide}
              options={[{value:"over",label:"Over"},{value:"under",label:"Under"}]}/>
          </>:null}
          {market==="playoffs"?<Select label="Playoff qualification or round" value={playoffMarket} onChange={setPlayoffMarket} options={PLAYOFFS}/>:null}
          {market==="conference"?<Select label="Conference futures market" value={confMarket} onChange={setConfMarket} options={CONFERENCE}/>:null}
        </div>
      </section>
      {market!=="team"?<>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map(({team,value})=><MetricRow key={team.abbreviation} team={team} value={value}
            detail={market==="wins"?"Projected "+team.projectedWins.toFixed(1)+" wins":
              market==="relegation"?"Projected rank #"+team.projectedRank.toFixed(1):
              team.division+" · "+team.conference} big/>)}
        </div>
        <section className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="border-b border-[#000B36]/8 px-5 py-4">
            <p className="text-sm font-black text-[#000B36]">All {matching.length} clubs · Fair model odds</p>
            <p className="mt-1 text-xs text-[#64748B]">
              {market==="wins"?side.toUpperCase()+" "+line+" regular-season wins":
              market==="playoffs"?PLAYOFFS.find(x=>x.value===playoffMarket)?.label:
              market==="conference"?CONFERENCE.find(x=>x.value===confMarket)?.label:
              current.subtitle}
            </p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map(({team,value})=><MetricRow key={team.abbreviation} team={team} value={value}
              detail={market==="wins"?"Current "+team.record.wins+" W · Forecast "+team.projectedWins.toFixed(1)+" W":
                market==="relegation"?"Projected rank #"+team.projectedRank.toFixed(1):
                team.division+" · "+team.conference}/>)}
          </div>
        </section>
      </>:<div className="space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#000B36]/10 bg-white p-4">
          <div className="flex items-center gap-3">
            {explorer?<TeamLogo team={explorer} size={56}/>:null}
            <div><h3 className="text-lg font-black text-[#000B36]">{explorer?.name}</h3>
              <p className="text-xs text-[#62718A]">{explorer?.division} · {explorer?.conference}</p></div>
          </div>
          <Select label="Explore club" value={selectedTeam} onChange={setSelectedTeam}
            options={teams.map(t=>({value:t.abbreviation,label:t.name}))}/>
        </section>
        {explorer?<div className="grid gap-3 sm:grid-cols-3">
          {[["Expected wins",explorer.projectedWins.toFixed(1)],["Expected points",explorer.projectedPoints.toFixed(1)],
            ["Wins · 10th–90th percentile",explorer.winsP10+" – "+explorer.winsP90]].map(([label,value])=>
            <div key={label} className="rounded-2xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-[#64748B]">{label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#000B36]">{value}</p>
            </div>)}
        </div>:null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {explorerRows.map(([label,key])=><div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-[#000B36]/10 bg-white p-4">
            <p className="max-w-[55%] text-sm font-black text-[#000B36]">{label}</p>
            <Price p={explorer?.probabilities?.[key]||0}/>
          </div>)}
        </div>
        {explorer?<section className="rounded-2xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-[#000B36]">Projected win-total distribution</h3>
          <p className="mt-1 text-xs text-[#64748B]">Observed model frequency in each completed-season scenario</p>
          <div className="mt-5 flex h-36 items-end gap-[2px]" aria-label="Histogram of projected season wins" role="img">
            {explorer.winsHistogram.map((n,i)=>{
              const max=Math.max(...explorer.winsHistogram);
              return <div key={i} title={i+" wins: "+n+" scenarios"} className="min-w-0 flex-1 rounded-t-sm bg-[#18BDFC]" style={{height:(max?n/max*100:0)+"%"}}/>;
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold text-[#64748B]"><span>0 wins</span><span>82 wins</span></div>
        </section>:null}
      </div>}
      <p className="text-xs leading-5 text-[#6B7A90]">
        Odds are mathematically fair model-implied American prices, with no sportsbook margin.
        A dash indicates an event observed in 0 or all scenarios. Results-based modeling
        uncertainty exceeds the random sampling error of 10,000 scenarios; these probabilities
        are not interchangeable with 1,000-game exact-V7 matchup estimates.
      </p>
    </>:null}
  </div>;
}
