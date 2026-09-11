import {evaluate,fk,report,csv,MODEL,VERSION} from './model.mjs';
const $=id=>document.getElementById(id), canvas=$('cell'),ctx=canvas.getContext('2d');
let result, index=0, selected=null, raf=null, startTime=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if ($('model-version')) $('model-version').textContent = VERSION;
function stop(){if(raf!==null)cancelAnimationFrame(raf);raf=null;$('play').textContent='Play checked sequence';}
function draw(){
  if(!ctx)return;
  const style=getComputedStyle(document.documentElement),c=n=>style.getPropertyValue(n).trim();
  ctx.fillStyle=c('--panel');ctx.fillRect(0,0,780,590);
  const px=p=>({x:155+p.x*1.35,y:525-p.y*1.35});
  ctx.lineWidth=1;ctx.strokeStyle=c('--grid');ctx.font='12px monospace';ctx.fillStyle=c('--muted');
  for(let x=-100;x<=400;x+=50){const p=px({x,y:0});ctx.beginPath();ctx.moveTo(p.x,20);ctx.lineTo(p.x,550);ctx.stroke();ctx.fillText(String(x),p.x-8,575);}
  for(let y=0;y<=350;y+=50){const p=px({x:-100,y});ctx.beginPath();ctx.moveTo(20,p.y);ctx.lineTo(755,p.y);ctx.stroke();ctx.fillText(String(y),22,p.y-5);}
  const base=px({x:0,y:0});ctx.strokeStyle=c('--line');ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(base.x,base.y,400*1.35,Math.PI,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
  if(result.obstacle){const o=result.obstacle,p=px({x:o.x,y:o.y+o.h});ctx.fillStyle=c('--fail')+'33';ctx.fillRect(p.x,p.y,o.w*1.35,o.h*1.35);ctx.strokeStyle=c('--fail');ctx.strokeRect(p.x,p.y,o.w*1.35,o.h*1.35);ctx.fillStyle=c('--fail');ctx.fillText('EQUIPMENT',p.x-15,p.y-10);}
  if(result.ok){ctx.strokeStyle=c('--accent');ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();result.samples.forEach((s,i)=>{const p=px(fk(s.q).tip);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();ctx.setLineDash([]);}
  const q=selected||result.samples[index]?.q||result.rows.find(r=>r.solutions.length)?.solutions[0];
  if(q){const points=fk(q).points.map(px);ctx.strokeStyle=c('--ink');ctx.lineWidth=MODEL.radius*2*1.35;ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();points.forEach(p=>{ctx.fillStyle=c('--panel');ctx.beginPath();ctx.arc(p.x,p.y,5,0,2*Math.PI);ctx.fill();});}
  const seen=new Set();result.rows.forEach((r,i)=>{const p=px(r),key=`${r.x}/${r.y}`;ctx.strokeStyle=c(r.solutions.length?'--pass':'--fail');ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,7,0,2*Math.PI);ctx.moveTo(p.x,p.y+9);ctx.lineTo(p.x,p.y+21);ctx.stroke();if(!seen.has(key)){ctx.fillStyle=c('--ink');ctx.fillText(`${i+1}${i===3?' / 6':''} ${r.name}`,p.x+12,p.y-10);}seen.add(key);});
  ctx.fillStyle=c('--ink');ctx.fillText('BASE',base.x-15,base.y+25);
}
function displayFrame(){selected=null;const s=result.samples[index];$('scrub').value=String(index);$('frame').textContent=s?`${s.t.toFixed(2)} s · ${result.rows[s.leg-1].name} → ${result.rows[s.leg].name}`:'No passing sequence';draw();}
function update(){
  stop();index=0;selected=null;result=evaluate(Number($('fixture').value),$('obstacle').checked);
  $('fixture-value').textContent=`${result.fixtureX} mm`;$('status').textContent=result.ok?'Sampled sequence passes':'Revise this layout';$('status').className=result.ok?'pass':'fail';
  $('reason').textContent=result.reason+(result.failedLeg!==null?` · blocked by ${result.rows[result.failedLeg].name} or its incoming motion.`:'.');
  $('coverage').textContent=`${result.rows.filter(r=>r.solutions.length).length} / 6`;
  $('duration').textContent=result.ok?`${result.duration.toFixed(2)} s`:'Not available';$('clearance').textContent=result.ok?`${result.minimum.toFixed(1)} mm`:'Not available';$('samples').textContent=String(result.samples.length);
  $('csv').disabled=!result.ok;$('play').disabled=!result.ok||reduced.matches;$('play').title=reduced.matches?'Reduced motion is enabled. Use the sample slider.':'';
  $('scrub').disabled=!result.ok;$('scrub').max=String(Math.max(0,result.samples.length-1));$('poses').replaceChildren();
  result.rows.forEach((r,i)=>{const tr=document.createElement('tr');const td=document.createElement('td'),b=document.createElement('button');b.textContent=`${i+1}. ${r.name}`;b.disabled=!r.solutions.length;b.addEventListener('click',()=>{stop();selected=r.solutions[0];$('frame').textContent=`Inspecting ${r.name} · first valid IK branch (not necessarily the planned branch)`;draw();});td.append(b);tr.append(td);[`${r.x} / ${r.y}`,String(r.solutions.length),r.status].forEach((text,j)=>{const cell=document.createElement('td');cell.textContent=text;if(j===2)cell.className=r.solutions.length?'pass':'fail';tr.append(cell);});$('poses').append(tr);});
  $('comparison').replaceChildren();$('comparison-note').textContent='Evaluate the same task from 140 to 360 mm, with the current obstacle setting. Passing layouts can be loaded below.';displayFrame();
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('fixture').addEventListener('input',update);$('obstacle').addEventListener('change',update);
$('baseline').addEventListener('click',()=>{$('fixture').value='220';$('obstacle').checked=true;update();});
$('clear').addEventListener('click',()=>{$('fixture').value='140';update();});
$('scrub').addEventListener('input',()=>{stop();index=Number($('scrub').value);displayFrame();});
$('play').addEventListener('click',()=>{if(raf!==null){stop();return;}selected=null;index=0;startTime=performance.now();$('play').textContent='Pause';const tick=now=>{const t=(now-startTime)/1000;while(index<result.samples.length-1&&result.samples[index+1].t<=t)index++;displayFrame();if(index>=result.samples.length-1){stop();return;}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',update);
$('json').addEventListener('click',()=>download('workcell-report.json',JSON.stringify(report(result),null,2),'application/json'));
$('csv').addEventListener('click',()=>{if(result.ok)download('workcell-path.csv',csv(result),'text/csv');});
$('compare').addEventListener('click',()=>{const rs=Array.from({length:12},(_,i)=>evaluate(140+i*20,$('obstacle').checked));$('comparison').replaceChildren();rs.forEach(r=>{const b=document.createElement('button');b.textContent=`${r.fixtureX} mm · ${r.ok?r.duration.toFixed(2)+' s':'blocked'}`;b.className=r.ok?'pass':'fail';b.addEventListener('click',()=>{$('fixture').value=String(r.fixtureX);update();});$('comparison').append(b);});$('comparison-note').textContent=`${rs.filter(r=>r.ok).length} / 12 layouts pass the sampled sequence. Times are motion-only estimates, not measured cycle times. Select any layout to inspect its diagnosis.`;});
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';draw();});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,button,summary,a')) return;
  if(e.key==='ArrowRight'&&result?.ok){e.preventDefault();stop();index=Math.min(result.samples.length-1,index+1);displayFrame();}
  if(e.key==='ArrowLeft'&&result?.ok){e.preventDefault();stop();index=Math.max(0,index-1);displayFrame();}
  if((e.key===' '||e.key==='Enter')&&result?.ok&&!reduced.matches){e.preventDefault();$('play').click();}
});
if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';
update();
