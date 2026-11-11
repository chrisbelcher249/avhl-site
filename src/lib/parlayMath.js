// Fun-only parlay display calculations, never a real-money wager or payout.
export const MAX_PARLAY_LEGS=6;
export const MAX_DISPLAY_DECIMAL_ODDS=10001; // +1,000,000 American
const clip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/** Allow zero-count simulated events without pretending their probability is zero.
 *  The Jeffreys half-count is a small display continuity adjustment. */
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
  const value=capped>=2?Math.round(100*(capped-1)):-Math.round(100/(capped-1));
  return (value>0?"+":"")+Math.max(-1_000_000,Math.min(1_000_000,value)).toLocaleString("en-US");
}
export function probabilityToAmerican(p,samples=1000){
  const adjusted=displayLegProbability(p,samples);
  return adjusted===null?"—":decimalToAmerican(1/adjusted);
}
export function estimatedParlay(legs,points=100){
  if(!Array.isArray(legs)||!legs.length)return null;
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
    netPoints:Math.round(points*(decimal-1)),
    points
  };
}

/** Same-game selections, even of different markets, are strongly correlated.
 *  Allow one pick per game and at most one futures leg per slip. */
export function canAddParlayLeg(legs,candidate){
  if(!candidate||!["game","future"].includes(candidate.type)||
     !Number.isFinite(candidate.probability)||candidate.probability<0||candidate.probability>1)
    return {ok:false,reason:"Choose a verified market with a valid probability."};
  if(legs.length>=MAX_PARLAY_LEGS)return {ok:false,reason:"The limit is six selections per slip."};
  if(legs.some(x=>x.id===candidate.id))
    return {ok:false,reason:"That selection is already on your slip."};
  if(candidate.type==="game"&&legs.some(x=>x.type==="game"&&x.gameId===candidate.gameId))
    return {ok:false,reason:"Choose only one selection per game; same-game outcomes are correlated."};
  if(candidate.type==="future"&&legs.some(x=>x.type==="future"))
    return {ok:false,reason:"Only one season futures selection per slip; futures are highly correlated."};
  return {ok:true,reason:""};
}
