/** The laboratory's mathematical illustration is pure local computation.
 * No provider activity, clinical data, experiment result or web API is used.
 */
const curve=document.querySelector<SVGPathElement>('[data-lab-curve="interactive"]');
const inputA=document.querySelector<HTMLInputElement>('[data-lab-axis="a"]');
const inputB=document.querySelector<HTMLInputElement>('[data-lab-axis="b"]');
const outputA=document.querySelector<HTMLOutputElement>('[data-lab-value="a"]');
const outputB=document.querySelector<HTMLOutputElement>('[data-lab-value="b"]');
const caption=document.querySelector<HTMLElement>('[data-lab-model-caption]');
function integerFrequency(value:string):number{
  const n=Number(value);
  return Number.isInteger(n)&&n>=1&&n<=6?n:1;
}
function lissajous(a:number,b:number):string{
  const points:string[]=[];
  for(let index=0;index<=300;index++){
    const t=index/300*Math.PI*2;
    const x=(320+166*Math.sin(a*t)).toFixed(2);
    const y=(230-145*Math.sin(b*t+Math.PI/2)).toFixed(2);
    points.push((index===0?'M':'L')+x+' '+y);
  }
  return points.join(' ');
}
function redraw(){
  if(!inputA||!inputB||!curve)return;
  const a=integerFrequency(inputA.value);
  const b=integerFrequency(inputB.value);
  curve.setAttribute('d',lissajous(a,b));
  if(outputA)outputA.textContent=String(a);
  if(outputB)outputB.textContent=String(b);
  if(caption)caption.textContent='Analytic Lissajous model: a = '+a+', b = '+b+
    ', phase = π/2. Calculated locally; no experimental measurement.';
}
inputA?.addEventListener('input',redraw);
inputB?.addEventListener('input',redraw);
redraw();
const motion=document.querySelector<HTMLButtonElement>('[data-lab-motion]');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let userPause=false;
function syncMotion(){
  const running=!userPause&&!reduce.matches;
  document.body.classList.toggle('lab-motion-paused',!running);
  if(motion){
    motion.setAttribute('aria-pressed',String(running));
    motion.textContent=running?'MOTION ON':'MOTION OFF';
    motion.setAttribute('aria-label',running?'Pause decorative motion':'Resume decorative motion');
    motion.disabled=reduce.matches;
    if(reduce.matches)motion.title='Reduced motion is enabled in system settings';
  }
}
motion?.addEventListener('click',()=>{userPause=!userPause;syncMotion()});
reduce.addEventListener('change',syncMotion);
syncMotion();
export {};
