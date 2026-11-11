import OddsNav from "@/components/OddsNav";
import ParlayBuilder from "@/components/ParlayBuilder";
import {getSchedule} from "@/lib/schedule";
import {getTeams} from "@/lib/teams";
import {GET as getCurrentVerifiedV7Odds} from "@/app/api/odds/v7-current/route";

export const metadata={
  title:"Parlay Builder · AVHL Odds",
  description:"Build and share free, imaginary AVHL parlay slips using verified V7 game markets and hybrid season futures. No real money."
};
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=60;

function easternToday(){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return values.year+"-"+values.month+"-"+values.day;
}
export default async function ParlayPage(){
  const [s,t]=await Promise.all([getSchedule(),getTeams()]);
  const directory=Object.fromEntries((t.teams||[]).map(team=>[
    team.slug,{name:team.name,abbreviation:team.abbreviation,
      slug:team.slug,logo:team.assets?.logo||"/teams/"+team.abbreviation+"/logo.webp"}
  ]));
  const scheduleReady=s.source==="live"&&!s.error;
  const eligible=scheduleReady?s.schedule.filter(game=>
    game.awayScore==null&&game.homeScore==null&&game.date>=easternToday()):[];
  const dates=[...new Set(eligible.map(g=>g.date))].sort().slice(0,7);
  const games=eligible.filter(g=>dates.includes(g.date)).map(g=>({
    id:g.id,date:g.date,home:g.home,away:g.away
  }));
  const firstGames=games.filter(g=>g.date===dates[0]);
  const snapshots=await Promise.all(firstGames.map(async game=>{
    const home=directory[game.home]?.abbreviation;
    const away=directory[game.away]?.abbreviation;
    if(!home||!away)return [String(game.id),null];
    try{
      const response=await getCurrentVerifiedV7Odds(new Request(
        "https://avhl.org/api/odds/v7-current?home="+encodeURIComponent(home)+
        "&away="+encodeURIComponent(away)));
      if(!response.ok)return [String(game.id),null];
      const result=await response.json();
      if(result.ok&&result.ready&&result.count>=1000&&
         result.summary?.source==="v7-complete-games"&&
         result.summary.count===result.count&&
         result.summary.home===home&&result.summary.away===away)
        return [String(game.id),result];
    }catch(e){
      console.error("Parlay preview could not verify official V7 game",{
        gameId:game.id,error:e instanceof Error?e.message:String(e)
      });
    }
    return [String(game.id),null];
  }));
  return <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
    <section className="bg-[#000B36] px-5 py-12 text-white md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">AVHL odds · For fun only</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Parlay Builder</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 md:text-base">
          Create a fantasy ticket with AVHL game predictions and season futures.
          Combine your picks, preview estimated odds and share your slip with friends.
          No real money, accounts, purchases or prizes.
        </p>
      </div>
    </section>
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-8 md:py-10">
      <OddsNav/>
      <ParlayBuilder games={games} dates={dates} directory={directory}
        initialSnapshots={Object.fromEntries(snapshots.filter(([,value])=>value))}
        scheduleReady={scheduleReady}/>
    </div>
  </main>;
}
