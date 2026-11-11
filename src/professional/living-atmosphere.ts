/**
 * Cinematic visual atmosphere. The film is purely decorative, not a data source.
 * Dynamic status remains in the existing public GitHub/Spotify/work projections.
 * Only the color/intensity of ambient light may react to validated DOM states.
 */
const world=document.querySelector<HTMLElement>("[data-living-scene]");
const canvas=world?.querySelector<HTMLCanvasElement>("[data-living-canvas]");
const video=world?.querySelector<HTMLVideoElement>("[data-living-video]");
const toggle=document.querySelector<HTMLButtonElement>("[data-motion-toggle]");
const label=toggle?.querySelector<HTMLElement>("[data-motion-label]");
const context=canvas?.getContext("2d",{alpha:true});
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
type NavigatorWithConnection = Navigator & {connection?:{saveData?:boolean}};
const saver=Boolean((navigator as NavigatorWithConnection).connection?.saveData);
let requested=true,scheduled=0,lastFrame=-Infinity;
let viewW=0,viewH=0,pointerX=0,pointerY=0;
const points=Array.from({length:38},(_,i)=>({
  x:((i*191+37)%1019)/1019,
  y:((i*i*71+47)%931)/931,
  phase:(i*0.61803398875)%1,
  radius:i%7===0?2.4:1.1,
}));
const active=()=>requested&&!reduced.matches&&!saver&&!document.hidden;
function resize(){
  if(!canvas||!context)return;
  const rect=canvas.getBoundingClientRect();
  viewW=Math.max(1,rect.width);viewH=Math.max(1,rect.height);
  const pixel=Math.min(devicePixelRatio||1,viewW<760?1.15:1.45);
  canvas.width=Math.max(1,Math.ceil(viewW*pixel));
  canvas.height=Math.max(1,Math.ceil(viewH*pixel));
  context.setTransform(pixel,0,0,pixel,0,0);
}
function draw(timestamp:number){
  scheduled=0;
  if(!context||!active())return;
  scheduled=requestAnimationFrame(draw);
  if(timestamp-lastFrame<33)return; // 30fps maximum, never compete with the UI.
  lastFrame=timestamp;
  context.clearRect(0,0,viewW,viewH);
  const work=document.querySelector<HTMLElement>("[data-public-work]");
  const playback=document.querySelector<HTMLElement>("[data-public-spotify]");
  const observed=work?.dataset.workMode==="active";
  const listening=playback?.dataset.spotifyMode==="playing";
  const intensity=observed?1.3:listening?1.16:1;
  const t=timestamp*.000065;
  const dx=pointerX*10,dy=pointerY*8;
  const centerX=viewW*.56+dx,centerY=viewH*.58+dy;
  // First-party energy nodes are a visual metaphor, not invented telemetry.
  const count=viewW<760?17:points.length;
  context.save();
  context.globalCompositeOperation="screen";
  for(let i=0;i<count;i++){
    const p=points[i];
    const orbit=t*Math.PI*2+p.phase*Math.PI*2;
    const x=centerX+(p.x-.5)*viewW*.86+Math.sin(orbit)*12;
    const y=centerY+(p.y-.5)*viewH*.65+Math.cos(orbit*.83)*10;
    const wave=.42+.58*(.5+.5*Math.sin(orbit*2));
    const color=i%3?"100,211,221":"244,184,116";
    const r=(p.radius+1.3*wave)*(viewW<760?.74:1);
    const glow=context.createRadialGradient(x,y,0,x,y,r*7);
    glow.addColorStop(0,"rgba("+color+","+(0.24*wave*intensity).toFixed(3)+")");
    glow.addColorStop(1,"rgba("+color+",0)");
    context.fillStyle=glow;
    context.beginPath();context.arc(x,y,r*7,0,Math.PI*2);context.fill();
    context.fillStyle="rgba("+color+","+(0.34*wave*intensity).toFixed(3)+")";
    context.beginPath();context.arc(x,y,r*.38,0,Math.PI*2);context.fill();
  }
  context.restore();
}
function sync(){
  if(!world)return;
  const playing=active();
  world.dataset.motion=playing?"on":"off";
  if(toggle){
    toggle.disabled=reduced.matches||saver;
    toggle.setAttribute("aria-pressed",String(playing));
    toggle.setAttribute("aria-label",playing?"Pause background motion":
      reduced.matches||saver?"Motion disabled by device preferences":"Resume background motion");
    toggle.title=toggle.getAttribute("aria-label")||"";
  }
  if(label)label.textContent=playing?"Motion on":"Motion off";
  if(!playing){
    cancelAnimationFrame(scheduled);scheduled=0;
    context?.clearRect(0,0,viewW,viewH);
    video?.pause();
  }else{
    // A failed decode/autoplay must not affect navigation or source feeds.
    if(video)void video.play().catch(()=>{world.dataset.video="unavailable";});
    if(!scheduled&&context)scheduled=requestAnimationFrame(draw);
  }
}
toggle?.addEventListener("click",()=>{requested=!requested;sync();});
window.addEventListener("resize",resize,{passive:true});
window.addEventListener("pointermove",event=>{
  if(!active()||viewW<760)return;
  pointerX=(event.clientX/window.innerWidth-.5)*2;
  pointerY=(event.clientY/window.innerHeight-.5)*2;
},{passive:true});
document.addEventListener("visibilitychange",sync);
window.addEventListener("pageshow",event=>{if(event.persisted){resize();sync();}});
reduced.addEventListener("change",sync);
video?.addEventListener("error",()=>{if(world)world.dataset.video="unavailable";});
if(world&&canvas){resize();sync();}
export {};
