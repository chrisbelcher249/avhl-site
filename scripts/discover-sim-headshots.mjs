/**
 * Discover properly attributed player images from Wikidata P18 and Commons.
 *
 * Strong match: exact AVHL player name + verified birthdate + Wikidata
 * picture + Commons API license/artist. No fuzzy name-only acceptance.
 * Run: HEADSHOT_LIMIT=80 node scripts/discover-sim-headshots.mjs
 * HEADSHOT_LIMIT=0 selects all 1908 players; HEADSHOT_COMMIT controls git
 * in the workflow rather than this script.
 */
import fs from "node:fs";

const input = JSON.parse(fs.readFileSync("data/headshot-roster-index.json", "utf8"));
const manifestPath = "public/sim/headshots.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const users = input.players;
if (input.count !== 1908 || users.length !== 1908) throw new Error("AVHL roster index must have exactly 1908 players");

const limit = Number(process.env.HEADSHOT_LIMIT || 0);
const selected = limit > 0 ? users.slice(0, Math.min(limit, users.length)) : users;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const chunks = (array, size) => { const out=[]; for(let i=0;i<array.length;i+=size)out.push(array.slice(i,i+size)); return out; };
const clean = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const eligibleTitle = value => clean(String(value||"").replace(/\s*\((ice hockey|ice hockey player|hockey player|goaltender)\)\s*$/i,""));
const suffixes = ["", " (ice hockey)", " (ice hockey player)", " (hockey player)"];
const bannedNames = new Set(users.map(x=>clean(x.name)).filter((n,_,array)=>array.indexOf(n)!==array.lastIndexOf(n)));
const byName = new Map();
for(const p of selected) {
  const key=clean(p.name);
  const arr=byName.get(key)||[];
  arr.push(p);
  byName.set(key,arr);
}

async function getJSON(base, params, retries=3) {
  const url = base+"?"+new URLSearchParams({...params, format:"json", formatversion:"2"}).toString();
  for(let retry=0;retry<=retries;retry++){
    try{
      const r=await fetch(url,{
        headers:{"User-Agent":"AVHLHeadshots/0.2 (github.com/chrisbelcher249/avhl-site; CC-attributed player thumbnails)","Accept":"application/json"},
        signal:AbortSignal.timeout(25000)
      });
      if(!r.ok)throw new Error("HTTP "+r.status+" for "+base);
      const data=await r.json();
      if(data.error)throw new Error("Wiki API error "+JSON.stringify(data.error).slice(0,180));
      return data;
    }catch(err){
      if(retry===retries)throw err;
      await pause(800*Math.pow(2,retry));
    }
  }
}
const wdApi="https://www.wikidata.org/w/api.php";
const commonsApi="https://commons.wikimedia.org/w/api.php";
const candidates=new Map();
let checked=0, collisions=0, missingImage=0, unmatched=0, invalidDates=0, apiCalls=0, matchNames=0;
const uniqueTitles=[...new Set(selected.map(p=>p.name))];

for (const suffix of suffixes) {
  const remaining=uniqueTitles.filter(n=>!(candidates.has(clean(n))));
  if(!remaining.length)break;
  console.log("Looking for Wikidata player pages, pass "+JSON.stringify(suffix||"exact")+", remaining "+remaining.length);
  for(const names of chunks(remaining,35)) {
    const titles=names.map(n=>n+suffix);
    const data=await getJSON(wdApi,{action:"wbgetentities",sites:"enwiki",titles:titles.join("|"),props:"claims|sitelinks|descriptions",languages:"en"});
    apiCalls++;
    for(const item of Object.values(data.entities||{})){
      if(!item?.id || item.missing || !item.sitelinks?.enwiki?.title)continue;
      const pageTitle=item.sitelinks.enwiki.title;
      const nameKey=eligibleTitle(pageTitle);
      if(!byName.has(nameKey)||candidates.has(nameKey))continue;
      // Avoid misleading matches to unrelated professions sharing a name.
      const description=String(item.descriptions?.en?.value||"");
      if(description && !/(ice hockey|hockey player|goaltender|ice-hockey)/i.test(description))continue;
      const dates=(item.claims?.P569||[]).map(claim=>claim?.mainsnak?.datavalue?.value)
        .filter(v=>v?.time && Number(v.precision)>=11).map(v=>v.time.slice(1,11));
      if(!dates.length){invalidDates++;continue;}
      const matching=byName.get(nameKey).filter(p=>dates.includes(p.birth));
      if(!matching.length)continue;
      const image=(item.claims?.P18||[]).map(q=>q?.mainsnak?.datavalue?.value).find(v=>typeof v==="string");
      if(!image){missingImage++;continue;}
      // Namesakes may share an AVHL full name, but never assign the image to
      // the wrong player ID: the actual birthdate is the identity check.
      candidates.set(nameKey,{item,image,matched:matching});
      matchNames++;
    }
    await pause(130);
  }
}
const titlesToCheck=[...new Set([...candidates.values()].map(x=>"File:"+x.image))];
console.log("Matched "+matchNames+" Wikidata identities with P18; checking licensing for "+titlesToCheck.length+" Commons images.");

