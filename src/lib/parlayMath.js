// Virtual-only estimates. Multiple-leg prices are illustrative independence products,
// NOT measured joint probabilities or a real-money wagering market.
export const MAX_PARLAY_LEGS=8;
export const MAX_DISPLAY_DECIMAL_ODDS=10001; // +1,000,000 American
export const PARLAY_MODES=["same","day","futures"];
const clip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/** Zero observed occurrences are not proof that an outcome is impossible. */
export function displayLegProbability(p,samples=1000){
  if(typeof p!=="number"||!Number.isFinite(p)||p<0||p>1)return null;
  const n=Number.isInteger(samples)&&samples>0?samples:1000;
  if(p===0)return Math.max(0.5/(n+1),1/MAX_DISPLAY_DECIMAL_ODDS);
  if(p===1)return Math.min((n+0.5)/(n+1),1-1/MAX_DISPLAY_DECIMAL_ODDS);
  return p;
}
export function decimalToAmerican(decimal){
  if(!Number.isFinite(decimal)||decimal<1)return "—";
  const capped=clip(decimal,1+1e-10,MAX_DISPLAY_DECIMAL_ODDS);
  const value=capped>2?Math.round(100*(capped-1)):-Math.round(100/(capped-1));
  return (value>0?"+":"")+Math.max(-1_000_000,Math.min(1_000_000,value)).toLocaleString("en-US");
}
export function probabilityToAmerican(p,samples=1000){
  const adjusted=displayLegProbability(p,samples);
  return adjusted===null?"—":decimalToAmerican(1/adjusted);
}
export function estimatedParlay(legs,points=100){
  if(!Array.isArray(legs)||!legs.length||legs.length>MAX_PARLAY_LEGS)return null;
  if(!Number.isInteger(points)||points<1||points>1000)return null;
  let probability=1;
  for(const leg of legs){
    const p=displayLegProbability(leg.probability,leg.samples);
    if(p===null)return null;
    probability*=p;
  }
  const rawDecimal=1/probability;
  const decimal=Math.min(MAX_DISPLAY_DECIMAL_ODDS,rawDecimal);
  return {
    probability,decimal,american:decimalToAmerican(decimal),
    capped:rawDecimal>MAX_DISPLAY_DECIMAL_ODDS,
    potentialPoints:Math.round(points*decimal),
    netPoints:Math.round(points*(decimal-1)),points
  };
}
const keyParts=leg=>String(leg.marketKey||"").split(":");
function sameGameConflict(existing,candidate){
  const a=keyParts(existing),b=keyParts(candidate);
  if(!a[0]||!b[0])return ""; // Old stored picks are never automatically restored.
  if(a[0]===b[0]){
    if(["ml","total","puck"].includes(a[0]))
      return "Choose only one "+({ml:"moneyline",total:"game total",puck:"puck line"}[a[0]])+
        " outcome per same-game ticket.";
    if(a[0]==="tt"&&a[1]===b[1])
      return "Choose only one team-total outcome for each team.";
    if(["skater","goalie"].includes(a[0])&&a[1]===b[1])
      return "Choose only one prop per player or goalie.";
    if(a[0]==="other"&&a[1]==="first"&&b[1]==="first")
      return "Only one club can score the first goal.";
  }
  if(a[0]==="other"&&b[0]==="other"){
    if(new Set([a[1],b[1]]).has("both")&&new Set([a[1],b[1]]).has("shutout"))
      return "Both teams scoring and a team shutout cannot happen together.";
  }
  // A team covering a negative puck line must win the game.
  const ml=a[0]==="ml"?a:b[0]==="ml"?b:null;
  const puck=a[0]==="puck"?a:b[0]==="puck"?b:null;
  if(ml&&puck&&puck[1]?.endsWith("-")){
    const puckTeam=puck[1].slice(0,-1);
    if(puckTeam&&ml[1]!==puckTeam)
      return "A team cannot cover a negative puck line if the other team wins.";
  }
  return "";
}
/** Choose a mode first. Never combine odds across modes or silently reuse a ticket. */
export function canAddParlayLeg(legs,candidate,mode="day"){
  if(!Array.isArray(legs)||!PARLAY_MODES.includes(mode))
    return {ok:false,reason:"Choose a valid parlay type."};
  if(!candidate||!["game","future"].includes(candidate.type)||
     typeof candidate.probability!=="number"||!Number.isFinite(candidate.probability)||
     candidate.probability<0||candidate.probability>1)
    return {ok:false,reason:"Choose a verified market with a valid probability."};
  if(legs.length>=MAX_PARLAY_LEGS)
    return {ok:false,reason:"The limit is eight selections per slip."};
  if(legs.some(x=>x.id===candidate.id))
    return {ok:false,reason:"That selection is already on your slip."};
  if(mode==="futures"){
    if(candidate.type!=="future"||!candidate.teamCodes?.[0])
      return {ok:false,reason:"Futures parlays only accept season outcomes."};
    if(legs.some(x=>x.type!=="future"))
      return {ok:false,reason:"Futures and game markets belong on separate tickets."};
    if(legs.some(x=>x.teamCodes?.[0]===candidate.teamCodes[0]))
      return {ok:false,reason:"Select at most one futures outcome per team."};
    for(const x of legs){
      if(x.market===candidate.market&&["cup","presidents"].includes(candidate.market))
        return {ok:false,reason:"Only one team can win this season-long title."};
      if(x.market===candidate.market&&candidate.market==="division"&&
         x.division&&x.division===candidate.division)
        return {ok:false,reason:"Two teams in the same division cannot both win it."};
      if(x.market===candidate.market&&candidate.market==="conference"&&
         x.conference&&x.conference===candidate.conference)
        return {ok:false,reason:"Two teams in the same conference cannot both lead it."};
    }
    return {ok:true,reason:""};
  }
  if(candidate.type!=="game"||candidate.gameId==null||!candidate.date)
    return {ok:false,reason:"Game parlays only accept verified scheduled games."};
  if(legs.some(x=>x.type!=="game"))
    return {ok:false,reason:"Game and season futures markets belong on separate tickets."};
  if(mode==="day"){
    if(legs.some(x=>x.date!==candidate.date))
      return {ok:false,reason:"All selections must come from the same calendar day."};
    if(legs.some(x=>x.gameId===candidate.gameId))
      return {ok:false,reason:"Choose only one selection per game for the one-day parlay."};
  }else{
    if(legs.some(x=>x.gameId!==candidate.gameId))
      return {ok:false,reason:"A same-game parlay can only use one matchup."};
    for(const x of legs){
      const reason=sameGameConflict(x,candidate);
      if(reason)return {ok:false,reason};
    }
  }
  return {ok:true,reason:""};
}
