import assert from "node:assert/strict";
import {seasonFuturesPrice,winTotalOutcomeStatus,FUTURES_MAX_ABSOLUTE_MONEYLINE}
  from "../src/lib/seasonFuturesPrices.js";

assert.equal(FUTURES_MAX_ABSOLUTE_MONEYLINE,1_000_000);
assert.deepEqual(seasonFuturesPrice(0,{runs:10_000}),{
  price:"+1,000,000",detail:"0 / 10,000 runs · display floor",limited:true
});
assert.deepEqual(seasonFuturesPrice(1,{runs:10_000}),{
  price:"-1,000,000",detail:"10,000 / 10,000 runs · display cap",limited:true
});
assert.equal(seasonFuturesPrice(0.001).price,"+99,900");
assert.equal(seasonFuturesPrice(0.1).price,"+900");
assert.equal(seasonFuturesPrice(0.5).price,"-100");
assert.equal(seasonFuturesPrice(0.9).price,"-900");
assert.equal(seasonFuturesPrice(0.000001).price,"+1,000,000");
assert.equal(seasonFuturesPrice(0.999999).price,"-1,000,000");
assert.equal(seasonFuturesPrice(0,{possible:false}).price,"—");
assert.equal(seasonFuturesPrice(1,{guaranteed:true}).detail,"Mathematically guaranteed");
assert.equal(seasonFuturesPrice(null).detail,"Unavailable");
assert.equal(seasonFuturesPrice(Number.NaN).detail,"Unavailable");

// An over is truly impossible only if the maximum remaining wins cannot exceed
// the requested line. Zero observations alone do NOT establish impossibility.
const team={record:{gp:70,wins:40}};
assert.deepEqual(winTotalOutcomeStatus(team,52.5,"over"),{possible:false,guaranteed:false});
assert.deepEqual(winTotalOutcomeStatus(team,51.5,"over"),{possible:true,guaranteed:false});
assert.deepEqual(winTotalOutcomeStatus(team,39.5,"under"),{possible:false,guaranteed:false});
assert.deepEqual(winTotalOutcomeStatus(team,40.5,"over"),{possible:true,guaranteed:false});
assert.deepEqual(winTotalOutcomeStatus(team,39.5,"over"),{possible:true,guaranteed:true});
assert.deepEqual(winTotalOutcomeStatus(team,52.5,"under"),{possible:true,guaranteed:true});
assert.equal(seasonFuturesPrice(0,{
  ...winTotalOutcomeStatus(team,52.5,"over")
}).price,"—");
assert.equal(seasonFuturesPrice(0,{
  ...winTotalOutcomeStatus(team,51.5,"over")
}).price,"+1,000,000");
console.log("Season futures display cap: PASS (0/10k != impossible, +/-1,000,000 cap, genuine win-total impossibility/guarantee).");