const infoByFile=new Map();
for(const titles of chunks(titlesToCheck,35)){
  const data=await getJSON(commonsApi,{action:"query",prop:"imageinfo",titles:titles.join("|"),iiprop:"url|mime|extmetadata",iiurlwidth:"128"});
  apiCalls++;
  for(const page of (data.query?.pages||[])){
    const info=page.imageinfo?.[0];
    if(!info||!page.title)continue;
    infoByFile.set(page.title.replace(/^File:/i,"").replace(/_/g, " ").normalize("NFC"),info);
  }
  await pause(130);
}
const strip = str => String(str||"").replace(/<[^>]*>/g," ")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&nbsp;/g," ")
  .replace(/\s+/g," ").trim();
function licensed(info,filename){
  const md=info?.extmetadata||{};
  const label=strip(md.LicenseShortName?.value),rawLicense=strip(md.LicenseUrl?.value);
  const licenseAllowed=/^CC BY(?:-SA)?(?:\s|$)/i.test(label)||/^CC0(?:\s|$)/i.test(label);
  if(!licenseAllowed || !rawLicense.startsWith("https://creativecommons.org/"))return null;
  const artist=strip(md.Artist?.value||md.Attribution?.value||md.Credit?.value);
  if(!artist || artist.length>220 || artist.toLowerCase()==="unknown")return null;
  if(!["image/jpeg","image/png","image/webp"].includes(info.mime))return null;
  const url=String(info.thumburl||info.url||"");
  if(!url.startsWith("https://upload.wikimedia.org/"))return null;
  const source="https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(filename.replace(/ /g,"_"));
  return {url,author:artist,license:label,licenseUrl:rawLicense,source,
    note:"Auto-matched by name and exact birthdate; displayed as a cropped thumbnail.",matchMethod:"wikidata-p18-dob"};
}
manifest.playerIds ||= {};
let added=0,licenseSkipped=0,already=0;
for(const candidate of candidates.values()) {
  const canonicalName = x => String(x || "").replace(/_/g, " ").normalize("NFC");
  const info=infoByFile.get(candidate.image) || infoByFile.get(canonicalName(candidate.image));
  if(!info){licenseSkipped++;if(licenseSkipped<=7)console.log("Image metadata unavailable for "+candidate.image);continue;}
  const entry=licensed(info,candidate.image);
  if(!entry){
    licenseSkipped++;
    if(licenseSkipped<=9) {
      const md=info.extmetadata||{};
      console.log("Rejected Commons image",JSON.stringify({
        filename:candidate.image,mime:info.mime,
        license:md.LicenseShortName?.value,licenseUrl:md.LicenseUrl?.value,
        artist:String(md.Artist?.value||"").slice(0,170),
        thumburl:String(info.thumburl||"").slice(0,145),
        url:String(info.url||"").slice(0,145)
      }));
    }
    continue;
  }
  for(const player of candidate.matched) {
    if(manifest.playerIds[player.id] || Object.hasOwn(manifest.players||{},player.name)){already++;continue;}
    manifest.playerIds[player.id]={...entry,name:player.name,birthdate:player.birth};
    added++;
  }
}
const remaining=selected.filter(p=>!manifest.playerIds[p.id]&&!Object.hasOwn(manifest.players||{},p.name));
const coverage=users.filter(p=>manifest.playerIds[p.id]||Object.hasOwn(manifest.players||{},p.name));
const report={
  examined:selected.length,totalPlayers:users.length,
  matchedWikidataNames:matchNames,licensedCandidates:added,
  preexistingManualPhotos:Object.keys(manifest.players||{}).length,
  byIdPhotos:Object.keys(manifest.playerIds).length,
  allCoveredPlayers:coverage.length,coveragePercent:Number((100*coverage.length/users.length).toFixed(1)),
  ambiguousDuplicateNameGroups:bannedNames.size,
  licenseOrImageUnavailable:licenseSkipped,already,missingImage,invalidDates,apiCalls,
  notMatchedInThisPass:remaining.length,
  outstanding:remaining.map(p=>({id:p.id,name:p.name,birth:p.birth,league:p.league}))
};
if(added>0)fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
fs.writeFileSync(process.env.HEADSHOT_REPORT||"headshot-discovery-report.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,outstanding:remaining.slice(0,20)},null,2));
