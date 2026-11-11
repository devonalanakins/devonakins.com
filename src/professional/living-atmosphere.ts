/**
 * Living Studio procedural neural field.
 *
 * The homepage scene is drawn at the visitor's display resolution; it is not
 * a video and never simulates GitHub, editor, or Spotify events. Real source
 * status can influence only ambient brightness. Geometry is deterministic.
 */
const world=document.querySelector<HTMLElement>("[data-living-scene]");
const canvas=world?.querySelector<HTMLCanvasElement>("[data-living-canvas]");
const toggle=document.querySelector<HTMLButtonElement>("[data-motion-toggle]");
const label=toggle?.querySelector<HTMLElement>("[data-motion-label]");
const context=canvas?.getContext("2d",{alpha:true,desynchronized:true});
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
type NetworkNavigator=Navigator&{connection?:{saveData?:boolean}};
const saver=Boolean((navigator as NetworkNavigator).connection?.saveData);
type NodePoint={x:number;y:number;z:number;phase:number;tone:number;scale:number};
type Edge={from:number;to:number;curve:number;tone:number};
let state=0x1a2b3c4d;
function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
const nodes:NodePoint[]=Array.from({length:142},(_,i)=>{
  const angle=i*2.399963229728653+random()*.17;
  const radius=Math.sqrt((i+.65)/142);
  return {
    x:.535+Math.cos(angle)*radius*(.257+random()*.025),
    y:.48+Math.sin(angle)*radius*(.36+random()*.027),
    z:.16+random()*.84,
    phase:random()*Math.PI*2,
    tone:random(),
    scale:.45+random()*.95,
  };
});
const edges:Edge[]=[];
const seen=new Set<string>();
for(let i=0;i<nodes.length;i++){
  const a=nodes[i];
  const nearest=nodes.map((b,j)=>({j,dist:Math.hypot((a.x-b.x)*1.05,(a.y-b.y)*.77)+Math.abs(a.z-b.z)*.025}))
    .filter(candidate=>candidate.j!==i&&candidate.dist<.135)
    .sort((first,second)=>first.dist-second.dist).slice(0,3);
  for(const {j} of nearest){
    const key=Math.min(i,j)+":"+Math.max(i,j);
    if(seen.has(key))continue;
    seen.add(key);
    edges.push({from:i,to:j,curve:(random()-.5)*.025,tone:(a.tone+nodes[j].tone)*.5});
  }
}
const tones=["112,223,214","198,152,231","241,175,128"] as const;
let width=1,height=1,dpr=1,raf=0,lastFrame=-Infinity,clock=0;
let requested=true,pointerX=0,pointerY=0,targetX=0,targetY=0;
const isMoving=()=>requested&&!reduced.matches&&!saver&&!document.hidden;
function projected(node:NodePoint,t:number){
  const sway=t===0?0:Math.sin(t*.28+node.phase)*.0036*node.z;
  const influence=.34+.66*node.z;
  return {
    x:(node.x+sway)*width+pointerX*11*influence,
    y:(node.y+sway*.55)*height+pointerY*9*influence,
  };
}
function midpoint(a:{x:number;y:number},b:{x:number;y:number},bend:number){
  return {x:(a.x+b.x)*.5-(b.y-a.y)*bend,y:(a.y+b.y)*.5+(b.x-a.x)*bend};
}
function softLight(x:number,y:number,r:number,tone:string,alpha:number){
  if(!context)return;
  const g=context.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,"rgba("+tone+","+(alpha*.43).toFixed(3)+")");
  g.addColorStop(.25,"rgba("+tone+","+(alpha*.15).toFixed(3)+")");
  g.addColorStop(1,"rgba("+tone+",0)");
  context.fillStyle=g;
  context.fillRect(x-r,y-r,r*2,r*2);
}
function draw(t:number){
  if(!context)return;
  context.clearRect(0,0,width,height);
  const mobile=width<761;
  const nodeCount=mobile?62:nodes.length;
  const intensity=document.querySelector<HTMLElement>("[data-public-work]")?.dataset.workMode==="active"?1.18:
    document.querySelector<HTMLElement>("[data-public-spotify]")?.dataset.spotifyMode==="playing"?1.1:1;
  pointerX+=(targetX-pointerX)*.075;
  pointerY+=(targetY-pointerY)*.075;
  const points=nodes.slice(0,nodeCount).map(n=>projected(n,t));
  context.save();
  context.globalCompositeOperation="screen";

  // Translucent line-ruled terrain creates depth without painted smoke.
  const waves=mobile?9:24;
  for(let j=0;j<waves;j++){
    const baseY=(.72+j*.0105)*height;
    context.beginPath();
    for(let k=0;k<=27;k++){
      const x=(.25+k*.022)*width;
      const y=baseY+Math.sin(k*.31+j*.24+t*.14)*height*.008+
        Math.sin(k*.12+j*.34)*height*.012;
      if(k===0)context.moveTo(x,y);else context.lineTo(x,y);
    }
    context.strokeStyle="rgba("+(j%4===0?"204,138,214":"96,192,196")+","+
      (j%5===0?.09:.033)*intensity+")";
    context.lineWidth=j%6===0?.85:.4;
    context.stroke();
  }

  for(let i=0;i<edges.length;i++){
    const link=edges[i];
    if(link.from>=nodeCount||link.to>=nodeCount)continue;
    const a=points[link.from],b=points[link.to];
    const control=midpoint(a,b,link.curve);
    const near=(nodes[link.from].z+nodes[link.to].z)*.5;
    context.beginPath();context.moveTo(a.x,a.y);
    context.quadraticCurveTo(control.x,control.y,b.x,b.y);
    const tone=tones[link.tone>.68?2:link.tone>.32?1:0];
    context.strokeStyle="rgba("+tone+","+
      Math.min(.25,(.07+near*.125)*intensity).toFixed(3)+")";
    context.lineWidth=.45+near*.54;
    context.stroke();
  }

  // Long orbital paths, intentionally incomplete rather than concentric rings.
  if(!mobile){
    for(let j=0;j<7;j++){
      const top=.23+j*.082;
      context.beginPath();
      context.moveTo(width*(.29+j*.011),height*(.67-top*.19));
      context.bezierCurveTo(
        width*(.43+j*.012),height*(top*.32),
        width*(.66-j*.013),height*(.84-j*.014),
        width*(.78-j*.012),height*(.33+j*.038)
      );
      context.strokeStyle="rgba("+tones[j%3]+","+(j%3===0?.13:.056)*intensity+")";
      context.lineWidth=j%3===0?1.1:.6;
      context.stroke();
    }
  }
  for(let i=0;i<nodeCount;i++){
    const n=nodes[i],p=points[i];
    const r=mobile?.58+n.z*.65:.64+n.z*1.12*n.scale;
    const selected=i%19===0;
    if(selected)softLight(p.x,p.y,mobile?13:22,tones[i%3],.55*intensity);
    context.beginPath();context.arc(p.x,p.y,selected?r*1.65:r,0,Math.PI*2);
    context.fillStyle="rgba("+tones[n.tone>.69?2:n.tone>.35?1:0]+","+
      Math.min(.92,(selected?.81:.19+.32*n.z)*intensity).toFixed(3)+")";
    context.fill();
  }
  const focalX=.522*width+pointerX*3,focalY=.48*height+pointerY*2;
  softLight(focalX,focalY,mobile?27:57,"252,179,138",mobile?.46:.72);
  context.beginPath();context.arc(focalX,focalY,mobile?2.2:3.1,0,Math.PI*2);
  context.fillStyle="rgba(255,224,191,.90)";context.fill();

  // Sparse moving electrical impulses; never used as a fabricated live-state signal.
  if(t>0){
    for(let j=0;j<(mobile?4:10);j++){
      const e=edges[(j*29+7)%edges.length];
      if(e.from>=nodeCount||e.to>=nodeCount)continue;
      const a=points[e.from],b=points[e.to],ctrl=midpoint(a,b,e.curve);
      const u=(t*.075+j*.137)%1;
      const v=1-u;
      const x=v*v*a.x+2*v*u*ctrl.x+u*u*b.x;
      const y=v*v*a.y+2*v*u*ctrl.y+u*u*b.y;
      context.beginPath();context.arc(x,y,j%3===0?2.1:1.25,0,Math.PI*2);
      context.fillStyle="rgba("+(j%3===0?"255,214,176":"136,238,231")+","+
        (Math.sin(Math.PI*u)*.75*intensity).toFixed(3)+")";
      context.fill();
    }
  }
  context.restore();
}
function resize(){
  if(!canvas||!context)return;
  const rect=canvas.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  // Limit physical pixels instead of allowing a 4K canvas on every Retina screen.
  dpr=Math.max(1,Math.min(window.devicePixelRatio||1,2,Math.sqrt(2600000/(width*height))));
  canvas.width=Math.max(1,Math.round(width*dpr));
  canvas.height=Math.max(1,Math.round(height*dpr));
  context.setTransform(dpr,0,0,dpr,0,0);
  draw(isMoving()?clock:0);
}
function frame(timestamp:number){
  raf=0;
  if(!isMoving())return;
  raf=requestAnimationFrame(frame);
  if(timestamp-lastFrame<(width<761?50:33))return;
  lastFrame=timestamp;
  clock=timestamp*.001;
  draw(clock);
}
function sync(){
  if(!world)return;
  const running=isMoving()&&Boolean(context);
  world.dataset.motion=running?"on":"off";
  world.dataset.renderer=context?"native-canvas":"static";
  if(toggle){
    toggle.disabled=reduced.matches||saver||!context;
    toggle.setAttribute("aria-pressed",String(running));
    toggle.setAttribute("aria-label",running?"Pause background motion":
      reduced.matches||saver?"Motion disabled by device preferences":"Resume background motion");
    toggle.title=toggle.getAttribute("aria-label")||"";
  }
  if(label)label.textContent=running?"Motion on":"Motion off";
  if(raf){cancelAnimationFrame(raf);raf=0;}
  if(running)raf=requestAnimationFrame(frame);
  else draw(0);
}
toggle?.addEventListener("click",()=>{requested=!requested;sync();});
window.addEventListener("resize",resize,{passive:true});
window.addEventListener("pointermove",event=>{
  if(!isMoving()||width<761)return;
  targetX=(event.clientX/window.innerWidth-.5)*2;
  targetY=(event.clientY/window.innerHeight-.5)*2;
},{passive:true});
document.addEventListener("visibilitychange",sync);
window.addEventListener("pageshow",event=>{if(event.persisted){resize();sync();}});
reduced.addEventListener("change",sync);
if(world&&canvas){resize();sync();}
export {};
