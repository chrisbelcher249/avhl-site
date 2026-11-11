// Generates a shareable AVHL Sportsbook image entirely on the visitor's device.
// No ticket content, virtual points, or owner information is uploaded.
const WIDTH=1080;
const MODE_LABELS={same:"SAME-GAME PARLAY",day:"ONE-DAY PARLAY",futures:"FUTURES PARLAY"};
const NO_MONEY="VIRTUAL POINTS ONLY · NO REAL MONEY OR PRIZES";

function rounded(ctx,x,y,width,height,radius,fill){
  const r=Math.min(radius,width/2,height/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+width-r,y);
  ctx.quadraticCurveTo(x+width,y,x+width,y+r);
  ctx.lineTo(x+width,y+height-r);
  ctx.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  ctx.lineTo(x+r,y+height);
  ctx.quadraticCurveTo(x,y+height,x,y+height-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
function fitText(ctx,value,maxWidth){
  const full=String(value||"");
  if(ctx.measureText(full).width<=maxWidth)return full;
  let low=0,high=full.length;
  while(low<high){
    const mid=Math.ceil((low+high)/2);
    if(ctx.measureText(full.slice(0,mid)+"…").width<=maxWidth)low=mid;
    else high=mid-1;
  }
  return full.slice(0,low).trimEnd()+"…";
}
function drawWrapped(ctx,value,x,y,maxWidth,lineHeight,maxLines=2){
  const words=String(value||"").split(/\s+/).filter(Boolean);
  let lines=[],current="";
  for(const word of words){
    const next=current?current+" "+word:word;
    if(ctx.measureText(next).width<=maxWidth)current=next;
    else{if(current)lines.push(current);current=word;}
  }
  if(current)lines.push(current);
  if(lines.length>maxLines){
    lines=lines.slice(0,maxLines);
    lines[maxLines-1]=fitText(ctx,lines[maxLines-1]+"…",maxWidth);
  }
  lines.forEach((line,i)=>ctx.fillText(fitText(ctx,line,maxWidth),x,y+i*lineHeight));
}
function loadLogo(){
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>resolve(null);
    image.src="/avhl-logo.png";
  });
}
const prettyPoints=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});

