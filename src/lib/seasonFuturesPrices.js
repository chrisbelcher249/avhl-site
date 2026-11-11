// Present extreme *simulation* probabilities without treating a zero count
// as proof that a reachable outcome cannot happen.
export const FUTURES_MAX_ABSOLUTE_MONEYLINE = 1_000_000;

const formatMoneyline = value => {
  const integer = Math.round(value);
  return (integer > 0 ? "+" : "") + integer.toLocaleString("en-US");
};

export function winTotalOutcomeStatus(team,line,side) {
  const gamesPlayed=Number(team?.record?.gp);
  const wins=Number(team?.record?.wins);
  const threshold=Number(line);
  if(!Number.isInteger(gamesPlayed)||gamesPlayed<0||gamesPlayed>82||
     !Number.isInteger(wins)||wins<0||wins>gamesPlayed||
     !Number.isFinite(threshold)||!["over","under"].includes(side))
    return {possible:true,guaranteed:false};
  const minWins=wins,maxWins=wins+(82-gamesPlayed);
  const possible=side==="over"?maxWins>threshold:minWins<threshold;
  const guaranteed=side==="over"?minWins>threshold:maxWins<threshold;
  return {possible,guaranteed};
}

export function seasonFuturesPrice(probability,{possible=true,guaranteed=false,runs=10000}={}) {
  if(!possible) return {price:"—",detail:"Mathematically impossible",limited:false};
  if(guaranteed) return {price:"—",detail:"Mathematically guaranteed",limited:false};
  const p=Number(probability);
  if(probability==null||!Number.isFinite(p)||p<0||p>1)
    return {price:"—",detail:"Unavailable",limited:false};
  const numberOfRuns=Number.isInteger(runs)&&runs>0?runs:10000;
  const n=numberOfRuns.toLocaleString("en-US");
  if(p===0) return {
    price:"+1,000,000",detail:"0 / "+n+" runs · display floor",limited:true
  };
  if(p===1) return {
    price:"-1,000,000",detail:n+" / "+n+" runs · display cap",limited:true
  };
  const fair=p>=0.5?-100*p/(1-p):100*(1-p)/p;
  if(Math.abs(fair)>FUTURES_MAX_ABSOLUTE_MONEYLINE) {
    return {price:formatMoneyline(Math.sign(fair)*FUTURES_MAX_ABSOLUTE_MONEYLINE),
      detail:"Extreme estimate · display cap",limited:true};
  }
  const percentage=p*100;
  const detail=percentage<0.01?"<0.01% likelihood":
    percentage>99.99?">99.99% likelihood":
    percentage<1?percentage.toFixed(2)+"% likelihood":
    percentage.toFixed(1)+"% likelihood";
  return {price:formatMoneyline(fair),detail,limited:false};
}
