import {GET as readSeason} from "../season/route.js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const GITHUB="https://api.github.com/repos/chrisbelcher249/avhl-site/actions";
const headers={"Accept":"application/vnd.github+json","User-Agent":"AVHL-Odds-Status"};
async function githubJSON(path){
 const response=await fetch(GITHUB+path,{
   headers,next:{revalidate:90},signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw new Error("GitHub status returned HTTP "+response.status);
 return response.json();
}
async function workflowStatus(filename){
 const result=await githubJSON("/workflows/"+filename+"/runs?per_page=6");
 const runs=result.workflow_runs||[];
 // Prefer the currently active calculation to a newly queued refresh.
 const run=runs.find(r=>r.status==="in_progress")||
   runs.find(r=>r.status==="queued")||runs[0];
 if(!run)return {status:"never-run",jobs:null,url:null};
 const resultJobs=await githubJSON("/runs/"+run.id+"/jobs?per_page=100");
 const jobs=resultJobs.jobs||[];
 const counts={success:0,failed:0,running:0,queued:0,cancelled:0,other:0};
 for(const job of jobs){
   if(job.status==="completed"&&job.conclusion==="success")counts.success++;
   else if(job.status==="completed"&&job.conclusion==="failure")counts.failed++;
   else if(job.status==="in_progress")counts.running++;
   else if(job.status==="queued"||job.status==="waiting")counts.queued++;
   else if(job.conclusion==="cancelled")counts.cancelled++;
   else counts.other++;
 }
 return {
   status:run.status,conclusion:run.conclusion,
   runId:run.id,runAttempt:run.run_attempt,
   startedAt:run.run_started_at||run.created_at,
   updatedAt:run.updated_at,
   url:run.html_url,
   totalJobs:resultJobs.total_count||jobs.length,
   reportedJobs:jobs.length,
   counts,
   recentFailures:jobs.filter(j=>j.conclusion==="failure")
     .slice(0,3).map(j=>({name:j.name,url:j.html_url}))
 };
}
export async function GET(){
 const [season,game,futures]=await Promise.allSettled([
   readSeason().then(async response=>({httpStatus:response.status,...await response.json()})),
   workflowStatus("refresh-v7-odds.yml"),
   workflowStatus("refresh-v7-futures.yml")
 ]);
 const result={
   ok:true,
   checkedAt:new Date().toISOString(),
   season:season.status==="fulfilled"?season.value:{ok:false,status:"unavailable"},
   gameWorkflow:game.status==="fulfilled"?game.value:{status:"unavailable",url:"https://github.com/chrisbelcher249/avhl-site/actions/workflows/refresh-v7-odds.yml"},
   futuresWorkflow:futures.status==="fulfilled"?futures.value:{status:"unavailable",url:"https://github.com/chrisbelcher249/avhl-site/actions/workflows/refresh-v7-futures.yml"}
 };
 return Response.json(result,{headers:{"Cache-Control":"no-store"}});
}