export async function renderParlayShareCard(ticket){
  if(typeof document==="undefined"||!ticket||!Array.isArray(ticket.legs)||
     ticket.legs.length<2||ticket.legs.length>8)throw Error("Invalid shareable parlay.");
  const canvas=document.createElement("canvas");
  const height=Math.max(1120,800+ticket.legs.length*132);
  canvas.width=WIDTH;canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("This browser does not support ticket images.");
  ctx.textBaseline="alphabetic";
  ctx.fillStyle="#EAF0F7";ctx.fillRect(0,0,WIDTH,height);
  ctx.fillStyle="#000B36";ctx.fillRect(0,0,WIDTH,262);
  ctx.fillStyle="#1BC5EC";ctx.fillRect(0,252,WIDTH,10);
  rounded(ctx,58,56,100,100,20,"#FFFFFF");
  const logo=await loadLogo();
  if(logo){
    const ratio=Math.min(78/logo.width,78/logo.height);
    ctx.drawImage(logo,108-logo.width*ratio/2,106-logo.height*ratio/2,
      logo.width*ratio,logo.height*ratio);
  }else{
    ctx.fillStyle="#000B36";ctx.font="900 24px Arial,sans-serif";
    ctx.textAlign="center";ctx.fillText("AVHL",108,114);ctx.textAlign="left";
  }
  ctx.fillStyle="#83DCF0";ctx.font="700 22px Arial,sans-serif";
  ctx.fillText("OFFICIAL LEAGUE PREDICTIONS",185,81);
  ctx.fillStyle="#FFFFFF";ctx.font="900 54px Arial,sans-serif";
  ctx.fillText("AVHL SPORTSBOOK",180,146);
  ctx.fillStyle="#B6C8DF";ctx.font="500 23px Arial,sans-serif";
  ctx.fillText("For the league. For the fans. For fun.",185,191);

  rounded(ctx,42,287,996,height-320,34,"#FFFFFF");
  const mode=MODE_LABELS[ticket.mode]||"PARLAY";
  ctx.fillStyle="#007DA0";ctx.font="800 22px Arial,sans-serif";
  ctx.fillText("MY PICKS",91,346);
  ctx.fillStyle="#000B36";ctx.font="900 43px Arial,sans-serif";
  ctx.fillText(mode,91,402);
  ctx.textAlign="right";ctx.fillStyle="#6B7D93";
  ctx.font="700 21px Arial,sans-serif";ctx.fillText(ticket.legs.length+" LEGS",983,346);
  let date="AVHL · 2026–27";
  if(ticket.at&&!Number.isNaN(new Date(ticket.at).getTime())){
    date=new Date(ticket.at).toLocaleDateString("en-US",{
      month:"short",day:"numeric",year:"numeric"
    }).toUpperCase()+" · AVHL";
  }
  ctx.fillText(date,983,402);ctx.textAlign="left";
  ctx.fillStyle="#DDE5EF";ctx.fillRect(92,422,896,2);

  const rowStart=460,rowHeight=124;
  ticket.legs.forEach((leg,i)=>{
    const y=rowStart+i*rowHeight;
    rounded(ctx,91,y-26,49,49,13,"#E8F4F9");
    ctx.fillStyle="#00779E";ctx.textAlign="center";
    ctx.font="900 22px Arial,sans-serif";ctx.fillText(String(i+1),115,y+6);
    ctx.textAlign="left";
    ctx.fillStyle="#000B36";ctx.font="800 27px Arial,sans-serif";
    drawWrapped(ctx,leg.label,158,y+1,595,31,2);
    ctx.fillStyle="#6B7D93";ctx.font="500 19px Arial,sans-serif";
    ctx.fillText(fitText(ctx,leg.context,640),158,y+78);
    ctx.fillStyle="#0C2851";ctx.font="900 28px Arial,sans-serif";ctx.textAlign="right";
    ctx.fillText(fitText(ctx,leg.price,195),983,y+5);
    ctx.textAlign="left";
    ctx.fillStyle="#E5EAF1";ctx.fillRect(93,y+97,894,2);
  });

  const summaryY=rowStart+ticket.legs.length*rowHeight+7;
  rounded(ctx,91,summaryY,896,224,22,"#000B36");
  ctx.fillStyle="#88DFF5";ctx.font="800 21px Arial,sans-serif";
  ctx.fillText("ILLUSTRATIVE COMBINED ODDS",123,summaryY+48);
  ctx.fillStyle="#FFFFFF";ctx.font="900 61px Arial,sans-serif";
  ctx.fillText(fitText(ctx,ticket.odds,800),123,summaryY+112);
  ctx.fillStyle="#29446C";ctx.fillRect(123,summaryY+134,832,2);
  ctx.font="700 19px Arial,sans-serif";ctx.fillStyle="#B5C6DF";
  ctx.fillText("VIRTUAL STAKE",123,summaryY+166);
  ctx.textAlign="right";ctx.fillText("IMAGINARY RETURN",956,summaryY+166);
  ctx.font="900 30px Arial,sans-serif";ctx.fillStyle="#FFFFFF";
  ctx.textAlign="left";ctx.fillText(prettyPoints(ticket.virtualPoints)+" PTS",123,summaryY+204);
  ctx.textAlign="right";ctx.fillText(prettyPoints(ticket.potentialPoints)+" PTS",956,summaryY+204);
  ctx.textAlign="center";
  ctx.fillStyle="#526781";ctx.font="800 19px Arial,sans-serif";
  ctx.fillText(NO_MONEY,540,height-81);
  ctx.fillStyle="#75869B";ctx.font="500 17px Arial,sans-serif";
  ctx.fillText(ticket.previouslyVerified?
    "Includes previous verified market prices · Updating · avhl.org/odds":
    "Model-based picks · Joint outcomes may be correlated · avhl.org/odds",540,height-50);
  ctx.textAlign="left";
  const blob=await new Promise((resolve,reject)=>{
    canvas.toBlob(value=>value?resolve(value):reject(Error("Unable to generate ticket image.")),"image/png");
  });
  return {blob,filename:"avhl-sportsbook-"+(ticket.mode||"parlay")+"-"+ticket.legs.length+"-leg.png"};
}
