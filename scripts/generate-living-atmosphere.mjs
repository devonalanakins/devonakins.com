/**
 * Reproducible, original 1920x1080 neural-atmosphere background video.
 * This contains no UI, private records, telemetry, stock footage or fake statuses.
 * Its only purpose is visual depth: the HTML site remains fully interactive.
 *
 * Requires existing 'sharp' devDependency and ffmpeg (Ubuntu release runner).
 * On ffmpeg-less browser CI we render the poster and use the same CSS/canvas fallback.
 */
import sharp from "sharp";
import {mkdir,writeFile,rm,stat} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
const W=1920,H=1080,FPS=24,FRAMES=96;
const output=process.argv[2]||"public/professional/living-atmosphere.mp4";
const poster=process.argv[3]||"public/professional/living-atmosphere.png";
let seed=2077;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const segments=[];
function grow(x,y,a,n,depth){
  if(!depth)return;
  const x2=x+Math.cos(a)*n,y2=y+Math.sin(a)*n;
  segments.push({x,y,x2,y2,depth,phase:random(),tone:random()});
  if(depth===1)return;
  const twist=(random()-.5)*.15;
  grow(x2,y2,a-.19-random()*.13+twist,n*(.73+random()*.04),depth-1);
  grow(x2,y2,a+.19+random()*.13+twist,n*(.73+random()*.04),depth-1);
  if(depth>3&&random()>.67)grow(x2,y2,a+(random()-.5)*.32,n*.62,depth-2);
}
// A rooted structure transitions into two hemispheres rather than a lollipop tree.
grow(1255,1000,-Math.PI/2,114,6);
grow(1275,730,-2.02,73,7);
grow(1400,725,-1.17,76,7);
grow(1168,625,-2.44,60,6);
grow(1470,635,-.76,61,6);
const stars=Array.from({length:265},()=>({x:random()*W,y:random()*H,r:random()>.95?1.9:.7,a:.12+random()*.35}));
const nodes=segments.filter(s=>s.depth<=3);
const brain={cx:1290,cy:390,rx:347,ry:223};
const neurons=[];
for(let i=0;i<1050&&neurons.length<380;i++){
  const x=brain.cx+(random()*2-1)*brain.rx;
  const y=brain.cy+(random()*2-1)*brain.ry;
  const a=Math.atan2((y-brain.cy)/brain.ry,(x-brain.cx)/brain.rx);
  const fold=.055*Math.sin(7*a)+.035*Math.sin(13*a+1.1);
  if(((x-brain.cx)/brain.rx)**2+((y-brain.cy)/brain.ry)**2>(.89+fold)**2)continue;
  neurons.push({x,y,weight:.3+random()*.7,tone:random()});
}
const fibers=[];
for(let i=0;i<neurons.length;i++){
  const a=neurons[i];
  const near=neurons.map((b,j)=>({j,b,d:Math.hypot(b.x-a.x,b.y-a.y)}))
    .filter(p=>p.j!==i&&p.d<66&&p.d>13).sort((u,v)=>u.d-v.d).slice(0,3);
  for(const {j,b,d} of near){
    if(j<i)continue;
    const bend=(random()-.5)*d*.27;
    const mx=(a.x+b.x)*.5+(a.y-b.y)*bend/d;
    const my=(a.y+b.y)*.5+(b.x-a.x)*bend/d;
    fibers.push({d:'M'+xval(a.x)+' '+xval(a.y)+' Q'+xval(mx)+' '+xval(my)+' '+xval(b.x)+' '+xval(b.y),
      tone:a.tone,weight:a.weight});
  }
}
function xval(n){return n.toFixed(1);}
function neuralBrain(){
  const rim=[];
  for(let j=0;j<=160;j++){
    const a=j/160*Math.PI*2;
    const r=1+.055*Math.sin(7*a)+.04*Math.cos(13*a+.45)+.025*Math.sin(19*a);
    rim.push((j===0?'M':'L')+xval(brain.cx+Math.cos(a)*brain.rx*r)+' '+
      xval(brain.cy+Math.sin(a)*brain.ry*r));
  }
  const outline=rim.join(' ')+' Z';
  const membrane='<defs><linearGradient id="cortex-membrane" x2=".9" y2="1">'+
    '<stop stop-color="#112d42" stop-opacity=".58"/>'+
    '<stop offset=".55" stop-color="#1a2b3d" stop-opacity=".36"/>'+
    '<stop offset="1" stop-color="#302636" stop-opacity=".22"/></linearGradient></defs>'+
    '<path d="'+outline+'" fill="url(#cortex-membrane)" stroke="#79bfd0" stroke-opacity=".21" stroke-width=".9"/>';
  const links=fibers.map((l,i)=>'<path d="'+l.d+'" fill="none" stroke="'+
    (l.tone>.48?'#f1b679':'#70d1e1')+'" stroke-opacity="'+(.13+.36*l.weight).toFixed(2)+
    '" stroke-width="'+(.46+.44*l.weight).toFixed(2)+'"/>').join('');
  const cells=neurons.filter((_,i)=>i%7===0).map((n,i)=>'<circle cx="'+xval(n.x)+
    '" cy="'+xval(n.y)+'" r="'+(i%6===0?1.45:.8)+'" fill="'+
    (n.tone>.52?'#f7cb94':'#96e4ed')+'" opacity=".64"/>').join('');
  const gyri=[];
  for(let k=0;k<52;k++){
    const y=brain.cy-brain.ry+10+k*8.1;
    let d='';
    for(let n=0;n<=95;n++){
      const x=brain.cx-brain.rx+12+n*brain.rx*1.96/95;
      const yy=y+8*Math.sin(x*.036+k*.83)+4*Math.sin(x*.077+k*.4);
      const inside=((x-brain.cx)/brain.rx)**2+((yy-brain.cy)/brain.ry)**2<.81;
      d+=inside?(d?' L':'M')+xval(x)+' '+xval(yy):'';
    }
    if(d)gyri.push('<path d="'+d+'" fill="none" stroke="'+(k%3?'#669cae':'#b68d76')+
      '" stroke-opacity=".22" stroke-width=".65"/>');
  }
  return membrane+gyri.join('')+links+cells;
}
const q=x=>Number(x).toFixed(1);
function background(){
  const paths=segments.map(s=>{
    const mx=(s.x+s.x2)/2+(s.y-s.y2)*.06,my=(s.y+s.y2)/2;
    return '<path d="M'+q(s.x)+' '+q(s.y)+' Q'+q(mx)+' '+q(my)+' '+q(s.x2)+' '+q(s.y2)+
      '" fill="none" stroke="'+(s.tone>.5?"#4bd4de":"#eab474")+
      '" stroke-opacity="'+(s.depth>4?".62":".36")+'" stroke-width="'+(s.depth>4?1.9:.9)+'"/>';
  }).join("");
  const halos=segments.filter((_,i)=>i%9===0).map(s=>
    '<line x1="'+q(s.x)+'" y1="'+q(s.y)+'" x2="'+q(s.x2)+'" y2="'+q(s.y2)+
    '" stroke="'+(s.tone>.5?"#2ea9bc":"#d59a60")+
    '" stroke-opacity=".15" stroke-width="14" filter="url(#blur)"/>').join("");
  const dots=nodes.map(s=>'<circle cx="'+q(s.x2)+'" cy="'+q(s.y2)+
    '" r="'+q(1+random()*2.8)+'" fill="'+(s.tone>.5?"#6bdee9":"#f2b87c")+'" opacity=".6"/>').join("");
  const sky=stars.map(s=>'<circle cx="'+q(s.x)+'" cy="'+q(s.y)+'" r="'+s.r+
    '" fill="#bde0df" opacity="'+q(s.a)+'"/>').join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">'+
    '<defs><filter id="blur"><feGaussianBlur stdDeviation="4"/></filter></defs>'+
    '<rect width="1920" height="1080" fill="#060c17"/>'+
    sky+neuralBrain()+'<path d="M160 975C500 820 540 405 1120 375S1680 220 1880 300" fill="none" stroke="#73e2e9" stroke-opacity=".18"/>'+
    '<path d="M320 190C710 290 950 100 1575 770" fill="none" stroke="#c7a275" stroke-opacity=".2"/>'+
    halos+paths+dots+
    '<path d="M0 1015C440 970 720 1040 1120 990S1620 1015 1920 970V1080H0Z" fill="#03070f" opacity=".28"/></svg>';
}
await mkdir("public/professional",{recursive:true});
const base=await sharp(Buffer.from(background())).png().toBuffer();
await writeFile(poster,base);
const ffmpeg=spawnSync("ffmpeg",["-version"],{stdio:"ignore"});
if(ffmpeg.error?.code==="ENOENT"){
  console.warn("ffmpeg unavailable: static poster + living canvas fallback; no MP4 was claimed.");
  process.exit(0);
}
if(ffmpeg.status!==0)throw new Error("ffmpeg probe failed");
const folder=join(tmpdir(),"living-atmosphere-"+process.pid);
await mkdir(folder,{recursive:true});
try{
  const sampled=segments.filter((s,i)=>i%4===0&&s.depth<=5);
  for(let i=0;i<FRAMES;i++){
    const phase=i/FRAMES,points=[];
    for(const s of sampled){
      const t=(phase+s.phase)%1;
      const alpha=Math.sin(Math.PI*t)*(.32+.46*s.tone);
      if(alpha<.04)continue;
      const x=s.x+(s.x2-s.x)*t,y=s.y+(s.y2-s.y)*t;
      const hue=s.tone>.48?"#71eaf0":"#ffd09c";
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="'+q(1.2+1.35*alpha)+
        '" fill="'+hue+'" opacity="'+q(Math.min(1,alpha*1.3))+'"/>');
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="'+q(4+5*alpha)+
        '" fill="'+hue+'" opacity="'+(alpha*.075).toFixed(3)+'"/>');
    }
    for(let j=0;j<24;j++){
      const x=200+j*61+Math.sin(2*Math.PI*(phase+j*.13))*45;
      const y=380+(j*197%480)+Math.sin(2*Math.PI*(phase+j*.097))*16;
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="1.7" fill="'+
        (j%2?"#59cbd7":"#e8ad73")+'" opacity=".12"/>');
    }
    // Thin axonal currents, not circular lighting masks or bokeh auras.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">'+
      points.join("")+'</svg>';
    const overlay=await sharp(Buffer.from(svg)).png().toBuffer();
    const frame=await sharp(base).composite([{input:overlay,top:0,left:0}]).png().toBuffer();
    await writeFile(join(folder,"frame-"+String(i).padStart(3,"0")+".png"),frame);
  }
  const encoded=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-framerate",String(FPS),
    "-i",join(folder,"frame-%03d.png"),"-c:v","libx264","-preset","fast",
    "-crf","26","-pix_fmt","yuv420p","-movflags","+faststart","-an",output],{stdio:"inherit"});
  if(encoded.status!==0)throw new Error("ffmpeg encode failed");
  const size=(await stat(output)).size;
  if(size>2_500_000)throw new Error("Motion asset exceeds 2.5 MB Worker budget");
  console.log("Generated 1080p source-only neural atmosphere:",size,"bytes");
}finally{await rm(folder,{recursive:true,force:true});}
