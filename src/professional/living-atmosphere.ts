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
// Small traveling axonal currents, not radial particle circles.
const fibers=Array.from({length:49},(_,i)=>({
  x:.51+(((i*41)%127)/127)*.26,
  y:.24+(((i*67)%157)/157)*.45,
  phase:(i*.61803398875)%1,
  color:i%4===0?"233,178,111":"110,214,227",
  bend:Math.sin(i*1.23)*.13,
  drift:Math.cos(i*2.16)*(.15+(i%7)*.031),
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
  const t=timestamp*.000085;
  const count=viewW<760?19:fibers.length;
  context.save();
  context.globalCompositeOperation="screen";
  for(let i=0;i<count;i++){
    const f=fibers[i],p=(t+f.phase)%1;
    const a=Math.sin(Math.PI*p)**2;
    if(a<.02)continue;
    const curve=(position:number)=>{
      const u=1-position;
      const x=f.x*u*u+2*u*position*(f.x+f.bend)+position*position*(f.x+f.drift);
      const y=f.y*u*u+2*u*position*(f.y+.15)+position*position*(f.y+.41);
      return {x:x*viewW+pointerX*4,y:y*viewH+pointerY*3};
    };
    const head=curve(p),tail=curve(Math.max(0,p-.08));
    context.beginPath();context.moveTo(tail.x,tail.y);context.lineTo(head.x,head.y);
    context.lineWidth=i%8===0?1.5:.8;
    context.lineCap="round";
    context.strokeStyle="rgba("+f.color+","+(Math.min(.78,.48*a*intensity)).toFixed(3)+")";
    context.stroke();
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
