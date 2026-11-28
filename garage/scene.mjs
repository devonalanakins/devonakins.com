// Review-only procedural room. No camera, microphone, account, network API or telemetry.
const presets = Object.freeze({
  control: {position:[7,4.6,8],target:[0,1,-2.8],description:"Control room — a proposed home for development and live sessions."},
  podcast: {position:[5.6,3.8,7],target:[0,1.2,-.2],description:"Podcast studio — a proposed recording and conversation space."},
  research: {position:[5,3.2,3.8],target:[3.5,1.4,-3.2],description:"Research lab — a conceptual compute and scientific work area."},
  workshop: {position:[-2,3.1,5],target:[-3.7,1,-2.3],description:"Workshop — a proposed workbench for making and repairing."},
  library: {position:[-1,3.2,4],target:[-3.7,1.5,-4],description:"Library — an imagined area for reading and writing."},
  recreation: {position:[.8,3.6,6],target:[-3.1,.8,2.4],description:"Personal interests — hobbies such as chess and other games, not a separate show."}
});
const host=document.querySelector("#canvas-host");
const viewport=document.querySelector("#viewport");
const enable=document.querySelector("#enable");
const disable=document.querySelector("#disable");
const status=document.querySelector("#mode-status");
const description=document.querySelector("#zone-description");
const buttons=[...document.querySelectorAll("[data-zone]")];
let selected="podcast", active=null, generation=0;
enable.hidden=false;
function select(zone){
  if(!Object.hasOwn(presets,zone)) return;
  selected=zone;
  for(const button of buttons) button.setAttribute("aria-pressed",String(button.dataset.zone===zone));
  description.textContent=presets[zone].description;
  active?.move(zone);
}
function stop(message="Illustration mode. No live recording."){
  generation++;
  if(active){active.dispose();active=null;}
  host.replaceChildren();
  viewport.classList.remove("is-3d");
  enable.hidden=false;enable.disabled=false;disable.hidden=true;
  for(const button of buttons) button.disabled=true;
  status.textContent=message;
}
async function start(){
  if(active||enable.disabled)return;
  const ticket=++generation;
  enable.disabled=true;
  status.textContent="Loading the optional 3D model…";
  let renderer,controls,observer,scene;
  try{
    const [THREE,{OrbitControls}]=await Promise.all([import("three"),import("three/addons/controls/OrbitControls.js")]);
    if(ticket!==generation)return;
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.setClearColor(0x111719);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(48,1,.1,60);
    const mat=(color,roughness=.8,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
    const wall=mat(0x3f4848),dark=mat(0x212b2e),metal=mat(0x66706f,.42,.5),wood=mat(0x927456),floor=mat(0x555c59),screen=new THREE.MeshStandardMaterial({color:0x193d40,emissive:0x386b69,emissiveIntensity:.48,roughness:.35});
    const warm=new THREE.MeshStandardMaterial({color:0xffe1ad,emissive:0xe9b675,emissiveIntensity:2});
    const green=new THREE.MeshStandardMaterial({color:0x9bb5a0,emissive:0x75bd93,emissiveIntensity:.6});
    const box=(x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);scene.add(mesh);return mesh;};
    box(0,-.12,0,10,.24,10,floor);box(0,2,-5,10,4,.2,wall);box(-5,2,0,.2,4,10,wall);
    // Open front/right for a readable model; conceptual geometry only.
    for(let i=-4;i<=4;i++){box(i,.005,0,.012,.012,10,dark);box(0,.006,i,10,.012,.012,dark);}
    for(let y=1;y<4;y+=.7)box(0,y,-4.86,9.8,.025,.025,metal);
    const table=(x,z,w,d)=>{box(x,1.05,z,w,.14,d,wood);for(const dx of [-1,1])for(const dz of [-1,1])box(x+dx*(w/2-.12),.52,z+dz*(d/2-.12),.09,1.04,.09,metal);};
    table(0,-3.8,3.6,1.25);
    for(const x of [-.85,.85]){box(x,1.77,-4.15,1.37,.84,.13,dark);box(x,1.77,-4.07,1.25,.71,.03,screen);box(x,1.31,-4.1,.10,.24,.12,metal);box(x,1.17,-4.05,.55,.05,.36,metal);for(let n=0;n<4;n++)box(x-.20,1.60+n*.10,-4.045,.65-n*.09,.018,.015,green);}
    box(0,1.15,-3.4,.75,.04,.25,dark);box(0,1.35,-2.45,.6,.58,.10,dark);box(0,.78,-2.45,.6,.09,.6,dark);box(0,.38,-2.45,.10,.7,.10,metal);
    table(-3.7,-1.8,1.8,2.8);
    for(let i=0;i<5;i++){box(-4.7,1.4+i*.35,-1.8,.05,.025,2.7,metal);box(-4.55,1.4+i*.35,-1.8+i*.24,.18,.16,.15,wood);}
    for(const y of [.3,1.05,1.8,2.55,3.25])box(-3.7,y,-4.45,2,.10,.55,metal);
    for(let i=0;i<9;i++)box(-4.45+i*.18,2.05,-4.44,.14,.38+(i%3)*.05,.35,mat([0x88745a,0x6d8c89,0x57646e][i%3]));
    for(const x of [-4.65,-2.75])box(x,1.8,-4.45,.08,3.6,.65,metal);
    box(3.8,1.35,-4.1,1.1,2.7,.95,dark);
    for(let i=0;i<7;i++){box(3.8,.45+i*.31,-3.59,.94,.24,.045,metal);box(3.45,.45+i*.31,-3.56,.055,.055,.025,green);}
    // Recording table is the primary object in the default view.
    table(0,-.15,3.4,1.55);
    for(const x of [-1.05,1.05]){
      box(x,1.15,-.15,.24,.06,.24,dark);
      box(x,1.48,-.15,.045,.65,.045,metal);
      box(x+(x<0?.18:-.18),1.8,-.15,.4,.075,.075,metal);
      box(x+(x<0?.4:-.4),1.8,-.15,.32,.13,.13,dark);
      box(x,.76,1.13,.65,.12,.62,dark);box(x,1.13,1.40,.65,.63,.12,dark);box(x,.37,1.13,.10,.74,.10,metal);
    }
    box(0,1.16,.18,.44,.12,.3,dark);
    for(let n=0;n<4;n++)box(-.13+n*.085,1.23,.19,.025,.012,.025,green);
    table(-3.1,2.4,1.6,1.4);
    for(let row=0;row<8;row++)for(let col=0;col<8;col++)box(-3.1+(col-3.5)*.12,1.14,2.4+(row-3.5)*.12,.118,.028,.118,(row+col)%2?dark:wood);
    for(const x of [-2.4,2.4]){box(x,3.85,-1.8,.12,.09,3.5,warm);const light=new THREE.PointLight(0xffdfaf,35,12,2);light.position.set(x,3.5,-1.8);scene.add(light);}
    scene.add(new THREE.HemisphereLight(0xdbe8e8,0x4f4741,2.0));
    const fill=new THREE.DirectionalLight(0xc4e1e1,2.2);fill.position.set(5,6,5);scene.add(fill);
    host.append(renderer.domElement);
    const render=()=>renderer.render(scene,camera);
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enablePan=false;controls.enableDamping=false;controls.minDistance=2.5;controls.maxDistance=15;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI/2-.04;
    // OrbitControls registers change listeners only; no automatic animation loop.
    controls.addEventListener("change",render);
    const move=zone=>{const p=presets[zone];camera.position.set(...p.position);controls.target.set(...p.target);controls.update();render();};
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();};
    const lost=event=>{event.preventDefault();stop("3D is unavailable. The illustration remains available.");enable.focus();};
    renderer.domElement.addEventListener("webglcontextlost",lost,{once:true});
    observer=new ResizeObserver(resize);observer.observe(host);
    active={move,dispose(){observer.disconnect();controls.removeEventListener("change",render);controls.dispose();renderer.domElement.removeEventListener("webglcontextlost",lost);scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){for(const m of [].concat(obj.material))m.dispose();}});renderer.dispose();renderer.forceContextLoss();}};
    viewport.classList.add("is-3d");resize();move(selected);
    enable.hidden=true;enable.disabled=false;disable.hidden=false;for(const button of buttons)button.disabled=false;
    status.textContent="3D concept enabled. Drag to orbit, or choose a named view.";
    disable.focus();
  }catch(error){
    if(ticket!==generation)return;
    if(!active){observer?.disconnect();controls?.dispose();scene?.traverse(obj=>{obj.geometry?.dispose();if(obj.material)for(const m of [].concat(obj.material))m.dispose();});renderer?.dispose();}
    stop("3D could not start on this device. The illustration and site links remain available.");
    enable.focus();
  }
}
enable.addEventListener("click",start);
disable.addEventListener("click",()=>{stop();enable.focus();});
for(const button of buttons)button.addEventListener("click",()=>select(button.dataset.zone));
window.addEventListener("pagehide",()=>stop());
