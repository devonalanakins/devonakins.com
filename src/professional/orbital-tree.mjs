/** First-party decorative orbital-tree scene for the Living Studio.
 * The illumination and orbit motion are artwork, never simulated telemetry.
 * Deterministic vector artwork scales without external images or network calls.
 */
const precision=(v)=>Number(v).toFixed(2);
const arcPath=(i)=>{
  const spread=(i-15)/15;
  const endX=308+spread*172;
  const endY=115+Math.abs(spread)*92+(i%4)*10;
  const pivotX=308+spread*83;
  const pivotY=305-Math.cos(spread*Math.PI/2)*47;
  const width=spread===0?2.2:Math.max(.55,2.8-Math.abs(spread)*2.1);
  return '<path d="M308 468 C'+precision(304+spread*18)+' 405 '+
    precision(311+spread*39)+' 353 '+precision(pivotX)+' '+precision(pivotY)+
    ' S'+precision(endX-spread*45)+' '+precision(endY+53)+' '+
    precision(endX)+' '+precision(endY)+'" stroke-width="'+precision(width)+
    '" opacity="'+precision(.40+(1-Math.abs(spread))*.46)+'"/>';
};
const twigs=Array.from({length:31},(_,i)=>arcPath(i)).join('');
const canopy=Array.from({length:150},(_,i)=>{
  const angle=i*2.399963229728653;
  const radius=Math.sqrt((i+.55)/150);
  const x=308+Math.cos(angle)*radius*185;
  const y=251+Math.sin(angle)*radius*134;
  const glow=i%13===0;
  const size=glow?2.7:0.9+(i%7)*.24;
  const color=i%5===0?'#81f2e5':i%4===0?'#efad8c':'#ffe3bd';
  return '<circle cx="'+precision(x)+'" cy="'+precision(y)+'" r="'+precision(size)+
    '" fill="'+color+'" opacity="'+precision(.24+(i%9)*.075)+
    '"'+(glow?' filter="url(#studio-tree-glow)"':'')+'/>';
}).join('');
const constellations=Array.from({length:50},(_,i)=>{
  const angle=i*2.399963229728653;
  const radius=Math.sqrt((i+.5)/50);
  const x=308+Math.cos(angle)*radius*255;
  const y=260+Math.sin(angle)*radius*235;
  return '<circle cx="'+precision(x)+'" cy="'+precision(y)+'" r="'+(i%9===0?'1.8':'.6')+
    '" fill="'+(i%4===0?'#9de9df':'#f5c7a8')+'" opacity="'+precision(.12+(i%7)*.08)+'"/>';
}).join('');
export function renderStudioOrbitalTree(){
  return '<div class="studio-orbital-art" aria-hidden="true">'+
    '<span class="studio-orbital-haze"></span>'+
    '<span class="studio-orbit studio-orbit--outer"></span>'+
    '<span class="studio-orbit studio-orbit--inner"></span>'+
    '<span class="studio-orbit studio-orbit--cross"></span>'+
    '<svg class="studio-orbital-tree" viewBox="0 0 616 610" focusable="false" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
        '<radialGradient id="studio-tree-sphere"><stop stop-color="#215e5c" stop-opacity=".24"/><stop offset=".46" stop-color="#0f2337" stop-opacity=".28"/><stop offset="1" stop-color="#070c18" stop-opacity="0"/></radialGradient>'+
        '<radialGradient id="studio-tree-aurora"><stop stop-color="#eeb18f" stop-opacity=".37"/><stop offset=".4" stop-color="#bf8e88" stop-opacity=".11"/><stop offset="1" stop-color="#bf8e88" stop-opacity="0"/></radialGradient>'+
        '<linearGradient id="studio-tree-bark" x1="0%" y1="100%" x2="80%" y2="0%"><stop stop-color="#7a4f44"/><stop offset=".38" stop-color="#e8a777"/><stop offset=".68" stop-color="#ffe6b7"/><stop offset="1" stop-color="#af7d6f"/></linearGradient>'+
        '<linearGradient id="studio-tree-water" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="#e6bc92" stop-opacity=".5"/><stop offset=".48" stop-color="#538c8a" stop-opacity=".15"/><stop offset="1" stop-color="#102a38" stop-opacity="0"/></linearGradient>'+
        '<filter id="studio-tree-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4.4"/></filter>'+
      '</defs>'+
      '<ellipse cx="308" cy="266" rx="248" ry="237" fill="url(#studio-tree-sphere)"/>'+
      '<ellipse cx="308" cy="293" rx="176" ry="205" fill="url(#studio-tree-aurora)"/>'+
      '<g>'+constellations+'</g>'+
      '<g fill="none" stroke="url(#studio-tree-bark)" stroke-linecap="round" stroke-linejoin="round" filter="url(#studio-tree-glow)" opacity=".62">'+
        '<path d="M307 520 C286 462 309 390 304 342 C296 283 298 220 311 171" stroke-width="17"/>'+twigs+
      '</g>'+
      '<path d="M310 516 C289 461 311 401 305 348 C297 288 297 223 310 170 C318 229 321 291 316 351 C310 414 323 477 310 516 Z" fill="url(#studio-tree-bark)" opacity=".88"/>'+
      '<g fill="none" stroke="url(#studio-tree-bark)" stroke-linecap="round" stroke-linejoin="round">'+twigs+'</g>'+
      '<g>'+canopy+'</g>'+
      '<path d="M310 477 C266 504 234 506 170 516 M309 488 C351 503 395 513 446 520 M310 501 C288 520 262 526 238 530 M309 503 C355 527 371 530 402 532" fill="none" stroke="#efbc93" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>'+
      '<ellipse cx="308" cy="519" rx="184" ry="17" fill="#e5ad80" opacity=".17" filter="url(#studio-tree-glow)"/>'+
      '<path d="M68 543 Q308 514 548 543" stroke="#e9bf98" stroke-opacity=".35" stroke-width="1.5" fill="none"/>'+
      '<path d="M98 549 Q308 541 518 549 L544 599 L73 599Z" fill="url(#studio-tree-water)" opacity=".5"/>'+
      '<ellipse cx="308" cy="539" rx="205" ry="5" fill="#e7c6a0" opacity=".19" filter="url(#studio-tree-glow)"/>'+
    '</svg>'+
  '</div>';
}
