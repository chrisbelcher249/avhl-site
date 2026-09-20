import fs from 'node:fs'; import vm from 'node:vm'; import zlib from 'node:zlib';
import { validateReplayArchive, saveOfficialReplay, getOfficialReplay, getReplayMetadataMap, getReplayMetadata, deleteOfficialReplay } from '../src/lib/replayStorage.js';
const context={console, structuredClone, fetch:async()=>{throw new Error('no fetch')},window:{}}; context.window.window=context.window; context.globalThis=context; vm.createContext(context);
for(const f of ['public/sim/team-metadata.js','public/sim/data.js','public/sim/simulator.js']) vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const S=context.window.AVHLGameSimulator; const input=context.window.AVHL_DATA; const game=new S(input,12345).simulateGame();
const snapshot={schema:'avhl-official-replay-v1',replayFormatVersion:'event-timeline-v1',gameId:1,simulatorVersion:'V6.7.1',simGameId:'x',seed:game.seed,homeId:game.homeId,awayId:game.awayId,matchupData:input,events:game.events,finalSummary:game.finalSummary};
const json=JSON.stringify(snapshot); const gz=zlib.gzipSync(Buffer.from(json)); const archive={encoding:'gzip-base64',data:gz.toString('base64'),jsonBytes:Buffer.byteLength(json),compressedBytes:gz.length};
const packet={simulatorVersion:'V6.7.1',simGameId:'x',seed:game.seed,away:{score:game.finalSummary.score[game.awayId]},home:{score:game.finalSummary.score[game.homeId]}};
validateReplayArchive({gameId:1,archive,packet,scheduledAway:input.away.abbreviation,scheduledHome:input.home.abbreviation});
await saveOfficialReplay({gameId:1,archive,metadata:{simulatorVersion:'V6.7.1',seed:game.seed}});
const loaded=await getOfficialReplay(1); const meta=await getReplayMetadataMap(); const one=await getReplayMetadata(1);
if (!loaded?.archive?.data || !meta['1'] || !one) throw new Error('Replay storage round-trip failed');
console.log({events:game.events.length,jsonBytes:Buffer.byteLength(json),compressed:gz.length,loaded:!!loaded?.archive?.data,meta:one});
await deleteOfficialReplay(1);
try { fs.unlinkSync('.avhl-replays.dev.json'); } catch {}
