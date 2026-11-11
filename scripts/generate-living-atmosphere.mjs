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
grow(1050,1035,-Math.PI/2,235,8);
const stars=Array.from({length:265},()=>({x:random()*W,y:random()*H,r:random()>.95?1.9:.7,a:.12+random()*.35}));
const nodes=segments.filter(s=>s.depth<=3);
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
    '<defs><radialGradient id="ambient"><stop stop-color="#122e3c"/><stop offset=".48" stop-color="#081b2a"/><stop offset="1" stop-color="#050b13"/></radialGradient>'+
    '<radialGradient id="warm"><stop stop-color="#dcb57a" stop-opacity=".26"/><stop offset="1" stop-color="#e6a065" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="cold"><stop stop-color="#50c9cd" stop-opacity=".27"/><stop offset="1" stop-color="#50c9cd" stop-opacity="0"/></radialGradient>'+
    '<filter id="blur"><feGaussianBlur stdDeviation="10"/></filter></defs>'+
    '<rect width="1920" height="1080" fill="url(#ambient)"/>'+
    '<ellipse cx="980" cy="480" rx="670" ry="560" fill="url(#warm)"/>'+
    '<ellipse cx="1300" cy="630" rx="700" ry="520" fill="url(#cold)"/>'+
    sky+'<path d="M160 975C500 820 540 405 1120 375S1680 220 1880 300" fill="none" stroke="#73e2e9" stroke-opacity=".18"/>'+
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
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="'+q(3.6+4*alpha)+
        '" fill="'+hue+'" opacity="'+q(Math.min(1,alpha*1.3))+'"/>');
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="'+q(21+18*alpha)+
        '" fill="'+hue+'" opacity="'+(alpha*.22).toFixed(3)+'"/>');
    }
    for(let j=0;j<24;j++){
      const x=200+j*61+Math.sin(2*Math.PI*(phase+j*.13))*45;
      const y=380+(j*197%480)+Math.sin(2*Math.PI*(phase+j*.097))*16;
      points.push('<circle cx="'+q(x)+'" cy="'+q(y)+'" r="1.7" fill="'+
        (j%2?"#59cbd7":"#e8ad73")+'" opacity=".12"/>');
    }
    const auraX=q(1020+95*Math.sin(2*Math.PI*phase));
    const auraY=q(520+48*Math.cos(2*Math.PI*phase));
    const secondaryX=q(1170-70*Math.sin(2*Math.PI*phase));
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">'+
      '<defs><radialGradient id="fogA"><stop stop-color="#ffce91" stop-opacity=".15"/>'+
      '<stop offset="1" stop-color="#ffce91" stop-opacity="0"/></radialGradient>'+
      '<radialGradient id="fogB"><stop stop-color="#77e7ef" stop-opacity=".2"/>'+
      '<stop offset="1" stop-color="#77e7ef" stop-opacity="0"/></radialGradient></defs>'+
      '<ellipse cx="'+auraX+'" cy="'+auraY+'" rx="450" ry="360" fill="url(#fogA)"/>'+
      '<ellipse cx="'+secondaryX+'" cy="540" rx="400" ry="330" fill="url(#fogB)"/>'+
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
