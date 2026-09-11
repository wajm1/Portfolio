// Deterministic 3R planar workcell model. Units: mm, radians, seconds.
// No hardware connection. Discrete motion checks are not continuous guarantees.
export const VERSION = '1.0.0';
export const RAD = Math.PI / 180;
export const MODEL = Object.freeze({ lengths: [180, 150, 70], limits: [170, 150, 170], radius: 8, step: 1, speed: 60 });
export const norm = a => Math.atan2(Math.sin(a), Math.cos(a));
export function fk(q) {
  let a = 0; const p = [{x:0,y:0}];
  q.forEach((v,i) => { a += v; p.push({x:p[i].x+MODEL.lengths[i]*Math.cos(a), y:p[i].y+MODEL.lengths[i]*Math.sin(a)}); });
  return {points:p, tip:p[3], angle:norm(a)};
}
export function ik(pose) {
  const [a,b,c] = MODEL.lengths, phi=pose.phi*RAD;
  const x=pose.x-c*Math.cos(phi), y=pose.y-c*Math.sin(phi);
  const d=(x*x+y*y-a*a-b*b)/(2*a*b);
  if (!Number.isFinite(d) || Math.abs(d)>1+1e-10) return [];
  const e=Math.acos(Math.max(-1,Math.min(1,d)));
  return (e<1e-9 ? [e] : [e,-e]).map(q2 => {
    const q1=Math.atan2(y,x)-Math.atan2(b*Math.sin(q2),a+b*Math.cos(q2));
    return [norm(q1),q2,norm(phi-q1-q2)];
  }).filter(q=>q.every((v,i)=>Math.abs(v)<=MODEL.limits[i]*RAD+1e-10));
}
function pointDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function cross(a,b,c) {return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
export function segmentDistance(a,b,c,d) {
  const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),z=cross(c,d,b);
  if (((u>0&&v<0)||(u<0&&v>0))&&((w>0&&z<0)||(w<0&&z>0))) return 0;
  return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
export function clearance(q, obstacle) {
  const p=fk(q).points;
  let value=segmentDistance(p[0],p[1],p[2],p[3])-2*MODEL.radius;
  let reason='self-collision';
  if (obstacle) {
    const {x,y,w,h}=obstacle;
    const corners=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
    for(let j=0;j<3;j++) {
      const inside=p.slice(j,j+2).some(a=>a.x>=x&&a.x<=x+w&&a.y>=y&&a.y<=y+h);
      const dist=inside ? -MODEL.radius : Math.min(...corners.map((a,i)=>segmentDistance(p[j],p[j+1],a,corners[(i+1)%4])))-MODEL.radius;
      if(dist<value) { value=dist; reason='obstacle'; }
    }
  }
  return {value,reason};
}
export function edge(a,b,obstacle) {
  // Interpolate bounded joint coordinates directly, never wrap through a limit.
  const delta=b.map((v,i)=>v-a[i]);
  const n=Math.max(1,Math.ceil(Math.max(...delta.map(Math.abs))/(MODEL.step*RAD)));
  const duration=Math.max(...delta.map(Math.abs))/(MODEL.speed*RAD);
  const samples=[]; let minimum=Infinity;
  for(let i=0;i<=n;i++) {
    const q=a.map((v,j)=>v+delta[j]*i/n), c=clearance(q,obstacle);
    minimum=Math.min(minimum,c.value);
    samples.push({q,t:duration*i/n});
    if(c.value<=0) return {ok:false,reason:c.reason,samples,minimum,duration};
  }
  return {ok:true,samples,minimum,duration};
}
export function task(fixtureX=220) {
  if(!Number.isFinite(fixtureX)||fixtureX<100||fixtureX>360) throw new RangeError('Fixture x must be 100–360 mm');
  return [
    {name:'Ready',x:80,y:230,phi:-90}, {name:'Pick',x:120,y:100,phi:-90},
    {name:'Lift',x:120,y:170,phi:-90}, {name:'Approach',x:fixtureX,y:170,phi:-90},
    {name:'Place',x:fixtureX,y:100,phi:-90}, {name:'Retract',x:fixtureX,y:170,phi:-90}
  ];
}
export function evaluate(fixtureX=220,withObstacle=true) {
  const poses=task(fixtureX), obstacle=withObstacle?{x:160,y:120,w:35,h:65}:null;
  const rows=poses.map(p=>{
    const solutions=ik(p), valid=solutions.filter(q=>clearance(q,obstacle).value>0);
    return {...p,solutions:valid,status:!solutions.length?'unreachable / joint limit':!valid.length?'collision at pose':'reachable'};
  });
  // Dynamic programming across both elbow branches, minimizing joint-speed time
  // only among collision-free sampled straight joint-space transitions.
  let states=rows[0].solutions.map(q=>({q,cost:0,path:[q],segments:[]}));
  let failedLeg=null;
  for(let i=1;i<rows.length;i++) {
    const next=[];
    for(const q of rows[i].solutions) {
      let best=null;
      for(const prev of states) {
        const e=edge(prev.q,q,obstacle);
        if(e.ok&&(!best||prev.cost+e.duration<best.cost)) best={q,cost:prev.cost+e.duration,path:[...prev.path,q],segments:[...prev.segments,e]};
      }
      if(best) next.push(best);
    }
    if(!next.length) {failedLeg=i;states=[];break;}
    states=next;
  }
  const best=states.sort((a,b)=>a.cost-b.cost)[0];
  const samples=[];let offset=0;
  if(best) best.segments.forEach((e,i)=>{e.samples.forEach((s,j)=>{if(i&&j===0)return;samples.push({t:offset+s.t,q:s.q,leg:i+1});});offset+=e.duration;});
  return {version:VERSION,fixtureX,obstacle,model:MODEL,rows,ok:!!best,failedLeg,
    reason:best?'Sampled sequence passes':rows.find(r=>r.status!=='reachable')?.status||'No sampled direct transition through all poses',
    path:best?.path||[],samples,duration:best?.cost??null,
    minimum:best?Math.min(...best.segments.map(e=>e.minimum)):null};
}
export function report(r) {
  return {version:r.version,units:{length:'mm',angle:'rad',time:'s'},fixtureX:r.fixtureX,obstacle:r.obstacle,model:r.model,
    passed:r.ok,reason:r.reason,failedLeg:r.failedLeg,poses:r.rows.map(({solutions,...p})=>({...p,validBranches:solutions.length})),
    duration:r.duration,minimumSampledClearance:r.minimum,sampleCount:r.samples.length,
    assumptions:['3R planar model, not the xArm or RX-200','1 degree maximum per-joint sample spacing','Straight joint-space transitions, no detour search','60 deg/s joint-speed cap, no acceleration, load or dwell model','No grasp, payload, ground, cables or continuous collision certification']};
}
export function csv(r) {
  if(!r.ok) throw new Error('Cannot export a failed sequence');
  return 'time_s,leg,q1_rad,q2_rad,q3_rad,tcp_x_mm,tcp_y_mm,tool_angle_rad\n'+r.samples.map(s=>{
    const f=fk(s.q);return [s.t,s.leg,...s.q,f.tip.x,f.tip.y,f.angle].map(v=>Number(v).toFixed(6)).join(',');
  }).join('\n');
}
